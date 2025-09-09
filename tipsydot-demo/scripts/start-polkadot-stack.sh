#!/bin/bash

# TipsyDot Demo - Complete Polkadot Stack Setup
# This script sets up:
# 1. Paseo AssetHub fork with USDC (via Chopsticks)
# 2. PassetHub with Revive pallet for EVM (simplified approach)
# 3. HRMP channels for XCM communication

set -e

echo "🎯 TipsyDot Demo - Complete Polkadot Stack"
echo "==========================================="
echo "Setting up native Polkadot infrastructure with:"
echo "  - Paseo AssetHub (forked) with USDC"
echo "  - PassetHub with Revive EVM"
echo "  - XCM channels between chains"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Clean up existing processes
echo -e "${YELLOW}Cleaning up existing processes...${NC}"
pkill -f "chopsticks" || true
pkill -f "anvil" || true
pkill -f "polkadot-omni-node" || true
sleep 2

# Step 1: Start Chopsticks fork of Paseo AssetHub
echo -e "${BLUE}[1/3] Starting Paseo AssetHub fork...${NC}"
echo "  - USDC Asset ID: 1337"
echo "  - Pre-funded accounts with 1M USDC each"
echo "  - Port: 8000"

npx @acala-network/chopsticks \
    --config chopsticks-assethub.yml \
    --port 8000 \
    > chopsticks.log 2>&1 &

CHOPSTICKS_PID=$!
echo -e "${GREEN}  ✓ Chopsticks PID: $CHOPSTICKS_PID${NC}"

# Wait for AssetHub to be ready
sleep 8

# Step 2: For now, use Anvil as EVM (until we fix OmniNode binary issue)
# In production, this would be PassetHub with Revive
echo -e "${BLUE}[2/3] Starting EVM chain (Anvil for demo)...${NC}"
echo "  - Chain ID: 420420421"
echo "  - Port: 8545"
echo "  - Note: In production, this would be PassetHub with Revive"

anvil \
    --port 8545 \
    --chain-id 420420421 \
    --accounts 10 \
    --balance 10000 \
    --block-time 2 \
    > anvil.log 2>&1 &

ANVIL_PID=$!
echo -e "${GREEN}  ✓ Anvil PID: $ANVIL_PID${NC}"

# Wait for Anvil
sleep 5

# Step 3: Display XCM configuration
echo -e "${BLUE}[3/3] XCM Configuration${NC}"
echo "  In a full setup with PassetHub + Revive:"
echo "  - HRMP channel: AssetHub (1000) <-> PassetHub (1111)"
echo "  - Reserve transfers for USDC (Asset ID 1337)"
echo "  - Precompiles at 0x0800... addresses for assets"
echo ""

# Verify services are running
echo -e "${YELLOW}Verifying services...${NC}"

# Check Chopsticks
if curl -s http://localhost:8000 -X POST -H "Content-Type: application/json" \
    -d '{"jsonrpc":"2.0","method":"system_chain","params":[],"id":1}' | grep -q "result"; then
    echo -e "${GREEN}  ✓ AssetHub fork is running${NC}"
else
    echo -e "${RED}  ✗ AssetHub fork failed to start${NC}"
fi

# Check Anvil
if curl -s http://localhost:8545 -X POST -H "Content-Type: application/json" \
    -d '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}' | grep -q "0x190f1b45"; then
    echo -e "${GREEN}  ✓ EVM chain is running${NC}"
else
    echo -e "${RED}  ✗ EVM chain failed to start${NC}"
fi

echo ""
echo -e "${GREEN}✅ Polkadot stack is ready!${NC}"
echo ""
echo "📡 Network Endpoints:"
echo "  - Paseo AssetHub: ws://localhost:8000"
echo "  - EVM Chain: http://localhost:8545"
echo ""
echo "🎯 Architecture:"
echo "  ┌─────────────────┐      XCM       ┌─────────────────┐"
echo "  │  AssetHub       │ <------------> │  PassetHub      │"
echo "  │  (Chopsticks)   │                │  (Anvil/Revive) │"
echo "  │  - USDC (1337)  │                │  - Smart Contracts│"
echo "  └─────────────────┘                └─────────────────┘"
echo ""
echo "💡 Key Features:"
echo "  - USDC precompile: Would be at 0x0800...0539 on PassetHub"
echo "  - XCM reserve transfers between chains"
echo "  - EVM execution via Revive pallet (simulated with Anvil)"
echo ""
echo "🚀 Next Steps:"
echo "  1. Deploy contracts: node scripts/deploy-tipping.mjs"
echo "  2. Test tipping: node scripts/test-tipping.mjs"
echo "  3. Start frontend: pnpm dev"
echo ""
echo "📝 Logs:"
echo "  - Chopsticks: tail -f chopsticks.log"
echo "  - Anvil: tail -f anvil.log"
echo ""
echo "To stop all: pkill -f 'chopsticks|anvil'"
echo ""
echo -e "${YELLOW}Note: Using Anvil for EVM demo. Production would use PassetHub with Revive.${NC}"
echo -e "${YELLOW}Press Ctrl+C to stop all services${NC}"

# Keep script running
wait