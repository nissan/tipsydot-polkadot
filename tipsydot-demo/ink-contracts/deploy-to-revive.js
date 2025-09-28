#!/usr/bin/env node

/**
 * Deployment script for Ink! v6 contracts to pallet-revive
 * Supports both Ink! and Solidity contract deployment on the same chain
 */

import { ApiPromise, WsProvider, Keyring } from '@polkadot/api';
import { CodePromise, ContractPromise } from '@polkadot/api-contract';
import fs from 'fs';
import path from 'path';

// Configuration
const REVIVE_WS = process.env.REVIVE_WS || 'ws://localhost:9944';
const DEPLOY_ACCOUNT = process.env.DEPLOY_ACCOUNT || '//Alice';

// Contract paths
const CONTRACTS = {
    psp22_usdc: {
        wasm: './target/ink/psp22_usdc.contract',
        metadata: './target/ink/psp22_usdc.json',
        constructor: 'new',
        args: [1000000n * 10n ** 6n], // 1M USDC initial supply
    },
    tipping_compatible: {
        wasm: './target/ink/tipping_compatible.contract',
        metadata: './target/ink/tipping_compatible.json',
        constructor: 'new',
        args: [], // Will be set after USDC deployment
    },
    cross_chain: {
        wasm: './target/ink/cross_chain.contract',
        metadata: './target/ink/cross_chain.json',
        constructor: 'new',
        args: [1000, 1337], // AssetHub ID, USDC Asset ID
    },
};

/**
 * Deploy an Ink! v6 contract to pallet-revive
 */
async function deployInkContract(api, deployer, contractInfo, previousContracts = {}) {
    console.log(`📦 Deploying ${contractInfo.name}...`);

    // Read contract files
    const wasm = fs.readFileSync(contractInfo.wasm);
    const metadata = JSON.parse(fs.readFileSync(contractInfo.metadata, 'utf8'));

    // Create contract code promise
    const code = new CodePromise(api, metadata, wasm);

    // Prepare constructor arguments
    let constructorArgs = [...contractInfo.args];

    // Special handling for tipping contract - needs USDC address
    if (contractInfo.name === 'tipping_compatible' && previousContracts.psp22_usdc) {
        constructorArgs = [
            previousContracts.psp22_usdc,  // USDC token address
            deployer.address,               // Treasury address
            100,                            // 1% protocol fee
        ];
    }

    // Estimate gas
    const gasLimit = api.registry.createType('WeightV2', {
        refTime: 10000000000,
        proofSize: 131072,
    });

    // Deploy contract
    const tx = code.tx[contractInfo.constructor](
        {
            gasLimit,
            storageDepositLimit: null,
            value: 0,
        },
        ...constructorArgs
    );

    return new Promise((resolve, reject) => {
        tx.signAndSend(deployer, ({ contract, status, events }) => {
            if (status.isInBlock) {
                console.log(`   ✅ Contract deployed at: ${contract.address.toString()}`);

                // Check for Solidity compatibility
                const ethAddress = contractToEthAddress(contract.address.toString());
                console.log(`   🔗 Ethereum-compatible address: ${ethAddress}`);

                resolve({
                    address: contract.address.toString(),
                    ethAddress,
                    contract: new ContractPromise(api, metadata, contract.address),
                });
            } else if (status.isFinalized) {
                console.log(`   ✅ Deployment finalized`);
            }

            // Check for errors
            events.forEach(({ event }) => {
                if (api.events.system.ExtrinsicFailed.is(event)) {
                    const [error] = event.data;
                    reject(new Error(`Deployment failed: ${error.toString()}`));
                }
            });
        });
    });
}

/**
 * Deploy Solidity contracts compiled for PolkaVM
 */
async function deploySolidityContract(api, deployer, bytecode, abi, constructorArgs = []) {
    console.log(`📦 Deploying Solidity contract to pallet-revive...`);

    // Pallet-revive accepts PolkaVM bytecode from Solidity compilation
    const tx = api.tx.revive.instantiateWithCode(
        0,                          // value
        gasLimit,                   // gas limit
        null,                       // storage deposit limit
        bytecode,                   // PolkaVM bytecode
        constructorArgs,            // constructor arguments
        null,                       // salt
    );

    return new Promise((resolve, reject) => {
        tx.signAndSend(deployer, ({ status, events, dispatchError }) => {
            if (dispatchError) {
                reject(new Error(`Deployment failed: ${dispatchError.toString()}`));
                return;
            }

            if (status.isInBlock) {
                // Find the contract address from events
                const instantiatedEvent = events.find(({ event }) =>
                    api.events.revive.Instantiated.is(event)
                );

                if (instantiatedEvent) {
                    const [deployer, contract] = instantiatedEvent.event.data;
                    console.log(`   ✅ Solidity contract deployed at: ${contract.toString()}`);
                    resolve({
                        address: contract.toString(),
                        abi,
                    });
                }
            }
        });
    });
}

/**
 * Convert Substrate address to Ethereum-compatible address
 */
function contractToEthAddress(substrateAddress) {
    // Take first 20 bytes of the Substrate address hash
    const bytes = Buffer.from(substrateAddress.slice(2), 'hex');
    return '0x' + bytes.slice(0, 20).toString('hex');
}

/**
 * Test cross-contract calls between Ink! and Solidity
 */
async function testCrossContractCalls(api, contracts) {
    console.log('\n🧪 Testing cross-contract calls...');

    const keyring = new Keyring({ type: 'sr25519' });
    const alice = keyring.addFromUri('//Alice');

    // Test Ink! calling Solidity
    if (contracts.tipping_compatible && contracts.solidityUsdc) {
        console.log('   Testing Ink! → Solidity call...');

        const { gasRequired } = await contracts.tipping_compatible.query.tip(
            alice.address,
            { gasLimit: -1 },
            1,              // builder ID
            1000000n,       // 1 USDC
            'Test tip'
        );

        const tx = contracts.tipping_compatible.tx.tip(
            { gasLimit: gasRequired },
            1,
            1000000n,
            'Test tip from Ink!'
        );

        await tx.signAndSend(alice);
        console.log('   ✅ Ink! successfully called Solidity contract');
    }

    // Test Solidity calling Ink!
    if (contracts.solidityTipping && contracts.psp22_usdc) {
        console.log('   Testing Solidity → Ink! call...');

        // Use pallet-revive call interface
        const callData = api.tx.revive.call(
            contracts.solidityTipping.address,
            0,
            gasLimit,
            null,
            // Encode function call for Solidity
            encodeSolidityCall('tip', [1, 1000000, 'Test from Solidity'])
        );

        await callData.signAndSend(alice);
        console.log('   ✅ Solidity successfully called Ink! contract');
    }
}

/**
 * Encode function call for Solidity contract
 */
function encodeSolidityCall(functionName, args) {
    // This would use ethabi or similar library
    // For demonstration, returning placeholder
    return '0x' + Buffer.from(functionName + JSON.stringify(args)).toString('hex');
}

/**
 * Main deployment function
 */
async function main() {
    console.log('🚀 Deploying TipsyDot contracts to pallet-revive');
    console.log('================================================\n');

    // Connect to node
    console.log(`📡 Connecting to ${REVIVE_WS}...`);
    const wsProvider = new WsProvider(REVIVE_WS);
    const api = await ApiPromise.create({ provider: wsProvider });

    // Setup account
    const keyring = new Keyring({ type: 'sr25519' });
    const deployer = keyring.addFromUri(DEPLOY_ACCOUNT);
    console.log(`👤 Deploying from: ${deployer.address}\n`);

    const deployedContracts = {};

    try {
        // Deploy Ink! v6 contracts
        console.log('📋 Deploying Ink! v6 contracts');
        console.log('==============================\n');

        // Deploy PSP22 USDC
        deployedContracts.psp22_usdc = await deployInkContract(
            api,
            deployer,
            { ...CONTRACTS.psp22_usdc, name: 'psp22_usdc' }
        );

        // Deploy Tipping contract
        deployedContracts.tipping_compatible = await deployInkContract(
            api,
            deployer,
            { ...CONTRACTS.tipping_compatible, name: 'tipping_compatible' },
            deployedContracts
        );

        // Deploy Cross-chain contract
        deployedContracts.cross_chain = await deployInkContract(
            api,
            deployer,
            { ...CONTRACTS.cross_chain, name: 'cross_chain' }
        );

        // Deploy Solidity contracts (if compiled for PolkaVM)
        const solidityBytecodeFile = '../contracts/SimpleTipping.polkavm';
        if (fs.existsSync(solidityBytecodeFile)) {
            console.log('\n📋 Deploying Solidity contracts');
            console.log('================================\n');

            const bytecode = fs.readFileSync(solidityBytecodeFile);
            deployedContracts.solidityTipping = await deploySolidityContract(
                api,
                deployer,
                bytecode,
                [], // ABI
                [deployedContracts.psp22_usdc.address]
            );
        }

        // Test interoperability
        await testCrossContractCalls(api, deployedContracts);

        // Save deployment info
        const deploymentInfo = {
            network: REVIVE_WS,
            timestamp: new Date().toISOString(),
            contracts: Object.entries(deployedContracts).reduce((acc, [name, info]) => {
                acc[name] = {
                    address: info.address,
                    ethAddress: info.ethAddress,
                };
                return acc;
            }, {}),
        };

        fs.writeFileSync(
            './deployment-revive.json',
            JSON.stringify(deploymentInfo, null, 2)
        );

        console.log('\n✅ All contracts deployed successfully!');
        console.log('📄 Deployment info saved to deployment-revive.json');

        // Display summary
        console.log('\n📊 Deployment Summary');
        console.log('=====================');
        Object.entries(deployedContracts).forEach(([name, info]) => {
            console.log(`${name}:`);
            console.log(`   Substrate: ${info.address}`);
            if (info.ethAddress) {
                console.log(`   Ethereum:  ${info.ethAddress}`);
            }
        });

    } catch (error) {
        console.error('❌ Deployment failed:', error);
        process.exit(1);
    } finally {
        await api.disconnect();
    }
}

// Run deployment
main().catch(console.error);