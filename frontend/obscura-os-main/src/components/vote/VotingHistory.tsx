import { useState } from "react";
import { History, CheckCircle, Clock, XCircle, Eye, AlertCircle, Ban } from "lucide-react";
import { useAccount } from "wagmi";
import { useProposalCount, useProposal, useProposalOptions, useHasVoted, CATEGORY_LABELS } from "@/hooks/useProposals";
import { useMyVote } from "@/hooks/useVoteTally";
import AsyncStepper from "@/components/shared/AsyncStepper";
import { FHEStepStatus } from "@/lib/constants";

function HistoryRow({ index, address }: { index: number; address: `0x${string}` }) {
  const { proposal } = useProposal(BigInt(index));
  const { data: voted } = useHasVoted(BigInt(index), address);
  const { data: optionLabels } = useProposalOptions(BigInt(index));
  const { myVoteIndex, decryptMyVote, status, stepIndex, error: fheError } = useMyVote(BigInt(index));
  const [error, setError] = useState<string | null>(null);

  if (!proposal?.exists) return null;

  const options = (optionLabels as string[]) ?? [];
  const now = BigInt(Math.floor(Date.now() / 1000));
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
    <div className="p-3 bg-secondary/30 rounded-md border border-border/30 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <div className="text-xs text-foreground truncate">
            #{index} — {proposal.title}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2">
            <span>{CATEGORY_LABELS[proposal.category] ?? "General"}</span>
            <span className="text-primary/50">|</span>
            <span>Deadline: {new Date(Number(proposal.deadline) * 1000).toLocaleDateString()}</span>
            {isCancelled ? (
              <span className="text-red-400">Cancelled</span>
            ) : proposal.isFinalized ? (
              <span className="text-primary">Finalized</span>
            ) : ended ? (
              <span className="text-yellow-400">Ended</span>
            ) : (
              <span className="text-green-400">Active</span>
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
            <div className="text-xs text-primary flex items-center gap-1.5">
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
                className="text-xs text-primary hover:underline flex items-center gap-1 disabled:opacity-30"
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
    <div className="glass-panel rounded-md p-6 space-y-4">
      <div className="flex items-center gap-2">
        <History className="w-4 h-4 text-primary" />
        <span className="text-sm tracking-[0.2em] uppercase text-primary font-mono">
          Your Voting History
        </span>
      </div>

      <div className="text-xs text-muted-foreground/50 px-1 border-l border-primary/20 pl-3">
        Track which proposals you've voted on. Use "Verify My Vote" to self-decrypt your
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
