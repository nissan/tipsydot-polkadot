import { useState } from 'react';
import { tip, approveToken } from '../lib/contractCalls';

interface TipCampaignProps {
  campaignId: number;
  onSuccess?: () => void;
}

export default function TipCampaign({ campaignId, onSuccess }: TipCampaignProps) {
  const [loading, setLoading] = useState(false);
  const [approving, setApproving] = useState(false);
  const [amount, setAmount] = useState('');
  const [memo, setMemo] = useState('');
  const [needsApproval, setNeedsApproval] = useState(true);

  const handleApprove = async () => {
    setApproving(true);
    try {
      const usdcAddress = import.meta.env.VITE_USDC_PRECOMPILE;
      const contractAddress = import.meta.env.VITE_TIPSY_ADDRESS;
      
      if (!usdcAddress || !contractAddress) {
        alert('Contract addresses not configured. Using mock mode.');
        setNeedsApproval(false);
        return;
      }

      // Convert amount to wei (assuming 6 decimals for USDC)
      const amountWei = BigInt(parseFloat(amount) * 1e6).toString();
      
      const tx = await approveToken(usdcAddress, contractAddress, amountWei);
      console.log('Approval tx:', tx);
      alert('USDC approved!');
      setNeedsApproval(false);
    } catch (error: any) {
      console.error('Approval error:', error);
      alert(`Approval failed: ${error.message}`);
    } finally {
      setApproving(false);
    }
  };

  const handleTip = async () => {
    setLoading(true);
    try {
      if (!import.meta.env.VITE_TIPSY_ADDRESS) {
        // Mock mode for demo
        console.log('Mock tip:', { campaignId, amount, memo });
        alert(`Mock tip sent: ${amount} USDC to campaign ${campaignId}`);
        onSuccess?.();
        return;
      }

      // Convert amount to wei (assuming 6 decimals for USDC)
      const amountWei = BigInt(parseFloat(amount) * 1e6).toString();
      
      const tx = await tip(campaignId, amountWei, memo);
      console.log('Tip tx:', tx);
      alert(`Tip sent! Transaction: ${tx.hash}`);
      onSuccess?.();
    } catch (error: any) {
      console.error('Tip error:', error);
      alert(`Tip failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const protocolFee = amount ? (parseFloat(amount) * 0.001).toFixed(2) : '0.00';
  const netAmount = amount ? (parseFloat(amount) - parseFloat(protocolFee)).toFixed(2) : '0.00';

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-xl font-bold mb-4">Tip Campaign #{campaignId}</h3>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Amount (USDC)
          </label>
          <input
            type="number"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="10.00"
            required
          />
          
          {amount && parseFloat(amount) > 0 && (
            <div className="mt-2 p-3 bg-gray-50 rounded text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Campaign receives:</span>
                <span className="font-medium">${netAmount} USDC</span>
              </div>
              <div className="flex justify-between text-gray-500 text-xs mt-1">
                <span>Protocol fee (0.1% for coretime):</span>
                <span>${protocolFee} USDC</span>
              </div>
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Memo (optional)
          </label>
          <input
            type="text"
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Great cause! 🎉"
          />
        </div>

        {needsApproval && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-sm text-yellow-800 mb-2">
              First, approve USDC spending for this amount
            </p>
            <button
              onClick={handleApprove}
              disabled={!amount || approving}
              className="w-full bg-yellow-600 text-white py-2 px-4 rounded-lg hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {approving ? 'Approving...' : 'Approve USDC'}
            </button>
          </div>
        )}

        <button
          onClick={handleTip}
          disabled={!amount || loading || (needsApproval && import.meta.env.VITE_TIPSY_ADDRESS)}
          className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Sending Tip...' : `Send ${amount || '0'} USDC`}
        </button>
      </div>
    </div>
  );
}