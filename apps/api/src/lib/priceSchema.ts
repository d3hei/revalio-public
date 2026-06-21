import { query } from "../db.js";

export async function tableExists(tableName: string): Promise<boolean> {
  const { rows } = await query<{ table_name: string | null }>(
    `SELECT to_regclass($1)::text AS table_name`,
    [`public.${tableName}`],
  );
  return Boolean(rows[0]?.table_name);
}

/** Minimal schema so the API can collect and backfill prices without the indexer. */
export async function ensurePriceTicksTable(): Promise<void> {
  await query(
    `CREATE TABLE IF NOT EXISTS price_ticks (
       coin_type TEXT NOT NULL,
       ts        TIMESTAMPTZ NOT NULL,
       price_usd DOUBLE PRECISION NOT NULL,
       source    TEXT NOT NULL DEFAULT 'pyth',
       PRIMARY KEY (coin_type, ts)
     )`,
  );
  await query(
    `CREATE INDEX IF NOT EXISTS idx_price_ticks_coin_ts
       ON price_ticks (coin_type, ts DESC)`,
  );
}
