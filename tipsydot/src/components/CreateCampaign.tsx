import { useState } from 'react';
import { createCampaign } from '../lib/contractCalls';

interface CreateCampaignProps {
  onSuccess?: () => void;
}

export default function CreateCampaign({ onSuccess }: CreateCampaignProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    destParaId: import.meta.env.VITE_BENEFICIARY_PARAID || '2000',
    beneficiary: import.meta.env.VITE_BENEFICIARY_MULTILOC || '',
    asset: import.meta.env.VITE_USDC_PRECOMPILE || ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Check if contract is configured
      if (!import.meta.env.VITE_TIPSY_ADDRESS) {
        alert('Contract not deployed yet. Using mock mode.');
        // Mock success for demo
        console.log('Mock campaign created:', formData);
        onSuccess?.();
        return;
      }

      const tx = await createCampaign(
        formData.name,
        formData.description,
        formData.asset,
        formData.beneficiary,
        parseInt(formData.destParaId)
      );
      
      console.log('Campaign created:', tx);
      alert(`Campaign created! Transaction: ${tx.hash}`);
      onSuccess?.();
    } catch (error: any) {
      console.error('Error creating campaign:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-2xl font-bold mb-4">Create Campaign</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Campaign Name
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Save the Ocean"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={3}
            placeholder="Help us clean the oceans and protect marine life..."
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Destination ParaID
          </label>
          <input
            type="number"
            value={formData.destParaId}
            onChange={(e) => setFormData({ ...formData, destParaId: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="2000"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Beneficiary (Hex)
          </label>
          <input
            type="text"
            value={formData.beneficiary}
            onChange={(e) => setFormData({ ...formData, beneficiary: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-xs"
            placeholder="0x..."
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Asset (USDC Address)
          </label>
          <input
            type="text"
            value={formData.asset}
            onChange={(e) => setFormData({ ...formData, asset: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-xs"
            placeholder="0x..."
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Creating...' : 'Create Campaign'}
        </button>
      </form>
    </div>
  );
}