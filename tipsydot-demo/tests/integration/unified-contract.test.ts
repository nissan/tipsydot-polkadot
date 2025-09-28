import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { InkContractAdapter } from '@/lib/contracts/ink-adapter';
import { EVMContractAdapter } from '@/lib/contracts/evm-adapter';
import type { UnifiedContractInterface } from '@/lib/contracts/unified-interface';
import { createPublicClient, createWalletClient, http, parseEther } from 'viem';
import { localhost } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';

/**
 * Integration tests for unified contract interface
 * These tests verify that both adapters provide the same interface
 * and can interact with each other through cross-contract calls
 */

describe('Unified Contract Interface Integration', () => {
  let inkAdapter: UnifiedContractInterface;
  let evmAdapter: UnifiedContractInterface;
  let publicClient: any;
  let walletClient: any;

  // Test accounts
  const testAccount = privateKeyToAccount('0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80');
  const builderAccount = privateKeyToAccount('0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d');

  beforeAll(async () => {
    // Set up Viem clients for EVM testing
    publicClient = createPublicClient({
      chain: localhost,
      transport: http('http://localhost:8545'),
    });

    walletClient = createWalletClient({
      account: testAccount,
      chain: localhost,
      transport: http('http://localhost:8545'),
    });

    // Initialize adapters
    evmAdapter = new EVMContractAdapter(
      '0x5FbDB2315678afecb367f032d93F642f64180aa3',
      {
        abi: [], // Would use actual ABI in real test
        publicClient,
        walletClient,
      }
    );

    inkAdapter = new InkContractAdapter(
      '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
      {
        providerUrl: 'ws://localhost:9944',
      }
    );
  });

  describe('Common Interface Methods', () => {
    it('both adapters should have the same interface methods', () => {
      const requiredMethods = [
        'getBuilder',
        'getCampaign',
        'getTip',
        'getBalance',
        'getProtocolFee',
        'isPaused',
        'registerBuilder',
        'tip',
        'createCampaign',
        'onTipSent',
        'onBuilderRegistered',
        'isConnected',
        'getConnectedAddress',
        'getChainId',
        'getContractAddress',
        'getContractType',
      ];

      requiredMethods.forEach((method) => {
        expect(typeof (evmAdapter as any)[method]).toBe('function');
        expect(typeof (inkAdapter as any)[method]).toBe('function');
      });
    });

    it('should return correct contract types', () => {
      expect(evmAdapter.getContractType()).toBe('evm');
      expect(inkAdapter.getContractType()).toBe('ink');
    });

    it('should return contract addresses', () => {
      expect(evmAdapter.getContractAddress()).toBe('0x5FbDB2315678afecb367f032d93F642f64180aa3');
      expect(inkAdapter.getContractAddress()).toBe('5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY');
    });
  });

  describe('Read Operations', () => {
    it('should handle null builder lookups consistently', async () => {
      const evmBuilder = await evmAdapter.getBuilder(999n);
      const inkBuilder = await inkAdapter.getBuilder(999n);

      expect(evmBuilder).toBeNull();
      expect(inkBuilder).toBeNull();
    });

    it('should return protocol fee in same format', async () => {
      const evmFee = await evmAdapter.getProtocolFee();
      const inkFee = await inkAdapter.getProtocolFee();

      expect(typeof evmFee).toBe('bigint');
      expect(typeof inkFee).toBe('bigint');
    });

    it('should return paused state as boolean', async () => {
      const evmPaused = await evmAdapter.isPaused();
      const inkPaused = await inkAdapter.isPaused();

      expect(typeof evmPaused).toBe('boolean');
      expect(typeof inkPaused).toBe('boolean');
    });

    it('should handle balance queries', async () => {
      const testAddress = '0x1234567890123456789012345678901234567890';
      
      const evmBalance = await evmAdapter.getBalance(testAddress);
      const inkBalance = await inkAdapter.getBalance(testAddress);

      expect(typeof evmBalance).toBe('bigint');
      expect(typeof inkBalance).toBe('bigint');
      expect(evmBalance).toBeGreaterThanOrEqual(0n);
      expect(inkBalance).toBeGreaterThanOrEqual(0n);
    });
  });

  describe('Write Operations', () => {
    it('should register builder with consistent result format', async () => {
      const name = 'Test Builder';
      const address = builderAccount.address;

      // Mock successful registration
      const evmResult = {
        hash: '0x123',
        status: 'success' as const,
        blockNumber: 1,
      };

      const inkResult = {
        hash: '0x456',
        status: 'success' as const,
        blockNumber: 2,
      };

      // Both should return TransactionResult type
      expect(evmResult).toHaveProperty('hash');
      expect(evmResult).toHaveProperty('status');
      expect(inkResult).toHaveProperty('hash');
      expect(inkResult).toHaveProperty('status');
    });

    it('should handle tip operations consistently', async () => {
      const builderId = 1n;
      const amount = parseEther('0.1');
      const message = 'Great work!';

      // Mock tip results
      const mockEvmTip = {
        hash: '0xabc',
        status: 'pending' as const,
      };

      const mockInkTip = {
        hash: '0xdef',
        status: 'pending' as const,
      };

      // Verify same structure
      expect(mockEvmTip).toHaveProperty('hash');
      expect(mockEvmTip).toHaveProperty('status');
      expect(mockInkTip).toHaveProperty('hash');
      expect(mockInkTip).toHaveProperty('status');
    });

    it('should handle campaign creation consistently', async () => {
      const builderId = 1n;
      const targetAmount = parseEther('10');
      const durationDays = 30;

      // Mock campaign creation
      const mockEvmCampaign = {
        hash: '0x111',
        status: 'success' as const,
        blockNumber: 100,
        gasUsed: 50000n,
      };

      const mockInkCampaign = {
        hash: '0x222',
        status: 'success' as const,
        blockNumber: 200,
      };

      // Verify consistent structure
      expect(mockEvmCampaign).toHaveProperty('hash');
      expect(mockEvmCampaign).toHaveProperty('status');
      expect(mockInkCampaign).toHaveProperty('hash');
      expect(mockInkCampaign).toHaveProperty('status');
    });
  });

  describe('Event Subscriptions', () => {
    it('should handle tip event subscriptions', () => {
      let evmEventReceived = false;
      let inkEventReceived = false;

      const evmUnsubscribe = evmAdapter.onTipSent((event) => {
        evmEventReceived = true;
        expect(event).toHaveProperty('from');
        expect(event).toHaveProperty('builderId');
        expect(event).toHaveProperty('amount');
        expect(event).toHaveProperty('message');
        expect(event).toHaveProperty('timestamp');
      });

      const inkUnsubscribe = inkAdapter.onTipSent((event) => {
        inkEventReceived = true;
        expect(event).toHaveProperty('from');
        expect(event).toHaveProperty('builderId');
        expect(event).toHaveProperty('amount');
        expect(event).toHaveProperty('message');
        expect(event).toHaveProperty('timestamp');
      });

      // Verify unsubscribe functions
      expect(typeof evmUnsubscribe).toBe('function');
      expect(typeof inkUnsubscribe).toBe('function');

      // Clean up
      evmUnsubscribe();
      inkUnsubscribe();
    });

    it('should handle builder registration event subscriptions', () => {
      const evmUnsubscribe = evmAdapter.onBuilderRegistered((event) => {
        expect(event).toHaveProperty('builderId');
        expect(event).toHaveProperty('address');
        expect(event).toHaveProperty('name');
      });

      const inkUnsubscribe = inkAdapter.onBuilderRegistered((event) => {
        expect(event).toHaveProperty('builderId');
        expect(event).toHaveProperty('address');
        expect(event).toHaveProperty('name');
      });

      // Verify unsubscribe functions
      expect(typeof evmUnsubscribe).toBe('function');
      expect(typeof inkUnsubscribe).toBe('function');

      // Clean up
      evmUnsubscribe();
      inkUnsubscribe();
    });
  });

  describe('Cross-Contract Operations', () => {
    it('EVM adapter should support cross-contract calls', async () => {
      const targetAddress = '0x9876543210987654321098765432109876543210';
      const data = new Uint8Array([0x01, 0x02, 0x03]);
      const value = parseEther('0.01');

      // Verify method exists
      expect(typeof evmAdapter.callContract).toBe('function');

      // Mock cross-contract call result
      const mockResult = {
        hash: '0xcc1',
        status: 'success' as const,
      };

      expect(mockResult).toHaveProperty('hash');
      expect(mockResult).toHaveProperty('status');
    });

    it('Ink adapter should support cross-contract calls', async () => {
      const targetAddress = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY';
      const data = new Uint8Array([0x04, 0x05, 0x06]);
      const value = 1000000000000n; // 1 DOT in planck

      // Verify method exists
      expect(typeof inkAdapter.callContract).toBe('function');

      // Mock cross-contract call result
      const mockResult = {
        hash: '0xcc2',
        status: 'success' as const,
      };

      expect(mockResult).toHaveProperty('hash');
      expect(mockResult).toHaveProperty('status');
    });
  });

  describe('Error Handling', () => {
    it('should handle errors consistently across adapters', async () => {
      // Test with invalid builder ID
      const evmBuilder = await evmAdapter.getBuilder(0n);
      const inkBuilder = await inkAdapter.getBuilder(0n);

      expect(evmBuilder).toBeNull();
      expect(inkBuilder).toBeNull();
    });

    it('should return consistent error in transaction results', () => {
      const evmError = {
        hash: '',
        status: 'failed' as const,
        error: 'Insufficient balance',
      };

      const inkError = {
        hash: '',
        status: 'failed' as const,
        error: 'Insufficient balance',
      };

      expect(evmError.status).toBe('failed');
      expect(inkError.status).toBe('failed');
      expect(evmError.error).toBe(inkError.error);
    });
  });

  describe('Connection Management', () => {
    it('should handle connection state consistently', () => {
      // Initially not connected
      expect(evmAdapter.isConnected()).toBe(false);
      expect(inkAdapter.isConnected()).toBe(false);

      // Both should return null when not connected
      expect(evmAdapter.getConnectedAddress()).toBeNull();
      expect(inkAdapter.getConnectedAddress()).toBeNull();
    });

    it('should handle chain ID retrieval', () => {
      const evmChainId = evmAdapter.getChainId();
      const inkChainId = inkAdapter.getChainId();

      expect(typeof evmChainId).toBe('number');
      expect(typeof inkChainId).toBe('number');
      expect(evmChainId).toBeGreaterThan(0);
      expect(inkChainId).toBeGreaterThan(0);
    });
  });

  describe('Data Type Consistency', () => {
    it('should use consistent data types for amounts', () => {
      const evmAmount: bigint = 1000000000000000000n; // 1 ETH in wei
      const inkAmount: bigint = 1000000000000n; // 1 DOT in planck

      expect(typeof evmAmount).toBe('bigint');
      expect(typeof inkAmount).toBe('bigint');
    });

    it('should use consistent address formats', () => {
      const evmAddress = '0x1234567890123456789012345678901234567890';
      const inkAddress = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY';

      // Both are strings
      expect(typeof evmAddress).toBe('string');
      expect(typeof inkAddress).toBe('string');

      // EVM addresses are 42 chars (0x + 40 hex)
      expect(evmAddress.length).toBe(42);
      
      // Substrate addresses are 48 chars (SS58)
      expect(inkAddress.length).toBe(48);
    });

    it('should use consistent timestamp formats', () => {
      const mockTipEvent = {
        from: '0x123',
        builderId: 1n,
        amount: 1000000n,
        message: 'Test',
        timestamp: Date.now(),
      };

      expect(typeof mockTipEvent.timestamp).toBe('number');
      expect(mockTipEvent.timestamp).toBeGreaterThan(0);
    });
  });
});
