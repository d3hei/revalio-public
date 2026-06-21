import { sumNativeStakingPrincipal } from "./positions/sources/native/nativeStakingRpc.js";
import { getCoinMetadata, type CoinMeta } from "./coinMetadata.js";
import {
  alignLastChartPoint,
  appendLiveChartPoint,
  buildPortfolioHistoryFromBuckets,
  getNonStakingPositionsUsd,
  sanitizeTickPrice,
  walletHoldingsFromBalances,
} from "./chartValuation.js";
import { normalizeCoinType } from "./coinType.js";
import { getCoinTypeUsdPrices } from "./prices.js";
import { backfillHistory } from "./priceHistory.js";
import {
  buildPortfolioSnapshotState,
  valueSnapshotAtPrices,
} from "./portfolioSnapshotState.js";
import { getPortfolioSummary } from "./portfolioSummary.js";
import type { WalletSnapshot } from "./walletSnapshot.js";
import { getWalletActiveSinceMs } from "./walletActiveSince.js";
import { fetchWalletBalanceEvents } from "./walletBalanceTimeline.js";
import {
  loadPortfolioSnapshots,
  savePortfolioSnapshotHourly,
  type StoredPortfolioSnapshot,
} from "./portfolioSnapshotStore.js";
import { query } from "../db.js";

export type ChartRange = "24h" | "7d" | "30d" | "1y";

export interface PortfolioHistoryPoint {
  timestamp: number;
  assetsUsd: number;
  debtUsd: number;
  netWorthUsd: number;
}

const RANGE_INTERVAL: Record<ChartRange, string> = {
  "24h": "24 hours",
  "7d": "7 days",
  "30d": "30 days",
  "1y": "365 days",
};

const RANGE_MS: Record<ChartRange, number> = {
  "24h": 86_400_000,
  "7d": 7 * 86_400_000,
  "30d": 30 * 86_400_000,
  "1y": 365 * 86_400_000,
};

const RANGE_BACKFILL_DAYS: Record<ChartRange, number> = {
  "24h": 2,
  "7d": 7,
  "30d": 30,
  "1y": 365,
};

const RANGE_BUCKET: Record<ChartRange, string> = {
  "24h": "hour",
  "7d": "hour",
  "30d": "day",
  "1y": "day",
};

const RANGE_STEP_MS: Record<ChartRange, number> = {
  "24h": 3_600_000,
  "7d": 3_600_000,
  "30d": 86_400_000,
  "1y": 86_400_000,
};

/** RPC page budget per direction — keeps chart builds under ~2s on prod RPC. */
const RANGE_TX_PAGES: Record<ChartRange, number> = {
  "24h": 3,
  "7d": 6,
  "30d": 10,
  "1y": 16,
};

const TX_FETCH_DEADLINE_MS = 2_500;

interface TickRow {
  bucket: Date | string;
  coin_type: string;
  price: number;
}

function buildHistoricalPriceMaps(
  tickRows: TickRow[],
  coinTypes: string[],
  spotByCoinType: Map<string, number>,
  bucketTimes: number[],
): Map<number, Map<string, number>> {
  const byBucket = new Map<number, Map<string, number>>();
  const rowsByBucket = new Map<number, TickRow[]>();
  for (const row of tickRows) {
    const t = new Date(row.bucket).getTime();
    const rows = rowsByBucket.get(t) ?? [];
    rows.push(row);
    rowsByBucket.set(t, rows);
  }

  const lastPrice = new Map(spotByCoinType);

  for (const t of [...bucketTimes].sort((a, b) => a - b)) {
    const atT = new Map<string, number>();
    for (const row of rowsByBucket.get(t) ?? []) {
      const coinType = normalizeCoinType(row.coin_type);
      const spot = spotByCoinType.get(coinType);
      const price = sanitizeTickPrice(spot, row.price);
      if (price > 0) {
        atT.set(coinType, price);
        lastPrice.set(coinType, price);
      }
    }
    for (const coinType of coinTypes) {
      if (atT.has(coinType)) continue;
      const prev = lastPrice.get(coinType);
      if (prev !== undefined) {
        atT.set(coinType, prev);
        continue;
      }
      const spot = spotByCoinType.get(coinType);
      if (spot !== undefined) atT.set(coinType, spot);
    }
    byBucket.set(t, atT);
  }

  return byBucket;
}

function floorToStep(t: number, stepMs: number): number {
  return Math.floor(t / stepMs) * stepMs;
}

function buildBucketTimes(range: ChartRange, rangeStart: number, rangeEnd: number): number[] {
  const step = RANGE_STEP_MS[range];
  const out: number[] = [];
  let t = floorToStep(rangeStart, step);
  if (t < rangeStart - step / 2) t += step;
  for (; t <= rangeEnd; t += step) {
    out.push(t);
  }
  return out;
}

function snapshotStateAtTime(
  snapshots: StoredPortfolioSnapshot[],
  t: number,
): { assets: { coinType: string; balance: string }[]; liabilities: { coinType: string; balance: string }[] } | null {
  let best: StoredPortfolioSnapshot | null = null;
  for (const snap of snapshots) {
    if (snap.ts <= t) best = snap;
    else break;
  }
  if (!best) return null;
  return { assets: best.assets, liabilities: best.liabilities };
}

function buildPointsFromSnapshots(input: {
  snapshots: StoredPortfolioSnapshot[];
  bucketTimes: number[];
  priceByBucket: Map<number, Map<string, number>>;
  metaMap: Map<string, CoinMeta>;
}): PortfolioHistoryPoint[] {
  const points: PortfolioHistoryPoint[] = [];
  for (const t of [...input.bucketTimes].sort((a, b) => a - b)) {
    const state = snapshotStateAtTime(input.snapshots, t);
    if (!state) continue;
    const pricesAtT = input.priceByBucket.get(t);
    if (!pricesAtT || pricesAtT.size === 0) continue;
    const valued = valueSnapshotAtPrices(state, pricesAtT, input.metaMap);
    if (!Number.isFinite(valued.netWorthUsd)) continue;
    points.push({ timestamp: t, ...valued });
  }
  return points;
}

function chartPointsToPortfolioPoints(
  points: { t: number; valueUsd: number }[],
): PortfolioHistoryPoint[] {
  return points.map((p) => ({
    timestamp: p.t,
    assetsUsd: p.valueUsd,
    debtUsd: 0,
    netWorthUsd: p.valueUsd,
  }));
}

export async function buildPortfolioHistory(input: {
  address: string;
  range: ChartRange;
  snapshot: WalletSnapshot;
}): Promise<{
  points: PortfolioHistoryPoint[];
  liveTotalUsd: number | null;
  activeSinceMs: number | null;
  historyStartMs: number | null;
  source: "snapshots" | "chain_replay" | "price_only";
}> {
  const { address, range, snapshot } = input;
  const rangeEnd = Date.now();
  const rangeStart = rangeEnd - RANGE_MS[range];
  const stakingPrincipalMist = sumNativeStakingPrincipal(snapshot.defi);
  const nonStakingPositionsUsd = getNonStakingPositionsUsd(snapshot.defi);

  const [summary, activeSinceMs, storedSnapshots, liveState, txEventsRaw] = await Promise.all([
    getPortfolioSummary(address, snapshot),
    getWalletActiveSinceMs(address),
    loadPortfolioSnapshots(address, new Date(rangeStart)),
    buildPortfolioSnapshotState(address, snapshot.balanceSource.rows, snapshot.defi),
    fetchWalletBalanceEvents(address, rangeStart, {
      maxPagesPerFilter: RANGE_TX_PAGES[range],
      deadlineMs: TX_FETCH_DEADLINE_MS,
    }),
  ]);

  const liveTotalUsd = summary.totalUsd > 0 ? summary.totalUsd : null;
  const txEvents = txEventsRaw.filter(
    (e) => e.timestampMs >= Math.max(rangeStart, activeSinceMs ?? rangeStart),
  );

  void savePortfolioSnapshotHourly(address, liveState).catch(() => {});

  const walletMeta = await getCoinMetadata(
    snapshot.balanceSource.rows.map((row) => row.coin_type),
  );
  const walletHoldings = walletHoldingsFromBalances(snapshot.balanceSource.rows, walletMeta);

  const preliminaryCoins = [
    ...new Set([
      ...walletHoldings.map((h) => h.coinType),
      ...liveState.assets.map((a) => a.coinType),
      ...liveState.liabilities.map((l) => l.coinType),
      ...storedSnapshots.flatMap((s) => [
        ...s.assets.map((a) => a.coinType),
        ...s.liabilities.map((l) => l.coinType),
      ]),
    ]),
  ];

  const metaMap = await getCoinMetadata(preliminaryCoins);

  await backfillHistory(
    preliminaryCoins.map((coinType) => ({
      coinType,
      symbol: metaMap.get(coinType)?.symbol ?? null,
    })),
    { days: RANGE_BACKFILL_DAYS[range] },
  ).catch(() => {});

  let tickRows: TickRow[] = [];
  try {
    const result = await query<TickRow>(
      `SELECT date_trunc($3, pt.ts) AS bucket,
              pt.coin_type,
              avg(pt.price_usd)::double precision AS price
         FROM price_ticks pt
        WHERE pt.ts > now() - $1::interval
          AND pt.coin_type = ANY($2)
        GROUP BY 1, 2
        ORDER BY 1`,
      [RANGE_INTERVAL[range], preliminaryCoins, RANGE_BUCKET[range]],
    );
    tickRows = result.rows;
  } catch {
    /* offline */
  }

  const spotByCoinType = await getCoinTypeUsdPrices(
    preliminaryCoins.map((coinType) => ({
      coinType,
      symbol: metaMap.get(coinType)?.symbol ?? null,
    })),
  );

  const bucketTimes = buildBucketTimes(range, rangeStart, rangeEnd);
  const priceByBucket = buildHistoricalPriceMaps(
    tickRows,
    preliminaryCoins,
    spotByCoinType,
    bucketTimes,
  );

  let source: "snapshots" | "chain_replay" | "price_only" = "price_only";
  let points: PortfolioHistoryPoint[] = [];

  if (storedSnapshots.length >= 2) {
    const snapshotPoints = buildPointsFromSnapshots({
      snapshots: storedSnapshots,
      bucketTimes,
      priceByBucket,
      metaMap,
    });
    const snapshotMax = Math.max(...snapshotPoints.map((p) => p.netWorthUsd), 0);
    const headline = liveTotalUsd ?? snapshotMax;
    if (
      snapshotPoints.length >= Math.min(12, bucketTimes.length) &&
      snapshotMax <= headline * 1.15
    ) {
      points = snapshotPoints;
      source = "snapshots";
    }
  }

  if (points.length < 2) {
    source = txEvents.length > 0 ? "chain_replay" : "price_only";
    const chartPoints = buildPortfolioHistoryFromBuckets({
      bucketTimes,
      priceByBucket,
      walletHoldings,
      stakingPrincipalMist,
      nonStakingPositionsUsd,
      metaByCoinType: walletMeta,
      spotByCoinType,
    });
    points = chartPointsToPortfolioPoints(chartPoints);
  }

  const historyStartMs = bucketTimes[0] ?? rangeStart;

  if (liveTotalUsd !== null && liveTotalUsd > 0) {
    const aligned = alignLastChartPoint(
      points.map((p) => ({ t: p.timestamp, valueUsd: p.netWorthUsd })),
      liveTotalUsd,
    );
    points = chartPointsToPortfolioPoints(appendLiveChartPoint(aligned, liveTotalUsd));
  }

  return {
    points,
    liveTotalUsd,
    activeSinceMs,
    historyStartMs,
    source,
  };
}
