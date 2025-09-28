# 🌐 TipsyDot Frontend Connection Guide

## Current Status
The frontend is running at: **http://localhost:3000**

## Connection Options

### 1. 🏠 Local Development (Currently Active)
Using your local Chopsticks fork and Anvil:
```bash
# Uses .env.local-chopsticks
cp .env.local-chopsticks .env.local
pnpm dev
```
- **AssetHub**: ws://127.0.0.1:8000 (Chopsticks fork)
- **EVM**: http://127.0.0.1:8545 (Anvil or native when ready)
- **Status**: ✅ Working

### 2. 🌍 Paseo Testnet (Production)
Connect to real Paseo network:
```bash
# Uses .env.production
./scripts/start-dev-with-paseo.sh
```

#### Official Paseo RPC Endpoints:
**AssetHub Paseo:**
- Primary: `wss://asset-hub-paseo-rpc.dwellir.com` (Dwellir)
- Alternative 1: `wss://sys.ibp.network/asset-hub-paseo` (IBP)
- Alternative 2: `wss://rpc-asset-hub-paseo.luckyfriday.io` (LuckyFriday)

**Paseo Relay Chain:**
- `wss://paseo.rpc.amforc.com` (Amforc)
- `wss://paseo-rpc.dwellir.com` (Dwellir)
- `wss://rpc.ibp.network/paseo` (IBP)
- `wss://paseo.dotters.network` (Dotters)

### 3. 🔗 EVM Chains (chainlist.org)
For EVM-compatible chains on Paseo:

**PassetHub (if available):**
- Check chainlist.org for Chain ID 4493
- Tanssi Network: `wss://fraa-flashbox-4493-rpc.a.stagenet.tanssi.network`

**Alternative EVM Options:**
- Moonbase Alpha (Moonbeam testnet)
- Astar Shibuya (Astar testnet)
- Check chainlist.org for latest endpoints

## Troubleshooting

### WebSocket Connection Issues
If you see "disconnected from wss://..." errors:

1. **Try alternative endpoints** (listed above)
2. **Use local development** (most reliable)
3. **Check network status**:
   - Paseo Status: https://paseo.subscan.io/
   - AssetHub Status: https://assethub-paseo.subscan.io/

### Common Fixes

#### Fix 1: Update endpoint in .env.local
```bash
# Edit .env.local or .env.production
NEXT_PUBLIC_ASSETHUB_WS=wss://sys.ibp.network/asset-hub-paseo
```

#### Fix 2: Restart with fresh config
```bash
rm .env.local
cp .env.local-chopsticks .env.local
pnpm dev
```

#### Fix 3: Clear Next.js cache
```bash
rm -rf .next
pnpm dev
```

## Resources

- **Paseo Faucet**: https://faucet.polkadot.io/paseo
- **Polkadot Networks**: https://docs.polkadot.com/develop/networks/
- **Chainlist.org**: https://chainlist.org/
- **Dwellir RPC List**: https://www.dwellir.com/public-rpc-endpoints
- **Paseo Support**: Matrix channel #paseo-announcements:matrix.org

## Best Practice

For demo purposes, **use local development** (.env.local-chopsticks) as it:
- ✅ Works reliably without external dependencies
- ✅ Has pre-funded accounts
- ✅ Supports instant transactions
- ✅ No rate limiting

For production testing, use Paseo testnet with proper error handling and fallback endpoints.