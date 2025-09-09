#!/bin/bash

echo "🔨 Building OmniNode with Revive Support..."
echo "==========================================="

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Paths
SDK_PATH="/Users/nissan/code/pba-hackathon/polkadot-sdk"
OMNINODE_PATH="$SDK_PATH/cumulus/polkadot-omni-node"
OUTPUT_DIR="/Users/nissan/code/pba-hackathon/tipsydot-demo/bin"

# Check if SDK exists
if [ ! -d "$SDK_PATH" ]; then
    echo -e "${RED}❌ Polkadot SDK not found at $SDK_PATH${NC}"
    echo "Cloning Polkadot SDK..."
    cd /Users/nissan/code/pba-hackathon
    git clone --depth 1 https://github.com/paritytech/polkadot-sdk.git
    if [ $? -ne 0 ]; then
        echo -e "${RED}Failed to clone Polkadot SDK${NC}"
        exit 1
    fi
fi

# Create output directory
mkdir -p $OUTPUT_DIR

cd $SDK_PATH

# Option 1: Try to download pre-built binary first (faster)
echo -e "${YELLOW}📦 Checking for pre-built OmniNode binary...${NC}"
RELEASE_URL="https://github.com/paritytech/polkadot-sdk/releases/latest/download/polkadot-omni-node"

if command -v wget &> /dev/null; then
    wget -q --spider $RELEASE_URL
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Downloading pre-built binary...${NC}"
        wget -O $OUTPUT_DIR/polkadot-omni-node $RELEASE_URL
        chmod +x $OUTPUT_DIR/polkadot-omni-node
        echo -e "${GREEN}✅ OmniNode binary downloaded to $OUTPUT_DIR${NC}"
        exit 0
    fi
fi

# Option 2: Build from source
echo -e "${YELLOW}🔨 Building from source (this will take 10-20 minutes)...${NC}"
echo "Building with features: --features revive"

cd $OMNINODE_PATH

# Build with Revive support
cargo build --release --features revive

if [ $? -eq 0 ]; then
    # Copy binary to our project
    cp target/release/polkadot-omni-node $OUTPUT_DIR/
    echo -e "${GREEN}✅ OmniNode built successfully!${NC}"
    echo "Binary location: $OUTPUT_DIR/polkadot-omni-node"
else
    echo -e "${RED}❌ Build failed!${NC}"
    exit 1
fi