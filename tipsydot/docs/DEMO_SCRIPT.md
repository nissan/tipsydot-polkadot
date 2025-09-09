# 🍸 TipsyDot Demo Script (60-90 seconds)

## Pre-Demo Setup ✅
1. Anvil running: `anvil --port 8545 --chain-id 420420421`
2. Contracts deployed (local)
3. App running: http://localhost:5173
4. MetaMask connected to localhost:8545

## Demo Flow

### 1. Introduction (15s)
"Hi! I'm presenting **TipsyDot** - demonstrating that **Ethereum developers can now build on Polkadot using Solidity**.

We've built a sustainable crowdfunding platform that:
- Uses native AssetHub USDC
- Takes 0.1% protocol fee to cover parachain coretime costs
- Forwards funds cross-chain via XCM"

### 2. Show Connection Status (10s)
- Point to green connection indicators
- "We're connected to both Substrate and EVM layers"
- Show deployed contract addresses

### 3. Create Campaign (20s)
- Click "Create Campaign" tab
- Fill in:
  - Name: "Polkadot Ecosystem Fund"
  - Description: "Supporting new parachain development"
  - Keep default ParaID 2000 and addresses
- Submit transaction
- "Campaign created on-chain!"

### 4. View & Tip Campaign (20s)
- Switch to "View Campaigns" tab
- Show campaign details
- Enter tip amount: "10 USDC"
- Add memo: "Great initiative! 🚀"
- Click Send (use mock mode if needed)
- "Donation recorded on-chain with message!"

### 5. Forward via XCM (15s)
- Click "Forward Funds via XCM"
- "This triggers cross-chain transfer to destination parachain"
- Show status change to "Forwarded ✅"
- "Funds automatically sent to ParaID 2000!"

### 6. Technical Highlights (15s)
- "Built with Solidity for EVM compatibility"
- "Integrates with Substrate via Polkadot.js"
- "Uses Cast CLI for direct contract interaction"
- Show terminal: `cast call $CONTRACT "getCampaignDetails(uint256)" 0`

## Backup Demos

### If MetaMask fails:
Use Cast CLI:
```bash
# Create campaign
./scripts/interact.sh create-campaign "Demo" "Test" $USDC $BENEFICIARY 2000

# Tip
./scripts/interact.sh tip 0 1000000 "Via CLI!"

# Forward
./scripts/interact.sh forward 0
```

### If contracts not deployed:
- Use mock mode (automatic fallback)
- Explain: "Using mock data for demo, but same flow on-chain"

## Key Points to Emphasize

1. **Cross-chain native**: Built for Polkadot's XCM
2. **User-friendly**: Complex operations made simple
3. **Transparent**: All donations tracked on-chain
4. **Flexible**: Works on local and testnet

## Closing (10s)
"TipsyDot makes cross-chain crowdfunding accessible to everyone in the Polkadot ecosystem. Questions?"

## Q&A Preparation

**Q: How does XCM integration work?**
A: Contract calls XCM router precompile, which handles cross-chain message and asset transfer.

**Q: What about real USDC?**
A: On mainnet, we'd use AssetHub USDC (Asset ID 1337) via precompiles.

**Q: Why Solidity on Polkadot?**
A: Leverages existing Ethereum tooling while gaining Polkadot's cross-chain capabilities.

**Q: Next steps?**
A: Solang compilation for WASM, mainnet deployment, integrate real USDC precompiles.