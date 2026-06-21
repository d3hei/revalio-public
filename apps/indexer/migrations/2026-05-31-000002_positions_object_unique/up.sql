-- Replace the partial unique index on positions.object_id with a plain unique
-- index so it can serve as an INSERT ... ON CONFLICT (object_id) target for the
-- positions pipeline. (NULL object_ids remain allowed and distinct.)
DROP INDEX IF EXISTS uq_positions_object;
CREATE UNIQUE INDEX uq_positions_object ON positions (object_id);
