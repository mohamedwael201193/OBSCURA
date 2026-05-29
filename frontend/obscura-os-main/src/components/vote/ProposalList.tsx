import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { FileText, Clock, CheckCircle2, RefreshCw, Search, Users, Timer, ArrowRight } from "lucide-react";
import { useWatchContractEvent } from "wagmi";
import { useProposalCount, useProposal, CATEGORY_LABELS } from "@/hooks/useProposals";
import { OBSCURA_VOTE_ABI, OBSCURA_VOTE_ADDRESS } from "@/config/contracts";
import { useChainTime } from "@/hooks/useChainTime";
import { VoteStatusPill, type VoteProposalStatus } from "@/components/harmony/voteHarmonyUi";

type ProposalStatus = VoteProposalStatus;
type StatusFilter = "all" | ProposalStatus;

function getStatus(deadline: bigint, isFinalized: boolean, isCancelled: boolean, now: bigint): ProposalStatus {
  if (isCancelled) return "cancelled";
  if (isFinalized) return "finalized";
  return now < deadline ? "active" : "ended";
}

function ProposalRowSkeleton() {
  return (
    <div className="rounded-xl hairline bg-card p-4 space-y-2 animate-pulse">
      <div className="flex items-start gap-3">
        <div className="w-8 h-4 bg-muted rounded mt-0.5" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-muted rounded w-3/4" />
          <div className="h-3 bg-muted rounded w-1/2" />
          <div className="flex gap-2">
            <div className="h-5 bg-muted rounded w-16" />
            <div className="h-5 bg-muted rounded w-16" />
            <div className="h-5 bg-muted rounded w-12" />
          </div>
        </div>
        <div className="h-5 bg-muted rounded w-16 shrink-0" />
      </div>
      <div className="pl-11 h-3 bg-muted rounded w-40" />
    </div>
  );
}

const statusRail: Record<ProposalStatus, string> = {
  active: "border-l-[hsl(var(--success))]",
  ended: "border-l-amber-500",
  finalized: "border-l-sky-600",
  cancelled: "border-l-destructive",
};

function Countdown({ deadline }: { deadline: bigint }) {
  const [remaining, setRemaining] = useState("");

  useEffect(() => {
    function update() {
      const now = Math.floor(Date.now() / 1000);
      const diff = Number(deadline) - now;
      if (diff <= 0) { setRemaining("Ended"); return; }
      const d = Math.floor(diff / 86400);
      const h = Math.floor((diff % 86400) / 3600);
      const m = Math.floor((diff % 3600) / 60);
      const s = diff % 60;
      if (d > 0) setRemaining(`${d}d ${h}h ${m}m`);
      else if (h > 0) setRemaining(`${h}h ${m}m ${s}s`);
      else setRemaining(`${m}m ${s}s`);
    }
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [deadline]);

  return <span className="text-foreground font-semibold">{remaining}</span>;
}

function ProposalRow({ proposalId, searchQuery, statusFilter, onVote, now }: { proposalId: bigint; searchQuery: string; statusFilter: StatusFilter; onVote?: (id: number) => void; now: bigint }) {
  const { proposal, isLoading } = useProposal(proposalId);

  if (isLoading || !proposal || !proposal.exists) return null;

  const status = getStatus(proposal.deadline, proposal.isFinalized, proposal.isCancelled, now);

  // Filter by status
  if (statusFilter !== "all" && status !== statusFilter) return null;

  // Filter by search
  if (searchQuery && !proposal.title.toLowerCase().includes(searchQuery.toLowerCase())) return null;

  const cfg = statusRail[status];
  const deadlineDate = new Date(Number(proposal.deadline) * 1000);
  const catLabel = CATEGORY_LABELS[proposal.category] ?? "General";

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl border border-border border-l-4 bg-card p-4 ${cfg} transition-colors hover:bg-muted/20`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="mt-0.5 w-8 shrink-0 font-mono text-xs text-muted-foreground">
            #{proposal.id.toString()}
          </span>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-foreground">{proposal.title}</div>
            {proposal.description && (
              <div className="text-xs text-muted-foreground/60 mt-0.5 truncate">{proposal.description}</div>
            )}
            <div className="flex flex-wrap gap-2 mt-1.5">
              <span className="text-[11px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded-md">
                {catLabel}
              </span>
              <span className="text-[11px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded-md">
                {proposal.numOptions} options
              </span>
              <span className="text-[11px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded-md flex items-center gap-1">
                <Users className="w-2.5 h-2.5" /> {proposal.totalVoters.toString()}
                {proposal.quorum > 0n && ` / ${proposal.quorum.toString()}`}
              </span>
            </div>
            {proposal.quorum > 0n && (
              <div className="mt-2 space-y-1">
                <div className="flex items-center justify-between text-[10px] text-muted-foreground/50">
                  <span>{proposal.totalVoters.toString()} / {proposal.quorum.toString()} voters</span>
                  {proposal.totalVoters >= proposal.quorum
                    ? <span className="text-foreground flex items-center gap-0.5"><CheckCircle2 className="w-2.5 h-2.5" /> Quorum met</span>
                    : <span className="text-amber-400/70">Quorum needed</span>
                  }
                </div>
                <div className="h-1 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(Number((proposal.totalVoters * 100n) / proposal.quorum), 100)}%`,
                      background: proposal.totalVoters >= proposal.quorum ? '#10b981' : '#f59e0b',
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
        <VoteStatusPill status={status} />
      </div>
      <div className="mt-3 flex flex-col gap-2 pl-11 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-xs text-muted-foreground">Deadline: {deadlineDate.toLocaleString()}</span>
        {status === "active" && (
          <span className="flex items-center gap-1 text-xs text-[hsl(var(--success))]">
            <Timer className="h-3 w-3" />
            <Countdown deadline={proposal.deadline} />
          </span>
        )}
      </div>
      {status === "active" && onVote && (
        <div className="mt-3 pl-11">
          <button
            type="button"
            onClick={() => onVote(Number(proposalId))}
            className="inline-flex min-h-[40px] items-center gap-2 rounded-full bg-foreground px-4 text-xs font-medium text-background"
          >
            Vote privately <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </motion.div>
  );
}

export default function ProposalList({
  onVote,
  initialFilter = "active",
  embedded = false,
}: {
  onVote?: (id: number) => void;
  initialFilter?: StatusFilter;
  embedded?: boolean;
}) {
  const { data: count, isLoading, refetch } = useProposalCount();
  const proposalCount = Number(count ?? 0);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(initialFilter);
  const now = useChainTime();

  // Instantly refetch when a new proposal is created on-chain
  useWatchContractEvent({
    address: OBSCURA_VOTE_ADDRESS,
    abi: OBSCURA_VOTE_ABI,
    eventName: 'ProposalCreated',
    onLogs: () => { refetch(); },
  });

  const filters: { key: StatusFilter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "active", label: "Active" },
    { key: "ended", label: "Ended" },
    { key: "finalized", label: "Finalized" },
    { key: "cancelled", label: "Cancelled" },
  ];

  return (
    <div className="space-y-5">
      {!embedded && (
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-muted hairline">
            <FileText className="h-4 w-4 text-foreground" />
          </div>
          <div className="min-w-0">
            <h3 className="font-display text-sm font-semibold leading-tight text-foreground">Private proposals</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">Browse, filter, and vote privately</p>
          </div>
          <button
            type="button"
            onClick={() => refetch()}
            title="Refresh proposals"
            className="ml-auto grid h-10 w-10 place-items-center rounded-full hairline text-muted-foreground hover:bg-muted/60 hover:text-foreground"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      )}

      {embedded && (
        <button
          type="button"
          onClick={() => refetch()}
          title="Refresh proposals"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </button>
      )}

      {/* Search + Filters */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/40" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search proposals..."
            className="pay-input pl-9"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {filters.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setStatusFilter(f.key)}
              className={`min-h-[36px] rounded-full border px-3 py-1.5 text-[11px] font-medium transition-all ${
                statusFilter === f.key
                  ? "border-[hsl(var(--success))]/40 bg-[hsl(var(--accent))]/12 text-foreground"
                  : "hairline text-muted-foreground hover:bg-muted/60"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => <ProposalRowSkeleton key={i} />)}
        </div>
      ) : proposalCount === 0 ? (
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <FileText className="w-8 h-8 text-muted-foreground/20" />
          <div className="text-sm text-muted-foreground/60">No proposals yet.</div>
            <div className="text-[11px] text-muted-foreground/40">Create a private proposal when you are ready for voters.</div>
        </div>
      ) : (
        <div className="space-y-2">
          {statusFilter !== "all" && (
            <div className="rounded-xl border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
              Showing {statusFilter} proposals first. If nothing is listed, no {statusFilter} proposal is available for this wallet right now. Use All to review closed history and revealable results.
            </div>
          )}
          {Array.from({ length: proposalCount }, (_, i) => (
            <ProposalRow key={i} proposalId={BigInt(i)} searchQuery={searchQuery} statusFilter={statusFilter} onVote={onVote} now={now} />
          ))}
        </div>
      )}
    </div>
  );
}
