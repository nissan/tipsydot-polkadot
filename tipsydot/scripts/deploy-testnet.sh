#!/bin/bash

echo "🚀 Deploying to Passet Hub Testnet..."

# Load testnet environment
source .env.testnet

RPC_URL="https://testnet-passet-hub-eth-rpc.polkadot.io"
CHAIN_ID=420420421

# Check balance
echo "📊 Checking account balance..."
BALANCE=$(cast balance 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 --rpc-url $RPC_URL)
echo "Balance: $BALANCE wei"

# For Passet Hub, we need to compile with Solang for WASM
# Since we don't have Solang, we'll document this limitation

echo "⚠️  Note: Passet Hub requires Solang-compiled WASM contracts"
echo "For hackathon demo, we're using local Anvil deployment"
echo ""
echo "To deploy on actual Passet Hub testnet:"
echo "1. Install Solang: https://github.com/hyperledger/solang"
echo "2. Compile: solang compile --target substrate -O=s contracts/TipsyDot.sol"
echo "3. Deploy the WASM using Polkadot.js Apps"
echo ""
echo "AssetHub USDC (Asset ID 1337) integration:"
echo "- On mainnet AssetHub: Asset ID 1337"
echo "- XCM transfers would use this asset ID"
echo "- Precompile address needs to be confirmed with Passet Hub team"
echo ""
echo "📝 For demo purposes, use local Anvil deployment"