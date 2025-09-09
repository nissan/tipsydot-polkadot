#!/usr/bin/env node

import pkg from 'ethers';
const { ethers } = pkg;
import fs from 'fs';
import path from 'path';

async function main() {
    console.log('🚀 Deploying TipsyDot contracts to Anvil...');
    
    // Connect to Anvil
    const provider = new ethers.providers.JsonRpcProvider('http://localhost:8545');
    const signer = provider.getSigner(0);
    const deployerAddress = await signer.getAddress();
    
    console.log(`📍 Deployer address: ${deployerAddress}`);
    const balance = await provider.getBalance(deployerAddress);
    console.log(`💰 Balance: ${ethers.utils.formatEther(balance)} ETH\n`);
    
    // Deploy MockUSDC
    console.log('1️⃣ Deploying MockUSDC...');
    const usdcArtifact = JSON.parse(
        fs.readFileSync('./artifacts/contracts/MockUSDC.sol/MockUSDC.json', 'utf8')
    );
    
    const USDCFactory = new ethers.ContractFactory(
        usdcArtifact.abi,
        usdcArtifact.bytecode,
        signer
    );
    
    const usdc = await USDCFactory.deploy();
    await usdc.deployed();
    const usdcAddress = usdc.address;
    console.log(`✅ MockUSDC deployed at: ${usdcAddress}`);
    
    // Deploy SimpleTipping
    console.log('\n2️⃣ Deploying SimpleTipping...');
    const tippingArtifact = JSON.parse(
        fs.readFileSync('./artifacts/contracts/SimpleTipping.sol/SimpleTipping.json', 'utf8')
    );
    
    const TippingFactory = new ethers.ContractFactory(
        tippingArtifact.abi,
        tippingArtifact.bytecode,
        signer
    );
    
    const tipping = await TippingFactory.deploy(usdcAddress);
    await tipping.deployed();
    const tippingAddress = tipping.address;
    console.log(`✅ SimpleTipping deployed at: ${tippingAddress}`);
    
    // Mint USDC to test accounts
    console.log('\n3️⃣ Minting USDC to test accounts...');
    const testAccounts = [
        '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266', // Account #0 (deployer)
        '0x70997970C51812dc3A010C7d01b50e0d17dc79C8', // Account #1
        '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC', // Account #2
        '0x90F79bf6EB2c4f870365E785982E1f101E93b906', // Account #3
    ];
    
    const mintAmount = ethers.utils.parseUnits('10000', 6); // 10,000 USDC
    
    for (const account of testAccounts) {
        await usdc.mint(account, mintAmount);
        console.log(`  ✅ Minted 10,000 USDC to ${account}`);
    }
    
    // Save deployment info
    const deploymentInfo = {
        network: 'anvil',
        chainId: 420420421,
        deployedAt: new Date().toISOString(),
        contracts: {
            MockUSDC: usdcAddress,
            SimpleTipping: tippingAddress
        },
        testAccounts: testAccounts
    };
    
    fs.writeFileSync(
        './deployment.json',
        JSON.stringify(deploymentInfo, null, 2)
    );
    
    console.log('\n✨ Deployment complete!');
    console.log('\n📋 Deployment Summary:');
    console.log(`  - MockUSDC: ${usdcAddress}`);
    console.log(`  - SimpleTipping: ${tippingAddress}`);
    console.log('\n📝 Deployment info saved to deployment.json');
    console.log('\n🎯 Next steps:');
    console.log('  1. Start the frontend: pnpm dev');
    console.log('  2. Connect MetaMask to http://localhost:8545');
    console.log('  3. Import test account private keys');
    console.log('  4. Try making a donation!');
}

main().catch(error => {
    console.error('❌ Deployment failed:', error);
    process.exit(1);
});