import { useState, useEffect } from 'react';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { wagmiConfig } from './lib/wagmi';
import { type WalletAccount } from './lib/wallet';
import WalletBar from './components/WalletBar';
import CreateCampaign from './components/CreateCampaign';
import CampaignView from './components/CampaignView';
import { XcmBridgeUI } from './components/XcmBridgeUI';
import { AnalyticsDashboard } from './components/AnalyticsDashboard';
import LandingPage from './components/landing/LandingPage';
import { PapiInsights } from './components/PapiInsights';
import { getApi } from './lib/api';
import { getNextCampaignId } from './lib/contractCalls';
import { ThemeToggle } from './components/ThemeToggle';
import { ActivitySheet, type OnChainActivity } from './components/ActivitySheet';
import { activityTracker } from './lib/activityTracker';
import './App.css';

const queryClient = new QueryClient();

function App() {
  // App state management
  const [showLanding, setShowLanding] = useState(true);
  const [selectedAccount, setSelectedAccount] = useState<WalletAccount | null>(null);
  const [chainInfo, setChainInfo] = useState<{ name: string; version: string } | null>(null);
  const [apiConnected, setApiConnected] = useState(false);
  const [activeTab, setActiveTab] = useState<'analytics' | 'papi' | 'bridge' | 'create' | 'view'>('analytics');
  const [selectedCampaignId, setSelectedCampaignId] = useState(0);
  const [nextCampaignId, setNextCampaignId] = useState(0);
  const [bridgedTxHash, setBridgedTxHash] = useState<string>('');
  const [activities, setActivities] = useState<OnChainActivity[]>([]);

  useEffect(() => {
    connectToChain();
    loadNextCampaignId();
    
    // Subscribe to activity updates
    const unsubscribe = activityTracker.subscribe(setActivities);
    return unsubscribe;
  }, []);

  const connectToChain = async () => {
    try {
      const api = await getApi();
      setApiConnected(true);
      setChainInfo({
        name: api.runtimeChain.toString(),
        version: api.runtimeVersion.toString()
      });
    } catch (err) {
      console.error('Failed to connect to chain:', err);
      setApiConnected(false);
    }
  };

  const loadNextCampaignId = async () => {
    try {
      if (!import.meta.env.VITE_TIPSY_ADDRESS) {
        setNextCampaignId(1); // Mock for demo
        return;
      }
      const id = await getNextCampaignId();
      setNextCampaignId(Number(id));
    } catch (error) {
      console.error('Error loading next campaign ID:', error);
    }
  };

  const handleCampaignCreated = () => {
    loadNextCampaignId();
    setSelectedCampaignId(nextCampaignId - 1);
    setActiveTab('view');
  };

  // Show landing page first, then main app after demo completion or direct navigation
  if (showLanding) {
    return (
      <WagmiProvider config={wagmiConfig}>
        <QueryClientProvider client={queryClient}>
          <LandingPage onExitLanding={() => setShowLanding(false)} />
        </QueryClientProvider>
      </WagmiProvider>
    );
  }

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
    <div className="min-h-screen bg-background">
      {/* Header with back to landing option */}
      <div className="bg-card border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <button
            onClick={() => setShowLanding(true)}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Back to Landing
          </button>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground">🍸 TipsyDot</h1>
            <p className="text-sm text-muted-foreground">Cross-Chain DeFi Platform</p>
          </div>
          <div className="flex items-center gap-3">
            <ActivitySheet activities={activities} />
            <ThemeToggle />
          </div>
        </div>
      </div>

      <WalletBar onAccountSelect={setSelectedAccount} />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Connection Status */}
        <div className="bg-card rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 text-foreground">Network Status</h2>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Chain:</span>
              <p className={`font-medium ${apiConnected ? 'text-green-600' : 'text-destructive'}`}>
                {apiConnected ? '✅ Connected' : '❌ Disconnected'}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">EVM RPC:</span>
              <p className="font-medium text-green-600">
                {import.meta.env.VITE_EVM_RPC?.includes('localhost') ? '✅ Local Anvil' : '✅ Testnet'}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Contract:</span>
              <p className={`font-medium ${import.meta.env.VITE_TIPSY_ADDRESS ? 'text-green-600' : 'text-yellow-600'}`}>
                {import.meta.env.VITE_TIPSY_ADDRESS ? '✅ Deployed' : '⚠️ Not deployed'}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Total Campaigns:</span>
              <p className="font-medium">{nextCampaignId}</p>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex space-x-4 mb-6 overflow-x-auto">
          <button
            onClick={() => setActiveTab('analytics')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
              activeTab === 'analytics'
                ? 'bg-primary text-primary-foreground'
                : 'bg-card text-card-foreground hover:bg-accent hover:text-accent-foreground'
            }`}
          >
            📊 Analytics
          </button>
          <button
            onClick={() => setActiveTab('papi')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
              activeTab === 'papi'
                ? 'bg-primary text-primary-foreground'
                : 'bg-card text-card-foreground hover:bg-accent hover:text-accent-foreground'
            }`}
          >
            🔗 PAPI Insights
          </button>
          <button
            onClick={() => setActiveTab('bridge')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
              activeTab === 'bridge'
                ? 'bg-primary text-primary-foreground'
                : 'bg-card text-card-foreground hover:bg-accent hover:text-accent-foreground'
            }`}
          >
            🌉 Bridge USDC
          </button>
          <button
            onClick={() => setActiveTab('view')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
              activeTab === 'view'
                ? 'bg-primary text-primary-foreground'
                : 'bg-card text-card-foreground hover:bg-accent hover:text-accent-foreground'
            }`}
          >
            View Campaigns
          </button>
          <button
            onClick={() => setActiveTab('create')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
              activeTab === 'create'
                ? 'bg-primary text-primary-foreground'
                : 'bg-card text-card-foreground hover:bg-accent hover:text-accent-foreground'
            }`}
          >
            Create Campaign
          </button>
        </div>

        {/* Main Content */}
        {activeTab === 'analytics' ? (
          <AnalyticsDashboard />
        ) : activeTab === 'papi' ? (
          <PapiInsights />
        ) : activeTab === 'bridge' ? (
          <div>
            <XcmBridgeUI 
              onBridgeComplete={(hash) => {
                setBridgedTxHash(hash);
                // Show success message
                alert(`✅ USDC bridged successfully! TX: ${hash.slice(0, 10)}...`);
              }}
            />
            {bridgedTxHash && (
              <div className="mt-4 p-4 bg-green-50 rounded-lg">
                <p className="text-green-700">
                  ✅ Last bridge transaction: {bridgedTxHash.slice(0, 20)}...
                </p>
                <p className="text-sm text-green-600 mt-2">
                  Your USDC should arrive on PassetHub shortly. You can now tip campaigns!
                </p>
              </div>
            )}
          </div>
        ) : activeTab === 'create' ? (
          <CreateCampaign onSuccess={handleCampaignCreated} />
        ) : (
          <div className="space-y-6">
            {nextCampaignId > 0 && (
              <div className="bg-white rounded-lg shadow p-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Campaign ID:
                </label>
                <div className="flex space-x-2">
                  <input
                    type="number"
                    min="0"
                    max={nextCampaignId - 1}
                    value={selectedCampaignId}
                    onChange={(e) => setSelectedCampaignId(Number(e.target.value))}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="py-2 px-3 text-gray-500">
                    (0 - {nextCampaignId - 1})
                  </span>
                </div>
              </div>
            )}

            {nextCampaignId > 0 ? (
              <CampaignView 
                campaignId={selectedCampaignId} 
                onRefresh={loadNextCampaignId}
              />
            ) : (
              <div className="bg-white rounded-lg shadow p-8 text-center">
                <p className="text-gray-500">No campaigns yet. Create the first one!</p>
              </div>
            )}
          </div>
        )}

        {/* Configuration Info */}
        <div className="mt-8 bg-gray-100 rounded-lg p-4 text-xs text-gray-600">
          <details>
            <summary className="cursor-pointer font-semibold">Contract Addresses</summary>
            <div className="mt-2 space-y-1 font-mono">
              <p>TipsyDot: {import.meta.env.VITE_TIPSY_ADDRESS || 'Not deployed'}</p>
              <p>USDC: {import.meta.env.VITE_USDC_PRECOMPILE || 'Not configured'}</p>
              <p>XCM Router: {import.meta.env.VITE_XCM_ROUTER || 'Not configured'}</p>
              <p>RPC: {import.meta.env.VITE_EVM_RPC}</p>
            </div>
          </details>
        </div>
      </main>
    </div>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

export default App;