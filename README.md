# Revalio

Portfolio Intelligence for Sui.

Revalio is a portfolio analytics platform that helps users understand wallets, staking positions, DeFi exposure, portfolio performance and on-chain activity across the Sui ecosystem.

Paste any Sui address and instantly explore:

* Portfolio value and asset allocation
* Native SUI staking positions and rewards
* DeFi positions across major Sui protocols
* Historical portfolio performance
* Wallet intelligence and risk analysis
* NFT holdings and on-chain activity

Built on real-time Sui mainnet data.

---

## Why Revalio?

Assets on Sui are often spread across wallets, staking positions and DeFi protocols.

Revalio brings everything together into a single view and transforms raw blockchain data into actionable portfolio intelligence.

Instead of manually inspecting dozens of transactions and protocol dashboards, users can:

* Track portfolio performance
* Understand protocol exposure
* Monitor staking rewards
* Analyze wallet risk
* Explore ecosystem activity

---

## Features

### Portfolio Overview

View total portfolio value, token balances and capital allocation across assets and protocols.

### Native SUI Staking

Track validators, delegated stake and accumulated rewards.

### DeFi Positions

Detect and value positions across lending markets, liquidity pools and other supported Sui protocols.

### Portfolio History

Track net worth over time using historical balance and price data.

### Wallet Intelligence

Analyze concentration, diversification, protocol exposure and risk metrics.

### Activity Feed

Explore wallet activity directly from on-chain transactions.

---

## Architecture

```text
Sui Fullnode
      ↓
Rust Indexer
      ↓
PostgreSQL + Redis
      ↓
Fastify API
      ↓
React Frontend
```

---

## Technology Stack

| Component | Stack                        |
| --------- | ---------------------------- |
| Frontend  | React, TypeScript, Vite      |
| API       | Fastify, Node.js, TypeScript |
| Indexer   | Rust, Sui Indexer Framework  |
| Database  | PostgreSQL                   |
| Cache     | Redis                        |
| Pricing   | Pyth                         |

---

## Quick Start

```bash
docker compose up -d

pnpm install

pnpm --filter @revalio/api dev

pnpm --filter @revalio/web dev
```

Frontend:

```text
http://localhost:5173
```

API:

```text
http://localhost:3001
```

---

## Project Vision

Revalio is evolving beyond a portfolio tracker into a wallet intelligence platform for the Sui ecosystem.

The long-term goal is to provide a complete understanding of wallet behavior, portfolio composition, protocol exposure and ecosystem activity through a single interface.

---
