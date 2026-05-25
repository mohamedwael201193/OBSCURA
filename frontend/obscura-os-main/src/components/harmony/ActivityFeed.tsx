/**
 * ActivityFeed.tsx — Harmony-styled on-chain activity feed
 *
 * Displays filterable, paginated activity pulled from Supabase (indexed from chain events).
 * Listens to Supabase Realtime for live updates.
 */

import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowUpRight,
  ArrowDownLeft,
  Repeat2,
  FileText,
  Shield,
  User,
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

// ─── Filter tab config ────────────────────────────────────────────────────────
const FILTER_TABS: { key: ActivityEventType; label: string }[] = [
  { key: "all",      label: "All" },
  { key: "sent",     label: "Sent" },
  { key: "received", label: "Received" },
  { key: "stream",   label: "Streams" },
  { key: "invoice",  label: "Invoices" },
  { key: "escrow",   label: "Escrow" },
  { key: "stealth",  label: "Stealth" },
];

// ─── Event icon mapping ───────────────────────────────────────────────────────
function EventIcon({ eventName }: { eventName: string }) {
  if (eventName.includes("Sent"))       return <ArrowUpRight   className="h-4 w-4 text-[#2D6A4F]" />;
  if (eventName.includes("Received"))   return <ArrowDownLeft  className="h-4 w-4 text-[#2D6A4F]" />;
  if (eventName.includes("Stream"))     return <Repeat2        className="h-4 w-4 text-[#2D6A4F]" />;
  if (eventName.includes("Invoice"))    return <FileText       className="h-4 w-4 text-[#2D6A4F]" />;
  if (eventName.includes("Escrow"))     return <Shield         className="h-4 w-4 text-[#2D6A4F]" />;
  if (eventName.includes("Stealth"))    return <User           className="h-4 w-4 text-[#2D6A4F]" />;
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
    "ObscuraInvoice.InvoiceCreated":                      "Invoice created",
    "ObscuraInvoice.InvoicePaid":                         "Invoice paid",
    "ObscuraConfidentialEscrow.EscrowDeposited":          "Escrow deposited",
    "ObscuraConfidentialEscrow.EscrowReleased":           "Escrow released",
    "ObscuraConfidentialEscrow.EscrowRefunded":           "Escrow refunded",
    "ObscuraStealthRegistry.StealthAddressRegistered":    "Stealth address registered",
  };
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
      className="flex items-center gap-4 py-3 border-b border-[#E8E5E0] last:border-0"
    >
      {/* Icon */}
      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[#F0EDE8]">
        <EventIcon eventName={item.event_name} />
      </div>

      {/* Label */}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-[#1a1a1a] leading-tight">
          {eventLabel(item.event_name)}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Block {item.block_number}
        </p>
      </div>

      {/* Right side */}
      <div className="text-right">
        <a
          href={arbscanHref}
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono text-[11px] text-[#2D6A4F] hover:underline"
        >
          {txShort}
        </a>
        <p className="mt-0.5 text-[11px] text-muted-foreground">{rel}</p>
      </div>
    </motion.div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export function ActivityFeed() {
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
  } = useActivityFeed();

  const isEmpty = !isLoading && items.length === 0;

  return (
    <HarmonyFormCard
      title="On-chain activity"
      eyebrow="Live · Indexed from chain"
    >
      {/* Filter pills */}
      <div className="mb-5 flex flex-wrap gap-2">
        {FILTER_TABS.map((t) => (
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
          className="ml-auto rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-[#F0EDE8]"
          aria-label="Refresh"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
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
          No activity found for this filter.
        </p>
      )}

      {address && items.length > 0 && (
        <AnimatePresence initial={false}>
          {items.map((item) => (
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
