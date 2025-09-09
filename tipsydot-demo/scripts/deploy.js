const hre = require("hardhat");

async function main() {
  console.log("🚀 Deploying TipsyDot Demo Contracts...");
  console.log("========================================\n");

  // Get deployer account
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  const balance = await deployer.getBalance();
  console.log(
    "Account balance:",
    hre.ethers.utils.formatEther(balance),
    "ETH\n",
  );

  // Deploy MockUSDC for testing
  console.log("📝 Deploying MockUSDC...");
  const MockUSDC = await hre.ethers.getContractFactory("MockUSDC");
  const mockUSDC = await MockUSDC.deploy();
  await mockUSDC.deployed();
  console.log("✅ MockUSDC deployed to:", mockUSDC.address);

  // Deploy USDCDonation contract
  console.log("\n📝 Deploying USDCDonation contract...");
  const USDCDonation = await hre.ethers.getContractFactory("USDCDonation");
  const donation = await USDCDonation.deploy();
  await donation.deployed();
  console.log("✅ USDCDonation deployed to:", donation.address);

  // Verify builders are set up
  console.log("\n🔍 Verifying pre-populated builders...");
  const builderCount = await donation.builderCount();
  console.log(`   Total builders: ${builderCount}`);

  for (let i = 0; i < builderCount; i++) {
    const builder = await donation.getBuilder(i);
    console.log(`   Builder ${i}: ${builder.name}`);
    console.log(`      Project: ${builder.project}`);
    console.log(`      Substrate: ${builder.substrateAddress.slice(0, 10)}...`);
  }

  // Mint USDC to test wallets
  console.log("\n💰 Minting USDC to test wallets...");
  const testWallets = [
    "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
  ];

  const mintAmount = hre.ethers.utils.parseUnits("10000", 6); // 10,000 USDC

  for (const wallet of testWallets) {
    await mockUSDC.mint(wallet, mintAmount);
    const balance = await mockUSDC.balanceOf(wallet);
    console.log(
      `   ✅ ${wallet.slice(0, 8)}... : ${hre.ethers.utils.formatUnits(balance, 6)} USDC`,
    );
  }

  // Save deployment addresses
  const deploymentInfo = {
    network: "localhost",
    chainId: 420420421,
    contracts: {
      MockUSDC: mockUSDC.address,
      USDCDonation: donation.address,
    },
    timestamp: new Date().toISOString(),
  };

  const fs = require("fs");
  fs.writeFileSync(
    "./deployments.json",
    JSON.stringify(deploymentInfo, null, 2),
  );

  console.log("\n✅ Deployment complete!");
  console.log("========================================");
  console.log("📄 Contract Addresses:");
  console.log(`   MockUSDC: ${mockUSDC.address}`);
  console.log(`   USDCDonation: ${donation.address}`);
  console.log("\n📝 Deployment info saved to deployments.json");
  console.log("\n🎯 Ready for demo!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
