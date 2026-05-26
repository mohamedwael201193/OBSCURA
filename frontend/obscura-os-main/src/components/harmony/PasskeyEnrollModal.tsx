/**
 * PasskeyEnrollModal.tsx — Harmony-styled passkey enrollment dialog
 *
 * Shows:
 *   • Pre-enroll: explanation + "Enable Passkey" button
 *   • Enrolling: spinner
 *   • Deploying: spinner + "Deploying your smart account…"
 *   • Done: success state
 *   • Error: error message with retry
 */

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Fingerprint, ShieldCheck, X, AlertTriangle,
  CheckCircle2, Loader2, KeyRound, Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { payHarmony } from "./payHarmonyClasses";
import { useSmartAccount } from "@/hooks/useSmartAccount";
import { useOcUSDCTransfer } from "@/hooks/useOcUSDCTransfer";
import { isPasskeySupported } from "@/lib/passkey";

interface PasskeyEnrollModalProps {
  onClose: () => void;
  onSuccess?: () => void;
}

const FEATURES = [
  {
    icon: ShieldCheck,
    title: "Biometric security",
    desc: "Face ID or fingerprint — no seed phrase required",
  },
  {
    icon: KeyRound,
    title: "Device-bound passkey",
    desc: "P-256 key lives on your device and never leaves it",
  },
  {
    icon: Zap,
    title: "Sponsored gas",
    desc: "Obscura covers transaction fees on supported actions",
  },
];

export function PasskeyEnrollModal({ onClose, onSuccess }: PasskeyEnrollModalProps) {
  const { deploy, status, error, accountAddress } = useSmartAccount();
  const { checkIsOperator, approveSmartOperator } = useOcUSDCTransfer();
  const [step, setStep] = useState<"intro" | "enrolling" | "authorizing" | "done" | "unsupported">("intro");
  const [localError, setLocalError] = useState<string | null>(null);

  const handleEnroll = useCallback(async () => {
    setLocalError(null);
    const supported = await isPasskeySupported();
    if (!supported) { setStep("unsupported"); return; }
    setStep("enrolling");
    try {
      const smartAddress = await deploy();
      setStep("authorizing");
      const isOperator = await checkIsOperator(smartAddress);
      if (!isOperator) {
        await approveSmartOperator(smartAddress);
      }
      setStep("done");
      onSuccess?.();
      setTimeout(onClose, 2_200);
    } catch (e) {
      setLocalError(e instanceof Error ? e.message : String(e));
      setStep("intro");
    }
  }, [deploy, checkIsOperator, approveSmartOperator, onClose, onSuccess]);

  const displayError = localError ?? error;

  return (
    <AnimatePresence>
      {/* ── Backdrop — very light tint, no blur ──────────────────── */}
      <motion.div
        key="backdrop"
        className="fixed inset-0 z-50 bg-foreground/10"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />

      {/* ── Modal panel — always centered ────────────────────────── */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <motion.div
          key="panel"
          className="pointer-events-auto w-full max-w-md rounded-2xl bg-card shadow-2xl ring-1 ring-border/60 overflow-hidden"
          initial={{ opacity: 0, scale: 0.96, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 8 }}
          transition={{ type: "spring", damping: 30, stiffness: 320 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* ── Top accent bar ───────────────────────────────────── */}
          <div className="h-1 w-full bg-gradient-to-r from-accent/60 via-accent to-accent/60" />

          {/* ── Header ───────────────────────────────────────────── */}
          <div className="flex items-start justify-between px-6 pt-6 pb-5 border-b border-border/50">
            <div className="flex items-center gap-4">
              <div className={cn(
                "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl",
                step === "done" ? "bg-accent/15" : "bg-accent/10"
              )}>
                {step === "done"
                  ? <CheckCircle2 className="h-6 w-6 text-accent" />
                  : step === "enrolling" || step === "authorizing"
                    ? <Loader2 className="h-6 w-6 text-accent animate-spin" />
                    : <Fingerprint className="h-6 w-6 text-accent" />
                }
              </div>
              <div>
                <h2 className="text-base font-semibold text-foreground leading-tight">
                  {step === "done" ? "Passkey Enabled" : "Enable Passkey"}
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5 tracking-wide uppercase">
                  Smart Account · ERC-4337
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* ── Body ─────────────────────────────────────────────── */}
          <div className="px-6 py-6 space-y-5">

            {/* INTRO */}
            {step === "intro" && (
              <>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Obscura can create a{" "}
                  <span className="font-medium text-foreground">gasless smart account</span> for
                  you — secured by your device passkey. No seed phrase. No browser extension.
                </p>

                {/* Feature list */}
                <div className="rounded-xl bg-muted/40 ring-1 ring-border/40 divide-y divide-border/30">
                  {FEATURES.map(({ icon: Icon, title, desc }) => (
                    <div key={title} className="flex items-start gap-3.5 px-4 py-3.5">
                      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-accent/10">
                        <Icon className="h-3.5 w-3.5 text-accent" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground leading-snug">{title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {displayError && (
                  <div className={cn(payHarmony.noticeError, "flex gap-2.5 items-start")}>
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span className="text-sm">{displayError}</span>
                  </div>
                )}
              </>
            )}

            {/* ENROLLING */}
            {(step === "enrolling" || step === "authorizing") && (
              <div className="space-y-4">
                <div className="rounded-xl bg-accent/5 ring-1 ring-accent/20 px-4 py-4">
                  <div className="flex items-center gap-3">
                    <Loader2 className="h-5 w-5 animate-spin text-accent shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {step === "authorizing"
                          ? "Authorizing private USDC sends…"
                          : status === "deploying" ? "Deploying smart account…" : "Waiting for passkey…"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {step === "authorizing"
                          ? "Confirm the one-time wallet approval. Future Smart Mode sends use your passkey."
                          : status === "deploying"
                            ? "Confirm the transaction in your wallet"
                            : "Authenticate with your device biometrics"}
                      </p>
                    </div>
                  </div>
                </div>
                {accountAddress && (
                  <div className={payHarmony.notice}>
                    <span className={payHarmony.label}>Your smart account</span>
                    <p className="mt-1 font-mono text-xs text-foreground break-all">{accountAddress}</p>
                  </div>
                )}
              </div>
            )}

            {/* DONE */}
            {step === "done" && (
              <div className="space-y-4">
                <div className="rounded-xl bg-accent/8 ring-1 ring-accent/20 px-4 py-4 flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-accent shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Smart account ready</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Your actions will now use gasless UserOps
                    </p>
                  </div>
                </div>
                {accountAddress && (
                  <div className={payHarmony.notice}>
                    <span className={payHarmony.label}>Account address</span>
                    <p className="mt-1 font-mono text-xs text-foreground break-all">{accountAddress}</p>
                  </div>
                )}
              </div>
            )}

            {/* UNSUPPORTED */}
            {step === "unsupported" && (
              <div className={cn(payHarmony.noticeWarn, "flex gap-2.5 items-start")}>
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
                <div>
                  <p className="text-sm font-medium text-amber-900">Passkeys not supported</p>
                  <p className="text-xs text-amber-800 mt-1">
                    Your browser or device does not support WebAuthn. Try Chrome, Safari, or
                    Edge on a device with biometrics.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* ── Footer ───────────────────────────────────────────── */}
          <div className="px-6 pb-6 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={step === "enrolling"}
              className="btn-pay inline-flex items-center gap-2 px-5 py-2.5 rounded-full disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {step === "done" ? "Close" : "Cancel"}
            </button>

            {step === "intro" && (
              <button
                type="button"
                onClick={handleEnroll}
                className="btn-pay-primary inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-medium"
              >
                <Fingerprint className="h-4 w-4" />
                Enable Passkey
              </button>
            )}

            {step === "unsupported" && (
              <button
                type="button"
                onClick={onClose}
                className="btn-pay-primary inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-medium"
              >
                Got it
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
