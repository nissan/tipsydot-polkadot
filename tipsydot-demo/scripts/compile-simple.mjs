#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import solc from 'solc';

console.log('📦 Compiling contracts...');

const contractsDir = './contracts';
const artifactsDir = './artifacts/contracts';

// Ensure artifacts directory exists
if (!fs.existsSync(artifactsDir)) {
    fs.mkdirSync(artifactsDir, { recursive: true });
}

// Contracts to compile
const contracts = ['MockUSDC.sol', 'SimpleTipping.sol'];

for (const contractFile of contracts) {
    const contractName = contractFile.replace('.sol', '');
    console.log(`\n1️⃣ Compiling ${contractName}...`);
    
    const contractPath = path.join(contractsDir, contractFile);
    const source = fs.readFileSync(contractPath, 'utf8');
    
    const input = {
        language: 'Solidity',
        sources: {
            [contractFile]: {
                content: source
            }
        },
        settings: {
            outputSelection: {
                '*': {
                    '*': ['abi', 'evm.bytecode', 'evm.deployedBytecode']
                }
            },
            optimizer: {
                enabled: true,
                runs: 200
            }
        }
    };
    
    const output = JSON.parse(solc.compile(JSON.stringify(input)));
    
    if (output.errors) {
        const errors = output.errors.filter(e => e.severity === 'error');
        if (errors.length > 0) {
            console.error(`❌ Compilation errors:`, errors);
            continue;
        }
    }
    
    // Save artifacts
    const contract = output.contracts[contractFile][contractName];
    const artifactDir = path.join(artifactsDir, `${contractName}.sol`);
    
    if (!fs.existsSync(artifactDir)) {
        fs.mkdirSync(artifactDir, { recursive: true });
    }
    
    const artifact = {
        abi: contract.abi,
        bytecode: contract.evm.bytecode.object,
        deployedBytecode: contract.evm.deployedBytecode.object
    };
    
    fs.writeFileSync(
        path.join(artifactDir, `${contractName}.json`),
        JSON.stringify(artifact, null, 2)
    );
    
    console.log(`✅ ${contractName} compiled`);
}

console.log('\n✨ Compilation complete!');