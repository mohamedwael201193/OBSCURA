import { useState } from "react";
import { motion } from "framer-motion";
import { DollarSign, Lock, Unlock, XCircle } from "lucide-react";
import { useConfidentialEscrow } from "@/hooks/useConfidentialEscrow";
import { useReadContract } from "wagmi";
import { OBSCURA_ESCROW_ABI, OBSCURA_ESCROW_ADDRESS } from "@/config/contracts";
import AsyncStepper from "@/components/shared/AsyncStepper";
import { toast } from "sonner";

export default function EscrowActions() {
  const [escrowId, setEscrowId] = useState("");
  const [fundAmount, setFundAmount] = useState("");
  const { fundEscrow, redeemEscrow, cancelEscrow, txHash, isTxPending, status, stepIndex } =
    useConfidentialEscrow();

  const id = escrowId ? BigInt(escrowId) : undefined;

  // Read escrow existence
  const { data: escrowExists } = useReadContract({
    address: OBSCURA_ESCROW_ADDRESS,
    abi: OBSCURA_ESCROW_ABI,
    functionName: "exists",
    args: id !== undefined ? [id] : undefined,
    query: { enabled: !!OBSCURA_ESCROW_ADDRESS && id !== undefined },
  });

  // Read creator
  const { data: escrowCreator } = useReadContract({
    address: OBSCURA_ESCROW_ADDRESS,
    abi: OBSCURA_ESCROW_ABI,
    functionName: "getEscrowCreator",
    args: id !== undefined ? [id] : undefined,
    query: { enabled: !!OBSCURA_ESCROW_ADDRESS && id !== undefined },
  });

  const isProcessing = status !== "idle" && status !== "ready" && status !== "error";

  const handleFund = async () => {
    if (!escrowId || !fundAmount || Number(fundAmount) <= 0) {
      toast.error("Enter escrow ID and amount");
      return;
    }
    try {
      await fundEscrow(BigInt(escrowId), BigInt(Math.floor(Number(fundAmount))));
      toast.success("Escrow funded with encrypted payment");
      setFundAmount("");
    } catch (err) {
      toast.error((err as Error).message || "Fund failed");
    }
  };

  const handleRedeem = async () => {
    if (!escrowId) {
      toast.error("Enter escrow ID");
      return;
    }
    try {
      await redeemEscrow(BigInt(escrowId));
      toast.success("Escrow redemption attempted (silent failure pattern)");
    } catch (err) {
      toast.error((err as Error).message || "Redeem failed");
    }
  };

  const handleCancel = async () => {
    if (!escrowId) {
      toast.error("Enter escrow ID");
      return;
    }
    try {
      await cancelEscrow(BigInt(escrowId));
      toast.success("Escrow cancelled");
    } catch (err) {
      toast.error((err as Error).message || "Cancel failed");
    }
  };

  return (
    <div className="glass-panel rounded-sm p-6 space-y-4">
      <div className="flex items-center gap-2">
        <DollarSign className="w-4 h-4 text-primary" />
        <h3 className="font-display text-sm tracking-wider text-foreground">
          Escrow Actions
        </h3>
      </div>

      <p className="text-[10px] font-mono text-muted-foreground/70">
        Fund, redeem, or cancel existing escrows. Redemption uses the silent failure pattern —
        if you’re not the rightful owner, the transaction goes through but returns zero tokens (no error, no leak).
      </p>

      <div className="space-y-3">
        <div>
          <label className="text-[9px] font-mono text-muted-foreground tracking-[0.15em] uppercase block mb-1.5">
            Escrow ID
          </label>
          <input
            type="number"
            placeholder="e.g. 0"
            value={escrowId}
            onChange={(e) => setEscrowId(e.target.value)}
            className="w-full px-3 py-2 bg-background border border-border/50 rounded-sm text-xs font-mono text-foreground placeholder:text-muted-foreground/30 focus:border-primary/40 focus:outline-none"
          />
        </div>

        {/* Escrow status indicator */}
        {id !== undefined && (
          <div className="flex items-center gap-2 text-[9px] font-mono px-3 py-2 bg-secondary/30 rounded-sm border border-border/30">
            <span className={`w-1.5 h-1.5 rounded-full ${escrowExists ? "bg-green-400" : "bg-red-400"}`} />
            <span className="text-muted-foreground">
              {escrowExists ? "Active" : "Not found"}
            </span>
            {escrowCreator && (
              <span className="text-muted-foreground/60 ml-auto">
                Creator: {(escrowCreator as string).slice(0, 6)}...{(escrowCreator as string).slice(-4)}
              </span>
            )}
          </div>
        )}

        {/* Fund section */}
        <div className="p-3 bg-secondary/20 rounded-sm border border-border/20 space-y-2">
          <div className="text-[9px] font-mono text-muted-foreground tracking-[0.15em] uppercase">
            Fund Escrow
          </div>
          <div className="flex gap-2">
            <input
              type="number"
              placeholder="Amount to fund"
              value={fundAmount}
              onChange={(e) => setFundAmount(e.target.value)}
              className="flex-1 px-3 py-1.5 bg-background border border-border/50 rounded-sm text-xs font-mono text-foreground placeholder:text-muted-foreground/30 focus:border-primary/40 focus:outline-none"
            />
            <motion.button
              onClick={handleFund}
              disabled={isProcessing || isTxPending || !escrowExists}
              whileHover={!isProcessing ? { scale: 1.02 } : {}}
              whileTap={!isProcessing ? { scale: 0.98 } : {}}
              className="px-4 py-1.5 text-[9px] tracking-[0.15em] uppercase font-mono bg-primary text-primary-foreground rounded-sm hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Fund
            </motion.button>
          </div>
        </div>
      </div>

      {status !== "idle" && (
        <div className="pt-1">
          <AsyncStepper status={status} stepIndex={stepIndex} />
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-3">
        <motion.button
          onClick={handleRedeem}
          disabled={isProcessing || isTxPending || !escrowExists}
          whileHover={!isProcessing ? { scale: 1.01 } : {}}
          whileTap={!isProcessing ? { scale: 0.99 } : {}}
          className="flex-1 py-2.5 text-xs tracking-[0.2em] uppercase font-mono border border-primary/40 text-primary hover:bg-primary/10 transition-all rounded-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <Unlock className="w-3.5 h-3.5" />
          Redeem
        </motion.button>
        <motion.button
          onClick={handleCancel}
          disabled={isProcessing || isTxPending || !escrowExists}
          whileHover={!isProcessing ? { scale: 1.01 } : {}}
          whileTap={!isProcessing ? { scale: 0.99 } : {}}
          className="flex-1 py-2.5 text-xs tracking-[0.2em] uppercase font-mono border border-red-400/30 text-red-400 hover:bg-red-400/10 transition-all rounded-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <XCircle className="w-3.5 h-3.5" />
          Cancel
        </motion.button>
      </div>

      {txHash && (
        <div className="text-[9px] font-mono text-muted-foreground/60 text-center">
          TX:{" "}
          <a
            href={`https://sepolia.arbiscan.io/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            {txHash.slice(0, 10)}...{txHash.slice(-8)}
          </a>
        </div>
      )}

      <div className="mt-2 p-3 bg-secondary/10 rounded-sm border border-border/20">
        <div className="text-[9px] font-mono text-muted-foreground/50">
          <Lock className="w-3 h-3 inline mr-1 text-primary/40" />
          Silent failure: If you're not the owner, or escrow isn't funded, redeem returns 0 tokens
          without reverting — indistinguishable from success on-chain.
        </div>
      </div>
    </div>
  );
}
