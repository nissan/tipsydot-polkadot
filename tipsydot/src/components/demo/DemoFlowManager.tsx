import { useState, useEffect } from 'react';
import Joyride, { STATUS, CallBackProps, Step } from 'react-joyride';
import { motion } from 'framer-motion';
import { X, User, Building, Wallet, ArrowLeft } from 'lucide-react';
import { DEMO_ACCOUNTS, POLKADOT_ACCOUNTS } from '../../lib/demoAccounts';
import SimpleDemoFlow from './SimpleDemoFlow';

type DemoType = 'tipper' | 'creator' | 'wallet';

interface DemoFlowManagerProps {
  demoType: DemoType;
  onClose: () => void;
  onComplete: () => void;
}

export default function DemoFlowManager({ demoType, onClose, onComplete }: DemoFlowManagerProps) {
  const [runTour, setRunTour] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [demoAccount, setDemoAccount] = useState<typeof DEMO_ACCOUNTS.ALICE | null>(null);

  // Use SimpleDemoFlow for wallet connection demo
  if (demoType === 'wallet') {
    return <SimpleDemoFlow onClose={onClose} onComplete={onComplete} />;
  }

  // Define tour steps based on demo type
  const getTourSteps = (): Step[] => {
    switch (demoType) {
      case 'tipper':
        return [
          {
            target: '.demo-account-info',
            content: (
              <div>
                <h3 className="text-lg font-semibold mb-2">Welcome to TipsyDot!</h3>
                <p className="mb-3">You're using Alice's pre-funded demo account. This account has test tokens ready for the full tipping experience.</p>
                <div className="text-sm bg-gray-100 dark:bg-gray-800 p-2 rounded">
                  <strong>Demo Account:</strong> Alice<br/>
                  <strong>Address:</strong> {DEMO_ACCOUNTS.ALICE.address.slice(0, 10)}...<br/>
                  <strong>Balance:</strong> {DEMO_ACCOUNTS.ALICE.balance}
                </div>
              </div>
            ),
            placement: 'bottom'
          },
          {
            target: '.faucet-section',
            content: 'Step 1: Get test tokens from the faucet. These will be used to swap for USDP stablecoins.',
            placement: 'top'
          },
          {
            target: '.swap-section', 
            content: 'Step 2: Swap your faucet tokens for USDP stablecoins. USDP is our custom stablecoin (Asset ID: 42069).',
            placement: 'top'
          },
          {
            target: '.parachain-list',
            content: 'Step 3: Browse available parachains and choose one to support with a tip.',
            placement: 'top'
          },
          {
            target: '.tip-section',
            content: 'Step 4: Send your tip with a personal message. A 0.1% protocol fee supports the treasury.',
            placement: 'top'
          },
          {
            target: '.nft-rewards',
            content: 'Step 5: Earn a unique NFT reward card! Traits are generated based on your tip amount and blockchain data.',
            placement: 'top'
          },
          {
            target: '.bridge-section',
            content: 'Step 6: Use XCM reserve transfer to bridge your assets to AssetHub for cross-chain functionality.',
            placement: 'top'
          }
        ];

      case 'creator':
        return [
          {
            target: '.demo-account-info',
            content: (
              <div>
                <h3 className="text-lg font-semibold mb-2">Parachain Creator Flow</h3>
                <p className="mb-3">You're using Bob's account to represent a parachain project seeking community support.</p>
                <div className="text-sm bg-gray-100 dark:bg-gray-800 p-2 rounded">
                  <strong>Demo Account:</strong> Bob (Parachain Creator)<br/>
                  <strong>EVM Address:</strong> {DEMO_ACCOUNTS.BOB.address.slice(0, 10)}...<br/>
                  <strong>Substrate:</strong> {POLKADOT_ACCOUNTS.BOB.address.slice(0, 10)}...
                </div>
              </div>
            ),
            placement: 'bottom'
          },
          {
            target: '.register-parachain',
            content: 'Step 1: Register your parachain project with details like name, description, and receiving address.',
            placement: 'top'
          },
          {
            target: '.verification-section',
            content: 'Step 2: Wait for verification from the TipsyDot team to ensure legitimacy.',
            placement: 'top'
          },
          {
            target: '.receive-tips',
            content: 'Step 3: Start receiving tips from supporters across the Polkadot ecosystem!',
            placement: 'top'
          },
          {
            target: '.withdraw-funds',
            content: 'Step 4: Withdraw accumulated tips to your parachain treasury using XCM transfers.',
            placement: 'top'
          }
        ];

      case 'wallet':
        return [
          {
            target: '.connect-metamask',
            content: 'Step 1: Connect your MetaMask wallet for EVM interactions on PassetHub.',
            placement: 'bottom'
          },
          {
            target: '.connect-polkadot',
            content: 'Step 2: Connect your Polkadot.js extension for Substrate interactions.',
            placement: 'bottom'
          },
          {
            target: '.account-verification',
            content: 'Step 3: We\'ll help you verify and link your accounts for cross-chain functionality.',
            placement: 'top'
          },
          {
            target: '.full-platform',
            content: 'Step 4: Access the full TipsyDot platform with your own assets and NFT collection!',
            placement: 'top'
          }
        ];

      default:
        return [];
    }
  };

  useEffect(() => {
    // Set demo account based on type
    if (demoType === 'tipper') {
      setDemoAccount(DEMO_ACCOUNTS.ALICE);
    } else if (demoType === 'creator') {
      setDemoAccount(DEMO_ACCOUNTS.BOB);
    }

    // Start the tour after a brief delay
    setTimeout(() => {
      setRunTour(true);
    }, 500);
  }, [demoType]);

  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status, action, index } = data;
    
    if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status)) {
      setRunTour(false);
      onComplete();
    } else if (action === 'next') {
      setStepIndex(index + 1);
    } else if (action === 'prev') {
      setStepIndex(index - 1);
    }
  };

  const getDemoIcon = () => {
    switch (demoType) {
      case 'tipper': return <User className="h-5 w-5" />;
      case 'creator': return <Building className="h-5 w-5" />;
      case 'wallet': return <Wallet className="h-5 w-5" />;
      default: return <User className="h-5 w-5" />;
    }
  };

  const getDemoTitle = () => {
    switch (demoType) {
      case 'tipper': return 'Tipper Demo Experience';
      case 'creator': return 'Parachain Creator Flow';
      case 'wallet': return 'Custom Wallet Connection';
      default: return 'Demo Experience';
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm">
      {/* Demo Controls */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="absolute top-4 right-4 z-60"
      >
        <div className="flex items-center gap-2 rounded-lg bg-white/10 p-3 backdrop-blur-sm">
          <button
            onClick={onClose}
            className="flex items-center gap-2 rounded-md bg-gray-500/20 px-3 py-2 text-sm text-white hover:bg-gray-500/30"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Landing
          </button>
          <button
            onClick={onClose}
            className="rounded-md bg-red-500/20 p-2 text-red-400 hover:bg-red-500/30"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </motion.div>

      {/* Demo Account Info */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="demo-account-info absolute top-4 left-4 z-60 max-w-sm rounded-lg bg-white/10 p-4 backdrop-blur-sm"
      >
        <div className="flex items-center gap-3 mb-3">
          <div className="rounded-full bg-red-500/20 p-2">
            {getDemoIcon()}
          </div>
          <div>
            <h3 className="font-semibold text-white text-sm">{getDemoTitle()}</h3>
            <p className="text-xs text-gray-400">Guided Demo Experience</p>
          </div>
        </div>
        
        {demoAccount && (
          <div className="text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-gray-400">Account:</span>
              <span className="text-white">{demoAccount.name.split('(')[0].trim()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Address:</span>
              <span className="text-white font-mono">{demoAccount.address.slice(0, 8)}...</span>
            </div>
            {demoAccount.balance && (
              <div className="flex justify-between">
                <span className="text-gray-400">Balance:</span>
                <span className="text-green-400">{demoAccount.balance}</span>
              </div>
            )}
          </div>
        )}
      </motion.div>

      {/* Tour Progress */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="absolute bottom-4 left-1/2 -translate-x-1/2 z-60"
      >
        <div className="rounded-full bg-white/10 px-4 py-2 backdrop-blur-sm">
          <span className="text-sm text-white">
            Step {stepIndex + 1} of {getTourSteps().length}
          </span>
        </div>
      </motion.div>

      {/* Joyride Tour */}
      <Joyride
        steps={getTourSteps()}
        run={runTour}
        continuous={true}
        showProgress={true}
        showSkipButton={true}
        callback={handleJoyrideCallback}
        styles={{
          options: {
            primaryColor: '#8b5cf6',
            backgroundColor: '#1a1a1a',
            textColor: '#ffffff',
            overlayColor: 'rgba(0, 0, 0, 0.4)',
            arrowColor: '#1a1a1a',
          },
          tooltip: {
            backgroundColor: '#1a1a1a',
            color: '#ffffff',
          },
          tooltipContent: {
            padding: '16px',
          },
          buttonNext: {
            backgroundColor: '#8b5cf6',
            color: '#ffffff',
          },
          buttonBack: {
            marginRight: '8px',
          }
        }}
      />

      {/* Demo UI Overlay (placeholder for actual app components) */}
      <div className="absolute inset-0 z-40 flex items-center justify-center">
        <div className="text-center text-white">
          <h2 className="text-2xl font-bold mb-4">{getDemoTitle()}</h2>
          <p className="text-gray-400 max-w-md">
            This is where the actual TipsyDot app interface would be displayed.
            The tour will guide you through each step of the {demoType} experience.
          </p>
          
          {/* Demo placeholders */}
          <div className="mt-8 grid grid-cols-2 gap-4 max-w-2xl mx-auto">
            <div className="faucet-section h-24 rounded-lg border border-gray-600 bg-gray-800/50 p-4">
              <div className="text-sm font-semibold">Faucet</div>
              <div className="text-xs text-gray-400">Get test tokens</div>
            </div>
            <div className="swap-section h-24 rounded-lg border border-gray-600 bg-gray-800/50 p-4">
              <div className="text-sm font-semibold">Swap</div>
              <div className="text-xs text-gray-400">Exchange for USDP</div>
            </div>
            <div className="tip-section h-24 rounded-lg border border-gray-600 bg-gray-800/50 p-4">
              <div className="text-sm font-semibold">Tip Parachains</div>
              <div className="text-xs text-gray-400">Support projects</div>
            </div>
            <div className="nft-rewards h-24 rounded-lg border border-gray-600 bg-gray-800/50 p-4">
              <div className="text-sm font-semibold">NFT Rewards</div>
              <div className="text-xs text-gray-400">Earn collectibles</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}