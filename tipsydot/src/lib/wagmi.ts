import { createConfig, http } from 'wagmi';
import { localhost, mainnet } from 'wagmi/chains';
import { injected, metaMask } from 'wagmi/connectors';

// Custom chain for our local Anvil instance
export const anvilLocal = {
  id: 420420421,
  name: 'Anvil Local',
  nativeCurrency: {
    decimals: 18,
    name: 'Ether',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: { http: ['http://localhost:8545'] },
    public: { http: ['http://localhost:8545'] },
  },
  blockExplorers: {
    default: { name: 'Local Explorer', url: 'http://localhost:8545' },
  },
} as const;

export const wagmiConfig = createConfig({
  chains: [anvilLocal],
  connectors: [
    injected(),
    metaMask({
      shimDisconnect: true,
    }),
  ],
  transports: {
    [anvilLocal.id]: http('http://localhost:8545'),
  },
});