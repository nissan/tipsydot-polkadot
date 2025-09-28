import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock window.ethereum for MetaMask tests
global.window.ethereum = {
  isMetaMask: false,
  request: vi.fn(),
  on: vi.fn(),
  removeListener: vi.fn(),
};

// Mock Polkadot extension
global.window.injectedWeb3 = {};

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));
