#!/bin/bash

# Helper to approve USDC spending for the TipsyDot contract

source .env.local

RPC_URL=${VITE_EVM_RPC:-"https://testnet-passet-hub-eth-rpc.polkadot.io"}
USDC=${VITE_USDC_PRECOMPILE}
SPENDER=${VITE_TIPSY_ADDRESS}

if [ -z "$USDC" ]; then
    echo "❌ Error: VITE_USDC_PRECOMPILE not set in .env.local"
    exit 1
fi

if [ -z "$SPENDER" ]; then
    echo "❌ Error: VITE_TIPSY_ADDRESS not set in .env.local"
    exit 1
fi

AMOUNT=${1:-"1000000000000"}  # Default to 1M USDC (with 6 decimals)

echo "📝 Approving USDC spending..."
echo "Token: $USDC"
echo "Spender: $SPENDER"
echo "Amount: $AMOUNT"

cast send --rpc-url $RPC_URL \
    --private-key $PRIVATE_KEY \
    $USDC \
    "approve(address,uint256)" \
    $SPENDER \
    $AMOUNT