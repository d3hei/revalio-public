import { query } from "../db.js";

export interface WalletProfileRow {
  address: string;
  nickname: string | null;
  avatar: string | null;
  bio: string | null;
  updated_at: Date | string;
}

let schemaReady: Promise<void> | null = null;

/** Idempotent — safe when indexer migration has not run yet. */
export async function ensureWalletProfileTable(): Promise<void> {
  if (!schemaReady) {
    schemaReady = query(`
      CREATE TABLE IF NOT EXISTS wallet_profiles (
        address     TEXT PRIMARY KEY,
        nickname    TEXT,
        avatar      TEXT,
        bio         TEXT,
        updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS wallet_profiles_updated_at_idx ON wallet_profiles (updated_at);
      ALTER TABLE wallet_profiles ADD COLUMN IF NOT EXISTS bio TEXT;
    `).then(() => undefined);
  }
  await schemaReady;
}

export async function getWalletProfile(address: string): Promise<WalletProfileRow | null> {
  await ensureWalletProfileTable();
  const { rows } = await query<WalletProfileRow>(
    `SELECT address, nickname, avatar, bio, updated_at
       FROM wallet_profiles
      WHERE address = $1`,
    [address],
  );
  return rows[0] ?? null;
}

export async function upsertWalletProfile(
  address: string,
  nickname: string | null,
  avatar: string | null,
  bio: string | null,
): Promise<WalletProfileRow> {
  await ensureWalletProfileTable();
  const { rows } = await query<WalletProfileRow>(
    `INSERT INTO wallet_profiles (address, nickname, avatar, bio, updated_at)
     VALUES ($1, $2, $3, $4, now())
     ON CONFLICT (address) DO UPDATE
       SET nickname = EXCLUDED.nickname,
           avatar = EXCLUDED.avatar,
           bio = EXCLUDED.bio,
           updated_at = now()
     RETURNING address, nickname, avatar, bio, updated_at`,
    [address, nickname, avatar, bio],
  );
  return rows[0]!;
}
