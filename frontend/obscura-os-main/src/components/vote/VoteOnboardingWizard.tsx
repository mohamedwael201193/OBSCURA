import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAccount } from "wagmi";
import {
  X,
  ArrowRight,
  ArrowLeft,
  Lock,
  Coins,
  Vote,
  BarChart3,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "obscura.vote.onboarding.v1";

interface VoteOnboardingWizardProps {
  /** Force open (e.g. from "How to Use" sidebar link). When provided,
   *  the component is controlled — caller must handle onClose. */
  forceOpen?: boolean;
  onClose?: () => void;
}

const steps = [
  {
    key: "welcome",
    title: "Private governance on-chain",
    icon: Lock,
    body: (
      <div className="space-y-3 text-sm text-muted-foreground/85 leading-relaxed">
        <p>
          ObscuraVote lets any wallet holder vote on proposals with
          <span className="text-emerald-300"> fully encrypted ballots</span>.
          Your choice is sealed by FHE before it ever leaves your browser —
          the smart contract only sees ciphertext.
        </p>
        <p className="text-[12px] text-muted-foreground/60">
          What's <em>not</em> private: the fact that you voted, gas costs, and
          the aggregate tally after finalization. Individual choices stay
          encrypted forever.
        </p>
      </div>
    ),
  },
  {
    key: "obs",
    title: "You need $OBS tokens to vote",
    icon: Coins,
    body: (
      <div className="space-y-3 text-sm text-muted-foreground/85 leading-relaxed">
        <p>
          All voting power is gated by the{" "}
          <span className="text-emerald-300">$OBS governance token</span>. You
          need at least 1 OBS in your wallet before you can cast a ballot.
        </p>
        <div className="rounded-lg bg-emerald-500/[0.07] border border-emerald-500/25 p-3 space-y-1">
          <div className="text-[12px] font-semibold text-emerald-300">
            Free daily faucet
          </div>
          <div className="text-[12px] text-muted-foreground/70">
            Claim <strong className="text-foreground">100 OBS every 24 hours</strong> — use
            the <span className="text-emerald-300">"Claim $OBS"</span> button
            pinned at the top of the Vote dashboard.
          </div>
        </div>
      </div>
    ),
  },
  {
    key: "cast",
    title: "Browse proposals & cast your vote",
    icon: Vote,
    body: (
      <div className="space-y-3 text-sm text-muted-foreground/85 leading-relaxed">
        <p>
          Open the <span className="text-emerald-300">Proposals</span> tab to
          browse active polls with live countdowns. Click{" "}
          <span className="text-emerald-300">Vote on this →</span> to jump
          directly to the encrypted voting form.
        </p>
        <p>
          In <span className="text-emerald-300">Cast Vote</span>, select a
          proposal, pick an option, and submit. Your choice is wrapped in a
          FHE ciphertext on-device — the contract never learns what you chose.
        </p>
      </div>
    ),
  },
  {
    key: "revote",
    title: "Revote anytime — coercion resistant",
    icon: RefreshCw,
    body: (
      <div className="space-y-3 text-sm text-muted-foreground/85 leading-relaxed">
        <p>
          You can change your vote as many times as you like before the
          deadline. Each new submission overwrites the previous encrypted
          ballot on-chain.
        </p>
        <p className="text-[12px] text-muted-foreground/60">
          This makes vote-buying irrational: a buyer can never verify the
          <em> final</em> ballot before the deadline passes.
        </p>
      </div>
    ),
  },
  {
    key: "results",
    title: "Results stay private, tallies go public",
    icon: BarChart3,
    body: (
      <div className="space-y-3 text-sm text-muted-foreground/85 leading-relaxed">
        <p>
          After the deadline, any voter can trigger finalization in the{" "}
          <span className="text-emerald-300">Results</span> tab. The contract
          calls <span className="font-mono text-emerald-300">FHE.allowPublic()</span>{" "}
          on the aggregate tally — only the totals are revealed.
        </p>
        <p>
          Use <span className="text-emerald-300">Verify My Vote</span> in the
          history tab to self-decrypt your own ballot at any time via{" "}
          <span className="font-mono text-emerald-300">FHE.allow</span>.
        </p>
      </div>
    ),
  },
];

export function VoteOnboardingWizard({
  forceOpen,
  onClose,
}: VoteOnboardingWizardProps) {
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === "done";
    } catch {
      return false;
    }
  });
  const [stepIdx, setStepIdx] = useState(0);
  const { isConnected } = useAccount();

  // Reset step index when wizard opens
  useEffect(() => {
    if (forceOpen) setStepIdx(0);
  }, [forceOpen]);

  const finish = () => {
    try {
      localStorage.setItem(STORAGE_KEY, "done");
    } catch {}
    setDismissed(true);
    onClose?.();
  };

  const isOpen = forceOpen || !dismissed;
  if (!isOpen) return null;

  const step = steps[stepIdx];
  const Icon = step.icon;
  const isLast = stepIdx === steps.length - 1;

  return (
    <AnimatePresence>
      <motion.div
        key="vote-onboarding"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          className="pay-card max-w-lg w-full p-6 relative"
        >
          {/* Close / skip */}
          <button
            onClick={finish}
            className="absolute top-4 right-4 text-muted-foreground/50 hover:text-foreground transition-colors"
            aria-label="Skip"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Step counter + icon */}
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-700/10 border border-emerald-500/25 flex items-center justify-center shrink-0">
              <Icon className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-[10px] tracking-[0.22em] uppercase text-muted-foreground/50 font-mono">
              Step {stepIdx + 1} / {steps.length}
            </div>
            <span className="ml-auto pay-badge pay-badge-emerald">ObscuraVote</span>
          </div>

          <h2 className="font-display text-[17px] font-semibold text-foreground mb-3 leading-snug">
            {step.title}
          </h2>

          <div className="mb-6">{step.body}</div>

          {/* Dot progress */}
          <div className="flex items-center gap-1.5 mb-5 justify-center">
            {steps.map((_, i) => (
              <span
                key={i}
                className={`block rounded-full transition-all duration-300 ${
                  i === stepIdx
                    ? "w-4 h-1.5 bg-emerald-400"
                    : i < stepIdx
                    ? "w-1.5 h-1.5 bg-emerald-500/50"
                    : "w-1.5 h-1.5 bg-white/15"
                }`}
              />
            ))}
          </div>

          {/* Wallet status indicator on step 0 */}
          {stepIdx === 0 && (
            <div
              className={`text-[11px] mb-4 flex items-center gap-1.5 ${
                isConnected ? "text-emerald-400" : "text-amber-400"
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isConnected ? "bg-emerald-400" : "bg-amber-400"
                }`}
              />
              {isConnected
                ? "Wallet connected — you're ready"
                : "Connect your wallet to get started"}
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between gap-3">
            <Button
              variant="outline"
              disabled={stepIdx === 0}
              onClick={() => setStepIdx((i) => Math.max(0, i - 1))}
              className="gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back
            </Button>
            <button
              onClick={isLast ? finish : () => setStepIdx((i) => i + 1)}
              className="btn-pay btn-pay-emerald px-5 py-2"
            >
              {isLast ? "Start Voting" : "Next"}
              <ArrowRight className="w-3.5 h-3.5 ml-1.5 inline" />
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default VoteOnboardingWizard;
