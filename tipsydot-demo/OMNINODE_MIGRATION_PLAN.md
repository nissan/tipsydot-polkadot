# Migration Plan: Anvil → OmniNode with Revive Pallet

## Overview

Replace Anvil (pure Ethereum chain) with OmniNode running Revive pallet for authentic Substrate-based EVM execution.

## Revive vs EVM Pallet Clarification

### Revive Pallet (Recommended for Demo)

- **Purpose**: PolkaVM-based smart contract execution
- **Language**: Supports Solidity via revive compiler
- **Benefits**:
  - More efficient than EVM pallet
  - Better Substrate integration
  - Future-proof (PolkaVM is Polkadot's direction)
  - Synchronous XCM execution
- **Use When**: Building new EVM-compatible chains on Polkadot

### EVM Pallet (Legacy)

- **Purpose**: Direct EVM bytecode execution
- **Benefits**:
  - 100% Ethereum compatibility
  - No recompilation needed
  - Used by Moonbeam, Astar
- **Use When**: Need exact Ethereum behavior or migrating existing dApps

**For TipsyDot Demo**: Revive is better as it showcases Polkadot's latest tech.

## Implementation Plan

### Phase 1: Setup OmniNode with Revive (Week 1)

#### 1.1 Build OmniNode

```bash
# Clone polkadot-sdk
git clone https://github.com/paritytech/polkadot-sdk
cd polkadot-sdk

# Build omninode with revive support
cargo build --release -p polkadot-omni-node --features revive

# Or use pre-built binary
wget https://github.com/paritytech/polkadot-sdk/releases/download/polkadot-omni-node-v1.0.0/polkadot-omni-node
```

#### 1.2 Create Revive Chain Spec

```json
// revive-chain-spec.json
{
  "name": "TipsyDot EVM",
  "id": "tipsydot-evm",
  "chainType": "Local",
  "properties": {
    "tokenDecimals": 18,
    "tokenSymbol": "TDOT"
  },
  "runtime": {
    "revive": {
      "gasPrice": 1000000000,
      "existentialDeposit": 1
    },
    "balances": {
      "balances": [
        ["0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266", 10000000000000000000000],
        ["0x70997970C51812dc3A010C7d01b50e0d17dc79C8", 10000000000000000000000],
        ["0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC", 10000000000000000000000]
      ]
    }
  }
}
```

#### 1.3 Update Start Script

```bash
#!/bin/bash
# scripts/start-omninode.sh

echo "🚀 Starting OmniNode with Revive..."

# Start OmniNode
./polkadot-omni-node \
  --chain ./revive-chain-spec.json \
  --dev \
  --rpc-port 9944 \
  --rpc-external \
  --rpc-cors all \
  --rpc-methods unsafe \
  --enable-eth-rpc \
  --eth-rpc-port 8545 \
  --sealing instant \
  --tmp

echo "✅ OmniNode running with:"
echo "   Substrate RPC: ws://localhost:9944"
echo "   Ethereum RPC: http://localhost:8545"
```

### Phase 2: Update Smart Contracts (Week 1)

#### 2.1 Install Revive Compiler

```bash
# Install revive solidity compiler
cargo install revive-solc

# Or use Docker
docker pull ghcr.io/paritytech/revive:latest
```

#### 2.2 Compile Contracts for Revive

```bash
# Compile Solidity to PolkaVM bytecode
revive-solc \
  --input contracts/USDCDonation.sol \
  --output artifacts/revive \
  --target polkavm
```

#### 2.3 Update Deployment Script

```javascript
// scripts/deploy-revive.js
const { ApiPromise, WsProvider } = require("@polkadot/api");
const { Keyring } = require("@polkadot/keyring");

async function deployToRevive() {
  // Connect to OmniNode
  const api = await ApiPromise.create({
    provider: new WsProvider("ws://localhost:9944"),
  });

  // Deploy via revive pallet
  const code = fs.readFileSync("./artifacts/revive/USDCDonation.pvm");

  const tx = api.tx.revive.instantiate(
    0, // value
    gasLimit,
    null, // storage deposit
    code,
    constructorArgs,
  );

  // Sign and send
  await tx.signAndSend(alice);
}
```

### Phase 3: Update Frontend Integration (Week 2)

#### 3.1 Update Wagmi Config

```typescript
// lib/wagmi-config.ts
import { defineChain } from "viem";

export const omnichainEVM = defineChain({
  id: 42069, // Custom chain ID
  name: "OmniNode EVM",
  nativeCurrency: {
    name: "TipsyDot",
    symbol: "TDOT",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ["http://localhost:8545"],
      webSocket: ["ws://localhost:8545"],
    },
    substrate: {
      http: ["ws://localhost:9944"], // Also connect to Substrate RPC
    },
  },
});
```

#### 3.2 Add XCM Integration

```typescript
// lib/xcm-bridge.ts
export async function bridgeUSDCToSubstrate(
  amount: bigint,
  destinationParaId: number,
  destinationAddress: string,
) {
  // Use XCM precompiles on Revive
  const XCM_TRANSACTOR = "0x0000000000000000000000000000000000000806";

  const xcmMessage = {
    dest: {
      parents: 1,
      interior: {
        X2: [
          { Parachain: destinationParaId },
          { AccountId32: { id: destinationAddress } },
        ],
      },
    },
    assets: {
      V3: [
        {
          id: {
            Concrete: { parents: 0, interior: { X1: { PalletInstance: 50 } } },
          },
          fun: { Fungible: amount },
        },
      ],
    },
  };

  // Execute via precompile
  return await contract.write.xcmTransact([xcmMessage]);
}
```

### Phase 4: Implement XCM Channels (Week 2)

#### 4.1 Configure HRMP Channels

```javascript
// scripts/setup-xcm-channels.js
async function setupXCMChannels() {
  // Open channel from OmniNode to AssetHub
  await api.tx.sudo
    .sudo(
      api.tx.hrmp.forceOpenHrmpChannel(
        2000, // OmniNode Para ID
        1000, // AssetHub Para ID
        10, // Max capacity
        1024, // Max message size
      ),
    )
    .signAndSend(alice);
}
```

#### 4.2 Register Assets

```javascript
// Register USDC on OmniNode
await api.tx.assetRegistry.registerAsset({
  location: {
    parents: 1,
    interior: {
      X3: [
        { Parachain: 1000 },
        { PalletInstance: 50 },
        { GeneralIndex: 1337 }, // USDC Asset ID
      ],
    },
  },
  metadata: {
    name: "USD Coin",
    symbol: "USDC",
    decimals: 6,
  },
});
```

### Phase 5: Testing & Polish (Week 3)

#### 5.1 Update Test Suite

```javascript
// test/revive-integration.test.js
describe("Revive Integration", () => {
  it("should deploy contract to Revive", async () => {
    // Test contract deployment
  });

  it("should bridge USDC via XCM", async () => {
    // Test actual XCM transfer
  });

  it("should emit events correctly", async () => {
    // Test event monitoring
  });
});
```

#### 5.2 Update Package.json Scripts

```json
{
  "scripts": {
    "chain:omninode": "./scripts/start-omninode.sh",
    "chain:chopsticks": "npx @acala-network/chopsticks --config=chopsticks.yml",
    "compile:revive": "revive-solc --input contracts --output artifacts/revive",
    "deploy:revive": "node scripts/deploy-revive.js",
    "demo:setup:revive": "pnpm chain:omninode && pnpm chain:chopsticks && pnpm compile:revive && pnpm deploy:revive",
    "demo:clean:revive": "rm -rf /tmp/omninode-* && pnpm demo:clean"
  }
}
```

## Migration Timeline

| Week | Phase     | Tasks                                             | Status         |
| ---- | --------- | ------------------------------------------------- | -------------- |
| 1    | Setup     | Build OmniNode, Create chain spec, Update scripts | 🔴 Not Started |
| 1    | Contracts | Install Revive compiler, Compile contracts        | 🔴 Not Started |
| 2    | Frontend  | Update Wagmi config, Add XCM integration          | 🔴 Not Started |
| 2    | XCM       | Setup channels, Register assets                   | 🔴 Not Started |
| 3    | Testing   | Test suite, Documentation, Demo prep              | 🔴 Not Started |

## Benefits After Migration

1. **Authentic Cross-Chain Demo**: Real XCM messages between chains
2. **Production Architecture**: Same setup as Moonbeam/Astar
3. **Latest Tech Stack**: Showcases PolkaVM and Revive
4. **Better Performance**: Revive is more efficient than EVM pallet
5. **Future-Proof**: Aligned with Polkadot's technical direction

## Rollback Plan

If issues arise, we can:

1. Keep Anvil setup as "simple demo" mode
2. Use environment variable to switch: `NEXT_PUBLIC_EVM_MODE=anvil|revive`
3. Maintain both deployment scripts

## Resources

- [Revive Documentation](https://github.com/paritytech/revive)
- [OmniNode Guide](https://github.com/paritytech/polkadot-sdk/tree/master/cumulus/polkadot-omni-node)
- [XCM Format](https://github.com/paritytech/xcm-format)
- [PolkaVM Specification](https://github.com/paritytech/polkavm)

## Decision Point

**For Hackathon Demo:**

- **Quick Win**: Keep Anvil (ready now, works)
- **Technical Excellence**: Implement OmniNode + Revive (1-2 weeks)
- **Hybrid**: Anvil for demo, OmniNode branch for judges

## Next Steps

1. [ ] Team decision on migration priority
2. [ ] If yes, assign developer to OmniNode setup
3. [ ] Create feature branch `feat/omninode-revive`
4. [ ] Implement Phase 1-2 first (core functionality)
5. [ ] Demo both versions to team
6. [ ] Choose best option for hackathon presentation
