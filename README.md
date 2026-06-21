# Revalio for Sui

Lightweight portfolio tracker and analytics dashboard for the Sui blockchain.
Paste a Sui address → get balances, DeFi positions, activity feed and a portfolio chart.

## Architecture

```
Fullnode (gRPC) --> Indexer (Rust) --> Postgres --> API (Node/Fastify) --> Web (React)
                                           |
                                           +--> Redis cache <--+
```

| Component | Stack | Path |
|-----------|-------|------|
| Indexer   | Rust, sui-indexer-alt-framework | `apps/indexer` |
| API       | Node 20, TypeScript, Fastify    | `apps/api` |
| Web       | React, Vite, TypeScript         | `apps/web` |
| DB        | PostgreSQL 16 (+ Redis cache)   | `infra/` |

See the full technical design in `docs/mvp.md`.

## Prerequisites

- [Node.js 20+](https://nodejs.org) and [pnpm](https://pnpm.io) (`npm i -g pnpm`)
- [Rust (rustup)](https://rustup.rs) — toolchain with edition 2024 (Rust ≥ 1.85)
- [Protocol Buffers compiler (`protoc`)](https://protobuf.dev) — required to build the
  indexer's gRPC deps (`winget install protobuf` or `choco install protoc`)
- **libpq** (PostgreSQL client library) — the indexer links against it for migrations.
  On Windows: `winget install -e --id PostgreSQL.PostgreSQL.16`, then set
  `PQ_LIB_DIR` to `C:\Program Files\PostgreSQL\16\lib` and add
  `C:\Program Files\PostgreSQL\16\bin` to `PATH` (for `libpq.dll` at runtime).
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- [Sui CLI](https://docs.sui.io/guides/developer/getting-started/sui-install)
- (optional) [GitHub CLI](https://cli.github.com)

## Quick start (local, testnet)

```powershell
# 1. Start infrastructure (Postgres + Redis + Adminer)
docker compose up -d

# 2. Install JS deps
pnpm install

# 3. Run the API in dev mode
pnpm --filter @revalio/api dev

# 4. In another terminal, run the web app
pnpm --filter @revalio/web dev
```

- API: http://localhost:3001 (`/health`, `/health/deep`)
- Web: http://localhost:5173
- Adminer (DB UI): http://localhost:8080

The database schema is owned by the indexer's Diesel migrations and applied
automatically the first time the indexer runs (see below).

### Run the full stack in Docker (API + Web)

For a containerized, one-command stack (Postgres + Redis + Adminer + API + Web),
the `api` and `web` services live under an opt-in `app` profile:

```powershell
pnpm app:up      # docker compose --profile app up -d --build
# ...
pnpm app:down    # tear everything down (the pgdata volume persists)
pnpm app:logs    # follow API + Web logs
```

- Web (nginx, proxies `/api` to the API): http://localhost:8088
- API: http://localhost:3001
- Plain `docker compose up -d` (or `pnpm db:up`) still starts **infra only**.

Compose profiles (compose freely):

| Profile     | Services added            | Script                   |
| ----------- | ------------------------- | ------------------------ |
| (none)      | postgres, redis, adminer  | `pnpm db:up`             |
| `app`       | api, web                  | `pnpm app:up`            |
| `indexer`   | indexer (Rust)            | `pnpm indexer:up`        |
| `obs`       | prometheus                | `pnpm obs:up`            |
| all of them | full stack                | `pnpm stack:up`          |

The containerized **indexer** applies the Diesel migrations on startup (creating
the schema) and then follows the chain tip, resuming from the stored watermark.

```powershell
pnpm indexer:up                 # build + run the indexer in Docker
# Fresh DB? set a start checkpoint for the FIRST run (then it resumes on its own):
$env:SUI_FIRST_CHECKPOINT = "342807490"; pnpm indexer:up
```

> The indexer image build is **large and slow on first run** (10–30 min) — it
> pulls the Sui framework from git and compiles the full Sui type stack. You can
> still run it natively instead (`apps/indexer/run-live.ps1`); the container is
> just an alternative so the whole system comes up via compose.

## Indexer (Rust)

The indexer uses Mysten's `sui-indexer-alt-framework`. It applies migrations on
startup, then ingests Sui testnet checkpoints into Postgres.

```powershell
cd apps/indexer
Copy-Item .env.example .env          # DATABASE_URL -> dockerized Postgres

# First build pulls the Sui framework from git and is large/slow (10–30 min).
# Working source on a typical network: gRPC unary RPC (--rpc-api-url).
# Use a BOUNDED window (--last-checkpoint) so it finishes instead of hammering
# the public node (which rate-limits with HTTP 429).
$env:RUST_LOG = "info,sui_indexer_alt_framework::metrics=error"   # quiet 429 retry warns
$latest = (Invoke-RestMethod -Uri "https://fullnode.testnet.sui.io:443" -Method Post -ContentType "application/json" -Body '{"jsonrpc":"2.0","id":1,"method":"sui_getLatestCheckpointSequenceNumber","params":[]}').result
$start = [int64]$latest - 2000
cargo run -- --first-checkpoint $start --last-checkpoint ([int64]$latest) --rpc-api-url https://fullnode.testnet.sui.io:443
```

Notes on checkpoint sources (learned the hard way):

- `--streaming-url` (gRPC streaming) may fail with `Statement timeout` on some networks.
- `--remote-store-url` (HTTP) downloads checkpoint blobs fine but **cannot discover the
  chain tip on its own** (reports `latest_checkpoint=0`) — only usable with an explicit
  `--first/--last-checkpoint` range or alongside a tip-aware source.
- `--rpc-api-url` (gRPC unary) works for both tip discovery and fetching, but the public
  fullnode **rate-limits** (HTTP 429). For continuous/live indexing use a dedicated RPC
  provider. For development, run bounded backfills.

### Live indexing (continuous tail)

Bounded backfills (`--last-checkpoint`) are for development. For continuous
operation use the live runner, which follows the chain tip from the stored
per-pipeline watermark and auto-restarts with exponential backoff:

```powershell
cd apps/indexer
Copy-Item .env.example .env            # set SUI_RPC_URL (and DATABASE_URL)
./run-live.ps1                         # builds --release, then tails the chain
```

Config (read from `apps/indexer/.env`, overridable via process env):

- `SUI_RPC_URL` — fullnode URL the indexer follows. The public testnet node
  rate-limits (HTTP 429) under sustained load, so for real continuous indexing
  point this at a **dedicated RPC provider** (an API-key URL). This is the one
  change needed to eliminate 429s.
- `SUI_FIRST_CHECKPOINT` — optional start checkpoint for the **first** bootstrap
  only; afterwards the framework resumes from the committed watermark, so leave
  it unset for normal operation.
- `RUST_LOG` — log verbosity filter (defaults to a readable level).

Verify in Adminer or psql:

```sql
SELECT count(*) FROM transactions;
SELECT tx_digest, sender, kind, checkpoint FROM transactions ORDER BY checkpoint DESC LIMIT 5;

-- Sprint 1b: address-owned Coin<T> objects and the derived per-wallet balances.
SELECT count(*) FROM coin_objects;
SELECT owner_address, coin_type, balance FROM balances ORDER BY balance DESC LIMIT 10;
```

> Sprint 1b: the indexer runs two sequential pipelines off the same checkpoint
> stream — `transactions` (digest + checkpoint + timestamp + sender + kind) and
> `coin_objects` (address-owned `Coin<T>` objects: type, owner, balance, version).
> `balances` is a SQL **view** that aggregates `coin_objects` per owner + coin type,
> so wallet balances are always consistent without any incremental balance math.

### API endpoints

- `GET /api/v1/wallets/:address` — aggregated balances, enriched with coin
  metadata (symbol/decimals/icon, fetched lazily from the fullnode via
  `suix_getCoinMetadata` and cached in `coins`) and **USD valuation** + a
  portfolio `totalUsd`. Prices come from Pyth Hermes, keyed by coin symbol.
- `GET /api/v1/wallets/:address/activity?limit=&cursor=` — transactions sent by
  the address, newest first, keyset-paginated (`nextCursor`).
- `GET /api/v1/wallets/:address/chart?range=24h|7d` — portfolio value over time
  (current holdings valued at historical prices). Includes **staked SUI** folded
  into the SUI balance, so the chart reflects total net worth (liquid + staking),
  consistent with `tokens.totalUsd + positions.totalUsd`. Prices land in
  `price_ticks` via a background Pyth collector plus a lazy CoinGecko backfill.
- `GET /api/v1/wallets/:address/positions` — DeFi positions: native SUI staking
  (indexed from `StakedSui`, with USD valuation) **plus on-demand DeFi positions**
  discovered via RPC `suix_getOwnedObjects` and classified against a protocol
  registry (Cetus LP, Scallop/Suilend lending, Turbos LP, …). Returns a flat
  `positions[]` and a per-protocol `protocols[]` summary. Set `SUI_DEFI_RPC_URL`
  to a **mainnet** node to see real DeFi protocols.

> DeFi positions are read on-demand per address (no full-chain indexing, which is
> infeasible for mainnet locally). The protocol registry (`lib/protocols.ts`)
> matches owned-object types — by origin package (Cetus) or by stable
> `module::Struct` suffix (lending) — and is trivially extensible (one entry per
> protocol). USD valuation for LP/lending requires protocol-specific math and is
> a follow-up; for now positions are detected and grouped so you can see *which
> protocols hold funds*. Protocols that keep positions in shared storage (e.g.
> NAVI) aren't discoverable via owned objects.

### Observability

- API exposes Prometheus metrics at `GET /metrics` (exempt from rate limiting):
  default Node/process metrics, an `http_request_duration_seconds` histogram
  labelled by `method`/`route`/`status_code`, an `upstream_requests_total`
  counter labelled by `host`/`outcome` (`success`/`retry`/`error`) for the
  Pyth/CoinGecko/Sui-RPC calls, and a `db_pool_connections` gauge.
- The indexer already exposes Prometheus metrics on `:9184` (framework default).
- A Prometheus instance (opt-in `obs` profile) scrapes both:

```powershell
pnpm obs:up      # docker compose --profile app --profile obs up -d --build
# Prometheus UI: http://localhost:9090  (targets: revalio-api, revalio-indexer)
pnpm obs:down
```

> The indexer runs natively, so Prometheus reaches it via
> `host.docker.internal:9184`; the API is scraped over the compose network.

> Valuation note: on testnet we price coins by their **symbol** against the
> underlying mainnet asset feed (e.g. testnet SUI → SUI/USD). Coins without a
> mapped feed show an amount but no USD value.
>
> Resilience: all upstream calls (Pyth, CoinGecko, Sui RPC) go through a shared
> `fetchJson` helper with per-attempt timeouts and retries/backoff on transient
> failures (429/5xx/network), honoring `Retry-After`. Failures degrade
> gracefully (e.g. "price unavailable") rather than erroring the request.

> If you previously created the dev DB with the old Sprint 0 schema, reset the
> volume so the indexer migrations apply cleanly:
> `docker compose down -v; docker compose up -d`

### Optional: demo balances for the wallet UI

To preview the wallet UI without running a backfill, run the indexer once (to
create the schema), then load the seed (demo `coin_objects`, surfaced through the
`balances` view) and open the web app:

```powershell
Get-Content infra/seed.sql | docker exec -i revalio-postgres psql -U revalio -d revalio
```

Then enter: `0x00000000000000000000000000000000000000000000000000000000000a11ce`

## Workspace layout

```
revalio/
├─ apps/
│  ├─ indexer/         # Rust indexer (owns DB schema via Diesel migrations/)
│  ├─ api/             # Fastify REST API
│  └─ web/             # React frontend
├─ infra/
│  └─ seed.sql         # optional demo data
├─ docs/
├─ docker-compose.yml
└─ pnpm-workspace.yaml
```

## Network

Development targets **Sui testnet**. Network endpoints are configured via `.env`.
