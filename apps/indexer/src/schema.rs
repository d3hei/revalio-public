// Diesel table definitions used by the indexer's Diesel queries.
// Regenerate from the live DB with: diesel print-schema > src/schema.rs
//
// Only tables written via Diesel are declared here. Other domain tables
// (coins, objects, positions, ...) exist in the DB and are read by the API
// directly, so they are intentionally omitted until a handler writes them.
//
// `balances` is a VIEW aggregated over `coin_objects` (see the balances_view
// migration), so it is never written by the indexer and not declared here.

diesel::table! {
    transactions (tx_digest) {
        tx_digest -> Text,
        checkpoint -> Int8,
        timestamp_ms -> Int8,
        sender -> Nullable<Text>,
        kind -> Nullable<Text>,
    }
}

diesel::table! {
    coin_objects (object_id) {
        object_id -> Text,
        coin_type -> Text,
        owner_address -> Text,
        balance -> Numeric,
        version -> Int8,
        last_change_ms -> Nullable<Int8>,
    }
}

diesel::table! {
    positions (id) {
        id -> Int8,
        owner_address -> Text,
        protocol -> Text,
        position_type -> Text,
        object_id -> Nullable<Text>,
        details -> Jsonb,
        updated_at -> Timestamptz,
    }
}
