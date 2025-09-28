/**
 * Ink! v6 Contract Adapter
 * 
 * This adapter provides native interaction with Ink! contracts deployed on
 * pallet-revive enabled chains. It uses PAPI and ReactiveDOT for optimal performance.
 */

import type {
  UnifiedContractInterface,
  UnifiedAddress,
  TransactionResult,
  BuilderData,
  CampaignData,
  TipData,
  TipSentEvent,
  BuilderRegisteredEvent,
  UnifiedContractError,
  ErrorCodes,
} from './unified-interface';
import { createClient } from '@polkadot-api/client';
import { getWsProvider } from '@polkadot-api/ws-provider/web';
import { dot } from '@polkadot-api/descriptors';

export class InkContractAdapter implements UnifiedContractInterface {
  private client: any;
  private contract: any;
  private contractAddress: UnifiedAddress;
  private connectedAddress: UnifiedAddress | null = null;
  private eventListeners: Map<string, Set<Function>> = new Map();

  constructor(
    contractAddress: UnifiedAddress,
    options?: {
      providerUrl?: string;
      metadata?: any;
    }
  ) {
    this.contractAddress = contractAddress;
    this.initializeClient(options?.providerUrl || 'wss://rpc.paseo.io');
    // In production, we'd load the contract metadata here
  }

  private async initializeClient(providerUrl: string) {
    const provider = getWsProvider(providerUrl);
    this.client = createClient(provider);
    
    // Initialize contract instance with metadata
    // This would use the actual contract metadata in production
    // this.contract = await this.client.getContract(this.contractAddress, metadata);
  }

  // Read operations
  async getBuilder(builderId: bigint): Promise<BuilderData | null> {
    try {
      // Using PAPI to query the contract
      const result = await this.contract.query.getBuilder(
        this.connectedAddress,
        { gasLimit: -1 },
        builderId
      );

      if (!result.output || result.output.isNone) {
        return null;
      }

      const builder = result.output.unwrap();
      return {
        id: BigInt(builder.id.toString()),
        address: builder.address.toString(),
        name: builder.name.toString(),
        totalReceived: BigInt(builder.totalReceived.toString()),
        tipCount: BigInt(builder.tipCount.toString()),
        isActive: builder.isActive,
      };
    } catch (error) {
      console.error('Failed to get builder:', error);
      return null;
    }
  }

  async getCampaign(campaignId: bigint): Promise<CampaignData | null> {
    try {
      const result = await this.contract.query.getCampaign(
        this.connectedAddress,
        { gasLimit: -1 },
        campaignId
      );

      if (!result.output || result.output.isNone) {
        return null;
      }

      const campaign = result.output.unwrap();
      return {
        id: BigInt(campaign.id.toString()),
        builderId: BigInt(campaign.builderId.toString()),
        targetAmount: BigInt(campaign.targetAmount.toString()),
        raisedAmount: BigInt(campaign.raisedAmount.toString()),
        deadline: Number(campaign.deadline.toString()),
        isActive: campaign.isActive,
      };
    } catch (error) {
      console.error('Failed to get campaign:', error);
      return null;
    }
  }

  async getTip(tipId: bigint): Promise<TipData | null> {
    try {
      const result = await this.contract.query.getTip(
        this.connectedAddress,
        { gasLimit: -1 },
        tipId
      );

      if (!result.output || result.output.isNone) {
        return null;
      }

      const tip = result.output.unwrap();
      return {
        from: tip.from.toString(),
        builderId: BigInt(tip.builderId.toString()),
        amount: BigInt(tip.amount.toString()),
        message: tip.message.toString(),
        timestamp: Number(tip.timestamp.toString()),
        campaignId: tip.campaignId.isSome ? BigInt(tip.campaignId.unwrap().toString()) : undefined,
      };
    } catch (error) {
      console.error('Failed to get tip:', error);
      return null;
    }
  }

  async getBalance(address: UnifiedAddress): Promise<bigint> {
    try {
      const account = await this.client.query.system.account(address);
      return BigInt(account.data.free.toString());
    } catch (error) {
      console.error('Failed to get balance:', error);
      return 0n;
    }
  }

  async getProtocolFee(): Promise<bigint> {
    try {
      const result = await this.contract.query.protocolFeeBps(
        this.connectedAddress,
        { gasLimit: -1 }
      );
      return BigInt(result.output.toString());
    } catch (error) {
      console.error('Failed to get protocol fee:', error);
      return 0n;
    }
  }

  async isPaused(): Promise<boolean> {
    try {
      const result = await this.contract.query.paused(
        this.connectedAddress,
        { gasLimit: -1 }
      );
      return result.output;
    } catch (error) {
      console.error('Failed to get paused state:', error);
      return false;
    }
  }

  // Write operations
  async registerBuilder(name: string, address: UnifiedAddress): Promise<TransactionResult> {
    try {
      const tx = this.contract.tx.registerBuilder(
        { gasLimit: -1, value: 0 },
        name,
        address
      );

      return new Promise((resolve, reject) => {
        tx.signAndSend(this.connectedAddress, (result: any) => {
          if (result.status.isInBlock) {
            resolve({
              hash: result.status.asInBlock.toString(),
              status: 'pending',
              blockNumber: result.blockNumber?.toNumber(),
            });
          } else if (result.status.isFinalized) {
            resolve({
              hash: result.status.asFinalized.toString(),
              status: 'success',
              blockNumber: result.blockNumber?.toNumber(),
            });
          } else if (result.status.isDropped || result.status.isInvalid) {
            reject(new Error('Transaction failed'));
          }
        });
      });
    } catch (error) {
      return {
        hash: '',
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async tip(builderId: bigint, amount: bigint, message: string): Promise<TransactionResult> {
    try {
      const tx = this.contract.tx.tip(
        { gasLimit: -1, value: amount },
        builderId,
        message
      );

      return new Promise((resolve, reject) => {
        tx.signAndSend(this.connectedAddress, (result: any) => {
          if (result.status.isInBlock) {
            // Emit event
            this.emitEvent('tipSent', {
              from: this.connectedAddress,
              builderId,
              amount,
              message,
              timestamp: Date.now(),
            });
            
            resolve({
              hash: result.status.asInBlock.toString(),
              status: 'pending',
              blockNumber: result.blockNumber?.toNumber(),
            });
          } else if (result.status.isFinalized) {
            resolve({
              hash: result.status.asFinalized.toString(),
              status: 'success',
              blockNumber: result.blockNumber?.toNumber(),
            });
          } else if (result.status.isDropped || result.status.isInvalid) {
            reject(new Error('Transaction failed'));
          }
        });
      });
    } catch (error) {
      return {
        hash: '',
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async createCampaign(
    builderId: bigint,
    targetAmount: bigint,
    durationDays: number
  ): Promise<TransactionResult> {
    try {
      const tx = this.contract.tx.createCampaign(
        { gasLimit: -1, value: 0 },
        builderId,
        targetAmount,
        durationDays
      );

      return new Promise((resolve, reject) => {
        tx.signAndSend(this.connectedAddress, (result: any) => {
          if (result.status.isInBlock) {
            resolve({
              hash: result.status.asInBlock.toString(),
              status: 'pending',
              blockNumber: result.blockNumber?.toNumber(),
            });
          } else if (result.status.isFinalized) {
            resolve({
              hash: result.status.asFinalized.toString(),
              status: 'success',
              blockNumber: result.blockNumber?.toNumber(),
            });
          } else if (result.status.isDropped || result.status.isInvalid) {
            reject(new Error('Transaction failed'));
          }
        });
      });
    } catch (error) {
      return {
        hash: '',
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // Admin operations
  async setProtocolFee(newFeeBps: bigint): Promise<TransactionResult> {
    try {
      const tx = this.contract.tx.setProtocolFee(
        { gasLimit: -1, value: 0 },
        newFeeBps
      );

      return new Promise((resolve, reject) => {
        tx.signAndSend(this.connectedAddress, (result: any) => {
          if (result.status.isFinalized) {
            resolve({
              hash: result.status.asFinalized.toString(),
              status: 'success',
              blockNumber: result.blockNumber?.toNumber(),
            });
          } else if (result.status.isDropped || result.status.isInvalid) {
            reject(new Error('Transaction failed'));
          }
        });
      });
    } catch (error) {
      return {
        hash: '',
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async setPaused(paused: boolean): Promise<TransactionResult> {
    try {
      const tx = this.contract.tx.setPaused(
        { gasLimit: -1, value: 0 },
        paused
      );

      return new Promise((resolve, reject) => {
        tx.signAndSend(this.connectedAddress, (result: any) => {
          if (result.status.isFinalized) {
            resolve({
              hash: result.status.asFinalized.toString(),
              status: 'success',
              blockNumber: result.blockNumber?.toNumber(),
            });
          } else if (result.status.isDropped || result.status.isInvalid) {
            reject(new Error('Transaction failed'));
          }
        });
      });
    } catch (error) {
      return {
        hash: '',
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async setTreasury(treasury: UnifiedAddress): Promise<TransactionResult> {
    // Implementation would be similar to other admin functions
    throw new Error('Not implemented');
  }

  // Cross-contract operations
  async callContract(
    target: UnifiedAddress,
    data: Uint8Array,
    value?: bigint
  ): Promise<TransactionResult> {
    try {
      const tx = this.contract.tx.callSolidityContract(
        { gasLimit: -1, value: value || 0 },
        target,
        Array.from(data),
        value || 0
      );

      return new Promise((resolve, reject) => {
        tx.signAndSend(this.connectedAddress, (result: any) => {
          if (result.status.isFinalized) {
            resolve({
              hash: result.status.asFinalized.toString(),
              status: 'success',
              blockNumber: result.blockNumber?.toNumber(),
            });
          } else if (result.status.isDropped || result.status.isInvalid) {
            reject(new Error('Cross-contract call failed'));
          }
        });
      });
    } catch (error) {
      return {
        hash: '',
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // Event subscriptions
  onTipSent(callback: (event: TipSentEvent) => void): () => void {
    if (!this.eventListeners.has('tipSent')) {
      this.eventListeners.set('tipSent', new Set());
    }
    this.eventListeners.get('tipSent')!.add(callback);

    // Return unsubscribe function
    return () => {
      this.eventListeners.get('tipSent')?.delete(callback);
    };
  }

  onBuilderRegistered(callback: (event: BuilderRegisteredEvent) => void): () => void {
    if (!this.eventListeners.has('builderRegistered')) {
      this.eventListeners.set('builderRegistered', new Set());
    }
    this.eventListeners.get('builderRegistered')!.add(callback);

    // Return unsubscribe function
    return () => {
      this.eventListeners.get('builderRegistered')?.delete(callback);
    };
  }

  private emitEvent(eventName: string, data: any) {
    const listeners = this.eventListeners.get(eventName);
    if (listeners) {
      listeners.forEach(callback => callback(data));
    }
  }

  // Utility methods
  isConnected(): boolean {
    return this.connectedAddress !== null;
  }

  getConnectedAddress(): UnifiedAddress | null {
    return this.connectedAddress;
  }

  getChainId(): number {
    // Return the chain ID for the connected network
    // This would be dynamic in production
    return 42; // Paseo testnet
  }

  getContractAddress(): UnifiedAddress {
    return this.contractAddress;
  }

  getContractType(): 'ink' | 'evm' {
    return 'ink';
  }

  // Helper method to connect wallet
  async connect(address: UnifiedAddress): Promise<void> {
    this.connectedAddress = address;
  }

  // Helper method to disconnect wallet
  disconnect(): void {
    this.connectedAddress = null;
  }
}
