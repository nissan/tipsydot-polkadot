#!/usr/bin/env node
import { createWalletClient, createPublicClient, http, parseUnits, formatUnits } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { defineChain } from 'viem';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Frontier chain configuration
const frontier = defineChain({
  id: 42,
  name: 'Frontier',
  nativeCurrency: {
    decimals: 18,
    name: 'DEV',
    symbol: 'DEV',
  },
  rpcUrls: {
    default: {
      http: ['http://localhost:9944'],
    },
  },
});

// Test accounts
const alith = privateKeyToAccount('0x5fb92d6e98884f76de468fa3f6278f8807c48bebc13595d45af5bdc4da702133');
const baltathar = privateKeyToAccount('0x8075991ce870b93a8870eca0c0f91913d12f47948ca0fd25b49c6fa7cdbeee8b');

// Create clients
const walletClient = createWalletClient({
  account: alith,
  chain: frontier,
  transport: http('http://localhost:9944'),
});

const publicClient = createPublicClient({
  chain: frontier,
  transport: http('http://localhost:9944'),
});

// Load deployed contracts
const deploymentPath = path.join(__dirname, '..', 'deployments', 'frontier.json');
const deployment = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));

// Contract ABIs
const MockUSDCABI = [
  {
    "inputs": [{"type": "address"}, {"type": "uint256"}],
    "name": "mint",
    "outputs": [],
    "type": "function"
  },
  {
    "inputs": [{"type": "address"}],
    "name": "balanceOf",
    "outputs": [{"type": "uint256"}],
    "type": "function"
  },
  {
    "inputs": [{"type": "address"}, {"type": "uint256"}],
    "name": "approve",
    "outputs": [{"type": "bool"}],
    "type": "function"
  }
];

const USDCDonationABI = [
  {
    "inputs": [{"type": "uint256"}, {"type": "uint256"}],
    "name": "donate",
    "outputs": [],
    "type": "function"
  },
  {
    "inputs": [{"type": "uint256"}],
    "name": "getBuilder",
    "outputs": [
      {"type": "string", "name": "name"},
      {"type": "string", "name": "project"},
      {"type": "string", "name": "substrateAddress"},
      {"type": "uint256", "name": "totalReceived"},
      {"type": "bool", "name": "active"}
    ],
    "type": "function"
  }
];

async function testDonationFlow() {
  console.log('🧪 Testing TipsyDot Donation Flow on Frontier\n');
  console.log('📍 MockUSDC:', deployment.mockUSDC);
  console.log('📍 USDCDonation:', deployment.usdcDonation);
  console.log('👤 Test Account (Alith):', alith.address);
  console.log('👤 Donor Account (Baltathar):', baltathar.address);
  
  try {
    // Step 1: Mint USDC to donor account
    console.log('\n1️⃣ Minting 1000 USDC to donor...');
    const mintAmount = parseUnits('1000', 6); // 1000 USDC
    
    const mintHash = await walletClient.writeContract({
      address: deployment.mockUSDC,
      abi: MockUSDCABI,
      functionName: 'mint',
      args: [baltathar.address, mintAmount],
    });
    
    await publicClient.waitForTransactionReceipt({ hash: mintHash });
    
    // Check balance
    const balance = await publicClient.readContract({
      address: deployment.mockUSDC,
      abi: MockUSDCABI,
      functionName: 'balanceOf',
      args: [baltathar.address],
    });
    
    console.log('✅ Balance:', formatUnits(balance, 6), 'USDC');
    
    // Step 2: Approve donation contract
    console.log('\n2️⃣ Approving donation contract...');
    const donationAmount = parseUnits('100', 6); // 100 USDC
    
    // Create wallet client for donor
    const donorWallet = createWalletClient({
      account: baltathar,
      chain: frontier,
      transport: http('http://localhost:9944'),
    });
    
    const approveHash = await donorWallet.writeContract({
      address: deployment.mockUSDC,
      abi: MockUSDCABI,
      functionName: 'approve',
      args: [deployment.usdcDonation, donationAmount],
    });
    
    await publicClient.waitForTransactionReceipt({ hash: approveHash });
    console.log('✅ Approved 100 USDC');
    
    // Step 3: Make donation to builder 0 (Alice - Moonbeam)
    console.log('\n3️⃣ Donating to Alice - Moonbeam...');
    
    const donateHash = await donorWallet.writeContract({
      address: deployment.usdcDonation,
      abi: USDCDonationABI,
      functionName: 'donate',
      args: [0n, donationAmount], // Builder ID 0, 100 USDC
    });
    
    const receipt = await publicClient.waitForTransactionReceipt({ hash: donateHash });
    console.log('✅ Donation successful! Tx:', receipt.transactionHash);
    
    // Step 4: Verify builder received donation
    console.log('\n4️⃣ Verifying donation...');
    
    const builderInfo = await publicClient.readContract({
      address: deployment.usdcDonation,
      abi: USDCDonationABI,
      functionName: 'getBuilder',
      args: [0n],
    });
    
    console.log('Builder:', builderInfo[0]);
    console.log('Project:', builderInfo[1]);
    console.log('Substrate Address:', builderInfo[2]);
    console.log('Total Received:', formatUnits(builderInfo[3], 6), 'USDC');
    console.log('Active:', builderInfo[4]);
    
    // Check final balance
    const finalBalance = await publicClient.readContract({
      address: deployment.mockUSDC,
      abi: MockUSDCABI,
      functionName: 'balanceOf',
      args: [baltathar.address],
    });
    
    console.log('\n✅ Test Complete!');
    console.log('Donor remaining balance:', formatUnits(finalBalance, 6), 'USDC');
    console.log('\n🎉 Donation flow working perfectly on Frontier!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

testDonationFlow().catch(console.error);