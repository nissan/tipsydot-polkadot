"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Activity, Box, ArrowRight, DollarSign } from "lucide-react";
import {
  papiMonitor,
  formatUSDC,
  truncateAddress,
  type ChainInfo,
  type USDCTransfer,
} from "@/lib/papi-client";

export default function PapiMonitor() {
  const [chainInfo, setChainInfo] = useState<ChainInfo | null>(null);
  const [transfers, setTransfers] = useState<USDCTransfer[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Connect to AssetHub fork
    const connect = async () => {
      try {
        await papiMonitor.connect();
        setIsConnected(true);

        // Get initial chain info
        const info = await papiMonitor.getChainInfo();
        setChainInfo(info);

        // Subscribe to new blocks
        const unsubBlock = papiMonitor.onNewBlock((info) => {
          setChainInfo(info);
        });

        // Subscribe to USDC transfers
        const unsubTransfer = papiMonitor.onUSDCTransfer((transfer) => {
          setTransfers((prev) => [transfer, ...prev].slice(0, 10)); // Keep last 10 transfers
        });

        return () => {
          unsubBlock();
          unsubTransfer();
          papiMonitor.disconnect();
        };
      } catch (err) {
        console.error("Failed to connect to AssetHub:", err);
        setError(
          "Failed to connect to AssetHub fork. Make sure Chopsticks is running.",
        );
      }
    };

    connect();

    return () => {
      papiMonitor.disconnect();
    };
  }, []);

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50 dark:bg-red-950">
        <CardHeader>
          <CardTitle className="text-red-600 dark:text-red-400">
            Connection Error
          </CardTitle>
          <CardDescription>{error}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Chain Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Activity className="h-5 w-5 text-green-500" />
              <CardTitle>AssetHub Monitor</CardTitle>
            </div>
            <Badge variant={isConnected ? "default" : "secondary"}>
              {isConnected ? "Connected" : "Connecting..."}
            </Badge>
          </div>
          <CardDescription>
            Live blockchain activity from Polkadot AssetHub
          </CardDescription>
        </CardHeader>
        {chainInfo && (
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Chain:</span>
                <p className="font-mono">{chainInfo.chain}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Block:</span>
                <p className="font-mono">#{chainInfo.blockNumber}</p>
              </div>
              <div className="col-span-2">
                <span className="text-muted-foreground">Hash:</span>
                <p className="font-mono text-xs break-all">
                  {chainInfo.blockHash}
                </p>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Recent USDC Transfers */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <DollarSign className="h-5 w-5 text-blue-500" />
            <CardTitle>Recent USDC Transfers</CardTitle>
          </div>
          <CardDescription>
            Live feed of USDC movements on AssetHub
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[300px]">
            {transfers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Box className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Waiting for USDC transfers...</p>
                <p className="text-xs mt-2">
                  Donations will appear here in real-time
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {transfers.map((transfer, index) => (
                  <div
                    key={`${transfer.blockNumber}-${index}`}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <ArrowRight className="h-4 w-4 text-green-500" />
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-mono">
                            {truncateAddress(transfer.from)}
                          </span>
                          <ArrowRight className="h-3 w-3" />
                          <span className="text-sm font-mono">
                            {truncateAddress(transfer.to)}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Block #{transfer.blockNumber} •{" "}
                          {transfer.timestamp.toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                    <Badge variant="outline" className="font-mono">
                      {formatUSDC(transfer.amount)}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
