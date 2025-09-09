#!/bin/bash

# Deploy USDP ecosystem to local Anvil

echo "🚀 Deploying USDP Ecosystem..."

# Anvil account 0 (owner)
PRIVATE_KEY="0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
OWNER="0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"

# Treasury (account 1)
TREASURY="0x70997970C51812dc3A010C7d01b50e0d17dc79C8"

# RPC URL
RPC_URL="http://localhost:8545"

# Get existing contracts
source .env.local
TIPSYDOT_ADDRESS=$VITE_TIPSY_ADDRESS

echo "📦 Deploying USDP Token..."
USDP_DEPLOY=$(forge create --rpc-url $RPC_URL \
  --private-key $PRIVATE_KEY \
  --broadcast \
  contracts/USDP.sol:USDP 2>&1)

USDP_ADDRESS=$(echo "$USDP_DEPLOY" | grep "Deployed to:" | awk '{print $3}')
echo "✅ USDP deployed at: $USDP_ADDRESS"

echo "📦 Deploying USDP Bridge..."
BRIDGE_DEPLOY=$(forge create --rpc-url $RPC_URL \
  --private-key $PRIVATE_KEY \
  --broadcast \
  contracts/USDPBridge.sol:USDPBridge \
  --constructor-args $USDP_ADDRESS 2>&1)

BRIDGE_ADDRESS=$(echo "$BRIDGE_DEPLOY" | grep "Deployed to:" | awk '{print $3}')
echo "✅ USDPBridge deployed at: $BRIDGE_ADDRESS"

echo "📦 Deploying USDP Swap..."
SWAP_DEPLOY=$(forge create --rpc-url $RPC_URL \
  --private-key $PRIVATE_KEY \
  --broadcast \
  contracts/USDPSwap.sol:USDPSwap \
  --constructor-args $USDP_ADDRESS 2>&1)

SWAP_ADDRESS=$(echo "$SWAP_DEPLOY" | grep "Deployed to:" | awk '{print $3}')
echo "✅ USDPSwap deployed at: $SWAP_ADDRESS"

echo ""
echo "🔧 Setting up roles and permissions..."

# Grant BRIDGE_ROLE to bridge contract
cast send --private-key $PRIVATE_KEY --rpc-url $RPC_URL \
  $USDP_ADDRESS \
  "grantRole(bytes32,address)" \
  0x$(echo -n "BRIDGE_ROLE" | xxd -p -c 32 | tail -c 64) \
  $BRIDGE_ADDRESS

# Grant MINTER_ROLE to swap contract (for demo liquidity)
cast send --private-key $PRIVATE_KEY --rpc-url $RPC_URL \
  $USDP_ADDRESS \
  "grantRole(bytes32,address)" \
  0x$(echo -n "MINTER_ROLE" | xxd -p -c 32 | tail -c 64) \
  $SWAP_ADDRESS

echo ""
echo "💰 Minting initial USDP supply..."

# Mint 1,000,000 USDP to owner for liquidity
cast send --private-key $PRIVATE_KEY --rpc-url $RPC_URL \
  $USDP_ADDRESS \
  "mint(address,uint256)" \
  $OWNER \
  "1000000000000"

echo ""
echo "🌉 Registering parachains on bridge..."

# Register AssetHub
cast send --private-key $PRIVATE_KEY --rpc-url $RPC_URL \
  $BRIDGE_ADDRESS \
  "registerParachain(uint32,bytes32)" \
  1000 \
  0x0000000000000000000000000000000000000000000000000000000000001000

# Register PassetHub
cast send --private-key $PRIVATE_KEY --rpc-url $RPC_URL \
  $BRIDGE_ADDRESS \
  "registerParachain(uint32,bytes32)" \
  1111 \
  0x0000000000000000000000000000000000000000000000000000000000001111

echo ""
echo "🎉 USDP Ecosystem Deployment Complete!"
echo ""
echo "📋 Contract Addresses:"
echo "  USDP Token:    $USDP_ADDRESS"
echo "  USDP Bridge:   $BRIDGE_ADDRESS"
echo "  USDP Swap:     $SWAP_ADDRESS"
echo "  TipsyDot V4:   $TIPSYDOT_ADDRESS"
echo ""
echo "💡 USDP Details:"
echo "  - Asset ID: 42069"
echo "  - Decimals: 6"
echo "  - Symbol: USDP"
echo "  - Initial Supply: 1,000,000 USDP"
echo ""
echo "🔗 Next Steps:"
echo "  1. Create faucet token"
echo "  2. Add liquidity to swap pool"
echo "  3. Test complete flow"

# Update .env.local with USDP addresses
echo ""
echo "📝 Updating .env.local..."
cat >> .env.local << EOF

# USDP Ecosystem
VITE_USDP_ADDRESS=$USDP_ADDRESS
VITE_USDP_BRIDGE=$BRIDGE_ADDRESS
VITE_USDP_SWAP=$SWAP_ADDRESS
EOF

echo "✅ Environment updated!"