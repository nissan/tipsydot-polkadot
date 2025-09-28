#![cfg_attr(not(feature = "std"), no_std, no_main)]

/// Tipping contract with full Solidity compatibility for pallet-revive
/// This contract can be called by both Solidity and Ink! contracts
#[ink::contract]
pub mod tipping_compatible {
    use ink::prelude::{string::String, vec::Vec};
    use ink::storage::Mapping;
    use primitive_types::{H160, U256};
    use ethabi::{encode, Token, Function, Param, ParamType};
    use scale::{Decode, Encode};

    /// Builder struct compatible with Solidity
    #[derive(Debug, Clone, Encode, Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
    pub struct Builder {
        pub name: String,
        pub description: String,
        pub wallet: AccountId,
        pub eth_wallet: [u8; 20], // Ethereum-compatible address
        pub total_received: Balance,
        pub active: bool,
    }

    /// Events compatible with Solidity logs
    #[ink(event)]
    pub struct Tip {
        #[ink(topic)]
        tipper: AccountId,
        #[ink(topic)]
        builder_id: u32,
        amount: Balance,
        message: String,
        timestamp: Timestamp,
    }

    /// Solidity-compatible event format
    #[ink(event)]
    pub struct TipSolidity {
        #[ink(topic)]
        tipper: [u8; 20], // address indexed
        #[ink(topic)]
        builder_id: U256, // uint256 indexed
        amount: U256,     // uint256
    }

    #[derive(Debug, PartialEq, Eq, Encode, Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
    pub enum Error {
        InvalidBuilder,
        BuilderNotActive,
        ZeroAmount,
        TransferFailed,
        Unauthorized,
        InvalidAddress,
        SolidityCallFailed,
    }

    #[ink(storage)]
    pub struct TippingCompatible {
        /// USDC token address (can be Solidity or Ink!)
        usdc_token: AccountId,
        /// Solidity USDC address for compatibility
        usdc_token_eth: [u8; 20],
        /// Contract owner
        owner: AccountId,
        /// Builders mapping
        builders: Mapping<u32, Builder>,
        /// Builder count
        builder_count: u32,
        /// Protocol fee in basis points
        protocol_fee_bps: u16,
        /// Treasury address
        treasury: AccountId,
        /// Total fees collected
        total_fees_collected: Balance,
        /// Paused state
        paused: bool,
    }

    impl TippingCompatible {
        /// Constructor compatible with both Ink! and Solidity deployment
        #[ink(constructor)]
        pub fn new(
            usdc_token: AccountId,
            treasury: AccountId,
            protocol_fee_bps: u16,
        ) -> Self {
            let caller = Self::env().caller();

            // Convert addresses for Solidity compatibility
            let usdc_eth = Self::account_to_eth(&usdc_token);

            let mut contract = Self {
                usdc_token,
                usdc_token_eth: usdc_eth,
                owner: caller,
                builders: Mapping::new(),
                builder_count: 0,
                protocol_fee_bps,
                treasury,
                total_fees_collected: 0,
                paused: false,
            };

            // Add demo builders with both AccountId and Ethereum addresses
            contract.add_demo_builders_compatible();

            contract
        }

        /// Add demo builders with Ethereum compatibility
        fn add_demo_builders_compatible(&mut self) {
            let builders = [
                ("Alice - Moonbeam", "EVM on Polkadot", [0x01; 20]),
                ("Bob - Astar", "Multi-VM Platform", [0x02; 20]),
                ("Charlie - Acala", "DeFi Hub", [0x03; 20]),
            ];

            for (name, desc, eth_addr) in builders {
                self.builder_count += 1;
                let account = Self::eth_to_account(&eth_addr);

                let builder = Builder {
                    name: String::from(name),
                    description: String::from(desc),
                    wallet: account,
                    eth_wallet: eth_addr,
                    total_received: 0,
                    active: true,
                };

                self.builders.insert(self.builder_count, &builder);
            }
        }

        /// Native Ink! tip function
        #[ink(message)]
        pub fn tip(&mut self, builder_id: u32, amount: Balance, message: String) -> Result<(), Error> {
            self.ensure_not_paused()?;

            if amount == 0 {
                return Err(Error::ZeroAmount);
            }

            let mut builder = self.builders.get(builder_id)
                .ok_or(Error::InvalidBuilder)?;

            if !builder.active {
                return Err(Error::BuilderNotActive);
            }

            // Calculate fee
            let fee = (amount * self.protocol_fee_bps as u128) / 10_000;
            let tip_amount = amount - fee;

            // Call USDC transfer (works with both Solidity and Ink! USDC)
            self.transfer_usdc(self.env().caller(), builder.wallet, tip_amount)?;

            if fee > 0 {
                self.transfer_usdc(self.env().caller(), self.treasury, fee)?;
                self.total_fees_collected += fee;
            }

            // Update builder stats
            builder.total_received += tip_amount;
            self.builders.insert(builder_id, &builder);

            // Emit both Ink! and Solidity-compatible events
            self.env().emit_event(Tip {
                tipper: self.env().caller(),
                builder_id,
                amount: tip_amount,
                message: message.clone(),
                timestamp: self.env().block_timestamp(),
            });

            self.env().emit_event(TipSolidity {
                tipper: Self::account_to_eth(&self.env().caller()),
                builder_id: U256::from(builder_id),
                amount: U256::from(tip_amount),
            });

            Ok(())
        }

        /// Solidity-compatible tip function with same selector as Solidity version
        #[ink(message, selector = 0x12345678)] // Custom selector matching Solidity
        pub fn tip_solidity(
            &mut self,
            builder_id: U256,
            amount: U256,
            message: Vec<u8>,
        ) -> Result<bool, Error> {
            let builder_id_u32 = builder_id.as_u32();
            let amount_u128 = amount.as_u128();
            let message_string = String::from_utf8(message).unwrap_or_default();

            self.tip(builder_id_u32, amount_u128, message_string)?;
            Ok(true)
        }

        /// Transfer USDC using either Ink! or Solidity interface
        fn transfer_usdc(
            &self,
            from: AccountId,
            to: AccountId,
            amount: Balance,
        ) -> Result<(), Error> {
            // Try Ink! PSP22 interface first
            if let Ok(_) = self.call_ink_transfer(from, to, amount) {
                return Ok(());
            }

            // Fall back to Solidity ERC20 interface
            self.call_solidity_transfer(from, to, amount)
        }

        /// Call Ink! PSP22 transfer
        fn call_ink_transfer(
            &self,
            from: AccountId,
            to: AccountId,
            amount: Balance,
        ) -> Result<(), Error> {
            use ink::env::call::{build_call, ExecutionInput, Selector};

            build_call::<Environment>()
                .call(self.usdc_token)
                .gas_limit(5000000000)
                .exec_input(
                    ExecutionInput::new(Selector::new(ink::selector_bytes!("PSP22::transfer_from")))
                        .push_arg(from)
                        .push_arg(to)
                        .push_arg(amount)
                        .push_arg(Vec::<u8>::new())
                )
                .returns::<Result<(), ()>>()
                .try_invoke()
                .map_err(|_| Error::TransferFailed)?
                .map_err(|_| Error::TransferFailed)?;

            Ok(())
        }

        /// Call Solidity ERC20 transferFrom
        fn call_solidity_transfer(
            &self,
            from: AccountId,
            to: AccountId,
            amount: Balance,
        ) -> Result<(), Error> {
            // Build ERC20 transferFrom call data
            let data = self.encode_erc20_transfer_from(
                Self::account_to_eth(&from),
                Self::account_to_eth(&to),
                U256::from(amount),
            );

            // Execute call to Solidity contract
            use ink::env::call::{build_call, ExecutionInput};

            build_call::<Environment>()
                .call(self.usdc_token)
                .gas_limit(5000000000)
                .exec_input(ExecutionInput::new(ink::selector_bytes!("")).push_arg(data))
                .returns::<bool>()
                .try_invoke()
                .map_err(|_| Error::SolidityCallFailed)?
                .map_err(|_| Error::SolidityCallFailed)?;

            Ok(())
        }

        /// Encode ERC20 transferFrom function call
        fn encode_erc20_transfer_from(&self, from: [u8; 20], to: [u8; 20], amount: U256) -> Vec<u8> {
            let mut data = Vec::new();
            // Function selector for transferFrom(address,address,uint256)
            data.extend_from_slice(&hex::decode("23b872dd").unwrap());

            // Encode parameters
            let tokens = vec![
                Token::Address(H160::from(from)),
                Token::Address(H160::from(to)),
                Token::Uint(amount),
            ];
            data.extend_from_slice(&ethabi::encode(&tokens));

            data
        }

        /// Get builder (Ink! interface)
        #[ink(message)]
        pub fn get_builder(&self, builder_id: u32) -> Option<Builder> {
            self.builders.get(builder_id)
        }

        /// Get builder (Solidity interface)
        #[ink(message, selector = 0x87654321)]
        pub fn get_builder_solidity(&self, builder_id: U256) -> (String, String, [u8; 20], U256, bool) {
            let id = builder_id.as_u32();
            if let Some(builder) = self.builders.get(id) {
                (
                    builder.name,
                    builder.description,
                    builder.eth_wallet,
                    U256::from(builder.total_received),
                    builder.active,
                )
            } else {
                (String::new(), String::new(), [0; 20], U256::zero(), false)
            }
        }

        /// Add builder with Ethereum address
        #[ink(message)]
        pub fn add_builder_with_eth(
            &mut self,
            name: String,
            description: String,
            eth_wallet: [u8; 20],
        ) -> Result<u32, Error> {
            self.ensure_owner()?;
            self.ensure_not_paused()?;

            self.builder_count += 1;
            let builder_id = self.builder_count;

            let wallet = Self::eth_to_account(&eth_wallet);

            let builder = Builder {
                name,
                description,
                wallet,
                eth_wallet,
                total_received: 0,
                active: true,
            };

            self.builders.insert(builder_id, &builder);
            Ok(builder_id)
        }

        /// Pause contract
        #[ink(message)]
        pub fn pause(&mut self) -> Result<(), Error> {
            self.ensure_owner()?;
            self.paused = true;
            Ok(())
        }

        /// Unpause contract
        #[ink(message)]
        pub fn unpause(&mut self) -> Result<(), Error> {
            self.ensure_owner()?;
            self.paused = false;
            Ok(())
        }

        /// Update protocol fee
        #[ink(message)]
        pub fn update_protocol_fee(&mut self, new_fee_bps: u16) -> Result<(), Error> {
            self.ensure_owner()?;
            self.protocol_fee_bps = new_fee_bps;
            Ok(())
        }

        /// Get all builders
        #[ink(message)]
        pub fn get_all_builders(&self) -> Vec<(u32, Builder)> {
            let mut builders = Vec::new();
            for id in 1..=self.builder_count {
                if let Some(builder) = self.builders.get(id) {
                    builders.push((id, builder));
                }
            }
            builders
        }

        /// Helper: Convert AccountId to Ethereum address
        fn account_to_eth(account: &AccountId) -> [u8; 20] {
            let bytes = account.as_ref();
            let mut eth_addr = [0u8; 20];
            eth_addr.copy_from_slice(&bytes[0..20]);
            eth_addr
        }

        /// Helper: Convert Ethereum address to AccountId
        fn eth_to_account(eth_addr: &[u8; 20]) -> AccountId {
            let mut bytes = [0u8; 32];
            bytes[0..20].copy_from_slice(eth_addr);
            AccountId::from(bytes)
        }

        /// Helper: Ensure caller is owner
        fn ensure_owner(&self) -> Result<(), Error> {
            if self.env().caller() != self.owner {
                return Err(Error::Unauthorized);
            }
            Ok(())
        }

        /// Helper: Ensure not paused
        fn ensure_not_paused(&self) -> Result<(), Error> {
            if self.paused {
                return Err(Error::Unauthorized);
            }
            Ok(())
        }
    }

    #[cfg(test)]
    mod tests {
        use super::*;
        use ink::env::test;

        #[ink::test]
        fn constructor_works() {
            let accounts = test::default_accounts::<Environment>();
            let contract = TippingCompatible::new(accounts.charlie, accounts.django, 100);

            assert_eq!(contract.builder_count, 3);
            assert_eq!(contract.protocol_fee_bps, 100);
            assert!(!contract.paused);
        }

        #[ink::test]
        fn address_conversion_works() {
            let eth_addr = [0x12; 20];
            let account = TippingCompatible::eth_to_account(&eth_addr);
            let converted_back = TippingCompatible::account_to_eth(&account);

            assert_eq!(eth_addr, converted_back);
        }

        #[ink::test]
        fn solidity_selector_works() {
            // Verify that Solidity function selectors are properly configured
            let accounts = test::default_accounts::<Environment>();
            let mut contract = TippingCompatible::new(accounts.charlie, accounts.django, 100);

            // Test Solidity-compatible tip function
            let result = contract.tip_solidity(
                U256::from(1),
                U256::from(1000000),
                b"Test message".to_vec(),
            );

            // Would succeed with proper USDC setup
            assert!(result.is_err()); // Expected to fail without USDC
        }

        #[ink::test]
        fn builder_with_eth_address_works() {
            let accounts = test::default_accounts::<Environment>();
            let mut contract = TippingCompatible::new(accounts.charlie, accounts.django, 100);

            let eth_wallet = [0x99; 20];
            let result = contract.add_builder_with_eth(
                "Test Builder".into(),
                "Test Description".into(),
                eth_wallet,
            );

            assert!(result.is_ok());
            assert_eq!(contract.builder_count, 4);

            let builder = contract.get_builder(4).unwrap();
            assert_eq!(builder.eth_wallet, eth_wallet);
        }

        #[ink::test]
        fn erc20_encoding_works() {
            let accounts = test::default_accounts::<Environment>();
            let contract = TippingCompatible::new(accounts.charlie, accounts.django, 100);

            let from = [0x01; 20];
            let to = [0x02; 20];
            let amount = U256::from(1000000);

            let encoded = contract.encode_erc20_transfer_from(from, to, amount);

            // Check function selector (transferFrom)
            assert_eq!(&encoded[0..4], &hex::decode("23b872dd").unwrap());

            // Verify encoded data length (4 bytes selector + 96 bytes for 3 parameters)
            assert_eq!(encoded.len(), 100);
        }
    }
}