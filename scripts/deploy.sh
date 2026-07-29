#!/bin/bash
# Soroban Contract Deployment Script
set -e

echo "═══════════════════════════════════════════════════"
echo "  Community Expense Manager — Soroban Deployment   "
echo "═══════════════════════════════════════════════════"

NETWORK=${1:-testnet}
IDENTITY=${2:-alice}

echo "  Network  : $NETWORK"
echo "  Identity : $IDENTITY"

# 1. Fund identity on testnet (skip on mainnet)
if [ "$NETWORK" = "testnet" ]; then
  echo ""
  echo "▶ Funding identity on testnet..."
  stellar keys fund $IDENTITY --network $NETWORK || echo "  (already funded)"
fi

# 2. Build contracts
echo ""
echo "▶ Building Soroban contract..."
stellar contract build

WASM_PATH="target/wasm32-unknown-unknown/release/expense_group.wasm"
echo "  ✓ Built: $WASM_PATH"

# 3. Deploy
echo ""
echo "▶ Deploying to $NETWORK..."
CONTRACT_ID=$(stellar contract deploy \
  --wasm $WASM_PATH \
  --source $IDENTITY \
  --network $NETWORK \
  2>&1 | grep -v "^#" | tail -1)

echo "  ✓ Contract ID: $CONTRACT_ID"

# 4. Get admin address
ADMIN_ADDRESS=$(stellar keys address $IDENTITY)
echo "  ✓ Admin: $ADMIN_ADDRESS"

# 5. Initialize
echo ""
echo "▶ Initializing contract..."
stellar contract invoke \
  --id $CONTRACT_ID \
  --source $IDENTITY \
  --network $NETWORK \
  -- initialize \
  --admin $ADMIN_ADDRESS \
  --name "Community Expense Group" \
  --description "Shared expenses on Stellar" \
  --approval_threshold 51

echo "  ✓ Contract initialized"

# 6. Save to frontend env
echo ""
echo "▶ Writing to frontend/.env.local..."
cat > frontend/.env.local << EOF
NEXT_PUBLIC_CONTRACT_ID=$CONTRACT_ID
NEXT_PUBLIC_NETWORK=testnet
NEXT_PUBLIC_HORIZON_URL=https://horizon-testnet.stellar.org
NEXT_PUBLIC_SOROBAN_RPC_URL=https://soroban-testnet.stellar.org
EOF
echo "  ✓ frontend/.env.local updated"

# 7. Save deployment record
mkdir -p deployments
cat > deployments/$NETWORK.json << EOF
{
  "network": "$NETWORK",
  "contractId": "$CONTRACT_ID",
  "admin": "$ADMIN_ADDRESS",
  "deployedAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "wasm": "$WASM_PATH"
}
EOF
echo "  ✓ deployments/$NETWORK.json saved"

echo ""
echo "═══════════════════════════════════════════════════"
echo "  DEPLOYMENT COMPLETE"
echo "  Contract ID : $CONTRACT_ID"
echo "  Network     : $NETWORK"
echo "═══════════════════════════════════════════════════"
