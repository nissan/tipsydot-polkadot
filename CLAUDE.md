# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

TipsyDot is a cross-chain DeFi tipping platform built for the Polkadot Blockchain Academy Hackathon. It demonstrates Polkadot's full technology stack including XCM v4 cross-chain messaging, custom assets, NFT rewards, and EVM compatibility via the Revive pallet.

## Development Commands

### Setup & Installation
```bash
# Install dependencies (using pnpm)
pnpm install

# Build smart contracts (requires Foundry)
forge build

# Run tests
forge test
forge test -vvv  # verbose output
forge test --gas-report  # with gas reporting
```

### Development Workflow
```bash
# Start local blockchain (Terminal 1)
anvil --port 8545 --chain-id 420420421

# Deploy contracts (Terminal 2)
./scripts/deploy-v4.sh    # Core TipsyDot contracts
./scripts/deploy-usdp.sh  # USDP stablecoin system
./scripts/deploy-nft.sh   # NFT reward contracts
./scripts/deploy-faucet.sh # Faucet for test tokens

# Start frontend (Terminal 3)
pnpm dev  # Runs on http://localhost:5173

# Linting and type checking
pnpm lint
pnpm build  # TypeScript build and type check
```

### Chopsticks Fork Testing (Recommended)
```bash
# Fork Paseo AssetHub (has real USDC with Asset ID 1337)
pnpm chopsticks:paseo

# Or fork Polkadot AssetHub
pnpm chopsticks:polkadot

# Mint USDC to test accounts
node scripts/mint-usdc-chopsticks.js
```

## Architecture Overview

### Smart Contract Architecture

The project uses a modular contract system deployed on EVM-compatible parachains:

1. **TipsyDotV4/V5** (`contracts/TipsyDotV4.sol`, `TipsyDotV5.sol`): Main tipping platform
   - Parachain registration and verification
   - Tip distribution with 0.1% protocol fee
   - Campaign management and analytics

2. **USDP Ecosystem** (`contracts/USDP.sol`, `USDPBridge.sol`, `USDPSwap.sol`): Custom stablecoin
   - ERC20 with burn/mint for bridging
   - XCM bridge for cross-chain transfers
   - AMM pools using constant product formula (x*y=k)
   - Role-based access control (MINTER, BRIDGE, PAUSER)

3. **NFT Rewards** (`contracts/TipsyDotNFT.sol`): Dynamic collectibles
   - Rarity tiers based on tip amounts
   - On-chain metadata generation
   - AssetHub integration (Asset ID: 69420)

### Frontend Architecture

React application with modern tooling:
- **Vite** for build and dev server
- **TypeScript** for type safety
- **TailwindCSS v4** with @tailwindcss/vite plugin
- **ShadCN UI** components in `src/components/ui/`
- **Wagmi/Viem** for EVM interactions
- **Polkadot API (PAPI)** for Substrate chains

### Polkadot Integration

- **PAPI Descriptors**: Generated types in `.papi/descriptors/`
- **Reactive-dot**: Modern React hooks for Polkadot
- **XCM v4**: Reserve transfer patterns for custom assets
- **Multi-chain Support**: Paseo, AssetHub, PassetHub connections

## Key Technical Patterns

### XCM Asset Transfers
All custom assets (USDC, USDP, NFTs) use **reserve transfers**, never teleports:
- USDC (Asset ID: 31337 or 1337 on Paseo)
- USDP (Asset ID: 42069)
- TipCards NFT (Asset ID: 69420)

### Sovereign Account Management
Cross-chain transfers use sovereign accounts with burn/mint mechanism for supply management.

### Contract Security
- OpenZeppelin standards (Ownable, Pausable, ReentrancyGuard)
- Role-based access control
- Idempotent bridge transactions
- Emergency pause functionality

## Test Accounts (Anvil)

```javascript
const OWNER = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";     // Account #0
const TREASURY = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"; // Account #1
const ALICE = "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC";    // Account #2
const BOB = "0x90F79bf6EB2c4f870365E785982E1f101E93b906";      // Account #3
```

## Important Notes

- **Foundry Required**: Install with `curl -L https://foundry.paradigm.xyz | bash && foundryup`
- **Asset IDs**: USDC varies by network (1337 on Paseo, different on mainnet)
- **Chain ID**: Local Anvil uses 420420421
- **Package Overrides**: Security patches for npm vulnerabilities in package.json
- **Path Aliases**: `@/` maps to `src/` directory in TypeScript/Vite