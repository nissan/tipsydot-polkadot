/**
 * Secure Wallet Connection Module
 * Implements safe wallet connection without compromised npm packages
 * Uses direct browser wallet APIs and hardware wallet support
 */

import { ethers } from 'ethers';
import { formatForClearSigning, ClearSigningData } from './hardwareWallet';

export interface SecureWalletConfig {
  requireHardwareWallet?: boolean;
  clearSigningEnabled?: boolean;
  maxAutoApprove?: bigint;
}

export class SecureWalletConnection {
  private provider: ethers.BrowserProvider | null = null;
  private signer: ethers.Signer | null = null;
  private config: SecureWalletConfig;
  
  constructor(config: SecureWalletConfig = {}) {
    this.config = {
      requireHardwareWallet: false,
      clearSigningEnabled: true,
      maxAutoApprove: BigInt(0),
      ...config
    };
  }
  
  /**
   * Connect to wallet using direct browser APIs
   * Avoids potentially compromised wallet connection libraries
   */
  async connect(): Promise<string> {
    if (typeof window === 'undefined' || !window.ethereum) {
      throw new Error('No wallet detected. Please install MetaMask or use a hardware wallet.');
    }
    
    // Check if hardware wallet is required
    if (this.config.requireHardwareWallet) {
      const isHardware = await this.detectHardwareWallet();
      if (!isHardware) {
        throw new Error('Hardware wallet required for this transaction. Please connect your Ledger or Trezor.');
      }
    }
    
    try {
      // Request account access directly from browser wallet
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      });
      
      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts found');
      }
      
      // Create provider and signer
      this.provider = new ethers.BrowserProvider(window.ethereum);
      this.signer = await this.provider.getSigner();
      
      // Verify the account matches
      const address = await this.signer.getAddress();
      if (address.toLowerCase() !== accounts[0].toLowerCase()) {
        throw new Error('Account mismatch detected');
      }
      
      return address;
    } catch (error: any) {
      if (error.code === 4001) {
        throw new Error('User rejected connection request');
      }
      throw error;
    }
  }
  
  /**
   * Detect if a hardware wallet is connected
   */
  async detectHardwareWallet(): Promise<boolean> {
    if (!window.ethereum) return false;
    
    // Check for Ledger
    if ((window.ethereum as any).isLedger) {
      console.log('Ledger hardware wallet detected');
      return true;
    }
    
    // Check for Trezor
    if ((window as any).trezor) {
      console.log('Trezor hardware wallet detected');
      return true;
    }
    
    // Check wallet type from provider
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const network = await provider.getNetwork();
      
      // Some hardware wallets report through WalletConnect
      if ((window.ethereum as any).isWalletConnect) {
        const walletMeta = (window.ethereum as any).walletMeta;
        if (walletMeta && (walletMeta.name?.includes('Ledger') || walletMeta.name?.includes('Trezor'))) {
          return true;
        }
      }
    } catch (e) {
      console.error('Error detecting hardware wallet:', e);
    }
    
    return false;
  }
  
  /**
   * Sign a transaction with clear signing support
   */
  async signTransaction(
    transaction: ethers.TransactionRequest,
    clearSigningData?: ClearSigningData
  ): Promise<string> {
    if (!this.signer) {
      throw new Error('Wallet not connected');
    }
    
    // If clear signing is enabled and data provided, show it
    if (this.config.clearSigningEnabled && clearSigningData) {
      const clearMessage = formatForClearSigning(clearSigningData);
      
      // Display clear signing message
      const confirmed = await this.displayClearSigningPrompt(clearMessage);
      if (!confirmed) {
        throw new Error('Transaction rejected by user');
      }
    }
    
    // Validate transaction parameters
    this.validateTransaction(transaction);
    
    // Sign the transaction
    const signedTx = await this.signer.signTransaction(transaction);
    return signedTx;
  }
  
  /**
   * Send a transaction with security checks
   */
  async sendTransaction(
    transaction: ethers.TransactionRequest,
    clearSigningData?: ClearSigningData
  ): Promise<ethers.TransactionResponse> {
    if (!this.signer) {
      throw new Error('Wallet not connected');
    }
    
    // If clear signing is enabled and data provided, show it
    if (this.config.clearSigningEnabled && clearSigningData) {
      const clearMessage = formatForClearSigning(clearSigningData);
      
      // Display clear signing message
      const confirmed = await this.displayClearSigningPrompt(clearMessage);
      if (!confirmed) {
        throw new Error('Transaction rejected by user');
      }
    }
    
    // Validate transaction parameters
    this.validateTransaction(transaction);
    
    // Send the transaction
    const tx = await this.signer.sendTransaction(transaction);
    return tx;
  }
  
  /**
   * Validate transaction parameters for security
   */
  private validateTransaction(transaction: ethers.TransactionRequest): void {
    // Check for suspicious gas prices
    if (transaction.gasPrice) {
      const gasPrice = BigInt(transaction.gasPrice.toString());
      const maxGasPrice = ethers.parseUnits('500', 'gwei');
      if (gasPrice > maxGasPrice) {
        throw new Error(`Suspicious gas price detected: ${ethers.formatUnits(gasPrice, 'gwei')} gwei`);
      }
    }
    
    // Check for suspicious value transfers
    if (transaction.value) {
      const value = BigInt(transaction.value.toString());
      const maxAutoApprove = this.config.maxAutoApprove || BigInt(0);
      if (value > maxAutoApprove) {
        console.warn(`Large value transfer detected: ${ethers.formatEther(value)} ETH`);
      }
    }
    
    // Validate recipient address
    if (transaction.to) {
      const to = transaction.to.toString().toLowerCase();
      
      // Check for zero address
      if (to === '0x0000000000000000000000000000000000000000') {
        throw new Error('Cannot send to zero address');
      }
      
      // Check for known malicious addresses (maintain a blacklist)
      const blacklist = this.getMaliciousAddressList();
      if (blacklist.includes(to)) {
        throw new Error('Recipient address is on the security blacklist');
      }
    }
  }
  
  /**
   * Display clear signing prompt to user
   */
  private async displayClearSigningPrompt(message: string): Promise<boolean> {
    // In production, integrate with hardware wallet display
    // For now, use a secure confirmation dialog
    
    if (typeof window !== 'undefined' && window.confirm) {
      const confirmed = window.confirm(
        `🔒 SECURITY CHECK - Please verify on your hardware wallet:\n\n${message}\n\nDo you confirm this transaction?`
      );
      return confirmed;
    }
    
    return true;
  }
  
  /**
   * Get list of known malicious addresses
   */
  private getMaliciousAddressList(): string[] {
    // In production, this would fetch from a security API
    // For now, return empty list
    return [];
  }
  
  /**
   * Disconnect wallet
   */
  async disconnect(): Promise<void> {
    this.provider = null;
    this.signer = null;
    
    // Clear any cached data
    if (window.ethereum && (window.ethereum as any).removeAllListeners) {
      (window.ethereum as any).removeAllListeners();
    }
  }
  
  /**
   * Get current connected address
   */
  async getAddress(): Promise<string | null> {
    if (!this.signer) return null;
    return await this.signer.getAddress();
  }
  
  /**
   * Get current network
   */
  async getNetwork(): Promise<ethers.Network | null> {
    if (!this.provider) return null;
    return await this.provider.getNetwork();
  }
  
  /**
   * Switch to a specific network
   */
  async switchNetwork(chainId: number): Promise<void> {
    if (!window.ethereum) {
      throw new Error('No wallet detected');
    }
    
    const chainIdHex = `0x${chainId.toString(16)}`;
    
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: chainIdHex }],
      });
    } catch (error: any) {
      // This error code indicates that the chain has not been added to MetaMask
      if (error.code === 4902) {
        throw new Error('Network not found in wallet. Please add it manually.');
      }
      throw error;
    }
  }
}

/**
 * Secure wallet hooks for React
 */
export function useSecureWallet(config?: SecureWalletConfig) {
  const wallet = new SecureWalletConnection(config);
  
  return {
    connect: () => wallet.connect(),
    disconnect: () => wallet.disconnect(),
    sendTransaction: (tx: ethers.TransactionRequest, clearData?: ClearSigningData) => 
      wallet.sendTransaction(tx, clearData),
    signTransaction: (tx: ethers.TransactionRequest, clearData?: ClearSigningData) => 
      wallet.signTransaction(tx, clearData),
    getAddress: () => wallet.getAddress(),
    getNetwork: () => wallet.getNetwork(),
    switchNetwork: (chainId: number) => wallet.switchNetwork(chainId),
    detectHardwareWallet: () => wallet.detectHardwareWallet()
  };
}

// Extend Window interface for Ethereum
declare global {
  interface Window {
    ethereum?: any;
    trezor?: any;
  }
}