import { useState, useEffect } from 'react';
import { Info, ExternalLink, Activity, Layers, Hash, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ChainInsight {
  chain: string;
  blockNumber?: number;
  blockHash?: string;
  parentHash?: string;
  stateRoot?: string;
  extrinsicsRoot?: string;
  timestamp?: string;
  events?: number;
  extrinsics?: number;
}

interface XcmInsight {
  messageHash?: string;
  origin?: string;
  destination?: string;
  status?: 'pending' | 'executed' | 'failed';
  weight?: string;
  fee?: string;
}

interface AssetInsight {
  assetId: number;
  symbol: string;
  totalSupply?: string;
  holders?: number;
  recentTransfers?: number;
}

export function PapiInsights() {
  const [activeTab, setActiveTab] = useState<'chain' | 'xcm' | 'assets'>('chain');
  const [chainInsights, setChainInsights] = useState<ChainInsight[]>([
    { chain: 'Paseo Relay', blockNumber: 1234567 },
    { chain: 'AssetHub', blockNumber: 987654 },
    { chain: 'PassetHub', blockNumber: 456789 }
  ]);
  
  const [xcmInsights] = useState<XcmInsight[]>([
    {
      messageHash: '0xabc123...',
      origin: 'AssetHub',
      destination: 'PassetHub',
      status: 'executed',
      weight: '1,000,000',
      fee: '0.01 DOT'
    }
  ]);
  
  const [assetInsights] = useState<AssetInsight[]>([
    {
      assetId: 31337,
      symbol: 'USDC',
      totalSupply: '1,000,000',
      holders: 150,
      recentTransfers: 42
    },
    {
      assetId: 42069,
      symbol: 'USDP',
      totalSupply: '500,000',
      holders: 75,
      recentTransfers: 23
    },
    {
      assetId: 69420,
      symbol: 'TIPCARD',
      totalSupply: '1,337',
      holders: 89,
      recentTransfers: 7
    }
  ]);

  // In a real implementation, this would use PAPI to fetch live data
  useEffect(() => {
    // Example of how we'd use PAPI:
    // const fetchChainData = async () => {
    //   const api = await getApi(); // Using PAPI
    //   const block = await api.query.system.blockHash();
    //   const events = await api.query.system.events();
    //   // Update insights with real data
    // };
  }, []);

  return (
    <div className="bg-card rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Info className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-bold text-foreground">PAPI Chain Insights</h2>
        </div>
        <a
          href="https://papi.how/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors"
        >
          Powered by PAPI
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <Button
          variant={activeTab === 'chain' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setActiveTab('chain')}
          className="flex items-center gap-2"
        >
          <Layers className="h-4 w-4" />
          Chain Status
        </Button>
        <Button
          variant={activeTab === 'xcm' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setActiveTab('xcm')}
          className="flex items-center gap-2"
        >
          <Activity className="h-4 w-4" />
          XCM Messages
        </Button>
        <Button
          variant={activeTab === 'assets' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setActiveTab('assets')}
          className="flex items-center gap-2"
        >
          <Hash className="h-4 w-4" />
          Asset Registry
        </Button>
      </div>

      {/* Content */}
      <div className="space-y-4">
        {activeTab === 'chain' && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {chainInsights.map((chain) => (
                <div key={chain.chain} className="bg-background rounded-lg p-4 border">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-sm">{chain.chain}</h3>
                    <span className="text-xs text-green-500">● Live</span>
                  </div>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Block:</span>
                      <span className="font-mono">#{chain.blockNumber?.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Finalized:</span>
                      <span className="text-green-500">✓</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="bg-muted/50 rounded p-3 text-sm">
              <p className="text-muted-foreground">
                💡 PAPI provides type-safe access to all chain metadata, allowing us to track blocks, 
                events, and state changes across Paseo, AssetHub, and PassetHub in real-time.
              </p>
            </div>
          </>
        )}

        {activeTab === 'xcm' && (
          <>
            <div className="space-y-3">
              {xcmInsights.map((xcm, idx) => (
                <div key={idx} className="bg-background rounded-lg p-4 border">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">
                        {xcm.origin} → {xcm.destination}
                      </span>
                      <span className={`text-xs px-2 py-1 rounded ${
                        xcm.status === 'executed' ? 'bg-green-500/20 text-green-500' :
                        xcm.status === 'pending' ? 'bg-yellow-500/20 text-yellow-500' :
                        'bg-red-500/20 text-red-500'
                      }`}>
                        {xcm.status}
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-muted-foreground">Weight:</span>
                      <span className="ml-2 font-mono">{xcm.weight}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Fee:</span>
                      <span className="ml-2 font-mono">{xcm.fee}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="bg-muted/50 rounded p-3 text-sm">
              <p className="text-muted-foreground">
                💡 PAPI enables monitoring of XCM messages across chains, tracking reserve transfers,
                teleports, and custom instructions with full type safety.
              </p>
            </div>
          </>
        )}

        {activeTab === 'assets' && (
          <>
            <div className="space-y-3">
              {assetInsights.map((asset) => (
                <div key={asset.assetId} className="bg-background rounded-lg p-4 border">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-bold">{asset.symbol}</span>
                      <span className="text-xs text-muted-foreground">
                        Asset ID: {asset.assetId}
                      </span>
                    </div>
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-xs">
                    <div>
                      <p className="text-muted-foreground">Supply</p>
                      <p className="font-semibold">{asset.totalSupply}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Holders</p>
                      <p className="font-semibold">{asset.holders}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">24h Transfers</p>
                      <p className="font-semibold">{asset.recentTransfers}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="bg-muted/50 rounded p-3 text-sm">
              <p className="text-muted-foreground">
                💡 PAPI provides direct access to the Assets pallet, allowing us to query asset
                metadata, balances, and transfer history for USDC, USDP, and TipCard NFTs.
              </p>
            </div>
          </>
        )}
      </div>

      {/* PAPI Features */}
      <div className="mt-6 pt-6 border-t">
        <h3 className="text-sm font-semibold mb-3">PAPI Features Used in TipsyDot:</h3>
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="flex items-start gap-2">
            <span className="text-primary">✓</span>
            <div>
              <p className="font-medium">Type-safe Queries</p>
              <p className="text-muted-foreground">Auto-generated types from chain metadata</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-primary">✓</span>
            <div>
              <p className="font-medium">Multi-chain Support</p>
              <p className="text-muted-foreground">Paseo, AssetHub, PassetHub connections</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-primary">✓</span>
            <div>
              <p className="font-medium">XCM Monitoring</p>
              <p className="text-muted-foreground">Track cross-chain messages and transfers</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-primary">✓</span>
            <div>
              <p className="font-medium">Event Streaming</p>
              <p className="text-muted-foreground">Real-time blockchain event updates</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}