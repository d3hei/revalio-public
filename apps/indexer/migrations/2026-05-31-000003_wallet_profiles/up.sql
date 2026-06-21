CREATE TABLE IF NOT EXISTS wallet_profiles (
    address     TEXT PRIMARY KEY,
    nickname    TEXT,
    avatar      TEXT,
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS wallet_profiles_updated_at_idx ON wallet_profiles (updated_at);
