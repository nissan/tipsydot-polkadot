# Cross-Contract Call Examples

This document demonstrates how Ink! v6 and Solidity contracts can interact seamlessly on pallet-revive.

## 🔄 Bidirectional Contract Interactions

### 1. Solidity Calling Ink! Contract

```solidity
// Solidity contract that calls Ink! tipping contract
pragma solidity ^0.8.20;

interface IInkTipping {
    // Matches the Ink! message with custom selector
    function tip_solidity(uint256 builderId, uint256 amount, bytes memory message) external returns (bool);

    // Direct mapping to Ink! function
    function get_builder_solidity(uint256 builderId) external view returns (
        string memory name,
        string memory description,
        address wallet,
        uint256 totalReceived,
        bool active
    );
}

contract SolidityTippingWrapper {
    IInkTipping public inkContract;
    IERC20 public usdc;

    constructor(address _inkContract, address _usdc) {
        inkContract = IInkTipping(_inkContract);
        usdc = IERC20(_usdc);
    }

    function tipViaInk(uint256 builderId, uint256 amount, string memory message) external {
        // Approve Ink! contract to spend USDC
        usdc.approve(address(inkContract), amount);

        // Call Ink! contract
        bool success = inkContract.tip_solidity(
            builderId,
            amount,
            bytes(message)
        );

        require(success, "Tip failed");

        emit TipSentViaInk(msg.sender, builderId, amount);
    }

    event TipSentViaInk(address indexed sender, uint256 builderId, uint256 amount);
}
```

### 2. Ink! Calling Solidity Contract

```rust
// Ink! v6 contract calling Solidity USDC
#[ink::contract]
mod ink_defi_aggregator {
    use primitive_types::{H160, U256};
    use ethabi::{encode, Token};

    #[ink(storage)]
    pub struct InkDefiAggregator {
        // Solidity USDC contract address
        solidity_usdc: AccountId,
        // Ethereum-compatible address
        solidity_usdc_eth: H160,
    }

    impl InkDefiAggregator {
        #[ink(message)]
        pub fn swap_via_solidity(
            &mut self,
            amount_in: Balance,
            token_out: AccountId,
        ) -> Result<Balance, Error> {
            // Prepare Solidity function call
            let data = self.encode_swap(
                U256::from(amount_in),
                self.account_to_h160(token_out),
            );

            // Call Solidity DEX contract
            use ink::env::call::{build_call, ExecutionInput};

            let result: U256 = build_call::<Environment>()
                .call(self.solidity_dex)
                .gas_limit(10_000_000_000)
                .transferred_value(0)
                .exec_input(ExecutionInput::new(Selector::new([0x00; 4]))
                    .push_arg(data))
                .returns::<U256>()
                .invoke();

            Ok(result.as_u128())
        }

        fn encode_swap(&self, amount: U256, token: H160) -> Vec<u8> {
            let mut data = Vec::new();
            // Function selector for swap(uint256,address)
            data.extend_from_slice(&[0x12, 0x34, 0x56, 0x78]);

            // Encode parameters
            let tokens = vec![
                Token::Uint(amount),
                Token::Address(token),
            ];
            data.extend_from_slice(&ethabi::encode(&tokens));

            data
        }
    }
}
```

## 📊 Complex Integration Example

### Multi-Contract DeFi Protocol

```rust
// Ink! v6 orchestrator contract managing both Ink! and Solidity contracts
#[ink::contract]
mod defi_orchestrator {
    use ink::prelude::vec::Vec;
    use primitive_types::{H160, U256};

    #[derive(scale::Encode, scale::Decode)]
    pub struct ProtocolConfig {
        // Ink! contracts
        ink_lending: AccountId,
        ink_staking: AccountId,

        // Solidity contracts
        sol_dex: H160,
        sol_usdc: H160,
    }

    #[ink(storage)]
    pub struct DefiOrchestrator {
        config: ProtocolConfig,
        user_positions: Mapping<AccountId, Position>,
    }

    impl DefiOrchestrator {
        /// Complex DeFi operation spanning multiple protocols
        #[ink(message)]
        pub fn execute_strategy(
            &mut self,
            amount: Balance,
            strategy_id: u32,
        ) -> Result<(), Error> {
            let caller = self.env().caller();

            match strategy_id {
                1 => {
                    // Strategy 1: Borrow from Ink!, swap on Solidity, stake on Ink!

                    // Step 1: Borrow from Ink! lending protocol
                    self.borrow_from_ink(amount)?;

                    // Step 2: Swap on Solidity DEX
                    let swapped = self.swap_on_solidity(amount)?;

                    // Step 3: Stake on Ink! staking protocol
                    self.stake_on_ink(swapped)?;
                },
                2 => {
                    // Strategy 2: Provide liquidity across protocols

                    // Get USDC from Solidity
                    self.get_usdc_from_solidity(amount)?;

                    // Provide to Ink! AMM
                    self.provide_liquidity_ink(amount)?;
                },
                _ => return Err(Error::InvalidStrategy),
            }

            // Update user position
            let mut position = self.user_positions.get(caller)
                .unwrap_or_default();
            position.strategies.push(strategy_id);
            position.total_value += amount;
            self.user_positions.insert(caller, &position);

            // Emit event compatible with both ecosystems
            self.env().emit_event(StrategyExecuted {
                user: caller,
                strategy_id,
                amount,
                timestamp: self.env().block_timestamp(),
            });

            Ok(())
        }

        fn borrow_from_ink(&self, amount: Balance) -> Result<(), Error> {
            use ink::env::call::{build_call, ExecutionInput, Selector};

            build_call::<Environment>()
                .call(self.config.ink_lending)
                .gas_limit(5_000_000_000)
                .exec_input(
                    ExecutionInput::new(Selector::new(ink::selector_bytes!("borrow")))
                        .push_arg(amount)
                )
                .returns::<Result<(), ()>>()
                .invoke()
                .map_err(|_| Error::BorrowFailed)?;

            Ok(())
        }

        fn swap_on_solidity(&self, amount: Balance) -> Result<Balance, Error> {
            // Encode Solidity swap function
            let data = self.encode_solidity_swap(amount);

            // Call Solidity DEX
            let result: Vec<u8> = build_call::<Environment>()
                .call(self.h160_to_account(self.config.sol_dex))
                .gas_limit(10_000_000_000)
                .exec_input(ExecutionInput::new(Selector::new([0x00; 4]))
                    .push_arg(data))
                .returns::<Vec<u8>>()
                .invoke();

            // Decode result
            let amount_out = self.decode_uint256(result);
            Ok(amount_out)
        }
    }
}
```

## 🔧 Testing Cross-Contract Calls

### JavaScript Test Suite

```javascript
const { ApiPromise, WsProvider } = require('@polkadot/api');
const { ContractPromise } = require('@polkadot/api-contract');
const { ethers } = require('ethers');

describe('Cross-Contract Integration Tests', () => {
    let api;
    let inkContract;
    let solidityContract;

    beforeAll(async () => {
        // Connect to pallet-revive chain
        api = await ApiPromise.create({
            provider: new WsProvider('ws://localhost:9944'),
        });

        // Load Ink! contract
        inkContract = new ContractPromise(
            api,
            inkMetadata,
            inkAddress
        );

        // Load Solidity contract via ethers
        const provider = new ethers.providers.JsonRpcProvider('http://localhost:8545');
        solidityContract = new ethers.Contract(
            solidityAddress,
            solidityABI,
            provider
        );
    });

    test('Solidity can call Ink! function', async () => {
        // Call Ink! contract from Solidity
        const tx = await solidityContract.callInkContract(
            inkAddress,
            'tip',
            [1, ethers.utils.parseUnits('10', 6), 'Test message']
        );

        const receipt = await tx.wait();
        expect(receipt.status).toBe(1);

        // Verify state change in Ink! contract
        const builder = await inkContract.query.getBuilder(alice.address, {}, 1);
        expect(builder.output.toJSON().totalReceived).toBeGreaterThan(0);
    });

    test('Ink! can call Solidity function', async () => {
        // Call Solidity from Ink!
        const { gasRequired } = await inkContract.query.callSolidityUsdc(
            alice.address,
            {},
            bob.address,
            1000000n
        );

        const tx = await inkContract.tx.callSolidityUsdc(
            { gasLimit: gasRequired },
            bob.address,
            1000000n
        );

        await tx.signAndSend(alice);

        // Verify balance change in Solidity USDC
        const balance = await solidityContract.balanceOf(bob.address);
        expect(balance.gt(0)).toBe(true);
    });

    test('Complex multi-contract flow', async () => {
        // 1. Mint USDC in Solidity
        await solidityContract.mint(alice.address, ethers.utils.parseUnits('1000', 6));

        // 2. Approve Ink! contract in Solidity
        await solidityContract.approve(inkAddress, ethers.utils.parseUnits('1000', 6));

        // 3. Execute tip through Ink! contract
        const { gasRequired } = await inkContract.query.tipWithSolidityUsdc(
            alice.address,
            {},
            1,
            ethers.utils.parseUnits('100', 6),
            'Cross-contract tip!'
        );

        const tx = await inkContract.tx.tipWithSolidityUsdc(
            { gasLimit: gasRequired },
            1,
            ethers.utils.parseUnits('100', 6),
            'Cross-contract tip!'
        );

        const result = await tx.signAndSend(alice);

        // 4. Verify events from both contracts
        const inkEvents = result.events.filter(e => e.event.section === 'contracts');
        const solidityEvents = await solidityContract.queryFilter('Transfer');

        expect(inkEvents.length).toBeGreaterThan(0);
        expect(solidityEvents.length).toBeGreaterThan(0);
    });
});
```

## 🎯 Best Practices

### 1. Address Handling
Always validate and convert addresses properly:

```rust
// Ink! v6 helper functions
impl Contract {
    fn account_to_h160(&self, account: &AccountId) -> H160 {
        let bytes = account.as_ref();
        H160::from_slice(&bytes[0..20])
    }

    fn h160_to_account(&self, eth_addr: H160) -> AccountId {
        let mut bytes = [0u8; 32];
        bytes[0..20].copy_from_slice(eth_addr.as_bytes());
        AccountId::from(bytes)
    }
}
```

### 2. Gas Management
Set appropriate gas limits for cross-contract calls:

```rust
// Conservative gas limits for different operations
const GAS_LIMIT_TRANSFER: u64 = 5_000_000_000;
const GAS_LIMIT_SWAP: u64 = 10_000_000_000;
const GAS_LIMIT_COMPLEX: u64 = 20_000_000_000;
```

### 3. Error Handling
Properly handle errors from both contract types:

```rust
#[derive(Debug, PartialEq, Eq, scale::Encode, scale::Decode)]
pub enum Error {
    InkCallFailed,
    SolidityCallFailed,
    InvalidAddress,
    InsufficientGas,
    DecodingFailed,
}
```

### 4. Event Compatibility
Emit events that both ecosystems can understand:

```rust
// Ink! event with Solidity-compatible structure
#[ink(event)]
#[derive(AbiEncode)] // For Solidity compatibility
pub struct CrossContractEvent {
    #[ink(topic)]
    caller: AccountId,
    #[ink(topic)]
    target: H160, // Ethereum address
    value: U256,  // Solidity uint256
    data: Vec<u8>,
}
```

## 🚀 Advanced Patterns

### Factory Pattern for Mixed Deployments

```rust
#[ink::contract]
mod contract_factory {
    #[ink(message)]
    pub fn deploy_mixed_protocol(
        &mut self,
        ink_code_hash: Hash,
        solidity_bytecode: Vec<u8>,
    ) -> Result<(AccountId, H160), Error> {
        // Deploy Ink! contract
        let ink_address = self.deploy_ink(ink_code_hash)?;

        // Deploy Solidity contract
        let sol_address = self.deploy_solidity(solidity_bytecode)?;

        // Link contracts together
        self.link_contracts(ink_address, sol_address)?;

        Ok((ink_address, sol_address))
    }
}
```

### Proxy Pattern for Upgradability

```rust
#[ink::contract]
mod upgradeable_proxy {
    #[ink(storage)]
    pub struct Proxy {
        // Can point to either Ink! or Solidity implementation
        implementation: AccountId,
        implementation_type: ContractType,
    }

    #[derive(scale::Encode, scale::Decode)]
    pub enum ContractType {
        Ink,
        Solidity,
    }

    #[ink(message)]
    pub fn forward_call(&mut self, data: Vec<u8>) -> Vec<u8> {
        match self.implementation_type {
            ContractType::Ink => self.forward_to_ink(data),
            ContractType::Solidity => self.forward_to_solidity(data),
        }
    }
}
```

---

*These examples demonstrate the seamless interoperability between Ink! v6 and Solidity contracts on pallet-revive, enabling developers to leverage the best of both ecosystems.*