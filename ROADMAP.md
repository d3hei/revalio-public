# Revalio — Roadmap & Checklist



Living checklist of the project. Tick items as they land. Backend and frontend

progress in tandem: most backend features ship with their UI in the same sprint.



## ✅ Done



### Core MVP (backend)

- [x] Monorepo + Dockerized infra (Postgres, Redis, Adminer)

- [x] Rust indexer on `sui-indexer-alt-framework` (testnet, gRPC unary)

- [x] Indexer pipelines: `transactions`, `coin_objects`, `positions`

- [x] `balances` SQL view aggregating `coin_objects`

- [x] API (Fastify): wallet balances + coin metadata (lazy `suix_getCoinMetadata`)

- [x] USD valuation via Pyth Hermes (by symbol); CoinGecko historical backfill

- [x] Activity feed (keyset pagination)

- [x] Portfolio chart (incl. staked SUI folded into net worth)

- [x] Positions: native SUI staking (`StakedSui`)



### Core MVP (frontend)

- [x] React + Vite app: address form + validation

- [x] Token list with USD values + portfolio total

- [x] Portfolio value chart (24h / 7d)

- [x] Positions section

- [x] Activity feed with infinite scroll

- [x] Loading / error (with Retry) / empty states

- [x] Wallet profile (nickname, avatar, bio) + default avatar

- [x] NFT gallery (verified / all, pagination)

- [x] Design labs: PlayerZero (`:5174`) + Bolt analytics (`:5175`)

- [x] Satoshi font, Wallet/NFT/Transactions label polish



### Hardening

- [x] Live-indexing runner (`run-live.ps1`) + configurable RPC

- [x] API resilience: `fetchJson` timeouts + retry/backoff + `Retry-After`

- [x] One-command up: `docker-compose` profiles (`app`)

- [x] Tests (vitest) + CI (API/web/indexer jobs)

- [x] Observability: API Prometheus `/metrics` + Prometheus scrape (`obs`)

- [x] Containerized indexer (`indexer` profile) — full stack via `pnpm stack:up`



## 🚧 Architecture — own indexer + native adapters + unified pricing



**Primary path:** on-chain native decoders + own indexer. **BlockVision:** opt-in only.



- [x] Protocol adapter layer (`lib/positions/`) — `ResolvedPosition`, merge/dedupe

- [x] **Native Cetus CLMM** decoder (RPC + CLMM math) — `source: native`

- [x] **Native NAVI** supply/borrow via reserve balance tables

- [x] **Native Scallop** ObligationKey → Obligation collateral/debt parse

- [x] **Native Scallop sCoin** supply (wallet-held sSUI/sUSDC via exchange rates)

- [x] **Native Suilend** ObligationOwnerCap → deposits/borrows decode

- [x] **Native Ember** vault positions (receipt tokens excluded from Wallet/chart)

- [x] `normalizeCoinType()` — canonical `0x…` for metadata + chart

- [x] `GET /portfolio` — unified `tokensUsd + positionsUsd`

- [x] Chart headline aligned with portfolio total (web)

- [x] Mainnet balance fallback (`suix_getAllBalances` when indexer empty)

- [x] Mainnet indexer profile (`indexer-mainnet`, port 9185)

- [x] BlockVision **off by default** (`BLOCKVISION_PROTOCOLS=`)

- [x] Suilend obligation decode (deposits/borrows + market USD)

- [x] Cetus farms / vaults native

- [x] Scallop veSCA native

- [x] Expand NAVI pool list (32 mainnet pools, 9-dec scale)

- [x] Suivision regression harness (`mainnetRegression.test.ts`, opt-in via `MAINNET_REGRESSION=1`)
- [x] Mainnet baselines refreshed (`record:baselines`, Scallop sCoin wallet pinned)
- [x] Position valuation audit (`audit:null-usd`) — NAVI bridged-coin pricing, RPC lending placeholder drop
- [ ] Suivision ±1% strict pass on all lending wallets (`MAINNET_STRICT=1`, opt-in)



### BlockVision (optional enrichment)

- [x] Cetus / NAVI / Scallop adapters (opt-in via env)

- [ ] Suilend BV adapter



## ⏭ Next — Alerting

- [x] Example Grafana alert rules (`infra/grafana/alerts.yml`)

- [ ] Grafana dashboards over Prometheus (API latency, upstream errors, indexer lag)

- [ ] Alertmanager wiring in compose



## 📋 MVP phases (grant scope)

| Phase | Features | Status |
|-------|----------|--------|
| **1** | Wallet balances, Activity feed, Portfolio chart | ✅ |
| **2** | Lending — Navi, Scallop | ✅ |
| **3** | LP — Cetus, Turbos | ✅ native decoders |

**Grant submission:** after Phase 1–3 — **before DeepBook**.

## ✅ Sprint C — Phase 3 + mainnet validation (done)

- [x] **Turbos** native CLMM decoder (`turbosRpc.ts`, NFT → `position_manager::Position` → pool)
- [x] Turbos RPC discovery filters + debug `GET .../debug/native-turbos`
- [x] Fix `defiPositions` Turbos NFT `position_id` (don't overwrite with NFT objectId)
- [x] Mainnet regression harness (`MAINNET_REGRESSION=1`, `mainnetBaselines.json`)
- [x] Validate Turbos wallet `0xb973…` (spot-priced) — see `docs/sprint-c-validation.md`
- [x] Baseline recorder (`record:baselines`) + staking + Scallop sCoin regression
- [x] Mainnet regression green on fixed wallets (Cetus smoke, Turbos, NAVI, staking, Scallop sCoin)
- [ ] Opt-in discovery regression for Scallop obligation + Suilend (`MAINNET_DISCOVER=1`, flaky on public RPC)

See [`docs/sprint-c-validation.md`](docs/sprint-c-validation.md).

## ✅ Sprint B — position valuation (done)

- [x] Scallop sCoin → `valueUsd` via `enrichPositionsWithPrices` + `scallop-supply` valuation
- [x] Hide Scallop sCoins / Ember receipts from Wallet list (`protocolWalletCoins.ts`)
- [x] NAVI `wUSDC`/`nUSDC` → USDC price alias; drop empty RPC lending placeholders
- [x] `audit:null-usd` script + Cetus whale smoke retries (RPC flake hardening)

Full rationale, version roadmap (V1→V3), and architecture prep:
**[`docs/deepbook-post-mvp.md`](docs/deepbook-post-mvp.md)**

## ⏭ Post-MVP — DeepBook (after grant)

> DeepBook answers *«how does the user trade?»* — not *«what is my portfolio worth?»*  
> ROI: Lending >>> LP >>> DeepBook (~5–20% wallet coverage).

- [ ] **V1** — DeepBook open orders (+ **Trading** tab in UI)
- [ ] **V1.1** — Trade history (recent trades, volume, pairs)
- [ ] **V1.2** — Trader profile (30D volume, top asset, trade count)
- [ ] **V2** — Smart Money (top/whale traders, active wallets)
- [ ] **V3** — Walrus historical trader reports

### Architecture prep (do now, implement later)

- [x] `PositionKind` + reserved `order` / `trade` categories (`lib/positions/types.ts`, `protocols.ts`)
- [x] Activity kinds reserved (`lib/activityKinds.ts` — `TRADE`, `ORDER_*`)
- [x] Adapter stub `positions/sources/deepbook/` (not wired in `resolve.ts`)
- [ ] Wire DeepBook adapter after grant milestone

### Post-grant product arc

```
MVP → Grant → DeepBook → Smart Money → Walrus → Sui Intelligence Platform
```

## 🔭 Later (backlog)

- [x] Turbos LP native adapter (complete Phase 3)
- [ ] **Production deploy** — follow checklist below (🚀 Production deploy checklist)
- [ ] Frontend polish sprint (responsive/mobile, skeletons, protocol icons, merge lab → prod UI)
- [x] NFT holdings (API + gallery; trust list / verified filter)
- [ ] Per-token price charts / allocation breakdown
- [ ] Network column on indexer tables (testnet + mainnet in one DB)
- [ ] Caching/perf pass on hot endpoints
- [ ] Historical portfolio chart from `balance_snapshots` (indexer-backed, not spot-only)
- [ ] Haedal / additional protocols from `docs/mvp.md` integration list
- [ ] Grant submission pack (demo wallets, screenshots, strict regression optional)

## 🚀 Production deploy checklist

> **Goal:** public site (not localhost) with stable `/positions`, chart, and activity.
> **Minimum viable prod:** API + Web + Postgres + Redis + **paid mainnet RPC**.
> Indexer is optional at first (API falls back to on-demand RPC); add for faster activity/chart from DB.

### 1. Infrastructure

- [ ] VPS or cloud host (≥ 2 vCPU, 4 GB RAM for app-only; +2 GB if indexer runs on same box)
- [ ] Domain + DNS A/AAAA → server IP
- [ ] TLS (Let's Encrypt via Caddy/nginx, or cloud load balancer)
- [ ] Firewall: 80/443 public; Postgres/Redis/API **not** exposed publicly
- [ ] `.env` on server (copy from `.env.example`; **never commit secrets**)
- [ ] `docker compose --profile app up -d --build` (or `pnpm app:up`) smoke-tested on server

### 2. Data stores

- [ ] PostgreSQL 16 — same VPS volume or managed (Supabase, RDS, Neon)
- [ ] Redis — same VPS or managed (Upstash, ElastiCache)
- [ ] Run indexer migrations once if using indexer: `apps/indexer` Diesel migrations on fresh DB
- [ ] Backup policy for Postgres (daily snapshot / managed auto-backup)

### 3. RPC & external APIs (what to pay for first)

| Variable | Purpose | Free OK? | Paid when |
|----------|---------|----------|-----------|
| `SUI_DEFI_RPC_URL` | DeFi discovery, Scallop devInspect, NAVI pools | ❌ for prod | Public 429/timeouts on `/positions` |
| `SUI_RPC_URL` / `SUI_MAINNET_RPC_URL` | Balances, metadata, NFTs | ⚠️ low traffic | > few req/s sustained |
| `SUI_GRPC_URL` | Indexer streaming | ❌ if indexer 24/7 | Dedicated gRPC node |
| `PYTH_HERMES_URL` | Spot USD prices | ✅ | Rarely needed |
| `COINGECKO_API_BASE` | Historical chart backfill | ✅ / Pro | Heavy history queries |
| `BLOCKVISION_*` | Optional LP/lending enrichment | Optional | Only if `BLOCKVISION_PROTOCOLS` set |
| `EMBER_VAULTS_API_BASE` | Ember vault positions | ✅ | Public Bluefin API |

**Recommended providers (pick one primary + public fallback in `SUI_DEFI_RPC_FALLBACKS`):**
BlockVision, Triton One, QuickNode, Chainstack, Alchemy (Sui), rpcpool.

### 4. App config (production `.env` highlights)

- [ ] `NODE_ENV=production`
- [ ] `DATABASE_URL` → prod Postgres (strong password)
- [ ] `REDIS_URL` → prod Redis
- [ ] `SUI_DEFI_RPC_URL` → **paid mainnet** endpoint
- [ ] `SUI_DEFI_RPC_FALLBACKS` → 1–2 public fallbacks (comma-separated)
- [ ] `BLOCKVISION_PROTOCOLS=` empty unless you have a BV key (native decoders are primary)
- [ ] `WEB_PORT=8088` (or 443 behind reverse proxy)
- [ ] `API_PORT=3001` (internal only; nginx proxies `/api`)

### 5. Indexer (optional phase 2)

- [ ] `SUI_MAINNET_RPC_URL` + `SUI_GRPC_URL` on paid tier
- [ ] `SUI_MAINNET_FIRST_CHECKPOINT` set **once** on fresh DB; then leave empty (watermark resume)
- [ ] `pnpm indexer-mainnet:up` or `docker compose --profile indexer-mainnet up -d`
- [ ] Confirm watermark advancing; activity feed populated from DB for indexed wallets

### 6. Pre-launch verification

- [ ] `GET /health` and `GET /health/deep` → 200
- [ ] Demo wallets load in UI (see `mainnetBaselines.json` / grant wallets)
- [ ] `GET /api/v1/wallets/{addr}/positions` — Scallop sCoin + NAVI have `valueUsd` (not null)
- [ ] `$env:MAINNET_REGRESSION='1'; pnpm --filter @revalio/api test src/lib/positions/mainnetRegression.test.ts`
- [ ] Rate limits / nginx timeouts OK for slow wallets (Cetus whale ~60–120s first load)
- [ ] Prometheus scrape if using `pnpm stack:up` + `obs` profile

### 7. Post-launch ops

- [ ] Grafana dashboards (API latency, RPC errors, indexer lag) — see **Next — Alerting**
- [ ] Log rotation / disk alerts on VPS
- [ ] CI green on `master` after deploy tag
- [ ] Document rollback: previous Docker image + DB backup restore

### Rough monthly cost (ballpark)

| Tier | Stack | ~USD/mo |
|------|-------|---------|
| **Dev/staging** | 1 small VPS + public RPC | $5–15 |
| **Public beta** | VPS + paid RPC | $30–80 |
| **Production** | VPS + managed DB + paid RPC + indexer node | $80–250+ |

---

## How we track

- This file is the source of truth — update checkboxes per sprint.

- CI (`.github/workflows/ci.yml`) guards regressions on every PR.



## Quick commands



```powershell

# App only (native decoders, no BlockVision)

docker compose --profile app up -d --build --force-recreate



# Testnet indexer

pnpm indexer:up



# Mainnet indexer (optional; set SUI_MAINNET_FIRST_CHECKPOINT once)

pnpm indexer-mainnet:up

# Debug native decoders (mainnet wallet)

# GET /api/v1/wallets/:address/debug/native-navi
# GET /api/v1/wallets/:address/debug/native-scallop
# GET /api/v1/wallets/:address/debug/native-suilend
# GET /api/v1/wallets/:address/debug/native-cetus
# GET /api/v1/wallets/:address/debug/native-turbos



# Full stack + observability

pnpm stack:up

```


