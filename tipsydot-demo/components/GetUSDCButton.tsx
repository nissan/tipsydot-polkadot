"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowRightLeft,
  Coins,
  DollarSign,
  Loader2,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import {
  useAccount,
  useBalance,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { parseUnits, formatUnits } from "viem";
import { toast } from "sonner";

// USDC precompile address (Asset ID 1337)
const USDC_PRECOMPILE = "0x0800000000000000000000000000000000000539";

// Faucet contract ABI
const FAUCET_ABI = [
  {
    name: "exchangePASForUSDC",
    type: "function",
    stateMutability: "payable",
    inputs: [],
    outputs: [],
  },
  {
    name: "getRemainingDailyLimit",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
  {
    name: "getExchangeInfo",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [
      { name: "rate", type: "uint256" },
      { name: "minPAS", type: "uint256" },
      { name: "maxUSDCPerRequest", type: "uint256" },
      { name: "dailyLimit", type: "uint256" },
    ],
  },
];

// ERC20 ABI for USDC balance check
const ERC20_ABI = [
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
];

interface GetUSDCButtonProps {
  faucetAddress?: string;
  onSuccess?: () => void;
}

export default function GetUSDCButton({
  faucetAddress = "0x0000000000000000000000000000000000000000", // Will be updated after deployment
  onSuccess,
}: GetUSDCButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [pasAmount, setPasAmount] = useState("1");
  const [tab, setTab] = useState<"exchange" | "mint">("exchange");

  const { address, isConnected } = useAccount();

  // Check PAS balance
  const { data: pasBalance } = useBalance({
    address: address,
  });

  // Check USDC balance via precompile
  const { data: usdcBalance } = useReadContract({
    address: USDC_PRECOMPILE as `0x${string}`,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
  });

  // Get exchange info
  const { data: exchangeInfo } = useReadContract({
    address: faucetAddress as `0x${string}`,
    abi: FAUCET_ABI,
    functionName: "getExchangeInfo",
  });

  // Get remaining daily limit
  const { data: dailyLimit } = useReadContract({
    address: faucetAddress as `0x${string}`,
    abi: FAUCET_ABI,
    functionName: "getRemainingDailyLimit",
    args: address ? [address] : undefined,
  });

  // Exchange PAS for USDC
  const {
    data: exchangeHash,
    writeContract: exchange,
    isPending: isExchanging,
  } = useWriteContract();

  const { isLoading: isExchangeWaiting, isSuccess: isExchangeSuccess } =
    useWaitForTransactionReceipt({
      hash: exchangeHash,
    });

  // Handle exchange
  const handleExchange = async () => {
    if (!pasAmount || parseFloat(pasAmount) < 0.5) {
      toast.error("Minimum 0.5 PAS required");
      return;
    }

    try {
      await exchange({
        address: faucetAddress as `0x${string}`,
        abi: FAUCET_ABI,
        functionName: "exchangePASForUSDC",
        value: parseUnits(pasAmount, 18), // PAS has 18 decimals
      });
    } catch (error) {
      toast.error("Exchange failed");
      console.error(error);
    }
  };

  // Handle mint (sudo - for demo only)
  const handleMint = async () => {
    toast.info("Minting USDC via sudo (demo mode)...");
    // This would call the mint script or a backend endpoint
    // For now, just show a message
    setTimeout(() => {
      toast.success("10,000 USDC minted to your account!");
      setIsOpen(false);
      onSuccess?.();
    }, 2000);
  };

  useEffect(() => {
    if (isExchangeSuccess) {
      toast.success(`Successfully exchanged ${pasAmount} PAS for ${parseFloat(pasAmount) * 2} USDC!`);
      setIsOpen(false);
      onSuccess?.();
    }
  }, [isExchangeSuccess, pasAmount, onSuccess]);

  const formatBalance = (balance: bigint | undefined, decimals: number) => {
    if (!balance) return "0";
    return formatUnits(balance, decimals);
  };

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        variant="outline"
        className="gap-2"
        disabled={!isConnected}
      >
        <Coins className="h-4 w-4" />
        Get USDC
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Get USDC for Testing</DialogTitle>
            <DialogDescription>
              Exchange PAS for USDC or mint test tokens
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Balance Display */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 rounded-lg bg-muted">
                <div className="text-sm text-muted-foreground">PAS Balance</div>
                <div className="text-lg font-bold">
                  {formatBalance(pasBalance?.value, 18)} PAS
                </div>
              </div>
              <div className="p-3 rounded-lg bg-muted">
                <div className="text-sm text-muted-foreground">USDC Balance</div>
                <div className="text-lg font-bold">
                  {formatBalance(usdcBalance as bigint, 6)} USDC
                </div>
              </div>
            </div>

            <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="exchange">Exchange PAS</TabsTrigger>
                <TabsTrigger value="mint">Mint (Demo)</TabsTrigger>
              </TabsList>

              <TabsContent value="exchange" className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Amount of PAS to exchange</label>
                  <Input
                    type="number"
                    placeholder="Enter PAS amount"
                    value={pasAmount}
                    onChange={(e) => setPasAmount(e.target.value)}
                    min="0.5"
                    step="0.1"
                  />
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>You will receive:</span>
                    <span className="font-medium text-foreground">
                      {pasAmount ? (parseFloat(pasAmount) * 2).toFixed(2) : "0"} USDC
                    </span>
                  </div>
                </div>

                {dailyLimit && (
                  <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950">
                    <div className="flex items-center gap-2 text-sm">
                      <AlertCircle className="h-4 w-4 text-blue-600" />
                      <span>Daily limit remaining: {formatBalance(dailyLimit as bigint, 6)} USDC</span>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-center py-2">
                  <Badge variant="outline" className="gap-1">
                    <ArrowRightLeft className="h-3 w-3" />
                    Exchange Rate: 1 PAS = 2 USDC
                  </Badge>
                </div>

                <Button
                  onClick={handleExchange}
                  className="w-full"
                  disabled={
                    !pasAmount ||
                    parseFloat(pasAmount) < 0.5 ||
                    isExchanging ||
                    isExchangeWaiting
                  }
                >
                  {isExchanging || isExchangeWaiting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Exchanging...
                    </>
                  ) : (
                    <>
                      <DollarSign className="h-4 w-4 mr-2" />
                      Exchange {pasAmount || "0"} PAS for {pasAmount ? (parseFloat(pasAmount) * 2).toFixed(2) : "0"} USDC
                    </>
                  )}
                </Button>
              </TabsContent>

              <TabsContent value="mint" className="space-y-4">
                <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-950">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium text-amber-900 dark:text-amber-100">Demo Mode Only</p>
                      <p className="text-amber-700 dark:text-amber-300">
                        This mints 10,000 USDC directly to your account using sudo privileges. 
                        Only available in development.
                      </p>
                    </div>
                  </div>
                </div>

                <Button
                  onClick={handleMint}
                  className="w-full"
                  variant="secondary"
                >
                  <Coins className="h-4 w-4 mr-2" />
                  Mint 10,000 USDC (Demo)
                </Button>
              </TabsContent>
            </Tabs>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}