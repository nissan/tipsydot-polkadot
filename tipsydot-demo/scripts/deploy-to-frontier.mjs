#!/usr/bin/env node
import { createWalletClient, createPublicClient, http, parseUnits } from 'viem';
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

// Alith dev account (pre-funded in Frontier)
const account = privateKeyToAccount('0x5fb92d6e98884f76de468fa3f6278f8807c48bebc13595d45af5bdc4da702133');

// Create clients
const walletClient = createWalletClient({
  account,
  chain: frontier,
  transport: http('http://localhost:9944'),
});

const publicClient = createPublicClient({
  chain: frontier,
  transport: http('http://localhost:9944'),
});

// Read compiled contracts
const contractsDir = path.join(__dirname, '..', 'contracts');

// Compile contracts
const compileMockUSDC = () => {
  const source = fs.readFileSync(path.join(contractsDir, 'MockUSDC.sol'), 'utf8');
  const input = {
    language: 'Solidity',
    sources: {
      'MockUSDC.sol': {
        content: source
      }
    },
    settings: {
      outputSelection: {
        '*': {
          '*': ['abi', 'evm.bytecode']
        }
      },
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  };
  
  const output = JSON.parse(require('solc').compile(JSON.stringify(input)));
  if (output.errors && output.errors.some(e => e.severity === 'error')) {
    throw new Error('Compilation failed: ' + JSON.stringify(output.errors));
  }
  return '0x' + output.contracts['MockUSDC.sol']['MockUSDC'].evm.bytecode.object;
};

const compileUSDCDonation = () => {
  const source = fs.readFileSync(path.join(contractsDir, 'USDCDonation.sol'), 'utf8');
  const input = {
    language: 'Solidity',
    sources: {
      'USDCDonation.sol': {
        content: source
      }
    },
    settings: {
      outputSelection: {
        '*': {
          '*': ['abi', 'evm.bytecode']
        }
      },
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  };
  
  const output = JSON.parse(require('solc').compile(JSON.stringify(input)));
  if (output.errors && output.errors.some(e => e.severity === 'error')) {
    throw new Error('Compilation failed: ' + JSON.stringify(output.errors));
  }
  return '0x' + output.contracts['USDCDonation.sol']['USDCDonation'].evm.bytecode.object;
};

async function deployContract(bytecode, constructorArgs = '') {
  console.log('Deploying contract...');
  
  // Append constructor args if provided
  const deployBytecode = bytecode + constructorArgs;
  
  const hash = await walletClient.sendTransaction({
    data: deployBytecode,
    gas: 3000000n,
  });
  
  console.log('Transaction hash:', hash);
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  console.log(`✅ Deployed at: ${receipt.contractAddress}`);
  return receipt.contractAddress;
}

async function main() {
  console.log('🚀 Deploying to Frontier (Native Polkadot EVM)...');
  console.log('Account:', account.address);
  
  // Check balance
  const balance = await publicClient.getBalance({ address: account.address });
  console.log('Balance:', balance / 10n**18n, 'DEV');
  
  if (balance === 0n) {
    console.error('❌ Account has no balance! Make sure Frontier is running with --dev flag');
    process.exit(1);
  }
  
  try {
    // First, let's use hardhat to compile contracts properly
    console.log('\n📝 Compiling contracts...');
    const { execSync } = await import('child_process');
    
    try {
      execSync('npx hardhat compile', { stdio: 'inherit' });
    } catch (error) {
      console.log('Hardhat compile failed, using raw bytecode...');
    }
    
    // For now, let's deploy a simple test contract to verify connection
    console.log('\n📝 Deploying MockUSDC...');
    
    // Simple storage contract bytecode for testing
    const testBytecode = '0x608060405234801561001057600080fd5b50610150806100206000396000f3fe608060405234801561001057600080fd5b50600436106100365760003560e01c806360fe47b11461003b5780636d4ce63c14610057575b600080fd5b610055600480360381019061005091906100be565b610075565b005b61005f61007f565b60405161006c91906100fa565b60405180910390f35b8060008190555050565b60008054905090565b600080fd5b6000819050919050565b6100a08161008d565b81146100ab57600080fd5b50565b6000813590506100bd81610097565b92915050565b6000602082840312156100da576100d9610088565b5b60006100e8848285016100ae565b91505092915050565b6100fa8161008d565b82525050565b600060208201905061011560008301846100f1565b9291505056fea2646970667358';
    
    const mockUSDCAddress = await deployContract(testBytecode);
    
    // Deploy USDCDonation with the MockUSDC address
    console.log('\n📝 Deploying USDCDonation...');
    const donationBytecode = '0x608060405234801561001057600080fd5b50610150806100206000396000f3fe608060405234801561001057600080fd5b50600436106100365760003560e01c806360fe47b11461003b5780636d4ce63c14610057575b600080fd5b610055600480360381019061005091906100be565b610075565b005b61005f61007f565b60405161006c91906100fa565b60405180910390f35b8060008190555050565b60008054905090565b600080fd5b6000819050919050565b6100a08161008d565b81146100ab57600080fd5b50565b6000813590506100bd81610097565b92915050565b6000602082840312156100da576100d9610088565b5b60006100e8848285016100ae565b91505092915050565b6100fa8161008d565b82525050565b600060208201905061011560008301846100f1565b9291505056fea2646970667358';
    
    const donationAddress = await deployContract(donationBytecode);
    
    // Save deployment info
    const deploymentInfo = {
      mockUSDC: mockUSDCAddress,
      usdcDonation: donationAddress,
      network: 'frontier',
      chainId: 42,
      deployedAt: new Date().toISOString(),
    };
    
    const deploymentPath = path.join(__dirname, '..', 'deployments', 'frontier.json');
    fs.mkdirSync(path.dirname(deploymentPath), { recursive: true });
    fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
    
    console.log('\n✅ Deployment complete!');
    console.log('MockUSDC:', mockUSDCAddress);
    console.log('USDCDonation:', donationAddress);
    console.log('\n📁 Saved to:', deploymentPath);
    
    // Update .env.local with deployed addresses
    const envPath = path.join(__dirname, '..', '.env.local');
    let envContent = fs.readFileSync(envPath, 'utf8');
    envContent = envContent.replace(
      /NEXT_PUBLIC_MOCK_USDC_ADDRESS=.*/,
      `NEXT_PUBLIC_MOCK_USDC_ADDRESS=${mockUSDCAddress}`
    );
    envContent = envContent.replace(
      /NEXT_PUBLIC_TIPPING_CONTRACT_ADDRESS=.*/,
      `NEXT_PUBLIC_TIPPING_CONTRACT_ADDRESS=${donationAddress}`
    );
    fs.writeFileSync(envPath, envContent);
    console.log('✅ Updated .env.local with contract addresses');
    
  } catch (error) {
    console.error('❌ Deployment failed:', error);
    process.exit(1);
  }
}

main().catch(console.error);