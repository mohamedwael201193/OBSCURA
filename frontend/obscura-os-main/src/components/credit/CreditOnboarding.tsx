/**
 * CreditOnboarding — 4-step first-visit modal.
 *
 * Steps:
 *   1. Welcome — what Obscura Credit is (privacy guarantees)
 *   2. Use Pay-backed private USDC
 *   3. Approve the Credit Router
 *   4. Reveal only on demand
 *
 * Stored in localStorage via useCreditOnboarding so it only shows once.
 */
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Lock, WalletCards, Layers, ShieldCheck, ChevronRight, ChevronLeft, Sparkles } from "lucide-react";

interface Props {
  open: boolean;
  onComplete: () => void;
  onDismiss: () => void;
}

const STEPS = [
  {
    icon: Lock,
    title: "Encrypted by design",
    body: "Borrow amounts, collateral balances, and credit scores stay encrypted on-chain. Public metrics stay public; personal balances do not.",
    hint: "Public values: TVL, utilization, interest rates. Private: your position.",
  },
  {
    icon: WalletCards,
    title: "Use Pay-backed private USDC",
    body: "The default market reuses the same private ocUSDC balance as Pay. Shield once in Pay, then bring that balance into Credit.",
    hint: "Legacy faucets are still available behind Advanced/Testnet.",
  },
  {
    icon: Layers,
    title: "Borrow or earn from one line",
    body: "Borrow and Earn both start from the canonical private USDC market. Curated vaults remain available for strategy testing.",
    hint: "The main path stays simple; lab markets stay out of the way.",
  },
  {
    icon: ShieldCheck,
    title: "Reveal only on demand",
    body: "Credit never decrypts your position on page load. Use Position or Score reveal buttons when you want to view encrypted values.",
    hint: "No background wallet prompts for private data.",
  },
];

export default function CreditOnboarding({ open, onComplete, onDismiss }: Props) {
  const [i, setI] = useState(0);
  const isLast = i === STEPS.length - 1;
  const step = STEPS[i];
  const Icon = step.icon;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onDismiss()}>
      <DialogContent className="max-w-md border-border bg-card text-foreground backdrop-blur-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-1.5 font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
            <Sparkles className="w-3 h-3" /> Welcome to Obscura Credit
          </DialogTitle>
          <DialogDescription className="sr-only">A short guide to the private USDC Credit flow.</DialogDescription>
        </DialogHeader>

        <div className="mt-2">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl border border-accent/30 bg-accent/10">
            <Icon className="w-5 h-5 text-foreground" />
          </div>
          <h3 className="text-lg font-light text-foreground">{step.title}</h3>
          <p className="mt-2 text-[12.5px] leading-relaxed text-muted-foreground">{step.body}</p>
          <p className="mt-3 text-[10.5px] italic text-muted-foreground">{step.hint}</p>
        </div>

        {/* Dots */}
        <div className="mt-5 flex items-center justify-center gap-1.5">
          {STEPS.map((_, idx) => (
            <span
              key={idx}
              className={`h-1 rounded-full transition-all ${
                idx === i ? "w-6 bg-foreground" : "w-1.5 bg-muted"
              }`}
            />
          ))}
        </div>

        <div className="mt-5 flex items-center justify-between gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => (i === 0 ? onDismiss() : setI(i - 1))}
            className="text-muted-foreground hover:text-foreground"
          >
            {i === 0 ? "Skip" : <><ChevronLeft className="w-3.5 h-3.5 mr-1" /> Back</>}
          </Button>
          <Button
            size="sm"
            onClick={() => (isLast ? onComplete() : setI(i + 1))}
            className="border border-foreground/15 bg-foreground text-background hover:bg-foreground/90"
          >
            {isLast ? "Get started" : <>Next <ChevronRight className="w-3.5 h-3.5 ml-1" /></>}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
