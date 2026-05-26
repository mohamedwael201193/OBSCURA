/**
 * PaymentModeBar — premium fintech segmented control.
 *
 * Wallet Mode | Smart Mode
 *
 * Smart Mode is locked + shows "Setup →" when smart account is not yet
 * deployed + passkey enrolled. Pass `onSetupSmart` to handle the nav.
 */
import { Fingerprint, Wallet } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { usePaymentMode } from "@/contexts/PaymentModeContext";

interface PaymentModeBarProps {
  /** Called when user clicks Smart Mode but it's not yet set up */
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
  onClick,
}: {
  active: boolean;
  dimmed?: boolean;
  icon: typeof Wallet;
  label: string;
  description: string;
  badge?: string;
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
    </button>
  );
}

export function PaymentModeBar({ onSetupSmart, className }: PaymentModeBarProps) {
  const { mode, setMode, isSmartAvailable } = usePaymentMode();

  return (
    <div className={cn("overflow-hidden rounded-xl hairline bg-card", className)}>
      <div className="flex divide-x divide-border/50">
        <ModeSegment
          active={mode === "wallet"}
          icon={Wallet}
          label="Wallet Mode"
          description="Standard wallet confirmations"
          onClick={() => setMode("wallet")}
        />
        <ModeSegment
          active={mode === "smart"}
          dimmed={!isSmartAvailable}
          icon={Fingerprint}
          label="Smart Mode"
          description="Biometric · Gasless payments"
          badge={isSmartAvailable ? undefined : "Setup →"}
          onClick={
            isSmartAvailable
              ? () => setMode("smart")
              : (onSetupSmart ?? (() => {}))
          }
        />
      </div>

      <AnimatePresence>
        {mode === "smart" && (
          <motion.div
            key="smart-footer"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden border-t border-border/40 bg-muted/20 px-5 py-2"
          >
            <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground/45">
              Signed by your device · gas covered after one-time ocUSDC authorization
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
