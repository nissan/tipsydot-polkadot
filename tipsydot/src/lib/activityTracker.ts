import { OnChainActivity } from '@/components/ActivitySheet';

class ActivityTracker {
  private activities: OnChainActivity[] = [];
  private listeners: ((activities: OnChainActivity[]) => void)[] = [];
  private idCounter = 0;

  // Subscribe to activity updates
  subscribe(listener: (activities: OnChainActivity[]) => void) {
    this.listeners.push(listener);
    // Immediately call with current activities
    listener(this.activities);
    
    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  // Notify all listeners of updates
  private notify() {
    this.listeners.forEach(listener => listener(this.activities));
  }

  // Add a new activity
  addActivity(activity: Omit<OnChainActivity, 'id' | 'timestamp'>): OnChainActivity {
    const newActivity: OnChainActivity = {
      ...activity,
      id: `activity-${++this.idCounter}`,
      timestamp: new Date(),
    };
    
    this.activities = [newActivity, ...this.activities];
    this.notify();
    return newActivity;
  }

  // Update an existing activity
  updateActivity(id: string, updates: Partial<OnChainActivity>) {
    this.activities = this.activities.map(activity => 
      activity.id === id ? { ...activity, ...updates } : activity
    );
    this.notify();
  }

  // Track an XCM transfer
  trackXcmTransfer(params: {
    from: string;
    to: string;
    amount: string;
    asset: string;
    destinationChain: string;
    encoded?: string;
  }) {
    return this.addActivity({
      type: 'XCM_TRANSFER',
      status: 'pending',
      from: params.from,
      to: params.to,
      amount: params.amount,
      asset: params.asset,
      xcmMessage: params.encoded ? {
        encoded: params.encoded,
        decoded: {
          method: 'reserve_transfer_assets',
          destination: params.destinationChain,
          beneficiary: params.to,
          assets: [{
            id: params.asset,
            amount: params.amount
          }],
          fee: '0.001 ' + params.asset
        }
      } : undefined,
      explanation: `Initiating XCM reserve transfer of ${params.amount} ${params.asset} to ${params.destinationChain}. Assets will be locked on the source chain and corresponding tokens minted on destination.`
    });
  }

  // Track a swap
  trackSwap(params: {
    fromToken: string;
    toToken: string;
    fromAmount: string;
    toAmount: string;
    address: string;
  }) {
    return this.addActivity({
      type: 'SWAP',
      status: 'pending',
      from: params.address,
      amount: `${params.fromAmount} ${params.fromToken} → ${params.toAmount} ${params.toToken}`,
      asset: params.fromToken,
      explanation: `Swapping ${params.fromAmount} ${params.fromToken} for approximately ${params.toAmount} ${params.toToken} using AMM liquidity pools.`
    });
  }

  // Track a tip
  trackTip(params: {
    from: string;
    campaignId: number;
    amount: string;
    message?: string;
  }) {
    return this.addActivity({
      type: 'TIP',
      status: 'pending',
      from: params.from,
      to: `Campaign #${params.campaignId}`,
      amount: params.amount,
      asset: 'USDP',
      explanation: `Tipping ${params.amount} USDP to Campaign #${params.campaignId}. ${params.message ? `Message: "${params.message}"` : ''} A 0.1% protocol fee supports the treasury.`
    });
  }

  // Track NFT mint
  trackNftMint(params: {
    recipient: string;
    tokenId?: string;
    traits?: Record<string, any>;
  }) {
    return this.addActivity({
      type: 'NFT_MINT',
      status: 'pending',
      to: params.recipient,
      explanation: `Minting dynamic TipCard NFT${params.tokenId ? ` #${params.tokenId}` : ''}. Traits are generated based on tip amount and current blockchain metrics.`
    });
  }

  // Track bridge operation
  trackBridge(params: {
    from: string;
    fromChain: string;
    toChain: string;
    amount: string;
    asset: string;
  }) {
    return this.addActivity({
      type: 'BRIDGE',
      status: 'pending',
      from: params.from,
      amount: params.amount,
      asset: params.asset,
      explanation: `Bridging ${params.amount} ${params.asset} from ${params.fromChain} to ${params.toChain} using burn/mint mechanism.`
    });
  }

  // Get all activities
  getActivities(): OnChainActivity[] {
    return this.activities;
  }

  // Clear all activities
  clearActivities() {
    this.activities = [];
    this.notify();
  }
}

// Create singleton instance
export const activityTracker = new ActivityTracker();