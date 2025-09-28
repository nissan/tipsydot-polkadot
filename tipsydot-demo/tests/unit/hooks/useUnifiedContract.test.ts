import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useUnifiedContract, useTip, useBuilder, useCampaign } from '@/hooks/useUnifiedContract';
import { WagmiProvider, createConfig } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';

// Mock wagmi hooks
vi.mock('wagmi', async () => {
  const actual = await vi.importActual('wagmi');
  return {
    ...actual,
    useAccount: vi.fn(() => ({
      address: undefined,
      isConnected: false,
    })),
    usePublicClient: vi.fn(() => null),
    useWalletClient: vi.fn(() => ({ data: null })),
  };
});

// Mock contract adapters
vi.mock('@/lib/contracts/ink-adapter', () => ({
  InkContractAdapter: vi.fn().mockImplementation(() => ({
    getBuilder: vi.fn().mockResolvedValue(null),
    getCampaign: vi.fn().mockResolvedValue(null),
    getTip: vi.fn().mockResolvedValue(null),
    getBalance: vi.fn().mockResolvedValue(0n),
    getProtocolFee: vi.fn().mockResolvedValue(100n),
    isPaused: vi.fn().mockResolvedValue(false),
    registerBuilder: vi.fn().mockResolvedValue({ hash: '0x123', status: 'success' }),
    tip: vi.fn().mockResolvedValue({ hash: '0x456', status: 'success' }),
    createCampaign: vi.fn().mockResolvedValue({ hash: '0x789', status: 'success' }),
    onTipSent: vi.fn(() => () => {}),
    onBuilderRegistered: vi.fn(() => () => {}),
    isConnected: vi.fn(() => false),
    getConnectedAddress: vi.fn(() => null),
    getChainId: vi.fn(() => 42),
    getContractAddress: vi.fn(() => '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY'),
    getContractType: vi.fn(() => 'ink'),
    connect: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn(),
  })),
}));

vi.mock('@/lib/contracts/evm-adapter', () => ({
  EVMContractAdapter: vi.fn().mockImplementation(() => ({
    getBuilder: vi.fn().mockResolvedValue(null),
    getCampaign: vi.fn().mockResolvedValue(null),
    getTip: vi.fn().mockResolvedValue(null),
    getBalance: vi.fn().mockResolvedValue(0n),
    getProtocolFee: vi.fn().mockResolvedValue(100n),
    isPaused: vi.fn().mockResolvedValue(false),
    registerBuilder: vi.fn().mockResolvedValue({ hash: '0xabc', status: 'success' }),
    tip: vi.fn().mockResolvedValue({ hash: '0xdef', status: 'success' }),
    createCampaign: vi.fn().mockResolvedValue({ hash: '0xghi', status: 'success' }),
    onTipSent: vi.fn(() => () => {}),
    onBuilderRegistered: vi.fn(() => () => {}),
    isConnected: vi.fn(() => false),
    getConnectedAddress: vi.fn(() => null),
    getChainId: vi.fn(() => 1),
    getContractAddress: vi.fn(() => '0x1234567890123456789012345678901234567890'),
    getContractType: vi.fn(() => 'evm'),
    setClients: vi.fn(),
  })),
}));

describe('useUnifiedContract', () => {
  const queryClient = new QueryClient();
  
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with null contract and not connected', () => {
    const { result } = renderHook(() => useUnifiedContract(), { wrapper });
    
    expect(result.current.contract).toBeNull();
    expect(result.current.isConnected).toBe(false);
    expect(result.current.walletType).toBeNull();
    expect(result.current.address).toBeNull();
  });

  it('should detect EVM wallet when connected', async () => {
    const { useAccount } = await import('wagmi');
    vi.mocked(useAccount).mockReturnValue({
      address: '0x1234567890123456789012345678901234567890',
      isConnected: true,
    } as any);

    const { result } = renderHook(() => useUnifiedContract(), { wrapper });
    
    await waitFor(() => {
      expect(result.current.walletType).toBe('evm');
    });
  });

  it('should detect Ink wallet when available', async () => {
    window.injectedWeb3 = {
      'polkadot-js': {
        enable: vi.fn(),
      },
    };

    const { result } = renderHook(() => useUnifiedContract(), { wrapper });
    
    await waitFor(() => {
      expect(result.current.walletType).toBe('ink');
    });
  });

  it('should switch wallet types', () => {
    const { result } = renderHook(() => useUnifiedContract(), { wrapper });
    
    act(() => {
      result.current.switchWalletType('evm');
    });
    
    expect(result.current.walletType).toBe('evm');
    
    act(() => {
      result.current.switchWalletType('ink');
    });
    
    expect(result.current.walletType).toBe('ink');
  });

  it('should handle connection for Ink wallet', async () => {
    // Mock Polkadot extension
    const mockAccounts = [
      { address: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY', meta: { name: 'Test' } },
    ];
    
    vi.mock('@polkadot/extension-dapp', () => ({
      web3Enable: vi.fn().mockResolvedValue([{ name: 'polkadot-js' }]),
      web3Accounts: vi.fn().mockResolvedValue(mockAccounts),
    }));

    const { result } = renderHook(() => useUnifiedContract({ contractType: 'ink' }), { wrapper });
    
    await act(async () => {
      await result.current.connect();
    });
    
    await waitFor(() => {
      expect(result.current.address).toBe(mockAccounts[0].address);
    });
  });
});

describe('useTip', () => {
  const queryClient = new QueryClient();
  
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should send tip successfully', async () => {
    const mockContract = {
      tip: vi.fn().mockResolvedValue({ hash: '0x123', status: 'success' }),
    };
    
    vi.mock('@/hooks/useUnifiedContract', async () => {
      const actual = await vi.importActual('@/hooks/useUnifiedContract');
      return {
        ...actual,
        useUnifiedContract: () => ({
          contract: mockContract,
          isConnected: true,
          walletType: 'evm',
        }),
      };
    });

    const { result } = renderHook(() => useTip(), { wrapper });
    
    let tipResult;
    await act(async () => {
      tipResult = await result.current.sendTip(1n, 1000000n, 'Test tip');
    });
    
    expect(tipResult).toEqual({ hash: '0x123', status: 'success' });
    expect(mockContract.tip).toHaveBeenCalledWith(1n, 1000000n, 'Test tip');
  });

  it('should handle tip error', async () => {
    const mockContract = {
      tip: vi.fn().mockRejectedValue(new Error('Insufficient balance')),
    };
    
    vi.mock('@/hooks/useUnifiedContract', async () => {
      const actual = await vi.importActual('@/hooks/useUnifiedContract');
      return {
        ...actual,
        useUnifiedContract: () => ({
          contract: mockContract,
          isConnected: true,
          walletType: 'evm',
        }),
      };
    });

    const { result } = renderHook(() => useTip(), { wrapper });
    
    let tipResult;
    await act(async () => {
      tipResult = await result.current.sendTip(1n, 1000000n, 'Test tip');
    });
    
    expect(tipResult).toBeNull();
    expect(result.current.error?.message).toBe('Insufficient balance');
  });
});

describe('useBuilder', () => {
  const queryClient = new QueryClient();
  
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch builder data', async () => {
    const mockBuilder = {
      id: 1n,
      address: '0x123',
      name: 'Test Builder',
      totalReceived: 1000000n,
      tipCount: 5n,
      isActive: true,
    };
    
    const mockContract = {
      getBuilder: vi.fn().mockResolvedValue(mockBuilder),
    };
    
    vi.mock('@/hooks/useUnifiedContract', async () => {
      const actual = await vi.importActual('@/hooks/useUnifiedContract');
      return {
        ...actual,
        useUnifiedContract: () => ({
          contract: mockContract,
          isConnected: true,
        }),
      };
    });

    const { result } = renderHook(() => useBuilder(1n), { wrapper });
    
    await waitFor(() => {
      expect(result.current.builder).toEqual(mockBuilder);
    });
    
    expect(mockContract.getBuilder).toHaveBeenCalledWith(1n);
  });

  it('should register new builder', async () => {
    const mockContract = {
      registerBuilder: vi.fn().mockResolvedValue({ hash: '0x123', status: 'success' }),
    };
    
    vi.mock('@/hooks/useUnifiedContract', async () => {
      const actual = await vi.importActual('@/hooks/useUnifiedContract');
      return {
        ...actual,
        useUnifiedContract: () => ({
          contract: mockContract,
          isConnected: true,
        }),
      };
    });

    const { result } = renderHook(() => useBuilder(), { wrapper });
    
    let registerResult;
    await act(async () => {
      registerResult = await result.current.registerBuilder('New Builder', '0x456');
    });
    
    expect(registerResult).toEqual({ hash: '0x123', status: 'success' });
    expect(mockContract.registerBuilder).toHaveBeenCalledWith('New Builder', '0x456');
  });
});

describe('useCampaign', () => {
  const queryClient = new QueryClient();
  
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch campaign data', async () => {
    const mockCampaign = {
      id: 1n,
      builderId: 1n,
      targetAmount: 1000000n,
      raisedAmount: 500000n,
      deadline: 1234567890,
      isActive: true,
    };
    
    const mockContract = {
      getCampaign: vi.fn().mockResolvedValue(mockCampaign),
    };
    
    vi.mock('@/hooks/useUnifiedContract', async () => {
      const actual = await vi.importActual('@/hooks/useUnifiedContract');
      return {
        ...actual,
        useUnifiedContract: () => ({
          contract: mockContract,
          isConnected: true,
        }),
      };
    });

    const { result } = renderHook(() => useCampaign(1n), { wrapper });
    
    await waitFor(() => {
      expect(result.current.campaign).toEqual(mockCampaign);
    });
    
    expect(mockContract.getCampaign).toHaveBeenCalledWith(1n);
  });

  it('should create new campaign', async () => {
    const mockContract = {
      createCampaign: vi.fn().mockResolvedValue({ hash: '0x789', status: 'success' }),
    };
    
    vi.mock('@/hooks/useUnifiedContract', async () => {
      const actual = await vi.importActual('@/hooks/useUnifiedContract');
      return {
        ...actual,
        useUnifiedContract: () => ({
          contract: mockContract,
          isConnected: true,
        }),
      };
    });

    const { result } = renderHook(() => useCampaign(), { wrapper });
    
    let createResult;
    await act(async () => {
      createResult = await result.current.createCampaign(1n, 1000000n, 30);
    });
    
    expect(createResult).toEqual({ hash: '0x789', status: 'success' });
    expect(mockContract.createCampaign).toHaveBeenCalledWith(1n, 1000000n, 30);
  });
});
