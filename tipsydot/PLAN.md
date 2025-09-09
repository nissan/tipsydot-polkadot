# 🎯 PLAN: Simplified USDC Cross-Chain Transfer Demo

## Vision
Build a minimal, polished demo that showcases transferring **real AssetHub USDC** from an EVM wallet (MetaMask) to Substrate accounts, with live on-chain transaction monitoring via PAPI.

**Core Demo**: One button → "Donate USDC to a Parachain Builder" → Select recipient → Send → Watch it happen on-chain

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (Next.js)                       │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Landing Page with "Donate USDC" Button             │   │
│  │  → MetaMask Connect (Anvil wallet)                  │   │
│  │  → Recipient Dropdown (Parachain builders)          │   │
│  │  → Send Transaction                                 │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  PAPI Transaction Monitor (Live Updates)            │   │
│  │  → Shows XCM messages                               │   │
│  │  → Displays balance changes                         │   │
│  │  → Tracks cross-chain execution                     │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┴─────────────────────┐
        │                                           │
    ┌───▼────┐                           ┌─────────▼────────┐
    │  Anvil │                           │   Chopsticks     │
    │  Local │                           │  AssetHub Fork   │
    │   EVM  │◄──────XCM Bridge─────────►│   (Real USDC)    │
    └────────┘                           └──────────────────┘
```

---

## 📋 Implementation Steps

### Phase 1: Infrastructure Setup (Day 1 Morning)

#### 1.1 Create Fresh Next.js Project
```bash
# Use dillion template as base
cp -r dillionverma-startup-template new-tipsydot
cd new-tipsydot
pnpm install

# Add our dependencies
pnpm add wagmi viem @tanstack/react-query
pnpm add @polkadot/api @polkadot/keyring
pnpm add polkadot-api @polkadot-api/ws-provider
pnpm add -D @acala-network/chopsticks
```

#### 1.2 Setup Local Networks
```bash
# Terminal 1: Chopsticks AssetHub Fork
npx @acala-network/chopsticks \
  --config=https://raw.githubusercontent.com/AcalaNetwork/chopsticks/master/configs/paseo-asset-hub.yml \
  --port=8000

# Terminal 2: Anvil EVM Chain
anvil --port 8545 --chain-id 420420421

# Terminal 3: Omninode (optional for custom parachain)
omninode --dev --rpc-port 9944
```

#### 1.3 Configure PAPI
```typescript
// papi.config.ts
export const chains = {
  assetHub: {
    ws: 'ws://127.0.0.1:8000',
    descriptors: 'paseo-asset-hub'
  },
  anvil: {
    http: 'http://localhost:8545',
    chainId: 420420421
  }
};
```

---

### Phase 2: Smart Contract Layer (Day 1 Afternoon)

#### 2.1 Minimal Bridge Contract
```solidity
// contracts/SimpleUSDCBridge.sol
contract SimpleUSDCBridge {
    address constant USDC_PRECOMPILE = 0x0800...; // AssetHub USDC
    
    event USDCBridged(
        address indexed from,
        bytes32 indexed substrate_dest,
        uint256 amount
    );
    
    function bridgeToSubstrate(
        bytes32 substrateAddress,
        uint256 amount
    ) external {
        // Transfer USDC from user
        IERC20(USDC_PRECOMPILE).transferFrom(
            msg.sender, 
            address(this), 
            amount
        );
        
        // Trigger XCM to AssetHub
        _initiateXCMTransfer(substrateAddress, amount);
        
        emit USDCBridged(msg.sender, substrateAddress, amount);
    }
}
```

#### 2.2 Deploy Script
```javascript
// scripts/deploy-bridge.js
const bridge = await deploy("SimpleUSDCBridge");
console.log("Bridge deployed to:", bridge.address);

// Pre-approve USDC for test wallets
for (const wallet of ANVIL_WALLETS) {
    await usdc.connect(wallet).approve(bridge.address, MAX_UINT256);
}
```

---

### Phase 3: Frontend Components (Day 2 Morning)

#### 3.1 Core Components to Build

```typescript
// components/DonateButton.tsx
- Large, prominent CTA button
- Triggers wallet connection flow
- Shows loading/success states

// components/RecipientSelector.tsx
- Dropdown with parachain builder profiles
- Shows name, project, substrate address
- Pre-populated with test data

// components/TransactionFlow.tsx
- Step 1: Connect MetaMask
- Step 2: Select recipient
- Step 3: Enter amount (or use preset: 10, 50, 100 USDC)
- Step 4: Confirm and send

// components/PapiMonitor.tsx
- Real-time transaction feed
- Shows XCM messages decoded
- Balance updates on both chains
- Block numbers and finalization
```

#### 3.2 Pre-configured Recipients
```typescript
const PARACHAIN_BUILDERS = [
  {
    name: "Alice - Moonbeam",
    project: "EVM Smart Contracts",
    address: "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
    description: "Building DeFi on Moonbeam"
  },
  {
    name: "Bob - Astar", 
    project: "WASM & EVM",
    address: "5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty",
    description: "Multi-VM blockchain"
  },
  {
    name: "Charlie - Acala",
    project: "DeFi Hub",
    address: "5FLSigC9HGRKVhB9FiEo4Y3koPsNmBmLJbpXg2mp1hXcS59Y",
    description: "Decentralized finance platform"
  }
];
```

---

### Phase 4: PAPI Integration (Day 2 Afternoon)

#### 4.1 Chain Connections
```typescript
// lib/papi-client.ts
import { createClient } from 'polkadot-api';
import { getWsProvider } from 'polkadot-api/ws-provider/web';

export const assetHubClient = createClient(
  getWsProvider('ws://127.0.0.1:8000')
);

// Monitor USDC transfers
export function watchUSDCTransfers(callback: (event: any) => void) {
  return assetHubClient.event.Assets.Transferred.subscribe((event) => {
    if (event.assetId === 1337) { // USDC
      callback({
        from: event.from,
        to: event.to,
        amount: event.amount,
        blockNumber: event.blockNumber
      });
    }
  });
}
```

#### 4.2 Transaction Monitor Component
```typescript
// components/PapiMonitor.tsx
export function PapiMonitor() {
  const [events, setEvents] = useState<TransferEvent[]>([]);
  const [blockNumber, setBlockNumber] = useState(0);
  
  useEffect(() => {
    // Subscribe to new blocks
    const blockSub = assetHubClient.chainHead.subscribe((head) => {
      setBlockNumber(head.number);
    });
    
    // Subscribe to USDC transfers
    const transferSub = watchUSDCTransfers((event) => {
      setEvents(prev => [event, ...prev].slice(0, 10));
    });
    
    return () => {
      blockSub.unsubscribe();
      transferSub.unsubscribe();
    };
  }, []);
  
  return (
    <div className="bg-black text-green-400 font-mono p-4 rounded-lg">
      <div className="mb-2">Block: #{blockNumber}</div>
      <div className="space-y-1">
        {events.map((e, i) => (
          <div key={i} className="text-xs">
            [{e.blockNumber}] {e.from.slice(0,8)}...→{e.to.slice(0,8)}... 
            Amount: {e.amount} USDC
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

### Phase 5: Testing & Polish (Day 3)

#### 5.1 Test Data Setup
```bash
# scripts/setup-test-data.sh
#!/bin/bash

echo "Setting up test environment..."

# 1. Mint USDC to Anvil wallets on AssetHub
node scripts/mint-usdc-chopsticks.js

# 2. Deploy bridge contract
forge script scripts/Deploy.s.sol --rpc-url http://localhost:8545

# 3. Pre-approve USDC spending
node scripts/approve-all.js

echo "✅ Test environment ready!"
echo "   - Anvil wallet 0: 10,000 USDC"
echo "   - Anvil wallet 1: 10,000 USDC"
echo "   - Bridge deployed and approved"
```

#### 5.2 Demo Flow Script
```markdown
## 2-Minute Demo Script

1. **Open app** - Clean landing page with single CTA
2. **Click "Donate USDC"** - Smooth modal transition
3. **Connect MetaMask** - Pre-configured Anvil wallet
4. **Select "Alice - Moonbeam"** - Dropdown with builder info
5. **Enter 100 USDC** - Or click preset amount
6. **Click Send** - MetaMask popup
7. **Watch PAPI Monitor** - See real-time:
   - XCM message sent
   - AssetHub balance update
   - Block confirmations
8. **Success!** - Confetti animation + receipt

Total time: ~90 seconds
```

---

## 🎨 UI/UX Guidelines

### Design Principles
1. **Single Purpose**: One clear action - donate USDC
2. **Minimal Steps**: Max 4 clicks to complete
3. **Visual Feedback**: Every action has immediate response
4. **Technical Transparency**: Show what's happening on-chain

### Component Library
- Use `shadcn/ui` from dillion template
- Consistent with modern Web3 apps
- Dark mode by default
- Red/white/black color scheme

### Key Screens
```
Landing → Connect Wallet → Select Recipient → Confirm → Success
          ↓                ↓                  ↓          ↓
      [PAPI Monitor showing real-time blockchain activity]
```

---

## 📁 Project Structure

```
new-tipsydot/
├── app/
│   ├── page.tsx                 # Landing page
│   └── api/
│       └── papi/                # PAPI endpoints
├── components/
│   ├── DonateButton.tsx         # Main CTA
│   ├── RecipientSelector.tsx    # Builder dropdown
│   ├── TransactionFlow.tsx      # Step-by-step flow
│   ├── PapiMonitor.tsx          # Live blockchain feed
│   └── ui/                      # shadcn components
├── contracts/
│   └── SimpleUSDCBridge.sol     # Minimal bridge
├── lib/
│   ├── wagmi.ts                 # EVM config
│   ├── papi-client.ts           # Substrate config
│   └── constants.ts             # Addresses, recipients
├── scripts/
│   ├── start-chopsticks.sh      # Fork AssetHub
│   ├── deploy-bridge.js         # Deploy contracts
│   └── setup-test-data.js       # Mint & approve
└── .env.local
    NEXT_PUBLIC_BRIDGE_ADDRESS=0x...
    NEXT_PUBLIC_USDC_ASSET_ID=1337
```

---

## 🚀 Quick Start Commands

```bash
# Setup everything
make setup

# Start all services
make dev

# Run demo
make demo

# Clean reset
make clean
```

### Makefile
```makefile
setup:
	pnpm install
	forge build

dev:
	./scripts/start-chopsticks.sh &
	anvil --port 8545 &
	pnpm dev

demo:
	./scripts/setup-test-data.sh
	open http://localhost:3000

clean:
	pkill chopsticks
	pkill anvil
	rm -rf .chopsticks-db
```

---

## ✅ Success Criteria

1. **Works in 2 minutes**: Complete donation flow
2. **Real USDC**: Using forked AssetHub assets
3. **Live monitoring**: PAPI shows actual blockchain state
4. **Professional UI**: Polished, production-ready look
5. **Zero errors**: No console errors, smooth UX
6. **Clear value prop**: Obviously demonstrates cross-chain capability

---

## 🎯 Key Differentiators

1. **Actual AssetHub USDC** - Not mocked, real asset from fork
2. **Live blockchain viewing** - PAPI shows it's really happening
3. **Production UI** - Looks like a real app, not a hackathon project
4. **Single purpose** - Does one thing perfectly
5. **Technical depth** - Simple UI, sophisticated backend

---

## 📅 Timeline

**Day 1**:
- Morning: Setup infrastructure
- Afternoon: Deploy contracts

**Day 2**:
- Morning: Build UI components
- Afternoon: Integrate PAPI

**Day 3**:
- Morning: Testing & polish
- Afternoon: Demo preparation

**Total**: 3 days to production-ready demo

---

## 🔗 Resources

- [Chopsticks Docs](https://github.com/AcalaNetwork/chopsticks)
- [PAPI Docs](https://papi.how)
- [Wagmi Docs](https://wagmi.sh)
- [shadcn/ui](https://ui.shadcn.com)
- [AssetHub USDC Info](https://assethub-paseo.subscan.io/asset/1337)

---

## 💡 Lessons Applied

From our TipsyDot experience:
1. **Chopsticks > Mocking** - Real chain state is better
2. **PAPI > Legacy API** - Type safety and modern DX
3. **Simple > Complex** - One feature done perfectly
4. **Show the blockchain** - Make on-chain visible
5. **Polish matters** - UI quality affects perception

This plan leverages everything we learned to build a focused, impressive demo that clearly showcases cross-chain USDC transfers with professional polish.