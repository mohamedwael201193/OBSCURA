import { useState } from "react";
import { motion } from "framer-motion";
import { Globe2, ArrowRightLeft, CheckCircle2, Loader2, ExternalLink, RotateCcw, Copy, AlertTriangle } from "lucide-react";
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
  "waiting-attestation": "Waiting for Circle attestation (this takes a few minutes)…",
  "ready-to-claim": "Attestation received! Click below to claim your USDC.",
  "claiming": "Confirm claim transaction — minting USDC on Arb Sepolia…",
  done: "",
};

const STEP_ORDER: BridgeStep[] = [
  "switching-to-sepolia",
  "approve-pending",
  "approve-confirming",
  "burn-pending",
  "burn-confirming",
  "switching-back",
  "waiting-attestation",
  "ready-to-claim",
  "claiming",
  "done",
];

/** Small banner showing the burn tx hash with copy + etherscan link */
function BurnTxBanner({ hash }: { hash: string }) {
  const short = `${hash.slice(0, 10)}…${hash.slice(-8)}`;
  return (
    <div className="flex items-center gap-2 p-2 bg-cyan-500/10 border border-cyan-500/20 rounded-md">
      <ExternalLink className="w-3 h-3 text-cyan-400 flex-shrink-0" />
      <a
        href={`https://sepolia.etherscan.io/tx/${hash}`}
        target="_blank"
        rel="noopener noreferrer"
        className="font-mono text-xs text-cyan-400 hover:text-cyan-300 truncate"
      >
        {short}
      </a>
      <button
        onClick={() => { navigator.clipboard.writeText(hash); toast.success("Tx hash copied!"); }}
        className="ml-auto text-muted-foreground/50 hover:text-muted-foreground flex-shrink-0"
      >
        <Copy className="w-3 h-3" />
      </button>
      <span className="text-[11px] text-muted-foreground/40 flex-shrink-0">SAVE THIS</span>
    </div>
  );
}

function StepProgress({ current, attestationProgress }: { current: BridgeStep; attestationProgress: number }) {
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
              className={`text-xs ${
                isDone ? "text-green-400/70" : isActive ? "text-primary" : "text-muted-foreground/40"
              }`}
            >
              {STEP_LABELS[s]}
              {s === "waiting-attestation" && isActive && attestationProgress > 0 && (
                <span className="text-muted-foreground/50"> (~{Math.round(attestationProgress * 5 / 60)}m elapsed)</span>
              )}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function CrossChainFundForm() {
  const [amount, setAmount] = useState("");
  const [recoverHash, setRecoverHash] = useState("");
  const [showRecover, setShowRecover] = useState(false);
  const { fund, claim, recover, isPending, step, burnTxHash, error, reset, attestationProgress, savedAmount } = useCrossChainFund();

  // Use savedAmount (from localStorage restore) when local amount is empty
  const displayAmount = amount || savedAmount;

  const submit = async () => {
    if (!amount || Number(amount) <= 0) {
      toast.error("Enter a USDC amount");
      return;
    }
    try {
      await fund({ amountUSDC: amount });
      toast.success("USDC claimed on Arb Sepolia! Check your USDC balance.");
    } catch (e) {
      toast.error((e as Error).message?.slice(0, 200) ?? "Bridge failed");
    }
  };

  const submitClaim = async () => {
    try {
      await claim();
      toast.success("USDC claimed on Arb Sepolia! Check your USDC balance.");
    } catch (e) {
      toast.error((e as Error).message?.slice(0, 200) ?? "Claim failed");
    }
  };

  const submitRecover = async () => {
    if (!recoverHash || !recoverHash.startsWith("0x")) {
      toast.error("Paste a valid Sepolia burn tx hash (starts with 0x)");
      return;
    }
    try {
      await recover(recoverHash);
    } catch (e) {
      toast.error((e as Error).message?.slice(0, 200) ?? "Recovery failed");
    }
  };

  // Success state
  if (step === "done") {
    return (
      <div className="glass-panel rounded-md p-6 space-y-4">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-green-400" />
          <h3 className="font-display text-sm tracking-wider text-green-400">Bridge Complete!</h3>
        </div>

        <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-md space-y-3">
          <p className="text-[11px] text-green-300">
            {displayAmount} USDC has been bridged and minted on Arbitrum Sepolia!
          </p>
          <p className="text-sm text-muted-foreground/70">
            Your USDC balance on Arb Sepolia has been updated. Go to the <span className="text-primary">Pay</span> tab and
            wrap USDC → cUSDC to use it for encrypted payments.
          </p>
          {burnTxHash && (
            <a
              href={`https://sepolia.etherscan.io/tx/${burnTxHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300"
            >
              <ExternalLink className="w-3 h-3" />
              View burn tx on Etherscan
            </a>
          )}
        </div>

        <motion.button
          onClick={() => { reset(); setAmount(""); }}
          whileTap={{ scale: 0.99 }}
          className="w-full py-2.5 text-xs tracking-[0.2em] uppercase bg-secondary/30 text-muted-foreground border border-border/40 rounded-md hover:bg-secondary/50"
        >
          Bridge More
        </motion.button>
      </div>
    );
  }

  return (
    <div className="glass-panel rounded-md p-6 space-y-4">
      <div className="flex items-center gap-2">
        <Globe2 className="w-4 h-4 text-primary" />
        <h3 className="font-display text-sm tracking-wider text-foreground">Bridge USDC From Ethereum</h3>
        <span className="ml-auto text-[11px] text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-md border border-cyan-500/20">
          CCTP · BRIDGE
        </span>
      </div>

      <p className="text-sm text-muted-foreground/70">
        Bridge USDC from Ethereum Sepolia to Arbitrum Sepolia via Circle&apos;s CCTP.
        The whole process (burn → attestation → claim) happens automatically — just confirm the wallet prompts.
        Takes a few minutes for Circle to attest. Once done, wrap USDC → cUSDC on the Pay tab.
      </p>

      {/* Phase 0.5.5: privacy disclosure for CCTP */}
      <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3 flex gap-2 items-start">
        <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
        <div className="text-[12px] leading-relaxed text-amber-100/90">
          <strong className="text-amber-300">USDC bridges expose the amount on both chains.</strong>{" "}
          To minimise public linkage between your Ethereum and Arbitrum addresses, USDC mints to a fresh
          stealth address derived from your registered meta-address (only you can sweep it). If you have not
          registered a stealth meta-address, the funds will land in your main wallet and be publicly correlated.
        </div>
      </div>

      {step === "idle" && (
        <div className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground tracking-[0.15em] uppercase block mb-1.5">
              USDC Amount (Sepolia)
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="100"
              className="w-full px-3 py-2 bg-background border border-border/50 rounded-md text-xs font-mono"
            />
          </div>

          {/* Recover previous bridge */}
          <div className="border-t border-border/20 pt-2">
            <button
              onClick={() => setShowRecover(!showRecover)}
              className="flex items-center gap-1.5 text-xs text-muted-foreground/60 hover:text-muted-foreground"
            >
              <RotateCcw className="w-3 h-3" />
              {showRecover ? "Hide" : "Burned USDC but never received it? Recover here"}
            </button>
            {showRecover && (
              <div className="mt-2 space-y-2">
                <p className="text-xs text-muted-foreground/50">
                  Paste your Sepolia burn tx hash below. We&apos;ll check Circle&apos;s attestation and let you claim.
                </p>
                <input
                  value={recoverHash}
                  onChange={(e) => setRecoverHash(e.target.value)}
                  placeholder="0x48e09cc1..."
                  className="w-full px-3 py-2 bg-background border border-border/50 rounded-md text-xs font-mono"
                />
                <motion.button
                  onClick={submitRecover}
                  disabled={isPending}
                  whileTap={{ scale: 0.99 }}
                  className="w-full py-2 text-sm tracking-[0.15em] uppercase bg-amber-600/80 text-white rounded-md hover:bg-amber-500 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Checking…
                    </>
                  ) : (
                    <>
                      <RotateCcw className="w-3 h-3" />
                      Recover Bridge
                    </>
                  )}
                </motion.button>
              </div>
            )}
          </div>
        </div>
      )}

      {step !== "idle" && step !== "ready-to-claim" && (
        <>
          {burnTxHash && <BurnTxBanner hash={burnTxHash} />}
          <StepProgress current={step} attestationProgress={attestationProgress} />
        </>
      )}

      {step === "ready-to-claim" && (
        <div className="space-y-3">
          {burnTxHash && <BurnTxBanner hash={burnTxHash} />}
          <StepProgress current={step} attestationProgress={attestationProgress} />
          <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-md">
            <p className="text-sm text-green-300">
              Circle attestation received! Click below to mint {displayAmount} USDC on Arbitrum Sepolia.
            </p>
          </div>
          <motion.button
            onClick={submitClaim}
            disabled={isPending}
            whileTap={{ scale: 0.99 }}
            className="w-full py-3 text-xs tracking-[0.2em] uppercase bg-green-600 text-white rounded-md hover:bg-green-500 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isPending ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Claiming…
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                Claim {displayAmount} USDC on Arb Sepolia
              </>
            )}
          </motion.button>
          <button
            onClick={() => { reset(); setAmount(""); }}
            className="w-full py-1.5 text-xs text-muted-foreground/50 hover:text-muted-foreground"
          >
            Cancel &amp; start over
          </button>
        </div>
      )}

      {error && (
        <div className="text-sm text-red-400 p-2 bg-red-500/10 border border-red-500/20 rounded-md">
          {error.slice(0, 200)}
        </div>
      )}

      {step === "idle" && (
        <motion.button
          onClick={submit}
          disabled={isPending}
          whileTap={{ scale: 0.99 }}
          className="w-full py-3 text-xs tracking-[0.2em] uppercase bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <ArrowRightLeft className="w-3.5 h-3.5" />
          Bridge USDC
        </motion.button>
      )}

      {step !== "idle" && step !== "ready-to-claim" && step !== "done" && (
        <motion.button
          disabled
          className="w-full py-3 text-xs tracking-[0.2em] uppercase bg-primary/50 text-primary-foreground/70 rounded-md flex items-center justify-center gap-2"
        >
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Processing…
        </motion.button>
      )}
    </div>
  );
}
