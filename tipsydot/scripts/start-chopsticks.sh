#!/bin/bash

echo "🥢 Starting Chopsticks fork of Paseo AssetHub..."
echo "============================================="
echo ""
echo "This will fork Paseo AssetHub locally with:"
echo "  - Real USDC assets (Asset ID: 1337)"
echo "  - Pre-funded test accounts (Alice & Bob)"
echo "  - Sudo access for minting/testing"
echo ""
echo "Endpoints:"
echo "  - WebSocket: ws://127.0.0.1:8000"
echo "  - Polkadot.js Apps: https://polkadot.js.org/apps/?rpc=ws://127.0.0.1:8000"
echo ""
echo "Press Ctrl+C to stop the fork"
echo "============================================="
echo ""

# Use the Paseo AssetHub config from Chopsticks repo
npx @acala-network/chopsticks \
  --config=https://raw.githubusercontent.com/AcalaNetwork/chopsticks/master/configs/paseo-asset-hub.yml \
  --port=8000