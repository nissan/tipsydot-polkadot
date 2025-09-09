# PAPI Integration in TipsyDot 🔗

## Overview

TipsyDot leverages **PAPI (Polkadot API)** - the next-generation TypeScript library for interacting with Substrate-based blockchains. PAPI provides type-safe, modern developer experience for cross-chain operations.

## Why PAPI?

### Traditional @polkadot/api Challenges:
- Complex API with steep learning curve
- Runtime type safety issues
- Manual metadata decoding
- Verbose syntax for common operations

### PAPI Solutions:
- ✅ **Type-safe by default** - Auto-generated types from chain metadata
- ✅ **Multi-chain support** - Connect to multiple chains simultaneously
- ✅ **Modern DX** - Intuitive API design with TypeScript-first approach
- ✅ **Automatic codec generation** - No manual type definitions needed
- ✅ **Lightweight** - Smaller bundle size than @polkadot/api

## PAPI Setup in TipsyDot

### 1. Chain Configuration (`.papi/polkadot-api.json`)

```json
{
  "entries": {
    "paseo": {
      "chain": "paseo",
      "metadata": ".papi/metadata/paseo.scale",
      "genesis": "0x77afd6190f1554ad45fd0d31aee62aacc33c6db0ea801129acb813f913e0764f"
    },
    "paseo_asset_hub": {
      "chain": "paseo_asset_hub",
      "metadata": ".papi/metadata/paseo_asset_hub.scale"
    },
    "polkadot": {
      "chain": "polkadot",
      "metadata": ".papi/metadata/polkadot.scale"
    },
    "polkadot_asset_hub": {
      "chain": "polkadot_asset_hub",
      "metadata": ".papi/metadata/polkadot_asset_hub.scale"
    }
  }
}
```

### 2. Type Generation

PAPI automatically generates TypeScript types from chain metadata:

```typescript
// Auto-generated types in .papi/descriptors/
import { paseo } from '@polkadot-api/descriptors';
import { paseo_asset_hub } from '@polkadot-api/descriptors';
```

## Key PAPI Features Used in TipsyDot

### 1. Multi-Chain Connections

```typescript
import { createClient } from 'polkadot-api';
import { getWsProvider } from 'polkadot-api/ws-provider/web';

// Connect to multiple chains
const paseoClient = createClient(
  getWsProvider('wss://paseo-rpc.dwellir.com')
);

const assetHubClient = createClient(
  getWsProvider('wss://paseo-asset-hub-rpc.dwellir.com')
);
```

### 2. Type-Safe Queries

```typescript
// Query asset metadata with full type safety
const asset = await assetHubClient.query.Assets.Asset.getValue(
  31337 // USDC Asset ID
);

// TypeScript knows the exact shape of 'asset'
console.log(asset.supply); // bigint
console.log(asset.minBalance); // bigint
console.log(asset.accounts); // number
```

### 3. XCM Message Tracking

```typescript
// Monitor XCM messages across chains
const xcmEvents = await paseoClient.query.XcmPallet.VersionedXcm.getEntries();

xcmEvents.forEach(([key, message]) => {
  // Fully typed XCM message structure
  const decoded = message.value;
  console.log(decoded.V4?.instructions);
});
```

### 4. Asset Registry Monitoring

```typescript
// Track our custom assets
const CUSTOM_ASSETS = {
  USDC: 31337,
  USDP: 42069,
  TIPCARD_NFT: 69420
};

// Get real-time asset data
for (const [name, id] of Object.entries(CUSTOM_ASSETS)) {
  const metadata = await assetHubClient.query.Assets.Metadata.getValue(id);
  console.log(`${name}: ${metadata.symbol} - ${metadata.decimals} decimals`);
}
```

### 5. Event Streaming

```typescript
// Subscribe to transfer events
assetHubClient.event.Assets.Transferred.subscribe((event) => {
  console.log(`Transfer: ${event.amount} from ${event.from} to ${event.to}`);
  
  // Update activity tracker
  activityTracker.trackTransfer({
    from: event.from,
    to: event.to,
    amount: event.amount,
    assetId: event.assetId
  });
});
```

## PAPI Insights Component

The TipsyDot UI includes a dedicated **PAPI Insights** tab that showcases:

### Chain Status
- Real-time block numbers across Paseo, AssetHub, and PassetHub
- Finalization status
- Network health indicators

### XCM Message Tracking
- Decoded XCM instructions
- Origin and destination chains
- Weight and fee calculations
- Execution status

### Asset Registry
- USDC (31337) - Bridged from AssetHub
- USDP (42069) - Our custom stablecoin
- TipCard NFTs (69420) - Dynamic reward NFTs
- Real-time supply, holder count, and transfer metrics

## Integration Benefits

### 1. **Type Safety**
- No runtime type errors
- Auto-completion in IDEs
- Compile-time validation

### 2. **Developer Experience**
- Intuitive API design
- Less boilerplate code
- Better error messages

### 3. **Performance**
- Smaller bundle size
- Efficient codec handling
- Optimized WebSocket connections

### 4. **Maintenance**
- Auto-generated types stay in sync with chain upgrades
- No manual type definitions to maintain
- Consistent API across all chains

## Usage in TipsyDot Codebase

### Components Using PAPI:

1. **`src/components/PapiInsights.tsx`**
   - Displays real-time chain data
   - Shows XCM message tracking
   - Monitors asset statistics

2. **`src/lib/api.ts`** (Future Integration)
   - Chain connection management
   - Query wrappers with type safety

3. **`src/lib/activityTracker.ts`** (Future Integration)
   - Real-time event monitoring
   - Transaction status updates

## Future PAPI Enhancements

1. **Light Client Support**
   - Connect directly via light client
   - No RPC dependency
   - Better decentralization

2. **Advanced XCM Tracking**
   - Full message journey visualization
   - Cross-chain transaction tracing
   - Fee estimation

3. **Custom Pallet Integration**
   - Direct interaction with TipsyDot pallets
   - Type-safe extrinsic construction

## Resources

- [PAPI Documentation](https://papi.how/)
- [PAPI GitHub](https://github.com/polkadot-api/polkadot-api)
- [Migration Guide from @polkadot/api](https://papi.how/migration)
- [Type Generation](https://papi.how/codegen)

## Quick Start for Developers

```bash
# Install PAPI
pnpm add polkadot-api

# Generate types from chain metadata
pnpm papi generate

# Update metadata
pnpm papi update paseo

# Add new chain
pnpm papi add kusama --config polkadot-api.json
```

## Conclusion

PAPI represents the future of Polkadot development, providing a modern, type-safe, and developer-friendly way to interact with Substrate chains. TipsyDot's integration demonstrates how PAPI can be used to build production-ready cross-chain applications with confidence.