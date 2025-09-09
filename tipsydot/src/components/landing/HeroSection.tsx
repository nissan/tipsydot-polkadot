import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Coins, Zap, Gift, TrendingUp } from 'lucide-react';

interface HeroSectionProps {
  onStartDemo: (demoType: 'tipper' | 'creator' | 'wallet') => void;
}

export default function HeroSection({ onStartDemo }: HeroSectionProps) {
  const [hoveredDemo, setHoveredDemo] = useState<string | null>(null);

  return (
    <section className="relative mx-auto mt-12 max-w-5xl px-6 text-center md:px-8">
      {/* Announcement Badge */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="inline-flex h-8 items-center justify-center rounded-full border border-red-500/20 bg-gradient-to-r from-red-500/10 to-pink-500/10 px-4 text-sm text-red-300 backdrop-blur-sm transition-all hover:border-red-500/40 hover:bg-red-500/20"
      >
        <span className="flex items-center gap-2">
          ✨ Polkadot Blockchain Academy Cohort 7 Hackathon
          <ArrowRight className="h-3 w-3" />
        </span>
      </motion.div>

      {/* Main Headline */}
      <motion.h1 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.2 }}
        className="mt-8 text-5xl font-bold leading-tight tracking-tight text-white sm:text-6xl lg:text-7xl"
      >
        Send USDC Tips
        <br className="hidden sm:block" />
        <span className="bg-gradient-to-r from-red-400 to-red-500 bg-clip-text text-transparent">
          Across Polkadot
        </span>
      </motion.h1>

      {/* Subtitle */}
      <motion.p 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.4 }}
        className="mx-auto mt-6 max-w-2xl text-xl text-gray-300 sm:text-2xl"
      >
        Bridge USDC from AssetHub to tip creators on any parachain.
        <br className="hidden sm:block" />
        <span className="text-base text-gray-400">Powered by XCM v4 cross-chain messaging</span>
      </motion.p>

      {/* Simple Demo CTA */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.6 }}
        className="mx-auto mt-12 max-w-xl"
      >
        <button
          onClick={() => onStartDemo('wallet')}
          className="group relative w-full overflow-hidden rounded-2xl bg-gradient-to-r from-red-500 to-red-600 p-1 transition-all hover:scale-105 hover:shadow-2xl hover:shadow-red-500/30"
        >
          <div className="relative rounded-xl bg-gray-900 px-8 py-6 transition-all group-hover:bg-opacity-90">
            <div className="flex flex-col items-center gap-4">
              <div className="text-3xl font-bold text-white">
                🚀 Start 2-Minute Demo
              </div>
              <div className="text-lg text-gray-300">
                Connect MetaMask → Send USDC Tip → See XCM Magic
              </div>
              <div className="flex items-center gap-2 text-sm text-red-300">
                <span className="animate-pulse">●</span>
                Live on-chain demo with test USDC
                <ArrowRight className="h-4 w-4" />
              </div>
            </div>
          </div>
        </button>
      </motion.div>

      {/* How It Works */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.8 }}
        className="mx-auto mt-16 max-w-3xl"
      >
        <h3 className="mb-8 text-xl font-semibold text-white">How TipsyDot Works</h3>
        <div className="grid grid-cols-1 gap-4 text-left sm:grid-cols-3">
          <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-4">
            <div className="mb-2 text-2xl">1️⃣</div>
            <div className="font-semibold text-white">Connect Wallet</div>
            <div className="mt-1 text-sm text-gray-400">
              Use MetaMask with test USDC from AssetHub precompile
            </div>
          </div>
          <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-4">
            <div className="mb-2 text-2xl">2️⃣</div>
            <div className="font-semibold text-white">Send Tip</div>
            <div className="mt-1 text-sm text-gray-400">
              USDC converts to sovereign account via XCM reserve transfer
            </div>
          </div>
          <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-4">
            <div className="mb-2 text-2xl">3️⃣</div>
            <div className="font-semibold text-white">Earn NFT</div>
            <div className="mt-1 text-sm text-gray-400">
              Get dynamic NFT reward based on your tip amount
            </div>
          </div>
        </div>
      </motion.div>

      {/* Additional Demo Options (Hidden by default, shown on request) */}
      <details className="mx-auto mt-12 max-w-2xl">
        <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-300">
          Advanced Demo Options →
        </summary>
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3"
        >
        {/* Tipper Demo */}
        <motion.button
          whileHover={{ scale: 1.02, y: -4 }}
          whileTap={{ scale: 0.98 }}
          onHoverStart={() => setHoveredDemo('tipper')}
          onHoverEnd={() => setHoveredDemo(null)}
          onClick={() => onStartDemo('tipper')}
          className="group relative overflow-hidden rounded-2xl border border-red-500/20 bg-gradient-to-br from-red-500/10 via-red-600/5 to-transparent p-6 text-left transition-all hover:border-red-500/40 hover:shadow-lg hover:shadow-red-500/20"
        >
          <div className="relative z-10">
            <div className="mb-3 flex items-center gap-2">
              <div className="rounded-lg bg-red-500/20 p-2">
                <Coins className="h-5 w-5 text-red-400" />
              </div>
              <span className="font-semibold text-white">Try as Tipper</span>
            </div>
            <p className="text-sm text-gray-400">
              Experience the full user journey: Faucet → Swap → Tip → Earn NFTs
            </p>
            <div className="mt-3 text-xs text-red-300">
              Uses pre-funded demo account
            </div>
          </div>
          {hoveredDemo === 'tipper' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.1 }}
              className="absolute inset-0 bg-gradient-to-br from-red-400 to-pink-400"
            />
          )}
        </motion.button>

        {/* Creator Demo */}
        <motion.button
          whileHover={{ scale: 1.02, y: -4 }}
          whileTap={{ scale: 0.98 }}
          onHoverStart={() => setHoveredDemo('creator')}
          onHoverEnd={() => setHoveredDemo(null)}
          onClick={() => onStartDemo('creator')}
          className="group relative overflow-hidden rounded-2xl border border-blue-500/20 bg-gradient-to-br from-blue-500/10 via-blue-600/5 to-transparent p-6 text-left transition-all hover:border-blue-500/40 hover:shadow-lg hover:shadow-blue-500/20"
        >
          <div className="relative z-10">
            <div className="mb-3 flex items-center gap-2">
              <div className="rounded-lg bg-blue-500/20 p-2">
                <TrendingUp className="h-5 w-5 text-blue-400" />
              </div>
              <span className="font-semibold text-white">Parachain Creator</span>
            </div>
            <p className="text-sm text-gray-400">
              Register your parachain, verify, and start receiving tips
            </p>
            <div className="mt-3 text-xs text-blue-300">
              Uses Substrate demo accounts
            </div>
          </div>
          {hoveredDemo === 'creator' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.1 }}
              className="absolute inset-0 bg-gradient-to-br from-blue-400 to-cyan-400"
            />
          )}
        </motion.button>

        {/* Custom Wallet */}
        <motion.button
          whileHover={{ scale: 1.02, y: -4 }}
          whileTap={{ scale: 0.98 }}
          onHoverStart={() => setHoveredDemo('wallet')}
          onHoverEnd={() => setHoveredDemo(null)}
          onClick={() => onStartDemo('wallet')}
          className="group relative overflow-hidden rounded-2xl border border-green-500/20 bg-gradient-to-br from-green-500/10 via-green-600/5 to-transparent p-6 text-left transition-all hover:border-green-500/40 hover:shadow-lg hover:shadow-green-500/20"
        >
          <div className="relative z-10">
            <div className="mb-3 flex items-center gap-2">
              <div className="rounded-lg bg-green-500/20 p-2">
                <Zap className="h-5 w-5 text-green-400" />
              </div>
              <span className="font-semibold text-white">Connect Wallet</span>
            </div>
            <p className="text-sm text-gray-400">
              Use your own MetaMask + Polkadot.js for full platform access
            </p>
            <div className="mt-3 text-xs text-green-300">
              Full wallet integration
            </div>
          </div>
          {hoveredDemo === 'wallet' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.1 }}
              className="absolute inset-0 bg-gradient-to-br from-green-400 to-emerald-400"
            />
          )}
        </motion.button>
        </motion.div>
      </details>

      {/* Tech Stack Badge */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 1.0 }}
        className="mx-auto mt-16 flex flex-wrap justify-center gap-3 text-xs"
      >
        <span className="rounded-full border border-gray-700 bg-gray-800/50 px-3 py-1 text-gray-400">
          Solidity + OpenZeppelin
        </span>
        <span className="rounded-full border border-gray-700 bg-gray-800/50 px-3 py-1 text-gray-400">
          XCM v4 Reserve Transfers
        </span>
        <span className="rounded-full border border-gray-700 bg-gray-800/50 px-3 py-1 text-gray-400">
          EVM on Substrate (Revive)
        </span>
        <span className="rounded-full border border-gray-700 bg-gray-800/50 px-3 py-1 text-gray-400">
          PAPI Type-Safe Integration
        </span>
      </motion.div>

      {/* Background Elements */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-red-500/20 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-pink-500/20 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 h-60 w-60 -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-500/10 blur-3xl" />
      </div>
    </section>
  );
}