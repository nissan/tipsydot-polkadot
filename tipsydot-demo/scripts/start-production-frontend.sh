#!/bin/bash

# Start frontend connected to Paseo & PassetHub (production)

echo "🚀 Starting TipsyDot Frontend (Production Mode)"
echo "=============================================="
echo ""
echo "This will connect to:"
echo "  - Paseo AssetHub (Real Network)"
echo "  - PassetHub (Paseo Parachain)"
echo ""

# Copy production environment
cp .env.production .env.local

echo "📋 Configuration loaded from .env.production:"
echo "  - AssetHub: $(grep NEXT_PUBLIC_ASSETHUB_WS .env.production | cut -d'=' -f2)"
echo "  - PassetHub: $(grep NEXT_PUBLIC_PASSETHUB_WS .env.production | cut -d'=' -f2)"
echo ""

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    pnpm install
fi

echo "🔧 Building for production..."
pnpm build

if [ $? -ne 0 ]; then
    echo "❌ Build failed. Please fix the errors above."
    exit 1
fi

# Kill any existing process on port 3000
echo "Clearing port 3000..."
lsof -ti:3000 | xargs kill -9 2>/dev/null

echo ""
echo "🌐 Starting production server..."
echo "   Access at: http://localhost:3000"
echo ""
echo "✅ Connected to REAL Paseo networks!"
echo "   - Real USDC on Paseo AssetHub"
echo "   - Real PassetHub EVM"
echo ""

# Start production server on port 3001 if 3000 is still in use
PORT=3000 pnpm start || PORT=3001 pnpm start