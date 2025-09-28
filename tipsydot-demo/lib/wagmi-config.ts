import { createConfig, http } from "wagmi";
import { createClient, defineChain } from "viem";

// Native Polkadot EVM chain configuration
const evmRpcUrl = process.env.NEXT_PUBLIC_PASSETHUB_EVM_RPC || "http://127.0.0.1:8545";
const chainId = parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || "420420421");
const chainName = process.env.NEXT_PUBLIC_NETWORK_NAME || "Native Polkadot EVM";

export const nativePolkadotEVM = defineChain({
  id: chainId,
  name: chainName,
  nativeCurrency: {
    name: "Ether",
    symbol: "ETH",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: [evmRpcUrl],
    },
    public: {
      http: [evmRpcUrl],
    },
  },
  blockExplorers: {
    default: { name: chainName, url: evmRpcUrl },
  },
  testnet: true,
});

// Legacy Anvil configuration (kept for compatibility during transition)
export const anvilLocal = nativePolkadotEVM;

// Wagmi configuration
export const config = createConfig({
  chains: [nativePolkadotEVM],
  transports: {
    [nativePolkadotEVM.id]: http(evmRpcUrl),
  },
});

// Contract addresses (will be populated after deployment)
export const contracts = {
  mockUSDC: "0x0", // Will be updated after deployment
  usdcDonation: "0x0", // Will be updated after deployment
};

// Contract ABIs
export const MockUSDCABI = [
  "function balanceOf(address account) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function mint(address to, uint256 amount)",
] as const;

export const USDCDonationABI = [
  "function donate(uint256 builderId, uint256 amount)",
  "function getBuilder(uint256 builderId) view returns (string name, string project, string substrateAddress, uint256 totalReceived, bool active)",
  "function getAllBuilders() view returns (tuple(string name, string project, string substrateAddress, uint256 totalReceived, bool active)[])",
  "function builderCount() view returns (uint256)",
  "event DonationSent(address indexed donor, uint256 indexed builderId, uint256 amount, string substrateAddress, uint256 timestamp)",
] as const;

// Test wallets (Anvil pre-funded accounts)
export const testWallets = [
  {
    address: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266" as const,
    privateKey:
      "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
  },
  {
    address: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8" as const,
    privateKey:
      "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",
  },
  {
    address: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC" as const,
    privateKey:
      "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a",
  },
];

// Helper to load contract addresses from deployment
export async function loadDeployedContracts() {
  try {
    const deployments = await import("../deployment.json");
    contracts.mockUSDC = deployments.contracts.MockUSDC;
    contracts.usdcDonation = deployments.contracts.SimpleTipping;
    return contracts;
  } catch (error) {
    console.error("No deployment found. Run `pnpm deploy:contracts` first.");
    // Use deployed addresses from our latest deployment
    contracts.mockUSDC = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
    contracts.usdcDonation = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";
    return contracts;
  }
}
