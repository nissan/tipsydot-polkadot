# 🎬 TipsyDot Demo Script - 2 Minutes

## Pre-Demo Setup (Before Presentation)

```bash
# Terminal 1: Clean and setup
cd tipsydot-demo
pnpm demo:clean
pnpm demo:setup
# Wait for "✅ All wallets funded and ready!"

# Terminal 2: Start frontend
pnpm dev
# Open http://localhost:3000

# Browser: Have MetaMask ready
# - Network: Localhost 8545
# - Chain ID: 420420421
# - Import test account if needed:
#   0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
```

## Demo Flow (2 Minutes)

### 0:00 - Introduction (15 seconds)

"Hi, I'm presenting **TipsyDot** - a cross-chain donation platform built during PBA Cohort 7.

We're solving the problem of **underfunded parachain builders** by enabling seamless USDC donations from EVM wallets to Substrate accounts."

### 0:15 - Show Architecture (15 seconds)

_[Point to architecture diagram on screen]_

"We're using:

- **Chopsticks** to fork AssetHub with real USDC
- **XCM Reserve Transfers** - not teleports - as we learned at PBA
- **PAPI** for live blockchain monitoring"

### 0:30 - Live Demo Starts (60 seconds)

#### Step 1: Connect Wallet (10 seconds)

_[Click "Donate USDC" button]_

"First, I'll connect my MetaMask wallet to our local EVM chain..."

_[Connect MetaMask]_

"Connected! I have test USDC ready to donate."

#### Step 2: Select Builder (15 seconds)

_[Show builder selection]_

"Here are three underfunded parachain projects:

- Alice building on Moonbeam
- Bob working on Astar
- Charlie developing Acala

Let's support Bob's multi-VM platform work."

_[Select Bob]_

#### Step 3: Choose Amount (10 seconds)

"I'll donate 50 USDC to help Bob's development."

_[Select 50 USDC]_

#### Step 4: Approve & Send (15 seconds)

"Now I approve the USDC spend..."

_[Approve in MetaMask]_

"And send the donation through our XCM bridge..."

_[Confirm transaction]_

#### Step 5: Show Success (10 seconds)

_[Point to PAPI Monitor]_

"Look! The PAPI monitor shows our transaction live on AssetHub!

- Block number updating in real-time
- USDC transfer visible in the feed
- This demonstrates actual cross-chain communication"

### 1:30 - Technical Highlights (20 seconds)

"Key PBA technologies we applied:

- **XCM V5** with Reserve Transfer pattern from Francisco's guide
- **PAPI** replacing legacy polkadot.js
- **Chopsticks** for realistic testing with mainnet state
- Ready for **Revive pallet** and PolkaVM migration"

### 1:50 - Conclusion (10 seconds)

"TipsyDot makes cross-chain donations simple and transparent, helping fund the builders creating Polkadot's future.

Thank you! Questions?"

## Key Talking Points

### If Asked About XCM:

"We use Reserve Transfer, not Teleport, because USDC is a custom asset. AssetHub holds the reserves while parachains get derivative assets."

### If Asked About PAPI:

"PAPI is the modern TypeScript-first API for Substrate. It's light-client compatible and provides better type safety than @polkadot/api."

### If Asked About Production:

"For production, we'd migrate from Anvil to OmniNode with Revive pallet for real XCM execution. The architecture is ready, just needs the implementation."

### If Asked About Chopsticks:

"Chopsticks lets us fork AssetHub with real USDC balances. No mocking needed - we're testing with actual mainnet state."

## Backup Plans

### If MetaMask Won't Connect:

- Show the code and architecture
- Explain the flow conceptually
- Point to recorded demo video (if available)

### If Transaction Fails:

- "In a local environment, sometimes gas estimation can be tricky"
- Show the smart contract code
- Explain the XCM message construction

### If PAPI Monitor Doesn't Update:

- "The monitor connects via WebSocket to our forked AssetHub"
- Show the subscription code
- Explain how real-time monitoring works

## Time Management

- **Too Fast?** Spend more time explaining XCM reserve vs teleport
- **Too Slow?** Skip the technical highlights, go straight to conclusion
- **Extra Time?** Show the contract code or XCM implementation

## Final Checklist

- [ ] Both terminals running (setup + frontend)
- [ ] Browser on http://localhost:3000
- [ ] MetaMask connected to localhost
- [ ] Test account has ETH for gas
- [ ] Contracts deployed (check deployments.json)
- [ ] PAPI monitor showing "Connected"
- [ ] Practice the flow at least once

## Remember

- **Emphasize PBA learnings** throughout
- **Keep it simple** - it's a 2-minute demo
- **Show enthusiasm** for the technology
- **Be ready for questions** about XCM and cross-chain

Good luck! 🚀
