mod handlers;
mod models;
pub mod schema;

use anyhow::{Result, bail};
use clap::Parser;
use diesel_migrations::{EmbeddedMigrations, embed_migrations};
use sui_indexer_alt_framework::{
    cluster::{Args, IndexerCluster},
    pipeline::sequential::SequentialConfig,
    service::Error,
};
use url::Url;

use handlers::{CoinObjectHandler, PositionHandler, TransactionHandler};

// Embed our Diesel migrations so the schema is applied automatically on startup.
const MIGRATIONS: EmbeddedMigrations = embed_migrations!("migrations");

#[tokio::main]
async fn main() -> Result<()> {
    dotenvy::dotenv().ok();
    // NOTE: the framework (IndexerCluster) installs the global tracing subscriber
    // itself. Control verbosity with the RUST_LOG env var (e.g. RUST_LOG=info).

    let database_url = std::env::var("DATABASE_URL")
        .expect("DATABASE_URL must be set in the environment")
        .parse::<Url>()
        .expect("Invalid database URL");

    // Checkpoint sources and ranges come from CLI args, e.g.:
    //   --remote-store-url https://checkpoints.testnet.sui.io
    //   --streaming-url https://fullnode.testnet.sui.io:443
    let args = Args::parse();

    let mut cluster = IndexerCluster::builder()
        .with_args(args)
        .with_database_url(database_url)
        .with_migrations(&MIGRATIONS)
        .build()
        .await?;

    cluster
        .sequential_pipeline(TransactionHandler, SequentialConfig::default())
        .await?;

    // Coin-object pipeline: tracks address-owned Coin<T> objects; per-wallet
    // balances are derived from these via the `balances` SQL view.
    cluster
        .sequential_pipeline(CoinObjectHandler, SequentialConfig::default())
        .await?;

    // Positions pipeline: tracks address-owned DeFi position objects
    // (currently native SUI staking via StakedSui).
    cluster
        .sequential_pipeline(PositionHandler, SequentialConfig::default())
        .await?;

    match cluster.run().await?.main().await {
        Ok(()) | Err(Error::Terminated) => Ok(()),
        Err(Error::Aborted) => bail!("Indexer aborted due to an unexpected error"),
        Err(Error::Task(e)) => bail!(e),
    }
}
