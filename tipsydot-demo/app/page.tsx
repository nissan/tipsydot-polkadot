"use client";

import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { config } from "@/lib/wagmi-config";
import DonateButton from "@/components/DonateButton";
import PapiMonitor from "@/components/PapiMonitor";
import { Heart, Globe, Shield, Zap } from "lucide-react";
import { Toaster } from "sonner";

const queryClient = new QueryClient();

export default function Home() {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-950 dark:to-gray-900">
          {/* Hero Section */}
          <section className="relative overflow-hidden">
            <div className="absolute inset-0 bg-grid-gray-100/50 dark:bg-grid-gray-800/50" />
            <div className="relative container mx-auto px-4 py-24">
              <div className="text-center max-w-4xl mx-auto">
                <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-red-600 to-red-500 bg-clip-text text-transparent">
                  TipsyDot
                </h1>
                <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-400 mb-8">
                  Support Underfunded Parachain Builders with Cross-Chain USDC
                  Donations
                </p>
                <div className="flex justify-center mb-12">
                  <DonateButton />
                </div>

                {/* Key Features */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16">
                  <div className="p-6 rounded-lg bg-white dark:bg-gray-800 shadow-lg">
                    <Globe className="h-10 w-10 text-red-500 mx-auto mb-4" />
                    <h3 className="font-semibold mb-2">Cross-Chain</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Send USDC from EVM to Substrate accounts seamlessly
                    </p>
                  </div>
                  <div className="p-6 rounded-lg bg-white dark:bg-gray-800 shadow-lg">
                    <Shield className="h-10 w-10 text-red-500 mx-auto mb-4" />
                    <h3 className="font-semibold mb-2">Secure</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Built on Polkadot XCM for trustless transfers
                    </p>
                  </div>
                  <div className="p-6 rounded-lg bg-white dark:bg-gray-800 shadow-lg">
                    <Zap className="h-10 w-10 text-red-500 mx-auto mb-4" />
                    <h3 className="font-semibold mb-2">Real-Time</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Monitor donations live with PAPI integration
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Live Monitor Section */}
          <section className="py-16 bg-gray-50 dark:bg-gray-900">
            <div className="container mx-auto px-4">
              <div className="max-w-4xl mx-auto">
                <h2 className="text-3xl font-bold text-center mb-8">
                  Live Blockchain Activity
                </h2>
                <PapiMonitor />
              </div>
            </div>
          </section>

          {/* Demo Info */}
          <section className="py-16">
            <div className="container mx-auto px-4">
              <div className="max-w-3xl mx-auto text-center">
                <Heart className="h-16 w-16 text-red-500 mx-auto mb-6" />
                <h2 className="text-3xl font-bold mb-4">2-Minute Demo</h2>
                <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
                  This demo showcases cross-chain USDC donations from EVM
                  wallets to Substrate parachain builders, featuring live
                  blockchain monitoring via PAPI (Polkadot API).
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left max-w-xl mx-auto">
                  <div className="flex items-start space-x-2">
                    <span className="text-green-500">✓</span>
                    <span className="text-sm">Connect MetaMask wallet</span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <span className="text-green-500">✓</span>
                    <span className="text-sm">Select a parachain builder</span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <span className="text-green-500">✓</span>
                    <span className="text-sm">Choose donation amount</span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <span className="text-green-500">✓</span>
                    <span className="text-sm">Watch live on AssetHub</span>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
        <Toaster position="bottom-right" />
      </QueryClientProvider>
    </WagmiProvider>
  );
}
