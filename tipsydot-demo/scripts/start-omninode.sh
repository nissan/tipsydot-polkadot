#!/bin/bash

echo "🚀 Starting OmniNode with Revive Pallet..."
echo "========================================="

# Configuration
CHAIN_SPEC="./omninode-chain-spec.json"
BASE_PATH="/tmp/omninode-tipsydot"
RPC_PORT=9944
WS_PORT=9945
P2P_PORT=30333
ETH_RPC_PORT=8546  # Different from Anvil's 8545

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if omninode binary exists
if [ ! -f "./bin/polkadot-omni-node" ]; then
    echo -e "${RED}❌ OmniNode binary not found!${NC}"
    echo "Please run: ./scripts/build-omninode.sh first"
    exit 1
fi

# Check if chain spec exists
if [ ! -f "$CHAIN_SPEC" ]; then
    echo -e "${YELLOW}⚠️  Chain spec not found. Creating default...${NC}"
    ./scripts/create-chain-spec.sh
fi

# Clean previous data
echo "🧹 Cleaning previous chain data..."
rm -rf $BASE_PATH

# Start OmniNode
echo -e "${GREEN}✅ Starting OmniNode...${NC}"
echo "   Substrate RPC: ws://localhost:$WS_PORT"
echo "   HTTP RPC: http://localhost:$RPC_PORT"
echo "   Ethereum RPC: http://localhost:$ETH_RPC_PORT"
echo ""

./bin/polkadot-omni-node \
    --chain=$CHAIN_SPEC \
    --base-path=$BASE_PATH \
    --rpc-port=$RPC_PORT \
    --ws-port=$WS_PORT \
    --port=$P2P_PORT \
    --rpc-external \
    --ws-external \
    --rpc-cors=all \
    --rpc-methods=unsafe \
    --enable-eth-rpc \
    --eth-rpc-port=$ETH_RPC_PORT \
    --sealing=instant \
    --alice \
    --tmp \
    --dev