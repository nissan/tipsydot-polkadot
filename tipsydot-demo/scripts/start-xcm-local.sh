#!/bin/bash

# Start local XCM setup with Chopsticks and OmniNode
# For PBA Cohort 7 - Simplified XCM Demo

set -e

echo "🚀 Starting local XCM environment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Kill any existing processes
echo "🧹 Cleaning up existing processes..."
pkill -f chopsticks || true
pkill -f polkadot-omni-node || true
sleep 2

# Start Chopsticks relay chain fork
echo -e "${YELLOW}1. Starting Chopsticks Relay Chain fork...${NC}"
npx @acala-network/chopsticks --config chopsticks-relay.yml &
RELAY_PID=$!
echo "   PID: $RELAY_PID"
sleep 5

# Start Chopsticks AssetHub fork
echo -e "${YELLOW}2. Starting Chopsticks AssetHub fork...${NC}"
npx @acala-network/chopsticks --config chopsticks.yml &
ASSETHUB_PID=$!
echo "   PID: $ASSETHUB_PID"
sleep 5

# Start OmniNode with Revive
echo -e "${YELLOW}3. Starting OmniNode with Revive pallet...${NC}"
if [ ! -f "./bin/polkadot-omni-node" ]; then
    echo -e "${RED}❌ OmniNode not found. Building...${NC}"
    ./scripts/build-omninode.sh
fi

# Create data directory
mkdir -p ./data/omninode

# Start OmniNode
./bin/polkadot-omni-node \
    --dev \
    --base-path ./data/omninode \
    --parachain-id 2000 \
    --port 30333 \
    --rpc-port 9945 \
    --rpc-cors all \
    --rpc-methods unsafe \
    --force-authoring \
    --enable-evm-rpc \
    -- \
    --chain rococo-local \
    --port 30334 \
    --rpc-port 9946 &
OMNINODE_PID=$!
echo "   PID: $OMNINODE_PID"

echo -e "${GREEN}✅ All services started!${NC}"
echo ""
echo "📍 Network endpoints:"
echo "   Relay Chain (Chopsticks): ws://localhost:9944"
echo "   AssetHub (Chopsticks):    ws://localhost:8000"
echo "   OmniNode (Revive):        ws://localhost:9945"
echo "   OmniNode EVM RPC:         http://localhost:9945"
echo ""
echo "💡 To stop all services, run: pkill -f chopsticks && pkill -f polkadot-omni-node"
echo ""
echo "🔍 Monitoring PIDs:"
echo "   Relay:     $RELAY_PID"
echo "   AssetHub:  $ASSETHUB_PID"
echo "   OmniNode:  $OMNINODE_PID"

# Wait for user input
echo ""
echo "Press Ctrl+C to stop all services..."
wait