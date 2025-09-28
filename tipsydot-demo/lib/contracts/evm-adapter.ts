/**
 * EVM Contract Adapter
 * 
 * This adapter provides interaction with Solidity contracts via Wagmi/Viem.
 * It works with both traditional EVM chains and pallet-revive enabled chains.
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
} from './unified-interface';
import {
  type PublicClient,
  type WalletClient,
  type Address,
  type Hex,
  parseEther,
  formatEther,
  encodeFunctionData,
  decodeFunctionResult,
} from 'viem';
import { type Abi } from 'abitype';

export class EVMContractAdapter implements UnifiedContractInterface {
  private publicClient: PublicClient | null = null;
  private walletClient: WalletClient | null = null;
  private contractAddress: Address;
  private abi: Abi;
  private eventListeners: Map<string, Set<Function>> = new Map();

  constructor(
    contractAddress: UnifiedAddress,
    options: {
      abi: Abi;
      publicClient?: PublicClient;
      walletClient?: WalletClient;
    }
  ) {
    this.contractAddress = contractAddress as Address;
    this.abi = options.abi;
    this.publicClient = options.publicClient || null;
    this.walletClient = options.walletClient || null;
  }

  // Set clients for interaction
  setClients(publicClient: PublicClient, walletClient: WalletClient) {
    this.publicClient = publicClient;
    this.walletClient = walletClient;
  }

  // Read operations
  async getBuilder(builderId: bigint): Promise<BuilderData | null> {
    if (!this.publicClient) {
      throw new Error('Public client not initialized');
    }

    try {
      const result = await this.publicClient.readContract({
        address: this.contractAddress,
        abi: this.abi,
        functionName: 'getBuilder',
        args: [builderId],
      }) as any;

      if (!result || result.id === 0n) {
        return null;
      }

      return {
        id: result.id,
        address: result.address,
        name: result.name,
        totalReceived: result.totalReceived,
        tipCount: result.tipCount,
        isActive: result.isActive,
      };
    } catch (error) {
      console.error('Failed to get builder:', error);
      return null;
    }
  }

  async getCampaign(campaignId: bigint): Promise<CampaignData | null> {
    if (!this.publicClient) {
      throw new Error('Public client not initialized');
    }

    try {
      const result = await this.publicClient.readContract({
        address: this.contractAddress,
        abi: this.abi,
        functionName: 'getCampaign',
        args: [campaignId],
      }) as any;

      if (!result || result.id === 0n) {
        return null;
      }

      return {
        id: result.id,
        builderId: result.builderId,
        targetAmount: result.targetAmount,
        raisedAmount: result.raisedAmount,
        deadline: Number(result.deadline),
        isActive: result.isActive,
      };
    } catch (error) {
      console.error('Failed to get campaign:', error);
      return null;
    }
  }

  async getTip(tipId: bigint): Promise<TipData | null> {
    if (!this.publicClient) {
      throw new Error('Public client not initialized');
    }

    try {
      const result = await this.publicClient.readContract({
        address: this.contractAddress,
        abi: this.abi,
        functionName: 'getTip',
        args: [tipId],
      }) as any;

      if (!result || !result.from) {
        return null;
      }

      return {
        from: result.from,
        builderId: result.builderId,
        amount: result.amount,
        message: result.message,
        timestamp: Number(result.timestamp),
        campaignId: result.campaignId > 0n ? result.campaignId : undefined,
      };
    } catch (error) {
      console.error('Failed to get tip:', error);
      return null;
    }
  }

  async getBalance(address: UnifiedAddress): Promise<bigint> {
    if (!this.publicClient) {
      throw new Error('Public client not initialized');
    }

    try {
      const balance = await this.publicClient.getBalance({
        address: address as Address,
      });
      return balance;
    } catch (error) {
      console.error('Failed to get balance:', error);
      return 0n;
    }
  }

  async getProtocolFee(): Promise<bigint> {
    if (!this.publicClient) {
      throw new Error('Public client not initialized');
    }

    try {
      const fee = await this.publicClient.readContract({
        address: this.contractAddress,
        abi: this.abi,
        functionName: 'protocolFeeBps',
      }) as bigint;
      return fee;
    } catch (error) {
      console.error('Failed to get protocol fee:', error);
      return 0n;
    }
  }

  async isPaused(): Promise<boolean> {
    if (!this.publicClient) {
      throw new Error('Public client not initialized');
    }

    try {
      const paused = await this.publicClient.readContract({
        address: this.contractAddress,
        abi: this.abi,
        functionName: 'paused',
      }) as boolean;
      return paused;
    } catch (error) {
      console.error('Failed to get paused state:', error);
      return false;
    }
  }

  // Write operations
  async registerBuilder(name: string, address: UnifiedAddress): Promise<TransactionResult> {
    if (!this.walletClient) {
      throw new Error('Wallet client not initialized');
    }

    try {
      const hash = await this.walletClient.writeContract({
        address: this.contractAddress,
        abi: this.abi,
        functionName: 'registerBuilder',
        args: [name, address as Address],
      });

      // Wait for transaction receipt
      if (this.publicClient) {
        const receipt = await this.publicClient.waitForTransactionReceipt({
          hash,
          confirmations: 1,
        });

        // Emit event
        this.emitEvent('builderRegistered', {
          builderId: 0n, // Would parse from logs
          address,
          name,
        });

        return {
          hash: receipt.transactionHash,
          status: receipt.status === 'success' ? 'success' : 'failed',
          blockNumber: Number(receipt.blockNumber),
          gasUsed: receipt.gasUsed,
        };
      }

      return {
        hash,
        status: 'pending',
      };
    } catch (error) {
      return {
        hash: '',
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async tip(builderId: bigint, amount: bigint, message: string): Promise<TransactionResult> {
    if (!this.walletClient) {
      throw new Error('Wallet client not initialized');
    }

    try {
      const hash = await this.walletClient.writeContract({
        address: this.contractAddress,
        abi: this.abi,
        functionName: 'tip',
        args: [builderId, message],
        value: amount,
      });

      // Wait for transaction receipt
      if (this.publicClient) {
        const receipt = await this.publicClient.waitForTransactionReceipt({
          hash,
          confirmations: 1,
        });

        // Emit event
        this.emitEvent('tipSent', {
          from: this.walletClient.account?.address || '',
          builderId,
          amount,
          message,
          timestamp: Date.now(),
        });

        return {
          hash: receipt.transactionHash,
          status: receipt.status === 'success' ? 'success' : 'failed',
          blockNumber: Number(receipt.blockNumber),
          gasUsed: receipt.gasUsed,
        };
      }

      return {
        hash,
        status: 'pending',
      };
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
    if (!this.walletClient) {
      throw new Error('Wallet client not initialized');
    }

    try {
      const hash = await this.walletClient.writeContract({
        address: this.contractAddress,
        abi: this.abi,
        functionName: 'createCampaign',
        args: [builderId, targetAmount, BigInt(durationDays)],
      });

      // Wait for transaction receipt
      if (this.publicClient) {
        const receipt = await this.publicClient.waitForTransactionReceipt({
          hash,
          confirmations: 1,
        });

        return {
          hash: receipt.transactionHash,
          status: receipt.status === 'success' ? 'success' : 'failed',
          blockNumber: Number(receipt.blockNumber),
          gasUsed: receipt.gasUsed,
        };
      }

      return {
        hash,
        status: 'pending',
      };
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
    if (!this.walletClient) {
      throw new Error('Wallet client not initialized');
    }

    try {
      const hash = await this.walletClient.writeContract({
        address: this.contractAddress,
        abi: this.abi,
        functionName: 'setProtocolFee',
        args: [newFeeBps],
      });

      if (this.publicClient) {
        const receipt = await this.publicClient.waitForTransactionReceipt({
          hash,
          confirmations: 1,
        });

        return {
          hash: receipt.transactionHash,
          status: receipt.status === 'success' ? 'success' : 'failed',
          blockNumber: Number(receipt.blockNumber),
          gasUsed: receipt.gasUsed,
        };
      }

      return {
        hash,
        status: 'pending',
      };
    } catch (error) {
      return {
        hash: '',
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async setPaused(paused: boolean): Promise<TransactionResult> {
    if (!this.walletClient) {
      throw new Error('Wallet client not initialized');
    }

    try {
      const hash = await this.walletClient.writeContract({
        address: this.contractAddress,
        abi: this.abi,
        functionName: 'setPaused',
        args: [paused],
      });

      if (this.publicClient) {
        const receipt = await this.publicClient.waitForTransactionReceipt({
          hash,
          confirmations: 1,
        });

        return {
          hash: receipt.transactionHash,
          status: receipt.status === 'success' ? 'success' : 'failed',
          blockNumber: Number(receipt.blockNumber),
          gasUsed: receipt.gasUsed,
        };
      }

      return {
        hash,
        status: 'pending',
      };
    } catch (error) {
      return {
        hash: '',
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async setTreasury(treasury: UnifiedAddress): Promise<TransactionResult> {
    if (!this.walletClient) {
      throw new Error('Wallet client not initialized');
    }

    try {
      const hash = await this.walletClient.writeContract({
        address: this.contractAddress,
        abi: this.abi,
        functionName: 'setTreasury',
        args: [treasury as Address],
      });

      if (this.publicClient) {
        const receipt = await this.publicClient.waitForTransactionReceipt({
          hash,
          confirmations: 1,
        });

        return {
          hash: receipt.transactionHash,
          status: receipt.status === 'success' ? 'success' : 'failed',
          blockNumber: Number(receipt.blockNumber),
          gasUsed: receipt.gasUsed,
        };
      }

      return {
        hash,
        status: 'pending',
      };
    } catch (error) {
      return {
        hash: '',
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // Cross-contract operations
  async callContract(
    target: UnifiedAddress,
    data: Uint8Array,
    value?: bigint
  ): Promise<TransactionResult> {
    if (!this.walletClient) {
      throw new Error('Wallet client not initialized');
    }

    try {
      const hash = await this.walletClient.sendTransaction({
        to: target as Address,
        data: `0x${Buffer.from(data).toString('hex')}` as Hex,
        value: value || 0n,
      });

      if (this.publicClient) {
        const receipt = await this.publicClient.waitForTransactionReceipt({
          hash,
          confirmations: 1,
        });

        return {
          hash: receipt.transactionHash,
          status: receipt.status === 'success' ? 'success' : 'failed',
          blockNumber: Number(receipt.blockNumber),
          gasUsed: receipt.gasUsed,
        };
      }

      return {
        hash,
        status: 'pending',
      };
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

    // Set up event watching if we have a public client
    if (this.publicClient) {
      const unwatch = this.publicClient.watchContractEvent({
        address: this.contractAddress,
        abi: this.abi,
        eventName: 'TipSent',
        onLogs: (logs) => {
          logs.forEach(log => {
            const args = log.args as any;
            this.emitEvent('tipSent', {
              from: args.from,
              builderId: args.builderId,
              amount: args.amount,
              message: args.message,
              timestamp: Number(args.timestamp),
            });
          });
        },
      });

      // Return combined unsubscribe function
      return () => {
        unwatch();
        this.eventListeners.get('tipSent')?.delete(callback);
      };
    }

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

    // Set up event watching if we have a public client
    if (this.publicClient) {
      const unwatch = this.publicClient.watchContractEvent({
        address: this.contractAddress,
        abi: this.abi,
        eventName: 'BuilderRegistered',
        onLogs: (logs) => {
          logs.forEach(log => {
            const args = log.args as any;
            this.emitEvent('builderRegistered', {
              builderId: args.builderId,
              address: args.address,
              name: args.name,
            });
          });
        },
      });

      // Return combined unsubscribe function
      return () => {
        unwatch();
        this.eventListeners.get('builderRegistered')?.delete(callback);
      };
    }

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
    return this.walletClient !== null && this.walletClient.account !== undefined;
  }

  getConnectedAddress(): UnifiedAddress | null {
    return this.walletClient?.account?.address || null;
  }

  getChainId(): number {
    return this.walletClient?.chain?.id || 0;
  }

  getContractAddress(): UnifiedAddress {
    return this.contractAddress;
  }

  getContractType(): 'ink' | 'evm' {
    return 'evm';
  }
}
