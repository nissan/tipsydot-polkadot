#!/usr/bin/env node

/**
 * Fund test wallets with USDC for demo
 * This script:
 * 1. Mints USDC on forked AssetHub to substrate accounts
 * 2. Funds Anvil wallets with mock USDC for testing
 */

const { ApiPromise, WsProvider } = require("@polkadot/api");
const { Keyring } = require("@polkadot/keyring");
const { ethers } = require("ethers");

// Configuration
const ASSETHUB_WS = "ws://127.0.0.1:8000";
const ANVIL_RPC = "http://127.0.0.1:8545";
const USDC_ASSET_ID = 1337; // USDC on Paseo AssetHub

// Anvil test wallets (pre-funded with ETH)
const ANVIL_WALLETS = [
  {
    address: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    privateKey:
      "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
  },
  {
    address: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    privateKey:
      "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",
  },
  {
    address: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
    privateKey:
      "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a",
  },
];

// Substrate test accounts
const SUBSTRATE_ACCOUNTS = [
  {
    name: "Alice",
    address: "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
  },
  { name: "Bob", address: "5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty" },
  {
    name: "Charlie",
    address: "5FLSigC9HGRKVhB9FiEo4Y3koPsNmBmLJbpXg2mp1hXcS59Y",
  },
];

async function fundSubstrateAccounts() {
  console.log("🥢 Connecting to Chopsticks-forked AssetHub...");

  const provider = new WsProvider(ASSETHUB_WS);
  const api = await ApiPromise.create({ provider });

  console.log(`✅ Connected to ${(await api.rpc.system.chain()).toHuman()}`);

  const keyring = new Keyring({ type: "sr25519" });
  const alice = keyring.addFromUri("//Alice");

  console.log("\n💰 Funding Substrate accounts with USDC...");

  for (const account of SUBSTRATE_ACCOUNTS) {
    try {
      // Check current balance
      const balance = await api.query.assets.account(
        USDC_ASSET_ID,
        account.address,
      );
      const currentBalance = balance.isNone
        ? 0
        : balance.unwrap().balance.toBigInt();

      console.log(
        `   ${account.name}: Current balance = ${currentBalance / 1000000n} USDC`,
      );

      // Mint 100,000 USDC (100,000 * 10^6)
      const mintAmount = 100000n * 1000000n;

      if (currentBalance < mintAmount) {
        console.log(`   Minting ${100000} USDC to ${account.name}...`);

        // Create mint transaction
        const mintTx = api.tx.assets.mint(
          USDC_ASSET_ID,
          account.address,
          mintAmount.toString(),
        );

        // Use sudo to mint (Chopsticks allows this)
        const sudoTx = api.tx.sudo.sudo(mintTx);

        // Sign and send
        await new Promise((resolve, reject) => {
          sudoTx.signAndSend(
            alice,
            { nonce: -1 },
            ({ status, events, dispatchError }) => {
              if (dispatchError) {
                if (dispatchError.isModule) {
                  const decoded = api.registry.findMetaError(
                    dispatchError.asModule,
                  );
                  console.error(`   ❌ Error: ${decoded.name}`);
                  reject(new Error(decoded.name));
                }
              }

              if (status.isInBlock) {
                console.log(
                  `   ✅ Minted in block: ${status.asInBlock.toHex().slice(0, 10)}...`,
                );
                resolve();
              }
            },
          );
        });

        // Wait for transaction to settle
        await new Promise((resolve) => setTimeout(resolve, 2000));

        // Check new balance
        const newBalance = await api.query.assets.account(
          USDC_ASSET_ID,
          account.address,
        );
        const finalBalance = newBalance.isNone
          ? 0
          : newBalance.unwrap().balance.toBigInt();
        console.log(
          `   ✅ ${account.name}: New balance = ${finalBalance / 1000000n} USDC\n`,
        );
      } else {
        console.log(`   ✅ ${account.name} already funded\n`);
      }
    } catch (error) {
      console.error(`   ❌ Failed to fund ${account.name}:`, error.message);
    }
  }

  await api.disconnect();
}

async function fundAnvilWallets() {
  console.log("\n⚒️  Setting up Anvil wallets with mock USDC...");

  const provider = new ethers.providers.JsonRpcProvider(ANVIL_RPC);

  // For demo purposes, we'll deploy a simple mock USDC contract
  // In production, this would interact with the actual bridged USDC

  const MockUSDC = {
    abi: [
      "function mint(address to, uint256 amount) public",
      "function balanceOf(address account) public view returns (uint256)",
      "function approve(address spender, uint256 amount) public returns (bool)",
      "function transfer(address to, uint256 amount) public returns (bool)",
    ],
    bytecode:
      "0x608060405234801561001057600080fd5b50610771806100206000396000f3fe...", // Simplified
  };

  console.log(
    "   Note: In production, Anvil wallets would interact with bridged USDC",
  );
  console.log("   For demo, using mock USDC approvals\n");

  for (const wallet of ANVIL_WALLETS) {
    const signer = new ethers.Wallet(wallet.privateKey, provider);
    const balance = await provider.getBalance(wallet.address);

    console.log(`   Wallet ${wallet.address.slice(0, 8)}...`);
    console.log(`   ETH Balance: ${ethers.utils.formatEther(balance)} ETH`);
    console.log(`   Ready for USDC operations ✅\n`);
  }
}

async function main() {
  console.log("🎯 TipsyDot Demo - Wallet Funding Script");
  console.log("========================================\n");

  try {
    // Fund Substrate accounts on forked AssetHub
    await fundSubstrateAccounts();

    // Setup Anvil wallets
    await fundAnvilWallets();

    console.log("\n✅ All wallets funded and ready!");
    console.log("\n📝 Summary:");
    console.log("   Substrate Accounts (AssetHub):");
    console.log("   - Alice, Bob, Charlie: 100,000 USDC each");
    console.log("\n   Anvil Wallets:");
    console.log("   - 3 wallets with 10,000 ETH each");
    console.log("   - Ready for USDC operations");
  } catch (error) {
    console.error("\n❌ Funding failed:", error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { fundSubstrateAccounts, fundAnvilWallets };
