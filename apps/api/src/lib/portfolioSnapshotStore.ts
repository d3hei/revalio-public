import { query } from "../db.js";

export interface SnapshotLine {
  coinType: string;
  /** Raw on-chain integer amount (string for JSON/NUMERIC safety). */
  balance: string;
}

export interface PortfolioSnapshotState {
  assets: SnapshotLine[];
  liabilities: SnapshotLine[];
}

/** Persisted wallet state snapshots for portfolio history (TZ: balance_snapshots). */
export async function ensurePortfolioSnapshotsTable(): Promise<void> {
  await query(
    `CREATE TABLE IF NOT EXISTS portfolio_snapshots (
       owner_address TEXT NOT NULL,
       ts            TIMESTAMPTZ NOT NULL,
       assets        JSONB NOT NULL DEFAULT '[]'::jsonb,
       liabilities   JSONB NOT NULL DEFAULT '[]'::jsonb,
       PRIMARY KEY (owner_address, ts)
     )`,
  );
  await query(
    `CREATE INDEX IF NOT EXISTS idx_portfolio_snapshots_owner_ts
       ON portfolio_snapshots (owner_address, ts DESC)`,
  );
}

export async function savePortfolioSnapshot(
  ownerAddress: string,
  ts: Date,
  state: PortfolioSnapshotState,
): Promise<void> {
  await ensurePortfolioSnapshotsTable();
  await query(
    `INSERT INTO portfolio_snapshots (owner_address, ts, assets, liabilities)
     VALUES ($1, $2, $3::jsonb, $4::jsonb)
     ON CONFLICT (owner_address, ts) DO UPDATE
       SET assets = EXCLUDED.assets,
           liabilities = EXCLUDED.liabilities`,
    [ownerAddress, ts, JSON.stringify(state.assets), JSON.stringify(state.liabilities)],
  );
}

/** Skip writing if a snapshot already exists in the current hour bucket. */
export async function savePortfolioSnapshotHourly(
  ownerAddress: string,
  state: PortfolioSnapshotState,
): Promise<void> {
  await ensurePortfolioSnapshotsTable();
  const hourStart = new Date();
  hourStart.setMinutes(0, 0, 0);

  const { rows } = await query<{ ts: Date }>(
    `SELECT ts FROM portfolio_snapshots
      WHERE owner_address = $1
        AND ts >= $2
      ORDER BY ts DESC
      LIMIT 1`,
    [ownerAddress, hourStart],
  );
  if (rows.length > 0) return;

  await savePortfolioSnapshot(ownerAddress, new Date(), state);
}

export interface StoredPortfolioSnapshot {
  ts: number;
  assets: SnapshotLine[];
  liabilities: SnapshotLine[];
}

export async function loadPortfolioSnapshots(
  ownerAddress: string,
  since: Date,
): Promise<StoredPortfolioSnapshot[]> {
  try {
    await ensurePortfolioSnapshotsTable();
    const { rows } = await query<{
      ts: Date;
      assets: SnapshotLine[];
      liabilities: SnapshotLine[];
    }>(
      `SELECT ts, assets, liabilities
         FROM portfolio_snapshots
        WHERE owner_address = $1
          AND ts >= $2
        ORDER BY ts ASC`,
      [ownerAddress, since],
    );
    return rows.map((r) => ({
      ts: new Date(r.ts).getTime(),
      assets: Array.isArray(r.assets) ? r.assets : [],
      liabilities: Array.isArray(r.liabilities) ? r.liabilities : [],
    }));
  } catch {
    return [];
  }
}
