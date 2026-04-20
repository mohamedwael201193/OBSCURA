import { useState } from "react";
import { motion } from "framer-motion";
import { Globe2, ArrowRightLeft } from "lucide-react";
import { useCrossChainFund } from "@/hooks/useCrossChainFund";
import { toast } from "sonner";

export default function CrossChainFundForm() {
  const [amount, setAmount] = useState("");
  const { fund, isPending, step } = useCrossChainFund();

  const submit = async () => {
    if (!amount || Number(amount) <= 0) {
      toast.error("Enter a USDC amount");
      return;
    }
    try {
      const hash = await fund({ amountUSDC: amount });
      toast.success(`Burn submitted on Sepolia: ${hash.slice(0, 10)}…`);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <div className="glass-panel rounded-sm p-6 space-y-4">
      <div className="flex items-center gap-2">
        <Globe2 className="w-4 h-4 text-primary" />
        <h3 className="font-display text-sm tracking-wider text-foreground">Bridge USDC From Ethereum</h3>
        <span className="ml-auto text-[8px] font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-sm border border-cyan-500/20">
          CCTP · BRIDGE
        </span>
      </div>

      <p className="text-[10px] font-mono text-muted-foreground/70">
        Bridge USDC from Ethereum Sepolia to your address on Arbitrum Sepolia via Circle&apos;s CCTP.
        Your wallet switches to Sepolia, burns the USDC, and Circle mints it on Arb Sepolia (takes a few minutes).
        Once arrived, wrap USDC → cUSDC using the button above.
      </p>

      <div className="space-y-3">
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
        {isPending ? "Burning…" : "Bridge USDC"}
      </motion.button>
    </div>
  );
}
