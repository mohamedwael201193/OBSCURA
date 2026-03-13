import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { FileText, Clock, CheckCircle, Lock, RefreshCw, Search, XCircle, Users, Timer, ArrowRight } from "lucide-react";
import { useWatchContractEvent } from "wagmi";
import { useProposalCount, useProposal, CATEGORY_LABELS } from "@/hooks/useProposals";
import { OBSCURA_VOTE_ABI, OBSCURA_VOTE_ADDRESS } from "@/config/contracts";
import { useChainTime } from "@/hooks/useChainTime";

type ProposalStatus = "active" | "ended" | "finalized" | "cancelled";
type StatusFilter = "all" | ProposalStatus;

function getStatus(deadline: bigint, isFinalized: boolean, isCancelled: boolean, now: bigint): ProposalStatus {
  if (isCancelled) return "cancelled";
  if (isFinalized) return "finalized";
  return now < deadline ? "active" : "ended";
}

const statusConfig: Record<ProposalStatus, { label: string; color: string; icon: typeof Clock }> = {
  active: { label: "Active", color: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20", icon: Clock },
  ended: { label: "Ended", color: "text-amber-400 bg-amber-400/10 border-amber-400/20", icon: Lock },
  finalized: { label: "Finalized", color: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20", icon: CheckCircle },
  cancelled: { label: "Cancelled", color: "text-red-400 bg-red-400/10 border-red-400/20", icon: XCircle },
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

  return <span className="text-emerald-400 font-semibold">{remaining}</span>;
}

function ProposalRow({ proposalId, searchQuery, statusFilter, onVote, now }: { proposalId: bigint; searchQuery: string; statusFilter: StatusFilter; onVote?: (id: number) => void; now: bigint }) {
  const { proposal, isLoading } = useProposal(proposalId);

  if (isLoading || !proposal || !proposal.exists) return null;

  const status = getStatus(proposal.deadline, proposal.isFinalized, proposal.isCancelled, now);

  // Filter by status
  if (statusFilter !== "all" && status !== statusFilter) return null;

  // Filter by search
  if (searchQuery && !proposal.title.toLowerCase().includes(searchQuery.toLowerCase())) return null;

  const cfg = statusConfig[status];
  const deadlineDate = new Date(Number(proposal.deadline) * 1000);
  const catLabel = CATEGORY_LABELS[proposal.category] ?? "General";

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-lg bg-white/[0.025] border border-white/[0.06] p-4 space-y-2 hover:border-white/[0.12] transition-colors"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <span className="text-sm text-muted-foreground/50 w-8 shrink-0 mt-0.5">
            #{proposal.id.toString()}
          </span>
          <div className="min-w-0">
            <div className="text-sm text-foreground font-medium">{proposal.title}</div>
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
          </div>
        </div>
        <span className={`pay-badge border shrink-0 ${cfg.color}`}>
          <cfg.icon className="w-3 h-3 inline mr-1" />
          {cfg.label}
        </span>
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground pl-11">
        <span>Deadline: {deadlineDate.toLocaleString()}</span>
        {status === "active" && (
          <span className="flex items-center gap-1">
            <Timer className="w-3 h-3" />
            <Countdown deadline={proposal.deadline} />
          </span>
        )}
      </div>
      {/* Vote shortcut for active proposals */}
      {status === "active" && onVote && (
        <div className="pl-11">
          <button
            onClick={() => onVote(Number(proposalId))}
            className="flex items-center gap-1 text-[11px] text-emerald-400 hover:underline"
          >
            Vote on this <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      )}
    </motion.div>
  );
}

export default function ProposalList({ onVote }: { onVote?: (id: number) => void }) {
  const { data: count, isLoading, refetch } = useProposalCount();
  const proposalCount = Number(count ?? 0);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
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
    <div className="pay-card p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-700/10 border border-emerald-500/25 flex items-center justify-center shrink-0">
          <FileText className="w-4 h-4 text-emerald-400" />
        </div>
        <div className="min-w-0">
          <h3 className="font-display text-sm font-semibold text-foreground leading-tight">Browse Proposals</h3>
          <p className="text-[10px] text-muted-foreground/45 tracking-widest mt-0.5 uppercase">All governance polls</p>
        </div>
        <button
          onClick={() => refetch()}
          title="Refresh proposals"
          className="ml-auto p-1.5 text-muted-foreground hover:text-emerald-400 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

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
        <div className="flex gap-1.5 flex-wrap">
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setStatusFilter(f.key)}
              className={`px-2.5 py-1 text-[11px] rounded-md border transition-all ${
                statusFilter === f.key
                  ? "border-emerald-400/50 text-emerald-400 bg-emerald-400/10"
                  : "border-white/[0.09] text-muted-foreground hover:border-emerald-500/30"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground text-center py-4">Loading...</div>
      ) : proposalCount === 0 ? (
        <div className="text-sm text-muted-foreground text-center py-8">
          No proposals created yet. Go to the Create tab to make one.
        </div>
      ) : (
        <div className="space-y-2">
          {Array.from({ length: proposalCount }, (_, i) => (
            <ProposalRow key={i} proposalId={BigInt(i)} searchQuery={searchQuery} statusFilter={statusFilter} onVote={onVote} now={now} />
          ))}
        </div>
      )}
    </div>
  );
}
