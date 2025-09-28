#![cfg_attr(not(feature = "std"), no_std, no_main)]

#[ink::contract]
pub mod cross_chain {
    use ink::prelude::{string::String, vec::Vec};
    use ink::storage::Mapping;
    use scale::{Decode, Encode};

    /// Represents a parachain builder with substrate address
    #[derive(Debug, Clone, Encode, Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
    pub struct ParachainBuilder {
        pub name: String,
        pub project: String,
        pub substrate_address: String, // SS58 encoded address
        pub parachain_id: u32,
        pub total_received: Balance,
        pub active: bool,
    }

    /// XCM transfer details
    #[derive(Debug, Clone, Encode, Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
    pub struct XcmTransfer {
        pub from: AccountId,
        pub to_substrate: String,
        pub parachain_id: u32,
        pub asset_id: u32,
        pub amount: Balance,
        pub timestamp: Timestamp,
        pub status: TransferStatus,
    }

    #[derive(Debug, Clone, Encode, Decode, PartialEq)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
    pub enum TransferStatus {
        Pending,
        Sent,
        Confirmed,
        Failed,
    }

    /// Events emitted by the contract
    #[ink(event)]
    pub struct CrossChainDonation {
        #[ink(topic)]
        donor: AccountId,
        #[ink(topic)]
        builder_id: u32,
        amount: Balance,
        substrate_address: String,
        parachain_id: u32,
        timestamp: Timestamp,
    }

    #[ink(event)]
    pub struct XcmTransferInitiated {
        #[ink(topic)]
        transfer_id: u64,
        from: AccountId,
        to: String,
        amount: Balance,
        parachain_id: u32,
    }

    #[ink(event)]
    pub struct XcmTransferCompleted {
        #[ink(topic)]
        transfer_id: u64,
        success: bool,
    }

    /// Errors that can occur
    #[derive(Debug, PartialEq, Eq, Encode, Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
    pub enum CrossChainError {
        InvalidBuilder,
        BuilderNotActive,
        InvalidAmount,
        TransferFailed,
        Unauthorized,
        InvalidParachain,
        XcmExecutionFailed,
        AssetNotSupported,
    }

    /// The cross-chain donation contract
    #[ink(storage)]
    pub struct CrossChainDonation {
        /// Contract owner
        owner: AccountId,
        /// AssetHub parachain ID (usually 1000)
        asset_hub_id: u32,
        /// USDC asset ID on AssetHub
        usdc_asset_id: u32,
        /// Mapping of builder ID to builder details
        builders: Mapping<u32, ParachainBuilder>,
        /// Number of builders
        builder_count: u32,
        /// XCM transfers history
        transfers: Mapping<u64, XcmTransfer>,
        /// Transfer nonce for unique IDs
        transfer_nonce: u64,
        /// Supported asset IDs for cross-chain transfers
        supported_assets: Mapping<u32, bool>,
        /// Contract pause state
        paused: bool,
    }

    impl CrossChainDonation {
        /// Creates a new cross-chain donation contract
        #[ink(constructor)]
        pub fn new(asset_hub_id: u32, usdc_asset_id: u32) -> Self {
            let mut contract = Self {
                owner: Self::env().caller(),
                asset_hub_id,
                usdc_asset_id,
                builders: Mapping::new(),
                builder_count: 0,
                transfers: Mapping::new(),
                transfer_nonce: 0,
                supported_assets: Mapping::new(),
                paused: false,
            };

            // Add USDC as supported asset
            contract.supported_assets.insert(usdc_asset_id, &true);

            // Initialize with demo builders
            contract.init_demo_builders();

            contract
        }

        /// Initialize demo parachain builders
        fn init_demo_builders(&mut self) {
            let builders = vec![
                (
                    "Alice - Moonbeam",
                    "EVM Smart Contracts for Polkadot",
                    "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
                    2004, // Moonbeam parachain ID
                ),
                (
                    "Bob - Astar",
                    "WASM & EVM Multi-VM Platform",
                    "5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty",
                    2006, // Astar parachain ID
                ),
                (
                    "Charlie - Acala",
                    "DeFi Hub of Polkadot",
                    "5FLSigC9HGRKVhB9FiEo4Y3koPsNmBmLJbpXg2mp1hXcS59Y",
                    2000, // Acala parachain ID
                ),
            ];

            for (name, project, address, para_id) in builders {
                self.builder_count += 1;
                let builder = ParachainBuilder {
                    name: String::from(name),
                    project: String::from(project),
                    substrate_address: String::from(address),
                    parachain_id: para_id,
                    total_received: 0,
                    active: true,
                };
                self.builders.insert(self.builder_count, &builder);
            }
        }

        /// Donate to a parachain builder (triggers XCM transfer)
        #[ink(message)]
        pub fn donate(
            &mut self,
            builder_id: u32,
            amount: Balance,
        ) -> Result<u64, CrossChainError> {
            self.ensure_not_paused()?;

            if amount < 1_000_000 {
                return Err(CrossChainError::InvalidAmount); // Min 1 USDC (6 decimals)
            }

            let mut builder = self.builders.get(builder_id)
                .ok_or(CrossChainError::InvalidBuilder)?;

            if !builder.active {
                return Err(CrossChainError::BuilderNotActive);
            }

            // Create XCM transfer record
            self.transfer_nonce += 1;
            let transfer_id = self.transfer_nonce;

            let transfer = XcmTransfer {
                from: self.env().caller(),
                to_substrate: builder.substrate_address.clone(),
                parachain_id: builder.parachain_id,
                asset_id: self.usdc_asset_id,
                amount,
                timestamp: self.env().block_timestamp(),
                status: TransferStatus::Pending,
            };

            self.transfers.insert(transfer_id, &transfer);

            // In production: Build and execute XCM message here
            // For now, we simulate the transfer
            self.execute_xcm_transfer(transfer_id)?;

            // Update builder stats
            builder.total_received += amount;
            self.builders.insert(builder_id, &builder);

            // Emit events
            self.env().emit_event(CrossChainDonation {
                donor: self.env().caller(),
                builder_id,
                amount,
                substrate_address: builder.substrate_address,
                parachain_id: builder.parachain_id,
                timestamp: self.env().block_timestamp(),
            });

            self.env().emit_event(XcmTransferInitiated {
                transfer_id,
                from: self.env().caller(),
                to: transfer.to_substrate,
                amount,
                parachain_id: builder.parachain_id,
            });

            Ok(transfer_id)
        }

        /// Simulate XCM transfer execution
        fn execute_xcm_transfer(&mut self, transfer_id: u64) -> Result<(), CrossChainError> {
            let mut transfer = self.transfers.get(transfer_id)
                .ok_or(CrossChainError::TransferFailed)?;

            // In production: Build XCM message
            // let message = Xcm(vec![
            //     WithdrawAsset(asset),
            //     InitiateReserveWithdraw {
            //         assets: All.into(),
            //         reserve: parachain_location,
            //         xcm: Xcm(vec![
            //             BuyExecution { fees, weight_limit },
            //             DepositAsset {
            //                 assets: All.into(),
            //                 beneficiary,
            //             },
            //         ]),
            //     },
            // ]);

            // Simulate successful execution
            transfer.status = TransferStatus::Sent;
            self.transfers.insert(transfer_id, &transfer);

            Ok(())
        }

        /// Confirm XCM transfer completion (called by relayer or oracle)
        #[ink(message)]
        pub fn confirm_transfer(&mut self, transfer_id: u64) -> Result<(), CrossChainError> {
            self.ensure_owner()?;

            let mut transfer = self.transfers.get(transfer_id)
                .ok_or(CrossChainError::TransferFailed)?;

            transfer.status = TransferStatus::Confirmed;
            self.transfers.insert(transfer_id, &transfer);

            self.env().emit_event(XcmTransferCompleted {
                transfer_id,
                success: true,
            });

            Ok(())
        }

        /// Add a new parachain builder
        #[ink(message)]
        pub fn add_builder(
            &mut self,
            name: String,
            project: String,
            substrate_address: String,
            parachain_id: u32,
        ) -> Result<u32, CrossChainError> {
            self.ensure_owner()?;
            self.ensure_not_paused()?;

            self.builder_count += 1;
            let builder_id = self.builder_count;

            let builder = ParachainBuilder {
                name,
                project,
                substrate_address,
                parachain_id,
                total_received: 0,
                active: true,
            };

            self.builders.insert(builder_id, &builder);
            Ok(builder_id)
        }

        /// Get builder details
        #[ink(message)]
        pub fn get_builder(&self, builder_id: u32) -> Option<ParachainBuilder> {
            self.builders.get(builder_id)
        }

        /// Get all builders
        #[ink(message)]
        pub fn get_all_builders(&self) -> Vec<(u32, ParachainBuilder)> {
            let mut builders = Vec::new();
            for id in 1..=self.builder_count {
                if let Some(builder) = self.builders.get(id) {
                    builders.push((id, builder));
                }
            }
            builders
        }

        /// Get transfer details
        #[ink(message)]
        pub fn get_transfer(&self, transfer_id: u64) -> Option<XcmTransfer> {
            self.transfers.get(transfer_id)
        }

        /// Add supported asset
        #[ink(message)]
        pub fn add_supported_asset(&mut self, asset_id: u32) -> Result<(), CrossChainError> {
            self.ensure_owner()?;
            self.supported_assets.insert(asset_id, &true);
            Ok(())
        }

        /// Check if asset is supported
        #[ink(message)]
        pub fn is_asset_supported(&self, asset_id: u32) -> bool {
            self.supported_assets.get(asset_id).unwrap_or(false)
        }

        /// Pause the contract
        #[ink(message)]
        pub fn pause(&mut self) -> Result<(), CrossChainError> {
            self.ensure_owner()?;
            self.paused = true;
            Ok(())
        }

        /// Unpause the contract
        #[ink(message)]
        pub fn unpause(&mut self) -> Result<(), CrossChainError> {
            self.ensure_owner()?;
            self.paused = false;
            Ok(())
        }

        /// Helper: ensure caller is owner
        fn ensure_owner(&self) -> Result<(), CrossChainError> {
            if self.env().caller() != self.owner {
                return Err(CrossChainError::Unauthorized);
            }
            Ok(())
        }

        /// Helper: ensure contract is not paused
        fn ensure_not_paused(&self) -> Result<(), CrossChainError> {
            if self.paused {
                return Err(CrossChainError::Unauthorized);
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

        fn create_contract() -> CrossChainDonation {
            CrossChainDonation::new(1000, 1337) // AssetHub at 1000, USDC at 1337
        }

        #[ink::test]
        fn constructor_works() {
            let contract = create_contract();
            assert_eq!(contract.builder_count, 3);
            assert_eq!(contract.asset_hub_id, 1000);
            assert_eq!(contract.usdc_asset_id, 1337);
            assert!(contract.is_asset_supported(1337));
            assert!(!contract.paused);
        }

        #[ink::test]
        fn donate_creates_transfer() {
            let mut contract = create_contract();

            let result = contract.donate(1, 10_000_000); // 10 USDC
            assert!(result.is_ok());

            let transfer_id = result.unwrap();
            let transfer = contract.get_transfer(transfer_id).unwrap();

            assert_eq!(transfer.amount, 10_000_000);
            assert_eq!(transfer.parachain_id, 2004); // Moonbeam
            assert_eq!(transfer.status, TransferStatus::Sent);
        }

        #[ink::test]
        fn donate_invalid_amount() {
            let mut contract = create_contract();

            let result = contract.donate(1, 500_000); // 0.5 USDC (below minimum)
            assert_eq!(result, Err(CrossChainError::InvalidAmount));
        }

        #[ink::test]
        fn donate_invalid_builder() {
            let mut contract = create_contract();

            let result = contract.donate(999, 10_000_000);
            assert_eq!(result, Err(CrossChainError::InvalidBuilder));
        }

        #[ink::test]
        fn confirm_transfer_works() {
            let mut contract = create_contract();

            let transfer_id = contract.donate(1, 10_000_000).unwrap();
            assert!(contract.confirm_transfer(transfer_id).is_ok());

            let transfer = contract.get_transfer(transfer_id).unwrap();
            assert_eq!(transfer.status, TransferStatus::Confirmed);
        }

        #[ink::test]
        fn add_builder_works() {
            let mut contract = create_contract();

            let result = contract.add_builder(
                "Dave - HydraDX".into(),
                "Liquidity Protocol".into(),
                "5DAAnrj7VHTznn2AWBemMuyBwZWs6FNFjdyVXUeYum3PTXFy".into(),
                2034,
            );

            assert!(result.is_ok());
            assert_eq!(contract.builder_count, 4);

            let builder = contract.get_builder(4).unwrap();
            assert_eq!(builder.name, "Dave - HydraDX");
            assert_eq!(builder.parachain_id, 2034);
        }

        #[ink::test]
        fn add_supported_asset_works() {
            let mut contract = create_contract();

            assert!(contract.add_supported_asset(42069).is_ok()); // USDP
            assert!(contract.is_asset_supported(42069));
        }

        #[ink::test]
        fn pause_works() {
            let mut contract = create_contract();

            assert!(contract.pause().is_ok());
            assert!(contract.paused);

            let result = contract.donate(1, 10_000_000);
            assert_eq!(result, Err(CrossChainError::Unauthorized));

            assert!(contract.unpause().is_ok());
            assert!(!contract.paused);
        }

        #[ink::test]
        fn unauthorized_operations() {
            let mut contract = create_contract();
            let accounts = default_accounts();

            test::set_caller::<Environment>(accounts.bob);

            assert_eq!(contract.pause(), Err(CrossChainError::Unauthorized));
            assert_eq!(contract.confirm_transfer(1), Err(CrossChainError::Unauthorized));
            assert_eq!(contract.add_supported_asset(123), Err(CrossChainError::Unauthorized));
        }
    }
}