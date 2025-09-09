/**
 * XCM Bridge UI Component
 * Allows users to bridge USDC from AssetHub to PassetHub
 */

import React, { useState, useEffect } from 'react';
import { XcmBridge, CHAIN_CONFIG, formatUSDC, parseUSDC } from '../lib/xcm/XcmBridge';
import { connectWallet, getAccounts, getSigner } from '../lib/wallet';
import { ethers } from 'ethers';
import { AlertCircle, ArrowRight, Shield, Check, X } from 'lucide-react';

interface XcmBridgeUIProps {
  onBridgeComplete?: (txHash: string) => void;
  defaultEvmAddress?: string;
}

export const XcmBridgeUI: React.FC<XcmBridgeUIProps> = ({ 
  onBridgeComplete,
  defaultEvmAddress = ''
}) => {
  // State management
  const [xcmBridge, setXcmBridge] = useState<XcmBridge | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  
  // Wallet state
  const [substrateAccounts, setSubstrateAccounts] = useState<any[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string>('');
  const [evmAddress, setEvmAddress] = useState(defaultEvmAddress);
  const [useManualEvmAddress, setUseManualEvmAddress] = useState(false);
  
  // Balance state
  const [usdcBalance, setUsdcBalance] = useState('0');
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);
  
  // Transfer state
  const [transferAmount, setTransferAmount] = useState('');
  const [isTransferring, setIsTransferring] = useState(false);
  const [transferStatus, setTransferStatus] = useState('');
  const [txHash, setTxHash] = useState('');
  
  // Security state
  const [showSecurityWarning, setShowSecurityWarning] = useState(false);
  const [addressVerified, setAddressVerified] = useState(false);
  const [isHardwareWallet, setIsHardwareWallet] = useState(false);

  // Initialize XCM bridge
  useEffect(() => {
    const initBridge = async () => {
      const bridge = new XcmBridge();
      await bridge.connect();
      setXcmBridge(bridge);
      setIsConnected(true);
    };
    
    initBridge().catch(console.error);
    
    return () => {
      xcmBridge?.disconnect();
    };
  }, []);

  // Connect Substrate wallet
  const handleConnectWallet = async () => {
    setIsConnecting(true);
    try {
      await connectWallet('TipsyDot XCM Bridge');
      const accounts = await getAccounts();
      setSubstrateAccounts(accounts);
      
      if (accounts.length > 0) {
        setSelectedAccount(accounts[0].address);
        await loadBalance(accounts[0].address);
      }
      
      // Check if hardware wallet (simplified check)
      const isHW = accounts.some(acc => 
        acc.meta?.source?.includes('ledger') || 
        acc.meta?.source?.includes('trezor')
      );
      setIsHardwareWallet(isHW);
      
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      setTransferStatus('❌ Failed to connect wallet');
    } finally {
      setIsConnecting(false);
    }
  };

  // Load USDC balance
  const loadBalance = async (address: string) => {
    if (!xcmBridge) return;
    
    setIsLoadingBalance(true);
    try {
      const balance = await xcmBridge.getAssetHubUSDCBalance(address);
      setUsdcBalance(balance);
    } catch (error) {
      console.error('Failed to load balance:', error);
    } finally {
      setIsLoadingBalance(false);
    }
  };

  // Derive EVM address from Substrate (placeholder for now)
  const handleDeriveEvmAddress = async () => {
    if (!selectedAccount || !xcmBridge) return;
    
    try {
      // For demo, generate a deterministic address from substrate address
      const hash = ethers.keccak256(ethers.toUtf8Bytes(selectedAccount));
      const derived = '0x' + hash.slice(26); // Take last 20 bytes
      setEvmAddress(derived);
      setUseManualEvmAddress(false);
    } catch (error) {
      console.error('Failed to derive EVM address:', error);
      setUseManualEvmAddress(true);
    }
  };

  // Verify destination address
  const handleVerifyAddress = () => {
    if (!evmAddress) return;
    
    // Check if valid EVM address
    const isValid = /^0x[a-fA-F0-9]{40}$/.test(evmAddress);
    
    if (isValid) {
      setAddressVerified(true);
      setTransferStatus('✅ Address verified');
    } else {
      setAddressVerified(false);
      setTransferStatus('❌ Invalid EVM address format');
    }
  };

  // Execute XCM transfer
  const handleTransfer = async () => {
    if (!xcmBridge || !selectedAccount || !evmAddress || !transferAmount) {
      setTransferStatus('❌ Missing required information');
      return;
    }

    // Security warning for non-hardware wallets
    if (!isHardwareWallet) {
      setShowSecurityWarning(true);
      const proceed = window.confirm(
        '⚠️ SECURITY WARNING\n\n' +
        'You are not using a hardware wallet. This increases the risk of address substitution attacks.\n\n' +
        'Please verify the destination address carefully:\n' +
        evmAddress + '\n\n' +
        'Do you want to proceed?'
      );
      
      if (!proceed) {
        setTransferStatus('🛑 Transfer cancelled by user');
        return;
      }
    }

    setIsTransferring(true);
    setTransferStatus('🔄 Initiating XCM transfer...');

    try {
      // Get signer
      const injector = await getSigner(selectedAccount);
      
      // Parse amount to base units
      const amountInBaseUnits = parseUSDC(transferAmount);
      
      // Execute transfer
      const hash = await xcmBridge.executeReserveTransfer(
        amountInBaseUnits,
        evmAddress,
        selectedAccount,
        {
          requireHardwareWallet: isHardwareWallet,
          onStatusChange: setTransferStatus
        }
      );
      
      setTxHash(hash);
      onBridgeComplete?.(hash);
      
      // Reload balance
      await loadBalance(selectedAccount);
      
    } catch (error: any) {
      console.error('Transfer failed:', error);
      setTransferStatus(`❌ Transfer failed: ${error.message}`);
    } finally {
      setIsTransferring(false);
    }
  };

  // Render security badge
  const SecurityBadge = () => {
    if (isHardwareWallet) {
      return (
        <div className="flex items-center gap-2 text-green-600 bg-green-50 px-3 py-1 rounded-lg">
          <Shield className="w-4 h-4" />
          <span className="text-sm font-medium">Hardware Wallet Connected</span>
        </div>
      );
    }
    
    return (
      <div className="flex items-center gap-2 text-yellow-600 bg-yellow-50 px-3 py-1 rounded-lg">
        <AlertCircle className="w-4 h-4" />
        <span className="text-sm font-medium">Software Wallet - Use Caution</span>
      </div>
    );
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-xl shadow-lg">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          XCM Bridge: AssetHub → PassetHub
        </h2>
        <p className="text-gray-600">
          Transfer USDC from AssetHub (Paseo) to PassetHub for tipping parachains
        </p>
      </div>

      {/* Connection Status */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <span className="font-medium">Chain Connection</span>
          {isConnected ? (
            <span className="text-green-600 flex items-center gap-1">
              <Check className="w-4 h-4" /> Connected
            </span>
          ) : (
            <span className="text-gray-400">Connecting...</span>
          )}
        </div>
        <div className="text-sm text-gray-600">
          <div>AssetHub: ParaID {CHAIN_CONFIG.ASSET_HUB.paraId}</div>
          <div>PassetHub: ParaID {CHAIN_CONFIG.PASSET_HUB.paraId}</div>
          <div>USDC Asset ID: {CHAIN_CONFIG.USDC.assetId}</div>
        </div>
      </div>

      {/* Wallet Connection */}
      {substrateAccounts.length === 0 ? (
        <button
          onClick={handleConnectWallet}
          disabled={isConnecting}
          className="w-full mb-6 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isConnecting ? 'Connecting...' : 'Connect Polkadot Wallet'}
        </button>
      ) : (
        <div className="mb-6 space-y-4">
          {/* Account Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Source Account (AssetHub)
            </label>
            <select
              value={selectedAccount}
              onChange={(e) => {
                setSelectedAccount(e.target.value);
                loadBalance(e.target.value);
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {substrateAccounts.map((acc) => (
                <option key={acc.address} value={acc.address}>
                  {acc.meta?.name || acc.address.slice(0, 8) + '...' + acc.address.slice(-6)}
                </option>
              ))}
            </select>
          </div>

          {/* Balance Display */}
          <div className="p-3 bg-blue-50 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">USDC Balance (AssetHub)</span>
              {isLoadingBalance ? (
                <span className="text-gray-400">Loading...</span>
              ) : (
                <span className="font-semibold text-blue-600">
                  {formatUSDC(usdcBalance)}
                </span>
              )}
            </div>
          </div>

          {/* Security Badge */}
          <SecurityBadge />

          {/* Destination Address */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Destination Address (PassetHub EVM)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={evmAddress}
                onChange={(e) => {
                  setEvmAddress(e.target.value);
                  setAddressVerified(false);
                }}
                placeholder="0x..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={!useManualEvmAddress}
              />
              <button
                onClick={handleDeriveEvmAddress}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                title="Derive from Substrate address"
              >
                Derive
              </button>
              <button
                onClick={() => setUseManualEvmAddress(!useManualEvmAddress)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                {useManualEvmAddress ? 'Lock' : 'Edit'}
              </button>
            </div>
            
            {evmAddress && (
              <div className="mt-2">
                <button
                  onClick={handleVerifyAddress}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  Verify address format →
                </button>
                {addressVerified && (
                  <span className="ml-2 text-green-600 text-sm">
                    ✓ Valid format
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Transfer Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Amount (USDC)
            </label>
            <input
              type="number"
              value={transferAmount}
              onChange={(e) => setTransferAmount(e.target.value)}
              placeholder="0.00"
              min="0"
              step="0.01"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <div className="mt-1 text-sm text-gray-500">
              Available: {formatUSDC(usdcBalance)}
            </div>
          </div>

          {/* Transfer Button */}
          <button
            onClick={handleTransfer}
            disabled={
              !addressVerified || 
              !transferAmount || 
              parseFloat(transferAmount) <= 0 ||
              parseFloat(transferAmount) > parseFloat(formatUSDC(usdcBalance)) ||
              isTransferring
            }
            className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {isTransferring ? (
              <>Processing...</>
            ) : (
              <>
                Bridge USDC
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>

          {/* Status Messages */}
          {transferStatus && (
            <div className={`p-3 rounded-lg ${
              transferStatus.includes('✅') ? 'bg-green-50 text-green-700' :
              transferStatus.includes('❌') ? 'bg-red-50 text-red-700' :
              transferStatus.includes('⚠️') ? 'bg-yellow-50 text-yellow-700' :
              'bg-blue-50 text-blue-700'
            }`}>
              {transferStatus}
            </div>
          )}

          {/* Transaction Hash */}
          {txHash && (
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-600 mb-1">Transaction Hash:</div>
              <div className="font-mono text-xs break-all">{txHash}</div>
              <a
                href={`https://paseo.subscan.io/extrinsic/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:text-blue-700 mt-2 inline-block"
              >
                View on Subscan →
              </a>
            </div>
          )}
        </div>
      )}

      {/* Security Warning Modal */}
      {showSecurityWarning && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl max-w-md">
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="w-8 h-8 text-yellow-500" />
              <h3 className="text-lg font-semibold">Security Warning</h3>
            </div>
            <p className="text-gray-600 mb-4">
              You are not using a hardware wallet. Be extra careful to verify the destination address to prevent address substitution attacks.
            </p>
            <div className="font-mono text-sm bg-gray-100 p-2 rounded mb-4">
              {evmAddress}
            </div>
            <button
              onClick={() => setShowSecurityWarning(false)}
              className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              I understand the risks
            </button>
          </div>
        </div>
      )}
    </div>
  );
};