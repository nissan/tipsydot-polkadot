#![cfg_attr(not(feature = "std"), no_std, no_main)]

#[ink::contract]
pub mod tipping {
    use ink::prelude::{string::String, vec::Vec};
    use ink::storage::Mapping;
    use openbrush::contracts::psp22::PSP22Ref;
    use scale::{Decode, Encode};

    /// A parachain builder receiving tips
    #[derive(Debug, Clone, Encode, Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
    pub struct Builder {
        pub name: String,
        pub description: String,
        pub wallet: AccountId,
        pub total_received: Balance,
        pub active: bool,
    }

    /// Events emitted by the contract
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

    #[ink(event)]
    pub struct BuilderAdded {
        #[ink(topic)]
        builder_id: u32,
        name: String,
        wallet: AccountId,
    }

    #[ink(event)]
    pub struct BuilderUpdated {
        #[ink(topic)]
        builder_id: u32,
        name: String,
        wallet: AccountId,
        active: bool,
    }

    /// Errors that can occur in the contract
    #[derive(Debug, PartialEq, Eq, Encode, Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
    pub enum TippingError {
        InvalidBuilder,
        BuilderNotActive,
        ZeroAmount,
        TransferFailed,
        Unauthorized,
        BuilderAlreadyExists,
    }

    /// The tipping contract storage
    #[ink(storage)]
    pub struct Tipping {
        /// PSP22 token used for tipping (USDC)
        usdc_token: AccountId,
        /// Contract owner
        owner: AccountId,
        /// Mapping of builder ID to builder details
        builders: Mapping<u32, Builder>,
        /// Total number of builders
        builder_count: u32,
        /// Protocol fee percentage (basis points, e.g., 100 = 1%)
        protocol_fee_bps: u16,
        /// Treasury address for protocol fees
        treasury: AccountId,
        /// Total protocol fees collected
        total_fees_collected: Balance,
        /// Contract pause state
        paused: bool,
    }

    impl Tipping {
        /// Creates a new tipping contract
        #[ink(constructor)]
        pub fn new(usdc_token: AccountId, treasury: AccountId, protocol_fee_bps: u16) -> Self {
            let caller = Self::env().caller();

            // Initialize with demo builders
            let mut contract = Self {
                usdc_token,
                owner: caller,
                builders: Mapping::new(),
                builder_count: 0,
                protocol_fee_bps,
                treasury,
                total_fees_collected: 0,
                paused: false,
            };

            // Add demo builders
            contract.add_demo_builders();

            contract
        }

        /// Add demo builders for testing
        fn add_demo_builders(&mut self) {
            // Use deterministic test accounts
            let accounts = [
                ([0x01; 32].into(), "Alice - Moonbeam", "Building EVM smart contracts on Polkadot"),
                ([0x02; 32].into(), "Bob - Astar", "WASM & EVM platform for developers"),
                ([0x03; 32].into(), "Charlie - Acala", "DeFi hub of Polkadot"),
            ];

            for (wallet, name, description) in accounts.iter() {
                self.builder_count += 1;
                let builder = Builder {
                    name: String::from(*name),
                    description: String::from(*description),
                    wallet: *wallet,
                    total_received: 0,
                    active: true,
                };
                self.builders.insert(self.builder_count, &builder);

                self.env().emit_event(BuilderAdded {
                    builder_id: self.builder_count,
                    name: builder.name.clone(),
                    wallet: builder.wallet,
                });
            }
        }

        /// Add a new builder (only owner)
        #[ink(message)]
        pub fn add_builder(
            &mut self,
            name: String,
            description: String,
            wallet: AccountId,
        ) -> Result<u32, TippingError> {
            self.ensure_owner()?;
            self.ensure_not_paused()?;

            self.builder_count += 1;
            let builder_id = self.builder_count;

            let builder = Builder {
                name: name.clone(),
                description,
                wallet,
                total_received: 0,
                active: true,
            };

            self.builders.insert(builder_id, &builder);

            self.env().emit_event(BuilderAdded {
                builder_id,
                name,
                wallet,
            });

            Ok(builder_id)
        }

        /// Update builder details (only owner)
        #[ink(message)]
        pub fn update_builder(
            &mut self,
            builder_id: u32,
            name: String,
            description: String,
            wallet: AccountId,
            active: bool,
        ) -> Result<(), TippingError> {
            self.ensure_owner()?;
            self.ensure_not_paused()?;

            let mut builder = self.builders.get(builder_id)
                .ok_or(TippingError::InvalidBuilder)?;

            builder.name = name.clone();
            builder.description = description;
            builder.wallet = wallet;
            builder.active = active;

            self.builders.insert(builder_id, &builder);

            self.env().emit_event(BuilderUpdated {
                builder_id,
                name,
                wallet,
                active,
            });

            Ok(())
        }

        /// Send a tip to a builder
        #[ink(message)]
        pub fn tip(
            &mut self,
            builder_id: u32,
            amount: Balance,
            message: String,
        ) -> Result<(), TippingError> {
            self.ensure_not_paused()?;

            if amount == 0 {
                return Err(TippingError::ZeroAmount);
            }

            let mut builder = self.builders.get(builder_id)
                .ok_or(TippingError::InvalidBuilder)?;

            if !builder.active {
                return Err(TippingError::BuilderNotActive);
            }

            let caller = self.env().caller();
            let usdc: PSP22Ref = self.usdc_token.into();

            // Calculate fee
            let fee = (amount * self.protocol_fee_bps as u128) / 10_000;
            let tip_amount = amount - fee;

            // Transfer tip to builder
            usdc.transfer_from(caller, builder.wallet, tip_amount, Vec::new())
                .map_err(|_| TippingError::TransferFailed)?;

            // Transfer fee to treasury if applicable
            if fee > 0 {
                usdc.transfer_from(caller, self.treasury, fee, Vec::new())
                    .map_err(|_| TippingError::TransferFailed)?;
                self.total_fees_collected += fee;
            }

            // Update builder stats
            builder.total_received += tip_amount;
            self.builders.insert(builder_id, &builder);

            // Emit event
            self.env().emit_event(Tip {
                tipper: caller,
                builder_id,
                amount: tip_amount,
                message,
                timestamp: self.env().block_timestamp(),
            });

            Ok(())
        }

        /// Get builder details
        #[ink(message)]
        pub fn get_builder(&self, builder_id: u32) -> Option<Builder> {
            self.builders.get(builder_id)
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

        /// Get only active builders
        #[ink(message)]
        pub fn get_active_builders(&self) -> Vec<(u32, Builder)> {
            self.get_all_builders()
                .into_iter()
                .filter(|(_, builder)| builder.active)
                .collect()
        }

        /// Get contract stats
        #[ink(message)]
        pub fn get_stats(&self) -> (u32, Balance, u16) {
            (self.builder_count, self.total_fees_collected, self.protocol_fee_bps)
        }

        /// Update protocol fee (only owner)
        #[ink(message)]
        pub fn update_protocol_fee(&mut self, new_fee_bps: u16) -> Result<(), TippingError> {
            self.ensure_owner()?;
            self.protocol_fee_bps = new_fee_bps;
            Ok(())
        }

        /// Update treasury address (only owner)
        #[ink(message)]
        pub fn update_treasury(&mut self, new_treasury: AccountId) -> Result<(), TippingError> {
            self.ensure_owner()?;
            self.treasury = new_treasury;
            Ok(())
        }

        /// Pause the contract (only owner)
        #[ink(message)]
        pub fn pause(&mut self) -> Result<(), TippingError> {
            self.ensure_owner()?;
            self.paused = true;
            Ok(())
        }

        /// Unpause the contract (only owner)
        #[ink(message)]
        pub fn unpause(&mut self) -> Result<(), TippingError> {
            self.ensure_owner()?;
            self.paused = false;
            Ok(())
        }

        /// Helper: ensure caller is owner
        fn ensure_owner(&self) -> Result<(), TippingError> {
            if self.env().caller() != self.owner {
                return Err(TippingError::Unauthorized);
            }
            Ok(())
        }

        /// Helper: ensure contract is not paused
        fn ensure_not_paused(&self) -> Result<(), TippingError> {
            if self.paused {
                return Err(TippingError::Unauthorized);
            }
            Ok(())
        }
    }

    #[cfg(test)]
    mod tests {
        use super::*;
        use ink::env::test;

        fn default_accounts() -> test::DefaultAccounts<Environment> {
            test::default_accounts::<Environment>()
        }

        fn create_contract() -> Tipping {
            let accounts = default_accounts();
            Tipping::new(accounts.charlie, accounts.django, 100) // 1% fee
        }

        #[ink::test]
        fn constructor_works() {
            let contract = create_contract();
            assert_eq!(contract.builder_count, 3); // 3 demo builders
            assert_eq!(contract.protocol_fee_bps, 100);
            assert!(!contract.paused);
        }

        #[ink::test]
        fn add_builder_works() {
            let mut contract = create_contract();
            let accounts = default_accounts();

            let result = contract.add_builder(
                "New Builder".into(),
                "Description".into(),
                accounts.eve,
            );

            assert!(result.is_ok());
            assert_eq!(contract.builder_count, 4);

            let builder = contract.get_builder(4).unwrap();
            assert_eq!(builder.name, "New Builder");
            assert_eq!(builder.wallet, accounts.eve);
            assert!(builder.active);
        }

        #[ink::test]
        fn add_builder_unauthorized() {
            let mut contract = create_contract();
            let accounts = default_accounts();

            test::set_caller::<Environment>(accounts.bob);
            let result = contract.add_builder(
                "New Builder".into(),
                "Description".into(),
                accounts.eve,
            );

            assert_eq!(result, Err(TippingError::Unauthorized));
        }

        #[ink::test]
        fn update_builder_works() {
            let mut contract = create_contract();

            let result = contract.update_builder(
                1,
                "Updated Name".into(),
                "Updated Desc".into(),
                [0x99; 32].into(),
                false,
            );

            assert!(result.is_ok());

            let builder = contract.get_builder(1).unwrap();
            assert_eq!(builder.name, "Updated Name");
            assert_eq!(builder.wallet, [0x99; 32].into());
            assert!(!builder.active);
        }

        #[ink::test]
        fn get_active_builders_works() {
            let mut contract = create_contract();

            // Deactivate one builder
            contract.update_builder(
                2,
                "Bob - Astar".into(),
                "WASM & EVM platform for developers".into(),
                [0x02; 32].into(),
                false,
            ).unwrap();

            let active = contract.get_active_builders();
            assert_eq!(active.len(), 2); // Only 2 active builders
        }

        #[ink::test]
        fn pause_unpause_works() {
            let mut contract = create_contract();

            assert!(!contract.paused);
            assert!(contract.pause().is_ok());
            assert!(contract.paused);
            assert!(contract.unpause().is_ok());
            assert!(!contract.paused);
        }

        #[ink::test]
        fn pause_unauthorized() {
            let mut contract = create_contract();
            let accounts = default_accounts();

            test::set_caller::<Environment>(accounts.bob);
            assert_eq!(contract.pause(), Err(TippingError::Unauthorized));
        }

        #[ink::test]
        fn update_fee_works() {
            let mut contract = create_contract();

            assert!(contract.update_protocol_fee(250).is_ok()); // 2.5%
            let (_, _, fee) = contract.get_stats();
            assert_eq!(fee, 250);
        }
    }
}