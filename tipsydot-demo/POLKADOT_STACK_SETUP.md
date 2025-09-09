# 🚀 TipsyDot Polkadot Stack Setup

## Overview

This demo showcases cross-chain tipping using Polkadot technology. We demonstrate how USDC from AssetHub can be used to tip parachain builders through smart contracts.

## Architecture

```
┌──────────────────────┐          XCM           ┌──────────────────────┐
│   Paseo AssetHub     │ <-------------------> │     PassetHub        │
│   (Para ID: 1000)    │   Reserve Transfers   │   (Para ID: 1111)    │
├──────────────────────┤                       ├──────────────────────┤
│ • Chopsticks Fork    │                       │ • EVM via Revive     │
│ • USDC (ID: 1337)    │                       │ • Smart Contracts    │
│ • Pre-funded Accounts│                       │ • Tipping Logic      │
└──────────────────────┘                       └──────────────────────┘
```

## Why This Setup?

### 1. **AssetHub Fork via Chopsticks** ✅
- Provides **real USDC** (Asset ID 1337) from Paseo testnet
- Pre-funded accounts for testing
- Authentic Substrate environment
- No need to mint fake tokens

### 2. **PassetHub with Revive Pallet** (Goal)
- **Revive**: PolkaVM-based smart contract execution
- Native Polkadot EVM, not just a bridge
- Better performance than traditional EVM pallet
- Future-proof technology (PolkaVM is Polkadot's direction)

### 3. **XCM Integration**
- Reserve transfers for USDC between chains
- USDC precompile at `0x0800...0539` address
- Proper cross-chain asset management

## Current Implementation Status

### ✅ Working
- Chopsticks fork of Paseo AssetHub with real USDC
- Smart contracts (MockUSDC, SimpleTipping)
- Tipping functionality with events
- Pre-funded test accounts

### 🚧 In Progress
- OmniNode with Revive pallet (binary compatibility issues)
- XCM channels between AssetHub and PassetHub
- USDC precompile integration

### 📝 Workaround
Currently using **Anvil** as a temporary EVM chain while we resolve OmniNode issues. This demonstrates the smart contract functionality, though not the full Polkadot-native stack.

## Pop CLI Integration (Planned)

Pop CLI was designed to simplify this entire setup:

```bash
# What pop-cli would do:
pop up parachain \
  --network paseo \
  --parachain passethub \
  --runtime revive \
  --chopsticks-assethub

# Deploy contracts
pop up contract \
  --contract SimpleTipping \
  --network local
```

Benefits of pop-cli:
- Automatic binary management
- Integrated Zombienet setup
- Simplified XCM configuration
- One-command deployment

## Running the Demo

### Quick Start
```bash
# Start the complete stack
./scripts/start-polkadot-stack.sh

# Deploy contracts
node scripts/deploy-tipping.mjs

# Test tipping flow
node scripts/test-tipping.mjs
```

### What Happens
1. **AssetHub Fork** starts with real USDC
2. **EVM Chain** starts (Anvil for now, Revive in production)
3. **Smart Contracts** deploy with tipping logic
4. **Test Transaction** shows USDC tip to parachain builder

## Technical Achievements

### Polkadot-Native Features
- ✅ Using real testnet assets (USDC from Paseo)
- ✅ Substrate-based infrastructure
- ✅ XCM-ready architecture
- 🚧 Revive pallet for PolkaVM execution

### Smart Contract Features
- ✅ ERC20 token handling
- ✅ Builder registry
- ✅ Event emission
- ✅ Gas-efficient (~71k per tip)

## Why Not Just Use Anvil?

While Anvil works for the demo, using PassetHub with Revive shows:
1. **True Polkadot Integration**: Not just bridging to Ethereum
2. **Better Performance**: PolkaVM is more efficient
3. **Native XCM**: Synchronous cross-chain calls
4. **Future-Proof**: Aligns with Polkadot's technical direction
5. **PBA Learning**: Demonstrates cutting-edge Substrate tech

## Next Steps

1. **Fix OmniNode Binary**: Resolve architecture compatibility
2. **Install pop-cli**: Use official tooling for setup
3. **Enable Revive**: Deploy contracts to PolkaVM
4. **Full XCM Flow**: Connect AssetHub USDC to PassetHub contracts
5. **Production Deployment**: Move to real Paseo testnet

## Resources

- [Pop CLI Docs](https://learn.onpop.io)
- [Revive Pallet](https://github.com/paritytech/revive)
- [Chopsticks](https://github.com/AcalaNetwork/chopsticks)
- [XCM Format](https://github.com/paritytech/xcm-format)

## Summary

This demo showcases the **vision** of cross-chain DeFi on Polkadot:
- **Real assets** from AssetHub
- **Native EVM** via Revive/PolkaVM
- **Seamless XCM** for cross-chain transfers
- **Developer-friendly** with pop-cli

While we use Anvil temporarily, the architecture is designed for full Polkadot-native execution, demonstrating the future of Web3 interoperability.

---

**Built for PBA Cohort 7** - Showcasing Polkadot's cross-chain capabilities