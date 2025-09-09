#!/usr/bin/env node

import solc from "solc";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function findImports(importPath) {
  // Handle OpenZeppelin imports
  if (importPath.startsWith("@openzeppelin/")) {
    const ozPath = path.join(__dirname, "../node_modules", importPath);
    if (fs.existsSync(ozPath)) {
      return { contents: fs.readFileSync(ozPath, "utf8") };
    }
  }
  return { error: "File not found" };
}

function compile() {
  console.log("📦 Compiling contracts...");

  const contractsDir = path.join(__dirname, "../contracts");
  const artifactsDir = path.join(__dirname, "../artifacts/contracts");

  // Create artifacts directory
  if (!fs.existsSync(artifactsDir)) {
    fs.mkdirSync(artifactsDir, { recursive: true });
  }

  // Read contract files
  const mockUsdcSource = fs.readFileSync(
    path.join(contractsDir, "MockUSDC.sol"),
    "utf8",
  );
  const donationSource = fs.readFileSync(
    path.join(contractsDir, "SecureXCMDonation.sol"),
    "utf8",
  );

  // Compile MockUSDC
  console.log("1️⃣ Compiling MockUSDC...");
  const mockUsdcInput = {
    language: "Solidity",
    sources: {
      "MockUSDC.sol": {
        content: mockUsdcSource,
      },
    },
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      outputSelection: {
        "*": {
          "*": ["abi", "evm.bytecode"],
        },
      },
    },
  };

  const mockUsdcOutput = JSON.parse(
    solc.compile(JSON.stringify(mockUsdcInput), { import: findImports }),
  );

  if (mockUsdcOutput.errors) {
    const errors = mockUsdcOutput.errors.filter((e) => e.severity === "error");
    if (errors.length > 0) {
      console.error("❌ Compilation errors:", errors);
      process.exit(1);
    }
  }

  // Save MockUSDC artifacts
  const mockUsdcContract = mockUsdcOutput.contracts["MockUSDC.sol"].MockUSDC;
  const mockUsdcDir = path.join(artifactsDir, "MockUSDC.sol");
  if (!fs.existsSync(mockUsdcDir)) {
    fs.mkdirSync(mockUsdcDir, { recursive: true });
  }

  fs.writeFileSync(
    path.join(mockUsdcDir, "MockUSDC.json"),
    JSON.stringify(
      {
        abi: mockUsdcContract.abi,
        bytecode: mockUsdcContract.evm.bytecode.object,
      },
      null,
      2,
    ),
  );

  console.log("✅ MockUSDC compiled");

  // Compile SecureXCMDonation
  console.log("2️⃣ Compiling SecureXCMDonation...");
  const donationInput = {
    language: "Solidity",
    sources: {
      "SecureXCMDonation.sol": {
        content: donationSource,
      },
    },
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      outputSelection: {
        "*": {
          "*": ["abi", "evm.bytecode"],
        },
      },
    },
  };

  const donationOutput = JSON.parse(
    solc.compile(JSON.stringify(donationInput), { import: findImports }),
  );

  if (donationOutput.errors) {
    const errors = donationOutput.errors.filter((e) => e.severity === "error");
    if (errors.length > 0) {
      console.error("❌ Compilation errors:", errors);
      process.exit(1);
    }
  }

  // Save SecureXCMDonation artifacts
  const donationContract =
    donationOutput.contracts["SecureXCMDonation.sol"].SecureXCMDonation;
  const donationDir = path.join(artifactsDir, "SecureXCMDonation.sol");
  if (!fs.existsSync(donationDir)) {
    fs.mkdirSync(donationDir, { recursive: true });
  }

  fs.writeFileSync(
    path.join(donationDir, "SecureXCMDonation.json"),
    JSON.stringify(
      {
        abi: donationContract.abi,
        bytecode: donationContract.evm.bytecode.object,
      },
      null,
      2,
    ),
  );

  console.log("✅ SecureXCMDonation compiled");
  console.log("\n✅ All contracts compiled successfully!");
}

compile();
