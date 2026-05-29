/**
 * ActivityFeed.tsx — Harmony-styled on-chain activity feed
 *
 * Displays filterable, paginated activity pulled from Supabase (indexed from chain events).
 * Listens to Supabase Realtime for live updates.
 */

import { useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowUpRight,
  ArrowDownLeft,
  Repeat2,
  FileText,
  Shield,
  User,
  Landmark,
  Vote as VoteIcon,
  RefreshCw,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { useAccount } from "wagmi";
import {
  useActivityFeed,
  type ActivityEventType,
  type ActivityItem,
} from "@/hooks/useActivityFeed";
import { HarmonyFormCard } from "@/components/harmony/harmony-ui";
import type { PayPrivacyMode } from "@/contexts/PaymentModeContext";
import { filterActivityByPrivacyMode } from "@/lib/payModeFilters";

// ─── Filter tab config ────────────────────────────────────────────────────────
const FILTER_TABS: { key: ActivityEventType; label: string }[] = [
  { key: "all",      label: "All" },
  { key: "sent",     label: "Sent" },
  { key: "received", label: "Received" },
  { key: "stream",   label: "Streams" },
  { key: "invoice",  label: "Invoices" },
  { key: "escrow",   label: "Escrow" },
  { key: "stealth",  label: "Stealth" },
  { key: "credit",   label: "Credit" },
  { key: "vote",     label: "Vote" },
];

// ─── Event icon mapping ───────────────────────────────────────────────────────
function EventIcon({ eventName }: { eventName: string }) {
  if (eventName.includes("Sent"))       return <ArrowUpRight   className="h-4 w-4 text-[#2D6A4F]" />;
  if (eventName.includes("Received"))   return <ArrowDownLeft  className="h-4 w-4 text-[#2D6A4F]" />;
  if (eventName.includes("Stream"))     return <Repeat2        className="h-4 w-4 text-[#2D6A4F]" />;
  if (eventName.includes("Invoice"))    return <FileText       className="h-4 w-4 text-[#2D6A4F]" />;
  if (eventName.includes("Escrow"))     return <Shield         className="h-4 w-4 text-[#2D6A4F]" />;
  if (eventName.includes("Stealth"))    return <User           className="h-4 w-4 text-[#2D6A4F]" />;
  if (eventName.includes("Credit"))     return <Landmark       className="h-4 w-4 text-[#2D6A4F]" />;
  if (eventName.includes("ObscuraVote") || eventName.includes("ObscuraGovernor")
    || eventName.includes("ObscuraTreasury") || eventName.includes("ObscuraRewards")) {
    return <VoteIcon className="h-4 w-4 text-[#2D6A4F]" />;
  }
  return <ArrowUpRight className="h-4 w-4 text-muted-foreground" />;
}

// ─── Pretty event label ───────────────────────────────────────────────────────
function eventLabel(eventName: string): string {
  const map: Record<string, string> = {
    "ObscuraPay.PaymentSent":                             "Payment sent",
    "ObscuraPay.PaymentReceived":                         "Payment received",
    "ObscuraPayStreamV2.StreamCreated":                   "Stream created",
    "ObscuraPayStreamV2.StreamCancelled":                 "Stream cancelled",
    "ObscuraPayStreamV2.StreamWithdrawn":                 "Stream withdrawn",
    "ObscuraPayStreamV3.StreamCreated":                   "Stream created",
    "ObscuraPayStreamV3.StreamCancelled":                 "Stream cancelled",
    "ObscuraPayStreamV3.CycleSettled":                    "Stream cycle settled",
    "ObscuraInvoice.InvoiceCreated":                      "Invoice created",
    "ObscuraInvoice.InvoicePaid":                         "Invoice paid",
    "ObscuraConfidentialEscrow.EscrowCreated":            "Escrow created",
    "ObscuraConfidentialEscrow.EscrowFunded":             "Escrow funded",
    "ObscuraConfidentialEscrow.EscrowRedeemed":           "Escrow redeemed",
    "ObscuraConfidentialEscrow.EscrowCancelled":          "Escrow cancelled",
    "ObscuraConfidentialEscrow.EscrowDeposited":          "Escrow deposited",
    "ObscuraConfidentialEscrow.EscrowReleased":           "Escrow released",
    "ObscuraConfidentialEscrow.EscrowRefunded":           "Escrow refunded",
    "ObscuraStealthRegistry.Announcement":                "Private payment announced",
    "ObscuraStealthRegistry.MetaAddressSet":              "Private receiving enabled",
    "ObscuraStealthRegistry.StealthAddressRegistered":    "Stealth address registered",
  };
  if (eventName.includes("CreditMarket") || eventName.startsWith("CreditMarket")) {
    const suffix = eventName.split(".").pop();
    if (suffix === "Supplied") return "Credit supplied";
    if (suffix === "Withdrew") return "Credit supply withdrawn";
    if (suffix === "CollateralSupplied") return "Credit collateral supplied";
    if (suffix === "CollateralWithdrawn") return "Credit collateral withdrawn";
    if (suffix === "Borrowed") return "Credit borrow opened";
    if (suffix === "Repaid") return "Credit repayment recorded";
    if (suffix === "LiquidationOpened") return "Credit liquidation opened";
  }
  if (eventName.includes("CreditVault") || eventName.startsWith("CreditVault")) {
    const suffix = eventName.split(".").pop();
    if (suffix === "Deposited") return "Credit vault deposit";
    if (suffix === "Withdrew") return "Credit vault withdrawal";
  }
  if (eventName.includes("CreditAuction") || eventName.startsWith("CreditAuction")) {
    const suffix = eventName.split(".").pop();
    if (suffix === "AuctionOpened") return "Credit auction opened";
    if (suffix === "BidSubmitted") return "Credit sealed bid submitted";
    if (suffix === "AuctionSettled") return "Credit auction settled";
  }
  if (eventName.includes("CreditScore") || eventName.startsWith("CreditScore")) {
    const suffix = eventName.split(".").pop();
    if (suffix === "ScoreUpdated") return "Credit tier updated";
  }
  if (eventName.startsWith("ObscuraVote")) {
    const suffix = eventName.split(".").pop();
    if (suffix === "ProposalCreated") return "Private proposal opened";
    if (suffix === "VoteCast") return "Private vote recorded";
    if (suffix === "VoteChanged") return "Private vote updated";
    if (suffix === "VoteFinalized") return "Final totals available";
    if (suffix === "ProposalCancelled") return "Private proposal cancelled";
    if (suffix === "DeadlineExtended") return "Voting deadline extended";
    if (suffix === "DelegateSet") return "Delegate selected";
    if (suffix === "DelegateRemoved") return "Delegation removed";
  }
  if (eventName.startsWith("ObscuraGovernor")) {
    const suffix = eventName.split(".").pop();
    if (suffix === "ProposalCreated") return "Executable proposal opened";
    if (suffix === "VoteCast") return "Executable vote recorded";
    if (suffix === "ProposalQueued") return "Executable proposal queued";
    if (suffix === "ProposalExecuted") return "Executable proposal executed";
    if (suffix === "ProposalCanceled") return "Executable proposal cancelled";
  }
  if (eventName.startsWith("ObscuraTreasury")) {
    const suffix = eventName.split(".").pop();
    if (suffix === "SpendAttached") return "Treasury spend attached";
    if (suffix === "FinalizationRecorded") return "Treasury timelock started";
    if (suffix === "SpendExecuted") return "Treasury spend executed";
    if (suffix === "FundsReceived") return "Treasury deposit received";
    if (suffix === "TimelockDurationUpdated") return "Treasury timelock updated";
  }
  if (eventName.startsWith("ObscuraRewards")) {
    const suffix = eventName.split(".").pop();
    if (suffix === "RewardAccrued") return "Voter reward accrued";
    if (suffix === "WithdrawalRequested") return "Reward withdrawal requested";
    if (suffix === "RewardWithdrawn") return "Voter reward withdrawn";
    if (suffix === "RewardsFunded") return "Reward pool funded";
  }
  return map[eventName] ?? eventName.split(".").pop() ?? eventName;
}

// ─── Single row ───────────────────────────────────────────────────────────────
function ActivityRow({ item }: { item: ActivityItem }) {
  const date = new Date(item.created_at);
  const rel  = formatRelative(date);
  const txShort = `${item.tx_hash.slice(0, 8)}…${item.tx_hash.slice(-4)}`;
  const arbscanHref = `https://sepolia.arbiscan.io/tx/${item.tx_hash}`;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.18 }}
      className="flex items-center gap-3 py-3 border-b border-[#E8E5E0] last:border-0 sm:gap-4"
    >
      {/* Icon */}
      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[#F0EDE8]">
        <EventIcon eventName={item.event_name} />
      </div>

      {/* Label */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-[#1a1a1a] leading-tight">
          {eventLabel(item.event_name)}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Block {item.block_number}
        </p>
      </div>

      {/* Right side */}
      <div className="min-w-[76px] shrink-0 text-right">
        <a
          href={arbscanHref}
          target="_blank"
          rel="noopener noreferrer"
          className="block truncate font-mono text-[11px] text-[#2D6A4F] hover:underline"
        >
          {txShort}
        </a>
        <p className="mt-0.5 text-[11px] text-muted-foreground">{rel}</p>
      </div>
    </motion.div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export function ActivityFeed({
  mode = "private",
  defaultFilter = "all",
  filters,
  title,
  eyebrow,
  emptyMessage,
}: {
  mode?: PayPrivacyMode;
  defaultFilter?: ActivityEventType;
  filters?: ActivityEventType[];
  title?: string;
  eyebrow?: string;
  emptyMessage?: string;
}) {
  const { address } = useAccount();
  const {
    items,
    isLoading,
    error,
    filter,
    setFilter,
    loadMore,
    hasMore,
    refresh,
    realtimeStatus,
    lastEventAt,
    lastRefreshAt,
  } = useActivityFeed(defaultFilter);

  useEffect(() => {
    if (mode === "public" && filter !== "all") setFilter("all");
  }, [mode, filter, setFilter]);

  const visibleItems = useMemo(
    () => filterActivityByPrivacyMode(items, mode),
    [items, mode],
  );
  const isEmpty = !isLoading && visibleItems.length === 0;
  const allowedFilters = filters ? new Set(filters) : null;
  const tabs = mode === "public"
    ? FILTER_TABS.filter((tab) => tab.key === "all")
    : FILTER_TABS.filter((tab) => !allowedFilters || allowedFilters.has(tab.key));
  const statusLabel = realtimeStatus === "listening"
    ? "Realtime on"
    : realtimeStatus === "polling"
      ? "Polling fallback"
      : realtimeStatus === "connecting"
        ? "Connecting"
        : realtimeStatus === "error"
          ? "Feed unavailable"
          : "Idle";
  const statusTime = lastEventAt ?? lastRefreshAt;

  return (
    <HarmonyFormCard
      title={title ?? (mode === "public" ? "Public USDC activity" : "Private activity")}
      eyebrow={eyebrow ?? (mode === "public" ? "Public Mode · Indexed from chain" : "Private Mode · Indexed from chain")}
    >
      {/* Filter pills */}
      <div className="mb-5 flex flex-wrap items-center gap-2">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setFilter(t.key)}
            className={[
              "rounded-full px-3 py-1 text-xs font-medium transition-colors hairline",
              filter === t.key
                ? "bg-[#2D6A4F] text-white border-transparent"
                : "text-muted-foreground hover:bg-[#F0EDE8]",
            ].join(" ")}
          >
            {t.label}
          </button>
        ))}

        <button
          onClick={refresh}
          className="ml-0 rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-[#F0EDE8] sm:ml-auto"
          aria-label="Refresh"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1 rounded-full hairline px-2.5 py-1">
          <span className={["h-1.5 w-1.5 rounded-full", realtimeStatus === "listening" ? "bg-[hsl(var(--success))]" : realtimeStatus === "polling" ? "bg-amber-400" : "bg-muted-foreground"].join(" ")} />
          {statusLabel}
        </span>
        {statusTime && <span>Last sync {new Date(statusTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>}
      </div>

      {/* States */}
      {!address && (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Connect your wallet to see activity.
        </p>
      )}

      {address && isLoading && items.length === 0 && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-[#2D6A4F]" />
        </div>
      )}

      {address && error && (
        <div className="flex items-center gap-2 py-4 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {address && isEmpty && !error && (
        <p className="py-8 text-center text-sm text-muted-foreground">
          {emptyMessage ?? (mode === "public"
            ? "No indexed public USDC, smart-account, paymaster, or bridge activity found yet."
            : "No private ocUSDC activity found for this filter.")}
        </p>
      )}

      {address && visibleItems.length > 0 && (
        <AnimatePresence initial={false}>
          {visibleItems.map((item) => (
            <ActivityRow key={`${item.tx_hash}-${item.log_index}`} item={item} />
          ))}
        </AnimatePresence>
      )}

      {/* Load more */}
      {hasMore && (
        <div className="mt-4 flex justify-center">
          <button
            onClick={loadMore}
            disabled={isLoading}
            className="btn-pay-ghost text-sm disabled:opacity-50"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading…
              </span>
            ) : (
              "Load more"
            )}
          </button>
        </div>
      )}
    </HarmonyFormCard>
  );
}

// ─── Utility ──────────────────────────────────────────────────────────────────
function formatRelative(date: Date): string {
  const diff = Date.now() - date.getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60)     return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60)     return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24)     return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}
