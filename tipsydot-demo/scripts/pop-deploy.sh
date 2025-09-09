#!/bin/bash

# Deploy using Pop CLI
# For PBA Cohort 7 - Leveraging Pop CLI for smart contract deployment

set -e

echo "🚀 TipsyDot Deployment with Pop CLI"
echo "====================================="

# Check if pop is installed
if ! command -v pop &> /dev/null; then
    echo "❌ Pop CLI not found. Installing..."
    cargo install --git https://github.com/r0gue-io/pop-cli
fi

# Initialize Pop project if not already done
if [ ! -f "Cargo.toml" ] && [ ! -d "contracts/ink" ]; then
    echo "📦 Initializing ink! contracts for comparison..."
    mkdir -p contracts/ink
    
    # Create an ink! version of our donation contract
    cat > contracts/ink/Cargo.toml << 'EOF'
[package]
name = "tipsydot-donation"
version = "0.1.0"
edition = "2021"

[dependencies]
ink = { version = "5.0", default-features = false }
scale = { package = "parity-scale-codec", version = "3", default-features = false, features = ["derive"] }
scale-info = { version = "2.11", default-features = false, features = ["derive"] }

[lib]
path = "lib.rs"

[features]
default = ["std"]
std = [
    "ink/std",
    "scale/std",
    "scale-info/std",
]
EOF

    cat > contracts/ink/lib.rs << 'EOF'
#![cfg_attr(not(feature = "std"), no_std, no_main)]

#[ink::contract]
mod xcm_donation {
    use ink::prelude::vec::Vec;
    use ink::storage::Mapping;

    #[ink(storage)]
    pub struct XcmDonation {
        builders: Mapping<u32, Builder>,
        builder_count: u32,
        owner: AccountId,
    }

    #[derive(Debug, Clone, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
    pub struct Builder {
        name: Vec<u8>,
        project: Vec<u8>,
        substrate_address: [u8; 32],
        para_id: u32,
        total_received: Balance,
        active: bool,
    }

    impl XcmDonation {
        #[ink(constructor)]
        pub fn new() -> Self {
            let mut instance = Self {
                builders: Mapping::default(),
                builder_count: 0,
                owner: Self::env().caller(),
            };
            
            // Initialize default builders
            instance.add_builder(
                b"Alice - Moonbeam".to_vec(),
                b"EVM Smart Contracts".to_vec(),
                [0x8e; 32], // Simplified address
                2004,
            );
            
            instance
        }

        #[ink(message)]
        pub fn donate_via_xcm(&mut self, builder_id: u32, amount: Balance) -> Result<(), Error> {
            // Simplified XCM donation logic
            let builder = self.builders.get(builder_id)
                .ok_or(Error::InvalidBuilder)?;
            
            if !builder.active {
                return Err(Error::BuilderNotActive);
            }
            
            // In production, this would trigger actual XCM transfer
            self.env().emit_event(DonationSent {
                donor: self.env().caller(),
                builder_id,
                amount,
            });
            
            Ok(())
        }
        
        fn add_builder(&mut self, name: Vec<u8>, project: Vec<u8>, address: [u8; 32], para_id: u32) {
            let builder = Builder {
                name,
                project,
                substrate_address: address,
                para_id,
                total_received: 0,
                active: true,
            };
            
            self.builders.insert(self.builder_count, &builder);
            self.builder_count += 1;
        }
    }

    #[derive(Debug, PartialEq, Eq, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
    pub enum Error {
        InvalidBuilder,
        BuilderNotActive,
    }

    #[ink(event)]
    pub struct DonationSent {
        #[ink(topic)]
        donor: AccountId,
        builder_id: u32,
        amount: Balance,
    }
}
EOF
fi

# Function to deploy with Pop
deploy_with_pop() {
    echo "🔧 Using Pop CLI for deployment..."
    
    # Check network status
    echo "📡 Checking network status..."
    if pop up parachain --status 2>/dev/null; then
        echo "✅ Parachain is running"
    else
        echo "⚠️  No parachain detected. Starting local parachain..."
        pop up parachain \
            --parachain-id 2000 \
            --relay-chain rococo-local \
            --runtime revive \
            -d || true
    fi
    
    # Deploy contracts
    if [ -f "contracts/ink/lib.rs" ]; then
        echo "📦 Building ink! contracts..."
        cd contracts/ink
        pop build --release
        
        echo "🚀 Deploying ink! contract..."
        pop up contract \
            --constructor new \
            --args "" \
            --gas 0 \
            --proof-size 0 \
            --url ws://localhost:9945
        cd ../..
    fi
    
    echo "✅ Deployment complete with Pop CLI!"
}

# Function to use Pop for XCM setup
setup_xcm_with_pop() {
    echo "🌉 Setting up XCM channels with Pop..."
    
    # Pop can help generate XCM configurations
    cat > xcm-config.json << 'EOF'
{
  "channels": [
    {
      "from": 2000,
      "to": 1000,
      "maxCapacity": 1000,
      "maxMessageSize": 102400
    },
    {
      "from": 1000,
      "to": 2000,
      "maxCapacity": 1000,
      "maxMessageSize": 102400
    }
  ],
  "assets": [
    {
      "id": 1337,
      "name": "USDC",
      "symbol": "USDC",
      "decimals": 6,
      "minBalance": 1
    }
  ]
}
EOF
    
    echo "✅ XCM configuration created"
}

# Main execution
echo "Choose deployment option:"
echo "1. Deploy Solidity contracts (current setup)"
echo "2. Deploy ink! contracts with Pop"
echo "3. Setup XCM channels"
echo "4. Full deployment (all of the above)"

read -p "Enter option (1-4): " option

case $option in
    1)
        echo "📝 Deploying Solidity contracts..."
        node scripts/compile.mjs
        node scripts/deploy-simple.mjs
        ;;
    2)
        deploy_with_pop
        ;;
    3)
        setup_xcm_with_pop
        ;;
    4)
        echo "🎯 Full deployment..."
        node scripts/compile.mjs
        node scripts/deploy-simple.mjs
        deploy_with_pop
        setup_xcm_with_pop
        ;;
    *)
        echo "Invalid option"
        exit 1
        ;;
esac

echo "🎉 Done!"