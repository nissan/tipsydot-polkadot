#!/bin/bash

# Deploy Faucet Token Script
echo "💧 Deploying Faucet Token Contract..."

# Load environment variables
source .env 2>/dev/null || true

# Default values for local development
OWNER=${OWNER:-0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266}
PRIVATE_KEY=${PRIVATE_KEY:-0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80}
RPC_URL=${RPC_URL:-http://localhost:8545}

# Deploy Faucet token
echo "🚀 Deploying Faucet token..."
FAUCET_RESULT=$(forge create contracts/FaucetToken.sol:FaucetToken \
    --rpc-url $RPC_URL \
    --private-key $PRIVATE_KEY \
    --json 2>/dev/null)

if [ $? -eq 0 ]; then
    FAUCET_ADDRESS=$(echo $FAUCET_RESULT | jq -r '.deployedTo')
    echo "✅ Faucet Token deployed to: $FAUCET_ADDRESS"
    
    # Update environment file
    echo "💾 Updating .env file..."
    if [ -f .env ]; then
        # Remove existing FAUCET_ADDRESS line if it exists
        sed -i '' '/^FAUCET_ADDRESS=/d' .env
    fi
    echo "FAUCET_ADDRESS=$FAUCET_ADDRESS" >> .env
    
    # Export for current session
    export FAUCET_ADDRESS=$FAUCET_ADDRESS
    
    # Check token info
    echo "📊 Token Information:"
    NAME=$(cast call $FAUCET_ADDRESS "name()" --rpc-url $RPC_URL | cast --to-ascii)
    SYMBOL=$(cast call $FAUCET_ADDRESS "symbol()" --rpc-url $RPC_URL | cast --to-ascii)
    DECIMALS=$(cast call $FAUCET_ADDRESS "decimals()" --rpc-url $RPC_URL)
    TOTAL_SUPPLY=$(cast call $FAUCET_ADDRESS "totalSupply()" --rpc-url $RPC_URL)
    
    echo "   Name: $NAME"
    echo "   Symbol: $SYMBOL"
    echo "   Decimals: $DECIMALS"
    echo "   Total Supply: $TOTAL_SUPPLY"
    
    echo ""
    echo "🎯 Faucet is ready!"
    echo "   Contract: $FAUCET_ADDRESS"
    echo "   Claim Amount: 1000 FAUCET tokens"
    echo "   Cooldown: 1 hour"
    echo ""
    echo "💡 Test the faucet:"
    echo "   cast send $FAUCET_ADDRESS \"claim()\" --rpc-url $RPC_URL --private-key \$PRIVATE_KEY"
    
else
    echo "❌ Failed to deploy Faucet token"
    exit 1
fi