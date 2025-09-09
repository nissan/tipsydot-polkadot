#!/bin/bash

# Monitor all native Polkadot builds in progress

echo "🔍 Monitoring Native Polkadot Builds"
echo "====================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Check OmniNode
echo "1️⃣ OmniNode Build:"
if [ -f ~/code/pba-hackathon/polkadot-sdk/target/release/polkadot-omni-node ]; then
    echo -e "  ${GREEN}✅ READY!${NC}"
    ls -lh ~/code/pba-hackathon/polkadot-sdk/target/release/polkadot-omni-node
else
    if pgrep -f "cargo build.*polkadot-omni-node" > /dev/null; then
        echo -e "  ${YELLOW}🚧 Building...${NC}"
    else
        echo -e "  ${RED}❌ Not building${NC}"
    fi
fi

echo ""

# Check Pop CLI EVM Parachain
echo "2️⃣ Pop CLI EVM Parachain:"
if [ -f passethub-native/target/release/passethub-native ]; then
    echo -e "  ${GREEN}✅ READY!${NC}"
    ls -lh passethub-native/target/release/passethub-native
else
    if pgrep -f "pop build --release" > /dev/null; then
        echo -e "  ${YELLOW}🚧 Building...${NC}"
    else
        echo -e "  ${RED}❌ Not building${NC}"
    fi
fi

echo ""

# Check Frontier
echo "3️⃣ Frontier EVM Node:"
if [ -f /tmp/frontier/target/release/frontier-template-node ]; then
    echo -e "  ${GREEN}✅ READY!${NC}"
    ls -lh /tmp/frontier/target/release/frontier-template-node
else
    if pgrep -f "cargo build.*frontier" > /dev/null; then
        echo -e "  ${YELLOW}🚧 Building...${NC}"
    else
        echo -e "  ${RED}❌ Not building${NC}"
    fi
fi

echo ""
echo "📊 Build Statistics:"
echo "  - Active cargo processes: $(pgrep -c cargo 2>/dev/null || echo 0)"
echo "  - CPU usage: $(ps aux | grep cargo | awk '{sum+=$3} END {printf "%.1f%%", sum}')"
echo "  - Time running: ~$(ps aux | grep -E "cargo|pop" | grep -v grep | head -1 | awk '{print $10}' 2>/dev/null || echo "unknown")"

echo ""
echo "💡 First binary to complete will replace Anvil!"
echo ""
echo "To check detailed progress:"
echo "  - OmniNode: tail -f ~/code/pba-hackathon/polkadot-sdk/target/release/build/*.log"
echo "  - Pop CLI: Check passethub-native/target/release/build/"
echo "  - Frontier: tail -f /tmp/frontier/target/release/build/*.log"