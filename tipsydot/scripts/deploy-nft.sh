#!/bin/bash

# Deploy NFT Contract Script
echo "🎨 Deploying TipsyDot NFT Contract..."

# Load environment variables
source .env 2>/dev/null || true

# Default values for local development
OWNER=${OWNER:-0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266}
PRIVATE_KEY=${PRIVATE_KEY:-0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80}
RPC_URL=${RPC_URL:-http://localhost:8545}

# Get TipsyDot contract address (should be deployed first)
TIPSYDOT_ADDRESS=$(forge script script/Deploy.s.sol --rpc-url $RPC_URL --private-key $PRIVATE_KEY --broadcast --json | jq -r '.returns.tipsydotAddress.value // empty' 2>/dev/null)

if [ -z "$TIPSYDOT_ADDRESS" ]; then
    echo "⚠️  TipsyDot contract address not found. Please deploy TipsyDot first with deploy-v4.sh"
    echo "   Continuing with placeholder address for now..."
    TIPSYDOT_ADDRESS="0x0000000000000000000000000000000000000000"
fi

echo "📍 TipsyDot Contract: $TIPSYDOT_ADDRESS"

# Deploy NFT contract
echo "🚀 Deploying NFT contract..."
NFT_RESULT=$(forge create contracts/TipsyDotNFT.sol:TipsyDotNFT \
    --rpc-url $RPC_URL \
    --private-key $PRIVATE_KEY \
    --constructor-args $TIPSYDOT_ADDRESS \
    --json 2>/dev/null)

if [ $? -eq 0 ]; then
    NFT_ADDRESS=$(echo $NFT_RESULT | jq -r '.deployedTo')
    echo "✅ NFT Contract deployed to: $NFT_ADDRESS"
    
    # Update environment file
    echo "💾 Updating .env file..."
    if [ -f .env ]; then
        # Remove existing NFT_ADDRESS line if it exists
        sed -i '' '/^NFT_ADDRESS=/d' .env
    fi
    echo "NFT_ADDRESS=$NFT_ADDRESS" >> .env
    
    # Export for current session
    export NFT_ADDRESS=$NFT_ADDRESS
    
    echo "🔗 Setting TipsyDot NFT address in main contract..."
    cast send $TIPSYDOT_ADDRESS "setNFTContract(address)" $NFT_ADDRESS \
        --rpc-url $RPC_URL \
        --private-key $PRIVATE_KEY > /dev/null 2>&1
    
    echo "🎯 Deployment Summary:"
    echo "   NFT Contract:     $NFT_ADDRESS"
    echo "   TipsyDot Contract: $TIPSYDOT_ADDRESS"
    echo ""
    echo "✅ NFT system is ready! Users can now earn collectible cards when tipping."
    
else
    echo "❌ Failed to deploy NFT contract"
    exit 1
fi