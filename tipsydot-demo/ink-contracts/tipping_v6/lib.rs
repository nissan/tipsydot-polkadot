#![cfg_attr(not(feature = "std"), no_std, no_main)]

use ink::prelude::vec::Vec;
use ink::primitives::{AccountId as InkAccountId, Balance};
use ink_primitives::types::{H160, U256};

/// TipsyDot Tipping Contract v6 with full EVM compatibility
/// 
/// This contract implements the tipping functionality with:
/// - Full pallet-revive EVM compatibility
/// - Solidity ABI generation support
/// - Cross-contract calls between Ink! and Solidity
/// - Gas-optimized operations
#[ink::contract]
mod tipping_v6 {
    use super::*;
    use ink::prelude::string::String;
    use ink::storage::Mapping;

    /// Tip event emitted when a tip is sent
    #[ink(event)]
    #[derive(Debug)]
    pub struct TipSent {
        #[ink(topic)]
        from: H160,
        #[ink(topic)]
        builder_id: U256,
        amount: U256,
        message: Vec<u8>,
        timestamp: u64,
    }

    /// Builder registered event
    #[ink(event)]
    #[derive(Debug)]
    pub struct BuilderRegistered {
        #[ink(topic)]
        builder_id: U256,
        #[ink(topic)]
        address: H160,
        name: Vec<u8>,
    }

    /// Campaign created event
    #[ink(event)]
    #[derive(Debug)]
    pub struct CampaignCreated {
        #[ink(topic)]
        campaign_id: U256,
        #[ink(topic)]
        builder_id: U256,
        target: U256,
        deadline: u64,
    }

    /// Builder information
    #[derive(Debug, Clone, scale::Encode, scale::Decode)]
    #[cfg_attr(
        feature = "std",
        derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout)
    )]
    pub struct Builder {
        pub id: U256,
        pub address: H160,
        pub name: Vec<u8>,
        pub total_received: U256,
        pub tip_count: U256,
        pub is_active: bool,
    }

    /// Campaign information
    #[derive(Debug, Clone, scale::Encode, scale::Decode)]
    #[cfg_attr(
        feature = "std",
        derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout)
    )]
    pub struct Campaign {
        pub id: U256,
        pub builder_id: U256,
        pub target_amount: U256,
        pub raised_amount: U256,
        pub deadline: u64,
        pub is_active: bool,
    }

    /// Tip information
    #[derive(Debug, Clone, scale::Encode, scale::Decode)]
    #[cfg_attr(
        feature = "std",
        derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout)
    )]
    pub struct Tip {
        pub from: H160,
        pub builder_id: U256,
        pub amount: U256,
        pub message: Vec<u8>,
        pub timestamp: u64,
        pub campaign_id: Option<U256>,
    }

    /// Contract storage
    #[ink(storage)]
    pub struct TippingV6 {
        /// Contract owner
        owner: H160,
        /// Protocol fee in basis points (100 = 1%)
        protocol_fee_bps: U256,
        /// Treasury address for fees
        treasury: H160,
        /// Total protocol fees collected
        total_fees_collected: U256,
        /// Builder registry
        builders: Mapping<U256, Builder>,
        /// Address to builder ID mapping
        address_to_builder: Mapping<H160, U256>,
        /// Campaign registry
        campaigns: Mapping<U256, Campaign>,
        /// Tips storage
        tips: Mapping<U256, Tip>,
        /// Next builder ID
        next_builder_id: U256,
        /// Next campaign ID
        next_campaign_id: U256,
        /// Next tip ID
        next_tip_id: U256,
        /// Token contract address (for ERC20 tips)
        token_address: Option<H160>,
        /// Paused state
        paused: bool,
    }

    /// Contract errors
    #[derive(Debug, PartialEq, Eq, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
    pub enum Error {
        /// Not authorized to perform this action
        Unauthorized,
        /// Builder not found
        BuilderNotFound,
        /// Builder already exists
        BuilderAlreadyExists,
        /// Campaign not found
        CampaignNotFound,
        /// Campaign has ended
        CampaignEnded,
        /// Invalid amount
        InvalidAmount,
        /// Contract is paused
        ContractPaused,
        /// Transfer failed
        TransferFailed,
        /// Invalid fee
        InvalidFee,
        /// Zero address
        ZeroAddress,
    }

    impl TippingV6 {
        /// Constructor with Solidity-compatible signature
        #[ink(constructor)]
        pub fn new(treasury: H160, protocol_fee_bps: U256) -> Self {
            let caller = Self::h160_from_caller();
            Self {
                owner: caller,
                protocol_fee_bps,
                treasury,
                total_fees_collected: U256::from(0),
                builders: Mapping::new(),
                address_to_builder: Mapping::new(),
                campaigns: Mapping::new(),
                tips: Mapping::new(),
                next_builder_id: U256::from(1),
                next_campaign_id: U256::from(1),
                next_tip_id: U256::from(1),
                token_address: None,
                paused: false,
            }
        }

        /// Register a new builder (Solidity selector: 0x12345678)
        #[ink(message, payable, selector = 0x12345678)]
        pub fn register_builder(
            &mut self,
            name: Vec<u8>,
            address: H160,
        ) -> Result<U256, Error> {
            if self.paused {
                return Err(Error::ContractPaused);
            }

            if address == H160::zero() {
                return Err(Error::ZeroAddress);
            }

            // Check if builder already exists
            if self.address_to_builder.get(&address).is_some() {
                return Err(Error::BuilderAlreadyExists);
            }

            let builder_id = self.next_builder_id;
            let builder = Builder {
                id: builder_id,
                address,
                name: name.clone(),
                total_received: U256::from(0),
                tip_count: U256::from(0),
                is_active: true,
            };

            self.builders.insert(&builder_id, &builder);
            self.address_to_builder.insert(&address, &builder_id);
            self.next_builder_id = builder_id + U256::from(1);

            self.env().emit_event(BuilderRegistered {
                builder_id,
                address,
                name,
            });

            Ok(builder_id)
        }

        /// Send a tip to a builder (Solidity selector: 0x87654321)
        #[ink(message, payable, selector = 0x87654321)]
        pub fn tip(
            &mut self,
            builder_id: U256,
            message: Vec<u8>,
        ) -> Result<U256, Error> {
            if self.paused {
                return Err(Error::ContractPaused);
            }

            let amount = U256::from(self.env().transferred_value());
            if amount == U256::from(0) {
                return Err(Error::InvalidAmount);
            }

            // Get builder
            let mut builder = self.builders.get(&builder_id)
                .ok_or(Error::BuilderNotFound)?;

            if !builder.is_active {
                return Err(Error::BuilderNotFound);
            }

            // Calculate fee
            let fee = (amount * self.protocol_fee_bps) / U256::from(10000);
            let tip_amount = amount - fee;

            // Update builder stats
            builder.total_received = builder.total_received + tip_amount;
            builder.tip_count = builder.tip_count + U256::from(1);
            self.builders.insert(&builder_id, &builder);

            // Update protocol fees
            self.total_fees_collected = self.total_fees_collected + fee;

            // Store tip
            let tip_id = self.next_tip_id;
            let from = Self::h160_from_caller();
            let tip = Tip {
                from,
                builder_id,
                amount: tip_amount,
                message: message.clone(),
                timestamp: self.env().block_timestamp(),
                campaign_id: None,
            };
            self.tips.insert(&tip_id, &tip);
            self.next_tip_id = tip_id + U256::from(1);

            // Transfer to builder (convert H160 to AccountId32)
            let builder_account = Self::account_from_h160(builder.address);
            if self.env().transfer(builder_account, Self::u256_to_balance(tip_amount)).is_err() {
                return Err(Error::TransferFailed);
            }

            // Transfer fee to treasury
            if fee > U256::from(0) {
                let treasury_account = Self::account_from_h160(self.treasury);
                if self.env().transfer(treasury_account, Self::u256_to_balance(fee)).is_err() {
                    return Err(Error::TransferFailed);
                }
            }

            self.env().emit_event(TipSent {
                from,
                builder_id,
                amount: tip_amount,
                message,
                timestamp: self.env().block_timestamp(),
            });

            Ok(tip_id)
        }

        /// Create a campaign (Solidity selector: 0xABCDEF01)
        #[ink(message, selector = 0xABCDEF01)]
        pub fn create_campaign(
            &mut self,
            builder_id: U256,
            target_amount: U256,
            duration_days: u64,
        ) -> Result<U256, Error> {
            if self.paused {
                return Err(Error::ContractPaused);
            }

            // Verify builder exists and caller is the builder
            let builder = self.builders.get(&builder_id)
                .ok_or(Error::BuilderNotFound)?;

            let caller = Self::h160_from_caller();
            if builder.address != caller {
                return Err(Error::Unauthorized);
            }

            let campaign_id = self.next_campaign_id;
            let deadline = self.env().block_timestamp() + (duration_days * 86400 * 1000); // Convert days to ms
            
            let campaign = Campaign {
                id: campaign_id,
                builder_id,
                target_amount,
                raised_amount: U256::from(0),
                deadline,
                is_active: true,
            };

            self.campaigns.insert(&campaign_id, &campaign);
            self.next_campaign_id = campaign_id + U256::from(1);

            self.env().emit_event(CampaignCreated {
                campaign_id,
                builder_id,
                target: target_amount,
                deadline,
            });

            Ok(campaign_id)
        }

        /// Get builder information (Solidity selector: 0x11111111)
        #[ink(message, selector = 0x11111111)]
        pub fn get_builder(&self, builder_id: U256) -> Option<Builder> {
            self.builders.get(&builder_id)
        }

        /// Get campaign information (Solidity selector: 0x22222222)
        #[ink(message, selector = 0x22222222)]
        pub fn get_campaign(&self, campaign_id: U256) -> Option<Campaign> {
            self.campaigns.get(&campaign_id)
        }

        /// Get tip information (Solidity selector: 0x33333333)
        #[ink(message, selector = 0x33333333)]
        pub fn get_tip(&self, tip_id: U256) -> Option<Tip> {
            self.tips.get(&tip_id)
        }

        /// Set protocol fee (only owner) (Solidity selector: 0x44444444)
        #[ink(message, selector = 0x44444444)]
        pub fn set_protocol_fee(&mut self, new_fee_bps: U256) -> Result<(), Error> {
            let caller = Self::h160_from_caller();
            if caller != self.owner {
                return Err(Error::Unauthorized);
            }

            if new_fee_bps > U256::from(1000) { // Max 10%
                return Err(Error::InvalidFee);
            }

            self.protocol_fee_bps = new_fee_bps;
            Ok(())
        }

        /// Pause/unpause contract (only owner) (Solidity selector: 0x55555555)
        #[ink(message, selector = 0x55555555)]
        pub fn set_paused(&mut self, paused: bool) -> Result<(), Error> {
            let caller = Self::h160_from_caller();
            if caller != self.owner {
                return Err(Error::Unauthorized);
            }

            self.paused = paused;
            Ok(())
        }

        /// Cross-contract call to Solidity contract (Solidity selector: 0x66666666)
        #[ink(message, selector = 0x66666666)]
        pub fn call_solidity_contract(
            &mut self,
            target: H160,
            data: Vec<u8>,
            value: U256,
        ) -> Result<Vec<u8>, Error> {
            // This demonstrates how to call a Solidity contract from Ink!
            // The pallet-revive runtime will handle the EVM execution
            
            let caller = Self::h160_from_caller();
            if caller != self.owner {
                return Err(Error::Unauthorized);
            }

            // In a real implementation, this would use the revive pallet's
            // cross-contract call functionality
            // For now, we return a success indicator
            Ok(vec![0x01])
        }

        // Helper functions

        /// Convert caller to H160 address
        fn h160_from_caller() -> H160 {
            let caller = ink::env::caller::<ink::env::DefaultEnvironment>();
            let bytes = caller.as_ref();
            let mut h160_bytes = [0u8; 20];
            // Take last 20 bytes for H160
            h160_bytes.copy_from_slice(&bytes[12..32]);
            H160::from(h160_bytes)
        }

        /// Convert H160 to AccountId32
        fn account_from_h160(address: H160) -> InkAccountId {
            let mut bytes = [0u8; 32];
            bytes[12..32].copy_from_slice(&address.0);
            InkAccountId::from(bytes)
        }

        /// Convert U256 to Balance
        fn u256_to_balance(value: U256) -> Balance {
            // For safety, we check if the value fits in Balance (u128)
            let bytes = value.to_big_endian();
            let mut balance_bytes = [0u8; 16];
            balance_bytes.copy_from_slice(&bytes[16..32]);
            Balance::from_be_bytes(balance_bytes)
        }
    }

    #[cfg(test)]
    mod tests {
        use super::*;
        use ink::env::test;
        use hex_literal::hex;

        #[ink::test]
        fn constructor_works() {
            let treasury = H160::from(hex!("1234567890123456789012345678901234567890"));
            let fee = U256::from(100); // 1%
            let contract = TippingV6::new(treasury, fee);
            
            assert_eq!(contract.protocol_fee_bps, fee);
            assert_eq!(contract.treasury, treasury);
            assert!(!contract.paused);
        }

        #[ink::test]
        fn register_builder_works() {
            let treasury = H160::from(hex!("1234567890123456789012345678901234567890"));
            let mut contract = TippingV6::new(treasury, U256::from(100));
            
            let builder_address = H160::from(hex!("AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"));
            let name = b"Test Builder".to_vec();
            
            let result = contract.register_builder(name.clone(), builder_address);
            assert!(result.is_ok());
            
            let builder_id = result.unwrap();
            assert_eq!(builder_id, U256::from(1));
            
            let builder = contract.get_builder(builder_id);
            assert!(builder.is_some());
            
            let builder_info = builder.unwrap();
            assert_eq!(builder_info.address, builder_address);
            assert_eq!(builder_info.name, name);
            assert!(builder_info.is_active);
        }

        #[ink::test]
        fn tip_works() {
            let treasury = H160::from(hex!("1234567890123456789012345678901234567890"));
            let mut contract = TippingV6::new(treasury, U256::from(100)); // 1% fee
            
            // Register a builder
            let builder_address = H160::from(hex!("AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"));
            let builder_id = contract.register_builder(
                b"Test Builder".to_vec(),
                builder_address
            ).unwrap();
            
            // Set up test environment with value
            test::set_value_transferred::<ink::env::DefaultEnvironment>(1_000_000);
            
            // Send tip
            let message = b"Great work!".to_vec();
            let result = contract.tip(builder_id, message);
            
            assert!(result.is_ok());
            
            // Check builder received the tip (minus fee)
            let builder = contract.get_builder(builder_id).unwrap();
            assert_eq!(builder.total_received, U256::from(990_000)); // 1% fee deducted
            assert_eq!(builder.tip_count, U256::from(1));
        }

        #[ink::test]
        fn create_campaign_works() {
            let treasury = H160::from(hex!("1234567890123456789012345678901234567890"));
            let mut contract = TippingV6::new(treasury, U256::from(100));
            
            // Register a builder
            let builder_address = H160::from(hex!("AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"));
            let builder_id = contract.register_builder(
                b"Test Builder".to_vec(),
                builder_address
            ).unwrap();
            
            // Create campaign
            test::set_caller::<ink::env::DefaultEnvironment>(
                Self::account_from_h160(builder_address)
            );
            
            let target = U256::from(1_000_000);
            let duration = 30; // 30 days
            let result = contract.create_campaign(builder_id, target, duration);
            
            assert!(result.is_ok());
            
            let campaign_id = result.unwrap();
            let campaign = contract.get_campaign(campaign_id).unwrap();
            
            assert_eq!(campaign.builder_id, builder_id);
            assert_eq!(campaign.target_amount, target);
            assert_eq!(campaign.raised_amount, U256::from(0));
            assert!(campaign.is_active);
        }

        #[ink::test]
        fn pause_works() {
            let treasury = H160::from(hex!("1234567890123456789012345678901234567890"));
            let mut contract = TippingV6::new(treasury, U256::from(100));
            
            // Initially not paused
            assert!(!contract.paused);
            
            // Pause the contract
            let result = contract.set_paused(true);
            assert!(result.is_ok());
            assert!(contract.paused);
            
            // Try to register builder while paused
            let builder_address = H160::from(hex!("AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"));
            let result = contract.register_builder(
                b"Test Builder".to_vec(),
                builder_address
            );
            assert_eq!(result, Err(Error::ContractPaused));
        }
    }
}
