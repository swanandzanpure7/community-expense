# Community Expense Manager — Soroban (Stellar)

> Decentralized expense sharing platform built with Soroban smart contracts on the Stellar blockchain.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Stellar](https://img.shields.io/badge/Stellar-Soroban-blue)](https://stellar.org)
[![Wallet](https://img.shields.io/badge/Wallet-Freighter-purple)](https://freighter.app)

---

## Problem Statement

Splitting shared expenses in groups requires trust in a central party. This platform makes it trustless using Soroban smart contracts on the Stellar blockchain.

## Solution

Groups pool XLM in an on-chain treasury managed by a Soroban contract. Expenses are submitted, voted on by members, and automatically settled — no middlemen, fully transparent.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Smart Contract | Rust + Soroban SDK v21 |
| Blockchain | Stellar Testnet |
| Frontend | Next.js 15, TypeScript, Tailwind CSS |
| Wallet | Freighter (@stellar/freighter-api) |
| Stellar SDK | @stellar/stellar-sdk |
| Animations | Framer Motion |
| CI/CD | GitHub Actions → Vercel |

---

## Contract Features

- ✅ Initialize group with admin, name, description, approval threshold
- ✅ Join / leave group
- ✅ Deposit XLM to treasury
- ✅ Create expense requests
- ✅ Approve expense (auto-settles when threshold met)
- ✅ Reject expense
- ✅ View group info, members, expenses, treasury balance
- ✅ On-chain events for all state changes

---

## Project Structure

```
community-expense-soroban/
├── contracts/
│   └── expense_group/
│       ├── src/lib.rs        # Soroban contract (Rust)
│       └── Cargo.toml
├── frontend/
│   └── src/
│       ├── app/              # Next.js pages
│       ├── components/       # UI components
│       ├── context/          # FreighterContext
│       └── lib/              # Soroban + Freighter helpers
├── scripts/
│   └── deploy.sh             # Deployment script
├── docs/
│   ├── ARCHITECTURE.md
│   └── DEPLOYMENT.md
├── .github/workflows/ci.yml
├── Cargo.toml
└── README.md
```

---

## Prerequisites

- [Rust](https://rustup.rs) with `wasm32-unknown-unknown` target
- [Stellar CLI](https://developers.stellar.org/docs/tools/developer-tools/cli/install-cli)
- [Freighter wallet](https://freighter.app) browser extension
- Node.js 18+

---

## Installation

```bash
git clone https://github.com/YOUR_USERNAME/community-expense-soroban
cd community-expense-soroban

# Install Rust wasm target
rustup target add wasm32-unknown-unknown

# Install frontend dependencies
cd frontend && npm install
```

---

## Build Contract

```bash
cargo build --target wasm32-unknown-unknown --release
```

Output: `target/wasm32-unknown-unknown/release/expense_group.wasm`

---

## Deploy to Stellar Testnet

```bash
# Set up identity and fund with testnet XLM
stellar keys generate --global alice --network testnet
stellar keys fund alice --network testnet

# Deploy contract
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/expense_group.wasm \
  --source alice \
  --network testnet

# Initialize (replace CONTRACT_ID and ADMIN_ADDRESS)
stellar contract invoke \
  --id CONTRACT_ID \
  --source alice \
  --network testnet \
  -- initialize \
  --admin ADMIN_ADDRESS \
  --name "My Group" \
  --description "Shared expenses" \
  --approval_threshold 51
```

---

## Run Frontend Locally

```bash
# Create .env.local
cp frontend/.env.example frontend/.env.local
# Add your CONTRACT_ID

cd frontend
npm run dev
```

Open http://localhost:3000

---

## Contract Addresses (Testnet)

| Contract | Address |
|----------|---------|
| expense_group | `C...` *(run deploy script)* |

**Transaction Hash**: *(from deployment output)*

---

## Live Demo

🌐 *(Deploy to Vercel after contract deployment)*

---

## CI/CD

GitHub Actions runs on push to `main`:
1. Build Rust contract to WASM
2. Build Next.js frontend
3. Deploy to Vercel

---

## Wallet Integration

Uses **Freighter** — the official Stellar browser wallet extension.

1. Install from [freighter.app](https://freighter.app)
2. Switch to **Testnet** in Freighter settings
3. Get testnet XLM from [Stellar Laboratory Friendbot](https://laboratory.stellar.org/#account-creator?network=test)
4. Connect on the app

---

## License

MIT © 2025 Community Expense Manager
