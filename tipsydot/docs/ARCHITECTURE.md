# TipsyDot Architecture - Full Polkadot Stack

## Overview
TipsyDot demonstrates the complete Polkadot technology stack for cross-chain crowdfunding:

```
AssetHub (Parachain 1000)          PassetHub (Parachain 1111)
    │                                      │
    ├─ USDC (Asset ID: 31337)             ├─ Revive Pallet (EVM)
    │                                      │
    └──XCM Reserve Transfer──────────────►├─ Assets Pallet
                                          │   └─ USDC Precompile (0x0800)
                                          │
                                          └─ TipsyDot Contract
```

## Key Components

### 1. AssetHub (Source Chain)
- **Purpose**: Polkadot's common-good parachain for assets
- **USDC**: Asset ID 31337 (testnet)
- **Role**: Source of truth for USDC balances

### 2. XCM (Cross-Consensus Messaging)
- **Version**: XCM v5
- **Transfer Type**: Reserve Transfer
- **Purpose**: Securely move USDC from AssetHub to PassetHub
- **Security**: Uses sovereign accounts for parachain funds

### 3. PassetHub (Target Chain)
- **Purpose**: Temporary testnet instance with EVM support
- **Parachain ID**: 1111
- **Key Pallets**:
  - **Assets Pallet**: Manages bridged assets
  - **Revive Pallet**: Provides EVM compatibility
  - **XCM Pallet**: Handles incoming transfers

### 4. Precompiles
When USDC is bridged to PassetHub, it becomes available as a precompile:
- **Address**: `0x0000000000000000000000000000000000000800`
- **Interface**: Standard ERC20
- **Backend**: Assets pallet state

### 5. TipsyDot Smart Contract
- **Language**: Solidity
- **Deployment**: Via Revive pallet on PassetHub
- **Interactions**:
  - Uses bridged USDC precompile
  - Manages parachain registry
  - Handles tipping with 0.1% protocol fee

## Complete Flow

### User Journey
1. **User has USDC on AssetHub**
   - Native USDC (Asset ID 31337)
   - Held in Substrate account

2. **Bridge to PassetHub**
   ```typescript
   // XCM Reserve Transfer
   api.tx.xcmPallet.limitedReserveTransferAssets(
     dest: PassetHub (1111),
     beneficiary: User's EVM address,
     assets: USDC (31337),
     fee_asset_item: 0,
     weight_limit: Unlimited
   )
   ```

3. **USDC Available on PassetHub**
   - Appears as ERC20 via precompile
   - Can interact with Solidity contracts

4. **Tip Parachains**
   - Call TipsyDot contract
   - Contract uses precompile to transfer USDC
   - 0.1% fee goes to treasury

5. **Parachain Claims**
   - Accumulated tips forwarded to parachain address
   - Can bridge back to AssetHub if needed

## Technical Implementation

### Omninode Setup
```bash
# Run Omninode with Revive pallet
omninode \
  --chain passet-hub-spec.json \
  --enable-evm-rpc \
  --runtime-pallets Assets,Revive,XcmPallet
```

### Precompile Interaction
```solidity
// In TipsyDot contract
IBridgedUSDC usdc = IBridgedUSDC(0x0800);
usdc.transferFrom(tipper, address(this), amount);
```

### XCM Configuration
```rust
// PassetHub runtime configuration
impl xcm_executor::Config for Runtime {
    type AssetTransactor = AssetTransactors;
    type AssetTrap = PolkadotXcm;
    // Maps XCM assets to local precompiles
}
```

## Security Considerations

1. **XCM Security**
   - Reserve-backed model ensures AssetHub controls supply
   - Sovereign accounts prevent unauthorized minting

2. **Precompile Security**
   - Read-only mapping to Assets pallet state
   - Cannot mint/burn without XCM authorization

3. **Contract Security**
   - OpenZeppelin standards
   - ReentrancyGuard for transfers
   - Pausable for emergencies

## Advantages of This Architecture

1. **Native Polkadot Integration**
   - Uses actual Polkadot infrastructure
   - Not just "EVM on Polkadot"

2. **True Cross-Chain**
   - Real asset movement between parachains
   - XCM provides trustless bridging

3. **Developer Friendly**
   - Solidity developers can build on Polkadot
   - Existing tools (MetaMask, Hardhat) work

4. **Scalable**
   - Each parachain handles its own execution
   - XCM enables horizontal scaling

## Testing Strategy

### Local Testing (Current)
1. Anvil for quick iteration
2. Mock USDC for development

### Integration Testing (Next)
1. Omninode with Revive pallet
2. Simulate XCM transfers locally
3. Test precompile interactions

### Testnet Deployment
1. Deploy to actual PassetHub testnet
2. Use real AssetHub USDC
3. Test complete XCM flow

This architecture showcases:
- **Substrate** (runtime development)
- **XCM** (cross-chain messaging)
- **Pallets** (Assets, Revive, XCM)
- **Precompiles** (bridged asset access)
- **EVM Compatibility** (Solidity contracts)
- **Polkadot Ecosystem** (multiple parachains working together)