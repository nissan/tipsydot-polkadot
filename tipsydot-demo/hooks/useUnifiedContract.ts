/**
 * Unified Contract Hook (Inkathon-inspired)
 * 
 * This hook provides a seamless interface for interacting with both
 * Ink! and EVM contracts, automatically detecting the wallet type
 * and using the appropriate adapter.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAccount, usePublicClient, useWalletClient } from 'wagmi';
import { toast } from 'sonner';
import type { UnifiedContractInterface, TransactionResult } from '@/lib/contracts/unified-interface';
import { InkContractAdapter } from '@/lib/contracts/ink-adapter';
import { EVMContractAdapter } from '@/lib/contracts/evm-adapter';
import { tippingAbi } from '@/lib/abi/tipping';

// Configuration for different contract deployments
const CONTRACT_CONFIG = {
  // EVM contracts (Solidity)
  evm: {
    moonbeam: {
      address: '0x1234567890123456789012345678901234567890',
      chainId: 1284,
    },
    paseoRevive: {
      address: '0xABCDEF1234567890ABCDEF1234567890ABCDEF12',
      chainId: 42069,
    },
  },
  // Ink! contracts
  ink: {
    paseo: {
      address: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
      providerUrl: 'wss://rpc.paseo.io',
    },
    assetHub: {
      address: '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty',
      providerUrl: 'wss://paseo-asset-hub-rpc.polkadot.io',
    },
  },
} as const;

export type WalletType = 'evm' | 'ink' | null;

interface UseUnifiedContractOptions {
  autoConnect?: boolean;
  chainId?: number;
  contractType?: 'auto' | 'evm' | 'ink';
}

interface UseUnifiedContractReturn {
  // Contract instance
  contract: UnifiedContractInterface | null;
  
  // Connection state
  isConnected: boolean;
  isConnecting: boolean;
  address: string | null;
  walletType: WalletType;
  
  // Loading states
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
  error: Error | null;
  
  // Transaction state
  pendingTx: TransactionResult | null;
  
  // Methods
  connect: () => Promise<void>;
  disconnect: () => void;
  switchWalletType: (type: WalletType) => void;
}

export function useUnifiedContract(
  options: UseUnifiedContractOptions = {}
): UseUnifiedContractReturn {
  const { autoConnect = true, chainId, contractType = 'auto' } = options;

  // Wagmi hooks for EVM
  const { address: evmAddress, isConnected: evmConnected } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

  // State
  const [contract, setContract] = useState<UnifiedContractInterface | null>(null);
  const [walletType, setWalletType] = useState<WalletType>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [pendingTx, setPendingTx] = useState<TransactionResult | null>(null);
  const [substrateAddress, setSubstrateAddress] = useState<string | null>(null);

  // Detect wallet type
  useEffect(() => {
    if (contractType !== 'auto') {
      setWalletType(contractType as WalletType);
      return;
    }

    // Auto-detect based on connected wallet
    if (evmConnected && evmAddress) {
      setWalletType('evm');
    } else if (window.injectedWeb3?.['polkadot-js']) {
      setWalletType('ink');
    }
  }, [evmConnected, evmAddress, contractType]);

  // Initialize contract adapter
  useEffect(() => {
    if (!walletType) return;

    if (walletType === 'evm' && publicClient && walletClient) {
      // Create EVM adapter
      const config = chainId === 1284 ? CONTRACT_CONFIG.evm.moonbeam : CONTRACT_CONFIG.evm.paseoRevive;
      const adapter = new EVMContractAdapter(config.address, {
        abi: tippingAbi,
        publicClient,
        walletClient,
      });
      setContract(adapter);
    } else if (walletType === 'ink') {
      // Create Ink adapter
      const config = CONTRACT_CONFIG.ink.paseo; // Default to Paseo
      const adapter = new InkContractAdapter(config.address, {
        providerUrl: config.providerUrl,
      });
      setContract(adapter);
    }
  }, [walletType, publicClient, walletClient, chainId]);

  // Connect wallet
  const connect = useCallback(async () => {
    setIsConnecting(true);
    setError(null);

    try {
      if (walletType === 'ink' && contract) {
        // Connect Polkadot.js wallet
        const { web3Enable, web3Accounts } = await import('@polkadot/extension-dapp');
        
        const extensions = await web3Enable('TipsyDot');
        if (extensions.length === 0) {
          throw new Error('No Polkadot wallet extension found');
        }

        const accounts = await web3Accounts();
        if (accounts.length === 0) {
          throw new Error('No accounts found in Polkadot wallet');
        }

        // Use first account
        const account = accounts[0];
        setSubstrateAddress(account.address);
        
        // Connect to contract
        if ('connect' in contract) {
          await (contract as InkContractAdapter).connect(account.address);
        }
        
        toast.success('Connected to Polkadot wallet');
      } else if (walletType === 'evm') {
        // EVM wallet is already connected via Wagmi
        if (!evmConnected) {
          toast.error('Please connect your EVM wallet');
        } else {
          toast.success('Connected to EVM wallet');
        }
      }
    } catch (err) {
      const error = err as Error;
      setError(error);
      toast.error(`Failed to connect: ${error.message}`);
    } finally {
      setIsConnecting(false);
    }
  }, [walletType, contract, evmConnected]);

  // Disconnect wallet
  const disconnect = useCallback(() => {
    if (walletType === 'ink' && contract && 'disconnect' in contract) {
      (contract as InkContractAdapter).disconnect();
      setSubstrateAddress(null);
    }
    // EVM disconnect is handled by Wagmi
    toast.info('Disconnected from wallet');
  }, [walletType, contract]);

  // Switch wallet type
  const switchWalletType = useCallback((type: WalletType) => {
    setWalletType(type);
    setContract(null);
    setPendingTx(null);
    setError(null);
  }, []);

  // Compute connection state
  const isConnected = useMemo(() => {
    if (walletType === 'evm') {
      return evmConnected;
    } else if (walletType === 'ink') {
      return !!substrateAddress;
    }
    return false;
  }, [walletType, evmConnected, substrateAddress]);

  const address = useMemo(() => {
    if (walletType === 'evm') {
      return evmAddress || null;
    } else if (walletType === 'ink') {
      return substrateAddress;
    }
    return null;
  }, [walletType, evmAddress, substrateAddress]);

  return {
    contract,
    isConnected,
    isConnecting,
    address,
    walletType,
    isLoading,
    isSuccess,
    isError,
    error,
    pendingTx,
    connect,
    disconnect,
    switchWalletType,
  };
}

// Helper hook for tip operations
export function useTip() {
  const { contract, isConnected, walletType } = useUnifiedContract();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const sendTip = useCallback(
    async (builderId: bigint, amount: bigint, message: string) => {
      if (!contract || !isConnected) {
        toast.error('Please connect your wallet first');
        return null;
      }

      setIsLoading(true);
      setError(null);

      try {
        const result = await contract.tip(builderId, amount, message);
        
        toast.success(
          walletType === 'evm'
            ? `Tip sent! Transaction: ${result.hash.slice(0, 10)}...`
            : 'Tip sent successfully!'
        );
        
        return result;
      } catch (err) {
        const error = err as Error;
        setError(error);
        toast.error(`Failed to send tip: ${error.message}`);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [contract, isConnected, walletType]
  );

  return {
    sendTip,
    isLoading,
    error,
  };
}

// Helper hook for builder operations
export function useBuilder(builderId?: bigint) {
  const { contract } = useUnifiedContract();
  const [builder, setBuilder] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Fetch builder data
  const fetchBuilder = useCallback(
    async (id?: bigint) => {
      const targetId = id || builderId;
      if (!contract || !targetId) return;

      setIsLoading(true);
      setError(null);

      try {
        const data = await contract.getBuilder(targetId);
        setBuilder(data);
        return data;
      } catch (err) {
        const error = err as Error;
        setError(error);
        console.error('Failed to fetch builder:', error);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [contract, builderId]
  );

  // Register new builder
  const registerBuilder = useCallback(
    async (name: string, address: string) => {
      if (!contract) {
        toast.error('Contract not initialized');
        return null;
      }

      setIsLoading(true);
      setError(null);

      try {
        const result = await contract.registerBuilder(name, address);
        toast.success('Builder registered successfully!');
        return result;
      } catch (err) {
        const error = err as Error;
        setError(error);
        toast.error(`Failed to register builder: ${error.message}`);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [contract]
  );

  // Fetch on mount if builderId provided
  useEffect(() => {
    if (builderId && contract) {
      fetchBuilder();
    }
  }, [builderId, contract, fetchBuilder]);

  return {
    builder,
    isLoading,
    error,
    fetchBuilder,
    registerBuilder,
  };
}

// Helper hook for campaign operations  
export function useCampaign(campaignId?: bigint) {
  const { contract } = useUnifiedContract();
  const [campaign, setCampaign] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Fetch campaign data
  const fetchCampaign = useCallback(
    async (id?: bigint) => {
      const targetId = id || campaignId;
      if (!contract || !targetId) return;

      setIsLoading(true);
      setError(null);

      try {
        const data = await contract.getCampaign(targetId);
        setCampaign(data);
        return data;
      } catch (err) {
        const error = err as Error;
        setError(error);
        console.error('Failed to fetch campaign:', error);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [contract, campaignId]
  );

  // Create new campaign
  const createCampaign = useCallback(
    async (builderId: bigint, targetAmount: bigint, durationDays: number) => {
      if (!contract) {
        toast.error('Contract not initialized');
        return null;
      }

      setIsLoading(true);
      setError(null);

      try {
        const result = await contract.createCampaign(builderId, targetAmount, durationDays);
        toast.success('Campaign created successfully!');
        return result;
      } catch (err) {
        const error = err as Error;
        setError(error);
        toast.error(`Failed to create campaign: ${error.message}`);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [contract]
  );

  // Fetch on mount if campaignId provided
  useEffect(() => {
    if (campaignId && contract) {
      fetchCampaign();
    }
  }, [campaignId, contract, fetchCampaign]);

  return {
    campaign,
    isLoading,
    error,
    fetchCampaign,
    createCampaign,
  };
}
