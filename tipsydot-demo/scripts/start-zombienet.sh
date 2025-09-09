#!/bin/bash

# Start Zombienet with OmniNode and Chopsticks
# For PBA Cohort 7 - Real XCM Demo

set -e

echo "🧟 Starting Zombienet for XCM testing..."

# Check if zombienet is installed
if ! command -v zombienet &> /dev/null; then
    echo "📦 Installing Zombienet..."
    npm install -g @zombienet/cli
fi

# Check if OmniNode exists
if [ ! -f "./bin/polkadot-omni-node" ]; then
    echo "❌ OmniNode not found. Please run ./scripts/build-omninode.sh first"
    exit 1
fi

# Create specs directory if it doesn't exist
mkdir -p specs

# Generate chain spec for OmniNode with Revive
echo "🔧 Generating chain spec for OmniNode..."
./bin/polkadot-omni-node build-spec \
    --chain dev \
    --para-id 2000 \
    --relay-chain rococo-local \
    --runtime ./runtimes/revive-runtime.wasm \
    > specs/revive-local-plain.json 2>/dev/null || true

# Convert to raw spec
./bin/polkadot-omni-node build-spec \
    --chain specs/revive-local-plain.json \
    --raw \
    > specs/revive-local.json 2>/dev/null || true

# Start Zombienet
echo "🚀 Starting Zombienet network..."
zombienet spawn zombienet.toml

echo "✅ Zombienet started successfully!"
echo "📍 Relay chain: ws://localhost:9944"
echo "📍 OmniNode (Para 2000): ws://localhost:9945"
echo "📍 AssetHub Fork (Para 1000): ws://localhost:8000"