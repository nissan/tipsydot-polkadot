#!/bin/bash

# Start frontend in development mode connected to Paseo & PassetHub

echo "🚀 Starting TipsyDot Frontend (Dev Mode - Paseo)"
echo "================================================"
echo ""
echo "This will connect to:"
echo "  - Paseo AssetHub (Real Network)"
echo "  - PassetHub (Paseo Parachain)"
echo ""

# Copy production environment for development
cp .env.production .env.local

echo "📋 Configuration:"
cat .env.local | grep -E "ASSETHUB_WS|PASSETHUB" | head -5
echo ""

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    pnpm install
fi

echo "🔧 Starting development server with hot reload..."
echo "   Access at: http://localhost:3000"
echo ""
echo "✅ Connected to REAL Paseo networks!"
echo "   - Using real USDC (Asset ID 1337)"
echo "   - Using real PassetHub EVM"
echo ""
echo "⚠️  Note: Transactions will use real testnet tokens!"
echo ""

# Start development server
pnpm dev