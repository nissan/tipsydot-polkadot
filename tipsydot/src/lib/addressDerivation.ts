/**
 * Address Derivation Utilities
 * Convert between Ethereum (H160) and Substrate (SS58) addresses
 */

import { ethers } from 'ethers';
import { decodeAddress, encodeAddress } from '@polkadot/keyring';
import { hexToU8a, u8aToHex } from '@polkadot/util';

/**
 * Derive an Ethereum address from a Substrate address
 * Note: This is a deterministic derivation, not a cryptographic conversion
 * For same-key derivation, you need access to the private key
 */
export function deriveEvmFromSubstrate(substrateAddress: string): string {
  try {
    // Decode the substrate address to get the public key
    const publicKey = decodeAddress(substrateAddress);
    
    // Create a deterministic EVM address from the substrate public key
    // This is NOT the same as if you used the same private key!
    // For demo purposes only
    const hash = ethers.keccak256(publicKey);
    
    // Take the last 20 bytes of the hash as the EVM address
    const evmAddress = '0x' + hash.slice(-40);
    
    return ethers.getAddress(evmAddress); // Checksum format
  } catch (error) {
    console.error('Failed to derive EVM address:', error);
    throw error;
  }
}

/**
 * Derive a Substrate address from an Ethereum private key
 * This allows using the same key for both chains
 */
export function deriveSubstrateFromEthereumKey(
  ethereumPrivateKey: string,
  ss58Format: number = 42 // Default to generic substrate
): string {
  try {
    // Remove 0x prefix if present
    const cleanKey = ethereumPrivateKey.replace('0x', '');
    
    // Convert to Uint8Array
    const keyBytes = hexToU8a('0x' + cleanKey);
    
    // The first 32 bytes are the private key
    const privateKey = keyBytes.slice(0, 32);
    
    // For Ethereum-compatible chains, we can use the same key
    // But the address derivation is different
    
    // Create a pseudo public key for demo
    // In production, you'd use proper cryptography
    const pseudoPublicKey = ethers.keccak256(privateKey);
    
    // Encode as SS58
    const substrateAddress = encodeAddress(
      hexToU8a(pseudoPublicKey.slice(0, 66)), // 32 bytes
      ss58Format
    );
    
    return substrateAddress;
  } catch (error) {
    console.error('Failed to derive Substrate address:', error);
    throw error;
  }
}

/**
 * Create a unified account representation
 */
export interface UnifiedAccount {
  evmAddress: string;
  substrateAddress: string;
  derivationMethod: 'same-key' | 'deterministic' | 'manual';
}

/**
 * Get unified account from Ethereum wallet (MetaMask)
 */
export async function getUnifiedAccountFromEvm(
  evmAddress: string,
  privateKey?: string
): Promise<UnifiedAccount> {
  if (privateKey) {
    // If we have the private key, we can derive the substrate address
    const substrateAddress = deriveSubstrateFromEthereumKey(privateKey);
    
    return {
      evmAddress,
      substrateAddress,
      derivationMethod: 'same-key'
    };
  } else {
    // Without private key, use deterministic derivation
    // This creates a different address, not the same account!
    const hash = ethers.keccak256(ethers.toUtf8Bytes(evmAddress));
    const pseudoSubstrate = encodeAddress(hexToU8a(hash.slice(0, 66)));
    
    return {
      evmAddress,
      substrateAddress: pseudoSubstrate,
      derivationMethod: 'deterministic'
    };
  }
}

/**
 * Get unified account from Substrate wallet (Polkadot.js)
 */
export function getUnifiedAccountFromSubstrate(
  substrateAddress: string,
  manualEvmAddress?: string
): Promise<UnifiedAccount> {
  if (manualEvmAddress) {
    // User provided manual mapping
    return Promise.resolve({
      evmAddress: manualEvmAddress,
      substrateAddress,
      derivationMethod: 'manual'
    });
  } else {
    // Derive deterministically
    const evmAddress = deriveEvmFromSubstrate(substrateAddress);
    
    return Promise.resolve({
      evmAddress,
      substrateAddress,
      derivationMethod: 'deterministic'
    });
  }
}

/**
 * Verify address checksum
 */
export function verifyAddressChecksum(
  address: string,
  expectedChecksum: string
): boolean {
  const actualChecksum = ethers.keccak256(ethers.toUtf8Bytes(address));
  return actualChecksum === expectedChecksum;
}

/**
 * Create visual checksum for address verification
 */
export function createVisualChecksum(address: string): string {
  const hash = ethers.keccak256(ethers.toUtf8Bytes(address));
  
  // Create emoji checksum for easy visual verification
  const emojis = ['🔴', '🟠', '🟡', '🟢', '🔵', '🟣', '⚫', '⚪'];
  let visual = '';
  
  for (let i = 0; i < 4; i++) {
    const byte = parseInt(hash.slice(2 + i * 2, 4 + i * 2), 16);
    visual += emojis[byte % emojis.length];
  }
  
  return visual;
}

/**
 * Format address for display with checksum
 */
export function formatAddressWithChecksum(address: string): string {
  const checksum = createVisualChecksum(address);
  const shortened = address.slice(0, 6) + '...' + address.slice(-4);
  return `${shortened} ${checksum}`;
}