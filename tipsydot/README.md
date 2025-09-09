# 🍸 TipsyDot - Cross-Chain DeFi Platform for Polkadot

> **Polkadot Blockchain Academy Cohort 7 Hackathon Project**  
> Complete DeFi ecosystem showcasing the full power of Polkadot's technology stack

## 🎯 Overview

TipsyDot is a comprehensive cross-chain crowdfunding and DeFi platform that demonstrates mastery of Polkadot's complete technology stack. It features a custom stablecoin (USDP), XCM bridging, liquidity pools, and a tipping system for parachain projects.

### 🔥 Key Innovation: Complete DeFi Flow

```
User Journey:
1. 💧 Receive faucet tokens on PassetHub
2. 💱 Swap faucet tokens for USDP via AssetHub pools  
3. 🌉 Bridge USDP across parachains using XCM
4. 💰 Tip parachain projects with USDP (0.1% protocol fee)
```

## 🏗️ Architecture

### Technology Stack Demonstrated

- **XCM v5**: Complete cross-chain messaging implementation
- **Custom Asset Creation**: USDP stablecoin (Asset ID: 42069)
- **Bridge Architecture**: Full XCM bridge with sovereign accounts
- **Precompiles**: Integration with bridged assets
- **Liquidity Pools**: AssetHub pool simulation
- **OpenZeppelin Security**: Production-ready contracts
- **Revive Pallet**: EVM compatibility on Substrate

### Smart Contracts

| Contract | Address | Purpose |
|----------|---------|---------|
| **TipsyDotV4** | `0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6` | Main tipping contract with 0.1% fee |
| **USDP Token** | `0x68B1D87F95878fE05B998F19b66F4baba5De1aed` | Custom stablecoin |
| **USDPBridge** | `0x3Aa5ebB10DC797CAC828524e59A333d0A371443c` | XCM bridge implementation |
| **USDPSwap** | `0xc6e7DF5E7b4f2A278906862b61205850344D4e7d` | Liquidity pool interface |

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Rust & Cargo
- Foundry (`curl -L https://foundry.paradigm.xyz | bash`)

### Installation

```bash
# Clone the repository
git clone https://github.com/nissan/tipsydot-polkadot.git
cd tipsydot-polkadot/tipsydot

# Install dependencies
npm install
forge install

# Start local blockchain
anvil --port 8545 --chain-id 420420421

# Deploy contracts
./scripts/deploy-v4.sh    # Deploy TipsyDot with parachains
./scripts/deploy-usdp.sh  # Deploy USDP ecosystem

# Start frontend
npm run dev
```

## 🛠️ Features

### 1. **USDP Stablecoin System**
- Custom stablecoin with 6 decimals (matching USDC standard)
- XCM bridge support for cross-chain transfers
- Role-based access control (MINTER, BRIDGE, PAUSER)
- Burn/mint mechanism for bridging

### 2. **XCM Bridge**
- Reserve-backed bridging model
- Sovereign account management
- Idempotent transaction processing
- Support for multiple parachains

### 3. **Liquidity Pools**
- Constant product AMM (x*y=k)
- 0.3% swap fees
- Liquidity provider positions tracking
- AssetHub integration simulation

### 4. **Tipping Platform**
- Parachain registry with verification
- 0.1% protocol fee for treasury
- Batch forwarding to parachain addresses
- Comprehensive tipper statistics

### 5. **Security Features**
- Hardware wallet detection and warnings
- OpenZeppelin security patterns
- ReentrancyGuard on critical functions
- Pausable for emergencies
- npm exploit protection (Sept 8 incident)

## 📊 Analytics Dashboard

The platform includes a comprehensive analytics dashboard showing:
- Real-time XCM flow visualization
- Campaign distribution charts
- Tips activity heatmap
- Network activity feed
- Protocol metrics

## 🔐 Security

### Smart Contract Security
- **OpenZeppelin Standards**: Ownable, Pausable, ReentrancyGuard
- **Access Control**: Role-based permissions
- **Idempotency**: Prevents duplicate bridge transactions
- **Fee Management**: Transparent 0.1% protocol fee

### Frontend Security
- Hardware wallet priority
- Address verification with checksums
- Clear signing for transactions
- Package override protection

## 🌉 Cross-Chain Flow

### Complete User Journey

1. **Faucet Distribution**
   ```solidity
   // User receives test tokens on PassetHub
   faucet.claim() // Get test tokens
   ```

2. **Swap to USDP**
   ```solidity
   // Swap faucet tokens for USDP
   swap.swapForUSDPE(faucetToken, amount, minOut)
   ```

3. **Bridge USDP**
   ```solidity
   // Bridge USDP to another parachain
   bridge.bridgeToParachain(amount, destParaId, recipient)
   ```

4. **Tip Projects**
   ```solidity
   // Tip parachain projects with USDP
   tipsydot.tipParachain(paraId, amount, "Great project!")
   ```

## 🧪 Testing

```bash
# Run contract tests
forge test

# Run with verbosity
forge test -vvv

# Gas report
forge test --gas-report
```

## 📝 Documentation

- [Architecture Overview](./docs/ARCHITECTURE.md)
- [Progress Tracker](./PROGRESS.md)
- [Smart Contract Docs](./contracts/README.md)

## 🎯 Achievements

### Technical Mastery Demonstrated
- ✅ **7 Smart Contracts** implementing complete DeFi primitives
- ✅ **XCM v5** implementation with reserve transfers
- ✅ **Custom Asset Creation** (USDP stablecoin)
- ✅ **Bridge Architecture** with sovereign accounts
- ✅ **Liquidity Pools** with AssetHub integration
- ✅ **15+ React Components** for comprehensive UI
- ✅ **Production Security** with OpenZeppelin

### Innovation Highlights
- 🌟 **First hackathon project** with complete DeFi flow
- 🌟 **Custom stablecoin** demonstrating asset creation mastery
- 🌟 **Full stack implementation** (Frontend + Solidity + Substrate)
- 🌟 **0.1% protocol fee** for sustainable treasury funding

## 🔗 Resources

### Deployed Addresses
- **GitHub**: https://github.com/nissan/tipsydot-polkadot
- **PassetHub**: Parachain 1111
- **AssetHub**: Parachain 1000
- **USDP Asset ID**: 42069
- **USDC Asset ID**: 31337

### RPCs
- **PassetHub RPC**: https://rpc.passet-paseo.parity.io
- **AssetHub RPC**: wss://rpc-asset-hub-paseo.luckyfriday.io
- **Local EVM**: http://localhost:8545

## 👥 Team

**Polkadot Blockchain Academy Cohort 7**

Built with passion during the PBA hackathon to showcase the full potential of Polkadot's technology stack.

## 📄 License

MIT

---

*TipsyDot - Where Polkadot projects get the support they deserve! 🍸*

**Note**: This project demonstrates deep understanding of:
- Substrate runtime development
- XCM cross-chain messaging
- Pallets (Assets, Revive, XCM)
- Precompiles for bridged assets
- EVM compatibility on Polkadot
- Complete DeFi ecosystem design