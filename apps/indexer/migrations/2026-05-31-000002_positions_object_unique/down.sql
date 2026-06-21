DROP INDEX IF EXISTS uq_positions_object;
CREATE UNIQUE INDEX uq_positions_object ON positions (object_id) WHERE object_id IS NOT NULL;
