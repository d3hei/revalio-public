import { query } from "../db.js";
import { valueHoldingsAtLivePrices } from "./chartValuation.js";
import { getCoinMetadata } from "./coinMetadata.js";
import { getHoldingsForChart } from "./portfolioHoldings.js";
import { getUsdPrices } from "./prices.js";
import { isScallopVeScaPosition } from "./positions/scallopVeSca.js";
import type { ResolvedPosition } from "./positions/types.js";

const SUI_DECIMALS = 9;

const PROTOCOL_LABELS: Record<string, string> = {
  "sui-system": "Sui Staking",
};

function isHiddenPositionRow(row: {
  positionType: string;
  protocol: string;
  category?: string;
  label?: string;
}): boolean {
  return isScallopVeScaPosition(row);
}

interface PositionRow {
  protocol: string;
  position_type: string;
  object_id: string | null;
  details: Record<string, unknown> | null;
}

export interface ApiPosition {
  protocol: string;
  category: string;
  positionType: string;
  label: string;
  objectId: string | null;
  details: Record<string, unknown>;
  valueUsd: number | null;
  source?: string;
}

export interface PositionsPayload {
  address: string;
  totalUsd: number;
  positions: ApiPosition[];
  protocols: { protocol: string; category: string; valueUsd: number; count: number }[];
}

export async function buildPositionsPayload(
  address: string,
  defi: ResolvedPosition[],
): Promise<PositionsPayload> {
  let rows: PositionRow[] = [];
  try {
    const result = await query<PositionRow>(
      `SELECT protocol, position_type, object_id, details
         FROM positions
        WHERE owner_address = $1
        ORDER BY updated_at DESC`,
      [address],
    );
    rows = result.rows;
  } catch {
    /* indexer offline */
  }

  const suiPrice = (await getUsdPrices(["SUI"])).get("SUI") ?? null;

  const defiObjectIds = new Set(
    defi
      .filter((p) => p.positionType === "native-staking" && p.objectId)
      .map((p) => p.objectId as string),
  );

  const indexed: ApiPosition[] = rows
    .filter(
      (r) =>
        !isHiddenPositionRow({
          positionType: r.position_type,
          protocol: r.protocol,
          label: PROTOCOL_LABELS[r.protocol] ?? r.protocol,
        }) &&
        !(
          r.position_type === "native-staking" &&
          r.object_id &&
          defiObjectIds.has(r.object_id)
        ),
    )
    .map((r) => {
      let valueUsd: number | null = null;
      if (r.position_type === "native-staking" && suiPrice !== null) {
        const principalRaw = Number(r.details?.principal ?? 0);
        const principal = principalRaw / 10 ** SUI_DECIMALS;
        if (Number.isFinite(principal)) valueUsd = principal * suiPrice;
      }
      return {
        protocol: r.protocol,
        category: "staking",
        positionType: r.position_type,
        label: PROTOCOL_LABELS[r.protocol] ?? r.protocol,
        objectId: r.object_id,
        details: r.details ?? {},
        valueUsd,
        source: "indexer",
      };
    });

  let positions: ApiPosition[] = [
    ...indexed,
    ...defi
      .filter((p) => !isHiddenPositionRow(p))
      .map((p) => ({
        protocol: p.protocol,
        category: p.category,
        positionType: p.positionType,
        label: p.label,
        objectId: p.objectId,
        details: p.details,
        valueUsd: p.valueUsd,
        source: p.source,
      })),
  ];

  if (defi.some((p) => p.category === "amm_lp")) {
    // A closed LP position (all liquidity withdrawn) holds nothing -> value it $0
    // and exclude it from the holdings estimate below. Otherwise an unpriced closed
    // LP is treated as "needs estimate" and gets assigned the wallet's ENTIRE token
    // holdings (observed: $587k on a closed USDC/SUI position).
    positions = positions.map((p) =>
      p.category === "amm_lp" &&
      p.valueUsd === null &&
      String(p.details?.liquidity ?? "") === "0"
        ? { ...p, valueUsd: 0 }
        : p,
    );
    const hasUnpricedOpenLp = positions.some(
      (p) => p.category === "amm_lp" && p.valueUsd === null,
    );
    const priced = positions.some(
      (p) => p.category === "amm_lp" && p.valueUsd !== null && Number.isFinite(p.valueUsd),
    );
    if (hasUnpricedOpenLp && !priced) {
      const holdings = await getHoldingsForChart(address, defi);
      const metaMap = await getCoinMetadata(holdings.map((h) => h.coinType));
      const live = await valueHoldingsAtLivePrices(holdings, metaMap);
      if (live !== null && live > 0) {
        positions = positions.map((p) =>
          p.category === "amm_lp" && p.valueUsd === null ? { ...p, valueUsd: live } : p,
        );
      }
    }
  }

  const groupMap = new Map<
    string,
    { protocol: string; category: string; valueUsd: number; count: number }
  >();
  let totalUsd = 0;
  for (const p of positions) {
    if (p.valueUsd !== null && Number.isFinite(p.valueUsd)) totalUsd += p.valueUsd;
  }

  for (const p of positions) {
    const g = groupMap.get(p.protocol) ?? {
      protocol: p.protocol,
      category: p.category,
      valueUsd: 0,
      count: 0,
    };
    g.count += 1;
    if (p.valueUsd !== null && Number.isFinite(p.valueUsd)) g.valueUsd += p.valueUsd;
    groupMap.set(p.protocol, g);
  }

  return {
    address,
    totalUsd,
    positions,
    protocols: [...groupMap.values()],
  };
}
