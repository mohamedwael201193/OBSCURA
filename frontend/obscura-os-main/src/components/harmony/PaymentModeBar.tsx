/**
 * PaymentModeBar — premium fintech privacy-mode switch.
 *
 * Public Mode | Private Mode
 *
 * Public Mode uses public USDC + passkeys + sponsored UserOps. Private Mode
 * uses encrypted ocUSDC + wallet execution.
 */
import { EyeOff, Fingerprint, Lock, Wallet, Zap } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { usePaymentMode } from "@/contexts/PaymentModeContext";

interface PaymentModeBarProps {
  /** Called when user clicks Public Mode but passkey setup is not complete */
  onSetupSmart?: () => void;
  className?: string;
}

function ModeSegment({
  active,
  dimmed,
  icon: Icon,
  label,
  description,
  badge,
  status,
  onClick,
}: {
  active: boolean;
  dimmed?: boolean;
  icon: typeof Wallet;
  label: string;
  description: string;
  badge?: string;
  status?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative flex flex-1 flex-col gap-0.5 px-5 py-3.5 text-left",
        "transition-all duration-200 focus-visible:outline-none",
        active
          ? "bg-foreground text-background"
          : dimmed
            ? "cursor-pointer opacity-60 hover:opacity-80 hover:bg-muted/30"
            : "hover:bg-muted/40",
      )}
    >
      <div className="flex items-center gap-2">
        <Icon
          className={cn(
            "h-[13px] w-[13px] shrink-0",
            active
              ? "text-background/70"
              : dimmed
                ? "text-muted-foreground/50"
                : "text-foreground/65",
          )}
        />
        <span
          className={cn(
            "text-[13px] font-medium",
            active
              ? "text-background"
              : dimmed
                ? "text-muted-foreground/60"
                : "text-foreground",
          )}
        >
          {label}
        </span>
        <AnimatePresence mode="wait">
          {active && (
            <motion.span
              key="active-badge"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.15 }}
              className="ml-auto rounded-full bg-background/15 px-2 py-px font-mono text-[9px] uppercase tracking-[0.14em] text-background/65"
            >
              Active
            </motion.span>
          )}
          {!active && badge && (
            <motion.span
              key="setup-badge"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="ml-auto rounded-full border border-border/50 px-1.5 py-px font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground/40"
            >
              {badge}
            </motion.span>
          )}
        </AnimatePresence>
      </div>
      <p
        className={cn(
          "text-[11px] leading-tight",
          active
            ? "text-background/50"
            : dimmed
              ? "text-muted-foreground/35"
              : "text-muted-foreground/50",
        )}
      >
        {description}
      </p>
      {status && (
        <span
          className={cn(
            "mt-1 inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.12em]",
            active
              ? "bg-background/15 text-background/65"
              : "bg-muted text-muted-foreground/55",
          )}
        >
          {status}
        </span>
      )}
    </button>
  );
}

export function PaymentModeBar({ onSetupSmart, className }: PaymentModeBarProps) {
  const {
    privacyMode,
    setPrivacyMode,
    isSmartAvailable,
    isSmartDeployed,
    isSmartEnrolled,
    smartAccountAddress,
  } = usePaymentMode();

  return (
    <div className={cn("overflow-hidden rounded-xl hairline bg-card", className)}>
      <div className="flex divide-x divide-border/50">
        <ModeSegment
          active={privacyMode === "private"}
          icon={EyeOff}
          label="Private Mode"
          description="Encrypted ocUSDC, hidden amounts, wallet-secured"
          badge="Default"
          status="Wallet execution"
          onClick={() => setPrivacyMode("private")}
        />
        <ModeSegment
          active={privacyMode === "public"}
          icon={Zap}
          label="Public Mode"
          description="Visible USDC with passkey signing and sponsored gas"
          badge={isSmartAvailable ? "USDC" : "Setup →"}
          status={isSmartAvailable ? "Smart account" : "Passkey needed"}
          onClick={
            isSmartAvailable
              ? () => setPrivacyMode("public")
              : () => {
                  setPrivacyMode("public");
                  onSetupSmart?.();
                }
          }
        />
      </div>

      <AnimatePresence>
        {privacyMode === "public" && (
          <motion.div
            key="public-footer"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden border-t border-border/40 bg-muted/20 px-5 py-2"
          >
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground/45">
              <span className="inline-flex items-center gap-1">
                <Fingerprint className="h-3 w-3" /> Passkey UserOps
              </span>
              <span className="inline-flex items-center gap-1">
                <Zap className="h-3 w-3" /> Sponsored gas
              </span>
              <span className="inline-flex items-center gap-1">
                <Wallet className="h-3 w-3" /> Public USDC
              </span>
              {!isSmartAvailable && (
                <button
                  type="button"
                  onClick={() => {
                    setPrivacyMode("public");
                    onSetupSmart?.();
                  }}
                  className="text-foreground/70 hover:text-foreground"
                >
                  Set up passkey →
                </button>
              )}
            </div>
          </motion.div>
        )}
        {privacyMode === "private" && (
          <motion.div
            key="private-footer"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden border-t border-border/40 bg-muted/20 px-5 py-2"
          >
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground/45">
              <span className="inline-flex items-center gap-1"><Lock className="h-3 w-3" /> Encrypted amounts</span>
              <span className="inline-flex items-center gap-1"><EyeOff className="h-3 w-3" /> Stealth receiving</span>
              <span className="inline-flex items-center gap-1"><Wallet className="h-3 w-3" /> Wallet-secured FHE</span>
              {isSmartDeployed && isSmartEnrolled && smartAccountAddress && (
                <span>Public smart account ready when you switch</span>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
