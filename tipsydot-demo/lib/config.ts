/**
 * Unified configuration for all environments
 * Supports local (OmniNode + Chopsticks), testnet (Paseo), and production (Polkadot)
 */

export type NetworkMode = "local" | "testnet" | "production";

interface ChainConfig {
  name: string;
  rpcUrl: string;
  wsUrl: string;
  chainId: number;
  paraId: number;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
}

interface AssetConfig {
  usdcAssetId: number;
  usdcDecimals: number;
  usdcSymbol: string;
}

interface PrecompileAddresses {
  assets: `0x${string}`;
  xcm: `0x${string}`;
  balance: `0x${string}`;
}

interface NetworkConfig {
  mode: NetworkMode;
  evmChain: ChainConfig;
  assetHub: {
    name: string;
    wsUrl: string;
    paraId: number;
  };
  assets: AssetConfig;
  precompiles: PrecompileAddresses;
  contracts: {
    donation?: `0x${string}`;
    mockUsdc?: `0x${string}`;
  };
  features: {
    enableSwap: boolean;
    enableLiquidityPools: boolean;
    enableRealXcm: boolean;
    enablePapiMonitor: boolean;
  };
}

// Get current network mode from environment
const getNetworkMode = (): NetworkMode => {
  const mode = process.env.NEXT_PUBLIC_NETWORK_MODE || "local";
  if (!["local", "testnet", "production"].includes(mode)) {
    console.warn(`Invalid network mode: ${mode}, falling back to local`);
    return "local";
  }
  return mode as NetworkMode;
};

// Local configuration (OmniNode + Chopsticks)
const localConfig: NetworkConfig = {
  mode: "local",
  evmChain: {
    name: "OmniNode Local",
    rpcUrl: process.env.NEXT_PUBLIC_LOCAL_EVM_RPC || "http://localhost:8546",
    wsUrl: process.env.NEXT_PUBLIC_LOCAL_EVM_WS || "ws://localhost:9945",
    chainId: parseInt(
      process.env.NEXT_PUBLIC_LOCAL_EVM_CHAIN_ID || "420420421",
    ),
    paraId: parseInt(process.env.NEXT_PUBLIC_LOCAL_EVM_PARA_ID || "2000"),
    nativeCurrency: {
      name: "TipsyDot Token",
      symbol: "TDOT",
      decimals: 18,
    },
  },
  assetHub: {
    name: "Chopsticks AssetHub",
    wsUrl: process.env.NEXT_PUBLIC_LOCAL_ASSETHUB_WS || "ws://localhost:8000",
    paraId: parseInt(process.env.NEXT_PUBLIC_LOCAL_ASSETHUB_PARA_ID || "1000"),
  },
  assets: {
    usdcAssetId: parseInt(
      process.env.NEXT_PUBLIC_LOCAL_USDC_ASSET_ID || "1337",
    ),
    usdcDecimals: 6,
    usdcSymbol: "USDC",
  },
  precompiles: {
    assets: (process.env.NEXT_PUBLIC_ASSETS_PRECOMPILE ||
      "0x0000000000000000000000000000000000000802") as `0x${string}`,
    xcm: (process.env.NEXT_PUBLIC_XCM_PRECOMPILE ||
      "0x0000000000000000000000000000000000000803") as `0x${string}`,
    balance: (process.env.NEXT_PUBLIC_BALANCE_PRECOMPILE ||
      "0x0000000000000000000000000000000000000801") as `0x${string}`,
  },
  contracts: {
    donation: process.env.NEXT_PUBLIC_DONATION_CONTRACT as
      | `0x${string}`
      | undefined,
    mockUsdc: process.env.NEXT_PUBLIC_MOCK_USDC_CONTRACT as
      | `0x${string}`
      | undefined,
  },
  features: {
    enableSwap: false,
    enableLiquidityPools: false,
    enableRealXcm: true,
    enablePapiMonitor: true,
  },
};

// Testnet configuration (Paseo)
const testnetConfig: NetworkConfig = {
  mode: "testnet",
  evmChain: {
    name: "Moonriver Alpha",
    rpcUrl:
      process.env.NEXT_PUBLIC_TESTNET_EVM_RPC ||
      "https://moonriver-alpha.api.onfinality.io/public",
    wsUrl:
      process.env.NEXT_PUBLIC_TESTNET_EVM_WS ||
      "wss://moonriver-alpha.api.onfinality.io/public-ws",
    chainId: parseInt(process.env.NEXT_PUBLIC_TESTNET_EVM_CHAIN_ID || "1285"),
    paraId: parseInt(process.env.NEXT_PUBLIC_TESTNET_EVM_PARA_ID || "2023"),
    nativeCurrency: {
      name: "Moonriver",
      symbol: "MOVR",
      decimals: 18,
    },
  },
  assetHub: {
    name: "Paseo AssetHub",
    wsUrl:
      process.env.NEXT_PUBLIC_TESTNET_ASSETHUB_WS ||
      "wss://paseo-asset-hub-rpc.dwellir.com",
    paraId: parseInt(
      process.env.NEXT_PUBLIC_TESTNET_ASSETHUB_PARA_ID || "1000",
    ),
  },
  assets: {
    usdcAssetId: parseInt(
      process.env.NEXT_PUBLIC_TESTNET_USDC_ASSET_ID || "1337",
    ),
    usdcDecimals: 6,
    usdcSymbol: "USDC",
  },
  precompiles: {
    assets: (process.env.NEXT_PUBLIC_ASSETS_PRECOMPILE ||
      "0x0000000000000000000000000000000000000802") as `0x${string}`,
    xcm: (process.env.NEXT_PUBLIC_XCM_PRECOMPILE ||
      "0x0000000000000000000000000000000000000803") as `0x${string}`,
    balance: (process.env.NEXT_PUBLIC_BALANCE_PRECOMPILE ||
      "0x0000000000000000000000000000000000000801") as `0x${string}`,
  },
  contracts: {
    donation: process.env.NEXT_PUBLIC_DONATION_CONTRACT as
      | `0x${string}`
      | undefined,
    mockUsdc: undefined, // No mock on testnet
  },
  features: {
    enableSwap: process.env.NEXT_PUBLIC_ENABLE_SWAP === "true",
    enableLiquidityPools:
      process.env.NEXT_PUBLIC_ENABLE_LIQUIDITY_POOLS === "true",
    enableRealXcm: true,
    enablePapiMonitor: true,
  },
};

// Production configuration (Polkadot)
const productionConfig: NetworkConfig = {
  mode: "production",
  evmChain: {
    name: "Moonbeam",
    rpcUrl:
      process.env.NEXT_PUBLIC_PROD_EVM_RPC ||
      "https://rpc.api.moonbeam.network",
    wsUrl:
      process.env.NEXT_PUBLIC_PROD_EVM_WS || "wss://wss.api.moonbeam.network",
    chainId: parseInt(process.env.NEXT_PUBLIC_PROD_EVM_CHAIN_ID || "1284"),
    paraId: parseInt(process.env.NEXT_PUBLIC_PROD_EVM_PARA_ID || "2004"),
    nativeCurrency: {
      name: "Glimmer",
      symbol: "GLMR",
      decimals: 18,
    },
  },
  assetHub: {
    name: "Polkadot AssetHub",
    wsUrl:
      process.env.NEXT_PUBLIC_PROD_ASSETHUB_WS ||
      "wss://polkadot-asset-hub-rpc.dwellir.com",
    paraId: parseInt(process.env.NEXT_PUBLIC_PROD_ASSETHUB_PARA_ID || "1000"),
  },
  assets: {
    usdcAssetId: parseInt(process.env.NEXT_PUBLIC_PROD_USDC_ASSET_ID || "1984"),
    usdcDecimals: 6,
    usdcSymbol: "USDC",
  },
  precompiles: {
    assets: (process.env.NEXT_PUBLIC_ASSETS_PRECOMPILE ||
      "0x0000000000000000000000000000000000000802") as `0x${string}`,
    xcm: (process.env.NEXT_PUBLIC_XCM_PRECOMPILE ||
      "0x0000000000000000000000000000000000000803") as `0x${string}`,
    balance: (process.env.NEXT_PUBLIC_BALANCE_PRECOMPILE ||
      "0x0000000000000000000000000000000000000801") as `0x${string}`,
  },
  contracts: {
    donation: process.env.NEXT_PUBLIC_DONATION_CONTRACT as
      | `0x${string}`
      | undefined,
    mockUsdc: undefined, // No mock in production
  },
  features: {
    enableSwap: true,
    enableLiquidityPools: true,
    enableRealXcm: true,
    enablePapiMonitor: true,
  },
};

// Configuration map
const configs: Record<NetworkMode, NetworkConfig> = {
  local: localConfig,
  testnet: testnetConfig,
  production: productionConfig,
};

// Export the current configuration based on environment
export const config = configs[getNetworkMode()];

// Helper functions
export const isLocalMode = () => config.mode === "local";
export const isTestnetMode = () => config.mode === "testnet";
export const isProductionMode = () => config.mode === "production";

// Get explorer URLs
export function getExplorerUrl(txHash: string): string {
  switch (config.mode) {
    case "local":
      return `http://localhost:8545/tx/${txHash}`;
    case "testnet":
      return `https://paseo.subscan.io/extrinsic/${txHash}`;
    case "production":
      return `https://polkadot.subscan.io/extrinsic/${txHash}`;
    default:
      return "#";
  }
}

// Get faucet URL for testnet
export function getFaucetUrl(): string | null {
  if (config.mode === "testnet") {
    return "https://faucet.paseo.network";
  }
  return null;
}

// Export types
export type { NetworkConfig, ChainConfig, AssetConfig, PrecompileAddresses };
