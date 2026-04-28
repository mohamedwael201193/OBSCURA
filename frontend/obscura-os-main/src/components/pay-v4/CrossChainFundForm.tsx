import { useState } from "react";
import { motion } from "framer-motion";
import { Globe2, ArrowRightLeft, CheckCircle2, Loader2, ExternalLink, RotateCcw, Copy, AlertTriangle } from "lucide-react";
import UsdcIcon from "@/components/shared/UsdcIcon";
import { useCrossChainFund, type BridgeStep } from "@/hooks/useCrossChainFund";
import { toast } from "sonner";
import { useUSDCBalance } from "@/hooks/useUSDCBalance";

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

function BurnTxBanner({ hash }: { hash: string }) {
  const short = `${hash.slice(0, 10)}…${hash.slice(-8)}`;
  return (
    <div className="flex items-center gap-2 px-3 py-2.5 bg-emerald-500/[0.08] border border-emerald-500/20 rounded-lg">
      <ExternalLink className="w-3 h-3 text-cyan-400 shrink-0" />
      <a
        href={`https://sepolia.etherscan.io/tx/${hash}`}
        target="_blank"
        rel="noopener noreferrer"
        className="font-mono text-[11px] text-emerald-400 hover:text-emerald-300 transition-colors truncate"
      >
        {short}
      </a>
      <button
        onClick={() => { navigator.clipboard.writeText(hash); toast.success("Tx hash copied!"); }}
        className="ml-auto text-muted-foreground/40 hover:text-muted-foreground/70 transition-colors shrink-0"
      >
        <Copy className="w-3 h-3" />
      </button>
      <span className="text-[10px] text-muted-foreground/35 shrink-0 tracking-wider">SAVE</span>
    </div>
  );
}

function StepProgress({ current, attestationProgress }: { current: BridgeStep; attestationProgress: number }) {
  if (current === "idle") return null;
  const currentIdx = STEP_ORDER.indexOf(current);
  return (
    <div className="space-y-2">
      {STEP_ORDER.filter((s) => s !== "done").map((s, i) => {
        const isDone = i < currentIdx;
        const isActive = s === current;
        return (
          <div key={s} className="flex items-center gap-2.5">
            <div className="shrink-0">
              {isDone ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              ) : isActive ? (
                <Loader2 className="w-3.5 h-3.5 text-violet-400 animate-spin" />
              ) : (
                <div className="w-3.5 h-3.5 rounded-full border border-white/15" />
              )}
            </div>
            <span className={`text-[11px] leading-tight ${
              isDone ? "text-emerald-400/60" : isActive ? "text-emerald-300" : "text-muted-foreground/30"
            }`}>
              {STEP_LABELS[s]}
              {s === "waiting-attestation" && isActive && attestationProgress > 0 && (
                <span className="text-muted-foreground/40"> (~{Math.round(attestationProgress * 5 / 60)}m elapsed)</span>
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
  const usdcBalance = useUSDCBalance();

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

  if (step === "done") {
    return (
      <div className="pay-card pay-card-violet p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <h3 className="font-display text-sm font-semibold text-emerald-400">Bridge Complete!</h3>
            <p className="text-[10px] text-muted-foreground/45 mt-0.5 uppercase tracking-widest">CCTP · Arbitrum Sepolia</p>
          </div>
        </div>

        <div className="rounded-lg bg-emerald-500/8 border border-emerald-500/20 p-4 space-y-2.5">
          <p className="text-[12px] text-emerald-300 leading-relaxed">
            <span className="font-semibold">{displayAmount} USDC</span> has been bridged and minted on Arbitrum Sepolia.
          </p>
          <p className="text-[12px] text-muted-foreground/55 leading-relaxed">
            Head to the <span className="text-primary">Pay</span> tab and wrap USDC → cUSDC to use it for encrypted payments.
          </p>
          {burnTxHash && (
            <a
              href={`https://sepolia.etherscan.io/tx/${burnTxHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-[11px] text-emerald-400 hover:text-emerald-300 transition-colors"
            >
              <ExternalLink className="w-3 h-3" />
              View burn tx on Etherscan
            </a>
          )}
        </div>

        <motion.button
          onClick={() => { reset(); setAmount(""); }}
          whileTap={{ scale: 0.99 }}
          className="btn-pay btn-pay-ghost w-full py-2.5"
        >
          Bridge More
        </motion.button>
      </div>
    );
  }

  return (
    <div className="pay-card p-6 space-y-5">
      {/* ── Header ── */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-700/10 border border-emerald-500/25 flex items-center justify-center shrink-0">
          <Globe2 className="w-4 h-4 text-emerald-400" />
        </div>
        <div className="min-w-0">
          <h3 className="font-display text-sm font-semibold text-foreground leading-tight">Bridge USDC From Ethereum</h3>
          <p className="text-[10px] text-muted-foreground/45 tracking-widest mt-0.5 uppercase">CCTP · Cross-chain</p>
        </div>
        <span className="ml-auto shrink-0 pay-badge pay-badge-emerald">CCTP V1</span>
      </div>

      {/* Arb USDC balance pill (what you can wrap after bridging) */}
      <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-[#3e73c4]/10 border border-[#3e73c4]/25">
        <UsdcIcon className="w-4 h-4 shrink-0" />
        <span className="text-[11px] text-white/60 font-medium tracking-wide">Arb USDC Balance</span>
        <span className="ml-auto font-mono text-[14px] text-white font-semibold">
          {usdcBalance !== null ? usdcBalance : "—"}
        </span>
        <span className="text-[10px] text-[#3e73c4] font-semibold uppercase tracking-wider">USDC</span>
      </div>

      <p className="text-[12px] text-muted-foreground/55 leading-relaxed">
        Bridge USDC from Ethereum Sepolia to Arbitrum Sepolia via Circle&apos;s CCTP. The full flow — burn → attestation → claim — runs automatically. Takes a few minutes for Circle to attest.
      </p>

      {/* Privacy warning */}
      <div className="rounded-lg border border-amber-500/25 bg-amber-500/5 p-4 flex gap-3 items-start">
        <AlertTriangle className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />
        <div className="text-[11px] leading-relaxed text-amber-200/80">
          <strong className="text-amber-300">USDC bridges expose the amount on both chains.</strong>{" "}
          To minimise linkage, USDC mints to a stealth address derived from your meta-address. Register one on the <span className="text-primary">Receive</span> tab first.
        </div>
      </div>

      {step === "idle" && (
        <div className="space-y-3">
          <div className="space-y-2">
            <label className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground/50 font-semibold">
              USDC Amount (Sepolia)
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="100"
              className="pay-input"
            />
          </div>

          {/* Recover */}
          <div className="border-t border-white/[0.05] pt-3">
            <button
              onClick={() => setShowRecover(!showRecover)}
              className="flex items-center gap-1.5 text-[11px] text-muted-foreground/45 hover:text-muted-foreground/70 transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              {showRecover ? "Hide recovery" : "Burned USDC but never received it? Recover here"}
            </button>
            {showRecover && (
              <div className="mt-3 space-y-2.5">
                <p className="text-[11px] text-muted-foreground/45 leading-relaxed">
                  Paste your Sepolia burn tx hash. We&apos;ll check Circle&apos;s attestation and let you claim.
                </p>
                <input
                  value={recoverHash}
                  onChange={(e) => setRecoverHash(e.target.value)}
                  placeholder="0x48e09cc1…"
                  className="pay-input"
                />
                <motion.button
                  onClick={submitRecover}
                  disabled={isPending}
                  whileTap={{ scale: 0.99 }}
                  className="btn-pay btn-pay-ghost w-full py-2.5"
                >
                  {isPending
                    ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Checking…</>
                    : <><RotateCcw className="w-3.5 h-3.5" /> Recover Bridge</>
                  }
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
          <div className="rounded-lg bg-emerald-500/8 border border-emerald-500/20 p-3">
            <p className="text-[12px] text-emerald-300 leading-relaxed">
              Circle attestation received! Click below to mint <span className="font-semibold">{displayAmount} USDC</span> on Arbitrum Sepolia.
            </p>
          </div>
          <motion.button
            onClick={submitClaim}
            disabled={isPending}
            whileTap={{ scale: 0.99 }}
            className="btn-pay btn-pay-emerald w-full py-2.5"
          >
            {isPending
              ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Claiming…</>
              : <><CheckCircle2 className="w-3.5 h-3.5" /> Claim {displayAmount} USDC on Arb Sepolia</>
            }
          </motion.button>
          <button
            onClick={() => { reset(); setAmount(""); }}
            className="w-full py-1.5 text-[11px] text-muted-foreground/40 hover:text-muted-foreground/60 transition-colors"
          >
            Cancel &amp; start over
          </button>
        </div>
      )}

      {error && (
        <div className="text-[12px] text-red-300 bg-red-500/8 p-3 rounded-lg border border-red-500/20 leading-relaxed">
          {error.slice(0, 200)}
        </div>
      )}

      {step === "idle" && (
        <motion.button
          onClick={submit}
          disabled={isPending}
          whileTap={{ scale: 0.99 }}
          className="btn-pay btn-pay-emerald w-full py-2.5"
        >
          <ArrowRightLeft className="w-3.5 h-3.5" />
          Bridge USDC
        </motion.button>
      )}

      {step !== "idle" && step !== "ready-to-claim" && step !== "done" && (
        <motion.button
          disabled
          className="btn-pay btn-pay-emerald w-full py-2.5 opacity-50"
        >
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Processing…
        </motion.button>
      )}
    </div>
  );
}
