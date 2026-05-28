import { Award, CheckCircle2, Loader2, RefreshCcw, ShieldCheck, Vote } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useReputationSummary, type ReputationSummary } from "@/hooks/useReputationSummary";
import { cn } from "@/lib/utils";

const CATEGORY_SIGNALS = {
  pay: [
    "private_payment_sent",
    "private_payment_received",
    "stream_created",
    "stream_cycle_settled",
    "escrow_redeemed",
    "invoice_paid",
    "subscription_consumed",
  ],
  credit: [
    "credit_liquidity_supplied",
    "credit_collateral_supplied",
    "credit_borrowed",
    "credit_repaid",
    "credit_vault_deposited",
    "credit_score_updated",
  ],
  governance: [
    "vote_participated",
    "vote_changed",
    "vote_delegated",
    "governance_vote_cast",
    "governance_proposed",
  ],
} as const;

const TIER_LABEL: Record<ReputationSummary["tier"], string> = {
  new: "Building",
  active: "Active",
  steady: "Steady",
  reliable: "Reliable",
};

function categoryScore(summary: ReputationSummary | null, keys: readonly string[]): number {
  if (!summary) return 0;
  return keys.reduce((total, key) => total + (summary.signals[key]?.cappedWeight ?? 0), 0);
}

function lastUpdated(summary: ReputationSummary | null): string {
  if (!summary?.updatedAt) return "No signals yet";
  return new Date(summary.updatedAt).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function CategoryRow({ label, value, icon: Icon }: { label: string; value: number; icon: LucideIcon }) {
  const width = Math.min(100, value * 8);
  return (
    <div className="rounded-xl hairline bg-card p-3">
      <div className="flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-2 text-sm text-foreground">
          <Icon className="h-3.5 w-3.5 text-[hsl(var(--success))]" /> {label}
        </span>
        <span className="font-mono text-xs text-muted-foreground tabular-nums">{value}</span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-[hsl(var(--success))]" style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

export function CreditReputationPanel({ compact = false }: { compact?: boolean }) {
  const { summary, isLoading, error, refresh, lastFetchedAt } = useReputationSummary();
  const payScore = categoryScore(summary, CATEGORY_SIGNALS.pay);
  const creditScore = categoryScore(summary, CATEGORY_SIGNALS.credit);
  const governanceScore = categoryScore(summary, CATEGORY_SIGNALS.governance);
  const tier = summary ? TIER_LABEL[summary.tier] : "Private";

  return (
    <div className={cn("overflow-hidden rounded-2xl hairline bg-card", compact && "h-full")}>
      <div className="border-b border-border p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Private reputation</p>
            <p className="mt-1 font-display text-2xl">Credit tier</p>
          </div>
          <button
            type="button"
            onClick={refresh}
            disabled={isLoading}
            className="inline-flex h-8 items-center gap-1.5 rounded-full hairline px-3 text-xs text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
          >
            {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCcw className="h-3 w-3" />}
            Refresh
          </button>
        </div>
      </div>

      <div className="p-5">
        <div className="grid gap-4 md:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-2xl bg-foreground p-5 text-background">
            <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] opacity-70">
              <Award className="h-3.5 w-3.5" /> Current tier
            </div>
            <p className="mt-4 font-display text-4xl leading-none">{tier}</p>
            <p className="mt-3 text-sm opacity-70">
              Built from capped Pay, Credit, and governance signals. Higher tiers unlock larger beta borrow limits without exposing raw counterparties, notes, or amounts.
            </p>
            <div className="mt-5 flex flex-wrap gap-2 text-[11px]">
              <span className="rounded-full bg-background/10 px-2.5 py-1 font-mono">Score {summary?.totalCappedWeight ?? 0}</span>
              <span className="rounded-full bg-background/10 px-2.5 py-1 font-mono">Updated {lastUpdated(summary)}</span>
            </div>
          </div>

          <div className="space-y-2.5">
            <CategoryRow label="Pay reliability" value={payScore} icon={CheckCircle2} />
            <CategoryRow label="Credit discipline" value={creditScore} icon={ShieldCheck} />
            <CategoryRow label="Governance participation" value={governanceScore} icon={Vote} />
          </div>
        </div>

        {error && <p className="mt-4 text-xs text-destructive">{error}</p>}
        {!error && !summary && !isLoading && (
          <p className="mt-4 text-sm text-muted-foreground">
            No reputation signals have been indexed for this wallet yet. Pay activity, repayments, and governance participation will appear as broad categories after indexing.
            New wallets can still test Credit with a small beta limit.
          </p>
        )}
        {lastFetchedAt && (
          <p className="mt-4 text-[11px] text-muted-foreground">Aggregate refreshed {new Date(lastFetchedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}.</p>
        )}
      </div>
    </div>
  );
}