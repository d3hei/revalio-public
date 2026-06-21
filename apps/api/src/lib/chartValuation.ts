import type { CoinMeta } from "./coinMetadata.js";
import { normalizeCoinType } from "./coinType.js";
import { getUsdPrices } from "./prices.js";
import type { ResolvedPosition } from "./positions/types.js";
import { sumNativeStakingPrincipal } from "./positions/sources/native/nativeStakingRpc.js";
import type { ChartHolding } from "./portfolioHoldings.js";

export interface ChartPoint {
  t: number;
  valueUsd: number;
}

/** Reject price_ticks that diverge wildly from live Pyth (bad CoinGecko rows). */
const MAX_TICK_SPOT_RATIO = 4;

export interface ChartTickRow {
  bucket: Date | string;
  coin_type: string;
  price: number;
}

export function sanitizeTickPrice(spot: number | undefined, tickPrice: number): number {
  if (!Number.isFinite(tickPrice) || tickPrice <= 0) return spot ?? tickPrice;
  if (spot === undefined || spot <= 0) return tickPrice;
  if (tickPrice > spot * MAX_TICK_SPOT_RATIO || tickPrice < spot / MAX_TICK_SPOT_RATIO) return spot;
  return tickPrice;
}

export function getNonStakingPositionsUsd(positions: ResolvedPosition[]): number {
  let total = 0;
  for (const p of positions) {
    if (p.positionType === "native-staking") continue;
    if (p.valueUsd !== null && Number.isFinite(p.valueUsd)) total += p.valueUsd;
  }
  return total;
}

function isSuiCoinType(coinType: string): boolean {
  return normalizeCoinType(coinType) === SUI_COIN_TYPE;
}

/**
 * Portfolio chart history = wallet tokens at historical prices + native staking
 * principal at historical SUI price + non-staking DeFi at spot (flat). Matches
 * the portfolio headline methodology; avoids gross LP double-counting.
 */
const SUI_COIN_TYPE = "0x2::sui::SUI";

/** Value portfolio buckets without gross DeFi double-counting. */
export function buildPortfolioHistoryFromBuckets(input: {
  bucketTimes: number[];
  priceByBucket: Map<number, Map<string, number>>;
  walletHoldings: ChartHolding[];
  stakingPrincipalMist: bigint;
  nonStakingPositionsUsd: number;
  metaByCoinType: Map<string, CoinMeta>;
  spotByCoinType: Map<string, number>;
}): ChartPoint[] {
  const stakingSui = Number(input.stakingPrincipalMist) / 1e9;
  const points: ChartPoint[] = [];

  for (const t of [...input.bucketTimes].sort((a, b) => a - b)) {
    const pricesAtT = input.priceByBucket.get(t);
    if (!pricesAtT || pricesAtT.size === 0) continue;

    let valueUsd = 0;
    for (const holding of input.walletHoldings) {
      const coinType = normalizeCoinType(holding.coinType);
      const px = pricesAtT.get(coinType) ?? input.spotByCoinType.get(coinType);
      if (px === undefined || !(px > 0)) continue;
      const amount = Number(holding.balance) / 10 ** holding.decimals;
      if (!Number.isFinite(amount) || amount <= 0) continue;
      valueUsd += amount * px;
    }

    if (stakingSui > 0 && Number.isFinite(stakingSui)) {
      const suiPx =
        pricesAtT.get(SUI_COIN_TYPE) ?? input.spotByCoinType.get(SUI_COIN_TYPE);
      if (suiPx !== undefined && suiPx > 0) valueUsd += stakingSui * suiPx;
    }

    if (input.nonStakingPositionsUsd > 0) {
      valueUsd += input.nonStakingPositionsUsd;
    }

    if (!Number.isFinite(valueUsd)) continue;
    points.push({ t, valueUsd });
  }

  return points;
}

export function buildHistoricalChartPoints(input: {
  tickRows: ChartTickRow[];
  walletHoldings: ChartHolding[];
  stakingPrincipalMist: bigint;
  nonStakingPositionsUsd: number;
  spotBySymbol: Map<string, number>;
  spotByCoinType?: Map<string, number>;
  metaByCoinType: Map<string, CoinMeta>;
}): ChartPoint[] {
  const spotByCoin = input.spotByCoinType ?? new Map<string, number>();
  const holdingByType = new Map(
    input.walletHoldings.map((h) => [
      normalizeCoinType(h.coinType),
      { balance: h.balance, decimals: h.decimals },
    ]),
  );

  const priceByBucket = new Map<number, Map<string, number>>();
  const bucketTimes = new Set<number>();
  const suiPriceByBucket = new Map<number, number>();

  for (const row of input.tickRows) {
    const coinType = normalizeCoinType(row.coin_type);
    const t = new Date(row.bucket).getTime();
    bucketTimes.add(t);
    const sym = input.metaByCoinType.get(coinType)?.symbol ?? undefined;
    const spot = sym ? input.spotBySymbol.get(sym) : undefined;
    const price = sanitizeTickPrice(spot, row.price);

    if (isSuiCoinType(coinType)) {
      suiPriceByBucket.set(t, price);
    }

    const bucketPrices = priceByBucket.get(t) ?? new Map<string, number>();
    bucketPrices.set(coinType, price);
    priceByBucket.set(t, bucketPrices);
  }

  const bucketTotals = new Map<number, number>();
  for (const t of [...bucketTimes].sort((a, b) => a - b)) {
    const pricesAtT = priceByBucket.get(t) ?? new Map<string, number>();
    for (const [coinType, holding] of holdingByType) {
      const sym = input.metaByCoinType.get(coinType)?.symbol ?? undefined;
      const spot = sym ? input.spotBySymbol.get(sym) : undefined;
      const tickPrice = pricesAtT.get(coinType);
      const coinSpot = spotByCoin.get(coinType);
      const price =
        tickPrice !== undefined
          ? sanitizeTickPrice(spot ?? coinSpot, tickPrice)
          : coinSpot !== undefined && coinSpot > 0
            ? coinSpot
            : spot !== undefined && spot > 0
              ? spot
              : undefined;
      if (price === undefined) continue;
      const amount = Number(holding.balance) / 10 ** holding.decimals;
      if (!Number.isFinite(amount) || amount <= 0) continue;
      bucketTotals.set(t, (bucketTotals.get(t) ?? 0) + amount * price);
    }
  }

  const stakingSui = Number(input.stakingPrincipalMist) / 1e9;
  if (stakingSui > 0 && Number.isFinite(stakingSui)) {
    const spotSui = input.spotBySymbol.get("SUI");
    if (suiPriceByBucket.size > 0) {
      for (const [t, suiPx] of suiPriceByBucket) {
        bucketTotals.set(t, (bucketTotals.get(t) ?? 0) + stakingSui * suiPx);
      }
    } else if (spotSui !== undefined) {
      const t = Date.now();
      bucketTotals.set(t, (bucketTotals.get(t) ?? 0) + stakingSui * spotSui);
    }
  }

  if (input.nonStakingPositionsUsd > 0) {
    for (const t of [...bucketTotals.keys()]) {
      bucketTotals.set(t, (bucketTotals.get(t) ?? 0) + input.nonStakingPositionsUsd);
    }
  }

  return [...bucketTotals.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([t, valueUsd]) => ({ t, valueUsd }));
}

export function walletHoldingsFromBalances(
  rows: { coin_type: string; balance: string }[],
  metaMap: Map<string, CoinMeta>,
): ChartHolding[] {
  return rows
    .map((row) => {
      const coinType = normalizeCoinType(row.coin_type);
      let balance: bigint;
      try {
        balance = BigInt(row.balance);
      } catch {
        return null;
      }
      if (balance <= 0n) return null;
      return {
        coinType,
        balance,
        decimals: metaMap.get(coinType)?.decimals ?? 9,
      };
    })
    .filter((h): h is ChartHolding => h !== null);
}

/** Drop chart buckets before the wallet had any on-chain activity. */
export function trimChartPointsBefore(points: ChartPoint[], sinceMs: number): ChartPoint[] {
  if (!Number.isFinite(sinceMs) || sinceMs <= 0) return points;
  return points.filter((p) => p.t >= sinceMs);
}

/** Sync the last historical bucket to the live portfolio headline. */
export function alignLastChartPoint(points: ChartPoint[], headlineUsd: number): ChartPoint[] {
  if (points.length === 0 || !(headlineUsd > 0)) return points;
  const lastIdx = points.length - 1;
  const last = points[lastIdx]!;
  if (Math.abs(last.valueUsd - headlineUsd) / headlineUsd < 0.005) return points;
  const out = [...points];
  out[lastIdx] = { ...last, valueUsd: headlineUsd };
  return out;
}

/** Value holdings at live Pyth spot prices (matches Positions headline). */
export async function valueHoldingsAtLivePrices(
  holdings: ChartHolding[],
  metaMap: Map<string, CoinMeta>,
): Promise<number | null> {
  const symbols = [
    ...new Set(
      holdings
        .map((h) => metaMap.get(h.coinType)?.symbol)
        .filter((s): s is string => Boolean(s)),
    ),
  ];
  if (symbols.length === 0) return null;

  const prices = await getUsdPrices(symbols);
  let total = 0;
  let hasPrice = false;

  for (const h of holdings) {
    const sym = metaMap.get(h.coinType)?.symbol;
    if (!sym) continue;
    const px = prices.get(sym);
    if (px === undefined) continue;
    const amount = Number(h.balance) / 10 ** h.decimals;
    if (!Number.isFinite(amount)) continue;
    total += amount * px;
    hasPrice = true;
  }

  return hasPrice ? total : null;
}

/** Replace or append the chart's last point with the live portfolio headline. */
export function appendLiveChartPoint(points: ChartPoint[], liveUsd: number): ChartPoint[] {
  if (!Number.isFinite(liveUsd) || liveUsd <= 0) return points;

  const now = Date.now();
  if (points.length === 0) return [{ t: now, valueUsd: liveUsd }];

  const out = [...points];
  const last = out[out.length - 1]!;
  if (now - last.t < 3_600_000) {
    out[out.length - 1] = { t: now, valueUsd: liveUsd };
  } else {
    out.push({ t: now, valueUsd: liveUsd });
  }
  return out;
}
