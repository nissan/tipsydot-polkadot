import { ApiPromise, WsProvider } from "@polkadot/api";

// AssetHub configuration - uses environment variables or fallback to local
const ASSETHUB_WS = process.env.NEXT_PUBLIC_ASSETHUB_WS || "ws://127.0.0.1:8000";
const USDC_ASSET_ID = parseInt(process.env.NEXT_PUBLIC_USDC_ASSET_ID || "1337");

export interface ChainInfo {
  chain: string;
  blockNumber: number;
  blockHash: string;
}

export interface USDCTransfer {
  from: string;
  to: string;
  amount: bigint;
  blockNumber: number;
  timestamp: Date;
}

class PapiMonitor {
  private api: ApiPromise | null = null;
  private listeners: Set<(info: ChainInfo) => void> = new Set();
  private transferListeners: Set<(transfer: USDCTransfer) => void> = new Set();
  private unsubscribe: (() => void) | null = null;

  async connect(): Promise<void> {
    if (this.api) return;

    console.log("🔗 Connecting to AssetHub fork...");
    const provider = new WsProvider(ASSETHUB_WS);
    this.api = await ApiPromise.create({ provider });

    const chain = await this.api.rpc.system.chain();
    console.log(`✅ Connected to ${chain.toHuman()}`);

    // Subscribe to new blocks
    this.subscribeToBlocks();
  }

  private async subscribeToBlocks() {
    if (!this.api) return;

    this.unsubscribe = await this.api.rpc.chain.subscribeNewHeads((header) => {
      const info: ChainInfo = {
        chain: "AssetHub",
        blockNumber: header.number.toNumber(),
        blockHash: header.hash.toHex(),
      };

      // Notify all listeners
      this.listeners.forEach((listener) => listener(info));

      // Check for USDC transfers in this block
      this.checkForTransfers(header.number.toNumber());
    });
  }

  private async checkForTransfers(blockNumber: number) {
    if (!this.api) return;

    try {
      // Get block hash
      const blockHash = await this.api.rpc.chain.getBlockHash(blockNumber);
      const signedBlock = await this.api.rpc.chain.getBlock(blockHash);

      // Look for asset transfer events
      const apiAt = await this.api.at(blockHash);
      const events = await apiAt.query.system.events();

      events.forEach((record) => {
        const { event } = record;

        // Check for asset transfer events
        if (event.section === "assets" && event.method === "Transferred") {
          const [assetId, from, to, amount] = event.data;

          if (assetId.toString() === USDC_ASSET_ID.toString()) {
            const transfer: USDCTransfer = {
              from: from.toString(),
              to: to.toString(),
              amount: BigInt(amount.toString()),
              blockNumber,
              timestamp: new Date(),
            };

            // Notify transfer listeners
            this.transferListeners.forEach((listener) => listener(transfer));
          }
        }
      });
    } catch (error) {
      console.error("Error checking transfers:", error);
    }
  }

  async getUSDCBalance(address: string): Promise<bigint> {
    if (!this.api) throw new Error("Not connected");

    const balance = await this.api.query.assets.account(USDC_ASSET_ID, address);
    if (balance.isNone) return 0n;

    return BigInt(balance.unwrap().balance.toString());
  }

  async getChainInfo(): Promise<ChainInfo> {
    if (!this.api) throw new Error("Not connected");

    const [chain, header] = await Promise.all([
      this.api.rpc.system.chain(),
      this.api.rpc.chain.getHeader(),
    ]);

    return {
      chain: chain.toHuman() as string,
      blockNumber: header.number.toNumber(),
      blockHash: header.hash.toHex(),
    };
  }

  onNewBlock(callback: (info: ChainInfo) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  onUSDCTransfer(callback: (transfer: USDCTransfer) => void): () => void {
    this.transferListeners.add(callback);
    return () => this.transferListeners.delete(callback);
  }

  async disconnect(): Promise<void> {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }

    if (this.api) {
      await this.api.disconnect();
      this.api = null;
    }

    this.listeners.clear();
    this.transferListeners.clear();
  }
}

// Singleton instance
export const papiMonitor = new PapiMonitor();

// Helper functions
export function formatUSDC(amount: bigint): string {
  const decimals = 6;
  const divisor = BigInt(10 ** decimals);
  const whole = amount / divisor;
  const fraction = amount % divisor;

  return `${whole}.${fraction.toString().padStart(decimals, "0")} USDC`;
}

export function truncateAddress(address: string): string {
  if (address.length <= 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
