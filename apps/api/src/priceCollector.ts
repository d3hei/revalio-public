import { query } from "./db.js";
import { getCoinMetadata } from "./lib/coinMetadata.js";
import { ensurePriceTicksTable, tableExists } from "./lib/priceSchema.js";
import { getUsdPrices } from "./lib/prices.js";

const INTERVAL_MS = 60_000;
const INITIAL_DELAY_MS = 5_000;
const DEFAULT_TRACKED_COINS: { coin_type: string; symbol: string }[] = [
  { coin_type: "0x2::sui::SUI", symbol: "SUI" },
  {
    coin_type: "0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC",
    symbol: "USDC",
  },
  {
    coin_type: "0xdeeb7a4662eec9f2d29598cc93a339c904941179de1140a2732e7a7a793d2d43::deep::DEEP",
    symbol: "DEEP",
  },
];

interface Logger {
  error: (obj: unknown, msg?: string) => void;
}

/**
 * Snapshot current USD prices into `price_ticks`.
 *
 * Prefer the canonical `coins` table when it exists. If the database was
 * booted without that table, fall back to the coin types already present in
 * `price_ticks` so the collector keeps running instead of failing every minute.
 */
async function collectOnce(): Promise<void> {
  await ensurePriceTicksTable();

  let rows: { coin_type: string; symbol: string | null }[] = [];
  if (await tableExists("coins")) {
    const result = await query<{ coin_type: string; symbol: string | null }>(
      `SELECT coin_type, symbol FROM coins WHERE symbol IS NOT NULL`,
    );
    rows = result.rows;
  }

  if (rows.length === 0) {
    const result = await query<{ coin_type: string }>(
      `SELECT DISTINCT coin_type
         FROM price_ticks
        ORDER BY coin_type`,
    );
    const meta = await getCoinMetadata(result.rows.map((r) => r.coin_type));
    rows = result.rows
      .map((r) => ({ coin_type: r.coin_type, symbol: meta.get(r.coin_type)?.symbol ?? null }))
      .filter((r): r is { coin_type: string; symbol: string } => r.symbol !== null);
  }

  if (rows.length === 0) {
    rows = DEFAULT_TRACKED_COINS;
  }

  if (rows.length === 0) return;

  const symbolRows = rows.filter(
    (r): r is { coin_type: string; symbol: string } => r.symbol !== null,
  );
  const symbols = [...new Set(symbolRows.map((r) => r.symbol))];
  const priceMap = await getUsdPrices(symbols);
  const priced = symbolRows.filter((r) => priceMap.has(r.symbol));
  if (priced.length === 0) return;

  const values: string[] = [];
  const args: unknown[] = [];
  priced.forEach((r, idx) => {
    const base = idx * 2;
    values.push(`($${base + 1}, now(), $${base + 2}, 'pyth')`);
    args.push(r.coin_type, priceMap.get(r.symbol));
  });

  await query(
    `INSERT INTO price_ticks (coin_type, ts, price_usd, source)
     VALUES ${values.join(", ")}
     ON CONFLICT (coin_type, ts) DO NOTHING`,
    args,
  );
}

/** Start the periodic price collector. Returns a stop function. */
export function startPriceCollector(log: Logger): () => void {
  const tick = () => {
    collectOnce().catch((err) => log.error(err, "price collector tick failed"));
  };

  const initial = setTimeout(tick, INITIAL_DELAY_MS);
  const interval = setInterval(tick, INTERVAL_MS);
  // Don't keep the event loop alive solely for the collector.
  initial.unref?.();
  interval.unref?.();

  return () => {
    clearTimeout(initial);
    clearInterval(interval);
  };
}
