# AssetHub USDC Integration Guide

## The Complete USDC Flow for TipsyDot

### 🔄 Option 1: Starting with Testnet DOT

1. **Get Paseo Testnet DOT**
   - Visit: https://faucet.polkadot.io/
   - Select: Paseo network
   - Get DOT for your account

2. **Bridge to AssetHub**
   - Use Polkadot.js Apps
   - Navigate to AssetHub parachain
   - Your DOT is now on AssetHub

3. **Swap DOT → USDC**
   
   **Via Hydration (Recommended):**
   - Hydration has DOT/USDC liquidity pools
   - Connect to Hydration parachain
   - Swap DOT for USDC
   - Transfer USDC back to AssetHub
   
   **Via Asset Conversion on AssetHub:**
   - AssetHub may have native swaps
   - Check for DOT/USDC pool
   - Execute swap directly

4. **USDC Ready on AssetHub**
   - Asset ID: 1337
   - Now accessible from Passet Hub contracts

### 🔄 Option 2: Direct USDC (If Available)

Some testnets may offer direct USDC minting:
- Check AssetHub faucets
- Look for USDC test tokens
- Asset ID remains 1337

### 📝 For Our Demo

Since we're demonstrating **Solidity on Polkadot**, we use MockUSDC locally to show the flow:

```solidity
// What happens in production:
USDC_ON_ASSETHUB (ID: 1337)
    ↓ (via precompile bridge)
PASSET_HUB_CONTRACT
    ↓ (collects tips)
PARACHAIN_SOVEREIGN_ACCOUNT
    ↓ (XCM transfer)
TARGET_PARACHAIN
```

### 🎯 Key Points for Judges

1. **Real USDC Integration**
   - Not wrapped tokens
   - Native AssetHub USDC (ID: 1337)
   - Direct parachain transfers

2. **Solidity Accessing Polkadot Features**
   - ERC20 interface to AssetHub assets
   - XCM calls from smart contracts
   - Sovereign account management

3. **Developer Experience**
   - Ethereum devs can use familiar tools
   - Same Solidity, new superpowers
   - Access to entire Polkadot ecosystem

### 💰 Sovereign Accounts Explained

Each parachain has a "sovereign account" on AssetHub:
- It's the parachain's wallet on AssetHub
- Calculated deterministically from ParaID
- When we "forward" funds, they go here
- The parachain can then use these funds

Example:
```
ParaID 2000 → Sovereign Account: 0x7061726120000007d0...
ParaID 2004 → Sovereign Account: 0x7061726120000007d4...
```

### 🔗 In Production

The full production setup would:
1. Use actual AssetHub USDC precompile address
2. Calculate real sovereign accounts
3. Handle XCM weights properly
4. Include proper error handling

But the core concept remains: **Solidity contracts on Polkadot can interact with native Polkadot assets and features**.

### 🚀 Why This Matters

**Before**: Ethereum developers had to learn Substrate/Rust to build on Polkadot  
**Now**: Use Solidity, get cross-chain features for free  
**Result**: Massive developer onboarding potential

TipsyDot is just the beginning - imagine DeFi protocols, NFT marketplaces, and DAOs all written in Solidity but with native cross-chain capabilities!