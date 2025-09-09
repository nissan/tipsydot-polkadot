/**
 * XCM Bridge Service for AssetHub → PassetHub USDC transfers
 * Based on XCM v5 patterns from the Polkadot ecosystem
 */

import { ApiPromise, WsProvider } from '@polkadot/api';
import { Keyring } from '@polkadot/keyring';
import { cryptoWaitReady } from '@polkadot/util-crypto';
import type { SubmittableExtrinsic } from '@polkadot/api/types';

// Chain configuration
export const CHAIN_CONFIG = {
  ASSET_HUB: {
    rpc: 'wss://rpc-asset-hub-paseo.luckyfriday.io',
    paraId: 1000,
  },
  PASSET_HUB: {
    rpc: 'wss://paseo-sys-rpc-endpoint-02.parity.io',
    paraId: 1111,
    evmRpc: 'https://rpc.passet-paseo.parity.io',
  },
  USDC: {
    assetId: 31337,
    decimals: 6,
    symbol: 'USDC',
  }
};

// XCM Location types for v5
interface XcmLocation {
  parents: number;
  interior: XcmJunctions;
}

interface XcmJunctions {
  X1?: any[];
  X2?: any[];
}

export class XcmBridge {
  private assetHubApi: ApiPromise | null = null;
  private passetHubApi: ApiPromise | null = null;

  /**
   * Initialize connections to both chains
   */
  async connect(): Promise<void> {
    console.log('🔗 Connecting to AssetHub...');
    const assetHubProvider = new WsProvider(CHAIN_CONFIG.ASSET_HUB.rpc);
    this.assetHubApi = await ApiPromise.create({ provider: assetHubProvider });
    await this.assetHubApi.isReady;
    console.log('✅ Connected to AssetHub');

    console.log('🔗 Connecting to PassetHub...');
    const passetHubProvider = new WsProvider(CHAIN_CONFIG.PASSET_HUB.rpc);
    this.passetHubApi = await ApiPromise.create({ provider: passetHubProvider });
    await this.passetHubApi.isReady;
    console.log('✅ Connected to PassetHub');
  }

  /**
   * Query USDC balance on AssetHub
   */
  async getAssetHubUSDCBalance(address: string): Promise<string> {
    if (!this.assetHubApi) throw new Error('Not connected to AssetHub');

    const assetBalance = await this.assetHubApi.query.assets.account(
      CHAIN_CONFIG.USDC.assetId,
      address
    );

    const balance = assetBalance.toJSON() as any;
    return balance?.balance || '0';
  }

  /**
   * Build XCM reserve transfer from AssetHub to PassetHub
   * Following the pattern from the gist: https://gist.github.com/franciscoaguirre/a6dea0c55e81faba65bedf700033a1a2
   */
  buildReserveTransfer(
    amount: string,
    beneficiaryEvmAddress: string
  ): SubmittableExtrinsic<'promise'> {
    if (!this.assetHubApi) throw new Error('Not connected to AssetHub');

    // Destination: PassetHub (Parachain 1111)
    const dest = {
      V4: {
        parents: 0,
        interior: {
          X1: [{ Parachain: CHAIN_CONFIG.PASSET_HUB.paraId }]
        }
      }
    };

    // Beneficiary: EVM address on PassetHub
    // AccountKey20 for H160 Ethereum addresses
    const beneficiary = {
      V4: {
        parents: 0,
        interior: {
          X1: [{
            AccountKey20: {
              key: beneficiaryEvmAddress,
              network: null
            }
          }]
        }
      }
    };

    // Assets: USDC (Asset ID 31337)
    const assets = {
      V4: [{
        id: {
          Concrete: {
            parents: 0,
            interior: {
              X2: [
                { PalletInstance: 50 }, // Assets pallet
                { GeneralIndex: CHAIN_CONFIG.USDC.assetId }
              ]
            }
          }
        },
        fun: { Fungible: amount }
      }]
    };

    // Build the XCM transaction
    // Using polkadotXcm.reserveTransferAssets (XCM v4/v5 compatible)
    const tx = this.assetHubApi.tx.polkadotXcm.reserveTransferAssets(
      dest,
      beneficiary,
      assets,
      0 // fee_asset_item (0 = first asset pays fees)
    );

    return tx;
  }

  /**
   * Execute reserve transfer with security checks
   */
  async executeReserveTransfer(
    amount: string,
    beneficiaryEvmAddress: string,
    senderAccount: any,
    options: {
      requireHardwareWallet?: boolean;
      onStatusChange?: (status: string) => void;
    } = {}
  ): Promise<string> {
    const { onStatusChange = () => {} } = options;

    // Security: Validate EVM address format
    if (!this.isValidEvmAddress(beneficiaryEvmAddress)) {
      throw new Error('Invalid EVM address format');
    }

    // Security: Show pre-transfer warning
    onStatusChange('⚠️ Preparing XCM transfer - verify addresses carefully');

    // Build the transaction
    const tx = this.buildReserveTransfer(amount, beneficiaryEvmAddress);

    // Display transaction details for verification
    console.log('📋 XCM Transfer Details:');
    console.log(`  From: AssetHub (ParaId ${CHAIN_CONFIG.ASSET_HUB.paraId})`);
    console.log(`  To: PassetHub (ParaId ${CHAIN_CONFIG.PASSET_HUB.paraId})`);
    console.log(`  Beneficiary: ${beneficiaryEvmAddress}`);
    console.log(`  Amount: ${amount} (${parseInt(amount) / 10**CHAIN_CONFIG.USDC.decimals} USDC)`);

    return new Promise((resolve, reject) => {
      onStatusChange('🔄 Signing transaction...');

      tx.signAndSend(senderAccount, ({ status, events }) => {
        if (status.isInBlock) {
          onStatusChange(`📦 Transaction included in block: ${status.asInBlock.toString()}`);
        }

        if (status.isFinalized) {
          onStatusChange(`✅ Transaction finalized: ${status.asFinalized.toString()}`);
          
          // Check for XCM events
          events.forEach(({ event }) => {
            if (event.section === 'xcmPallet' || event.section === 'polkadotXcm') {
              console.log('XCM Event:', event.method, event.data.toString());
              
              if (event.method === 'Attempted') {
                const outcome = event.data[0].toJSON() as any;
                if (outcome?.complete) {
                  onStatusChange('✅ XCM transfer completed successfully!');
                } else if (outcome?.error) {
                  onStatusChange(`⚠️ XCM error: ${JSON.stringify(outcome.error)}`);
                }
              }
            }
          });

          resolve(status.asFinalized.toString());
        }

        if (status.isDropped || status.isInvalid) {
          reject(new Error('Transaction failed'));
        }
      }).catch(reject);
    });
  }

  /**
   * Alternative: Build teleport transfer (if supported between chains)
   */
  buildTeleportTransfer(
    amount: string,
    beneficiaryEvmAddress: string
  ): SubmittableExtrinsic<'promise'> | null {
    if (!this.assetHubApi) throw new Error('Not connected to AssetHub');

    // Teleport is typically for DOT/KSM between relay and system chains
    // For USDC between parachains, reserve transfer is standard
    console.warn('Teleport not typically used for USDC between parachains');
    return null;
  }

  /**
   * Query XCM transfer status (if trackable)
   */
  async queryXcmStatus(txHash: string): Promise<any> {
    // In production, this would query an indexer or XCM tracking service
    // For now, return basic status
    return {
      hash: txHash,
      status: 'pending',
      message: 'XCM transfers typically confirm within 2-3 blocks'
    };
  }

  /**
   * Validate EVM address format
   */
  private isValidEvmAddress(address: string): boolean {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }

  /**
   * Convert Substrate address to EVM (if using same private key)
   */
  async deriveEvmAddress(substrateAddress: string): Promise<string> {
    await cryptoWaitReady();
    
    // This is a simplified derivation
    // In production, use proper key derivation
    const keyring = new Keyring({ type: 'ethereum' });
    
    // Note: This requires the user to have access to their private key
    // which may not always be possible with extension wallets
    console.warn('EVM derivation from Substrate address requires private key access');
    
    // For demo, return a placeholder
    return '0x' + '0'.repeat(40);
  }

  /**
   * Disconnect from chains
   */
  async disconnect(): Promise<void> {
    if (this.assetHubApi) {
      await this.assetHubApi.disconnect();
      this.assetHubApi = null;
    }
    if (this.passetHubApi) {
      await this.passetHubApi.disconnect();
      this.passetHubApi = null;
    }
  }
}

/**
 * Helper function to format USDC amount
 */
export function formatUSDC(amount: string): string {
  const value = parseInt(amount) / 10**CHAIN_CONFIG.USDC.decimals;
  return value.toFixed(2) + ' USDC';
}

/**
 * Helper function to parse USDC amount to base units
 */
export function parseUSDC(amount: string): string {
  const value = parseFloat(amount) * 10**CHAIN_CONFIG.USDC.decimals;
  return value.toFixed(0);
}