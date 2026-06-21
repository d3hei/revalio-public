use bigdecimal::BigDecimal;
use diesel::prelude::*;
use sui_indexer_alt_framework::FieldCount;

use crate::schema::{coin_objects, positions, transactions};

/// One row in `transactions`: digest + checkpoint + timestamp, plus the sender
/// and transaction kind used by the activity feed.
#[derive(Insertable, Debug, Clone, FieldCount)]
#[diesel(table_name = transactions)]
pub struct StoredTransaction {
    pub tx_digest: String,
    pub checkpoint: i64,
    pub timestamp_ms: i64,
    pub sender: Option<String>,
    pub kind: Option<String>,
}

/// One row in `coin_objects`: the current state of a single address-owned
/// `Coin<T>` object. Aggregated into per-wallet `balances` by the SQL view.
#[derive(Insertable, Debug, Clone, FieldCount)]
#[diesel(table_name = coin_objects)]
pub struct StoredCoinObject {
    pub object_id: String,
    pub coin_type: String,
    pub owner_address: String,
    pub balance: BigDecimal,
    pub version: i64,
    pub last_change_ms: Option<i64>,
}

/// A single change to a coin object emitted while processing a checkpoint.
/// Both variants carry the object version so a commit batch can resolve the
/// final state per object by highest version, regardless of arrival order.
/// `Delete` covers objects that were removed (deleted/wrapped) or that ceased
/// to be a wallet balance (transferred to non-address ownership).
#[derive(Debug, Clone)]
pub enum CoinChange {
    Upsert(StoredCoinObject),
    Delete { object_id: String, version: i64 },
}

/// One row in `positions`: an address-owned DeFi position object (currently
/// native SUI staking). `details` holds protocol-specific fields as JSON.
#[derive(Insertable, Debug, Clone, FieldCount)]
#[diesel(table_name = positions)]
pub struct StoredPosition {
    pub owner_address: String,
    pub protocol: String,
    pub position_type: String,
    pub object_id: Option<String>,
    pub details: serde_json::Value,
}

/// A change to a position object within a checkpoint, version-tagged for
/// per-object batch resolution (mirrors `CoinChange`).
#[derive(Debug, Clone)]
pub enum PositionChange {
    Upsert {
        version: i64,
        position: StoredPosition,
    },
    Delete {
        object_id: String,
        version: i64,
    },
}
