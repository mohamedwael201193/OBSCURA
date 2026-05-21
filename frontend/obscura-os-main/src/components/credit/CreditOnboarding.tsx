/**
 * CreditOnboarding — 4-step first-visit modal.
 *
 * Steps:
 *   1. Welcome — what Obscura Credit is (privacy guarantees)
 *   2. Faucet  — links to claim cWETH / OBS (testnet)
 *   3. Pick risk tier — informational
 *   4. Approve operator — explainer of two-step FHE transfer
 *
 * Stored in localStorage via useCreditOnboarding so it only shows once.
 */
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Lock, Droplet, Layers, ShieldCheck, ChevronRight, ChevronLeft, Sparkles } from "lucide-react";

interface Props {
  open: boolean;
  onComplete: () => void;
  onDismiss: () => void;
}

const STEPS = [
  {
    icon: Lock,
    title: "Encrypted by design",
    body: "Every borrow amount, collateral balance, and credit score is a CoFHE ciphertext on-chain. Even validators can't see the numbers.",
    hint: "Public values: TVL, utilization, interest rates. Private: your position.",
  },
  {
    icon: Droplet,
    title: "Get testnet tokens",
    body: "Claim cWETH and OBS from the in-app faucet to start supplying or borrowing. cUSDC is wrapped from the protocol mint.",
    hint: "Faucet drips reset every 24h — enough to test the full flow.",
  },
  {
    icon: Layers,
    title: "Choose your risk tier",
    body: "Vaults: Conservative (single market, low yield) or Aggressive (multi-market, higher yield). Markets: pick LLTV 77% (safer) or 86% (capital efficient).",
    hint: "You can change strategy any time — positions are isolated.",
  },
  {
    icon: ShieldCheck,
    title: "Two-step approval",
    body: "Each FHE write is two transactions: (1) confidentialTransfer to the market, (2) the supply/borrow/repay action. We auto-set operators so you only sign once per session.",
    hint: "Watch the FHE stepper — it shows exactly which phase you're in.",
  },
];

export default function CreditOnboarding({ open, onComplete, onDismiss }: Props) {
  const [i, setI] = useState(0);
  const isLast = i === STEPS.length - 1;
  const step = STEPS[i];
  const Icon = step.icon;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onDismiss()}>
      <DialogContent className="max-w-md bg-[#0a0d11] border border-white/10 backdrop-blur-2xl">
        <DialogHeader>
          <DialogTitle className="text-xs tracking-[0.2em] uppercase text-violet-400/70 font-mono flex items-center gap-1.5">
            <Sparkles className="w-3 h-3" /> Welcome to ObscuraCredit
          </DialogTitle>
        </DialogHeader>

        <div className="mt-2">
          <div className="w-12 h-12 rounded-xl bg-violet-500/15 border border-violet-500/30 flex items-center justify-center mb-3">
            <Icon className="w-5 h-5 text-violet-300" />
          </div>
          <h3 className="text-lg text-white/95 font-light">{step.title}</h3>
          <p className="mt-2 text-[12.5px] text-white/65 leading-relaxed">{step.body}</p>
          <p className="mt-3 text-[10.5px] text-white/40 italic">{step.hint}</p>
        </div>

        {/* Dots */}
        <div className="mt-5 flex items-center justify-center gap-1.5">
          {STEPS.map((_, idx) => (
            <span
              key={idx}
              className={`h-1 rounded-full transition-all ${
                idx === i ? "w-6 bg-violet-400" : "w-1.5 bg-white/15"
              }`}
            />
          ))}
        </div>

        <div className="mt-5 flex items-center justify-between gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => (i === 0 ? onDismiss() : setI(i - 1))}
            className="text-white/55 hover:text-white/85"
          >
            {i === 0 ? "Skip" : <><ChevronLeft className="w-3.5 h-3.5 mr-1" /> Back</>}
          </Button>
          <Button
            size="sm"
            onClick={() => (isLast ? onComplete() : setI(i + 1))}
            className="bg-violet-500/20 hover:bg-violet-500/30 text-violet-100 border border-violet-500/40"
          >
            {isLast ? "Get started" : <>Next <ChevronRight className="w-3.5 h-3.5 ml-1" /></>}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
