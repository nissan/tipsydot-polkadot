# XCM Implementation Guide for TipsyDot

Based on Francisco Aguirre's XCM patterns and PBA Cohort 7 learnings.

## Transfer Types Overview

### 1. Simple Transfer (Same Chain)

For transfers within the same chain (e.g., AssetHub to AssetHub account):

```typescript
// Simple transfer - no cross-chain needed
api.tx.assets.transfer(assetId, destination, amount);
```

### 2. Teleport (Trust-Based)

**⚠️ NOT for USDC!** Only for native tokens between chains that fully trust each other:

```typescript
// Teleport - asset destroyed on source, minted on destination
// Only works for DOT/KSM between Relay <-> System chains
const xcm = XcmVersionedXcm.V5([
  XcmV5Instruction.WithdrawAsset([dotAsset]),
  XcmV5Instruction.InitiateTeleport({
    assets: XcmV5AssetFilter.Wild(XcmV5WildAsset.All),
    dest: relayChain,
    xcm: [
      XcmV5Instruction.DepositAsset({
        assets: XcmV5AssetFilter.Wild(XcmV5WildAsset.All),
        beneficiary: destination,
      }),
    ],
  }),
]);
```

### 3. Reserve Transfer (For USDC) ✅

**This is what we use for USDC!** AssetHub acts as the reserve:

```typescript
// Reserve Transfer - proper pattern for custom assets
const xcm = XcmVersionedXcm.V5([
  // 1. Withdraw USDC from sender
  XcmV5Instruction.WithdrawAsset([
    {
      id: {
        parents: 0,
        interior: XcmV5Junctions.X2([
          XcmV5Junction.PalletInstance(50), // Assets pallet
          XcmV5Junction.GeneralIndex(1337), // USDC Asset ID
        ]),
      },
      fun: XcmV3MultiassetFungibility.Fungible(amount),
    },
  ]),

  // 2. Pay for execution fees
  XcmV5Instruction.PayFees({
    asset: {
      /* fee asset */
    },
  }),

  // 3. Transfer via reserve (AssetHub)
  XcmV5Instruction.InitiateTransfer({
    destination: {
      parents: 1,
      interior: XcmV5Junctions.X1([XcmV5Junction.Parachain(destinationParaId)]),
    },
    remote_fees: Some(
      XcmV5AssetTransferFilter.ReserveDeposit(
        XcmV5AssetFilter.Wild(XcmV5WildAsset.All),
      ),
    ),
    assets: [usdcAsset],
    remote_xcm: [
      XcmV5Instruction.DepositAsset({
        assets: XcmV5AssetFilter.Wild(XcmV5WildAsset.All),
        beneficiary: accountOnDestination,
      }),
    ],
  }),
]);
```

## USDC Transfer Implementation

### From EVM (Moonbeam/Astar) to Substrate Parachain

```solidity
// Solidity contract on EVM parachain
contract USDCBridge {
    // XCM Precompile addresses
    address constant XCM_UTILS = 0x0000000000000000000000000000000000000803;
    address constant ASSET_PRECOMPILE = 0x0800000000000000000000000000000000000539; // USDC

    function donateToParachain(
        uint32 destinationParaId,
        bytes32 substrateAccount,
        uint256 usdcAmount
    ) external {
        // 1. Ensure user has approved USDC
        require(IERC20(ASSET_PRECOMPILE).allowance(msg.sender, address(this)) >= usdcAmount);

        // 2. Build XCM message for reserve transfer
        bytes memory xcmMessage = buildReserveTransferXCM(
            destinationParaId,
            substrateAccount,
            usdcAmount
        );

        // 3. Execute via XCM precompile
        IXcmUtils(XCM_UTILS).execute(xcmMessage);
    }

    function buildReserveTransferXCM(
        uint32 paraId,
        bytes32 account,
        uint256 amount
    ) internal pure returns (bytes memory) {
        // Build XCM V5 message following Francisco's pattern
        return abi.encode(
            // WithdrawAsset
            // PayFees
            // InitiateTransfer with ReserveDeposit
        );
    }
}
```

### JavaScript/TypeScript Implementation with PAPI

```typescript
import { createClient } from "polkadot-api";
import { XcmVersionedXcm, XcmV5Instruction } from "@polkadot-api/descriptors";

async function sendUSDCCrossChain(
  fromParaId: number,
  toParaId: number,
  recipientAddress: string,
  amount: bigint,
) {
  const client = createClient(/* ... */);

  // Build reserve transfer XCM (not teleport!)
  const xcmMessage = XcmVersionedXcm.V5([
    // Step 1: Withdraw USDC from sender's account
    XcmV5Instruction.WithdrawAsset([
      {
        id: {
          parents: 0,
          interior: {
            X2: [
              { PalletInstance: 50 }, // Assets pallet
              { GeneralIndex: 1337 }, // USDC ID
            ],
          },
        },
        fun: { Fungible: amount },
      },
    ]),

    // Step 2: Buy execution on destination
    XcmV5Instruction.BuyExecution({
      fees: {
        /* fee asset */
      },
      weight_limit: { Unlimited: null },
    }),

    // Step 3: Reserve transfer through AssetHub
    XcmV5Instruction.InitiateTransfer({
      destination: {
        parents: 1,
        interior: { X1: [{ Parachain: toParaId }] },
      },
      remote_fees: {
        ReserveDeposit: { Wild: { All: null } },
      },
      assets: [
        /* USDC asset */
      ],
      remote_xcm: [
        XcmV5Instruction.DepositAsset({
          assets: { Wild: { All: null } },
          beneficiary: {
            parents: 0,
            interior: {
              X1: [{ AccountId32: { id: recipientAddress } }],
            },
          },
        }),
      ],
    }),
  ]);

  // Send via polkadotXcm pallet
  await client.tx.polkadotXcm.send(dest, xcmMessage).signAndSubmit(signer);
}
```

## Key Differences: Teleport vs Reserve Transfer

| Aspect             | Teleport              | Reserve Transfer         |
| ------------------ | --------------------- | ------------------------ |
| **Trust Model**    | Full trust required   | No trust needed          |
| **Asset Location** | Destroyed & recreated | Held in reserve          |
| **Use Case**       | DOT/KSM only          | Custom assets (USDC)     |
| **Security**       | Risk if trust breaks  | Safer, backed by reserve |
| **AssetHub Role**  | Pass-through          | Holds actual assets      |

## USDC Specific Configuration

### Asset Location on AssetHub

```typescript
const USDC_LOCATION = {
  parents: 0,
  interior: {
    X2: [
      { PalletInstance: 50 }, // Assets pallet
      { GeneralIndex: 1337 }, // USDC Asset ID on Paseo
    ],
  },
};
```

### Sovereign Account Derivation

Each parachain has a sovereign account on AssetHub:

```typescript
// Parachain 2000's sovereign account on AssetHub
const sovereignAccount = deriveSovereignAccount(2000);
// This account holds the parachain's reserves
```

### Fee Payment Strategy

```typescript
// USDC is "sufficient" - can pay its own fees
const fees = {
  id: USDC_LOCATION,
  fun: { Fungible: 1_000_000n }, // 1 USDC for fees
};
```

## Testing with Chopsticks

```bash
# Fork AssetHub to test with real USDC
npx @acala-network/chopsticks \
  --endpoint wss://paseo-asset-hub-rpc.dwellir.com \
  --port 8000

# USDC will be available at asset ID 1337
# Test accounts already have balances
```

## Common Pitfalls to Avoid

1. **❌ Don't use Teleport for USDC** - It will fail
2. **❌ Don't forget fee payment** - Transaction will be rejected
3. **❌ Don't hardcode locations** - Use configuration
4. **✅ Always use Reserve Transfer for custom assets**
5. **✅ Ensure sufficient balance for fees**
6. **✅ Verify destination chain accepts the asset**

## References

- [Francisco Aguirre's XCM Gist](https://gist.github.com/franciscoaguirre/a6dea0c55e81faba65bedf700033a1a2)
- [XCM Format Specification](https://github.com/paritytech/xcm-format)
- [PBA Cohort 7 XCM Module](../pba-content/syllabus/3a-Protocol_On-Chain/XCM/)
- [Polkadot Wiki on XCM](https://wiki.polkadot.network/docs/learn-xcm)
