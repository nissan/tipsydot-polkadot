import { useState, useEffect } from 'react';
import { getCampaignDetails, getCampaignMemos, forward } from '../lib/contractCalls';
import TipCampaign from './TipCampaign';

interface CampaignViewProps {
  campaignId: number;
  onRefresh?: () => void;
}

interface CampaignData {
  name: string;
  description: string;
  creator: string;
  asset: string;
  beneficiary: string;
  destParaId: number;
  totalRaised: string;
  forwarded: boolean;
  createdAt: number;
}

export default function CampaignView({ campaignId, onRefresh }: CampaignViewProps) {
  const [campaign, setCampaign] = useState<CampaignData | null>(null);
  const [memos, setMemos] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [forwarding, setForwarding] = useState(false);

  useEffect(() => {
    loadCampaign();
  }, [campaignId]);

  const loadCampaign = async () => {
    try {
      if (!import.meta.env.VITE_TIPSY_ADDRESS) {
        // Mock data for demo
        setCampaign({
          name: 'Save the Ocean',
          description: 'Help us clean the oceans and protect marine life',
          creator: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
          asset: import.meta.env.VITE_USDC_PRECOMPILE || '0x...',
          beneficiary: '0x01000000000000000000000000000000000000000000000000000000',
          destParaId: 2000,
          totalRaised: '0',
          forwarded: false,
          createdAt: Date.now()
        });
        setMemos(['Great cause!', 'Happy to help 🌊']);
        return;
      }

      const details = await getCampaignDetails(campaignId);
      const campaignMemos = await getCampaignMemos(campaignId);
      
      setCampaign({
        name: details[0],
        description: details[1],
        creator: details[2],
        asset: details[3],
        beneficiary: details[4],
        destParaId: Number(details[5]),
        totalRaised: details[6].toString(),
        forwarded: details[7],
        createdAt: Number(details[8])
      });
      
      setMemos(campaignMemos);
    } catch (error) {
      console.error('Error loading campaign:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleForward = async () => {
    setForwarding(true);
    try {
      if (!import.meta.env.VITE_TIPSY_ADDRESS) {
        alert('Mock forward: Funds would be sent via XCM to ParaID ' + campaign?.destParaId);
        if (campaign) {
          setCampaign({ ...campaign, forwarded: true });
        }
        return;
      }

      const tx = await forward(campaignId);
      console.log('Forward tx:', tx);
      alert(`Funds forwarded! Transaction: ${tx.hash}`);
      await loadCampaign();
      onRefresh?.();
    } catch (error: any) {
      console.error('Forward error:', error);
      alert(`Forward failed: ${error.message}`);
    } finally {
      setForwarding(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading campaign...</div>;
  }

  if (!campaign) {
    return <div className="text-center py-8">Campaign not found</div>;
  }

  const raisedAmount = campaign.totalRaised ? (Number(campaign.totalRaised) / 1e6).toFixed(2) : '0.00';

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="mb-4">
          <h2 className="text-2xl font-bold">{campaign.name}</h2>
          <p className="text-gray-600 mt-2">{campaign.description}</p>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Creator:</span>
            <p className="font-mono text-xs truncate">{campaign.creator}</p>
          </div>
          <div>
            <span className="text-gray-500">Destination ParaID:</span>
            <p className="font-semibold">{campaign.destParaId}</p>
          </div>
          <div>
            <span className="text-gray-500">Total Raised:</span>
            <p className="text-2xl font-bold text-green-600">${raisedAmount} USDC</p>
          </div>
          <div>
            <span className="text-gray-500">Status:</span>
            <p className={`font-semibold ${campaign.forwarded ? 'text-blue-600' : 'text-yellow-600'}`}>
              {campaign.forwarded ? 'Forwarded ✅' : 'Collecting'}
            </p>
          </div>
        </div>

        {!campaign.forwarded && Number(campaign.totalRaised) > 0 && (
          <button
            onClick={handleForward}
            disabled={forwarding}
            className="mt-4 w-full bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {forwarding ? 'Forwarding...' : 'Forward Funds via XCM'}
          </button>
        )}
      </div>

      {memos.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-3">Messages from Supporters</h3>
          <div className="space-y-2">
            {memos.map((memo, index) => (
              <div key={index} className="bg-gray-50 rounded p-3">
                <p className="text-sm">{memo}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {!campaign.forwarded && (
        <TipCampaign campaignId={campaignId} onSuccess={loadCampaign} />
      )}
    </div>
  );
}