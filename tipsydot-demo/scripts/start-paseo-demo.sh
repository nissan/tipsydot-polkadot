#!/bin/bash

# TipsyDot Demo - Start Paseo + PassetHub with USDC
# This script sets up a local testnet with:
# - Forked Paseo AssetHub (with real USDC Asset ID 1337)
# - PassetHub with Revive pallet for EVM execution

set -e

echo "🎯 TipsyDot Demo - Starting Paseo testnet setup..."
echo "================================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}Error: Must run from tipsydot-demo directory${NC}"
    exit 1
fi

# Kill any existing processes
echo -e "${YELLOW}Cleaning up existing processes...${NC}"
pkill -f "chopsticks" || true
pkill -f "polkadot-omni-node" || true
pkill -f "anvil" || true
sleep 2

# Start Chopsticks fork of Paseo AssetHub
echo -e "${GREEN}Starting Paseo AssetHub fork with Chopsticks...${NC}"
echo "  - Port: 8000"
echo "  - USDC Asset ID: 1337"
echo "  - Pre-funded accounts: Alice, Bob, Charlie"

npx @acala-network/chopsticks \
    --config chopsticks-assethub.yml \
    --port 8000 \
    > chopsticks.log 2>&1 &

CHOPSTICKS_PID=$!
echo "  - Chopsticks PID: $CHOPSTICKS_PID"

# Wait for Chopsticks to be ready
echo -e "${YELLOW}Waiting for AssetHub to be ready...${NC}"
sleep 10

# For now, use Anvil as a simpler EVM chain (until OmniNode setup is complete)
echo -e "${GREEN}Starting Anvil EVM chain...${NC}"
echo "  - Port: 8545"
echo "  - Chain ID: 420420421"

anvil \
    --port 8545 \
    --chain-id 420420421 \
    --accounts 10 \
    --balance 10000 \
    --block-time 2 \
    > anvil.log 2>&1 &

ANVIL_PID=$!
echo "  - Anvil PID: $ANVIL_PID"

# Wait for Anvil
sleep 5

echo ""
echo -e "${GREEN}✅ Infrastructure is ready!${NC}"
echo ""
echo "📡 Network Endpoints:"
echo "  - Paseo AssetHub (Chopsticks): ws://localhost:8000"
echo "  - EVM Chain (Anvil): http://localhost:8545"
echo ""
echo "💰 Pre-funded Test Accounts:"
echo "  - Alice: 0xd43593c715fdd31c61141abd04a99fd6822c8558854ccde39a5684e7a56da27d"
echo "  - Bob:   0x8eaf04151687736326c9fea17e25fc5287613693c912909cb226aa4794f26a48"
echo "  - Charlie: 0x90b5ab205c6974c9ea841be688864633dc9ca8a357843eeacf2314649965fe22"
echo ""
echo "  Each account has:"
echo "  - 1,000,000 USDC (Asset ID 1337) on AssetHub"
echo "  - Native tokens for fees"
echo ""
echo "🚀 Next Steps:"
echo "  1. Deploy contracts: npm run deploy"
echo "  2. Start frontend: npm run dev"
echo "  3. Access at: http://localhost:3000"
echo ""
echo "📝 Logs:"
echo "  - Chopsticks: tail -f chopsticks.log"
echo "  - Anvil: tail -f anvil.log"
echo ""
echo "To stop all services: pkill -f 'chopsticks|anvil'"
echo ""

# Keep script running
echo -e "${YELLOW}Press Ctrl+C to stop all services${NC}"
wait