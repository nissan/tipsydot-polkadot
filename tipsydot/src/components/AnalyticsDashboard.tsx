/**
 * Analytics Dashboard with MagicUI/shadcn components
 * Shows XCM bridge stats, campaign analytics, and tip allocation
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PieChart, Pie, Cell, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  LineChart, Line, Area, AreaChart,
  RadialBarChart, RadialBar
} from 'recharts';
import { 
  ArrowUpRight, ArrowDownRight, TrendingUp, 
  DollarSign, Users, Activity, Award,
  Zap, Globe, Layers, Box
} from 'lucide-react';
import { cn } from '../lib/utils';

// Sample data - in production, fetch from blockchain
const SAMPLE_CAMPAIGNS = [
  { name: 'Moonbeam', value: 45000, tips: 120, color: '#6366f1' },
  { name: 'Hydration', value: 32000, tips: 89, color: '#8b5cf6' },
  { name: 'Acala', value: 28000, tips: 76, color: '#ec4899' },
  { name: 'Interlay', value: 19000, tips: 45, color: '#f59e0b' },
  { name: 'Phala', value: 15000, tips: 38, color: '#10b981' },
];

const XCM_FLOW_DATA = [
  { time: '00:00', assetHub: 10000, passetHub: 0 },
  { time: '04:00', assetHub: 8500, passetHub: 1500 },
  { time: '08:00', assetHub: 6000, passetHub: 4000 },
  { time: '12:00', assetHub: 4500, passetHub: 5500 },
  { time: '16:00', assetHub: 3000, passetHub: 7000 },
  { time: '20:00', assetHub: 2000, passetHub: 8000 },
  { time: '24:00', assetHub: 1500, passetHub: 8500 },
];

interface StatCardProps {
  title: string;
  value: string;
  change: number;
  icon: React.ReactNode;
  color: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, change, icon, color }) => {
  const isPositive = change >= 0;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow"
    >
      <div className="flex items-center justify-between mb-4">
        <div className={cn("p-2 rounded-lg", color)}>
          {icon}
        </div>
        <div className={cn(
          "flex items-center text-sm font-medium",
          isPositive ? "text-green-600" : "text-red-600"
        )}>
          {isPositive ? <ArrowUpRight className="w-4 h-4 mr-1" /> : <ArrowDownRight className="w-4 h-4 mr-1" />}
          {Math.abs(change)}%
        </div>
      </div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      <div className="text-sm text-gray-500 mt-1">{title}</div>
    </motion.div>
  );
};

interface AnalyticsDashboardProps {
  xcmTransfers?: any[];
  campaigns?: any[];
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  xcmTransfers = [],
  campaigns = SAMPLE_CAMPAIGNS
}) => {
  const [selectedMetric, setSelectedMetric] = useState<'volume' | 'tips' | 'users'>('volume');
  const [animatedValue, setAnimatedValue] = useState(0);
  const [activeTab, setActiveTab] = useState<'overview' | 'xcm' | 'campaigns' | 'tips'>('overview');

  // Animate numbers on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedValue(139000);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  // Calculate totals
  const totalVolume = campaigns.reduce((acc, c) => acc + c.value, 0);
  const totalTips = campaigns.reduce((acc, c) => acc + c.tips, 0);
  const avgTipSize = totalVolume / totalTips;

  // Radial chart data for protocol health
  const healthData = [
    { name: 'XCM Success', value: 98, fill: '#10b981' },
    { name: 'Network Load', value: 45, fill: '#3b82f6' },
    { name: 'Fee Efficiency', value: 92, fill: '#8b5cf6' },
  ];

  return (
    <div className="space-y-6">
      {/* Header with Tabs */}
      <div className="bg-gradient-to-r from-red-600 to-blue-600 rounded-xl p-6 text-white">
        <h2 className="text-3xl font-bold mb-2">TipsyDot Analytics</h2>
        <p className="text-red-100">Real-time cross-chain crowdfunding metrics</p>
        
        <div className="flex gap-2 mt-4">
          {['overview', 'xcm', 'campaigns', 'tips'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={cn(
                "px-4 py-2 rounded-lg font-medium transition-all",
                activeTab === tab
                  ? "bg-white text-red-600"
                  : "bg-white/20 hover:bg-white/30"
              )}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Volume (USDC)"
          value={`$${(totalVolume / 1000).toFixed(1)}k`}
          change={12.5}
          icon={<DollarSign className="w-5 h-5 text-white" />}
          color="bg-gradient-to-r from-green-500 to-emerald-500"
        />
        <StatCard
          title="Active Campaigns"
          value={campaigns.length.toString()}
          change={8.3}
          icon={<Award className="w-5 h-5 text-white" />}
          color="bg-gradient-to-r from-blue-500 to-cyan-500"
        />
        <StatCard
          title="Total Tips"
          value={totalTips.toString()}
          change={15.7}
          icon={<Users className="w-5 h-5 text-white" />}
          color="bg-gradient-to-r from-red-500 to-pink-500"
        />
        <StatCard
          title="Avg Tip Size"
          value={`$${avgTipSize.toFixed(0)}`}
          change={-2.4}
          icon={<Activity className="w-5 h-5 text-white" />}
          color="bg-gradient-to-r from-orange-500 to-red-500"
        />
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'overview' && (
          <motion.div
            key="overview"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-6"
          >
            {/* Pie Chart - Campaign Distribution */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <Box className="w-5 h-5 mr-2 text-red-600" />
                Campaign Distribution
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={campaigns}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {campaigns.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => `$${(value / 1000).toFixed(1)}k`} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Protocol Health Radial */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <Zap className="w-5 h-5 mr-2 text-yellow-600" />
                Protocol Health
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <RadialBarChart cx="50%" cy="50%" innerRadius="10%" outerRadius="90%" data={healthData}>
                  <RadialBar minAngle={15} background clockWise dataKey="value" />
                  <Tooltip />
                  <Legend />
                </RadialBarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        )}

        {activeTab === 'xcm' && (
          <motion.div
            key="xcm"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-6"
          >
            {/* XCM Flow Chart */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <Globe className="w-5 h-5 mr-2 text-blue-600" />
                XCM Bridge Flow (24h)
              </h3>
              <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={XCM_FLOW_DATA}>
                  <defs>
                    <linearGradient id="colorAssetHub" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorPassetHub" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis />
                  <Tooltip formatter={(value: any) => `$${value.toLocaleString()}`} />
                  <Legend />
                  <Area 
                    type="monotone" 
                    dataKey="assetHub" 
                    stroke="#3b82f6" 
                    fillOpacity={1} 
                    fill="url(#colorAssetHub)" 
                    name="AssetHub USDC"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="passetHub" 
                    stroke="#10b981" 
                    fillOpacity={1} 
                    fill="url(#colorPassetHub)" 
                    name="PassetHub USDC"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* XCM Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-blue-600 font-medium">Transfer Success Rate</span>
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                </div>
                <div className="text-3xl font-bold text-blue-900">98.5%</div>
                <div className="text-sm text-blue-700 mt-2">↑ 2.3% from last week</div>
              </div>
              
              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-green-600 font-medium">Avg Transfer Time</span>
                  <Activity className="w-5 h-5 text-green-600" />
                </div>
                <div className="text-3xl font-bold text-green-900">18s</div>
                <div className="text-sm text-green-700 mt-2">↓ 3s improvement</div>
              </div>
              
              <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-red-600 font-medium">Total Bridged</span>
                  <Layers className="w-5 h-5 text-red-600" />
                </div>
                <div className="text-3xl font-bold text-red-900">$847k</div>
                <div className="text-sm text-red-700 mt-2">Across 1,247 transfers</div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'campaigns' && (
          <motion.div
            key="campaigns"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="bg-white rounded-xl shadow-lg p-6"
          >
            <h3 className="text-lg font-semibold mb-4">Campaign Performance</h3>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={campaigns}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
                <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
                <Tooltip />
                <Legend />
                <Bar yAxisId="left" dataKey="value" fill="#8884d8" name="USDC Raised" />
                <Bar yAxisId="right" dataKey="tips" fill="#82ca9d" name="Number of Tips" />
              </BarChart>
            </ResponsiveContainer>
          </motion.div>
        )}

        {activeTab === 'tips' && (
          <motion.div
            key="tips"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-6"
          >
            {/* Recent Tips Feed */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Recent Tips</h3>
              <div className="space-y-3">
                {[
                  { from: '0x742d...3521', to: 'Moonbeam', amount: 500, time: '2 min ago', message: 'Great work on XCM!' },
                  { from: '0x8f3a...9cb2', to: 'Hydration', amount: 250, time: '5 min ago', message: 'Love the liquidity pools' },
                  { from: '0x1a2b...4c5d', to: 'Acala', amount: 1000, time: '12 min ago', message: 'DeFi innovation!' },
                  { from: '0x9e8f...7d6c', to: 'Interlay', amount: 750, time: '18 min ago', message: 'BTC bridge is amazing' },
                  { from: '0x3c4d...5e6f', to: 'Phala', amount: 300, time: '25 min ago', message: 'Privacy matters' },
                ].map((tip, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-gradient-to-r from-red-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold">
                        {tip.to[0]}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">
                          {tip.from} → {tip.to}
                        </div>
                        <div className="text-sm text-gray-500">
                          "{tip.message}"
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-green-600">${tip.amount}</div>
                      <div className="text-xs text-gray-500">{tip.time}</div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Tip Distribution Heatmap */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Tip Distribution by Hour</h3>
              <div className="grid grid-cols-24 gap-1">
                {Array.from({ length: 24 * 7 }, (_, i) => {
                  const intensity = Math.random();
                  return (
                    <div
                      key={i}
                      className={cn(
                        "w-full h-4 rounded-sm",
                        intensity > 0.8 ? "bg-green-600" :
                        intensity > 0.6 ? "bg-green-500" :
                        intensity > 0.4 ? "bg-green-400" :
                        intensity > 0.2 ? "bg-green-300" :
                        "bg-green-100"
                      )}
                      title={`Hour ${i % 24}: ${Math.floor(intensity * 100)} tips`}
                    />
                  );
                })}
              </div>
              <div className="flex justify-between mt-2 text-xs text-gray-500">
                <span>Mon</span>
                <span>Tue</span>
                <span>Wed</span>
                <span>Thu</span>
                <span>Fri</span>
                <span>Sat</span>
                <span>Sun</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Live Activity Feed */}
      <div className="bg-gradient-to-r from-red-600 to-blue-600 rounded-xl p-6 text-white">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <Activity className="w-5 h-5 mr-2" />
          Live Network Activity
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white/20 rounded-lg p-4">
            <div className="text-3xl font-bold">
              <motion.span
                key={animatedValue}
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                ${(animatedValue / 1000).toFixed(1)}k
              </motion.span>
            </div>
            <div className="text-red-100">24h Volume</div>
          </div>
          <div className="bg-white/20 rounded-lg p-4">
            <div className="text-3xl font-bold">342</div>
            <div className="text-red-100">Active Tippers</div>
          </div>
          <div className="bg-white/20 rounded-lg p-4">
            <div className="text-3xl font-bold">18</div>
            <div className="text-red-100">Parachains Supported</div>
          </div>
        </div>
      </div>
    </div>
  );
};