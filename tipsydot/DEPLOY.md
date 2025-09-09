# TipsyDot Deployment Guide

## Prerequisites
- Foundry/Cast installed (`cast --version`)
- Private key with testnet tokens
- Access to Passet Hub testnet

## Setup Environment

1. Add your private key to `.env.local`:
```bash
PRIVATE_KEY=your_private_key_here
```

2. Configure addresses (if known):
```bash
VITE_USDC_PRECOMPILE=0x...  # USDC token address
VITE_XCM_ROUTER=0x...        # XCM router precompile
```

## Deployment Steps

### 1. Compile Contracts
```bash
npm run compile
```

### 2. Deploy TipsyDot Contract
```bash
npm run deploy
# or
./scripts/deploy.sh
```

This will output the contract address. Add it to `.env.local`:
```bash
VITE_TIPSY_ADDRESS=0x_deployed_contract_address
```

### 3. Set XCM Router
```bash
npm run interact set-router 0xROUTER_ADDRESS
```

### 4. Approve USDC Spending (for testing)
```bash
npm run approve-usdc 1000000000  # Approve 1000 USDC
```

## Using Cast Commands

### Create a Campaign
```bash
cast send --rpc-url https://testnet-passet-hub-eth-rpc.polkadot.io \
  --private-key $PRIVATE_KEY \
  $CONTRACT_ADDRESS \
  "createCampaign(string,string,address,bytes,uint32)" \
  "Save the Ocean" \
  "Help us clean the oceans" \
  "0xUSDC_ADDRESS" \
  "0xBENEFICIARY_BYTES" \
  2000
```

### Tip a Campaign
```bash
cast send --rpc-url https://testnet-passet-hub-eth-rpc.polkadot.io \
  --private-key $PRIVATE_KEY \
  $CONTRACT_ADDRESS \
  "tip(uint256,uint256,string)" \
  0 \
  1000000 \
  "Great cause!"
```

### Forward Funds
```bash
cast send --rpc-url https://testnet-passet-hub-eth-rpc.polkadot.io \
  --private-key $PRIVATE_KEY \
  $CONTRACT_ADDRESS \
  "forward(uint256)" \
  0
```

### Read Campaign Details
```bash
cast call --rpc-url https://testnet-passet-hub-eth-rpc.polkadot.io \
  $CONTRACT_ADDRESS \
  "getCampaignDetails(uint256)" \
  0
```

## Network Details
- **Network**: Passet Hub Testnet
- **Chain ID**: 420420421
- **RPC**: https://testnet-passet-hub-eth-rpc.polkadot.io
- **Explorer**: https://blockscout-passet-hub.parity-testnet.parity.io/

## Troubleshooting

### Gas Issues
If transactions fail, try increasing gas:
```bash
cast send ... --gas-limit 5000000
```

### Nonce Issues
Reset nonce if needed:
```bash
cast nonce --rpc-url https://testnet-passet-hub-eth-rpc.polkadot.io $YOUR_ADDRESS
```

### Get Test Tokens
Visit: https://faucet.polkadot.io/?parachain=1111
Select: Passet Hub on Paseo network