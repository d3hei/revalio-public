# Sprint C — mainnet validation & regression

> **Goal:** close Phase 3 (Turbos) and verify native decoders on real wallets before Sprint D (grant pack).

## Checklist

| Item | Status | Notes |
|------|--------|-------|
| Turbos native CLMM decoder | ✅ | `turbosRpc.ts` + `enrichTurbosNativePositions` |
| Turbos RPC discovery filters | ✅ | `TURBOS_CLMM_PACKAGES` in `protocols.ts` |
| Debug endpoint | ✅ | `GET .../debug/native-turbos?positionId=` |
| Cetus whale validation | ✅ | `0x08beed…` — positionsUsd > 0 |
| Turbos wallet validation | ✅ | decode + Pyth DEEP; ~$462 positions @ spot |
| Navi supply/borrow wallet | ✅ | `0xdcd646…` — supply+borrow ~$3.82 |
| Scallop obligation wallet | 🔄 | Discovery test + `record:baselines` pins address |
| Suilend wallet | 🔄 | Discovery test + `record:baselines` pins address |
| Native staking wallet | ✅ | `0x67cf…` — 929 SUI principal, regression in baselines |
| Suivision ±12% regression | ✅ | Cetus/Turbos/NAVI/staking; LP ±12%, lending ±5% |
| Suivision ±1% (strict) | 🔄 | `MAINNET_STRICT=1` on NAVI/Scallop/Suilend |

## Fixed mainnet wallets

| Label | Address | Expected |
|-------|---------|----------|
| Cetus whale | `0x08beed3ebf0b5620ab5ea33be9ccd87e7b1ef590834fe3b7ac71e40c3f679ed1` | `positionsUsd` ≈ baseline (±5%) |
| Turbos LP | `0xb973681698db4e9fc7b27dff7b8c5ae2323728f5e1ccfb1380f6592972c3cf91` | `positionsUsd` ≈ **$462** (spot DEEP, ±12%) |

**NAVI / Scallop / Suilend** use **dynamic discovery**. Addresses change over time — do not hardcode.

**Discovery notes (2026-05-31):**
- First NAVI row in SUI pool can be **dust** (`positionsUsd ≈ 0`) — discovery now picks wallet with **max supply** (≥1 SUI scale).
- `USDC` pool alias → **`nUSDC`** (was falling back to SUI pool).
- Scallop: scan **`open_obligation` events** (`0xefe8b36d…`) + 200+ NAVI depositors across SUI/nUSDC/USDT/wUSDC.

## Run validation (PowerShell)

```powershell
cd X:\Sui\revalio

# 1) Discover lending wallets + print portfolio/debug summary
pnpm --filter @revalio/api exec tsx scripts/discover-lending-wallets.ts

# 2) Full Sprint C script (fixed + discovered wallets)
pnpm --filter @revalio/api exec tsx scripts/validate-sprint-c.ts

# 3) Core regression (4 fixed wallets — no discovery)
$env:MAINNET_REGRESSION = "1"
pnpm --filter @revalio/api test src/lib/positions/mainnetRegression.test.ts

# 4) Optional: Scallop/Suilend discovery (slow, flaky on public RPC)
$env:MAINNET_DISCOVER = "1"
pnpm --filter @revalio/api test src/lib/positions/mainnetRegression.test.ts

# 4) Record / refresh baseline JSON (live mainnet RPC)
pnpm --filter @revalio/api run record:baselines
# Write mainnetBaselines.json (includes Scallop/Suilend if discovery succeeds):
$env:MAINNET_RECORD_BASELINES = "1"
pnpm --filter @revalio/api run record:baselines

# 5) Strict grant check — ±1% on lending protocols only
$env:MAINNET_REGRESSION = "1"
$env:MAINNET_STRICT = "1"
pnpm --filter @revalio/api test src/lib/positions/mainnetRegression.test.ts
```

**Why tests were slow (~7 min):** `getPortfolioSummary` ran **all** adapters (NAVI 32 pools, Scallop, Suilend, Cetus enrich on 100+ LPs). Regression now uses **protocol-scoped** helpers; Cetus whale uses **smoke** (discover + decode 3 samples).

## Debug endpoints (API on :3001)

```powershell
$addr = "<wallet>"
Invoke-RestMethod "http://localhost:3001/api/v1/wallets/$addr/debug/native-navi" | ConvertTo-Json -Depth 6
Invoke-RestMethod "http://localhost:3001/api/v1/wallets/$addr/debug/native-scallop" | ConvertTo-Json -Depth 6
Invoke-RestMethod "http://localhost:3001/api/v1/wallets/$addr/debug/native-suilend" | ConvertTo-Json -Depth 6
Invoke-RestMethod "http://localhost:3001/api/v1/wallets/$addr/portfolio" | ConvertTo-Json
Invoke-RestMethod "http://localhost:3001/api/v1/wallets/$addr/positions" | ConvertTo-Json -Depth 6
```

## Pass criteria

### Turbos wallet
- `nativeDecode.decoded: true`, `source: native` ✅
- DEEP+USDC valued at Pyth spot (~$461 for ~28k DEEP @ $0.016) ✅
- Do **not** compare to stale Suivision $2,158 (DEEP was ~$0.077 then)

### NAVI (discovered wallet)
- `inspectNativeNavi`: `supplyRows + borrowRows > 0`
- `positions` contains `protocol: "Navi"`, `source: "native"`
- `positionsUsd > 0`

### Scallop (discovered wallet)
- `inspectNativeScallop`: `obligationKeys > 0`
- At least one `scallop-supply` or `scallop-borrow` row
- `source: "native"`

### Suilend (discovered wallet)
- `inspectNativeSuilend`: `caps > 0`, supply/borrow rows decoded
- Turbos probe wallet `0xb973…` may have **zero** Suilend if position was closed

## Baselines

Update `apps/api/src/lib/positions/mainnetBaselines.json` via `pnpm --filter @revalio/api run record:baselines` with `MAINNET_RECORD_BASELINES=1`.
Use `positionsUsdMin` for discovered wallets if spot prices drift.
