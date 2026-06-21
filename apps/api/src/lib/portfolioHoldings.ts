import { query } from "../db.js";
import { normalizeCoinType } from "./coinType.js";
import { getCoinMetadata } from "./coinMetadata.js";
import type { WalletBalanceRow } from "./walletBalances.js";
import { resolveWalletBalances } from "./walletBalances.js";
import { symbolFromCoinType } from "./positions/coinSymbol.js";
import { sumNativeStakingPrincipal } from "./positions/sources/native/nativeStakingRpc.js";
import { getWalletHiddenCoinTypes } from "./protocolWalletCoins.js";
import { resolveDefiPositions } from "./positions/resolve.js";
import type { ResolvedPosition } from "./positions/types.js";

const SUI_TYPE = "0x2::sui::SUI";

export interface ChartHolding {
  coinType: string;
  balance: bigint;
  decimals: number;
}

function defaultDecimals(coinType: string): number {
  const sym = symbolFromCoinType(coinType);
  if (sym === "USDC" || sym === "USDT") return 6;
  return 9;
}

/** Parse BlockVision / on-chain balance strings into raw integer units. */
export function parseRawBalance(raw: string, decimals: number): bigint {
  const trimmed = raw.trim();
  if (!trimmed) return 0n;
  if (trimmed.includes(".")) {
    const n = Number(trimmed);
    if (!Number.isFinite(n)) return 0n;
    return BigInt(Math.round(n * 10 ** decimals));
  }
  try {
    return BigInt(trimmed);
  } catch {
    return 0n;
  }
}

function addAmount(
  map: Map<string, bigint>,
  coinType: string,
  raw: string,
  decimals?: number,
): void {
  if (!coinType || !raw) return;
  const normalized = normalizeCoinType(coinType);
  const add = parseRawBalance(raw, decimals ?? defaultDecimals(normalized));
  if (add === 0n) return;
  map.set(normalized, (map.get(normalized) ?? 0n) + add);
}

interface DefiHolding {
  coinType: string;
  raw: bigint;
  /** Decimal scale the `raw` integer is expressed in (may differ from the coin's). */
  sourceDecimals: number;
}

function rawFrom(value: unknown, sourceDecimals: number): bigint | null {
  const s = String(value ?? "").trim();
  if (!s) return null;
  if (s.includes(".")) {
    const n = Number(s);
    if (!Number.isFinite(n)) return null;
    return BigInt(Math.round(n * 10 ** sourceDecimals));
  }
  try {
    return BigInt(s);
  } catch {
    return null;
  }
}

/** Rescale a raw integer from one decimal scale to another (BigInt, truncating). */
function rescaleRaw(raw: bigint, from: number, to: number): bigint {
  if (from === to) return raw;
  return from > to ? raw / 10n ** BigInt(from - to) : raw * 10n ** BigInt(to - from);
}

/**
 * Gross asset holdings contributed by DeFi positions, each tagged with the decimal
 * scale its raw amount is stored in. LP + supply balances only (no borrow
 * subtraction — avoids bogus Navi/Scallop rows zeroing the chart).
 *
 * A supply amount may be stored in a protocol-specific scale that differs from the
 * coin's real decimals — e.g. Navi keeps a USDC supply in a 9-decimal `value`
 * (naviScaleDecimals: 9) even though USDC is 6 decimals. The caller rescales each
 * contribution to real decimals via metadata, so a 6-decimal coin held in a 9-scale
 * field is not valued 1000x too high.
 */
export function defiHoldingContributions(positions: ResolvedPosition[]): DefiHolding[] {
  const out: DefiHolding[] = [];
  const push = (coinType: unknown, value: unknown, sourceDecimals: number): void => {
    if (typeof coinType !== "string" || value == null) return;
    const raw = rawFrom(value, sourceDecimals);
    if (raw === null || raw <= 0n) return;
    out.push({ coinType: normalizeCoinType(coinType), raw, sourceDecimals });
  };

  for (const pos of positions) {
    const d = pos.details;

    if (pos.category === "amm_lp" || pos.category === "vault") {
      const decA =
        typeof d.coinTypeADecimals === "number"
          ? d.coinTypeADecimals
          : defaultDecimals(String(d.coinTypeA ?? ""));
      const decB =
        typeof d.coinTypeBDecimals === "number"
          ? d.coinTypeBDecimals
          : defaultDecimals(String(d.coinTypeB ?? ""));
      if (typeof d.coinTypeA === "string") push(d.coinTypeA, d.balanceA, decA);
      if (typeof d.coinTypeB === "string") push(d.coinTypeB, d.balanceB, decB);
      if (typeof d.coinType === "string" && d.balance != null) {
        const dec =
          typeof d.coinDecimals === "number" ? d.coinDecimals : defaultDecimals(String(d.coinType));
        push(d.coinType, d.balance, dec);
      }
      continue;
    }

    if (pos.positionType === "supply" || pos.positionType === "scallop-supply") {
      const valueScale =
        typeof d.naviScaleDecimals === "number"
          ? d.naviScaleDecimals
          : typeof d.coinDecimals === "number"
            ? d.coinDecimals
            : defaultDecimals(String(d.coinType ?? ""));
      push(d.coinType, d.value, valueScale);
      const coinScale =
        typeof d.coinDecimals === "number" ? d.coinDecimals : defaultDecimals(String(d.coinType ?? ""));
      push(d.coinType, d.suppliedCoin, coinScale);
    }

    if (pos.positionType === "ve-sca" && d.lockedScaInCoin != null) {
      const dec = typeof d.coinDecimals === "number" ? d.coinDecimals : 9;
      push(d.coinType, d.lockedScaInCoin, dec);
    }

    if (pos.positionType === "native-staking" && d.principal != null) {
      push(SUI_TYPE, d.principal, 9);
    }
  }

  return out;
}

/**
 * Wallet holdings for the portfolio chart: indexed balances + staking + DeFi gross assets.
 * Pass `defi` when already resolved to avoid a second adapter round-trip.
 */
export async function getHoldingsForChart(
  address: string,
  defi?: ResolvedPosition[],
  balances?: WalletBalanceRow[],
): Promise<ChartHolding[]> {
  const amounts = new Map<string, bigint>();

  const balanceRows = balances ?? (await resolveWalletBalances(address)).rows;
  const hiddenCoinTypes = await getWalletHiddenCoinTypes();
  for (const row of balanceRows) {
    const coinType = normalizeCoinType(row.coin_type);
    if (hiddenCoinTypes.has(coinType)) continue;
    addAmount(amounts, coinType, row.balance);
  }

  const defiPositions = defi ?? (await resolveDefiPositions(address));
  const rpcStaked = sumNativeStakingPrincipal(defiPositions);
  if (rpcStaked === 0n) {
    try {
      const { rows: stakeRows } = await query<{ staked: string }>(
        `SELECT COALESCE(SUM((details->>'principal')::numeric), 0)::text AS staked
           FROM positions
          WHERE owner_address = $1 AND position_type = 'native-staking'`,
        [address],
      );
      const staked = stakeRows[0]?.staked ?? "0";
      if (BigInt(staked || "0") > 0n) addAmount(amounts, SUI_TYPE, staked);
    } catch {
      /* indexer offline */
    }
  }

  const contributions = defiHoldingContributions(defiPositions);

  const coinTypes = [
    ...new Set([...amounts.keys(), ...contributions.map((c) => c.coinType)]),
  ];
  if (coinTypes.length === 0) return [];

  const metaMap = await getCoinMetadata(coinTypes);

  // Rescale each DeFi contribution from its stored scale to the coin's real
  // decimals before merging — this is what stops a 9-scale Navi USDC supply from
  // being valued as 6-decimal (a 1000x over-count that inflated chart/holdings).
  for (const c of contributions) {
    const realDec = metaMap.get(c.coinType)?.decimals ?? defaultDecimals(c.coinType);
    const rescaled = rescaleRaw(c.raw, c.sourceDecimals, realDec);
    if (rescaled > 0n) amounts.set(c.coinType, (amounts.get(c.coinType) ?? 0n) + rescaled);
  }

  return coinTypes
    .map((coinType) => ({
      coinType,
      balance: amounts.get(coinType) ?? 0n,
      decimals: metaMap.get(coinType)?.decimals ?? defaultDecimals(coinType),
    }))
    .filter((h) => h.balance > 0n);
}
