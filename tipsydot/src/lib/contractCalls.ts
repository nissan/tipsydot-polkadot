import { ethers } from 'ethers';
import TipsyDotABI from '../../artifacts/contracts/TipsyDot.sol/TipsyDot.json';

// Helper to get provider and signer
export function getEthersProvider() {
  const rpcUrl = import.meta.env.VITE_EVM_RPC || 'https://testnet-passet-hub-eth-rpc.polkadot.io';
  return new ethers.JsonRpcProvider(rpcUrl);
}

export async function getEthersSigner() {
  if (!window.ethereum) {
    throw new Error('MetaMask not installed');
  }
  
  await window.ethereum.request({ method: 'eth_requestAccounts' });
  const provider = new ethers.BrowserProvider(window.ethereum);
  return provider.getSigner();
}

// Get contract instance
export async function getTipsyDotContract(signerOrProvider?: any) {
  const contractAddress = import.meta.env.VITE_TIPSY_ADDRESS;
  
  if (!contractAddress) {
    throw new Error('TipsyDot contract address not configured');
  }
  
  const providerOrSigner = signerOrProvider || getEthersProvider();
  return new ethers.Contract(contractAddress, TipsyDotABI.abi, providerOrSigner);
}

// Contract write functions
export async function createCampaign(
  name: string,
  description: string,
  asset: string,
  beneficiary: string,
  destParaId: number
) {
  const signer = await getEthersSigner();
  const contract = await getTipsyDotContract(signer);
  
  const tx = await contract.createCampaign(
    name,
    description,
    asset,
    beneficiary,
    destParaId
  );
  
  return tx.wait();
}

export async function tip(
  campaignId: number,
  amount: string,
  memo: string
) {
  const signer = await getEthersSigner();
  const contract = await getTipsyDotContract(signer);
  
  const tx = await contract.tip(campaignId, amount, memo);
  return tx.wait();
}

export async function forward(campaignId: number) {
  const signer = await getEthersSigner();
  const contract = await getTipsyDotContract(signer);
  
  const tx = await contract.forward(campaignId);
  return tx.wait();
}

export async function tipAndForward(
  campaignId: number,
  amount: string,
  memo: string
) {
  const signer = await getEthersSigner();
  const contract = await getTipsyDotContract(signer);
  
  const tx = await contract.tipAndForward(campaignId, amount, memo);
  return tx.wait();
}

export async function setXcmRouter(routerAddress: string) {
  const signer = await getEthersSigner();
  const contract = await getTipsyDotContract(signer);
  
  const tx = await contract.setXcmRouter(routerAddress);
  return tx.wait();
}

// Contract read functions
export async function getCampaignDetails(campaignId: number) {
  const contract = await getTipsyDotContract();
  return contract.getCampaignDetails(campaignId);
}

export async function getCampaignMemos(campaignId: number) {
  const contract = await getTipsyDotContract();
  return contract.getCampaignMemos(campaignId);
}

export async function getNextCampaignId() {
  const contract = await getTipsyDotContract();
  return contract.nextCampaignId();
}

// ERC20 helpers
export async function approveToken(
  tokenAddress: string,
  spenderAddress: string,
  amount: string
) {
  const signer = await getEthersSigner();
  const erc20ABI = [
    'function approve(address spender, uint256 amount) returns (bool)'
  ];
  
  const token = new ethers.Contract(tokenAddress, erc20ABI, signer);
  const tx = await token.approve(spenderAddress, amount);
  return tx.wait();
}

export async function getAllowance(
  tokenAddress: string,
  owner: string,
  spender: string
) {
  const provider = getEthersProvider();
  const erc20ABI = [
    'function allowance(address owner, address spender) view returns (uint256)'
  ];
  
  const token = new ethers.Contract(tokenAddress, erc20ABI, provider);
  return token.allowance(owner, spender);
}

// Add window.ethereum type
declare global {
  interface Window {
    ethereum?: any;
  }
}