-- Per-wallet balances are now a derived aggregate over coin_objects rather than
-- a separately-maintained table. This keeps balances always-consistent with the
-- coin objects the indexer ingests (transfers, deletes, and merges included),
-- with no incremental balance arithmetic in the handler.

DROP TABLE IF EXISTS balances;

CREATE VIEW balances AS
SELECT owner_address,
       coin_type,
       SUM(balance)::NUMERIC(78, 0) AS balance
  FROM coin_objects
 GROUP BY owner_address, coin_type;
