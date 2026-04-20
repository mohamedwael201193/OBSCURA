import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { FileText, Clock, CheckCircle, Lock, RefreshCw, Search, XCircle, Users, Timer } from "lucide-react";
import { useWatchContractEvent } from "wagmi";
import { useProposalCount, useProposal, CATEGORY_LABELS } from "@/hooks/useProposals";
import { OBSCURA_VOTE_ABI, OBSCURA_VOTE_ADDRESS } from "@/config/contracts";

type ProposalStatus = "active" | "ended" | "finalized" | "cancelled";
type StatusFilter = "all" | ProposalStatus;

function getStatus(deadline: bigint, isFinalized: boolean, isCancelled: boolean): ProposalStatus {
  if (isCancelled) return "cancelled";
  if (isFinalized) return "finalized";
  const now = BigInt(Math.floor(Date.now() / 1000));
  return now < deadline ? "active" : "ended";
}

const statusConfig: Record<ProposalStatus, { label: string; color: string; icon: typeof Clock }> = {
  active: { label: "Active", color: "text-green-400 bg-green-400/10 border-green-400/20", icon: Clock },
  ended: { label: "Ended", color: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20", icon: Lock },
  finalized: { label: "Finalized", color: "text-primary bg-primary/10 border-primary/20", icon: CheckCircle },
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

  return <span className="text-primary font-semibold">{remaining}</span>;
}

function ProposalRow({ proposalId, searchQuery, statusFilter }: { proposalId: bigint; searchQuery: string; statusFilter: StatusFilter }) {
  const { proposal, isLoading } = useProposal(proposalId);

  if (isLoading || !proposal || !proposal.exists) return null;

  const status = getStatus(proposal.deadline, proposal.isFinalized, proposal.isCancelled);

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
      className="p-4 bg-secondary/30 rounded-md border border-border/30 space-y-2"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <span className="text-sm text-muted-foreground/50 w-8 shrink-0 mt-0.5">
            #{proposal.id.toString()}
          </span>
          <div className="min-w-0">
            <div className="text-sm text-foreground">{proposal.title}</div>
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
        <span className={`text-xs tracking-[0.2em] uppercase px-2 py-0.5 rounded-md border shrink-0 ${cfg.color}`}>
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
    </motion.div>
  );
}

export default function ProposalList() {
  const { data: count, isLoading, refetch } = useProposalCount();
  const proposalCount = Number(count ?? 0);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

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
    <div className="glass-panel rounded-md p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-primary" />
          <span className="text-sm tracking-[0.2em] uppercase text-primary font-mono">
            All Proposals
          </span>
        </div>
        <button
          onClick={() => refetch()}
          title="Refresh proposals"
          className="p-1 text-muted-foreground hover:text-primary transition-colors"
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
            className="w-full bg-secondary/50 border border-border/50 rounded-md pl-9 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:border-primary/40"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setStatusFilter(f.key)}
              className={`px-2.5 py-1 text-[11px] rounded-md border transition-all ${
                statusFilter === f.key
                  ? "border-primary/40 text-primary bg-primary/10"
                  : "border-border/50 text-muted-foreground hover:border-primary/20"
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
            <ProposalRow key={i} proposalId={BigInt(i)} searchQuery={searchQuery} statusFilter={statusFilter} />
          ))}
        </div>
      )}
    </div>
  );
}
