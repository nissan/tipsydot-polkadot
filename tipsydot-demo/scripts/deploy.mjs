import hre from "hardhat";
import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  console.log("🚀 Deploying to Frontier (Native Polkadot EVM)...");

  // Deploy MockUSDC
  const MockUSDC = await hre.ethers.getContractFactory("FaucetToken");
  const mockUSDC = await MockUSDC.deploy("Mock USDC", "USDC", 6);
  await mockUSDC.waitForDeployment();
  const usdcAddress = await mockUSDC.getAddress();
  console.log("✅ MockUSDC deployed to:", usdcAddress);

  // Deploy USDCDonation
  const USDCDonation = await hre.ethers.getContractFactory("USDCDonation");
  const donation = await USDCDonation.deploy(usdcAddress);
  await donation.waitForDeployment();
  const donationAddress = await donation.getAddress();
  console.log("✅ USDCDonation deployed to:", donationAddress);

  // Save deployed addresses
  const deployedContracts = {
    mockUSDC: usdcAddress,
    usdcDonation: donationAddress,
    network: "frontier",
    chainId: 42,
    deployedAt: new Date().toISOString()
  };

  const deploymentPath = path.join(__dirname, "..", "deployments", "frontier.json");
  fs.mkdirSync(path.dirname(deploymentPath), { recursive: true });
  fs.writeFileSync(deploymentPath, JSON.stringify(deployedContracts, null, 2));

  console.log("\n📝 Deployment saved to:", deploymentPath);
  console.log("\n🎉 Deployment complete! Using native Polkadot EVM (Frontier)");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});