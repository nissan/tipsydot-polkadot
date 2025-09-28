#!/bin/bash

# Build script for Ink! smart contracts
# This script builds all contracts and prepares them for deployment

set -e

echo "🔨 Building Ink! Smart Contracts for TipsyDot"
echo "============================================="

# Check if cargo-contract is installed
if ! command -v cargo-contract &> /dev/null; then
    echo "❌ cargo-contract not found. Installing..."
    cargo install cargo-contract --version 4.0
fi

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Build function
build_contract() {
    local contract_name=$1
    echo -e "${YELLOW}Building $contract_name...${NC}"

    cd $contract_name

    # Clean previous builds
    cargo clean

    # Build in release mode
    if cargo contract build --release; then
        echo -e "${GREEN}✅ $contract_name built successfully${NC}"

        # Show contract size
        if [ -f "target/ink/${contract_name}.contract" ]; then
            size=$(ls -lh "target/ink/${contract_name}.contract" | awk '{print $5}')
            echo -e "   Contract size: ${size}"
        fi
    else
        echo -e "${RED}❌ Failed to build $contract_name${NC}"
        exit 1
    fi

    cd ..
    echo ""
}

# Main execution
echo "1. Building PSP22 USDC Token"
build_contract "psp22_usdc"

echo "2. Building Tipping Contract"
build_contract "tipping"

echo "3. Building Cross-Chain Contract"
build_contract "cross_chain"

echo "============================================="
echo -e "${GREEN}🎉 All contracts built successfully!${NC}"
echo ""
echo "📦 Contract artifacts location:"
echo "  - psp22_usdc/target/ink/psp22_usdc.contract"
echo "  - tipping/target/ink/tipping.contract"
echo "  - cross_chain/target/ink/cross_chain.contract"
echo ""
echo "📋 Metadata files (for UI):"
echo "  - psp22_usdc/target/ink/psp22_usdc.json"
echo "  - tipping/target/ink/tipping.json"
echo "  - cross_chain/target/ink/cross_chain.json"
echo ""
echo "Next steps:"
echo "  1. Run tests: ./test.sh"
echo "  2. Deploy locally: ./deploy-local.sh"
echo "  3. Deploy to testnet: ./deploy-testnet.sh"