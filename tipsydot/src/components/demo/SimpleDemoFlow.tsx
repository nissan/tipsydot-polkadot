import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Check, Loader2, Wallet, Send, Gift, AlertCircle } from 'lucide-react';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { injected } from 'wagmi/connectors';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits, formatUnits } from 'viem';
import { CONTRACTS } from '../../lib/contracts';

type DemoStep = 'connect' | 'approve' | 'tip' | 'complete';

interface SimpleDemoFlowProps {
  onClose: () => void;
  onComplete?: () => void;
}

export default function SimpleDemoFlow({ onClose, onComplete }: SimpleDemoFlowProps) {
  const [currentStep, setCurrentStep] = useState<DemoStep>('connect');
  const [tipAmount] = useState('10'); // Fixed 10 USDC demo
  const [recipientAddress] = useState('0x70997970C51812dc3A010C7d01b50e0d17dc79C8'); // Demo recipient
  const [parachainId] = useState(2222); // TipsyDot parachain
  
  const { address, isConnected } = useAccount();
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();
  
  const { writeContract, data: txHash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  // Auto-advance steps
  useEffect(() => {
    if (isConnected && currentStep === 'connect') {
      setCurrentStep('approve');
    }
  }, [isConnected, currentStep]);

  useEffect(() => {
    if (isConfirmed && currentStep === 'tip') {
      setCurrentStep('complete');
      setTimeout(() => {
        onComplete?.();
      }, 3000);
    }
  }, [isConfirmed, currentStep, onComplete]);

  const handleConnect = async () => {
    try {
      await connect({ connector: injected() });
    } catch (error) {
      console.error('Failed to connect:', error);
    }
  };

  const handleApprove = async () => {
    if (!address) return;
    
    try {
      // Approve USDC spending
      await writeContract({
        address: CONTRACTS.USDC.address as `0x${string}`,
        abi: [
          {
            name: 'approve',
            type: 'function',
            inputs: [
              { name: 'spender', type: 'address' },
              { name: 'amount', type: 'uint256' },
            ],
            outputs: [{ name: '', type: 'bool' }],
            stateMutability: 'nonpayable',
          },
        ],
        functionName: 'approve',
        args: [CONTRACTS.TipsyDotV5.address as `0x${string}`, parseUnits(tipAmount, 6)],
      });
      
      setCurrentStep('tip');
    } catch (error) {
      console.error('Approval failed:', error);
    }
  };

  const handleTip = async () => {
    if (!address) return;
    
    try {
      // Send tip via TipsyDot contract
      await writeContract({
        address: CONTRACTS.TipsyDotV5.address as `0x${string}`,
        abi: [
          {
            name: 'tipParachain',
            type: 'function',
            inputs: [
              { name: 'parachainId', type: 'uint32' },
              { name: 'amount', type: 'uint256' },
              { name: 'message', type: 'string' },
            ],
            outputs: [],
            stateMutability: 'nonpayable',
          },
        ],
        functionName: 'tipParachain',
        args: [parachainId, parseUnits(tipAmount, 6), 'Demo tip via TipsyDot! 🚀'],
      });
    } catch (error) {
      console.error('Tipping failed:', error);
    }
  };

  const steps = [
    {
      id: 'connect',
      title: 'Connect MetaMask',
      description: 'Connect your wallet to start the demo',
      icon: Wallet,
      action: handleConnect,
      actionLabel: 'Connect Wallet',
    },
    {
      id: 'approve',
      title: 'Approve USDC',
      description: `Approve ${tipAmount} USDC for tipping`,
      icon: Check,
      action: handleApprove,
      actionLabel: 'Approve USDC',
    },
    {
      id: 'tip',
      title: 'Send Tip',
      description: 'Send USDC tip via XCM to parachain',
      icon: Send,
      action: handleTip,
      actionLabel: 'Send Tip',
    },
    {
      id: 'complete',
      title: 'Success!',
      description: 'Your tip has been sent across chains',
      icon: Gift,
      action: () => onComplete?.(),
      actionLabel: 'View Dashboard',
    },
  ];

  const currentStepData = steps.find(s => s.id === currentStep);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="relative mx-4 w-full max-w-2xl rounded-2xl border border-gray-800 bg-gray-900 p-8 shadow-2xl"
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-400 hover:text-white"
        >
          ✕
        </button>

        {/* Header */}
        <div className="mb-8 text-center">
          <h2 className="text-3xl font-bold text-white">
            TipsyDot Demo: USDC Cross-Chain Tipping
          </h2>
          <p className="mt-2 text-gray-400">
            Experience XCM reserve transfers in action
          </p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8 flex justify-between">
          {steps.map((step, index) => (
            <div
              key={step.id}
              className="flex flex-1 items-center"
            >
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full border-2 ${
                  steps.findIndex(s => s.id === currentStep) >= index
                    ? 'border-red-500 bg-red-500/20 text-white'
                    : 'border-gray-700 bg-gray-800 text-gray-500'
                }`}
              >
                {steps.findIndex(s => s.id === currentStep) > index ? (
                  <Check className="h-5 w-5" />
                ) : (
                  <span>{index + 1}</span>
                )}
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`h-0.5 flex-1 ${
                    steps.findIndex(s => s.id === currentStep) > index
                      ? 'bg-red-500'
                      : 'bg-gray-700'
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Current Step Content */}
        <AnimatePresence mode="wait">
          {currentStepData && (
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center"
            >
              <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-500/20">
                <currentStepData.icon className="h-10 w-10 text-red-400" />
              </div>

              <h3 className="text-2xl font-semibold text-white">
                {currentStepData.title}
              </h3>
              
              <p className="mt-2 text-gray-400">
                {currentStepData.description}
              </p>

              {/* Demo Info Box */}
              <div className="mx-auto mt-6 max-w-md rounded-lg border border-gray-700 bg-gray-800/50 p-4">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Amount:</span>
                    <span className="font-mono text-white">{tipAmount} USDC</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Recipient:</span>
                    <span className="font-mono text-white">
                      {recipientAddress.slice(0, 6)}...{recipientAddress.slice(-4)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Destination:</span>
                    <span className="text-white">TipsyDot Parachain (2222)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Transfer Type:</span>
                    <span className="text-red-400">XCM Reserve Transfer</span>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              {currentStep !== 'complete' && (
                <button
                  onClick={currentStepData.action}
                  disabled={isPending || isConfirming}
                  className="mt-8 flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-red-500 to-red-600 px-8 py-3 font-semibold text-white transition-all hover:shadow-lg hover:shadow-red-500/30 disabled:opacity-50"
                >
                  {(isPending || isConfirming) ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      {currentStepData.actionLabel}
                      <ArrowRight className="h-5 w-5" />
                    </>
                  )}
                </button>
              )}

              {currentStep === 'complete' && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="mt-8"
                >
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-500/20">
                    <Check className="h-8 w-8 text-green-400" />
                  </div>
                  <p className="mt-4 text-lg text-green-400">
                    Transaction Complete!
                  </p>
                  <p className="mt-2 text-sm text-gray-400">
                    Your USDC has been transferred via XCM to the sovereign account
                  </p>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Info Footer */}
        <div className="mt-8 rounded-lg border border-yellow-500/20 bg-yellow-500/10 p-4">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-yellow-400" />
            <div className="text-sm text-yellow-300">
              <p className="font-semibold">Demo Mode</p>
              <p className="mt-1 text-yellow-200/80">
                This is using test USDC on a local Anvil chain. The XCM bridge demonstrates
                how AssetHub USDC would convert to sovereign accounts on Polkadot parachains.
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}