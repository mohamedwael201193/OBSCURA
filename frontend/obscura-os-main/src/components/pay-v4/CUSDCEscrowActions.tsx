import { useState } from "react";
import { motion } from "framer-motion";
import { DollarSign, Unlock } from "lucide-react";
import { useCUSDCEscrow } from "@/hooks/useCUSDCEscrow";
import AsyncStepper from "@/components/shared/AsyncStepper";
import { toast } from "sonner";

export default function CUSDCEscrowActions() {
  const [escrowId, setEscrowId] = useState("");
  const [fundAmount, setFundAmount] = useState("");
  const [escrowExists, setEscrowExists] = useState<boolean | null>(null);

  const { fund, redeem, checkExists, txHash, isTxPending, status, stepIndex } = useCUSDCEscrow();

  const isProcessing = status !== "idle" && status !== "ready" && status !== "error";

  const handleCheckExists = async () => {
    if (!escrowId) return;
    try {
      const exists = await checkExists(BigInt(escrowId));
      setEscrowExists(exists);
    } catch {
      setEscrowExists(null);
    }
  };

  const handleFund = async () => {
    if (!escrowId || !fundAmount || Number(fundAmount) <= 0) {
      toast.error("Enter escrow ID and amount");
      return;
    }
    try {
      await fund(BigInt(escrowId), BigInt(Math.floor(Number(fundAmount))));
      toast.success("Escrow funded with encrypted cUSDC");
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
      await redeem(BigInt(escrowId));
      toast.success("Escrow redemption submitted");
    } catch (err) {
      toast.error((err as Error).message || "Redeem failed");
    }
  };

  return (
    <div className="glass-panel rounded-sm p-6 space-y-4">
      <div className="flex items-center gap-2">
        <DollarSign className="w-4 h-4 text-cyan-400" />
        <h3 className="font-display text-sm tracking-wider text-foreground">
          Escrow Actions
        </h3>
        <span className="ml-auto text-[8px] font-mono bg-cyan-500/10 text-cyan-400 px-2 py-0.5 rounded-sm border border-cyan-500/20">
          cUSDC
        </span>
      </div>

      <p className="text-[10px] font-mono text-muted-foreground/70">
        Fund or redeem existing cUSDC escrows. Redemption uses the silent failure pattern —
        if you're not the rightful owner, the transaction succeeds but returns zero (no information leak).
      </p>

      <div className="space-y-3">
        <div>
          <label className="text-[9px] font-mono text-muted-foreground tracking-[0.15em] uppercase block mb-1.5">
            Escrow ID
          </label>
          <div className="flex gap-2">
            <input
              type="number"
              placeholder="e.g. 0"
              value={escrowId}
              onChange={(e) => {
                setEscrowId(e.target.value);
                setEscrowExists(null);
              }}
              className="flex-1 px-3 py-2 bg-background border border-border/50 rounded-sm text-xs font-mono text-foreground placeholder:text-muted-foreground/30 focus:border-cyan-500/40 focus:outline-none"
            />
            <motion.button
              onClick={handleCheckExists}
              disabled={!escrowId}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="px-3 py-2 text-[9px] tracking-[0.1em] uppercase font-mono border border-border/50 text-muted-foreground rounded-sm hover:text-foreground hover:border-cyan-500/40 disabled:opacity-30 transition-all"
            >
              Check
            </motion.button>
          </div>
        </div>

        {escrowExists !== null && (
          <div className="flex items-center gap-2 text-[9px] font-mono px-3 py-2 bg-secondary/30 rounded-sm border border-border/30">
            <span className={`w-1.5 h-1.5 rounded-full ${escrowExists ? "bg-green-400" : "bg-red-400"}`} />
            <span className="text-muted-foreground">
              {escrowExists ? "Active" : "Not found"}
            </span>
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
              placeholder="Amount (cUSDC)"
              value={fundAmount}
              onChange={(e) => setFundAmount(e.target.value)}
              className="flex-1 px-3 py-1.5 bg-background border border-border/50 rounded-sm text-xs font-mono text-foreground placeholder:text-muted-foreground/30 focus:border-cyan-500/40 focus:outline-none"
            />
            <motion.button
              onClick={handleFund}
              disabled={isProcessing || isTxPending || escrowExists === false}
              whileHover={!isProcessing ? { scale: 1.02 } : {}}
              whileTap={!isProcessing ? { scale: 0.98 } : {}}
              className="px-4 py-1.5 text-[9px] tracking-[0.15em] uppercase font-mono bg-cyan-600 text-white rounded-sm hover:bg-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Fund
            </motion.button>
          </div>
        </div>

        {/* Redeem section */}
        <div className="p-3 bg-secondary/20 rounded-sm border border-border/20 space-y-2">
          <div className="text-[9px] font-mono text-muted-foreground tracking-[0.15em] uppercase">
            Redeem Escrow
          </div>
          <p className="text-[8px] font-mono text-muted-foreground/50">
            Only the encrypted owner can redeem. Unauthorized attempts succeed silently but return zero.
          </p>
          <motion.button
            onClick={handleRedeem}
            disabled={isProcessing || isTxPending || !escrowId}
            whileHover={!isProcessing ? { scale: 1.02 } : {}}
            whileTap={!isProcessing ? { scale: 0.98 } : {}}
            className="px-4 py-1.5 text-[9px] tracking-[0.15em] uppercase font-mono border border-cyan-500/30 text-cyan-400 rounded-sm hover:bg-cyan-500/10 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
          >
            <Unlock className="w-3 h-3" />
            Redeem
          </motion.button>
        </div>
      </div>

      {status !== "idle" && (
        <div className="pt-1">
          <AsyncStepper status={status} stepIndex={stepIndex} />
        </div>
      )}

      {txHash && (
        <div className="text-[9px] font-mono text-muted-foreground/60 text-center">
          TX:{" "}
          <a href={`https://sepolia.arbiscan.io/tx/${txHash}`} target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">
            {txHash.slice(0, 10)}...{txHash.slice(-8)}
          </a>
        </div>
      )}
    </div>
  );
}
