import { useState } from "react";
import { motion } from "framer-motion";
import { Globe2, ArrowRightLeft } from "lucide-react";
import { useCrossChainFund } from "@/hooks/useCrossChainFund";
import { toast } from "sonner";

export default function CrossChainFundForm() {
  const [escrowId, setEscrowId] = useState("");
  const [amount, setAmount] = useState("");
  const { fund, isPending, step } = useCrossChainFund();

  const submit = async () => {
    const id = BigInt(escrowId || "0");
    if (id === 0n) {
      toast.error("Enter a valid escrow id");
      return;
    }
    if (!amount || Number(amount) <= 0) {
      toast.error("Enter a USDC amount");
      return;
    }
    try {
      const hash = await fund({ escrowId: id, amountUSDC: amount });
      toast.success(`Burn submitted on Sepolia: ${hash.slice(0, 10)}…`);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <div className="glass-panel rounded-sm p-6 space-y-4">
      <div className="flex items-center gap-2">
        <Globe2 className="w-4 h-4 text-primary" />
        <h3 className="font-display text-sm tracking-wider text-foreground">Send USDC From Ethereum</h3>
        <span className="ml-auto text-[8px] font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-sm border border-cyan-500/20">
          CCTP V2 · AUTO-BRIDGE
        </span>
      </div>

      <p className="text-[10px] font-mono text-muted-foreground/70">
        Send USDC from Ethereum Sepolia directly into an Obscura escrow. Your wallet will switch to Sepolia,
        burn the USDC, and Circle&apos;s bridge delivers it as encrypted cUSDC on Arbitrum — all in one click.
      </p>

      <div className="space-y-3">
        <div>
          <label className="text-[9px] font-mono text-muted-foreground tracking-[0.15em] uppercase block mb-1.5">
            Destination Escrow ID
          </label>
          <input
            type="number"
            value={escrowId}
            onChange={(e) => setEscrowId(e.target.value)}
            placeholder="123"
            className="w-full px-3 py-2 bg-background border border-border/50 rounded-sm text-xs font-mono"
          />
        </div>
        <div>
          <label className="text-[9px] font-mono text-muted-foreground tracking-[0.15em] uppercase block mb-1.5">
            USDC Amount (Sepolia)
          </label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="100"
            className="w-full px-3 py-2 bg-background border border-border/50 rounded-sm text-xs font-mono"
          />
        </div>
      </div>

      {step !== "idle" && (
        <div className="text-[10px] font-mono text-primary">Step: {step}</div>
      )}

      <motion.button
        onClick={submit}
        disabled={isPending}
        whileTap={{ scale: 0.99 }}
        className="w-full py-3 text-xs tracking-[0.2em] uppercase font-mono bg-primary text-primary-foreground rounded-sm hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2"
      >
        <ArrowRightLeft className="w-3.5 h-3.5" />
        {isPending ? "Burning…" : "Burn & Fund"}
      </motion.button>
    </div>
  );
}
