#!/bin/bash

echo "📝 Creating OmniNode Chain Spec with Revive..."
echo "=============================================="

OUTPUT_FILE="./omninode-chain-spec.json"

cat > $OUTPUT_FILE << 'EOF'
{
  "name": "TipsyDot EVM Local",
  "id": "tipsydot_evm_local",
  "chainType": "Local",
  "bootNodes": [],
  "telemetryEndpoints": null,
  "protocolId": "tipsydot",
  "properties": {
    "tokenDecimals": 18,
    "tokenSymbol": "TDOT",
    "ss58Format": 42
  },
  "relay_chain": "paseo-local",
  "para_id": 2000,
  "codeSubstitutes": {},
  "genesis": {
    "runtime": {
      "balances": {
        "balances": [
          ["5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY", 1000000000000000000000],
          ["5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty", 1000000000000000000000],
          ["5FLSigC9HGRKVhB9FiEo4Y3koPsNmBmLJbpXg2mp1hXcS59Y", 1000000000000000000000]
        ]
      },
      "revive": {
        "config": {
          "gasPrice": 1000000000,
          "existentialDeposit": 1,
          "maxCodeSize": 262144,
          "maxStorageSize": 131072
        }
      },
      "assets": {
        "assets": [
          [
            1337,
            "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
            true,
            1
          ]
        ],
        "metadata": [
          [
            1337,
            "USD Coin",
            "USDC",
            6
          ]
        ],
        "accounts": []
      },
      "assetRegistry": {
        "assetLocations": [
          [
            1337,
            {
              "parents": 1,
              "interior": {
                "X3": [
                  { "Parachain": 1000 },
                  { "PalletInstance": 50 },
                  { "GeneralIndex": 1337 }
                ]
              }
            }
          ]
        ]
      },
      "polkadotXcm": {
        "safeXcmVersion": 4
      },
      "parachainInfo": {
        "parachainId": 2000
      },
      "aura": {
        "authorities": [
          "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY"
        ]
      },
      "auraExt": {},
      "parachainSystem": {}
    }
  }
}
EOF

echo "✅ Chain spec created at: $OUTPUT_FILE"
echo ""
echo "Configuration:"
echo "  - Para ID: 2000"
echo "  - Token: TDOT (18 decimals)"
echo "  - USDC Asset ID: 1337"
echo "  - Revive pallet enabled"
echo "  - Pre-funded accounts: Alice, Bob, Charlie"