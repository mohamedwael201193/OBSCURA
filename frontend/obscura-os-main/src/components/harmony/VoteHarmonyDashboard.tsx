import { motion } from "framer-motion";
import {
  ArrowRight,
  Award,
  BarChart3,
  FileText,
  RotateCcw,
  ShieldCheck,
  TrendingUp,
  Vote as VoteIcon,
} from "lucide-react";
import { useAccount } from "wagmi";
import { useProposalCount } from "@/hooks/useProposals";
import { useReputationSummary } from "@/hooks/useReputationSummary";
import { VoteKpi, VoteNotice, vh } from "@/components/harmony/voteHarmonyUi";

const TIER_LABEL: Record<string, string> = {
  new: "New",
  active: "Active",
  steady: "Steady",
  reliable: "Reliable",
};

export function VoteHarmonyDashboard({
  onVote,
  onParticipation,
  onOpenProposals,
  onCreate,
}: {
  onVote: () => void;
  onParticipation: () => void;
  onOpenProposals: () => void;
  onCreate?: () => void;
}) {
  const { isConnected } = useAccount();
  const { summary, isLoading: repLoading } = useReputationSummary();
  const { data: count, isLoading: countLoading } = useProposalCount();
  const totalProposals = Number(count ?? 0);

  const tierLabel =
    !isConnected || repLoading ? "—" : TIER_LABEL[summary?.tier ?? "new"];
  const scoreLabel =
    !isConnected || repLoading ? "—" : String(summary?.totalCappedWeight ?? 0);
  const proposalLabel = countLoading ? "…" : String(totalProposals);

  return (
    <div className="vote-harmony-panel space-y-6">
      <section className="rounded-2xl border border-border bg-muted/35 p-5 sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
              Private governance
            </p>
            <h1 className="mt-2 font-display text-3xl leading-tight text-foreground sm:text-4xl md:text-5xl">
              Obscura Vote
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground md:text-base">
              Cast private votes on Arbitrum Sepolia. Change your mind before the deadline.
              Only aggregate totals are revealed — never individual choices.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <button
              type="button"
              onClick={onVote}
              className="inline-flex h-11 min-h-[44px] items-center justify-center gap-2 rounded-full bg-foreground px-5 text-sm font-medium text-background"
            >
              <VoteIcon className="h-4 w-4" />
              Vote privately
            </button>
            <button
              type="button"
              onClick={onOpenProposals}
              className="inline-flex h-11 min-h-[44px] items-center justify-center gap-2 rounded-full hairline px-5 text-sm font-medium hover:bg-muted/60"
            >
              <FileText className="h-4 w-4" />
              Browse proposals
            </button>
          </div>
        </div>

        <div className={`${vh.kpiGrid} mt-6`}>
          <VoteKpi
            icon={FileText}
            label="Proposals"
            value={proposalLabel}
            sub="Active proposals listed below"
          />
          <VoteKpi icon={Award} label="Reputation tier" value={tierLabel} sub="Shared Pay signals" />
          <VoteKpi icon={TrendingUp} label="Participation score" value={scoreLabel} sub="Aggregate only" />
          <VoteKpi icon={ShieldCheck} label="Privacy mode" value="Encrypted" sub="Reveal on demand" />
        </div>
      </section>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="grid gap-3 sm:grid-cols-3"
      >
        {[
          { i: VoteIcon, l: "Vote", v: "Your choice stays sealed", c: "text-[hsl(var(--success))]" },
          { i: RotateCcw, l: "Revote", v: "Change before deadline", c: "text-amber-700" },
          { i: BarChart3, l: "Reveal", v: "Totals only, never ballots", c: "text-sky-800" },
        ].map((k) => (
          <div key={k.l} className="rounded-2xl hairline bg-card p-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <k.i className={`h-4 w-4 ${k.c}`} />
              <span className="font-mono text-[10px] uppercase tracking-[0.16em]">{k.l}</span>
            </div>
            <p className="mt-2 text-sm font-medium text-foreground">{k.v}</p>
          </div>
        ))}
      </motion.div>

      <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground">Recommended next step</p>
            <p className="mt-1 max-w-xl text-sm text-muted-foreground">
              {totalProposals === 0
                ? "No proposals yet. Create one to start private governance, or check back soon."
                : "Review open proposals and cast your encrypted ballot before deadlines pass."}
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={onVote}
              className="inline-flex h-10 min-h-[44px] items-center justify-center gap-2 rounded-full bg-foreground px-4 text-sm font-medium text-background"
            >
              Vote now
              <ArrowRight className="h-4 w-4" />
            </button>
            {onCreate && (
              <button
                type="button"
                onClick={onCreate}
                className="inline-flex h-10 min-h-[44px] items-center justify-center rounded-full hairline px-4 text-sm font-medium hover:bg-muted/60"
              >
                Create proposal
              </button>
            )}
            <button
              type="button"
              onClick={onParticipation}
              className="inline-flex h-10 min-h-[44px] items-center justify-center rounded-full hairline px-4 text-sm text-muted-foreground hover:bg-muted/60 hover:text-foreground"
            >
              Participation
            </button>
          </div>
        </div>
      </div>

      <VoteNotice icon={ShieldCheck}>
        Proposal titles and participation counts are public. Your selected option stays encrypted until you
        explicitly verify it on this device. Final results show aggregate totals only.
      </VoteNotice>
    </div>
  );
}
