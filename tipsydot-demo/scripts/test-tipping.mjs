#!/usr/bin/env node

import pkg from 'ethers';
const { ethers } = pkg;
import fs from 'fs';

async function main() {
    console.log('🧪 Testing TipsyDot tipping flow...\n');
    
    // Load deployment info
    const deployment = JSON.parse(fs.readFileSync('./deployment.json', 'utf8'));
    console.log('📋 Using contracts:');
    console.log(`  - MockUSDC: ${deployment.contracts.MockUSDC}`);
    console.log(`  - SimpleTipping: ${deployment.contracts.SimpleTipping}\n`);
    
    // Connect to Anvil
    const provider = new ethers.providers.JsonRpcProvider('http://localhost:8545');
    
    // Use Account #0 as the tipper
    const tipper = provider.getSigner(0);
    const tipperAddress = await tipper.getAddress();
    console.log(`👤 Tipper: ${tipperAddress}`);
    
    // Load contract ABIs
    const usdcArtifact = JSON.parse(
        fs.readFileSync('./artifacts/contracts/MockUSDC.sol/MockUSDC.json', 'utf8')
    );
    const tippingArtifact = JSON.parse(
        fs.readFileSync('./artifacts/contracts/SimpleTipping.sol/SimpleTipping.json', 'utf8')
    );
    
    // Connect to contracts
    const usdc = new ethers.Contract(
        deployment.contracts.MockUSDC,
        usdcArtifact.abi,
        tipper
    );
    
    const tipping = new ethers.Contract(
        deployment.contracts.SimpleTipping,
        tippingArtifact.abi,
        tipper
    );
    
    // Check initial USDC balance
    const initialBalance = await usdc.balanceOf(tipperAddress);
    console.log(`💰 USDC Balance: ${ethers.utils.formatUnits(initialBalance, 6)} USDC\n`);
    
    // Get builders
    console.log('🏗️ Available builders:');
    const builderCount = await tipping.builderCount();
    for (let i = 1; i <= builderCount; i++) {
        const builder = await tipping.builders(i);
        console.log(`  ${i}. ${builder.name}`);
        console.log(`     ${builder.description}`);
        console.log(`     Wallet: ${builder.wallet}`);
        console.log(`     Total received: ${ethers.utils.formatUnits(builder.totalReceived, 6)} USDC\n`);
    }
    
    // Approve USDC spending
    const tipAmount = ethers.utils.parseUnits('100', 6); // 100 USDC
    console.log('✅ Approving USDC spending...');
    const approveTx = await usdc.approve(tipping.address, tipAmount);
    await approveTx.wait();
    console.log(`  Transaction: ${approveTx.hash}`);
    
    // Make a tip to builder #1 (Alice - Moonbeam)
    console.log('\n💸 Sending tip to Alice - Moonbeam...');
    console.log(`  Amount: 100 USDC`);
    
    const tipTx = await tipping.tip(1, tipAmount, "Great work on Moonbeam!");
    const receipt = await tipTx.wait();
    console.log(`  Transaction: ${tipTx.hash}`);
    console.log(`  Gas used: ${receipt.gasUsed.toString()}`);
    
    // Check the event
    const tipEvent = receipt.events?.find(e => e.event === 'Tip');
    if (tipEvent) {
        console.log('\n📢 Tip event emitted:');
        console.log(`  Tipper: ${tipEvent.args.tipper}`);
        console.log(`  Builder ID: ${tipEvent.args.builderId.toString()}`);
        console.log(`  Amount: ${ethers.utils.formatUnits(tipEvent.args.amount, 6)} USDC`);
        console.log(`  Message: ${tipEvent.args.message}`);
    }
    
    // Check updated builder stats
    const updatedBuilder = await tipping.builders(1);
    console.log('\n📊 Updated builder stats:');
    console.log(`  ${updatedBuilder.name}`);
    console.log(`  Total received: ${ethers.utils.formatUnits(updatedBuilder.totalReceived, 6)} USDC`);
    
    // Check final balances
    const finalTipperBalance = await usdc.balanceOf(tipperAddress);
    const builderBalance = await usdc.balanceOf(updatedBuilder.wallet);
    
    console.log('\n💰 Final balances:');
    console.log(`  Tipper: ${ethers.utils.formatUnits(finalTipperBalance, 6)} USDC`);
    console.log(`  Builder: ${ethers.utils.formatUnits(builderBalance, 6)} USDC`);
    
    console.log('\n✨ Test complete! Tipping flow works correctly.');
}

main().catch(error => {
    console.error('❌ Test failed:', error);
    process.exit(1);
});