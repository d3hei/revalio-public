import { config } from "../config.js";
import { query } from "../db.js";
import { fetchJson } from "./http.js";
import { ensurePriceTicksTable } from "./priceSchema.js";

// Coin symbol -> CoinGecko id, used to backfill historical USD prices so the
// portfolio chart has data immediately (the live collector fills going forward).
const COINGECKO_IDS: Record<string, string> = {
  SUI: "sui",
  USDC: "usd-coin",
  USDT: "tether",
  ETH: "ethereum",
  WETH: "weth",
  BTC: "bitcoin",
  WBTC: "wrapped-bitcoin",
};

const BACKFILL_DAYS_DEFAULT = 7;
const CG_TIMEOUT_MS = 6_000;
const CG_LONG_TIMEOUT_MS = 20_000;
// If we already have this many recent ticks for a symbol's coins, skip the
// (rate-limited) CoinGecko call.
const ENOUGH_TICKS = 150;
const INSERT_CHUNK = 500;

interface MarketChartResponse {
  prices?: [number, number][];
}

function minTicksForSpan(days: number): number {
  if (days <= 7) return 100;
  if (days <= 30) return 150;
  return Math.min(320, Math.floor(days * 0.75));
}

function requiredSpanDays(days: number): number {
  if (days <= 30) return days * 0.85;
  return days * 0.85;
}

async function hasEnoughPriceHistory(coinTypes: string[], days: number): Promise<boolean> {
  if (coinTypes.length === 0) return true;
  const { rows } = await query<{ count: string; oldest: Date | null }>(
    `SELECT count(*)::text AS count,
            min(ts) AS oldest
       FROM price_ticks
      WHERE coin_type = ANY($1)
        AND ts > now() - ($2 || ' days')::interval`,
    [coinTypes, String(Math.max(1, days))],
  );
  const count = Number(rows[0]?.count ?? "0");
  const oldest = rows[0]?.oldest;
  if (count < minTicksForSpan(days) || !oldest) return false;

  const spanDays = (Date.now() - new Date(oldest).getTime()) / 86_400_000;
  return spanDays >= requiredSpanDays(days);
}

async function insertTicks(
  coinTypes: string[],
  series: [number, number][],
): Promise<void> {
  try {
    await ensurePriceTicksTable();
  } catch {
    return;
  }

  // Same price series applies to every coin_type sharing the symbol.
  const rows: { coinType: string; tsSec: number; price: number }[] = [];
  for (const coinType of coinTypes) {
    for (const [ms, price] of series) {
      if (Number.isFinite(ms) && Number.isFinite(price)) {
        rows.push({ coinType, tsSec: ms / 1000, price });
      }
    }
  }

  for (let i = 0; i < rows.length; i += INSERT_CHUNK) {
    const chunk = rows.slice(i, i + INSERT_CHUNK);
    const values: string[] = [];
    const args: unknown[] = [];
    chunk.forEach((r, idx) => {
      const base = idx * 3;
      values.push(`($${base + 1}, to_timestamp($${base + 2}), $${base + 3}, 'coingecko')`);
      args.push(r.coinType, r.tsSec, r.price);
    });
    await query(
      `INSERT INTO price_ticks (coin_type, ts, price_usd, source)
       VALUES ${values.join(", ")}
       ON CONFLICT (coin_type, ts) DO NOTHING`,
      args,
    );
  }
}

async function backfillSymbol(
  symbol: string,
  coinTypes: string[],
  days: number,
): Promise<void> {
  const cgId = COINGECKO_IDS[symbol];
  if (!cgId || coinTypes.length === 0) return;

  // Already have enough history (from a prior backfill or the live collector).
  try {
    if (await hasEnoughPriceHistory(coinTypes, days)) return;
  } catch {
    /* Postgres offline — skip tick check */
  }

  try {
    const url = `${config.prices.coingeckoUrl}/coins/${cgId}/market_chart?vs_currency=usd&days=${days}`;
    // CoinGecko's free tier is aggressively rate-limited; fetchJson retries with
    // backoff and honors Retry-After so a single 429 doesn't lose the backfill.
    const body = await fetchJson<MarketChartResponse>(url, {
      timeoutMs: days >= 180 ? CG_LONG_TIMEOUT_MS : CG_TIMEOUT_MS,
      retries: 3,
      retryMaxMs: 8000,
    });
    if (!body.prices?.length) return;
    await insertTicks(coinTypes, body.prices);
  } catch {
    /* best-effort: chart just shows whatever the live collector has gathered */
  }
}

/**
 * Ensure the given coins have recent USD price history, backfilling from
 * CoinGecko when needed. Best-effort and never throws.
 */
export async function backfillHistory(
  coins: { coinType: string; symbol: string | null }[],
  options?: { days?: number },
): Promise<void> {
  const days = options?.days ?? BACKFILL_DAYS_DEFAULT;
  const bySymbol = new Map<string, string[]>();
  for (const { coinType, symbol } of coins) {
    if (!symbol || !COINGECKO_IDS[symbol]) continue;
    const list = bySymbol.get(symbol) ?? [];
    list.push(coinType);
    bySymbol.set(symbol, list);
  }
  await Promise.all(
    [...bySymbol].map(([symbol, types]) => backfillSymbol(symbol, types, days)),
  );
}
