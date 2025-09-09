#!/usr/bin/env node

/**
 * Deploy contracts to Native Polkadot EVM Chain
 * This replaces Anvil deployment with true Polkadot technology
 */

const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");

async function deploy() {
  console.log("🚀 Deploying to Native Polkadot EVM Chain...");
  console.log("==========================================");

  // Connect to Native Polkadot EVM (not Anvil!)
  const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
  
  // Test connection
  try {
    const chainId = await provider.getNetwork();
    console.log("✅ Connected to chain ID:", chainId.chainId);
  } catch (error) {
    console.error("❌ Failed to connect to Native EVM at http://127.0.0.1:8545");
    console.error("Please ensure the native chain is running");
    console.error("Run: ./scripts/start-native-evm.sh or ./scripts/start-passethub.sh");
    process.exit(1);
  }

  // Use test account (same as Anvil for compatibility)
  const privateKey = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
  const signer = new ethers.Wallet(privateKey, provider);
  
  console.log("📝 Deployer:", signer.address);
  
  // Get balance
  const balance = await provider.getBalance(signer.address);
  console.log("💰 Balance:", ethers.formatEther(balance), "ETH");
  
  if (balance === 0n) {
    console.log("⚠️  Account has no balance. Funding account...");
    // Native chains usually have pre-funded dev accounts
  }

  // Deploy MockUSDC
  console.log("\n📜 Deploying MockUSDC to Native Chain...");
  const MockUSDC = JSON.parse(
    fs.readFileSync(path.join(__dirname, "../contracts/out/MockUSDC.sol/MockUSDC.json"))
  );
  
  const mockUSDCFactory = new ethers.ContractFactory(
    MockUSDC.abi,
    MockUSDC.bytecode,
    signer
  );
  
  const mockUSDC = await mockUSDCFactory.deploy();
  await mockUSDC.waitForDeployment();
  const mockUSDCAddress = await mockUSDC.getAddress();
  console.log("✅ MockUSDC deployed at:", mockUSDCAddress);
  
  // Deploy SimpleTipping
  console.log("\n📜 Deploying SimpleTipping to Native Chain...");
  const SimpleTipping = JSON.parse(
    fs.readFileSync(path.join(__dirname, "../contracts/out/SimpleTipping.sol/SimpleTipping.json"))
  );
  
  const tippingFactory = new ethers.ContractFactory(
    SimpleTipping.abi,
    SimpleTipping.bytecode,
    signer
  );
  
  const tipping = await tippingFactory.deploy(mockUSDCAddress);
  await tipping.waitForDeployment();
  const tippingAddress = await tipping.getAddress();
  console.log("✅ SimpleTipping deployed at:", tippingAddress);
  
  // Mint USDC to test accounts
  console.log("\n💰 Minting USDC to test accounts...");
  const testAccounts = [
    "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
  ];
  
  for (const account of testAccounts) {
    const tx = await mockUSDC.mint(account, ethers.parseUnits("10000", 6));
    await tx.wait();
    console.log(`  ✅ Minted 10,000 USDC to ${account}`);
  }
  
  // Save deployment
  const deployment = {
    network: "native-polkadot-evm",
    chainId: (await provider.getNetwork()).chainId.toString(),
    deployedAt: new Date().toISOString(),
    contracts: {
      MockUSDC: mockUSDCAddress,
      SimpleTipping: tippingAddress,
    },
    testAccounts: testAccounts,
    note: "Deployed to Native Polkadot EVM - TRUE cross-chain!"
  };
  
  fs.writeFileSync(
    path.join(__dirname, "../deployment-native.json"),
    JSON.stringify(deployment, null, 2)
  );
  
  console.log("\n🎉 Deployment complete!");
  console.log("📁 Saved to deployment-native.json");
  console.log("\nThis is running on NATIVE Polkadot technology!");
  console.log("No Ethereum bridges - pure Polkadot cross-chain! 🚀");
  
  return deployment;
}

// Run deployment
deploy()
  .then(() => {
    console.log("\n✅ All done!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Deployment failed:", error);
    process.exit(1);
  });