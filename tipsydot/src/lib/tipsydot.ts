import { ContractPromise } from '@polkadot/api-contract';
import { getApi } from './api';
import TipsyDotABI from '../../artifacts/contracts/TipsyDot.sol/TipsyDot.json';

let contractInstance: ContractPromise | null = null;

export async function getTipsyDot(address?: string): Promise<ContractPromise | null> {
  const contractAddress = address || import.meta.env.VITE_TIPSY_ADDRESS;
  
  if (!contractAddress) {
    console.warn('TipsyDot contract address not configured');
    return null;
  }
  
  if (contractInstance && contractInstance.address.toString() === contractAddress) {
    return contractInstance;
  }
  
  const api = await getApi();
  
  // For Substrate contracts, we need the metadata JSON
  // Since we compiled with Hardhat, we'll use the ABI for now
  // In production, you'd compile with Solang to get proper WASM metadata
  contractInstance = new ContractPromise(api, TipsyDotABI.abi as any, contractAddress);
  
  return contractInstance;
}

export function getContractABI() {
  return TipsyDotABI.abi;
}

export function getContractBytecode() {
  return TipsyDotABI.bytecode;
}