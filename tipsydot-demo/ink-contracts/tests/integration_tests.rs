/// Integration tests for the Ink! smart contracts
/// These tests verify the complete flow across multiple contracts

#[cfg(test)]
mod integration_tests {
    use ink_e2e::ContractsBackend;
    use psp22_usdc::MockUSDC;
    use tipping::Tipping;
    use cross_chain::CrossChainDonation;

    type E2EResult<T> = Result<T, Box<dyn std::error::Error>>;

    /// Test the complete tipping flow
    #[ink_e2e::test]
    async fn test_complete_tipping_flow(mut client: Client) -> E2EResult<()> {
        // 1. Deploy USDC token
        let usdc_constructor = MockUSDCRef::new(1_000_000 * 10u128.pow(6));
        let usdc_id = client
            .instantiate("psp22_usdc", &usdc_constructor, 0, None)
            .await?
            .account_id;

        // 2. Deploy tipping contract
        let treasury = client.alice_account();
        let tipping_constructor = TippingRef::new(usdc_id, treasury, 100); // 1% fee
        let tipping_id = client
            .instantiate("tipping", &tipping_constructor, 0, None)
            .await?
            .account_id;

        // 3. Mint USDC to Bob (tipper)
        let bob = client.bob_account();
        let mint_msg = MockUSDCRef::mint(bob, 1000 * 10u128.pow(6));
        client
            .call(&usdc_id, &mint_msg, 0)
            .await?;

        // 4. Bob approves tipping contract to spend USDC
        client.set_caller(bob);
        let approve_msg = MockUSDCRef::approve(tipping_id, 1000 * 10u128.pow(6));
        client
            .call(&usdc_id, &approve_msg, 0)
            .await?;

        // 5. Bob tips builder #1 (Alice)
        let tip_msg = TippingRef::tip(1, 100 * 10u128.pow(6), "Great work!".into());
        let result = client
            .call(&tipping_id, &tip_msg, 0)
            .await?;

        assert!(result.is_ok());

        // 6. Verify builder received funds (minus fee)
        let builder = TippingRef::get_builder(1);
        let builder_info = client
            .call(&tipping_id, &builder, 0)
            .await?
            .return_value()
            .unwrap();

        assert_eq!(builder_info.total_received, 99 * 10u128.pow(6)); // 99 USDC after 1% fee

        // 7. Verify treasury received fee
        let alice_balance = MockUSDCRef::balance_of(treasury);
        let treasury_balance = client
            .call(&usdc_id, &alice_balance, 0)
            .await?
            .return_value();

        assert_eq!(treasury_balance, 1_000_001 * 10u128.pow(6)); // Initial + 1 USDC fee

        Ok(())
    }

    /// Test cross-chain donation flow
    #[ink_e2e::test]
    async fn test_cross_chain_donation(mut client: Client) -> E2EResult<()> {
        // 1. Deploy cross-chain contract
        let xcm_constructor = CrossChainDonationRef::new(1000, 1337);
        let xcm_id = client
            .instantiate("cross_chain", &xcm_constructor, 0, None)
            .await?
            .account_id;

        // 2. Alice donates to builder #2 (Bob on Astar)
        let alice = client.alice_account();
        client.set_caller(alice);

        let donate_msg = CrossChainDonationRef::donate(2, 50 * 10u128.pow(6));
        let result = client
            .call(&xcm_id, &donate_msg, 0)
            .await?;

        let transfer_id = result.return_value().unwrap();
        assert!(transfer_id > 0);

        // 3. Check transfer status
        let get_transfer = CrossChainDonationRef::get_transfer(transfer_id);
        let transfer = client
            .call(&xcm_id, &get_transfer, 0)
            .await?
            .return_value()
            .unwrap();

        assert_eq!(transfer.amount, 50 * 10u128.pow(6));
        assert_eq!(transfer.parachain_id, 2006); // Astar
        assert_eq!(transfer.status, TransferStatus::Sent);

        // 4. Simulate confirmation (owner only)
        let confirm_msg = CrossChainDonationRef::confirm_transfer(transfer_id);
        let confirm_result = client
            .call(&xcm_id, &confirm_msg, 0)
            .await?;

        assert!(confirm_result.is_ok());

        // 5. Verify transfer is confirmed
        let transfer_after = client
            .call(&xcm_id, &get_transfer, 0)
            .await?
            .return_value()
            .unwrap();

        assert_eq!(transfer_after.status, TransferStatus::Confirmed);

        Ok(())
    }

    /// Test access control
    #[ink_e2e::test]
    async fn test_access_control(mut client: Client) -> E2EResult<()> {
        // Deploy tipping contract
        let usdc_id = AccountId::from([0x01; 32]);
        let treasury = client.alice_account();
        let tipping_constructor = TippingRef::new(usdc_id, treasury, 100);
        let tipping_id = client
            .instantiate("tipping", &tipping_constructor, 0, None)
            .await?
            .account_id;

        // Bob tries to pause (should fail)
        let bob = client.bob_account();
        client.set_caller(bob);

        let pause_msg = TippingRef::pause();
        let result = client
            .call(&tipping_id, &pause_msg, 0)
            .await?;

        assert!(result.is_err());
        assert_eq!(result.unwrap_err(), TippingError::Unauthorized);

        // Alice (owner) pauses successfully
        let alice = client.alice_account();
        client.set_caller(alice);

        let result = client
            .call(&tipping_id, &pause_msg, 0)
            .await?;

        assert!(result.is_ok());

        Ok(())
    }

    /// Test multiple builders and batch operations
    #[ink_e2e::test]
    async fn test_multiple_builders(mut client: Client) -> E2EResult<()> {
        // Deploy contracts
        let usdc_constructor = MockUSDCRef::new(10_000_000 * 10u128.pow(6));
        let usdc_id = client
            .instantiate("psp22_usdc", &usdc_constructor, 0, None)
            .await?
            .account_id;

        let treasury = client.alice_account();
        let tipping_constructor = TippingRef::new(usdc_id, treasury, 250); // 2.5% fee
        let tipping_id = client
            .instantiate("tipping", &tipping_constructor, 0, None)
            .await?
            .account_id;

        // Add more builders
        let alice = client.alice_account();
        client.set_caller(alice);

        for i in 4..10 {
            let name = format!("Builder {}", i);
            let desc = format!("Project {}", i);
            let wallet = AccountId::from([i as u8; 32]);

            let add_builder = TippingRef::add_builder(name, desc, wallet);
            let result = client
                .call(&tipping_id, &add_builder, 0)
                .await?;

            assert!(result.is_ok());
        }

        // Get all builders
        let get_all = TippingRef::get_all_builders();
        let all_builders = client
            .call(&tipping_id, &get_all, 0)
            .await?
            .return_value();

        assert_eq!(all_builders.len(), 9); // 3 initial + 6 added

        // Get active builders (all should be active)
        let get_active = TippingRef::get_active_builders();
        let active_builders = client
            .call(&tipping_id, &get_active, 0)
            .await?
            .return_value();

        assert_eq!(active_builders.len(), 9);

        // Deactivate one builder
        let update_msg = TippingRef::update_builder(
            5,
            "Inactive Builder".into(),
            "Paused Project".into(),
            AccountId::from([0x99; 32]),
            false,
        );
        client
            .call(&tipping_id, &update_msg, 0)
            .await?;

        // Check active builders again
        let active_after = client
            .call(&tipping_id, &get_active, 0)
            .await?
            .return_value();

        assert_eq!(active_after.len(), 8);

        Ok(())
    }

    /// Test fee calculations
    #[ink_e2e::test]
    async fn test_fee_calculations(mut client: Client) -> E2EResult<()> {
        // Deploy with different fee percentages
        let usdc_id = AccountId::from([0x01; 32]);
        let treasury = client.alice_account();

        // Test 0% fee
        let tipping_0 = TippingRef::new(usdc_id, treasury, 0);
        let tipping_0_id = client
            .instantiate("tipping", &tipping_0, 0, None)
            .await?
            .account_id;

        // Test 5% fee (500 basis points)
        let tipping_5 = TippingRef::new(usdc_id, treasury, 500);
        let tipping_5_id = client
            .instantiate("tipping", &tipping_5, 0, None)
            .await?
            .account_id;

        // Test 10% fee (1000 basis points)
        let tipping_10 = TippingRef::new(usdc_id, treasury, 1000);
        let tipping_10_id = client
            .instantiate("tipping", &tipping_10, 0, None)
            .await?
            .account_id;

        // Get stats to verify fee settings
        let get_stats = TippingRef::get_stats();

        let stats_0 = client
            .call(&tipping_0_id, &get_stats, 0)
            .await?
            .return_value();
        assert_eq!(stats_0.2, 0);

        let stats_5 = client
            .call(&tipping_5_id, &get_stats, 0)
            .await?
            .return_value();
        assert_eq!(stats_5.2, 500);

        let stats_10 = client
            .call(&tipping_10_id, &get_stats, 0)
            .await?
            .return_value();
        assert_eq!(stats_10.2, 1000);

        Ok(())
    }

    /// Test XCM asset support
    #[ink_e2e::test]
    async fn test_xcm_asset_support(mut client: Client) -> E2EResult<()> {
        // Deploy cross-chain contract
        let xcm_constructor = CrossChainDonationRef::new(1000, 1337);
        let xcm_id = client
            .instantiate("cross_chain", &xcm_constructor, 0, None)
            .await?
            .account_id;

        let alice = client.alice_account();
        client.set_caller(alice);

        // Check USDC is supported
        let check_usdc = CrossChainDonationRef::is_asset_supported(1337);
        let usdc_supported = client
            .call(&xcm_id, &check_usdc, 0)
            .await?
            .return_value();
        assert!(usdc_supported);

        // Check random asset is not supported
        let check_random = CrossChainDonationRef::is_asset_supported(9999);
        let random_supported = client
            .call(&xcm_id, &check_random, 0)
            .await?
            .return_value();
        assert!(!random_supported);

        // Add new asset support
        let add_asset = CrossChainDonationRef::add_supported_asset(42069); // USDP
        client
            .call(&xcm_id, &add_asset, 0)
            .await?;

        // Verify new asset is supported
        let check_usdp = CrossChainDonationRef::is_asset_supported(42069);
        let usdp_supported = client
            .call(&xcm_id, &check_usdp, 0)
            .await?
            .return_value();
        assert!(usdp_supported);

        Ok(())
    }
}