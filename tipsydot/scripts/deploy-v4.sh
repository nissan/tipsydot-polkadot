#!/bin/bash

# Deploy TipsyDotV4 with parachain registry to local Anvil

echo "🚀 Deploying TipsyDotV4 to local Anvil..."

# Anvil account 0 (owner)
PRIVATE_KEY="0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
OWNER="0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"

# Treasury (account 1)
TREASURY="0x70997970C51812dc3A010C7d01b50e0d17dc79C8"

# RPC URL
RPC_URL="http://localhost:8545"

echo "📦 Deploying MockUSDC..."
USDC_DEPLOY=$(forge create --rpc-url $RPC_URL \
  --private-key $PRIVATE_KEY \
  --broadcast \
  contracts/MockUSDC.sol:MockUSDC 2>&1)

USDC_ADDRESS=$(echo "$USDC_DEPLOY" | grep "Deployed to:" | awk '{print $3}')
echo "✅ MockUSDC deployed at: $USDC_ADDRESS"

echo "📦 Deploying TipsyDotV4..."
TIPSYDOT_DEPLOY=$(forge create --rpc-url $RPC_URL \
  --private-key $PRIVATE_KEY \
  --broadcast \
  contracts/TipsyDotV4.sol:TipsyDotV4 \
  --constructor-args $TREASURY $USDC_ADDRESS 2>&1)

TIPSYDOT_ADDRESS=$(echo "$TIPSYDOT_DEPLOY" | grep "Deployed to:" | awk '{print $3}')
echo "✅ TipsyDotV4 deployed at: $TIPSYDOT_ADDRESS"

echo ""
echo "🔧 Setting up demo parachains..."

# Demo accounts (Anvil accounts 2-5)
MOONBEAM_ADDR="0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC"
HYDRATION_ADDR="0x90F79bf6EB2c4f870365E785982E1f101E93b906"
ACALA_ADDR="0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65"
INTERLAY_ADDR="0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc"

# Register parachains
echo "📝 Registering Moonbeam..."
cast send --private-key $PRIVATE_KEY --rpc-url $RPC_URL \
  $TIPSYDOT_ADDRESS \
  "registerParachain(uint32,string,string,address,bytes32)" \
  2004 \
  "Moonbeam" \
  "EVM-compatible smart contract platform" \
  $MOONBEAM_ADDR \
  0x0000000000000000000000000000000000000000000000000000000000002004

echo "📝 Registering Hydration..."
cast send --private-key $PRIVATE_KEY --rpc-url $RPC_URL \
  $TIPSYDOT_ADDRESS \
  "registerParachain(uint32,string,string,address,bytes32)" \
  2090 \
  "Hydration" \
  "DeFi liquidity protocol" \
  $HYDRATION_ADDR \
  0x0000000000000000000000000000000000000000000000000000000000002090

echo "📝 Registering Acala..."
cast send --private-key $PRIVATE_KEY --rpc-url $RPC_URL \
  $TIPSYDOT_ADDRESS \
  "registerParachain(uint32,string,string,address,bytes32)" \
  2000 \
  "Acala" \
  "DeFi hub of Polkadot" \
  $ACALA_ADDR \
  0x0000000000000000000000000000000000000000000000000000000000002000

echo "📝 Registering Interlay..."
cast send --private-key $PRIVATE_KEY --rpc-url $RPC_URL \
  $TIPSYDOT_ADDRESS \
  "registerParachain(uint32,string,string,address,bytes32)" \
  2032 \
  "Interlay" \
  "Bitcoin bridge to Polkadot" \
  $INTERLAY_ADDR \
  0x0000000000000000000000000000000000000000000000000000000000002032

echo ""
echo "✅ Verifying parachains..."
cast send --private-key $PRIVATE_KEY --rpc-url $RPC_URL $TIPSYDOT_ADDRESS "verifyParachain(uint32)" 2004
cast send --private-key $PRIVATE_KEY --rpc-url $RPC_URL $TIPSYDOT_ADDRESS "verifyParachain(uint32)" 2090
cast send --private-key $PRIVATE_KEY --rpc-url $RPC_URL $TIPSYDOT_ADDRESS "verifyParachain(uint32)" 2000
cast send --private-key $PRIVATE_KEY --rpc-url $RPC_URL $TIPSYDOT_ADDRESS "verifyParachain(uint32)" 2032

echo ""
echo "💰 Minting USDC to demo accounts..."
# Account 6 - Demo tipper
DEMO_TIPPER="0x976EA74026E726554dB657fA54763abd0C3a0aa9"
DEMO_TIPPER_KEY="0x92db14e403b83dfe3df233f83dfa3a0d7096f21ca9b0d6d6b8d88b2b4ec1564e"

# Mint 10,000 USDC to demo tipper
cast send --private-key $PRIVATE_KEY --rpc-url $RPC_URL \
  $USDC_ADDRESS \
  "mint(address,uint256)" \
  $DEMO_TIPPER \
  "10000000000"

# Approve TipsyDot to spend USDC
cast send --private-key $DEMO_TIPPER_KEY --rpc-url $RPC_URL \
  $USDC_ADDRESS \
  "approve(address,uint256)" \
  $TIPSYDOT_ADDRESS \
  "10000000000"

echo ""
echo "🎉 Deployment complete!"
echo ""
echo "📋 Contract Addresses:"
echo "  MockUSDC:   $USDC_ADDRESS"
echo "  TipsyDotV4: $TIPSYDOT_ADDRESS"
echo ""
echo "📊 Registered Parachains:"
echo "  - Moonbeam (2004):   $MOONBEAM_ADDR"
echo "  - Hydration (2090):  $HYDRATION_ADDR"
echo "  - Acala (2000):      $ACALA_ADDR"
echo "  - Interlay (2032):   $INTERLAY_ADDR"
echo ""
echo "💸 Demo Tipper: $DEMO_TIPPER (10,000 USDC)"

# Update .env.local
echo ""
echo "📝 Updating .env.local..."
cat > .env.local << EOF
# Local Anvil deployment
VITE_TIPSY_ADDRESS=$TIPSYDOT_ADDRESS
VITE_USDC_ADDRESS=$USDC_ADDRESS
VITE_USDC_PRECOMPILE=$USDC_ADDRESS
VITE_XCM_ROUTER=0x0000000000000000000000000000000000001234
VITE_EVM_RPC=http://localhost:8545
VITE_WS_ENDPOINT=wss://testnet-passet-hub-eth-rpc.polkadot.io

# Demo accounts
DEMO_TIPPER_KEY=0x92db14e403b83dfe3df233f83dfa3a0d7096f21ca9b0d6d6b8d88b2b4ec1564e
EOF

echo "✅ Environment updated!"