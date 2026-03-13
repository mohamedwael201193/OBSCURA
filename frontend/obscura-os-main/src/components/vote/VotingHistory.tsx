import { useState } from "react";
import { History, CheckCircle, Clock, XCircle, Eye, AlertCircle, Ban } from "lucide-react";
import { useAccount } from "wagmi";
import { useProposalCount, useProposal, useProposalOptions, useHasVoted, CATEGORY_LABELS } from "@/hooks/useProposals";
import { useMyVote } from "@/hooks/useVoteTally";
import AsyncStepper from "@/components/shared/AsyncStepper";
import { FHEStepStatus } from "@/lib/constants";
import { useChainTime } from "@/hooks/useChainTime";

function HistoryRow({ index, address }: { index: number; address: `0x${string}` }) {
  const { proposal } = useProposal(BigInt(index));
  const { data: voted } = useHasVoted(BigInt(index), address);
  const { data: optionLabels } = useProposalOptions(BigInt(index));
  const { myVoteIndex, decryptMyVote, status, stepIndex, error: fheError } = useMyVote(BigInt(index));
  const [error, setError] = useState<string | null>(null);

  // Must be called before any early return to satisfy Rules of Hooks
  const now = useChainTime();

  if (!proposal?.exists) return null;

  const options = (optionLabels as string[]) ?? [];
  const ended = proposal.deadline <= now || proposal.isFinalized;
  const isCancelled = proposal.isCancelled;

  async function handleVerify() {
    setError(null);
    try {
      await decryptMyVote();
    } catch (err: any) {
      setError(err.message ?? "Verification failed");
    }
  }

  return (
    <div className="rounded-lg bg-white/[0.025] border border-white/[0.06] p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <div className="text-xs text-foreground truncate font-medium">
            #{index} — {proposal.title}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2">
            <span>{CATEGORY_LABELS[proposal.category] ?? "General"}</span>
            <span className="text-emerald-400/30">|</span>
            <span>Deadline: {new Date(Number(proposal.deadline) * 1000).toLocaleDateString()}</span>
            {isCancelled ? (
              <span className="pay-badge pay-badge-red">Cancelled</span>
            ) : proposal.isFinalized ? (
              <span className="pay-badge pay-badge-emerald">Finalized</span>
            ) : ended ? (
              <span className="pay-badge pay-badge-amber">Ended</span>
            ) : (
              <span className="pay-badge pay-badge-emerald">Active</span>
            )}
          </div>
        </div>
        <div className="shrink-0 ml-3">
          {isCancelled ? (
            <div className="flex items-center gap-1.5 text-red-400/50">
              <Ban className="w-3.5 h-3.5" />
              <span className="text-xs font-mono">Cancelled</span>
            </div>
          ) : voted ? (
            <div className="flex items-center gap-1.5 text-green-400">
              <CheckCircle className="w-3.5 h-3.5" />
              <span className="text-xs font-mono">Voted</span>
            </div>
          ) : ended ? (
            <div className="flex items-center gap-1.5 text-muted-foreground/40">
              <XCircle className="w-3.5 h-3.5" />
              <span className="text-xs font-mono">Missed</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-yellow-400">
              <Clock className="w-3.5 h-3.5" />
              <span className="text-xs font-mono">Pending</span>
            </div>
          )}
        </div>
      </div>

      {/* Verify My Vote */}
      {voted && !isCancelled && (
        <div className="pl-0">
          {myVoteIndex !== null ? (
            <div className="text-xs text-emerald-400 flex items-center gap-1.5">
              <Eye className="w-3 h-3" />
              Your vote: <span className="font-semibold">{options[myVoteIndex] ?? `Option ${myVoteIndex}`}</span>
            </div>
          ) : (
            <>
              {status !== FHEStepStatus.IDLE && status !== FHEStepStatus.READY && (
                <AsyncStepper status={status} stepIndex={stepIndex} labels={["Connecting", "Decrypting", "Verified"]} />
              )}
              <button
                onClick={handleVerify}
                disabled={status === FHEStepStatus.COMPUTING || status === FHEStepStatus.ENCRYPTING}
                className="text-xs text-emerald-400 hover:underline flex items-center gap-1 disabled:opacity-30"
              >
                <Eye className="w-3 h-3" /> Verify My Vote
              </button>
            </>
          )}
          {(error || fheError) && (
            <div className="flex items-center gap-1 text-red-400 text-xs mt-1">
              <AlertCircle className="w-3 h-3" /> {error || fheError}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function VotingHistory() {
  const { address, isConnected } = useAccount();
  const { data: count } = useProposalCount();
  const proposalCount = Number(count ?? 0);

  return (
    <div className="pay-card p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-700/10 border border-emerald-500/25 flex items-center justify-center shrink-0">
          <History className="w-4 h-4 text-emerald-400" />
        </div>
        <div className="min-w-0">
          <h3 className="font-display text-sm font-semibold text-foreground leading-tight">Voting History</h3>
          <p className="text-[10px] text-muted-foreground/45 tracking-widest mt-0.5 uppercase">Your encrypted ballots</p>
        </div>
        <span className="ml-auto shrink-0 pay-badge pay-badge-emerald">Private</span>
      </div>

      <div className="text-[12px] text-muted-foreground/55 leading-relaxed border-l-2 border-emerald-500/20 pl-3">
        Track which proposals you’ve voted on. Use “Verify My Vote” to self-decrypt your
        encrypted ballot via FHE.allow — only you can see your own choice.
      </div>

      {!isConnected ? (
        <div className="text-sm text-muted-foreground text-center py-6">
          Connect your wallet to see voting history.
        </div>
      ) : proposalCount === 0 ? (
        <div className="text-sm text-muted-foreground text-center py-6">
          No proposals yet.
        </div>
      ) : (
        <div className="space-y-2">
          {Array.from({ length: proposalCount }, (_, i) => (
            <HistoryRow key={i} index={i} address={address!} />
          ))}
        </div>
      )}
    </div>
  );
}
