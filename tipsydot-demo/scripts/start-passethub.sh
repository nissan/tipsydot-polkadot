#!/bin/bash

# Start PassetHub with OmniNode + Revive Pallet
# This provides Polkadot-native EVM execution

set -e

echo "🚀 Starting PassetHub with Revive EVM..."
echo "========================================"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check for OmniNode in multiple locations
OMNINODE_BIN=""
if [ -f "./bin/polkadot-omni-node" ]; then
    OMNINODE_BIN="./bin/polkadot-omni-node"
elif [ -f "~/code/pba-hackathon/polkadot-sdk/target/release/polkadot-omni-node" ]; then
    OMNINODE_BIN="~/code/pba-hackathon/polkadot-sdk/target/release/polkadot-omni-node"
elif [ -f "../polkadot-sdk/target/release/polkadot-omni-node" ]; then
    OMNINODE_BIN="../polkadot-sdk/target/release/polkadot-omni-node"
else
    echo "❌ OmniNode binary not found"
    echo "Building from source... Check build status with: ps aux | grep cargo"
    exit 1
fi

echo "✅ Found OmniNode at: $OMNINODE_BIN"

# Kill any existing OmniNode processes
echo -e "${YELLOW}Cleaning up existing processes...${NC}"
pkill -f "polkadot-omni-node" || true
sleep 2

# Start OmniNode with Revive
echo -e "${GREEN}Starting PassetHub (Para ID 1111) with Revive pallet...${NC}"
echo "  - Substrate WS: ws://localhost:9944"
echo "  - Ethereum RPC: http://localhost:8545"
echo "  - Ethereum WS: ws://localhost:8546"

$OMNINODE_BIN \
    --dev \
    --parachain-id 1111 \
    --base-path /tmp/passethub \
    --rpc-port 9944 \
    --rpc-cors all \
    --rpc-methods unsafe \
    --force-authoring \
    --enable-evm-rpc \
    --eth-rpc-port 8545 \
    --eth-ws-port 8546 \
    --sealing instant \
    --no-prometheus \
    --no-telemetry \
    > omninode.log 2>&1 &

OMNINODE_PID=$!
echo "  - OmniNode PID: $OMNINODE_PID"

# Wait for node to be ready
echo -e "${YELLOW}Waiting for PassetHub to be ready...${NC}"
sleep 10

# Check if node is running
if kill -0 $OMNINODE_PID 2>/dev/null; then
    echo -e "${GREEN}✅ PassetHub is running!${NC}"
    
    # Try to get chain info
    echo ""
    echo "Testing Substrate RPC..."
    curl -s -X POST -H "Content-Type: application/json" \
        -d '{"jsonrpc":"2.0","method":"system_chain","params":[],"id":1}' \
        http://localhost:9944 | grep -o '"result":"[^"]*"' || echo "Substrate RPC not ready yet"
    
    echo ""
    echo "Testing Ethereum RPC..."
    curl -s -X POST -H "Content-Type: application/json" \
        -d '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}' \
        http://localhost:8545 | grep -o '"result":"[^"]*"' || echo "Ethereum RPC not ready yet"
    
else
    echo -e "❌ Failed to start PassetHub"
    echo "Check logs: tail -f omninode.log"
    exit 1
fi

echo ""
echo -e "${GREEN}🎉 PassetHub with Revive EVM is ready!${NC}"
echo ""
echo "📡 Endpoints:"
echo "  - Substrate RPC: ws://localhost:9944"
echo "  - Ethereum RPC: http://localhost:8545"
echo "  - Ethereum WS: ws://localhost:8546"
echo ""
echo "📝 Logs: tail -f omninode.log"
echo "To stop: pkill -f polkadot-omni-node"
echo ""