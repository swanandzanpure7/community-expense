# Deployment Guide

## 1. Install Tools

```bash
# Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
rustup target add wasm32-unknown-unknown

# Stellar CLI
cargo install stellar-cli
```

## 2. Configure Identity

```bash
stellar keys generate --global alice --network testnet
stellar keys fund alice --network testnet
```

## 3. Build Contract

```bash
cargo build --target wasm32-unknown-unknown --release
```

## 4. Deploy

```bash
CONTRACT_ID=$(stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/expense_group.wasm \
  --source alice \
  --network testnet)
echo "Contract ID: $CONTRACT_ID"
```

## 5. Initialize

```bash
ADMIN=$(stellar keys address alice)
stellar contract invoke \
  --id $CONTRACT_ID \
  --source alice \
  --network testnet \
  -- initialize \
  --admin $ADMIN \
  --name "Community Group" \
  --description "Shared expenses on Stellar" \
  --approval_threshold 51
```

## 6. Configure Frontend

```bash
echo "NEXT_PUBLIC_CONTRACT_ID=$CONTRACT_ID" > frontend/.env.local
echo "NEXT_PUBLIC_NETWORK=testnet" >> frontend/.env.local
```

## 7. Deploy Frontend

```bash
cd frontend
npm run build
npx vercel --prod
```

## Freighter Wallet Setup

1. Install from https://freighter.app
2. Create or import wallet
3. Go to Settings → Network → Select **Testnet**
4. Get testnet XLM: https://laboratory.stellar.org/#account-creator?network=test
