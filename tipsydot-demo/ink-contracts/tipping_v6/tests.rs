#![cfg(test)]

use ink::env::test::{default_accounts, recorded_events, DefaultAccounts};
use ink::env::{DefaultEnvironment, Environment};
use ink_e2e::ChainBackend;
use tipping_v6::*;

/// Helper function to get test accounts
fn get_default_test_accounts() -> DefaultAccounts<DefaultEnvironment> {
    default_accounts::<DefaultEnvironment>()
}

/// Helper function to create H160 from account
fn h160_from_account(account: &ink::primitives::AccountId) -> H160 {
    let bytes = account.as_ref();
    let mut h160_bytes = [0u8; 20];
    h160_bytes.copy_from_slice(&bytes[12..32]);
    H160::from(h160_bytes)
}

#[cfg(test)]
mod unit_tests {
    use super::*;
    use ink::env::test;
    use ink_primitives::types::U256;

    #[ink::test]
    fn test_constructor() {
        let accounts = get_default_test_accounts();
        let treasury = h160_from_account(&accounts.bob);
        let fee = U256::from(100); // 1%
        
        let contract = TippingV6::new(treasury, fee);
        
        assert_eq!(contract.protocol_fee_bps, fee);
        assert_eq!(contract.treasury, treasury);
        assert!(!contract.paused);
        assert_eq!(contract.next_builder_id, U256::from(1));
    }

    #[ink::test]
    fn test_register_builder() {
        let accounts = get_default_test_accounts();
        let treasury = h160_from_account(&accounts.bob);
        let mut contract = TippingV6::new(treasury, U256::from(100));
        
        let builder_address = h160_from_account(&accounts.charlie);
        let name = b"Alice's Project".to_vec();
        
        // Register builder
        let result = contract.register_builder(name.clone(), builder_address);
        assert!(result.is_ok());
        
        let builder_id = result.unwrap();
        assert_eq!(builder_id, U256::from(1));
        
        // Verify builder data
        let builder = contract.get_builder(builder_id);
        assert!(builder.is_some());
        
        let builder_info = builder.unwrap();
        assert_eq!(builder_info.id, builder_id);
        assert_eq!(builder_info.address, builder_address);
        assert_eq!(builder_info.name, name);
        assert_eq!(builder_info.total_received, U256::from(0));
        assert_eq!(builder_info.tip_count, U256::from(0));
        assert!(builder_info.is_active);
    }

    #[ink::test]
    fn test_register_duplicate_builder_fails() {
        let accounts = get_default_test_accounts();
        let treasury = h160_from_account(&accounts.bob);
        let mut contract = TippingV6::new(treasury, U256::from(100));
        
        let builder_address = h160_from_account(&accounts.charlie);
        
        // First registration should succeed
        let result1 = contract.register_builder(b"Builder 1".to_vec(), builder_address);
        assert!(result1.is_ok());
        
        // Second registration with same address should fail
        let result2 = contract.register_builder(b"Builder 2".to_vec(), builder_address);
        assert_eq!(result2, Err(Error::BuilderAlreadyExists));
    }

    #[ink::test]
    fn test_tip_to_builder() {
        let accounts = get_default_test_accounts();
        let treasury = h160_from_account(&accounts.bob);
        let mut contract = TippingV6::new(treasury, U256::from(100)); // 1% fee
        
        // Register a builder
        let builder_address = h160_from_account(&accounts.charlie);
        let builder_id = contract.register_builder(
            b"Test Builder".to_vec(),
            builder_address
        ).unwrap();
        
        // Set up test environment with transferred value
        test::set_value_transferred::<DefaultEnvironment>(1_000_000);
        test::set_caller::<DefaultEnvironment>(accounts.alice);
        
        // Send tip
        let message = b"Great work!".to_vec();
        let result = contract.tip(builder_id, message.clone());
        assert!(result.is_ok());
        
        let tip_id = result.unwrap();
        assert_eq!(tip_id, U256::from(1));
        
        // Verify builder received the tip (minus 1% fee)
        let builder = contract.get_builder(builder_id).unwrap();
        assert_eq!(builder.total_received, U256::from(990_000));
        assert_eq!(builder.tip_count, U256::from(1));
        
        // Verify protocol fees collected
        assert_eq!(contract.total_fees_collected, U256::from(10_000));
        
        // Verify tip record
        let tip = contract.get_tip(tip_id).unwrap();
        assert_eq!(tip.builder_id, builder_id);
        assert_eq!(tip.amount, U256::from(990_000));
        assert_eq!(tip.message, message);
    }

    #[ink::test]
    fn test_tip_to_nonexistent_builder_fails() {
        let accounts = get_default_test_accounts();
        let treasury = h160_from_account(&accounts.bob);
        let mut contract = TippingV6::new(treasury, U256::from(100));
        
        test::set_value_transferred::<DefaultEnvironment>(1_000_000);
        
        // Try to tip non-existent builder
        let result = contract.tip(U256::from(999), b"Test".to_vec());
        assert_eq!(result, Err(Error::BuilderNotFound));
    }

    #[ink::test]
    fn test_zero_amount_tip_fails() {
        let accounts = get_default_test_accounts();
        let treasury = h160_from_account(&accounts.bob);
        let mut contract = TippingV6::new(treasury, U256::from(100));
        
        let builder_address = h160_from_account(&accounts.charlie);
        let builder_id = contract.register_builder(
            b"Test Builder".to_vec(),
            builder_address
        ).unwrap();
        
        // No value transferred
        test::set_value_transferred::<DefaultEnvironment>(0);
        
        let result = contract.tip(builder_id, b"Test".to_vec());
        assert_eq!(result, Err(Error::InvalidAmount));
    }

    #[ink::test]
    fn test_create_campaign() {
        let accounts = get_default_test_accounts();
        let treasury = h160_from_account(&accounts.bob);
        let mut contract = TippingV6::new(treasury, U256::from(100));
        
        // Register builder
        let builder_address = h160_from_account(&accounts.charlie);
        let builder_id = contract.register_builder(
            b"Campaign Creator".to_vec(),
            builder_address
        ).unwrap();
        
        // Set caller to builder
        test::set_caller::<DefaultEnvironment>(accounts.charlie);
        
        // Create campaign
        let target = U256::from(10_000_000);
        let duration = 30; // 30 days
        let result = contract.create_campaign(builder_id, target, duration);
        assert!(result.is_ok());
        
        let campaign_id = result.unwrap();
        assert_eq!(campaign_id, U256::from(1));
        
        // Verify campaign data
        let campaign = contract.get_campaign(campaign_id).unwrap();
        assert_eq!(campaign.builder_id, builder_id);
        assert_eq!(campaign.target_amount, target);
        assert_eq!(campaign.raised_amount, U256::from(0));
        assert!(campaign.is_active);
    }

    #[ink::test]
    fn test_unauthorized_campaign_creation_fails() {
        let accounts = get_default_test_accounts();
        let treasury = h160_from_account(&accounts.bob);
        let mut contract = TippingV6::new(treasury, U256::from(100));
        
        // Register builder
        let builder_address = h160_from_account(&accounts.charlie);
        let builder_id = contract.register_builder(
            b"Builder".to_vec(),
            builder_address
        ).unwrap();
        
        // Different account tries to create campaign
        test::set_caller::<DefaultEnvironment>(accounts.alice);
        
        let result = contract.create_campaign(
            builder_id,
            U256::from(10_000_000),
            30
        );
        assert_eq!(result, Err(Error::Unauthorized));
    }

    #[ink::test]
    fn test_set_protocol_fee() {
        let accounts = get_default_test_accounts();
        let treasury = h160_from_account(&accounts.bob);
        let mut contract = TippingV6::new(treasury, U256::from(100));
        
        // Owner can change fee
        test::set_caller::<DefaultEnvironment>(accounts.alice); // Contract creator
        let result = contract.set_protocol_fee(U256::from(250)); // 2.5%
        assert!(result.is_ok());
        assert_eq!(contract.protocol_fee_bps, U256::from(250));
    }

    #[ink::test]
    fn test_invalid_protocol_fee_fails() {
        let accounts = get_default_test_accounts();
        let treasury = h160_from_account(&accounts.bob);
        let mut contract = TippingV6::new(treasury, U256::from(100));
        
        test::set_caller::<DefaultEnvironment>(accounts.alice);
        
        // Try to set fee > 10%
        let result = contract.set_protocol_fee(U256::from(1001));
        assert_eq!(result, Err(Error::InvalidFee));
    }

    #[ink::test]
    fn test_pause_unpause() {
        let accounts = get_default_test_accounts();
        let treasury = h160_from_account(&accounts.bob);
        let mut contract = TippingV6::new(treasury, U256::from(100));
        
        // Initially not paused
        assert!(!contract.paused);
        
        // Owner pauses
        test::set_caller::<DefaultEnvironment>(accounts.alice);
        let result = contract.set_paused(true);
        assert!(result.is_ok());
        assert!(contract.paused);
        
        // Operations fail when paused
        let builder_address = h160_from_account(&accounts.charlie);
        let result = contract.register_builder(b"Test".to_vec(), builder_address);
        assert_eq!(result, Err(Error::ContractPaused));
        
        // Unpause
        let result = contract.set_paused(false);
        assert!(result.is_ok());
        assert!(!contract.paused);
        
        // Operations work again
        let result = contract.register_builder(b"Test".to_vec(), builder_address);
        assert!(result.is_ok());
    }

    #[ink::test]
    fn test_unauthorized_pause_fails() {
        let accounts = get_default_test_accounts();
        let treasury = h160_from_account(&accounts.bob);
        let mut contract = TippingV6::new(treasury, U256::from(100));
        
        // Non-owner tries to pause
        test::set_caller::<DefaultEnvironment>(accounts.bob);
        let result = contract.set_paused(true);
        assert_eq!(result, Err(Error::Unauthorized));
    }

    #[ink::test]
    fn test_events_emitted() {
        let accounts = get_default_test_accounts();
        let treasury = h160_from_account(&accounts.bob);
        let mut contract = TippingV6::new(treasury, U256::from(100));
        
        // Clear recorded events
        test::set_block_timestamp::<DefaultEnvironment>(1000);
        
        // Register builder and check event
        let builder_address = h160_from_account(&accounts.charlie);
        let name = b"Event Test Builder".to_vec();
        let builder_id = contract.register_builder(name.clone(), builder_address).unwrap();
        
        // Check BuilderRegistered event
        let events = recorded_events().collect::<Vec<_>>();
        assert_eq!(events.len(), 1);
        
        // Send tip and check event
        test::set_value_transferred::<DefaultEnvironment>(1_000_000);
        test::set_caller::<DefaultEnvironment>(accounts.alice);
        
        let message = b"Test tip".to_vec();
        contract.tip(builder_id, message.clone()).unwrap();
        
        // Should have 2 events now (BuilderRegistered + TipSent)
        let events = recorded_events().collect::<Vec<_>>();
        assert_eq!(events.len(), 2);
    }
}

#[cfg(all(test, feature = "e2e-tests"))]
mod e2e_tests {
    use super::*;
    use ink_e2e::{Client, Keypair};
    use tipping_v6::TippingV6Ref;

    type E2EResult<T> = Result<T, Box<dyn std::error::Error>>;

    #[ink_e2e::test]
    async fn e2e_register_and_tip(mut client: Client<C, E>) -> E2EResult<()> {
        // Deploy contract
        let treasury_keypair = Keypair::from_seed(&[1u8; 32]);
        let treasury = h160_from_account(&treasury_keypair.public_key().0.into());
        
        let constructor = TippingV6Ref::new(treasury, U256::from(100));
        let contract = client
            .instantiate("tipping_v6", &Keypair::alice(), constructor, 0, None)
            .await?
            .account_id;

        // Register builder
        let builder_keypair = Keypair::from_seed(&[2u8; 32]);
        let builder_address = h160_from_account(&builder_keypair.public_key().0.into());
        
        let register_msg = TippingV6Ref::register_builder(
            &contract,
            b"E2E Builder".to_vec(),
            builder_address,
        );
        
        let register_result = client
            .call(&Keypair::alice(), register_msg, 0, None)
            .await?;
        
        assert!(register_result.return_value().is_ok());
        let builder_id = register_result.return_value().unwrap();

        // Send tip
        let tip_msg = TippingV6Ref::tip(
            &contract,
            builder_id,
            b"E2E tip message".to_vec(),
        );
        
        let tip_result = client
            .call(&Keypair::bob(), tip_msg, 1_000_000, None)
            .await?;
        
        assert!(tip_result.return_value().is_ok());

        // Query builder to verify tip
        let query_msg = TippingV6Ref::get_builder(&contract, builder_id);
        let query_result = client
            .call_dry_run(&Keypair::alice(), query_msg, 0, None)
            .await?;
        
        let builder = query_result.return_value().unwrap();
        assert_eq!(builder.total_received, U256::from(990_000)); // 1% fee deducted
        assert_eq!(builder.tip_count, U256::from(1));

        Ok(())
    }

    #[ink_e2e::test]
    async fn e2e_campaign_lifecycle(mut client: Client<C, E>) -> E2EResult<()> {
        // Deploy contract
        let treasury_keypair = Keypair::from_seed(&[3u8; 32]);
        let treasury = h160_from_account(&treasury_keypair.public_key().0.into());
        
        let constructor = TippingV6Ref::new(treasury, U256::from(100));
        let contract = client
            .instantiate("tipping_v6", &Keypair::alice(), constructor, 0, None)
            .await?
            .account_id;

        // Register builder
        let builder_keypair = Keypair::charlie();
        let builder_address = h160_from_account(&builder_keypair.public_key().0.into());
        
        let register_msg = TippingV6Ref::register_builder(
            &contract,
            b"Campaign Builder".to_vec(),
            builder_address,
        );
        
        let register_result = client
            .call(&Keypair::alice(), register_msg, 0, None)
            .await?;
        
        let builder_id = register_result.return_value().unwrap();

        // Create campaign
        let create_msg = TippingV6Ref::create_campaign(
            &contract,
            builder_id,
            U256::from(5_000_000),
            30,
        );
        
        let create_result = client
            .call(&builder_keypair, create_msg, 0, None)
            .await?;
        
        assert!(create_result.return_value().is_ok());
        let campaign_id = create_result.return_value().unwrap();

        // Query campaign
        let query_msg = TippingV6Ref::get_campaign(&contract, campaign_id);
        let query_result = client
            .call_dry_run(&Keypair::alice(), query_msg, 0, None)
            .await?;
        
        let campaign = query_result.return_value().unwrap();
        assert_eq!(campaign.target_amount, U256::from(5_000_000));
        assert_eq!(campaign.raised_amount, U256::from(0));
        assert!(campaign.is_active);

        Ok(())
    }

    #[ink_e2e::test]
    async fn e2e_admin_operations(mut client: Client<C, E>) -> E2EResult<()> {
        // Deploy contract
        let treasury_keypair = Keypair::from_seed(&[4u8; 32]);
        let treasury = h160_from_account(&treasury_keypair.public_key().0.into());
        
        let constructor = TippingV6Ref::new(treasury, U256::from(100));
        let contract = client
            .instantiate("tipping_v6", &Keypair::alice(), constructor, 0, None)
            .await?
            .account_id;

        // Update protocol fee
        let fee_msg = TippingV6Ref::set_protocol_fee(&contract, U256::from(200));
        let fee_result = client
            .call(&Keypair::alice(), fee_msg, 0, None)
            .await?;
        
        assert!(fee_result.return_value().is_ok());

        // Pause contract
        let pause_msg = TippingV6Ref::set_paused(&contract, true);
        let pause_result = client
            .call(&Keypair::alice(), pause_msg, 0, None)
            .await?;
        
        assert!(pause_result.return_value().is_ok());

        // Try to register builder while paused (should fail)
        let builder_address = h160_from_account(&Keypair::bob().public_key().0.into());
        let register_msg = TippingV6Ref::register_builder(
            &contract,
            b"Should Fail".to_vec(),
            builder_address,
        );
        
        let register_result = client
            .call(&Keypair::alice(), register_msg, 0, None)
            .await?;
        
        assert_eq!(register_result.return_value(), Err(Error::ContractPaused));

        Ok(())
    }
}
