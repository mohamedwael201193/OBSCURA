import { useState } from "react";
import { History, CheckCircle, Clock, XCircle, Eye, AlertCircle, Ban } from "lucide-react";
import { useAccount } from "wagmi";
import { useProposalCount, useProposal, useProposalOptions, useHasVoted, CATEGORY_LABELS } from "@/hooks/useProposals";
import { useMyVote } from "@/hooks/useVoteTally";
import AsyncStepper from "@/components/shared/AsyncStepper";
import { FHEStepStatus } from "@/lib/constants";
import { useChainTime } from "@/hooks/useChainTime";
import {
  VotePanelHeader,
  VoteStatusPill,
  VoteTabs,
  VoteTimelineRow,
  type VoteProposalStatus,
} from "@/components/harmony/voteHarmonyUi";

type HistoryFilter = "all" | "voted" | "pending" | "missed";

function getStatus(deadline: bigint, isFinalized: boolean, isCancelled: boolean, now: bigint): VoteProposalStatus {
  if (isCancelled) return "cancelled";
  if (isFinalized) return "finalized";
  return now < deadline ? "active" : "ended";
}

function HistoryRow({
  index,
  address,
  filter,
}: {
  index: number;
  address: `0x${string}`;
  filter: HistoryFilter;
}) {
  const { proposal } = useProposal(BigInt(index));
  const { data: voted } = useHasVoted(BigInt(index), address);
  const { data: optionLabels } = useProposalOptions(BigInt(index));
  const { myVoteIndex, decryptMyVote, status, stepIndex, error: fheError } = useMyVote(BigInt(index));
  const [error, setError] = useState<string | null>(null);
  const now = useChainTime();

  if (!proposal?.exists) return null;

  const options = (optionLabels as string[]) ?? [];
  const ended = proposal.deadline <= now || proposal.isFinalized;
  const isCancelled = proposal.isCancelled;
  const proposalStatus = getStatus(proposal.deadline, proposal.isFinalized, proposal.isCancelled, now);

  const participation: "voted" | "pending" | "missed" =
    isCancelled ? "missed" : voted ? "voted" : ended ? "missed" : "pending";

  if (filter === "voted" && !voted) return null;
  if (filter === "pending" && (voted || ended || isCancelled)) return null;
  if (filter === "missed" && (voted || !ended || isCancelled)) return null;

  async function handleVerify() {
    setError(null);
    try {
      await decryptMyVote();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Verification failed";
      setError(msg);
    }
  }

  const railIcon = isCancelled ? (
    <div className="grid h-6 w-6 place-items-center rounded-full bg-destructive/10">
      <Ban className="h-3.5 w-3.5 text-destructive" />
    </div>
  ) : voted ? (
    <div className="grid h-6 w-6 place-items-center rounded-full bg-[hsl(var(--accent))]/15">
      <CheckCircle className="h-3.5 w-3.5 text-[hsl(var(--success))]" />
    </div>
  ) : ended ? (
    <div className="grid h-6 w-6 place-items-center rounded-full bg-muted">
      <XCircle className="h-3.5 w-3.5 text-muted-foreground" />
    </div>
  ) : (
    <div className="grid h-6 w-6 place-items-center rounded-full bg-amber-500/10">
      <Clock className="h-3.5 w-3.5 text-amber-700" />
    </div>
  );

  return (
    <VoteTimelineRow rail={railIcon}>
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <p className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
              #{index} · {CATEGORY_LABELS[proposal.category] ?? "General"}
            </p>
            <h4 className="mt-1 truncate text-sm font-semibold text-foreground">{proposal.title}</h4>
            <p className="mt-1 text-xs text-muted-foreground">
              Deadline {new Date(Number(proposal.deadline) * 1000).toLocaleDateString()}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <VoteStatusPill status={proposalStatus} />
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${
                participation === "voted"
                  ? "bg-[hsl(var(--accent))]/12 text-[hsl(var(--success))]"
                  : participation === "pending"
                    ? "bg-amber-500/10 text-amber-800"
                    : "bg-muted text-muted-foreground"
              }`}
            >
              {participation === "voted" ? "You voted" : participation === "pending" ? "Action needed" : "Missed"}
            </span>
          </div>
        </div>

        {voted && !isCancelled && (
          <div className="mt-3 border-t border-border pt-3">
            {myVoteIndex !== null ? (
              <p className="flex items-center gap-1.5 text-xs text-foreground">
                <Eye className="h-3.5 w-3.5 text-[hsl(var(--success))]" />
                Your vote: <span className="font-semibold">{options[myVoteIndex] ?? `Option ${myVoteIndex}`}</span>
              </p>
            ) : (
              <>
                {status !== FHEStepStatus.IDLE && status !== FHEStepStatus.READY && (
                  <AsyncStepper status={status} stepIndex={stepIndex} labels={["Connecting", "Decrypting", "Verified"]} />
                )}
                <button
                  type="button"
                  onClick={handleVerify}
                  disabled={status === FHEStepStatus.COMPUTING || status === FHEStepStatus.ENCRYPTING}
                  className="mt-2 inline-flex min-h-[40px] items-center gap-1.5 rounded-full hairline px-3 text-xs font-medium text-foreground hover:bg-muted/60 disabled:opacity-40"
                >
                  <Eye className="h-3.5 w-3.5" /> Verify my vote
                </button>
              </>
            )}
            {(error || fheError) && (
              <div className="mt-2 flex items-center gap-1 text-xs text-destructive">
                <AlertCircle className="h-3.5 w-3.5" /> {error || fheError}
              </div>
            )}
          </div>
        )}
      </div>
    </VoteTimelineRow>
  );
}

interface VotingHistoryProps {
  embedded?: boolean;
}

export default function VotingHistory({ embedded = false }: VotingHistoryProps) {
  const { address, isConnected } = useAccount();
  const { data: count } = useProposalCount();
  const proposalCount = Number(count ?? 0);
  const [filter, setFilter] = useState<HistoryFilter>("all");

  return (
    <div className="space-y-5">
      {!embedded && (
        <VotePanelHeader
          icon={History}
          title="Voting history"
          subtitle="Track participation and verify your choices on this device"
          badge="Private"
        />
      )}

      {!embedded && (
        <p className="text-sm leading-relaxed text-muted-foreground border-l-2 border-[hsl(var(--accent))]/40 pl-3">
          Use Verify my vote to confirm your encrypted ballot. Only you can see your choice — never the public chain.
        </p>
      )}

      {isConnected && proposalCount > 0 && (
        <VoteTabs
          tabs={[
            { key: "all", label: "All" },
            { key: "voted", label: "Voted" },
            { key: "pending", label: "Needs vote" },
            { key: "missed", label: "Missed" },
          ]}
          active={filter}
          onChange={setFilter}
        />
      )}

      {!isConnected ? (
        <div className="rounded-2xl hairline bg-muted/35 py-8 text-center text-sm text-muted-foreground">
          Connect your wallet to see voting history.
        </div>
      ) : proposalCount === 0 ? (
        <div className="rounded-2xl hairline bg-muted/35 py-8 text-center text-sm text-muted-foreground">
          No proposals yet.
        </div>
      ) : (
        <div className="pt-1">
          {Array.from({ length: proposalCount }, (_, i) => (
            <HistoryRow key={i} index={i} address={address!} filter={filter} />
          ))}
        </div>
      )}
    </div>
  );
}
