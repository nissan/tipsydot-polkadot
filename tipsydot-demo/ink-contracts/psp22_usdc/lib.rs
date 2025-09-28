#![cfg_attr(not(feature = "std"), no_std, no_main)]

#[openbrush::implementation(PSP22, PSP22Metadata, PSP22Mintable, Ownable)]
#[openbrush::contract]
pub mod psp22_usdc {
    use openbrush::{
        contracts::{
            ownable::*,
            psp22::{extensions::metadata::*, extensions::mintable::*, *},
        },
        traits::{Storage, String},
    };

    /// The USDC token contract implementing PSP22 standard
    #[ink(storage)]
    #[derive(Default, Storage)]
    pub struct MockUSDC {
        #[storage_field]
        psp22: psp22::Data,
        #[storage_field]
        metadata: metadata::Data,
        #[storage_field]
        ownable: ownable::Data,
    }

    impl MockUSDC {
        /// Creates a new USDC token contract
        #[ink(constructor)]
        pub fn new(initial_supply: Balance) -> Self {
            let mut instance = Self::default();

            // Initialize ownership
            ownable::Internal::_init_with_owner(&mut instance, Self::env().caller());

            // Set token metadata
            metadata::Internal::_set_attribute(&mut instance, metadata::Id::Name, "USD Coin".into());
            metadata::Internal::_set_attribute(&mut instance, metadata::Id::Symbol, "USDC".into());
            metadata::Internal::_set_attribute(&mut instance, metadata::Id::Decimals, 6u8.into());

            // Mint initial supply to deployer if specified
            if initial_supply > 0 {
                psp22::Internal::_mint_to(&mut instance, Self::env().caller(), initial_supply)
                    .expect("Initial mint failed");
            }

            instance
        }

        /// Public mint function for testing (only owner)
        #[ink(message)]
        #[openbrush::modifiers(only_owner)]
        pub fn mint(&mut self, account: AccountId, amount: Balance) -> Result<(), PSP22Error> {
            psp22::Internal::_mint_to(self, account, amount)
        }

        /// Get token metadata
        #[ink(message)]
        pub fn token_name(&self) -> Option<String> {
            metadata::PSP22Metadata::token_name(self)
        }

        #[ink(message)]
        pub fn token_symbol(&self) -> Option<String> {
            metadata::PSP22Metadata::token_symbol(self)
        }

        #[ink(message)]
        pub fn token_decimals(&self) -> u8 {
            metadata::PSP22Metadata::token_decimals(self)
        }
    }

    #[cfg(test)]
    mod tests {
        use super::*;
        use ink::env::test;

        #[ink::test]
        fn new_works() {
            let usdc = MockUSDC::new(1_000_000 * 10u128.pow(6));
            assert_eq!(usdc.total_supply(), 1_000_000 * 10u128.pow(6));
        }

        #[ink::test]
        fn metadata_works() {
            let usdc = MockUSDC::new(0);
            assert_eq!(usdc.token_name(), Some("USD Coin".into()));
            assert_eq!(usdc.token_symbol(), Some("USDC".into()));
            assert_eq!(usdc.token_decimals(), 6);
        }

        #[ink::test]
        fn transfer_works() {
            let mut usdc = MockUSDC::new(1000 * 10u128.pow(6));
            let accounts = test::default_accounts::<Environment>();

            assert!(usdc.transfer(accounts.bob, 100 * 10u128.pow(6), vec![]).is_ok());
            assert_eq!(usdc.balance_of(accounts.bob), 100 * 10u128.pow(6));
            assert_eq!(usdc.balance_of(accounts.alice), 900 * 10u128.pow(6));
        }

        #[ink::test]
        fn allowance_works() {
            let mut usdc = MockUSDC::new(1000 * 10u128.pow(6));
            let accounts = test::default_accounts::<Environment>();

            assert!(usdc.approve(accounts.bob, 200 * 10u128.pow(6)).is_ok());
            assert_eq!(usdc.allowance(accounts.alice, accounts.bob), 200 * 10u128.pow(6));

            // Bob transfers from Alice
            test::set_caller::<Environment>(accounts.bob);
            assert!(usdc.transfer_from(
                accounts.alice,
                accounts.charlie,
                50 * 10u128.pow(6),
                vec![]
            ).is_ok());

            assert_eq!(usdc.balance_of(accounts.charlie), 50 * 10u128.pow(6));
            assert_eq!(usdc.allowance(accounts.alice, accounts.bob), 150 * 10u128.pow(6));
        }

        #[ink::test]
        fn mint_only_owner() {
            let mut usdc = MockUSDC::new(0);
            let accounts = test::default_accounts::<Environment>();

            // Alice (owner) can mint
            assert!(usdc.mint(accounts.bob, 100 * 10u128.pow(6)).is_ok());
            assert_eq!(usdc.balance_of(accounts.bob), 100 * 10u128.pow(6));

            // Bob cannot mint (would panic in real scenario, handled by modifier)
            test::set_caller::<Environment>(accounts.bob);
            // This would fail with only_owner modifier
        }
    }
}