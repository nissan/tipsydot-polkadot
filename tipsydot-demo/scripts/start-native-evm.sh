#!/bin/bash

# Start Native EVM Parachain built with Pop CLI
# This replaces Anvil with true Polkadot technology

set -e

echo "🚀 Starting Native Polkadot EVM Chain..."
echo "========================================"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check if parachain binary exists
PARACHAIN_BIN="./passethub-native/target/release/passethub-native"

if [ ! -f "$PARACHAIN_BIN" ]; then
    echo "❌ Parachain binary not found at $PARACHAIN_BIN"
    echo "Build is still in progress. Checking status..."
    
    # Check if build is running
    if pgrep -f "pop build --release" > /dev/null; then
        echo -e "${YELLOW}Build is running. Please wait for completion...${NC}"
        echo "You can monitor with: tail -f passethub-native/target/release/build/*.log"
    else
        echo "Please run: cd passethub-native && pop build --release"
    fi
    exit 1
fi

# Kill any existing processes
echo -e "${YELLOW}Cleaning up existing processes...${NC}"
pkill -f "passethub-native" || true
sleep 2

# Start the native EVM parachain
echo -e "${GREEN}Starting Native EVM Parachain (Para ID 2000)...${NC}"
echo "  - Substrate WS: ws://localhost:9944"
echo "  - Ethereum RPC: http://localhost:8545"

$PARACHAIN_BIN \
    --dev \
    --rpc-port 9944 \
    --rpc-cors all \
    --rpc-methods unsafe \
    --force-authoring \
    --eth-rpc-port 8545 \
    --eth-ws-port 8546 \
    --sealing instant \
    --no-prometheus \
    --no-telemetry \
    > native-evm.log 2>&1 &

EVM_PID=$!
echo "  - Native EVM PID: $EVM_PID"

# Wait for node to be ready
echo -e "${YELLOW}Waiting for Native EVM to be ready...${NC}"
sleep 10

# Check if node is running
if kill -0 $EVM_PID 2>/dev/null; then
    echo -e "${GREEN}✅ Native EVM Parachain is running!${NC}"
    
    # Test Substrate RPC
    echo ""
    echo "Testing Substrate RPC..."
    curl -s -X POST -H "Content-Type: application/json" \
        -d '{"jsonrpc":"2.0","method":"system_chain","params":[],"id":1}' \
        http://localhost:9944 | grep -o '"result":"[^"]*"' || echo "Substrate RPC not ready yet"
    
    # Test Ethereum RPC
    echo ""
    echo "Testing Ethereum RPC..."
    curl -s -X POST -H "Content-Type: application/json" \
        -d '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}' \
        http://localhost:8545 | grep -o '"result":"[^"]*"' || echo "Ethereum RPC not ready yet"
    
else
    echo -e "❌ Failed to start Native EVM Parachain"
    echo "Check logs: tail -f native-evm.log"
    exit 1
fi

echo ""
echo -e "${GREEN}🎉 Native Polkadot EVM is ready!${NC}"
echo ""
echo "📡 Endpoints:"
echo "  - Substrate RPC: ws://localhost:9944"
echo "  - Ethereum RPC: http://localhost:8545"
echo ""
echo "📝 Logs: tail -f native-evm.log"
echo "To stop: kill $EVM_PID"
echo ""
echo "This is TRUE Polkadot technology - no Ethereum bridges!"