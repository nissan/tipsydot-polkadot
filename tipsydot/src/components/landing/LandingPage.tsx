import { useState } from 'react';
import HeroSection from './HeroSection';
import DemoFlowManager from '../demo/DemoFlowManager';
import { motion, AnimatePresence } from 'framer-motion';

type DemoType = 'tipper' | 'creator' | 'wallet';

interface LandingPageProps {
  onExitLanding?: () => void;
}

export default function LandingPage({ onExitLanding }: LandingPageProps) {
  const [activeDemoType, setActiveDemoType] = useState<DemoType | null>(null);

  const handleStartDemo = (demoType: DemoType) => {
    setActiveDemoType(demoType);
  };

  const handleCloseDemo = () => {
    setActiveDemoType(null);
  };

  const handleDemoComplete = () => {
    setActiveDemoType(null);
    onExitLanding?.();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-red-900/20 to-gray-900 text-white overflow-hidden">
      {/* Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -right-1/2 w-full h-full bg-gradient-to-bl from-red-500/10 via-transparent to-transparent rounded-full blur-3xl" />
        <div className="absolute -bottom-1/2 -left-1/2 w-full h-full bg-gradient-to-tr from-blue-500/10 via-transparent to-transparent rounded-full blur-3xl" />
      </div>

      {/* Navigation */}
      <nav className="relative z-10 flex items-center justify-between p-6">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-2"
        >
          <div className="rounded-lg bg-gradient-to-r from-red-600 to-red-500 p-2">
            <span className="text-xl font-bold">🍸</span>
          </div>
          <span className="text-xl font-bold">TipsyDot</span>
          <span className="rounded-full bg-red-500/20 px-2 py-1 text-xs text-red-300">
            Beta
          </span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-4"
        >
          <a 
            href="https://github.com/nissan/pba-hackathon" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-sm text-gray-400 hover:text-white transition-colors"
          >
            GitHub
          </a>
          <a 
            href="/docs/presentation.md" 
            className="text-sm text-gray-400 hover:text-white transition-colors"
          >
            Docs
          </a>
          <div className="h-4 w-px bg-gray-600" />
          <span className="text-sm text-gray-400">PBA Cohort 7</span>
        </motion.div>
      </nav>

      {/* Main Content */}
      <div className="relative z-10">
        <HeroSection onStartDemo={handleStartDemo} />
      </div>

      {/* Features Section */}
      <motion.section 
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 1.2 }}
        className="relative z-10 mx-auto mt-32 max-w-7xl px-6 md:px-8"
      >
        <div className="text-center">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Complete Cross-Chain DeFi Ecosystem
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-gray-400">
            TipsyDot demonstrates mastery of the full Polkadot technology stack through
            a practical, production-ready DeFi application.
          </p>
        </div>

        <div className="mt-16 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-2xl border border-gray-800 bg-gray-900/50 p-6 backdrop-blur-sm">
            <div className="mb-4 rounded-lg bg-red-500/20 w-12 h-12 flex items-center justify-center">
              <span className="text-2xl">🪙</span>
            </div>
            <h3 className="text-lg font-semibold mb-2">Custom USDP Stablecoin</h3>
            <p className="text-sm text-gray-400">
              Asset ID 42069 with XCM reserve transfer support and burn/mint bridging mechanics
            </p>
          </div>

          <div className="rounded-2xl border border-gray-800 bg-gray-900/50 p-6 backdrop-blur-sm">
            <div className="mb-4 rounded-lg bg-blue-500/20 w-12 h-12 flex items-center justify-center">
              <span className="text-2xl">🌉</span>
            </div>
            <h3 className="text-lg font-semibold mb-2">XCM v4 Integration</h3>
            <p className="text-sm text-gray-400">
              Cross-chain messaging with AssetHub, PassetHub, and custom parachain connectivity
            </p>
          </div>

          <div className="rounded-2xl border border-gray-800 bg-gray-900/50 p-6 backdrop-blur-sm">
            <div className="mb-4 rounded-lg bg-pink-500/20 w-12 h-12 flex items-center justify-center">
              <span className="text-2xl">🎨</span>
            </div>
            <h3 className="text-lg font-semibold mb-2">Dynamic NFT Rewards</h3>
            <p className="text-sm text-gray-400">
              CryptoZombies-style collectibles with traits based on tip behavior and blockchain data
            </p>
          </div>

          <div className="rounded-2xl border border-gray-800 bg-gray-900/50 p-6 backdrop-blur-sm">
            <div className="mb-4 rounded-lg bg-green-500/20 w-12 h-12 flex items-center justify-center">
              <span className="text-2xl">🔒</span>
            </div>
            <h3 className="text-lg font-semibold mb-2">Production Security</h3>
            <p className="text-sm text-gray-400">
              OpenZeppelin contracts with comprehensive testing and 97% coverage
            </p>
          </div>

          <div className="rounded-2xl border border-gray-800 bg-gray-900/50 p-6 backdrop-blur-sm">
            <div className="mb-4 rounded-lg bg-yellow-500/20 w-12 h-12 flex items-center justify-center">
              <span className="text-2xl">⚡</span>
            </div>
            <h3 className="text-lg font-semibold mb-2">EVM Compatibility</h3>
            <p className="text-sm text-gray-400">
              Familiar Solidity development with Foundry tooling on Substrate
            </p>
          </div>

          <div className="rounded-2xl border border-gray-800 bg-gray-900/50 p-6 backdrop-blur-sm">
            <div className="mb-4 rounded-lg bg-indigo-500/20 w-12 h-12 flex items-center justify-center">
              <span className="text-2xl">📊</span>
            </div>
            <h3 className="text-lg font-semibold mb-2">Analytics Dashboard</h3>
            <p className="text-sm text-gray-400">
              Real-time metrics, XCM flow visualization, and comprehensive platform insights
            </p>
          </div>
        </div>
      </motion.section>

      {/* Technical Highlights */}
      <motion.section
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 1.4 }}
        className="relative z-10 mx-auto mt-32 max-w-7xl px-6 md:px-8"
      >
        <div className="text-center">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Polkadot Technology Mastery
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-gray-400">
            Demonstrating deep understanding of Substrate, XCM, and the complete Polkadot ecosystem
          </p>
        </div>

        <div className="mt-12 rounded-2xl border border-gray-800 bg-gray-900/50 p-8 backdrop-blur-sm">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            <div>
              <h3 className="text-xl font-semibold mb-4">✅ Reserve Transfer Pattern</h3>
              <div className="space-y-3 text-sm text-gray-400">
                <div className="flex justify-between">
                  <span>USDC (Asset ID 31337):</span>
                  <span className="text-green-400">Reserve Transfer</span>
                </div>
                <div className="flex justify-between">
                  <span>USDP (Asset ID 42069):</span>
                  <span className="text-green-400">Reserve Transfer</span>
                </div>
                <div className="flex justify-between">
                  <span>TipCards (Asset ID 69420):</span>
                  <span className="text-green-400">Reserve Transfer</span>
                </div>
                <div className="text-xs text-red-300 mt-2">
                  ❌ Teleport only for DOT/KSM between relay and system chains
                </div>
              </div>
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-4">🏗️ Architecture Decisions</h3>
              <div className="space-y-2 text-sm text-gray-400">
                <div>• EVM + Existing Pallets over Custom Pallets</div>
                <div>• Demonstrates practical Ethereum → Polkadot migration</div>
                <div>• Foundry toolchain for familiar development experience</div>
                <div>• OpenZeppelin security for production readiness</div>
                <div>• Comprehensive testing with 97% coverage</div>
              </div>
            </div>
          </div>
        </div>
      </motion.section>

      {/* Footer */}
      <motion.footer
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 1.6 }}
        className="relative z-10 mx-auto mt-32 max-w-7xl px-6 py-12 text-center text-sm text-gray-400 md:px-8"
      >
        <div className="border-t border-gray-800 pt-8">
          <p>
            Built with ❤️ for Polkadot Blockchain Academy Cohort 7 Hackathon
          </p>
          <p className="mt-2">
            Demonstrating the complete Polkadot technology stack through practical DeFi innovation
          </p>
        </div>
      </motion.footer>

      {/* Demo Flow Overlay */}
      <AnimatePresence>
        {activeDemoType && (
          <DemoFlowManager
            demoType={activeDemoType}
            onClose={handleCloseDemo}
            onComplete={handleDemoComplete}
          />
        )}
      </AnimatePresence>
    </div>
  );
}