#!/bin/bash

echo "🚀 Starting TipsyDot Demo Infrastructure..."
echo "============================================"
echo ""

# Kill any existing processes
echo "Cleaning up old processes..."
pkill -f chopsticks 2>/dev/null
pkill -f anvil 2>/dev/null

# Start Chopsticks AssetHub Fork
echo "🥢 Starting Chopsticks AssetHub fork (Paseo)..."
echo "   Endpoint: ws://localhost:8000"
npx @acala-network/chopsticks --config=chopsticks.yml &
CHOPSTICKS_PID=$!

# Wait for Chopsticks to start
sleep 3

# Start Anvil EVM chain
echo "⚒️  Starting Anvil EVM chain..."
echo "   Endpoint: http://localhost:8545"
echo "   Chain ID: 420420421"
anvil --port 8545 --chain-id 420420421 --accounts 5 --balance 10000 &
ANVIL_PID=$!

# Wait for services to be ready
sleep 3

echo ""
echo "✅ Infrastructure ready!"
echo "============================================"
echo ""
echo "Services running:"
echo "  🥢 AssetHub Fork: ws://localhost:8000 (PID: $CHOPSTICKS_PID)"
echo "  ⚒️  Anvil EVM: http://localhost:8545 (PID: $ANVIL_PID)"
echo ""
echo "Test Accounts:"
echo "  Alice: 5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY"
echo "  Bob:   5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty"
echo "  Charlie: 5FLSigC9HGRKVhB9FiEo4Y3koPsNmBmLJbpXg2mp1hXcS59Y"
echo ""
echo "Polkadot.js Apps: https://polkadot.js.org/apps/?rpc=ws://127.0.0.1:8000#/assets"
echo ""
echo "Press Ctrl+C to stop all services"
echo "============================================"

# Wait for Ctrl+C
wait