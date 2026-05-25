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
import { Fingerprint, ShieldCheck, X, AlertTriangle, CheckCircle2, Loader2, KeyRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { payHarmony } from "./payHarmonyClasses";
import { useSmartAccount } from "@/hooks/useSmartAccount";
import { isPasskeySupported } from "@/lib/passkey";

// ─── Types ────────────────────────────────────────────────────────────────────
interface PasskeyEnrollModalProps {
  /** Called when the modal is dismissed (success or user close) */
  onClose: () => void;
  /** Called when enrollment + deployment succeeds */
  onSuccess?: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────
export function PasskeyEnrollModal({ onClose, onSuccess }: PasskeyEnrollModalProps) {
  const { deploy, status, error, accountAddress, isDeployed } = useSmartAccount();
  const [step, setStep] = useState<"intro" | "enrolling" | "done" | "unsupported">("intro");
  const [localError, setLocalError] = useState<string | null>(null);

  const handleEnroll = useCallback(async () => {
    setLocalError(null);

    // Check browser support
    const supported = await isPasskeySupported();
    if (!supported) {
      setStep("unsupported");
      return;
    }

    setStep("enrolling");
    try {
      await deploy();
      setStep("done");
      onSuccess?.();
      // Auto-close after 2s
      setTimeout(onClose, 2_000);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setLocalError(msg);
      setStep("intro"); // back to intro with error visible
    }
  }, [deploy, onClose, onSuccess]);

  const displayError = localError ?? error;

  return (
    <AnimatePresence>
      {/* Backdrop */}
      <motion.div
        key="backdrop"
        className="fixed inset-0 z-50 bg-foreground/20 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />

      {/* Panel */}
      <motion.div
        key="panel"
        className="fixed inset-x-4 bottom-0 z-50 mx-auto max-w-sm rounded-t-3xl bg-card pb-8 shadow-2xl sm:inset-x-auto sm:left-1/2 sm:bottom-auto sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl"
        initial={{ y: "100%", opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: "100%", opacity: 0 }}
        transition={{ type: "spring", damping: 28, stiffness: 260 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <div className="flex justify-end px-5 pt-5">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid h-8 w-8 place-items-center rounded-full hairline bg-muted/60 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-6 pb-2 space-y-5">
          {/* Header */}
          <div className={payHarmony.headerRow}>
            <div className={cn(payHarmony.headerIcon, "bg-accent/10")}>
              {step === "done" ? (
                <CheckCircle2 className="h-5 w-5 text-accent" />
              ) : (
                <Fingerprint className="h-5 w-5 text-accent" />
              )}
            </div>
            <div>
              <p className={payHarmony.headerTitle}>
                {step === "done" ? "Passkey Enabled" : "Enable Passkey"}
              </p>
              <p className={payHarmony.headerSubtitle}>Smart Account · ERC-4337</p>
            </div>
          </div>

          {/* Body */}
          {step === "intro" && (
            <div className="space-y-4">
              <p className={payHarmony.body}>
                Obscura can create a{" "}
                <strong className="font-medium text-foreground">gasless smart account</strong> for you —
                secured by your device passkey. No seed phrase. No browser extension.
              </p>

              <div className="space-y-2.5">
                {[
                  { icon: ShieldCheck, text: "Biometric authentication (Face ID / fingerprint)" },
                  { icon: KeyRound,    text: "P-256 passkey — lives on your device only" },
                  { icon: ShieldCheck, text: "Sponsored gas — we pay on supported actions" },
                ].map(({ icon: Icon, text }) => (
                  <div key={text} className="flex items-start gap-2.5">
                    <Icon className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                    <span className="text-sm text-muted-foreground">{text}</span>
                  </div>
                ))}
              </div>

              {displayError && (
                <div className={payHarmony.noticeError}>
                  <div className="flex gap-2">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{displayError}</span>
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={handleEnroll}
                className="btn-pay-primary w-auto inline-flex items-center gap-2 px-5 py-2.5 rounded-full"
              >
                <Fingerprint className="h-4 w-4" />
                Enable Passkey
              </button>
            </div>
          )}

          {step === "enrolling" && (
            <div className="space-y-4">
              <div className={payHarmony.cardInset}>
                <div className="flex items-center gap-3">
                  <Loader2 className="h-5 w-5 animate-spin text-accent" />
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {status === "deploying" ? "Deploying smart account…" : "Waiting for passkey…"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {status === "deploying"
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

          {step === "done" && (
            <div className="space-y-4">
              <div className={cn(payHarmony.noticeAccent, "flex items-center gap-3")}>
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

          {step === "unsupported" && (
            <div className="space-y-4">
              <div className={payHarmony.noticeWarn}>
                <div className="flex gap-2">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
                  <div>
                    <p className="font-medium text-amber-900">Passkeys not supported</p>
                    <p className="mt-1 text-amber-800">
                      Your browser or device does not support WebAuthn platform authenticators.
                      Try Chrome, Safari, or Edge on a device with biometrics.
                    </p>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="btn-pay inline-flex items-center gap-2 px-5 py-2.5 rounded-full"
              >
                Dismiss
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
