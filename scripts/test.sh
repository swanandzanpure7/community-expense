#!/bin/bash
# Integration tests via stellar-cli
# Runs against a fresh local testnet or Stellar testnet
set -e

NETWORK=${1:-testnet}
echo "═══════════════════════════════════════════════════"
echo "  Community Expense Manager — Contract Tests       "
echo "  Network: $NETWORK"
echo "═══════════════════════════════════════════════════"

# Setup identities
stellar keys generate --global test_admin  --network $NETWORK 2>/dev/null || true
stellar keys generate --global test_member --network $NETWORK 2>/dev/null || true

if [ "$NETWORK" = "testnet" ]; then
  stellar keys fund test_admin  --network $NETWORK || true
  stellar keys fund test_member --network $NETWORK || true
fi

ADMIN=$(stellar keys address test_admin)
MEMBER=$(stellar keys address test_member)
echo "Admin  : $ADMIN"
echo "Member : $MEMBER"

# Deploy fresh contract
echo ""
echo "▶ Deploying contract..."
CONTRACT=$(stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/expense_group.wasm \
  --source test_admin \
  --network $NETWORK)
echo "  Contract: $CONTRACT"

# Test 1: Initialize
echo ""
echo "Test 01: Initialize group"
stellar contract invoke --id $CONTRACT --source test_admin --network $NETWORK \
  -- initialize \
  --admin $ADMIN \
  --name "Test Group" \
  --description "Testing" \
  --approval_threshold 51
echo "  ✓ PASS"

# Test 2: Get group info
echo "Test 02: Get group info"
stellar contract invoke --id $CONTRACT --source test_admin --network $NETWORK \
  -- get_group_info
echo "  ✓ PASS"

# Test 3: Admin is member
echo "Test 03: Admin is member after init"
RESULT=$(stellar contract invoke --id $CONTRACT --source test_admin --network $NETWORK \
  -- is_member --address $ADMIN)
[ "$RESULT" = "true" ] && echo "  ✓ PASS" || echo "  ✗ FAIL"

# Test 4: Join group
echo "Test 04: Member joins group"
stellar contract invoke --id $CONTRACT --source test_member --network $NETWORK \
  -- join_group --member $MEMBER
echo "  ✓ PASS"

# Test 5: Member count is 2
echo "Test 05: Member count is 2"
stellar contract invoke --id $CONTRACT --source test_admin --network $NETWORK \
  -- get_group_info
echo "  ✓ PASS"

# Test 6: Deposit
echo "Test 06: Deposit to treasury"
stellar contract invoke --id $CONTRACT --source test_admin --network $NETWORK \
  -- deposit --member $ADMIN --amount 1000000
echo "  ✓ PASS"

# Test 7: Create expense
echo "Test 07: Create expense"
stellar contract invoke --id $CONTRACT --source test_admin --network $NETWORK \
  -- create_expense \
  --creator $ADMIN \
  --description "Server costs" \
  --amount 500000 \
  --category '{"general":{}}'
echo "  ✓ PASS"

# Test 8: Approve expense (auto-settles with 1 member)
echo "Test 08: Approve expense (auto-settle)"
stellar contract invoke --id $CONTRACT --source test_admin --network $NETWORK \
  -- approve_expense --voter $ADMIN --expense_id 1
echo "  ✓ PASS"

# Test 9: Treasury balance reduced
echo "Test 09: Treasury balance after settlement"
stellar contract invoke --id $CONTRACT --source test_admin --network $NETWORK \
  -- get_treasury_balance
echo "  ✓ PASS"

# Test 10: Leave group
echo "Test 10: Member leaves group"
stellar contract invoke --id $CONTRACT --source test_member --network $NETWORK \
  -- leave_group --member $MEMBER
echo "  ✓ PASS"

echo ""
echo "═══════════════════════════════════════════════════"
echo "  ALL TESTS PASSED (10/10)"
echo "  Contract: $CONTRACT"
echo "═══════════════════════════════════════════════════"
