import type { LucideIcon } from "lucide-react";
import {
  Award,
  CheckCircle2,
  History,
  Loader2,
  RefreshCcw,
  ShieldCheck,
  TrendingUp,
  Vote,
} from "lucide-react";
import { useAccount } from "wagmi";
import { useReputationSummary } from "@/hooks/useReputationSummary";
import { useVoterParticipation } from "@/hooks/useProposals";
import {
  REPUTATION_CATEGORY_SIGNALS,
  REPUTATION_TIER_LABEL,
  categoryScore,
  governanceEventCount,
} from "@/lib/reputationCategories";
import { VoteKpi, VoteNotice, vh } from "@/components/harmony/voteHarmonyUi";

function CategoryRow({ label, value, icon: Icon }: { label: string; value: number; icon: LucideIcon }) {
  const width = Math.min(100, value * 8);
  return (
    <div className="rounded-xl hairline bg-card p-3">
      <div className="flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-2 text-sm text-foreground">
          <Icon className="h-3.5 w-3.5 text-[hsl(var(--success))]" /> {label}
        </span>
        <span className="font-mono text-xs tabular-nums text-muted-foreground">{value}</span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-[hsl(var(--success))]" style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

function standingCopy(tier: keyof typeof REPUTATION_TIER_LABEL, votesCast: string): string {
  if (tier === "reliable") {
    return "Strong governance standing built from consistent private participation across Pay, Credit, and Vote.";
  }
  if (tier === "steady") {
    return "Established contributor. Keep voting on open proposals to strengthen your governance profile.";
  }
  if (tier === "active") {
    return "Active ecosystem participant. Your reputation grows from capped signals — never raw amounts or vote choices.";
  }
  if (Number(votesCast) > 0) {
    return "You have started participating in private governance. More Pay and Credit activity strengthens your tier.";
  }
  return "Start with a private vote or complete Pay activity. Reputation uses broad categories only — no financial history is exposed.";
}

export function VoteParticipationProfile() {
  const { isConnected, address } = useAccount();
  const { summary, isLoading, error, refresh, lastFetchedAt } = useReputationSummary();
  const { data: participationRaw, isLoading: participationLoading } = useVoterParticipation(address);

  const tier = summary ? REPUTATION_TIER_LABEL[summary.tier] : "—";
  const payScore = categoryScore(summary, REPUTATION_CATEGORY_SIGNALS.pay);
  const creditScore = categoryScore(summary, REPUTATION_CATEGORY_SIGNALS.credit);
  const governanceScore = categoryScore(summary, REPUTATION_CATEGORY_SIGNALS.governance);
  const govEvents = governanceEventCount(summary);
  const votesCast =
    !isConnected || participationLoading ? "—" : String(participationRaw ?? 0n);

  return (
    <div className="vote-harmony-panel space-y-5">
      <section className="overflow-hidden rounded-2xl border border-border bg-muted/35">
        <div className="border-b border-border bg-card/80 p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                Governance identity
              </p>
              <h2 className="mt-1 font-display text-2xl font-semibold text-foreground sm:text-3xl">
                Participation profile
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                Your standing is built from shared Pay, Credit, and Vote signals. Counts and tiers only — never amounts,
                notes, or ballot choices.
              </p>
            </div>
            <button
              type="button"
              onClick={refresh}
              disabled={isLoading || !isConnected}
              className="inline-flex h-9 items-center gap-1.5 rounded-full hairline px-3 text-xs text-muted-foreground hover:bg-muted/60 hover:text-foreground disabled:opacity-50"
            >
              {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCcw className="h-3 w-3" />}
              Refresh
            </button>
          </div>
        </div>

        <div className="p-5 sm:p-6">
          {!isConnected ? (
            <div className="rounded-xl hairline bg-muted/40 px-4 py-8 text-center text-sm text-muted-foreground">
              Connect your wallet to view participation status, reputation tier, and governance standing.
            </div>
          ) : (
            <>
              <div className={`${vh.kpiGrid} mb-5`}>
                <VoteKpi icon={Award} label="Reputation tier" value={isLoading ? "…" : tier} sub="Shared ecosystem" />
                <VoteKpi
                  icon={TrendingUp}
                  label="Participation score"
                  value={isLoading ? "…" : String(summary?.totalCappedWeight ?? 0)}
                  sub="Capped aggregate"
                />
                <VoteKpi icon={Vote} label="Votes cast" value={votesCast} sub="On-chain participation" />
                <VoteKpi
                  icon={History}
                  label="Governance events"
                  value={isLoading ? "…" : String(govEvents)}
                  sub="Indexed activity"
                />
              </div>

              <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
                <div className="rounded-2xl bg-foreground p-5 text-background">
                  <p className="font-mono text-[10px] uppercase tracking-[0.2em] opacity-70">Governance standing</p>
                  <p className="mt-3 font-display text-3xl leading-none">{isLoading ? "…" : tier}</p>
                  <p className="mt-3 text-sm leading-relaxed opacity-75">
                    {standingCopy(summary?.tier ?? "new", votesCast === "—" ? "0" : votesCast)}
                  </p>
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
                  No reputation signals indexed yet. Private votes, Pay transfers, and Credit activity will appear as
                  broad categories after the worker processes them.
                </p>
              )}
              {lastFetchedAt && (
                <p className="mt-3 text-[11px] text-muted-foreground">
                  Last refreshed {new Date(lastFetchedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </p>
              )}
            </>
          )}
        </div>
      </section>

      <VoteNotice icon={ShieldCheck}>
        Reputation is derived from the shared worker index. Vote activity records proposal participation only — never
        which option you selected. Use ballot history below to verify your own encrypted choices on this device.
      </VoteNotice>
    </div>
  );
}
