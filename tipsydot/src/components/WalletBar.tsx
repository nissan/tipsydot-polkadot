import { useState, useEffect } from 'react';
import { connectWallet, getAccounts, shortenAddress, type WalletAccount } from '../lib/wallet';
import { getApi } from '../lib/api';

interface WalletBarProps {
  onAccountSelect?: (account: WalletAccount) => void;
}

export default function WalletBar({ onAccountSelect }: WalletBarProps) {
  const [accounts, setAccounts] = useState<WalletAccount[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<WalletAccount | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [chainConnected, setChainConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkChainConnection();
  }, []);

  const checkChainConnection = async () => {
    try {
      await getApi();
      setChainConnected(true);
    } catch (err) {
      console.error('Failed to connect to chain:', err);
      setChainConnected(false);
    }
  };

  const handleConnect = async () => {
    setLoading(true);
    setError(null);
    
    try {
      await connectWallet();
      const walletAccounts = await getAccounts();
      
      if (walletAccounts.length === 0) {
        setError('No accounts found in wallet');
      } else {
        setAccounts(walletAccounts);
        setIsConnected(true);
        
        const defaultAccount = walletAccounts[0];
        setSelectedAccount(defaultAccount);
        onAccountSelect?.(defaultAccount);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to connect wallet');
      console.error('Wallet connection error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAccountChange = (account: WalletAccount) => {
    setSelectedAccount(account);
    onAccountSelect?.(account);
  };

  return (
    <div className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className={`h-2 w-2 rounded-full ${chainConnected ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="text-sm text-gray-600">
                {chainConnected ? 'Chain Connected' : 'Chain Disconnected'}
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {!isConnected ? (
              <button
                onClick={handleConnect}
                disabled={loading}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Connecting...' : 'Connect Wallet'}
              </button>
            ) : (
              <div className="flex items-center space-x-4">
                <select
                  value={selectedAccount?.address || ''}
                  onChange={(e) => {
                    const account = accounts.find(a => a.address === e.target.value);
                    if (account) handleAccountChange(account);
                  }}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {accounts.map((account) => (
                    <option key={account.address} value={account.address}>
                      {account.meta.name || shortenAddress(account.address)}
                    </option>
                  ))}
                </select>
                
                {selectedAccount && (
                  <div className="text-sm">
                    <span className="text-gray-600">Selected: </span>
                    <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                      {shortenAddress(selectedAccount.address)}
                    </span>
                  </div>
                )}
              </div>
            )}
            
            {error && (
              <div className="text-red-600 text-sm">
                {error}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}