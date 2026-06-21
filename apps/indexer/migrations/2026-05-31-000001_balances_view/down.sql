DROP VIEW IF EXISTS balances;

CREATE TABLE IF NOT EXISTS balances (
  owner_address TEXT NOT NULL,
  coin_type     TEXT NOT NULL,
  balance       NUMERIC(78, 0) NOT NULL DEFAULT 0,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (owner_address, coin_type)
);
CREATE INDEX IF NOT EXISTS idx_balances_owner ON balances (owner_address);
