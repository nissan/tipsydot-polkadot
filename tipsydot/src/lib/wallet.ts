import { web3Enable, web3Accounts, web3FromAddress } from '@polkadot/extension-dapp';
import type { InjectedAccountWithMeta, InjectedExtension } from '@polkadot/extension-inject/types';

export interface WalletAccount extends InjectedAccountWithMeta {
  balance?: string;
}

let extensions: InjectedExtension[] = [];

export async function connectWallet(appName = 'TipsyDot'): Promise<InjectedExtension[]> {
  extensions = await web3Enable(appName);
  
  if (extensions.length === 0) {
    throw new Error('No extension found. Please install Polkadot.js extension or Talisman wallet.');
  }
  
  return extensions;
}

export async function getAccounts(): Promise<WalletAccount[]> {
  if (extensions.length === 0) {
    await connectWallet();
  }
  
  const accounts = await web3Accounts();
  return accounts as WalletAccount[];
}

export async function getSigner(address: string) {
  const injector = await web3FromAddress(address);
  return injector.signer;
}

export function shortenAddress(address: string, chars = 6): string {
  if (!address) return '';
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}