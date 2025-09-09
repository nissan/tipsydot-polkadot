# TipsyDot Demo - Architecture Clarifications

## Key Architectural Decisions

### 1. USDC on Forked AssetHub

**You're absolutely right!** When we fork AssetHub with Chopsticks, we get:

- Real USDC with Asset ID 1337 (Paseo) or 1984 (Polkadot)
- Existing balances and state
- Actual asset pallet functionality

This means:

- ✅ We DON'T need MockUSDC on the Substrate side
- ✅ We can use the real USDC precompile at `0x0800000000000000000000000000000000000539`
- ✅ Alice, Bob, Charlie can be funded with real USDC via sudo mint

### 2. EVM Chain Options

You raise an excellent point about using Revive/EVM pallet instead of Anvil:

**Option A: Anvil (Current - Simple Demo)**

```
Pros:
- Quick to start
- Familiar to Ethereum devs
- Simple configuration

Cons:
- Not actually bridging to Substrate
- Missing XCM integration
- Less realistic demo
```

**Option B: Omninode with Revive Pallet (Better)**

```
Pros:
- Real Substrate → Substrate communication
- Actual XCM messages
- Production-like architecture
- Shows Revive pallet capabilities

Cons:
- More complex setup
- Requires compiling/configuring omninode
```

**Option C: Fork Moonbeam/Astar (Most Realistic)**

```
Pros:
- Real production EVM on Substrate
- Existing XCM channels
- Most realistic demo

Cons:
- Heavier resource usage
- More complex configuration
```

### 3. Recommended Architecture for Full Demo

```
┌────────────────────┐         ┌────────────────────┐
│  Chopsticks Fork   │         │   Omninode/Revive  │
│   AssetHub (8000)  │◄────────│     EVM (8545)     │
│                    │   XCM    │                    │
│  Real USDC (1337)  │         │  Revive Pallet     │
└────────────────────┘         └────────────────────┘
         ▲                              ▲
         │ PAPI                         │ Wagmi/Viem
         │                              │
         └──────────┬───────────────────┘
                    │
             ┌──────────────┐
             │   Next.js    │
             │   Frontend   │
             └──────────────┘
```

### 4. Para ID Lookup Feature

Great idea! We can:

1. Accept para ID input
2. Query chain registry or runtime
3. Display parachain info on success screen
4. Show Subscan/explorer links

### 5. Actual Flow with Real USDC

```javascript
// 1. On AssetHub (via Chopsticks)
// Real USDC exists at asset ID 1337
const usdcBalance = await api.query.assets.account(1337, address);

// 2. On EVM chain (Revive)
// USDC would be bridged via XCM precompile
const USDC_PRECOMPILE = "0x0800000000000000000000000000000000000539";

// 3. XCM Reserve Transfer (not teleport!)
const xcmMessage = {
  V3: {
    parents: 1,
    interior: {
      X2: [
        { Parachain: 1000 }, // AssetHub
        { AccountId32: { id: substrateAddress } },
      ],
    },
  },
};
```

## Updated Setup Instructions

### For Realistic Demo with Revive

1. **Start Chopsticks AssetHub Fork**

```bash
pnpm chain:chopsticks
```

2. **Start Omninode with Revive**

```bash
# Download and compile omninode
git clone https://github.com/paritytech/polkadot-sdk
cd polkadot-sdk
cargo build --release -p polkadot-omni-node

# Start with Revive runtime
./target/release/polkadot-omni-node \
  --chain=asset-hub-paseo \
  --enable-evm-rpc \
  --rpc-port=8545
```

3. **Configure XCM Channels**

```javascript
// In contracts, use XCM precompiles
const XCM_UTILS = "0x0000000000000000000000000000000000000803";
```

### For Quick Demo (Current Anvil Setup)

The current setup works for demonstrating:

- UI/UX flow
- Wallet connections
- PAPI monitoring
- Transaction flow

But note that it's not actually bridging assets between chains.

## Environment Variables for Different Scenarios

### Local Development (Anvil)

```env
NEXT_PUBLIC_DEMO_MODE=simple
NEXT_PUBLIC_EVM_TYPE=anvil
```

### Local Development (Revive)

```env
NEXT_PUBLIC_DEMO_MODE=realistic
NEXT_PUBLIC_EVM_TYPE=revive
NEXT_PUBLIC_XCM_ENABLED=true
```

### Testnet (Paseo)

```env
NEXT_PUBLIC_DEMO_MODE=testnet
NEXT_PUBLIC_ASSETHUB_WS=wss://paseo-asset-hub-rpc.dwellir.com
NEXT_PUBLIC_EVM_RPC=wss://moonriver-alpha.api.onfinality.io/public-ws
```

## Conclusion

For the hackathon demo:

1. **Quick Demo**: Use current Anvil setup (works, simple, fast)
2. **Impressive Demo**: Add Revive/Omninode for real XCM
3. **Production Demo**: Fork actual Moonbeam/Astar

The current implementation is ready for option 1, and can be upgraded to option 2 with the omninode setup.
