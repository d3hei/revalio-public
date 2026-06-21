-- Optional demo seed: lets you see the web UI end-to-end before the indexer exists.
-- Run manually (NOT auto-applied):
--   docker exec -i revalio-postgres psql -U revalio -d revalio < infra/seed.sql
-- Sample address (zero-padded form of 0xA11CE):
--   0x00000000000000000000000000000000000000000000000000000000000a11ce

INSERT INTO coins (coin_type, symbol, name, decimals) VALUES
  ('0x2::sui::SUI', 'SUI', 'Sui', 9),
  ('0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf::coin::COIN', 'USDC', 'USD Coin', 6)
ON CONFLICT (coin_type) DO NOTHING;

-- `balances` is a VIEW over coin_objects, so seed coin objects (not balances).
-- The view aggregates these into per-wallet, per-coin totals automatically.
INSERT INTO coin_objects (object_id, coin_type, owner_address, balance, version) VALUES
  ('0x000000000000000000000000000000000000000000000000000000000dem00001', '0x2::sui::SUI', '0x00000000000000000000000000000000000000000000000000000000000a11ce', 1234500000000, 1),
  ('0x000000000000000000000000000000000000000000000000000000000dem00002', '0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf::coin::COIN', '0x00000000000000000000000000000000000000000000000000000000000a11ce', 500000000, 1)
ON CONFLICT (object_id)
  DO UPDATE SET balance = EXCLUDED.balance, version = EXCLUDED.version;

-- Demo DeFi position (native SUI staking) so the Positions UI is visible even
-- when the indexed checkpoint range happens to contain no staking activity.
INSERT INTO positions (owner_address, protocol, position_type, object_id, details) VALUES
  ('0x00000000000000000000000000000000000000000000000000000000000a11ce',
   'sui-system',
   'native-staking',
   '0x000000000000000000000000000000000000000000000000000000000dem0pos1',
   '{"poolId":"0x0000000000000000000000000000000000000000000000000000000000005ta1","activationEpoch":420,"principal":"5000000000000"}'::jsonb)
ON CONFLICT (object_id) DO NOTHING;
