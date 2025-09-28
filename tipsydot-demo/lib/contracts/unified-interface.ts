/**
 * Unified Contract Interface for TipsyDot
 * 
 * This interface provides a common API for interacting with both
 * Ink! v6 contracts (via PAPI/ReactiveDOT) and Solidity contracts (via Wagmi/Viem)
 * 
 * Benefits:
 * - Single codebase for both contract types
 * - Type-safe interactions
 * - Automatic wallet detection
 * - Seamless cross-contract calls
 */

import { type Address, type Hex } from 'viem';

// Common types that work across both systems
export type UnifiedAddress = string; // Can be H160 (EVM) or SS58 (Substrate)
export type UnifiedAmount = bigint;
export type UnifiedHash = string;

// Transaction result that works for both systems
export interface TransactionResult {
  hash: UnifiedHash;
  status: 'pending' | 'success' | 'failed';
  blockNumber?: number;
  gasUsed?: bigint;
  error?: string;
}

// Builder data structure
export interface BuilderData {
  id: bigint;
  address: UnifiedAddress;
  name: string;
  totalReceived: bigint;
  tipCount: bigint;
  isActive: boolean;
}

// Campaign data structure
export interface CampaignData {
  id: bigint;
  builderId: bigint;
  targetAmount: bigint;
  raisedAmount: bigint;
  deadline: number;
  isActive: boolean;
}

// Tip data structure
export interface TipData {
  from: UnifiedAddress;
  builderId: bigint;
  amount: bigint;
  message: string;
  timestamp: number;
  campaignId?: bigint;
}

// Event types
export interface TipSentEvent {
  from: UnifiedAddress;
  builderId: bigint;
  amount: bigint;
  message: string;
  timestamp: number;
}

export interface BuilderRegisteredEvent {
  builderId: bigint;
  address: UnifiedAddress;
  name: string;
}

// Main unified contract interface
export interface UnifiedContractInterface {
  // Read operations
  getBuilder(builderId: bigint): Promise<BuilderData | null>;
  getCampaign(campaignId: bigint): Promise<CampaignData | null>;
  getTip(tipId: bigint): Promise<TipData | null>;
  getBalance(address: UnifiedAddress): Promise<bigint>;
  getProtocolFee(): Promise<bigint>;
  isPaused(): Promise<boolean>;
  
  // Write operations
  registerBuilder(name: string, address: UnifiedAddress): Promise<TransactionResult>;
  tip(builderId: bigint, amount: bigint, message: string): Promise<TransactionResult>;
  createCampaign(
    builderId: bigint,
    targetAmount: bigint,
    durationDays: number
  ): Promise<TransactionResult>;
  
  // Admin operations
  setProtocolFee?(newFeeBps: bigint): Promise<TransactionResult>;
  setPaused?(paused: boolean): Promise<TransactionResult>;
  setTreasury?(treasury: UnifiedAddress): Promise<TransactionResult>;
  
  // Cross-contract operations (for advanced use)
  callContract?(
    target: UnifiedAddress,
    data: Uint8Array,
    value?: bigint
  ): Promise<TransactionResult>;
  
  // Event subscriptions
  onTipSent(callback: (event: TipSentEvent) => void): () => void;
  onBuilderRegistered(callback: (event: BuilderRegisteredEvent) => void): () => void;
  
  // Utility methods
  isConnected(): boolean;
  getConnectedAddress(): UnifiedAddress | null;
  getChainId(): number;
  getContractAddress(): UnifiedAddress;
  getContractType(): 'ink' | 'evm';
}

// Factory function to create the appropriate adapter
export interface UnifiedContractFactory {
  create(
    contractAddress: UnifiedAddress,
    options?: {
      abi?: any;
      chainId?: number;
      providerUrl?: string;
    }
  ): UnifiedContractInterface;
}

// Error types
export class UnifiedContractError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'UnifiedContractError';
  }
}

export const ErrorCodes = {
  NOT_CONNECTED: 'NOT_CONNECTED',
  INSUFFICIENT_BALANCE: 'INSUFFICIENT_BALANCE',
  CONTRACT_PAUSED: 'CONTRACT_PAUSED',
  UNAUTHORIZED: 'UNAUTHORIZED',
  BUILDER_NOT_FOUND: 'BUILDER_NOT_FOUND',
  CAMPAIGN_NOT_FOUND: 'CAMPAIGN_NOT_FOUND',
  INVALID_AMOUNT: 'INVALID_AMOUNT',
  TRANSACTION_FAILED: 'TRANSACTION_FAILED',
  NETWORK_ERROR: 'NETWORK_ERROR',
} as const;
