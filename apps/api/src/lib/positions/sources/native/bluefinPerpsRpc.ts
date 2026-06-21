import type { ProtocolPositionAdapter } from "../../adapters/types.js";
import type { ResolvedPosition } from "../../types.js";
import { getUsdPrices } from "../../../prices.js";
import { defiRpcCall } from "./rpcClient.js";

// Bluefin Pro stores collateral in 9-decimal base units (verified exactly against
// the protocol REST effectiveBalanceE9). Stablecoins are valued $1.
const STABLE_RE = /^(USDC|USDT|USDB|USDCE|WUSDC|SUIUSDC)$/;

// Bluefin Pro (cross-margin perpetual DEX). Positions are NOT owned objects —
// a user's Account (collateral + open positions) lives in shared storage as a
// `Table<address, Account>` inside the protocol's InternalDataStore. So we read
// it by address via a dynamic field rather than via suix_getOwnedObjects.
// Verified live on mainnet: dynamic field type is
// 0x2::dynamic_field::Field<address, 0xe744...::account::Account>, whose value
// has fields { assets, cross_positions, isolated_positions, ... }.
const BLUEFIN_ACCOUNTS_TABLE =
  "0x63f16b288f33fbe6d9374602cbbfa9948bf1cc175e9b0a91aa50085aa04980a0";

interface DynamicFieldObjectResult {
  result?: {
    data?: { content?: { fields?: Record<string, unknown> } };
  };
  error?: unknown;
}

function fieldsOf(v: unknown): Record<string, unknown> | null {
  if (v && typeof v === "object" && "fields" in v) {
    const f = (v as { fields?: unknown }).fields;
    return f && typeof f === "object" ? (f as Record<string, unknown>) : null;
  }
  return null;
}

function asArray(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}

function str(v: unknown): string {
  return v == null ? "" : String(v);
}

/**
 * Native Bluefin Pro perps: read the user's Account from the shared accounts
 * table and surface open positions + deposited collateral.
 *
 * Detection-only valuation for now (`valueUsd: null`): exact USD needs the
 * confirmed base-unit scale and per-market mark prices; the raw on-chain amounts
 * are preserved in `details` so a valuation pass can be added without re-reading.
 */
export const nativeBluefinPerpsAdapter: ProtocolPositionAdapter = {
  id: "native-bluefin-perps",
  async fetchPositions(address: string): Promise<ResolvedPosition[]> {
    const body = await defiRpcCall<DynamicFieldObjectResult>({
      jsonrpc: "2.0",
      id: 1,
      method: "suix_getDynamicFieldObject",
      params: [BLUEFIN_ACCOUNTS_TABLE, { type: "address", value: address }],
    });

    // No account => the wallet has never traded Bluefin Pro.
    const account = fieldsOf(body?.result?.data?.content?.fields?.value);
    if (!account) return [];

    const rows: ResolvedPosition[] = [];

    const positions = [
      ...asArray(account.cross_positions),
      ...asArray(account.isolated_positions),
    ];

    for (const p of positions) {
      const f = fieldsOf(p);
      if (!f) continue;
      const size = str(f.size);
      if (size === "" || size === "0") continue;
      const market = str(f.perpetual);
      const isLong = Boolean(f.is_long);
      rows.push({
        protocol: "Bluefin",
        category: "perp",
        positionType: "perp",
        label: `${market || "Perp"} ${isLong ? "Long" : "Short"}`,
        objectId: null,
        valueUsd: null,
        source: "native",
        details: {
          market,
          side: isLong ? "long" : "short",
          size,
          averageEntryPrice: str(f.average_entry_price),
          leverage: str(f.leverage),
          margin: str(f.margin),
          isIsolated: Boolean(f.is_isolated),
        },
      });
    }

    // Surface the account (deposited collateral) even with no open position.
    const assets = asArray(account.assets)
      .map((a) => fieldsOf(a))
      .filter((f): f is Record<string, unknown> => f !== null)
      .map((f) => ({ name: str(f.name), quantity: str(f.quantity) }))
      .filter((a) => a.quantity !== "" && a.quantity !== "0");

    if (assets.length > 0) {
      const nonStable = [
        ...new Set(assets.map((a) => a.name.toUpperCase()).filter((n) => !STABLE_RE.test(n))),
      ];
      const prices = nonStable.length ? await getUsdPrices(nonStable) : new Map<string, number>();
      let usd = 0;
      let priced = true;
      for (const a of assets) {
        const amount = Number(a.quantity) / 1e9;
        const upper = a.name.toUpperCase();
        if (STABLE_RE.test(upper)) {
          usd += amount;
          continue;
        }
        const px = prices.get(upper);
        if (px === undefined) {
          priced = false;
          break;
        }
        usd += amount * px;
      }
      const collateralUsd = priced ? usd : null;
      rows.push({
        protocol: "Bluefin",
        category: "perp",
        positionType: "perp-collateral",
        label: "Bluefin Pro collateral",
        objectId: null,
        valueUsd: collateralUsd,
        source: "native",
        details: { assets, collateralUsd },
      });
    }

    return rows;
  },
};

export async function inspectNativeBluefinPerps(address: string): Promise<{
  hasAccount: boolean;
  positionCount: number;
  positions: ResolvedPosition[];
}> {
  const positions = await nativeBluefinPerpsAdapter.fetchPositions(address);
  return {
    hasAccount: positions.length > 0,
    positionCount: positions.filter((p) => p.positionType === "perp").length,
    positions,
  };
}
