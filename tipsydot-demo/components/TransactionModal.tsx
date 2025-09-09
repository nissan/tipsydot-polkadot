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
import { Loader2, CheckCircle, XCircle, DollarSign } from "lucide-react";
import BuilderSelector from "./BuilderSelector";
import {
  useAccount,
  useConnect,
  useDisconnect,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { parseUnits } from "viem";
import { injected } from "wagmi/connectors";
import {
  config,
  MockUSDCABI,
  USDCDonationABI,
  loadDeployedContracts,
} from "@/lib/wagmi-config";
import { toast } from "sonner";

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const donationAmounts = [
  { value: 10, label: "10 USDC" },
  { value: 50, label: "50 USDC" },
  { value: 100, label: "100 USDC" },
];

export default function TransactionModal({
  isOpen,
  onClose,
}: TransactionModalProps) {
  const [selectedBuilder, setSelectedBuilder] = useState(0);
  const [selectedAmount, setSelectedAmount] = useState(10);
  const [step, setStep] = useState<
    "connect" | "select" | "approve" | "donate" | "complete"
  >("connect");
  const [contracts, setContracts] = useState<any>(null);

  const { address, isConnected } = useAccount();
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();

  const {
    data: approveHash,
    writeContract: approve,
    isPending: isApproving,
  } = useWriteContract();
  const {
    data: donateHash,
    writeContract: donate,
    isPending: isDonating,
  } = useWriteContract();

  const { isLoading: isApprovalWaiting, isSuccess: isApprovalSuccess } =
    useWaitForTransactionReceipt({
      hash: approveHash,
    });

  const { isLoading: isDonationWaiting, isSuccess: isDonationSuccess } =
    useWaitForTransactionReceipt({
      hash: donateHash,
    });

  // Load contract addresses
  useEffect(() => {
    loadDeployedContracts().then(setContracts);
  }, []);

  // Update step based on connection status
  useEffect(() => {
    if (isConnected && step === "connect") {
      setStep("select");
    }
  }, [isConnected, step]);

  // Handle approval success
  useEffect(() => {
    if (isApprovalSuccess && step === "approve") {
      handleDonate();
    }
  }, [isApprovalSuccess, step]);

  // Handle donation success
  useEffect(() => {
    if (isDonationSuccess && step === "donate") {
      setStep("complete");
      toast.success("Donation successful! 🎉");

      // Show confetti
      if (typeof window !== "undefined" && (window as any).confetti) {
        (window as any).confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
        });
      }
    }
  }, [isDonationSuccess, step]);

  const handleConnect = async () => {
    try {
      await connect({ connector: injected() });
    } catch (error) {
      toast.error("Failed to connect wallet");
      console.error(error);
    }
  };

  const handleApprove = async () => {
    if (!contracts) {
      toast.error("Contracts not deployed. Run `pnpm deploy:contracts` first.");
      return;
    }

    setStep("approve");

    try {
      await approve({
        address: contracts.mockUSDC as `0x${string}`,
        abi: MockUSDCABI,
        functionName: "approve",
        args: [
          contracts.usdcDonation as `0x${string}`,
          parseUnits(selectedAmount.toString(), 6),
        ],
      });
    } catch (error) {
      toast.error("Approval failed");
      setStep("select");
      console.error(error);
    }
  };

  const handleDonate = async () => {
    if (!contracts) return;

    setStep("donate");

    try {
      await donate({
        address: contracts.usdcDonation as `0x${string}`,
        abi: USDCDonationABI,
        functionName: "donate",
        args: [
          BigInt(selectedBuilder),
          parseUnits(selectedAmount.toString(), 6),
        ],
      });
    } catch (error) {
      toast.error("Donation failed");
      setStep("select");
      console.error(error);
    }
  };

  const handleClose = () => {
    if (step === "complete") {
      setStep("connect");
      setSelectedBuilder(0);
      setSelectedAmount(10);
    }
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Donate USDC to Parachain Builders</DialogTitle>
          <DialogDescription>
            Support underfunded developers building on Polkadot
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Step indicator */}
          <div className="flex justify-between mb-6">
            {["Connect", "Select", "Approve", "Donate", "Complete"].map(
              (s, i) => (
                <div
                  key={s}
                  className={`flex-1 text-center ${
                    [
                      "connect",
                      "select",
                      "approve",
                      "donate",
                      "complete",
                    ].indexOf(step) >= i
                      ? "text-red-600 font-semibold"
                      : "text-gray-400"
                  }`}
                >
                  <div
                    className={`w-8 h-8 mx-auto mb-2 rounded-full flex items-center justify-center ${
                      [
                        "connect",
                        "select",
                        "approve",
                        "donate",
                        "complete",
                      ].indexOf(step) >= i
                        ? "bg-red-600 text-white"
                        : "bg-gray-200"
                    }`}
                  >
                    {i + 1}
                  </div>
                  <span className="text-xs">{s}</span>
                </div>
              ),
            )}
          </div>

          {/* Content based on step */}
          {step === "connect" && !isConnected && (
            <div className="text-center py-8">
              <p className="mb-4">Connect your wallet to continue</p>
              <Button onClick={handleConnect} size="lg">
                Connect MetaMask
              </Button>
            </div>
          )}

          {step === "select" && isConnected && (
            <div className="space-y-6">
              <BuilderSelector
                selectedBuilder={selectedBuilder}
                onSelectBuilder={setSelectedBuilder}
              />

              <div>
                <h3 className="text-lg font-semibold mb-3">Select Amount</h3>
                <div className="grid grid-cols-3 gap-3">
                  {donationAmounts.map((amount) => (
                    <Button
                      key={amount.value}
                      variant={
                        selectedAmount === amount.value ? "default" : "outline"
                      }
                      onClick={() => setSelectedAmount(amount.value)}
                      className={
                        selectedAmount === amount.value
                          ? "bg-red-600 hover:bg-red-700"
                          : ""
                      }
                    >
                      <DollarSign className="h-4 w-4 mr-1" />
                      {amount.label}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={() => disconnect()}>
                  Disconnect
                </Button>
                <Button
                  onClick={handleApprove}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Continue to Approve
                </Button>
              </div>
            </div>
          )}

          {(step === "approve" || step === "donate") && (
            <div className="text-center py-8">
              <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-red-600" />
              <h3 className="text-lg font-semibold mb-2">
                {step === "approve"
                  ? "Approving USDC..."
                  : "Sending Donation..."}
              </h3>
              <p className="text-muted-foreground">
                {step === "approve"
                  ? "Please approve the transaction in your wallet"
                  : `Donating ${selectedAmount} USDC to builder #${selectedBuilder + 1}`}
              </p>
            </div>
          )}

          {step === "complete" && (
            <div className="text-center py-8">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-2">Donation Successful!</h3>
              <p className="text-muted-foreground mb-4">
                You've successfully donated {selectedAmount} USDC
              </p>
              <Badge variant="outline" className="mb-6">
                Transaction Hash: {donateHash?.slice(0, 10)}...
              </Badge>
              <div className="flex justify-center">
                <Button
                  onClick={handleClose}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
