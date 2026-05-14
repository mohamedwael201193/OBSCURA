/**
 * HowCoFHEModal — 3-card onboarding carousel explaining CoFHE.
 * Opens automatically on first /credit visit; dismissed via localStorage key.
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Lock, Cpu, Eye, ChevronRight, X } from "lucide-react";

const STEPS = [
  {
    icon: Lock,
    title: "Encrypt on-device",
    body: "Your amount is sealed with cofhejs before it ever leaves your browser. The blockchain sees only a homomorphic ciphertext — never the raw number.",
    accent: "cyan",
    num: "01",
  },
  {
    icon: Cpu,
    title: "Compute on-chain",
    body: "The CoFHE co-processor evaluates arithmetic directly on the ciphertext. Supply, borrow, and repay settle without revealing balances to any node.",
    accent: "violet",
    num: "02",
  },
  {
    icon: Eye,
    title: "Reveal on demand",
    body: "Only your wallet can request a decryption. The ACL ensures no other address — not even the market contract — can read your balance without consent.",
    accent: "emerald",
    num: "03",
  },
] as const;

type Accent = "cyan" | "violet" | "emerald";

const ACCENT: Record<Accent, { border: string; text: string; bg: string; icon: string }> = {
  cyan:    { border: "border-cyan-500/30",    text: "text-cyan-300",    bg: "bg-cyan-950/40",    icon: "text-cyan-400"    },
  violet:  { border: "border-violet-500/30",  text: "text-violet-300",  bg: "bg-violet-950/40",  icon: "text-violet-400"  },
  emerald: { border: "border-emerald-500/30", text: "text-emerald-300", bg: "bg-emerald-950/40", icon: "text-emerald-400" },
};

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function HowCoFHEModal({ open, onClose }: Props) {
  const [step, setStep] = useState(0);
  const current = STEPS[step];
  const a = ACCENT[current.accent];

  const handleNext = () => {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md bg-[#0b0f1a] border-white/10 text-white p-0 overflow-hidden">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-10 text-white/40 hover:text-white/80 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="px-6 pt-6 pb-0">
          <div className="text-[9px] tracking-[0.2em] uppercase text-violet-400/70 font-mono mb-1">
            How it works
          </div>
          <h2 className="text-lg font-bold text-white">ObscuraCredit + CoFHE</h2>
          <p className="text-[11px] text-white/40 mt-1">
            Your funds stay encrypted end-to-end. Three steps you should know.
          </p>
        </div>

        {/* Card */}
        <div className="px-6 py-5">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.25 }}
              className={`rounded-xl border ${a.border} ${a.bg} p-5 space-y-3`}
            >
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg bg-black/20 border ${a.border}`}>
                  <current.icon className={`w-5 h-5 ${a.icon}`} />
                </div>
                <div>
                  <div className={`text-[9px] tracking-[0.18em] font-mono uppercase ${a.text} opacity-60 mb-0.5`}>
                    Step {current.num}
                  </div>
                  <h3 className={`text-[14px] font-semibold ${a.text}`}>{current.title}</h3>
                </div>
              </div>
              <p className="text-[12px] text-white/60 leading-relaxed">{current.body}</p>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Progress dots + CTA */}
        <div className="flex items-center justify-between px-6 pb-6">
          <div className="flex items-center gap-1.5">
            {STEPS.map((_, i) => (
              <button
                key={i}
                onClick={() => setStep(i)}
                className={`rounded-full transition-all duration-200 ${
                  i === step ? "w-4 h-1.5 bg-violet-400" : "w-1.5 h-1.5 bg-white/20 hover:bg-white/40"
                }`}
              />
            ))}
          </div>
          <button
            onClick={handleNext}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-[12px] font-semibold transition-colors"
          >
            {step < STEPS.length - 1 ? (
              <>Next <ChevronRight className="w-3.5 h-3.5" /></>
            ) : (
              "Let's go"
            )}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
