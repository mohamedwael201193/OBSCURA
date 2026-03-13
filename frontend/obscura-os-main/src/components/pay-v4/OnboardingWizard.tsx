/**
 * OnboardingWizard — 5-step intro overlay that renders when
 *   `prefs.hasCompletedOnboarding === false`.
 *
 *   1. Welcome / what's encrypted
 *   2. Connect wallet
 *   3. Bridge / wrap to cUSDC
 *   4. Generate stealth meta-address
 *   5. Pick UI mode (Beginner / Advanced)
 */
import { useState } from "react";
import { useAccount } from "wagmi";
import { Card } from "@/components/elite/Layout";
import { Button } from "@/components/ui/button";
import { ArrowRight, ArrowLeft, X, Lock, Wallet, Eye, Sparkles, Coins } from "lucide-react";
import { usePreferences, type UIMode } from "@/contexts/PreferencesContext";
import { useStealthMetaAddress } from "@/hooks/useStealthMetaAddress";

interface Step {
  key: string;
  title: string;
  body: React.ReactNode;
  icon: React.ComponentType<{ className?: string }>;
}

export function OnboardingWizard() {
  const { hasCompletedOnboarding, setMany } = usePreferences();
  const [stepIdx, setStepIdx] = useState(0);
  const [chosenMode, setChosenMode] = useState<UIMode>("beginner");
  const { isConnected } = useAccount();
  const stealth = useStealthMetaAddress();

  if (hasCompletedOnboarding) return null;

  const finish = () => {
    setMany({ hasCompletedOnboarding: true, uiMode: chosenMode });
  };

  const steps: Step[] = [
    {
      key: "welcome",
      title: "Welcome to confidential payments",
      icon: Lock,
      body: (
        <div className="space-y-3 text-sm text-muted-foreground/85 leading-relaxed">
          <p>
            Amounts, recipients, and contact lists are encrypted client-side
            with FHE before they touch the chain. The blockchain stores
            ciphertext; only you and the people you authorize can decrypt.
          </p>
          <p className="text-emerald-300/80 text-[12px]">
            What's <em>not</em> private: tx senders, gas costs, and the fact
            that a transaction happened. Use stealth addresses to mask the
            recipient.
          </p>
        </div>
      ),
    },
    {
      key: "connect",
      title: "Connect your wallet",
      icon: Wallet,
      body: (
        <div className="space-y-3 text-sm text-muted-foreground/85">
          <p>Use the Connect button at the top right. Make sure you're on Arbitrum Sepolia (chain id 421614).</p>
          <p
            className={
              isConnected
                ? "text-emerald-300 text-[12px]"
                : "text-amber-300 text-[12px]"
            }
          >
            {isConnected ? "✓ Wallet connected" : "Wallet not connected yet"}
          </p>
        </div>
      ),
    },
    {
      key: "bridge",
      title: "Get encrypted USDC",
      icon: Coins,
      body: (
        <div className="space-y-3 text-sm text-muted-foreground/85">
          <p>
            Bridge USDC from another chain via the Cross-Chain tab, then wrap
            into <span className="text-emerald-300">cUSDC</span> — the
            confidential USDC token used for all payroll, escrow, and stealth
            transfers.
          </p>
          <p className="text-[12px] text-muted-foreground/65">
            You can also acquire test USDC from a faucet on Arb Sepolia.
          </p>
        </div>
      ),
    },
    {
      key: "stealth",
      title: "Generate a stealth meta-address",
      icon: Eye,
      body: (
        <div className="space-y-3 text-sm text-muted-foreground/85">
          <p>
            Your meta-address is a secp256k1 keypair that lets senders derive a
            fresh, unlinkable stealth address per payment. Private keys are
            stored encrypted-at-rest in this browser only.
          </p>
          {stealth.keysMeta ? (
            <p className="text-emerald-300 text-[12px]">✓ Meta-address ready</p>
          ) : (
            <p className="text-[12px] text-muted-foreground/65">
              You can do this from <strong className="text-emerald-300">Receive → Stealth Inbox</strong> later — skip if you only intend to send.
            </p>
          )}
        </div>
      ),
    },
    {
      key: "mode",
      title: "Pick your default UI mode",
      icon: Sparkles,
      body: (
        <div className="space-y-3 text-sm text-muted-foreground/85">
          <p>You can change this anytime under Settings.</p>
          <div className="grid grid-cols-2 gap-3">
            {(["beginner", "advanced"] as UIMode[]).map((m) => (
              <button
                key={m}
                onClick={() => setChosenMode(m)}
                className={`p-4 rounded-lg border text-left transition-all ${
                  chosenMode === m
                    ? "border-emerald-500/60 bg-emerald-500/[0.08]"
                    : "border-white/10 hover:border-white/20"
                }`}
              >
                <div className="font-display text-[13px] capitalize text-foreground mb-1">{m}</div>
                <div className="text-[11px] text-muted-foreground/65 leading-relaxed">
                  {m === "beginner"
                    ? "Send / Receive / Streams. Hides advanced gating, dispute, staking."
                    : "Everything: resolvers, dispute, stake pool, raw tx tools."}
                </div>
              </button>
            ))}
          </div>
        </div>
      ),
    },
  ];

  const step = steps[stepIdx];
  const Icon = step.icon;
  const isLast = stepIdx === steps.length - 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <Card className="max-w-xl w-full p-6 relative">
        <button
          onClick={finish}
          className="absolute top-3 right-3 text-muted-foreground/60 hover:text-foreground"
          aria-label="Skip onboarding"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2 mb-1">
          <div className="w-7 h-7 rounded-full border border-emerald-500/30 bg-emerald-500/10 flex items-center justify-center">
            <Icon className="w-4 h-4 text-emerald-300" />
          </div>
          <div className="text-[10px] tracking-[0.22em] uppercase text-muted-foreground/55 font-mono">
            Step {stepIdx + 1} / {steps.length}
          </div>
        </div>
        <h2 className="font-display text-xl text-foreground mb-3">{step.title}</h2>
        <div className="mb-5">{step.body}</div>

        <div className="flex items-center justify-between gap-2">
          <Button
            variant="outline"
            disabled={stepIdx === 0}
            onClick={() => setStepIdx((i) => Math.max(0, i - 1))}
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back
          </Button>
          <div className="flex items-center gap-1">
            {steps.map((_, i) => (
              <span
                key={i}
                className={`block w-1.5 h-1.5 rounded-full ${
                  i === stepIdx ? "bg-emerald-400" : "bg-white/20"
                }`}
              />
            ))}
          </div>
          <Button
            onClick={isLast ? finish : () => setStepIdx((i) => i + 1)}
          >
            {isLast ? "Finish" : "Next"} <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </Button>
        </div>
      </Card>
    </div>
  );
}

export default OnboardingWizard;
