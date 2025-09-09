#!/bin/bash

# Setup Omninode with Revive pallet for local Substrate testing
# This provides a realistic environment for testing bridged assets

echo "🚀 Setting up Omninode with Revive pallet..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if cargo is installed
if ! command -v cargo &> /dev/null; then
    echo -e "${RED}Error: Cargo is not installed. Please install Rust first.${NC}"
    echo "Visit: https://www.rust-lang.org/tools/install"
    exit 1
fi

# Create workspace for Omninode if it doesn't exist
OMNINODE_DIR="./omninode-workspace"
if [ ! -d "$OMNINODE_DIR" ]; then
    echo "📁 Creating Omninode workspace..."
    mkdir -p $OMNINODE_DIR
fi

cd $OMNINODE_DIR

# Clone Omninode repository
if [ ! -d "polkadot-omni-node" ]; then
    echo "📦 Cloning Polkadot Omninode..."
    git clone https://github.com/paritytech/polkadot-omni-node.git
    cd polkadot-omni-node
else
    echo "📦 Updating Polkadot Omninode..."
    cd polkadot-omni-node
    git pull
fi

# Build Omninode
echo -e "${YELLOW}🔨 Building Omninode (this may take a while)...${NC}"
cargo build --release

# Check if build was successful
if [ $? -ne 0 ]; then
    echo -e "${RED}Error: Failed to build Omninode${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Omninode built successfully!${NC}"

# Create chain spec for local testing with Revive
echo "📝 Creating chain spec with Revive pallet..."

# Create a custom chain spec configuration
cat > ../revive-chain-spec.json << 'EOF'
{
  "name": "PassetHub Local",
  "id": "passet_hub_local",
  "chainType": "Local",
  "bootNodes": [],
  "telemetryEndpoints": null,
  "protocolId": null,
  "properties": {
    "tokenDecimals": 12,
    "tokenSymbol": "DOT"
  },
  "relay_chain": "rococo-local",
  "para_id": 1111,
  "codeSubstitutes": {},
  "genesis": {
    "runtime": {
      "system": {
        "code": ""
      },
      "balances": {
        "balances": [
          ["5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY", 1000000000000000],
          ["5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty", 1000000000000000]
        ]
      },
      "parachainInfo": {
        "parachainId": 1111
      },
      "assets": {
        "assets": [
          [31337, "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY", true, 1],
          [31337, "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY", 1000000000000]
        ],
        "metadata": [
          [31337, "USDC", "USDC", 6]
        ]
      },
      "revive": {
        "contracts": []
      }
    }
  }
}
EOF

echo "📋 Chain spec created at: $OMNINODE_DIR/revive-chain-spec.json"

# Create startup script
cat > ../start-omninode.sh << 'EOF'
#!/bin/bash

# Start Omninode with Revive pallet enabled
echo "🚀 Starting Omninode with Revive pallet..."

# Set paths
OMNINODE_BIN="./polkadot-omni-node/target/release/polkadot-omni-node"
CHAIN_SPEC="./revive-chain-spec.json"

# Check if binary exists
if [ ! -f "$OMNINODE_BIN" ]; then
    echo "Error: Omninode binary not found. Please run setup-omninode.sh first."
    exit 1
fi

# Start node with Revive pallet enabled
$OMNINODE_BIN \
    --dev \
    --tmp \
    --rpc-port 9944 \
    --ws-port 9945 \
    --rpc-cors all \
    --rpc-methods unsafe \
    --enable-evm-rpc \
    --name "PassetHub-Local" \
    --chain $CHAIN_SPEC \
    --execution wasm \
    --wasm-execution compiled \
    --force-authoring

EOF

chmod +x ../start-omninode.sh

# Create configuration for bridged USDC
cat > ../usdc-config.json << 'EOF'
{
  "asset_id": 31337,
  "name": "USD Coin",
  "symbol": "USDC",
  "decimals": 6,
  "precompile_address": "0x0000000000000000000000000000000000000800",
  "min_balance": 1,
  "is_sufficient": true,
  "bridged_from": {
    "chain": "AssetHub",
    "parachain_id": 1000,
    "asset_id": 31337
  }
}
EOF

echo ""
echo -e "${GREEN}✅ Omninode setup complete!${NC}"
echo ""
echo "📋 Next steps:"
echo "   1. Start Omninode: cd $OMNINODE_DIR && ./start-omninode.sh"
echo "   2. The node will be available at:"
echo "      - RPC: http://localhost:9944"
echo "      - WS:  ws://localhost:9945"
echo "   3. EVM RPC endpoints will be available for Revive pallet"
echo ""
echo "💡 USDC Configuration:"
echo "   - Asset ID: 31337"
echo "   - Precompile: 0x0000000000000000000000000000000000000800"
echo "   - Decimals: 6"
echo ""
echo "🔗 Connect your app to use the Substrate node with EVM compatibility!"