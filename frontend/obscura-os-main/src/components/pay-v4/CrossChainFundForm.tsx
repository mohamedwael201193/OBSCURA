import { useState } from "react";
import { motion } from "framer-motion";
import { Globe2, ArrowRightLeft, CheckCircle2, Loader2, ExternalLink } from "lucide-react";
import { useCrossChainFund, type BridgeStep } from "@/hooks/useCrossChainFund";
import { toast } from "sonner";

const STEP_LABELS: Record<BridgeStep, string> = {
  idle: "",
  "switching-to-sepolia": "Switching wallet to Ethereum Sepolia…",
  "approve-pending": "Confirm USDC approval in your wallet…",
  "approve-confirming": "Waiting for approval to confirm on Sepolia…",
  "burn-pending": "Confirm the burn transaction in your wallet…",
  "burn-confirming": "Burn tx sent — waiting for confirmation on Sepolia…",
  "switching-back": "Switching wallet back to Arbitrum Sepolia…",
  done: "",
};

const STEP_ORDER: BridgeStep[] = [
  "switching-to-sepolia",
  "approve-pending",
  "approve-confirming",
  "burn-pending",
  "burn-confirming",
  "switching-back",
  "done",
];

function StepProgress({ current }: { current: BridgeStep }) {
  if (current === "idle") return null;
  const currentIdx = STEP_ORDER.indexOf(current);
  return (
    <div className="space-y-1.5">
      {STEP_ORDER.filter((s) => s !== "done").map((s, i) => {
        const isDone = i < currentIdx;
        const isActive = s === current;
        return (
          <div key={s} className="flex items-center gap-2">
            {isDone ? (
              <CheckCircle2 className="w-3 h-3 text-green-400 flex-shrink-0" />
            ) : isActive ? (
              <Loader2 className="w-3 h-3 text-primary animate-spin flex-shrink-0" />
            ) : (
              <div className="w-3 h-3 rounded-full border border-border/40 flex-shrink-0" />
            )}
            <span
              className={`text-[9px] font-mono ${
                isDone ? "text-green-400/70" : isActive ? "text-primary" : "text-muted-foreground/40"
              }`}
            >
              {STEP_LABELS[s]}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function CrossChainFundForm() {
  const [amount, setAmount] = useState("");
  const { fund, isPending, step, burnTxHash, error, reset } = useCrossChainFund();

  const submit = async () => {
    if (!amount || Number(amount) <= 0) {
      toast.error("Enter a USDC amount");
      return;
    }
    try {
      await fund({ amountUSDC: amount });
      toast.success("USDC burned! It will arrive on Arb Sepolia in ~15 minutes.");
    } catch (e) {
      toast.error((e as Error).message?.slice(0, 200) ?? "Bridge failed");
    }
  };

  // Success state
  if (step === "done") {
    return (
      <div className="glass-panel rounded-sm p-6 space-y-4">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-green-400" />
          <h3 className="font-display text-sm tracking-wider text-green-400">Bridge Submitted!</h3>
        </div>

        <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-sm space-y-3">
          <p className="text-[11px] font-mono text-green-300">
            Your {amount} USDC has been burned on Ethereum Sepolia.
          </p>
          <p className="text-[10px] font-mono text-muted-foreground/70">
            Circle&apos;s attestation service will mint the USDC on Arbitrum Sepolia.
            This typically takes <span className="text-primary">10–20 minutes</span>.
          </p>
          <p className="text-[10px] font-mono text-muted-foreground/70">
            Once it arrives, go to the <span className="text-primary">Pay</span> tab and
            wrap USDC → cUSDC to use it for encrypted payments.
          </p>
          {burnTxHash && (
            <a
              href={`https://sepolia.etherscan.io/tx/${burnTxHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[9px] font-mono text-cyan-400 hover:text-cyan-300"
            >
              <ExternalLink className="w-3 h-3" />
              View burn tx on Etherscan
            </a>
          )}
        </div>

        <motion.button
          onClick={() => { reset(); setAmount(""); }}
          whileTap={{ scale: 0.99 }}
          className="w-full py-2.5 text-xs tracking-[0.2em] uppercase font-mono bg-secondary/30 text-muted-foreground border border-border/40 rounded-sm hover:bg-secondary/50"
        >
          Bridge More
        </motion.button>
      </div>
    );
  }

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
        Your wallet switches to Sepolia, burns the USDC, and Circle mints it on Arb Sepolia (~15 min).
        Once arrived, wrap USDC → cUSDC using the button on the Pay tab.
      </p>

      {step === "idle" && (
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
      )}

      {step !== "idle" && <StepProgress current={step} />}

      {error && (
        <div className="text-[10px] font-mono text-red-400 p-2 bg-red-500/10 border border-red-500/20 rounded-sm">
          {error.slice(0, 200)}
        </div>
      )}

      <motion.button
        onClick={submit}
        disabled={isPending}
        whileTap={{ scale: 0.99 }}
        className="w-full py-3 text-xs tracking-[0.2em] uppercase font-mono bg-primary text-primary-foreground rounded-sm hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {isPending ? (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Processing…
          </>
        ) : (
          <>
            <ArrowRightLeft className="w-3.5 h-3.5" />
            Bridge USDC
          </>
        )}
      </motion.button>
    </div>
  );
}
