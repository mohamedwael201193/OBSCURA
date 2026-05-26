// PayHarmonyHome — Private Treasury Mission Control (W5P1.9.4)
// Stripe · Mercury · Linear · Encrypted private banking OS.
// Hero is a two-column mission console: balance/posture on the left,
// always-visible Treasury Checklist on the right (onboarding + health).

import { useCallback, useState } from "react";
import { AnimatePresence, motion, type Variants } from "framer-motion";
import {
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronRight,
  Eye,
  EyeOff,
  Inbox,
  Lock,
  Network,
  Plug,
  Repeat,
  Send,
  Shield,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { useAccount, useChainId, useSwitchChain } from "wagmi";
import { cn } from "@/lib/utils";
import { HarmonyStatusBanner } from "@/components/harmony/harmony-ui";
import { useOcUSDCBalance } from "@/hooks/useOcUSDCBalance";
import { useUSDCBalance } from "@/hooks/useUSDCBalance";
import { useStealthInbox } from "@/hooks/useStealthInbox";
import { useReceipts } from "@/hooks/useReceipts";
import { useOnboardingState } from "@/hooks/useOnboardingState";

const ARB_SEPOLIA_CHAIN_ID = 421614;

type PayTab =
  | "home"
  | "pay"
  | "getpaid"
  | "automations"
  | "activity"
  | "settings";

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function formatRelativeTime(ts?: number): string {
  if (!ts) return "—";
  const diff = Date.now() - ts;
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h`;
  return `${Math.floor(hr / 24)}d`;
}

// ── Inline primitives ────────────────────────────────────────────────────────

function LiveDot({ active }: { active: boolean }) {
  return (
    <span className="relative inline-flex h-[7px] w-[7px] shrink-0">
      {active && (
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[hsl(var(--success))] opacity-40" />
      )}
      <span
        className={cn(
          "relative inline-flex h-[7px] w-[7px] rounded-full transition-colors duration-500",
          active ? "bg-[hsl(var(--success))]" : "bg-border",
        )}
      />
    </span>
  );
}

function PostureItem({
  label,
  active,
}: {
  label: string;
  active: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] transition-colors duration-500",
        active ? "text-foreground/65" : "text-muted-foreground/30",
      )}
    >
      <LiveDot active={active} />
      {label}
    </span>
  );
}

function VaultBalance({
  revealed,
  display,
  onToggle,
}: {
  revealed: boolean;
  display: string | null;
  onToggle: () => void;
}) {
  return (
    <div className="space-y-2.5">
      <div className="flex items-baseline gap-3">
        <AnimatePresence mode="wait" initial={false}>
          {revealed && display ? (
            <motion.span
              key="revealed"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
              className="font-display text-[2.75rem] tabular-nums leading-none text-foreground"
            >
              {display}
            </motion.span>
          ) : (
            <motion.span
              key="hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.12 }}
              className="select-none font-display text-[2.75rem] leading-none cipher-shimmer"
            >
              ••••••
            </motion.span>
          )}
        </AnimatePresence>
        <span className="self-end pb-1.5 font-mono text-[11px] text-muted-foreground/40">
          ocUSDC
        </span>
      </div>
      <div className="flex items-center gap-3">
        <span className="inline-flex items-center gap-1.5 rounded border border-[hsl(var(--success))]/20 bg-[hsl(var(--success))]/5 px-2 py-[3px] font-mono text-[9px] uppercase tracking-[0.18em] text-[hsl(var(--success))]/70">
          <span className="h-[5px] w-[5px] rounded-full bg-[hsl(var(--success))]/60" />
          Encrypted
        </span>
        <button
          type="button"
          onClick={onToggle}
          className="inline-flex items-center gap-1 font-mono text-[10px] text-muted-foreground/45 transition-colors hover:text-foreground"
        >
          {revealed && display ? (
            <>
              <EyeOff className="h-3 w-3" />
              Hide
            </>
          ) : (
            <>
              <Eye className="h-3 w-3" />
              Reveal
            </>
          )}
        </button>
      </div>
    </div>
  );
}

function ActionPill({
  icon: Icon,
  label,
  sublabel,
  badge,
  onClick,
}: {
  icon: typeof Send;
  label: string;
  sublabel: string;
  badge?: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative flex items-center gap-3 overflow-hidden rounded-xl hairline bg-card p-3 text-left transition-all duration-150 hover:bg-muted/50 hover:shadow-[0_2px_16px_0_hsl(var(--foreground)/0.05)] active:scale-[0.98]"
    >
      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-muted text-foreground/65 transition-all duration-150 group-hover:bg-foreground/[0.09] group-hover:scale-105">
        <Icon className="h-[15px] w-[15px]" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-medium text-foreground">
          {label}
        </p>
        <p className="truncate text-[11px] leading-tight text-muted-foreground/55">
          {sublabel}
        </p>
      </div>
      <ArrowRight className="mr-0.5 h-[11px] w-[11px] shrink-0 translate-x-1.5 opacity-0 transition-all duration-150 group-hover:translate-x-0 group-hover:opacity-25" />
      {badge != null && badge > 0 && (
        <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-foreground px-1.5 font-mono text-[9px] leading-none text-background">
          {badge}
        </span>
      )}
    </button>
  );
}

type ChecklistStep = {
  num: number;
  title: string;
  hint: string;
  privacyNote: string;
  done: boolean;
  active: boolean;
  loading?: boolean;
  actionLabel?: string;
  onAction?: () => void;
  externalHref?: string;
  externalLabel?: string;
};

function ChecklistRow({ step }: { step: ChecklistStep }) {
  const dimmed = !step.done && !step.active && !step.loading;
  return (
    <div
      className={cn(
        "relative flex items-start gap-3 px-4 py-3 transition-colors",
        step.active && "bg-muted/30",
      )}
    >
      {step.active && (
        <span className="absolute inset-y-0 left-0 w-[2px] rounded-r-full bg-foreground/75" />
      )}
      <div className="mt-[1px] shrink-0">
        {step.loading ? (
          <div className="h-[16px] w-[16px] animate-spin rounded-full border-[1.5px] border-border border-t-foreground" />
        ) : step.done ? (
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 500, damping: 20 }}
            className="flex h-[16px] w-[16px] items-center justify-center rounded-full bg-[hsl(var(--success))]/85"
          >
            <Check className="h-[9px] w-[9px] text-background" strokeWidth={3} />
          </motion.div>
        ) : step.active ? (
          <div className="flex h-[16px] w-[16px] items-center justify-center rounded-full border-[1.5px] border-foreground bg-foreground/[0.06]">
            <span className="font-mono text-[8px] font-bold leading-none text-foreground">
              {step.num}
            </span>
          </div>
        ) : (
          <div className="flex h-[16px] w-[16px] items-center justify-center rounded-full border border-border/60">
            <span className="font-mono text-[8px] leading-none text-muted-foreground/40">
              {step.num}
            </span>
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1 space-y-1">
        <p
          className={cn(
            "text-[12px] font-medium leading-tight",
            step.done
              ? "text-foreground/45"
              : step.active
                ? "text-foreground"
                : dimmed
                  ? "text-muted-foreground/40"
                  : "text-muted-foreground/55",
          )}
        >
          {step.title}
        </p>
        {(step.active || (!step.done && !dimmed)) && (
          <p className="text-[11px] leading-snug text-muted-foreground/55">
            {step.hint}
          </p>
        )}
        {step.active && (
          <p className="pt-0.5 font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground/40">
            {step.privacyNote}
          </p>
        )}
        {step.active && (step.actionLabel || step.externalHref) && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1.5">
            {step.actionLabel && step.onAction && (
              <button
                type="button"
                onClick={step.onAction}
                className="btn-pay btn-pay-primary btn-pay-sm"
              >
                {step.actionLabel}
              </button>
            )}
            {step.externalHref && (
              <a
                href={step.externalHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-[5px] font-mono text-[10px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                {step.externalLabel ?? "Open"}
                <ArrowRight className="h-[10px] w-[10px]" />
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Privacy flow visualization ─────────────────────────────────────────────────

function PrivacyFlowViz({ active }: { active: boolean }) {
  return (
    <div className="flex items-center gap-2 px-5 py-3">
      {/* Node: You */}
      <div className="flex flex-col items-center gap-1">
        <div className="grid h-6 w-6 place-items-center rounded-md border border-border/50 bg-card">
          <Plug className="h-[9px] w-[9px] text-muted-foreground/40" />
        </div>
        <span className="font-mono text-[7px] uppercase tracking-[0.1em] text-muted-foreground/30">
          You
        </span>
      </div>

      {/* Line 1 */}
      <div className="relative flex flex-1 items-center overflow-hidden">
        <div className="h-[1px] w-full bg-border/40" />
        {active && (
          <motion.div
            className="absolute h-[3px] w-[3px] rounded-full bg-foreground/25"
            animate={{ left: ["8%", "88%"] }}
            transition={{
              duration: 1.6,
              repeat: Infinity,
              ease: "linear",
              repeatDelay: 0.4,
            }}
          />
        )}
        <span className="absolute left-1/2 -translate-x-1/2 bg-card px-0.5 font-mono text-[6px] uppercase tracking-[0.08em] text-muted-foreground/25">
          fhe
        </span>
      </div>

      {/* Node: Sealed */}
      <div className="flex flex-col items-center gap-1">
        <div
          className={cn(
            "grid h-6 w-6 place-items-center rounded-md border bg-card transition-colors duration-700",
            active
              ? "border-[hsl(var(--success))]/35 bg-[hsl(var(--success))]/[0.05]"
              : "border-border/50",
          )}
        >
          <Lock
            className={cn(
              "h-[9px] w-[9px] transition-colors duration-700",
              active
                ? "text-[hsl(var(--success))]/55"
                : "text-muted-foreground/35",
            )}
          />
        </div>
        <span className="font-mono text-[7px] uppercase tracking-[0.1em] text-muted-foreground/30">
          Sealed
        </span>
      </div>

      {/* Line 2 */}
      <div className="relative flex flex-1 items-center overflow-hidden">
        <div className="h-[1px] w-full bg-border/40" />
        {active && (
          <motion.div
            className="absolute h-[3px] w-[3px] rounded-full bg-foreground/20"
            animate={{ left: ["8%", "88%"] }}
            transition={{
              duration: 1.6,
              repeat: Infinity,
              ease: "linear",
              delay: 0.8,
              repeatDelay: 0.4,
            }}
          />
        )}
      </div>

      {/* Node: Explorer blocked */}
      <div className="flex flex-col items-center gap-1">
        <div className="relative grid h-6 w-6 place-items-center rounded-md border border-border/50 bg-card">
          <EyeOff className="h-[9px] w-[9px] text-muted-foreground/30" />
          {active && (
            <span className="absolute -right-0.5 -top-0.5 flex h-[8px] w-[8px] items-center justify-center rounded-full bg-foreground/75">
              <span className="font-mono text-[5px] font-bold leading-none text-background">
                ×
              </span>
            </span>
          )}
        </div>
        <span className="font-mono text-[7px] uppercase tracking-[0.1em] text-muted-foreground/30">
          Explorer
        </span>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function PayHarmonyHome({
  onNavigate,
}: {
  onNavigate: (tab: PayTab) => void;
}) {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const { decrypted, reveal, busy: revealBusy } = useOcUSDCBalance();
  const usdcBalance = useUSDCBalance();
  const inbox = useStealthInbox();
  const receipts = useReceipts();
  const onboarding = useOnboardingState();

  const isWrongChain = isConnected && chainId !== ARB_SEPOLIA_CHAIN_ID;
  const unread = inbox.unreadCount ?? 0;
  const usdcNum = usdcBalance ? parseFloat(usdcBalance) : 0;
  const hasPrivateUsdc = onboarding.hasPrivateUsdc;
  const ocDisplay =
    decrypted != null
      ? (Number(decrypted) / 1_000_000).toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })
      : null;

  const [balanceRevealed, setBalanceRevealed] = useState(false);
  const [showActivityAmounts, setShowActivityAmounts] = useState(false);
  const greeting = getGreeting();

  const openFaucet = useCallback(
    () =>
      window.open(
        "https://www.alchemy.com/faucets/arbitrum-sepolia",
        "_blank",
      ),
    [],
  );
  const openUsdcFaucet = useCallback(
    () => window.open("https://faucet.circle.com/", "_blank"),
    [],
  );

  const isFullyActive = onboarding.hasActivity;

  const steps: ChecklistStep[] = [
    {
      num: 1,
      title: "Get ETH for gas",
      hint:
        onboarding.ethChecked && onboarding.ethBalance > 0.0001
          ? `${onboarding.ethBalance.toFixed(4)} ETH ready`
          : "Small amount of test ETH covers all fees",
      privacyNote: "Needed to submit encrypted transactions",
      done: onboarding.ethChecked && onboarding.ethBalance > 0.0001,
      active: onboarding.ethChecked && onboarding.ethBalance <= 0.0001,
      loading: !onboarding.ethChecked,
      externalHref: "https://www.alchemy.com/faucets/arbitrum-sepolia",
      externalLabel: "Faucet",
    },
    {
      num: 2,
      title: "Add testnet USDC",
      hint:
        usdcNum > 0 || hasPrivateUsdc
          ? `$${usdcNum.toFixed(2)} USDC available`
          : "Get Circle testnet USDC",
      privacyNote: "Plain USDC is visible on-chain until encrypted",
      done: usdcNum > 0 || hasPrivateUsdc,
      active:
        onboarding.ethChecked &&
        onboarding.ethBalance > 0.0001 &&
        !usdcNum &&
        !hasPrivateUsdc,
      externalHref: "https://faucet.circle.com/",
      externalLabel: "Faucet",
    },
    {
      num: 3,
      title: "Shield USDC → ocUSDC",
      hint: hasPrivateUsdc
        ? "Balance is encrypted on-chain"
        : "Convert public USDC into encrypted ocUSDC",
      privacyNote: "Invisible to Etherscan and indexers",
      done: hasPrivateUsdc,
      active: (usdcNum > 0 || onboarding.hasUsdc) && !hasPrivateUsdc,
      actionLabel: "Shield USDC",
      onAction: () => onNavigate("pay"),
    },
    {
      num: 4,
      title: "Enable private receiving",
      hint: onboarding.isStealthRegistered
        ? "Stealth address published"
        : "Publish a stealth address to receive privately",
      privacyNote: "Breaks the on-chain payment graph",
      done: onboarding.isStealthRegistered,
      active: hasPrivateUsdc && !onboarding.isStealthRegistered,
      actionLabel: "Set up",
      onAction: () => onNavigate("getpaid"),
    },
    {
      num: 5,
      title: "Send first private payment",
      hint: onboarding.hasActivity
        ? "Treasury is live"
        : "Amounts stay encrypted end-to-end",
      privacyNote: "Explorer sees a transfer with no amount",
      done: onboarding.hasActivity,
      active: onboarding.isStealthRegistered && !onboarding.hasActivity,
      actionLabel: "Send",
      onAction: () => onNavigate("pay"),
    },
  ];

  const doneCount = steps.filter((s) => s.done).length;
  const progress = (doneCount / steps.length) * 100;

  type PrimaryAction = {
    label: string;
    icon: typeof Send;
    onClick: () => void;
  };

  const primaryAction: PrimaryAction = (() => {
    if (!isConnected)
      return {
        label: "Connect wallet",
        icon: Plug,
        onClick: () => onNavigate("settings"),
      };
    if (!onboarding.ethChecked || onboarding.ethBalance < 0.0001)
      return { label: "Get Arbitrum ETH", icon: Zap, onClick: openFaucet };
    if (!onboarding.hasUsdc && !hasPrivateUsdc)
      return {
        label: "Get testnet USDC",
        icon: ArrowDownLeft,
        onClick: openUsdcFaucet,
      };
    if (onboarding.hasUsdc && !hasPrivateUsdc)
      return {
        label: "Shield USDC",
        icon: Shield,
        onClick: () => onNavigate("pay"),
      };
    if (!onboarding.isStealthRegistered)
      return {
        label: "Enable private receiving",
        icon: ShieldCheck,
        onClick: () => onNavigate("getpaid"),
      };
    if (!onboarding.hasActivity)
      return {
        label: "Send first payment",
        icon: Send,
        onClick: () => onNavigate("pay"),
      };
    if (unread > 0)
      return {
        label: `Claim ${unread} payment${unread > 1 ? "s" : ""}`,
        icon: Inbox,
        onClick: () => onNavigate("getpaid"),
      };
    return {
      label: "Send a payment",
      icon: Send,
      onClick: () => onNavigate("pay"),
    };
  })();

  const PrimaryIcon = primaryAction.icon;

  const headline = !isConnected
    ? { eyebrow: "Obscura Pay", title: "Private payments,\ninvisible on-chain." }
    : isFullyActive
      ? {
          eyebrow: `${greeting}, treasury`,
          title: "Your treasury is sealed.\nReady for encrypted activity.",
        }
      : {
          eyebrow: `${greeting} · ${doneCount}/${steps.length} sealed`,
          title: "Set up your\nprivate treasury.",
        };

  const activity = receipts.receipts.slice(0, 4).map((r) => ({
    icon:
      r.kind.includes("receive") || r.kind.includes("claim")
        ? ArrowDownLeft
        : ArrowUpRight,
    title: r.kind.replace(/-/g, " "),
    meta: r.recipientLabel
      ? r.recipientLabel
      : r.txHash
        ? `${r.txHash.slice(0, 6)}…${r.txHash.slice(-4)}`
        : "",
    value: r.amount ? `${r.amount} ocUSDC` : null,
    encrypted: true,
    time: formatRelativeTime((r as { timestamp?: number }).timestamp),
  }));

  const fadeUp: Variants = {
    hidden: { opacity: 0, y: 10 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.28,
        delay: i * 0.06,
        ease: [0.16, 1, 0.3, 1] as const,
      },
    }),
  };

  return (
    <div className="space-y-2.5">
      {isWrongChain && (
        <HarmonyStatusBanner
          variant="warning"
          icon={<Network className="h-4 w-4" />}
          message="Switch to Arbitrum Sepolia to use Obscura Pay."
          action={{
            label: "Switch network →",
            onClick: () => switchChain?.({ chainId: ARB_SEPOLIA_CHAIN_ID }),
          }}
        />
      )}

      {/* ── HERO · Mission Console ──────────────────────────────────────────── */}
      <motion.section
        custom={0}
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        className="overflow-hidden rounded-2xl hairline bg-card"
      >
        {/* Privacy posture bar */}
        <div
          className={cn(
            "flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-border/60 px-6 py-2.5",
            !isConnected && "opacity-30",
          )}
        >
          <PostureItem
            label="Balance hidden"
            active={isConnected && hasPrivateUsdc}
          />
          <span className="select-none text-[10px] text-border/50">·</span>
          <PostureItem
            label="Explorer blocked"
            active={isConnected && hasPrivateUsdc}
          />
          <span className="select-none text-[10px] text-border/50">·</span>
          <PostureItem
            label="Receiving private"
            active={isConnected && onboarding.isStealthRegistered}
          />
        </div>

        {/* Hero grid: balance left · checklist right */}
        <div className="grid lg:grid-cols-[1.15fr_1fr]">
          {/* LEFT — balance + headline + primary CTA */}
          <div className="border-b border-border/50 px-6 py-5 lg:border-b-0 lg:border-r lg:px-7 lg:py-6">
            <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-muted-foreground/45">
              {headline.eyebrow}
            </p>
            <h1 className="mt-1.5 whitespace-pre-line font-display text-[1.7rem] leading-[1.15] tracking-tight text-foreground sm:text-[1.95rem]">
              {headline.title}
            </h1>

            {isConnected ? (
              <>
                <div className="mt-5">
                  <p className="mb-1.5 font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground/35">
                    Private balance
                  </p>
                  <VaultBalance
                    revealed={balanceRevealed}
                    display={ocDisplay}
                    onToggle={async () => {
                      if (!balanceRevealed && decrypted == null && !revealBusy) {
                        try { await reveal(); } catch { /* error shown elsewhere */ }
                      }
                      setBalanceRevealed((v) => !v);
                    }}
                  />
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-x-2.5 gap-y-1">
                  <span className="font-mono text-[11px] text-muted-foreground/45">
                    {usdcNum > 0
                      ? `$${usdcNum.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                        })} public`
                      : "No public USDC"}
                  </span>
                  <span className="select-none text-[11px] text-border/50">·</span>
                  <span
                    className={cn(
                      "font-mono text-[11px] transition-colors",
                      unread > 0
                        ? "font-medium text-foreground/75"
                        : "text-muted-foreground/45",
                    )}
                  >
                    {unread > 0
                      ? `${unread} payment${unread > 1 ? "s" : ""} waiting`
                      : "Inbox clear"}
                  </span>
                </div>
                <div className="mt-5 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={primaryAction.onClick}
                    className="inline-flex h-9 items-center justify-center gap-2 rounded-full bg-foreground px-5 text-[13px] font-medium text-background transition-opacity hover:opacity-90 active:scale-[0.97]"
                  >
                    <PrimaryIcon className="h-[14px] w-[14px]" />
                    {primaryAction.label}
                  </button>
                  {isFullyActive && (
                    <button
                      type="button"
                      onClick={() => onNavigate("activity")}
                      className="inline-flex h-9 items-center justify-center gap-1.5 rounded-full border border-border/70 px-4 text-[13px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                      View activity
                      <ChevronRight className="h-[14px] w-[14px]" />
                    </button>
                  )}
                </div>
                {hasPrivateUsdc && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <span className="inline-flex items-center gap-1 rounded-full border border-border/40 bg-muted/40 px-2.5 py-[3px] font-mono text-[9px] text-muted-foreground/50">
                      <Lock className="h-[8px] w-[8px]" />
                      Invisible on explorers
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full border border-border/40 bg-muted/40 px-2.5 py-[3px] font-mono text-[9px] text-muted-foreground/50">
                      <Shield className="h-[8px] w-[8px]" />
                      Amounts unreadable
                    </span>
                    {onboarding.isStealthRegistered && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-border/40 bg-muted/40 px-2.5 py-[3px] font-mono text-[9px] text-muted-foreground/50">
                        <ShieldCheck className="h-[8px] w-[8px]" />
                        Payment graph broken
                      </span>
                    )}
                  </div>
                )}
              </>
            ) : (
              <>
                <p className="mt-3 max-w-sm text-[13px] leading-relaxed text-muted-foreground/65">
                  Encrypted balances. Invisible amounts. Stealth-address
                  receiving. Built on Fhenix CoFHE.
                </p>
                <div className="mt-5">
                  <button
                    type="button"
                    onClick={primaryAction.onClick}
                    className="inline-flex h-9 items-center justify-center gap-2 rounded-full bg-foreground px-5 text-[13px] font-medium text-background transition-opacity hover:opacity-90 active:scale-[0.97]"
                  >
                    <PrimaryIcon className="h-[14px] w-[14px]" />
                    {primaryAction.label}
                  </button>
                </div>
              </>
            )}
          </div>

          {/* RIGHT — Treasury checklist (always visible) */}
          <div className="flex flex-col bg-muted/15">
            <div className="flex items-center justify-between border-b border-border/50 px-5 py-3">
              <div>
                <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground/55">
                  Treasury checklist
                </p>
                <p className="mt-0.5 text-[12px] font-medium text-foreground">
                  {doneCount === steps.length
                    ? "Fully sealed"
                    : doneCount === 0
                      ? "Begin initialisation"
                      : `${doneCount} of ${steps.length} sealed`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] text-muted-foreground/45">
                  {Math.round(progress)}%
                </span>
                <div className="h-[3px] w-20 overflow-hidden rounded-full bg-border/50">
                  <motion.div
                    className={cn(
                      "h-full rounded-full transition-colors duration-700",
                      doneCount === steps.length
                        ? "bg-[hsl(var(--success))]"
                        : "bg-foreground",
                    )}
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.85, ease: [0.16, 1, 0.3, 1] }}
                  />
                </div>
              </div>
            </div>
            <div className="flex-1 divide-y divide-border/40">
              {steps.map((s) => (
                <ChecklistRow key={s.num} step={s} />
              ))}
            </div>
            <div className="border-t border-border/50 bg-card/40">
              <PrivacyFlowViz active={doneCount >= 3} />
            </div>
          </div>
        </div>
      </motion.section>

      {/* ── Quick actions ───────────────────────────────────────────────────── */}
      <motion.div
        custom={1}
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-2 gap-2 sm:grid-cols-4"
      >
        <ActionPill
          icon={Send}
          label="Send"
          sublabel="Encrypted transfer"
          onClick={() => onNavigate("pay")}
        />
        <ActionPill
          icon={ArrowDownLeft}
          label="Request"
          sublabel="Stealth receive"
          badge={unread > 0 ? unread : undefined}
          onClick={() => onNavigate("getpaid")}
        />
        <ActionPill
          icon={Repeat}
          label="Automate"
          sublabel="Streams · escrows"
          onClick={() => onNavigate("automations")}
        />
        <ActionPill
          icon={Shield}
          label="Shield"
          sublabel="USDC → ocUSDC"
          onClick={() => onNavigate("pay")}
        />
      </motion.div>

      {/* ── Activity (compact, secondary) ───────────────────────────────────── */}
      <motion.section
        custom={2}
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        className="overflow-hidden rounded-2xl hairline bg-card"
      >
        <header className="flex items-center justify-between border-b border-border/60 px-5 py-2.5">
          <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground/55">
            Recent activity
            {activity.length > 0 && (
              <span className="ml-2 normal-case tracking-normal text-muted-foreground/35">
                · last {activity.length}
              </span>
            )}
          </p>
          {activity.length > 0 && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowActivityAmounts((v) => !v)}
                title={showActivityAmounts ? "Hide amounts" : "Reveal amounts"}
                className="flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.1em] text-muted-foreground/40 transition-colors hover:text-muted-foreground/70 hairline"
              >
                {showActivityAmounts ? (
                  <><EyeOff className="h-[9px] w-[9px]" /> Hide</>  
                ) : (
                  <><Eye className="h-[9px] w-[9px]" /> Reveal</>  
                )}
              </button>
              <button
                type="button"
                onClick={() => onNavigate("activity")}
                className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground/50 transition-colors hover:text-foreground"
              >
                View all →
              </button>
            </div>
          )}
        </header>
        {activity.length === 0 ? (
          <div className="px-5 py-7 text-center">
            <div className="mx-auto mb-2.5 grid h-9 w-9 place-items-center rounded-full bg-muted">
              <Lock className="h-[14px] w-[14px] text-muted-foreground/50" />
            </div>
            <p className="text-[12px] font-medium text-foreground/60">
              Your treasury is sealed.
            </p>
            <p className="mt-0.5 text-[11px] text-muted-foreground/40">
              Encrypted transfers will appear here.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border/40">
            {activity.map((r, i) => {
              const Icon = r.icon;
              return (
                <li
                  key={i}
                  className="flex items-center gap-3 px-5 py-2 transition-colors hover:bg-muted/30"
                >
                  <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-muted text-foreground/55">
                    <Icon className="h-[13px] w-[13px]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12px] font-medium capitalize text-foreground">
                      {r.title}
                    </p>
                    <p className="truncate font-mono text-[10px] text-muted-foreground/50">
                      {r.meta}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-mono text-[12px] tabular-nums text-muted-foreground/60">
                      {showActivityAmounts && r.value ? r.value : "••••• ocUSDC"}
                    </p>
                    <p className="font-mono text-[10px] text-muted-foreground/40">
                      {r.time}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </motion.section>
    </div>
  );
}
