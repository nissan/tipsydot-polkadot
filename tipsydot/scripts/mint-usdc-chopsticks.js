#!/usr/bin/env node

/**
 * Mint USDC on the Chopsticks-forked AssetHub
 * 
 * This script demonstrates how to:
 * 1. Connect to the forked AssetHub (ws://127.0.0.1:8000)
 * 2. Use sudo to mint USDC (Asset ID 1337 on Paseo)
 * 3. Transfer USDC to test accounts
 */

import { ApiPromise, WsProvider } from '@polkadot/api';
import { Keyring } from '@polkadot/keyring';

const ASSETHUB_WS = 'ws://127.0.0.1:8000';
const USDC_ASSET_ID = 1337; // USDC on Paseo AssetHub

async function main() {
  console.log('🥢 Connecting to Chopsticks-forked AssetHub...');
  
  // Connect to the forked chain
  const provider = new WsProvider(ASSETHUB_WS);
  const api = await ApiPromise.create({ provider });
  
  console.log(`✅ Connected to ${(await api.rpc.system.chain()).toHuman()}`);
  console.log(`   Block: #${(await api.rpc.chain.getHeader()).number.toHuman()}`);
  
  // Setup keyring with test accounts
  const keyring = new Keyring({ type: 'sr25519' });
  const alice = keyring.addFromUri('//Alice');
  const bob = keyring.addFromUri('//Bob');
  
  // Check USDC asset info
  console.log('\n📊 USDC Asset Info:');
  const assetDetails = await api.query.assets.asset(USDC_ASSET_ID);
  if (assetDetails.isSome) {
    const details = assetDetails.unwrap();
    console.log(`   Supply: ${details.supply.toHuman()}`);
    console.log(`   Accounts: ${details.accounts.toHuman()}`);
    console.log(`   Status: ${details.status.toHuman()}`);
  }
  
  // Check balances
  console.log('\n💰 Current USDC Balances:');
  const aliceBalance = await api.query.assets.account(USDC_ASSET_ID, alice.address);
  const bobBalance = await api.query.assets.account(USDC_ASSET_ID, bob.address);
  
  console.log(`   Alice: ${aliceBalance.isNone ? '0' : aliceBalance.unwrap().balance.toHuman()} USDC`);
  console.log(`   Bob: ${bobBalance.isNone ? '0' : bobBalance.unwrap().balance.toHuman()} USDC`);
  
  // Mint USDC to Alice (requires sudo in Chopsticks)
  console.log('\n🪙 Minting 10,000 USDC to Alice...');
  
  try {
    // In Chopsticks, we can directly mint using sudo
    const mintAmount = 10_000_000_000; // 10,000 USDC (6 decimals)
    
    const mintTx = api.tx.assets.mint(
      USDC_ASSET_ID,
      alice.address,
      mintAmount
    );
    
    // Use sudo (Chopsticks allows this)
    const sudoTx = api.tx.sudo.sudo(mintTx);
    
    // Sign and send
    await sudoTx.signAndSend(alice, { nonce: -1 }, ({ status, events }) => {
      if (status.isInBlock) {
        console.log(`   ✅ Minted in block: ${status.asInBlock.toHex()}`);
        
        // Check for success
        events.forEach(({ event }) => {
          if (api.events.system.ExtrinsicSuccess.is(event)) {
            console.log('   ✅ Mint successful!');
          }
        });
      }
    });
    
    // Wait a bit for the transaction
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Check new balance
    const newAliceBalance = await api.query.assets.account(USDC_ASSET_ID, alice.address);
    console.log(`   Alice's new balance: ${newAliceBalance.unwrap().balance.toHuman()} USDC`);
    
  } catch (error) {
    console.error('❌ Minting failed:', error.message);
    console.log('\n💡 Tip: Make sure Chopsticks is running with mock-signature-host enabled');
  }
  
  console.log('\n📝 Demo Accounts for Testing:');
  console.log('   Alice:', alice.address);
  console.log('   Bob:', bob.address);
  console.log('\n🔗 Connect Polkadot.js Apps to:', ASSETHUB_WS);
  console.log('   https://polkadot.js.org/apps/?rpc=ws://127.0.0.1:8000#/assets');
  
  await api.disconnect();
}

main().catch(console.error);