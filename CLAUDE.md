# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

TipsyDot is a cross-chain DeFi tipping platform demonstrating Polkadot's technology stack including XCM v4, custom assets, NFT rewards, and EVM compatibility via both Frontier and Revive pallets.

## Development Commands

### Core Development
```bash
# Install dependencies
cd tipsydot-demo && pnpm install

# Start Chopsticks fork with real USDC (Terminal 1)
pnpm chain:chopsticks:paseo   # Fork Paseo AssetHub (USDC ID: 1337)
# OR
pnpm chain:chopsticks:polkadot # Fork Polkadot AssetHub

# Start local EVM chain (Terminal 2)
pnpm chain:anvil  # Anvil on port 8545, chain ID 420420421

# Deploy contracts (Terminal 3)
node scripts/deploy-tipping.mjs    # SimpleTipping & MockUSDC
node scripts/deploy-to-frontier.mjs # Deploy to Frontier node

# Start frontend (Terminal 4)
pnpm dev  # Next.js on http://localhost:3000

# Run tests
node scripts/test-tipping.mjs
node scripts/test-donation-flow.mjs
```

### Infrastructure Management
```bash
# Start complete Polkadot stack
./scripts/start-polkadot-stack.sh     # Dev stack (Chopsticks + Anvil)
./scripts/start-polkadot-native.sh    # Native stack (Revive/Frontier)
./scripts/start-dev-with-paseo.sh     # Production-like setup

# Stop all infrastructure
pnpm infra:stop  # Kill all background processes
pnpm demo:clean  # Clean data and rebuild

# Monitor builds
./scripts/monitor-builds.sh  # Check omninode/passethub build progress
```

### Contract Compilation
```bash
# Compile Solidity contracts
npx hardhat compile         # Standard compilation
node scripts/compile.mjs    # With deployment artifacts
npx solc contracts/USDCDonation.sol --bin --abi  # Direct solc
```

## Architecture Patterns

### Multi-Chain Infrastructure
The project supports three deployment targets:
1. **Anvil Local**: Fast development with mock USDC
2. **Frontier Node**: EVM on Substrate with native pallets
3. **Revive/PolkaVM**: Next-gen execution on PassetHub

### Contract Deployment Flow
```javascript
// Deployment addresses are stored in deployment.json
{
  "contracts": {
    "MockUSDC": "0x5FbDB2315678afecb367f032d93F642f64180aa3",
    "SimpleTipping": "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512"
  }
}
```

### Frontend Integration Points
- **Wagmi Config**: `lib/wagmi-config.ts` - Chain configuration and ABIs
- **PAPI Client**: `lib/papi-client.ts` - AssetHub monitoring and USDC tracking
- **Contract Loading**: Automatic from `deployment.json` or environment variables

### Environment Configuration
```bash
# Key environment variables (see .env.example)
NEXT_PUBLIC_ASSETHUB_WS=ws://127.0.0.1:8000
NEXT_PUBLIC_PASSETHUB_EVM_RPC=http://127.0.0.1:8545
NEXT_PUBLIC_CHAIN_ID=420420421
NEXT_PUBLIC_USDC_ASSET_ID=1337
NEXT_PUBLIC_NETWORK_NAME="Native Polkadot EVM"
```

## Cross-Chain Asset Management

### XCM Reserve Transfer Pattern
All assets use reserve transfers with AssetHub as the reserve chain:
- **USDC**: Asset ID 1337 (Paseo) or 31337 (custom)
- **Reserve Location**: AssetHub parachain 1000
- **Transfer Type**: Always reserve, never teleport

### Precompile Addresses (Frontier)
```solidity
address constant ASSET_PRECOMPILE = 0x0800...;  // Access substrate assets
address constant XCM_PRECOMPILE = 0x0809...;    // Execute XCM messages
```

## Testing & Verification

### Quick Test Flow
```bash
# 1. Ensure infrastructure is running
pnpm chain:chopsticks:paseo & pnpm chain:anvil

# 2. Deploy and test
node scripts/deploy-tipping.mjs
node scripts/test-tipping.mjs

# 3. Check deployed contracts
cat deployment.json
```

### Builder Configuration
Pre-configured builders for testing donations:
- **Alice (Moonbeam)**: Focus on EVM smart contracts
- **Bob (Astar)**: Multi-VM platform support
- **Charlie (Acala)**: Native DeFi primitives

## Important Technical Details

- **Package Manager**: Always use `pnpm` (not npm/yarn)
- **Node Version**: Requires Node.js 18+ for ES modules
- **Contract Verification**: Deployment scripts auto-verify on explorers when available
- **Gas Settings**: Anvil uses 30 gwei base fee, adjust in hardhat.config.mjs
- **Network Switching**: Frontend auto-detects network from environment
- **Build Artifacts**: Smart contract artifacts in `tipsydot-demo/artifacts/`
- **Chopsticks Data**: SQLite databases stored as `chopsticks-*.sqlite`