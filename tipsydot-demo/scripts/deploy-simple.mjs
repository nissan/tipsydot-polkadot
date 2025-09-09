#!/usr/bin/env node

import { ethers } from "ethers";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Deploy contracts to Anvil
async function main() {
  console.log("🚀 Deploying TipsyDot contracts to Anvil...");

  // Connect to Anvil
  const provider = new ethers.providers.JsonRpcProvider(
    "http://127.0.0.1:8545",
  );
  const signer = new ethers.Wallet(
    "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
    provider,
  );

  console.log("📍 Deployer address:", signer.address);

  const balance = await provider.getBalance(signer.address);
  console.log("💰 Balance:", ethers.utils.formatEther(balance), "ETH");

  // Deploy MockUSDC
  console.log("\n1️⃣ Deploying MockUSDC...");
  const mockUsdcJson = JSON.parse(
    fs.readFileSync(
      path.join(__dirname, "../artifacts/contracts/MockUSDC.sol/MockUSDC.json"),
      "utf8",
    ),
  );

  const MockUSDC = new ethers.ContractFactory(
    mockUsdcJson.abi,
    mockUsdcJson.bytecode,
    signer,
  );

  const mockUsdc = await MockUSDC.deploy();
  await mockUsdc.deployed();
  console.log("✅ MockUSDC deployed at:", mockUsdc.address);

  // Deploy SecureXCMDonation
  console.log("\n2️⃣ Deploying SecureXCMDonation...");
  const donationJson = JSON.parse(
    fs.readFileSync(
      path.join(
        __dirname,
        "../artifacts/contracts/SecureXCMDonation.sol/SecureXCMDonation.json",
      ),
      "utf8",
    ),
  );

  const SecureXCMDonation = new ethers.ContractFactory(
    donationJson.abi,
    donationJson.bytecode,
    signer,
  );

  const donation = await SecureXCMDonation.deploy(
    "0x0000000000000000000000000000000000000802", // Assets precompile
    "0x0000000000000000000000000000000000000803", // XCM precompile
    1337, // USDC asset ID
    1000, // AssetHub para ID
  );
  await donation.deployed();
  console.log("✅ SecureXCMDonation deployed at:", donation.address);

  // Save deployment addresses
  const deployment = {
    network: "localhost",
    chainId: 420420421,
    contracts: {
      MockUSDC: mockUsdc.address,
      SecureXCMDonation: donation.address,
    },
    deployedAt: new Date().toISOString(),
  };

  fs.writeFileSync(
    path.join(__dirname, "../deployments.json"),
    JSON.stringify(deployment, null, 2),
  );

  console.log("\n✅ Deployment complete!");
  console.log("📄 Addresses saved to deployments.json");

  // Update .env.local with addresses
  const envPath = path.join(__dirname, "../.env.local");
  if (fs.existsSync(envPath)) {
    let envContent = fs.readFileSync(envPath, "utf8");

    // Update or add contract addresses
    if (envContent.includes("NEXT_PUBLIC_DONATION_CONTRACT=")) {
      envContent = envContent.replace(
        /NEXT_PUBLIC_DONATION_CONTRACT=.*/,
        `NEXT_PUBLIC_DONATION_CONTRACT=${donation.address}`,
      );
    } else {
      envContent += `\nNEXT_PUBLIC_DONATION_CONTRACT=${donation.address}`;
    }

    if (envContent.includes("NEXT_PUBLIC_MOCK_USDC_CONTRACT=")) {
      envContent = envContent.replace(
        /NEXT_PUBLIC_MOCK_USDC_CONTRACT=.*/,
        `NEXT_PUBLIC_MOCK_USDC_CONTRACT=${mockUsdc.address}`,
      );
    } else {
      envContent += `\nNEXT_PUBLIC_MOCK_USDC_CONTRACT=${mockUsdc.address}`;
    }

    fs.writeFileSync(envPath, envContent);
    console.log("✅ Updated .env.local with contract addresses");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
