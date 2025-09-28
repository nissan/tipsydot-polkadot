#![cfg_attr(not(feature = "std"), no_std, no_main)]

/// A simple test contract to verify Ink! setup
#[ink::contract]
mod simple_test {
    use ink::storage::Mapping;

    #[ink(storage)]
    pub struct SimpleTest {
        value: i32,
        balances: Mapping<AccountId, Balance>,
    }

    impl SimpleTest {
        #[ink(constructor)]
        pub fn new(init_value: i32) -> Self {
            Self {
                value: init_value,
                balances: Mapping::new(),
            }
        }

        #[ink(constructor)]
        pub fn default() -> Self {
            Self::new(0)
        }

        #[ink(message)]
        pub fn get(&self) -> i32 {
            self.value
        }

        #[ink(message)]
        pub fn set(&mut self, new_value: i32) {
            self.value = new_value;
        }

        #[ink(message)]
        pub fn increment(&mut self) {
            self.value += 1;
        }

        #[ink(message)]
        pub fn get_balance(&self, account: AccountId) -> Balance {
            self.balances.get(account).unwrap_or(0)
        }

        #[ink(message)]
        pub fn set_balance(&mut self, account: AccountId, amount: Balance) {
            self.balances.insert(account, &amount);
        }
    }

    #[cfg(test)]
    mod tests {
        use super::*;

        #[ink::test]
        fn default_works() {
            let contract = SimpleTest::default();
            assert_eq!(contract.get(), 0);
        }

        #[ink::test]
        fn set_works() {
            let mut contract = SimpleTest::new(100);
            assert_eq!(contract.get(), 100);

            contract.set(200);
            assert_eq!(contract.get(), 200);
        }

        #[ink::test]
        fn increment_works() {
            let mut contract = SimpleTest::new(5);
            contract.increment();
            assert_eq!(contract.get(), 6);
        }

        #[ink::test]
        fn balances_work() {
            let mut contract = SimpleTest::default();
            let account = AccountId::from([0x01; 32]);

            assert_eq!(contract.get_balance(account), 0);

            contract.set_balance(account, 1000);
            assert_eq!(contract.get_balance(account), 1000);
        }
    }
}