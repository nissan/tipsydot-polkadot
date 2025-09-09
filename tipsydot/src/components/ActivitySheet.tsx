import { useState, useEffect } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Activity, ChevronRight, Copy, CheckCircle, XCircle, Clock, Info } from 'lucide-react';

export interface OnChainActivity {
  id: string;
  timestamp: Date;
  type: 'XCM_TRANSFER' | 'SWAP' | 'TIP' | 'NFT_MINT' | 'BRIDGE';
  status: 'pending' | 'success' | 'failed';
  from?: string;
  to?: string;
  amount?: string;
  asset?: string;
  txHash?: string;
  xcmMessage?: {
    encoded: string;
    decoded: {
      method: string;
      destination?: string;
      beneficiary?: string;
      assets?: any[];
      fee?: string;
    };
  };
  explanation?: string;
}

interface ActivitySheetProps {
  activities: OnChainActivity[];
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function ActivitySheet({ activities, isOpen, onOpenChange }: ActivitySheetProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedActivity, setExpandedActivity] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getStatusIcon = (status: OnChainActivity['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-destructive" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500 animate-pulse" />;
    }
  };

  const getActivityIcon = (type: OnChainActivity['type']) => {
    switch (type) {
      case 'XCM_TRANSFER':
        return '🌉';
      case 'SWAP':
        return '🔄';
      case 'TIP':
        return '💸';
      case 'NFT_MINT':
        return '🎨';
      case 'BRIDGE':
        return '🌐';
      default:
        return '📊';
    }
  };

  const getIntelligentExplanation = (activity: OnChainActivity): string => {
    if (activity.explanation) return activity.explanation;

    switch (activity.type) {
      case 'XCM_TRANSFER':
        return `Cross-chain transfer of ${activity.amount} ${activity.asset} using XCM reserve transfer pattern. Assets are locked on source chain and minted on destination.`;
      case 'SWAP':
        return `Token swap executed on-chain. Exchanged tokens using automated market maker (AMM) liquidity pools.`;
      case 'TIP':
        return `Tip transaction to support a parachain project. Includes 0.1% protocol fee for treasury sustainability.`;
      case 'NFT_MINT':
        return `Dynamic NFT minted with traits based on tip amount and blockchain metrics at time of minting.`;
      case 'BRIDGE':
        return `Asset bridge operation between chains. Using burn/mint mechanism for efficient cross-chain transfers.`;
      default:
        return 'On-chain activity recorded';
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Activity className="h-5 w-5" />
          {activities.filter(a => a.status === 'pending').length > 0 && (
            <span className="absolute -top-1 -right-1 h-3 w-3 bg-primary rounded-full animate-pulse" />
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[450px] sm:w-[540px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>On-Chain Activity</SheetTitle>
          <SheetDescription>
            Track your transactions and XCM operations in real-time
          </SheetDescription>
        </SheetHeader>
        
        <div className="mt-6 space-y-4">
          {activities.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No on-chain activity yet. Start by making a transaction!
            </div>
          ) : (
            activities.map((activity) => (
              <div
                key={activity.id}
                className="border rounded-lg p-4 space-y-3 hover:bg-accent/5 transition-colors"
              >
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{getActivityIcon(activity.type)}</span>
                    <div>
                      <p className="font-medium">{activity.type.replace(/_/g, ' ')}</p>
                      <p className="text-xs text-muted-foreground">
                        {activity.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                  {getStatusIcon(activity.status)}
                </div>

                {/* Basic Info */}
                <div className="space-y-1 text-sm">
                  {activity.amount && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Amount:</span>
                      <span className="font-mono">{activity.amount} {activity.asset}</span>
                    </div>
                  )}
                  {activity.from && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">From:</span>
                      <span className="font-mono text-xs">{activity.from.slice(0, 10)}...</span>
                    </div>
                  )}
                  {activity.to && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">To:</span>
                      <span className="font-mono text-xs">{activity.to.slice(0, 10)}...</span>
                    </div>
                  )}
                  {activity.txHash && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">TX Hash:</span>
                      <div className="flex items-center gap-1">
                        <span className="font-mono text-xs">{activity.txHash.slice(0, 10)}...</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => copyToClipboard(activity.txHash!, activity.id)}
                        >
                          {copiedId === activity.id ? (
                            <CheckCircle className="h-3 w-3 text-green-500" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Intelligent Explanation */}
                <div className="bg-muted/50 rounded p-3 space-y-2">
                  <div className="flex items-start gap-2">
                    <Info className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <p className="text-sm text-muted-foreground">
                      {getIntelligentExplanation(activity)}
                    </p>
                  </div>
                </div>

                {/* XCM Details (if applicable) */}
                {activity.xcmMessage && (
                  <div className="space-y-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-between"
                      onClick={() => setExpandedActivity(
                        expandedActivity === activity.id ? null : activity.id
                      )}
                    >
                      <span className="text-sm">XCM Message Details</span>
                      <ChevronRight 
                        className={`h-4 w-4 transition-transform ${
                          expandedActivity === activity.id ? 'rotate-90' : ''
                        }`}
                      />
                    </Button>
                    
                    {expandedActivity === activity.id && (
                      <div className="space-y-3 pl-4 border-l-2 border-border">
                        {/* Decoded Parameters */}
                        <div className="space-y-2">
                          <p className="text-xs font-semibold text-muted-foreground">Decoded Parameters:</p>
                          <div className="bg-background rounded p-2 space-y-1 text-xs">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Method:</span>
                              <span className="font-mono">{activity.xcmMessage.decoded.method}</span>
                            </div>
                            {activity.xcmMessage.decoded.destination && (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Destination:</span>
                                <span className="font-mono">{activity.xcmMessage.decoded.destination}</span>
                              </div>
                            )}
                            {activity.xcmMessage.decoded.beneficiary && (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Beneficiary:</span>
                                <span className="font-mono text-xs">
                                  {activity.xcmMessage.decoded.beneficiary.slice(0, 10)}...
                                </span>
                              </div>
                            )}
                            {activity.xcmMessage.decoded.fee && (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Fee:</span>
                                <span className="font-mono">{activity.xcmMessage.decoded.fee}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Encoded Message */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-semibold text-muted-foreground">Encoded Message:</p>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => copyToClipboard(activity.xcmMessage!.encoded, `${activity.id}-encoded`)}
                            >
                              {copiedId === `${activity.id}-encoded` ? (
                                <CheckCircle className="h-3 w-3 text-green-500" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </Button>
                          </div>
                          <div className="bg-background rounded p-2">
                            <code className="text-xs font-mono break-all text-muted-foreground">
                              {activity.xcmMessage.encoded.slice(0, 100)}...
                            </code>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}