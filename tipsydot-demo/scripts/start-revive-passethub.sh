#!/bin/bash

# Start PassetHub using Revive Dev Node
# This provides TRUE Polkadot-native EVM execution via PolkaVM

set -e

echo "🚀 Starting PassetHub with Revive Pallet..."
echo "============================================="
echo "Using native Polkadot EVM execution (PolkaVM)"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Check if revive-dev-node exists
REVIVE_NODE="../polkadot-sdk/target/release/revive-dev-node"

if [ ! -f "$REVIVE_NODE" ]; then
    echo -e "${RED}❌ Revive dev-node binary not found at: $REVIVE_NODE${NC}"
    echo "Build it with: cd ../polkadot-sdk/substrate/frame/revive/dev-node/node && cargo build --release"
    exit 1
fi

echo -e "${BLUE}✓ Found revive-dev-node binary${NC}"

# Clean up existing processes
echo -e "${YELLOW}Cleaning up existing processes...${NC}"
pkill -f "revive-dev-node" || true
pkill -f "anvil" || true
sleep 2

# Start Revive Dev Node (PassetHub equivalent)
echo -e "${GREEN}Starting Revive Dev Node (PassetHub)...${NC}"
echo "  - Native PolkaVM EVM execution"
echo "  - Substrate WS: ws://localhost:9944" 
echo "  - Ethereum RPC: http://localhost:8545"

$REVIVE_NODE \
    --dev \
    --base-path /tmp/revive-passethub \
    --rpc-port 9944 \
    --rpc-cors all \
    --rpc-methods unsafe \
    --rpc-external \
    --node-key 0000000000000000000000000000000000000000000000000000000000000001 \
    > revive-node.log 2>&1 &

REVIVE_PID=$!
echo -e "${GREEN}  ✓ Revive Node PID: $REVIVE_PID${NC}"

# Wait for node to be ready
echo -e "${YELLOW}Waiting for Revive node to initialize...${NC}"
sleep 8

# Check if node is running
if kill -0 $REVIVE_PID 2>/dev/null; then
    echo -e "${GREEN}  ✓ Revive node is running${NC}"
    
    # Test Substrate RPC
    echo -e "${BLUE}Testing Substrate RPC...${NC}"
    if curl -s -X POST -H "Content-Type: application/json" \
        -d '{"jsonrpc":"2.0","method":"system_chain","params":[],"id":1}' \
        http://localhost:9944 | grep -q "result"; then
        echo -e "${GREEN}  ✓ Substrate RPC is responsive${NC}"
    else
        echo -e "${YELLOW}  ⚠ Substrate RPC not ready yet${NC}"
    fi
    
    # Check for pallet-revive
    echo -e "${BLUE}Checking for pallet-revive...${NC}"
    curl -s -X POST -H "Content-Type: application/json" \
        -d '{"jsonrpc":"2.0","method":"state_getMetadata","params":[],"id":1}' \
        http://localhost:9944 | grep -q "revive" && \
        echo -e "${GREEN}  ✓ pallet-revive is available${NC}" || \
        echo -e "${YELLOW}  ⚠ pallet-revive not detected in metadata${NC}"
    
else
    echo -e "${RED}❌ Failed to start Revive node${NC}"
    echo "Check logs: tail -f revive-node.log"
    exit 1
fi

echo ""
echo -e "${GREEN}🎉 PassetHub with Revive is ready!${NC}"
echo ""
echo "📡 Native Polkadot EVM Infrastructure:"
echo "  - Substrate Chain: Development"
echo "  - Substrate RPC: ws://localhost:9944"
echo "  - Pallet: pallet-revive (PolkaVM-based EVM)"
echo ""
echo "🔧 Key Features:"
echo "  - ✅ Native Substrate integration"
echo "  - ✅ PolkaVM execution (more efficient than EVM)"
echo "  - ✅ Solidity contract support"
echo "  - ✅ Synchronous XCM calls"
echo "  - ✅ Future-proof technology"
echo ""
echo "🚀 Next Steps:"
echo "  1. Compile contracts for Revive: node scripts/compile-revive.mjs"
echo "  2. Deploy to Revive: node scripts/deploy-revive.mjs" 
echo "  3. Test native flow: node scripts/test-revive.mjs"
echo ""
echo "📝 Logs: tail -f revive-node.log"
echo "To stop: pkill -f revive-dev-node"
echo ""
echo -e "${BLUE}This is TRUE Polkadot-native EVM - not a bridge!${NC}"
echo -e "${YELLOW}Press Ctrl+C to stop the service${NC}"

# Keep script running
wait