#!/bin/bash

# Load environment variables
source .env.local

# Set defaults
RPC_URL=${VITE_EVM_RPC:-"https://testnet-passet-hub-eth-rpc.polkadot.io"}
CHAIN_ID=420420421

echo "🚀 Deploying TipsyDot contract to Passet Hub..."
echo "RPC URL: $RPC_URL"
echo "Chain ID: $CHAIN_ID"

# Check if private key is set
if [ -z "$PRIVATE_KEY" ]; then
    echo "❌ Error: PRIVATE_KEY not set in .env.local"
    echo "Please add: PRIVATE_KEY=your_private_key_here"
    exit 1
fi

# Get the bytecode from compiled artifacts
BYTECODE=$(cat artifacts/contracts/TipsyDot.sol/TipsyDot.json | jq -r '.bytecode')

# Deploy the contract
echo "📝 Deploying contract..."
DEPLOY_TX=$(cast send --rpc-url $RPC_URL \
    --private-key $PRIVATE_KEY \
    --chain-id $CHAIN_ID \
    --create $BYTECODE \
    --json)

# Extract contract address from deployment
CONTRACT_ADDRESS=$(echo $DEPLOY_TX | jq -r '.contractAddress')

if [ -z "$CONTRACT_ADDRESS" ] || [ "$CONTRACT_ADDRESS" = "null" ]; then
    echo "❌ Deployment failed!"
    echo "Response: $DEPLOY_TX"
    exit 1
fi

echo "✅ Contract deployed at: $CONTRACT_ADDRESS"
echo ""
echo "📋 Next steps:"
echo "1. Add to .env.local:"
echo "   VITE_TIPSY_ADDRESS=$CONTRACT_ADDRESS"
echo ""
echo "2. Set XCM Router (if you have the address):"
echo "   ./scripts/set-router.sh <ROUTER_ADDRESS>"
echo ""
echo "3. Deploy info saved to: deploy-output.json"

# Save deployment info
echo $DEPLOY_TX > deploy-output.json