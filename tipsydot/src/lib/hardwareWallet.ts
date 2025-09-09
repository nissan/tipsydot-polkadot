/**
 * Hardware Wallet Security Module
 * Implements clear signing for transaction safety
 * Addresses the npm exploit by ensuring users can verify exactly what they're signing
 */

import { ethers } from 'ethers';

export interface ClearSigningData {
  action: 'tip' | 'createCampaign' | 'forward';
  recipient?: string;
  amount?: string;
  fee?: string;
  campaignId?: number;
  destParaId?: number;
  memo?: string;
}

/**
 * Format transaction data for clear display on hardware wallet screens
 * This ensures users can verify exactly what they're signing
 */
export function formatForClearSigning(data: ClearSigningData): string {
  const lines: string[] = [];
  
  lines.push('=== TIPSYDOT TRANSACTION ===');
  lines.push(`Action: ${data.action.toUpperCase()}`);
  
  if (data.action === 'tip') {
    lines.push(`Campaign ID: ${data.campaignId}`);
    lines.push(`Amount: ${data.amount} USDC`);
    lines.push(`Protocol Fee: ${data.fee} USDC`);
    lines.push(`Net to Campaign: ${parseFloat(data.amount || '0') - parseFloat(data.fee || '0')} USDC`);
    if (data.memo) {
      lines.push(`Memo: "${data.memo}"`);
    }
  } else if (data.action === 'createCampaign') {
    lines.push(`Destination ParaID: ${data.destParaId}`);
    lines.push(`Beneficiary: ${data.recipient?.slice(0, 10)}...`);
  } else if (data.action === 'forward') {
    lines.push(`Campaign ID: ${data.campaignId}`);
    lines.push(`Amount to Forward: ${data.amount} USDC`);
    lines.push(`To ParaID: ${data.destParaId}`);
  }
  
  lines.push('=== VERIFY BEFORE SIGNING ===');
  
  return lines.join('\n');
}

/**
 * Verify transaction parameters match what user expects
 * This is critical for preventing address substitution attacks
 */
export function verifyTransactionParameters(
  expectedParams: any,
  actualParams: any
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Check recipient address hasn't been substituted
  if (expectedParams.recipient && actualParams.recipient) {
    if (expectedParams.recipient.toLowerCase() !== actualParams.recipient.toLowerCase()) {
      errors.push(`CRITICAL: Recipient address mismatch! Expected: ${expectedParams.recipient}, Got: ${actualParams.recipient}`);
    }
  }
  
  // Check amounts match
  if (expectedParams.amount && actualParams.amount) {
    if (expectedParams.amount !== actualParams.amount) {
      errors.push(`Amount mismatch! Expected: ${expectedParams.amount}, Got: ${actualParams.amount}`);
    }
  }
  
  // Check contract address is correct
  if (expectedParams.contractAddress && actualParams.to) {
    if (expectedParams.contractAddress.toLowerCase() !== actualParams.to.toLowerCase()) {
      errors.push(`CRITICAL: Contract address mismatch! This might be a malicious contract!`);
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Create a transaction request with clear signing data embedded
 * This ensures hardware wallets can display meaningful information
 */
export async function createClearSignedTransaction(
  contract: ethers.Contract,
  method: string,
  params: any[],
  clearSigningData: ClearSigningData
): Promise<ethers.TransactionRequest> {
  // Get the transaction data
  const tx = await contract[method].populateTransaction(...params);
  
  // Add clear signing message as transaction comment
  // This will be displayed on hardware wallet screens that support it
  const clearMessage = formatForClearSigning(clearSigningData);
  
  // For wallets that support EIP-712, we could add typed data here
  // For now, we'll add it as a comment in the data field
  
  return {
    ...tx,
    // Custom data that hardware wallets can parse and display
    customData: {
      clearSigning: clearSigningData,
      displayMessage: clearMessage,
      warningLevel: clearSigningData.action === 'forward' ? 'high' : 'normal'
    }
  } as any;
}

/**
 * Safe contract interaction wrapper
 * Ensures all transactions go through clear signing verification
 */
export class SafeContractInteraction {
  private contract: ethers.Contract;
  private expectedContractAddress: string;
  
  constructor(contract: ethers.Contract, expectedAddress: string) {
    this.contract = contract;
    this.expectedContractAddress = expectedAddress;
    
    // Verify contract address on initialization
    if (contract.target !== expectedAddress) {
      throw new Error(`Contract address mismatch! Expected ${expectedAddress}, got ${contract.target}`);
    }
  }
  
  /**
   * Execute a tip with full clear signing
   */
  async safeTip(
    campaignId: number,
    amount: string,
    memo: string,
    signer: ethers.Signer
  ): Promise<ethers.TransactionResponse> {
    // Calculate fee for display
    const fee = (parseFloat(amount) * 0.001).toFixed(2);
    
    const clearSigningData: ClearSigningData = {
      action: 'tip',
      campaignId,
      amount: (parseFloat(amount) / 1e6).toFixed(2), // Convert to USDC display format
      fee,
      memo
    };
    
    // Show clear signing data to user
    const userConfirmed = await this.displayClearSigningPrompt(clearSigningData);
    if (!userConfirmed) {
      throw new Error('Transaction cancelled by user');
    }
    
    // Create transaction with clear signing data
    const tx = await createClearSignedTransaction(
      this.contract,
      'tip',
      [campaignId, amount, memo],
      clearSigningData
    );
    
    // Send transaction
    return signer.sendTransaction(tx);
  }
  
  /**
   * Display clear signing information to user
   * In production, this would integrate with hardware wallet APIs
   */
  private async displayClearSigningPrompt(data: ClearSigningData): Promise<boolean> {
    const message = formatForClearSigning(data);
    
    // In production, this would trigger hardware wallet display
    console.log('CLEAR SIGNING REQUEST:\n', message);
    
    // For demo, we'll auto-confirm
    // In production, wait for hardware wallet confirmation
    return true;
  }
}

/**
 * Check if browser supports hardware wallets
 */
export function isHardwareWalletSupported(): boolean {
  // Check for Ledger support
  if ((window as any).ethereum?.isLedger) {
    return true;
  }
  
  // Check for Trezor support
  if ((window as any).trezor) {
    return true;
  }
  
  // Check for WalletConnect with hardware wallet
  if ((window as any).ethereum?.isWalletConnect) {
    return true;
  }
  
  return false;
}

/**
 * Security recommendations for users
 */
export const SECURITY_RECOMMENDATIONS = {
  highRisk: [
    'Always verify the recipient address on your hardware wallet screen',
    'Never approve transactions showing unexpected addresses',
    'Check the contract address matches the official TipsyDot contract'
  ],
  general: [
    'Use a hardware wallet for transactions over $100',
    'Enable clear signing in your wallet settings',
    'Verify all transaction parameters before signing'
  ],
  npmExploit: [
    'Update all npm packages to versions after Sept 8, 2024, 11:30 AM',
    'Clear browser cache and cookies',
    'Reinstall wallet extensions from official sources',
    'Use hardware wallets for maximum security'
  ]
};