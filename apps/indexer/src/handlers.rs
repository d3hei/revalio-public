use std::collections::HashMap;
use std::sync::Arc;

use anyhow::Result;
use bigdecimal::BigDecimal;
use diesel::dsl::now;
use diesel::upsert::excluded;
use diesel::{ExpressionMethods, QueryDsl};
use diesel_async::RunQueryDsl;
use sui_indexer_alt_framework::pipeline::Processor;
use sui_indexer_alt_framework::pipeline::sequential::Handler;
use sui_indexer_alt_framework::postgres::{Connection, Db};
use sui_indexer_alt_framework::types::effects::TransactionEffectsAPI;
use sui_indexer_alt_framework::types::full_checkpoint_content::Checkpoint;
use sui_indexer_alt_framework::types::governance::StakedSui;
use sui_indexer_alt_framework::types::transaction::{TransactionDataAPI, TransactionKind};

use crate::models::{
    CoinChange, PositionChange, StoredCoinObject, StoredPosition, StoredTransaction,
};
use crate::schema::{coin_objects, positions, transactions};

// ----------------------------------------------------------------------------
// transactions
// ----------------------------------------------------------------------------

pub struct TransactionHandler;

#[async_trait::async_trait]
impl Processor for TransactionHandler {
    const NAME: &'static str = "transactions";

    type Value = StoredTransaction;

    async fn process(&self, checkpoint: &Arc<Checkpoint>) -> Result<Vec<Self::Value>> {
        let checkpoint_seq = checkpoint.summary.sequence_number as i64;
        let ts_ms = checkpoint.summary.timestamp_ms as i64;

        let rows = checkpoint
            .transactions
            .iter()
            .map(|tx| StoredTransaction {
                tx_digest: tx.transaction.digest().to_string(),
                checkpoint: checkpoint_seq,
                timestamp_ms: ts_ms,
                sender: Some(tx.transaction.sender().to_string()),
                kind: Some(kind_label(tx.transaction.kind()).to_string()),
            })
            .collect();

        Ok(rows)
    }
}

#[async_trait::async_trait]
impl Handler for TransactionHandler {
    type Store = Db;
    type Batch = Vec<Self::Value>;

    fn batch(&self, batch: &mut Self::Batch, values: std::vec::IntoIter<Self::Value>) {
        batch.extend(values);
    }

    async fn commit<'a>(&self, batch: &Self::Batch, conn: &mut Connection<'a>) -> Result<usize> {
        let inserted = diesel::insert_into(transactions::table)
            .values(batch)
            .on_conflict(transactions::tx_digest)
            .do_nothing()
            .execute(conn)
            .await?;

        Ok(inserted)
    }
}

/// Stable, human-readable label for a transaction kind (stored in `transactions.kind`).
fn kind_label(kind: &TransactionKind) -> &'static str {
    <&'static str>::from(kind)
}

// ----------------------------------------------------------------------------
// coin_objects
// ----------------------------------------------------------------------------

pub struct CoinObjectHandler;

#[async_trait::async_trait]
impl Processor for CoinObjectHandler {
    const NAME: &'static str = "coin_objects";

    type Value = CoinChange;

    async fn process(&self, checkpoint: &Arc<Checkpoint>) -> Result<Vec<Self::Value>> {
        let ts_ms = checkpoint.summary.timestamp_ms as i64;
        let mut changes = Vec::new();

        for tx in &checkpoint.transactions {
            // Removed objects (deleted / wrapped / unwrapped-then-deleted). We don't
            // know here whether they were coins, so we emit a delete for each id and
            // let the DELETE no-op for non-coin ids (they aren't in coin_objects).
            for obj_ref in tx
                .effects
                .deleted()
                .into_iter()
                .chain(tx.effects.wrapped())
                .chain(tx.effects.unwrapped_then_deleted())
            {
                changes.push(CoinChange::Delete {
                    object_id: obj_ref.0.to_string(),
                    version: obj_ref.1.value() as i64,
                });
            }

            // Created / mutated objects in their post-execution state.
            for obj in tx.output_objects(&checkpoint.object_set) {
                if !obj.is_coin() {
                    continue;
                }
                let object_id = obj.id().to_string();
                let version = obj.version().value() as i64;

                // A coin is a wallet balance only while it is address-owned. If a
                // coin becomes object-/shared-/immutable-owned, drop any stale row.
                match (
                    obj.owner().get_address_owner_address(),
                    obj.coin_type_maybe(),
                ) {
                    (Ok(owner), Some(coin_type)) => {
                        changes.push(CoinChange::Upsert(StoredCoinObject {
                            object_id,
                            coin_type: coin_type.to_string(),
                            owner_address: owner.to_string(),
                            balance: BigDecimal::from(obj.get_coin_value_unsafe()),
                            version,
                            last_change_ms: Some(ts_ms),
                        }))
                    }
                    _ => changes.push(CoinChange::Delete { object_id, version }),
                }
            }
        }

        Ok(changes)
    }
}

/// Resolved latest state of one coin object within a commit batch.
enum Latest {
    Upsert(StoredCoinObject),
    Delete,
}

/// Accumulated coin changes for a single commit batch, deduplicated per object id
/// by highest version so the final state is independent of arrival order. This is
/// required because Postgres rejects an INSERT ... ON CONFLICT that touches the
/// same conflict key twice, and lets ownership transitions resolve correctly.
#[derive(Default)]
pub struct CoinBatch {
    /// object_id -> (version, latest state)
    latest: HashMap<String, (i64, Latest)>,
}

impl CoinBatch {
    fn observe(&mut self, object_id: String, version: i64, state: Latest) {
        match self.latest.get_mut(&object_id) {
            Some(slot) if version >= slot.0 => *slot = (version, state),
            Some(_) => {}
            None => {
                self.latest.insert(object_id, (version, state));
            }
        }
    }
}

#[async_trait::async_trait]
impl Handler for CoinObjectHandler {
    type Store = Db;
    type Batch = CoinBatch;

    fn batch(&self, batch: &mut Self::Batch, values: std::vec::IntoIter<Self::Value>) {
        for value in values {
            match value {
                CoinChange::Upsert(obj) => {
                    batch.observe(obj.object_id.clone(), obj.version, Latest::Upsert(obj));
                }
                CoinChange::Delete { object_id, version } => {
                    batch.observe(object_id, version, Latest::Delete);
                }
            }
        }
    }

    async fn commit<'a>(&self, batch: &Self::Batch, conn: &mut Connection<'a>) -> Result<usize> {
        let mut upserts: Vec<StoredCoinObject> = Vec::new();
        let mut deletes: Vec<&str> = Vec::new();
        for (object_id, (_, state)) in &batch.latest {
            match state {
                Latest::Upsert(obj) => upserts.push(obj.clone()),
                Latest::Delete => deletes.push(object_id.as_str()),
            }
        }

        let mut affected = 0usize;

        if !deletes.is_empty() {
            affected +=
                diesel::delete(coin_objects::table.filter(coin_objects::object_id.eq_any(deletes)))
                    .execute(conn)
                    .await?;
        }

        if !upserts.is_empty() {
            affected += diesel::insert_into(coin_objects::table)
                .values(&upserts)
                .on_conflict(coin_objects::object_id)
                .do_update()
                .set((
                    coin_objects::coin_type.eq(excluded(coin_objects::coin_type)),
                    coin_objects::owner_address.eq(excluded(coin_objects::owner_address)),
                    coin_objects::balance.eq(excluded(coin_objects::balance)),
                    coin_objects::version.eq(excluded(coin_objects::version)),
                    coin_objects::last_change_ms.eq(excluded(coin_objects::last_change_ms)),
                ))
                .execute(conn)
                .await?;
        }

        Ok(affected)
    }
}

// ----------------------------------------------------------------------------
// positions (native SUI staking)
// ----------------------------------------------------------------------------

pub struct PositionHandler;

#[async_trait::async_trait]
impl Processor for PositionHandler {
    const NAME: &'static str = "positions";

    type Value = PositionChange;

    async fn process(&self, checkpoint: &Arc<Checkpoint>) -> Result<Vec<Self::Value>> {
        let mut changes = Vec::new();

        for tx in &checkpoint.transactions {
            for obj_ref in tx
                .effects
                .deleted()
                .into_iter()
                .chain(tx.effects.wrapped())
                .chain(tx.effects.unwrapped_then_deleted())
            {
                changes.push(PositionChange::Delete {
                    object_id: obj_ref.0.to_string(),
                    version: obj_ref.1.value() as i64,
                });
            }

            for obj in tx.output_objects(&checkpoint.object_set) {
                // `is_staked_sui` lives on MoveObject, not Object.
                let is_staked = obj
                    .data
                    .try_as_move()
                    .map(|move_obj| move_obj.is_staked_sui())
                    .unwrap_or(false);
                if !is_staked {
                    continue;
                }
                let object_id = obj.id().to_string();
                let version = obj.version().value() as i64;

                match (
                    obj.owner().get_address_owner_address(),
                    StakedSui::try_from(obj),
                ) {
                    (Ok(owner), Ok(staked)) => {
                        let details = serde_json::json!({
                            "poolId": staked.pool_id().to_string(),
                            "activationEpoch": staked.activation_epoch(),
                            // String to avoid JSON precision loss on large MIST amounts.
                            "principal": staked.principal().to_string(),
                        });
                        changes.push(PositionChange::Upsert {
                            version,
                            position: StoredPosition {
                                owner_address: owner.to_string(),
                                protocol: "sui-system".to_string(),
                                position_type: "native-staking".to_string(),
                                object_id: Some(object_id),
                                details,
                            },
                        });
                    }
                    _ => changes.push(PositionChange::Delete { object_id, version }),
                }
            }
        }

        Ok(changes)
    }
}

enum LatestPosition {
    Upsert(StoredPosition),
    Delete,
}

#[derive(Default)]
pub struct PositionBatch {
    latest: HashMap<String, (i64, LatestPosition)>,
}

impl PositionBatch {
    fn observe(&mut self, object_id: String, version: i64, state: LatestPosition) {
        match self.latest.get_mut(&object_id) {
            Some(slot) if version >= slot.0 => *slot = (version, state),
            Some(_) => {}
            None => {
                self.latest.insert(object_id, (version, state));
            }
        }
    }
}

#[async_trait::async_trait]
impl Handler for PositionHandler {
    type Store = Db;
    type Batch = PositionBatch;

    fn batch(&self, batch: &mut Self::Batch, values: std::vec::IntoIter<Self::Value>) {
        for value in values {
            match value {
                PositionChange::Upsert { version, position } => {
                    let object_id = position
                        .object_id
                        .clone()
                        .expect("position object_id is always set");
                    batch.observe(object_id, version, LatestPosition::Upsert(position));
                }
                PositionChange::Delete { object_id, version } => {
                    batch.observe(object_id, version, LatestPosition::Delete);
                }
            }
        }
    }

    async fn commit<'a>(&self, batch: &Self::Batch, conn: &mut Connection<'a>) -> Result<usize> {
        let mut upserts: Vec<StoredPosition> = Vec::new();
        let mut deletes: Vec<&str> = Vec::new();
        for (object_id, (_, state)) in &batch.latest {
            match state {
                LatestPosition::Upsert(position) => upserts.push(position.clone()),
                LatestPosition::Delete => deletes.push(object_id.as_str()),
            }
        }

        let mut affected = 0usize;

        if !deletes.is_empty() {
            affected +=
                diesel::delete(positions::table.filter(positions::object_id.eq_any(deletes)))
                    .execute(conn)
                    .await?;
        }

        if !upserts.is_empty() {
            affected += diesel::insert_into(positions::table)
                .values(&upserts)
                .on_conflict(positions::object_id)
                .do_update()
                .set((
                    positions::owner_address.eq(excluded(positions::owner_address)),
                    positions::protocol.eq(excluded(positions::protocol)),
                    positions::position_type.eq(excluded(positions::position_type)),
                    positions::details.eq(excluded(positions::details)),
                    positions::updated_at.eq(now),
                ))
                .execute(conn)
                .await?;
        }

        Ok(affected)
    }
}
