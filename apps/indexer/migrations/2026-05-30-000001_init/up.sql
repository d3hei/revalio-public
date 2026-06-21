-- Revalio domain schema (owned by the indexer; applied automatically on startup).
-- Conventions:
--   * addresses / object ids / tx digests are lowercase 0x-prefixed TEXT
--     (digests are Base58, kept as TEXT for readability — see Sui docs).
--   * token amounts are raw on-chain integers (NUMERIC); decimals applied at read time.
--   * timestamps are unix milliseconds (BIGINT) to avoid timezone/chrono mapping.

CREATE TABLE IF NOT EXISTS coins (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  coin_type     TEXT UNIQUE NOT NULL,
  symbol        TEXT,
  name          TEXT,
  decimals      INT NOT NULL DEFAULT 0,
  icon_url      TEXT,
  price_feed_id TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS objects (
  object_id      TEXT PRIMARY KEY,
  object_type    TEXT,
  owner_address  TEXT,
  version        BIGINT NOT NULL DEFAULT 0,
  last_tx_digest TEXT,
  last_change_ms BIGINT,
  contents       JSONB
);
CREATE INDEX IF NOT EXISTS idx_objects_owner ON objects (owner_address);
CREATE INDEX IF NOT EXISTS idx_objects_type  ON objects (object_type);

CREATE TABLE IF NOT EXISTS coin_objects (
  object_id     TEXT PRIMARY KEY,
  coin_type     TEXT NOT NULL,
  owner_address TEXT NOT NULL,
  balance       NUMERIC(78, 0) NOT NULL DEFAULT 0,
  version       BIGINT NOT NULL DEFAULT 0,
  last_change_ms BIGINT
);
CREATE INDEX IF NOT EXISTS idx_coin_objects_owner ON coin_objects (owner_address);
CREATE INDEX IF NOT EXISTS idx_coin_objects_type  ON coin_objects (coin_type);
CREATE INDEX IF NOT EXISTS idx_coin_objects_owner_type ON coin_objects (owner_address, coin_type);

CREATE TABLE IF NOT EXISTS balances (
  owner_address TEXT NOT NULL,
  coin_type     TEXT NOT NULL,
  balance       NUMERIC(78, 0) NOT NULL DEFAULT 0,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (owner_address, coin_type)
);
CREATE INDEX IF NOT EXISTS idx_balances_owner ON balances (owner_address);

CREATE TABLE IF NOT EXISTS transactions (
  tx_digest    TEXT PRIMARY KEY,
  checkpoint   BIGINT NOT NULL,
  timestamp_ms BIGINT NOT NULL,
  sender       TEXT,
  kind         TEXT,
  effects      JSONB,
  events       JSONB
);
CREATE INDEX IF NOT EXISTS idx_tx_sender_ts ON transactions (sender, timestamp_ms DESC);
CREATE INDEX IF NOT EXISTS idx_tx_checkpoint ON transactions (checkpoint);

CREATE TABLE IF NOT EXISTS positions (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  owner_address TEXT NOT NULL,
  protocol      TEXT NOT NULL,
  position_type TEXT NOT NULL,
  object_id     TEXT,
  details       JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_positions_owner ON positions (owner_address);
CREATE INDEX IF NOT EXISTS idx_positions_owner_protocol ON positions (owner_address, protocol);
CREATE UNIQUE INDEX IF NOT EXISTS uq_positions_object ON positions (object_id) WHERE object_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS price_ticks (
  coin_type TEXT NOT NULL,
  ts        TIMESTAMPTZ NOT NULL,
  price_usd DOUBLE PRECISION NOT NULL,
  source    TEXT NOT NULL DEFAULT 'pyth',
  PRIMARY KEY (coin_type, ts)
);
CREATE INDEX IF NOT EXISTS idx_price_ticks_coin_ts ON price_ticks (coin_type, ts DESC);
