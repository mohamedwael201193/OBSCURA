import { useState } from "react";
import { Ban, Clock, Loader2, AlertCircle, CheckCircle } from "lucide-react";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { OBSCURA_VOTE_ADDRESS, OBSCURA_VOTE_ABI } from "@/config/contracts";
import { useProposalCount, useProposal } from "@/hooks/useProposals";

function ProposalAdminRow({ index }: { index: number }) {
  const { proposal } = useProposal(BigInt(index));
  const [extendHours, setExtendHours] = useState("24");
  const [feedback, setFeedback] = useState<string | null>(null);

  const { writeContractAsync: cancelAsync, isPending: cancelling } = useWriteContract();
  const { writeContractAsync: extendAsync, isPending: extending } = useWriteContract();

  if (!proposal?.exists || proposal.isCancelled) return null;

  const now = BigInt(Math.floor(Date.now() / 1000));
  const ended = proposal.deadline <= now;

  async function handleCancel() {
    setFeedback(null);
    try {
      await cancelAsync({
        address: OBSCURA_VOTE_ADDRESS as `0x${string}`,
        abi: OBSCURA_VOTE_ABI,
        functionName: "cancelProposal",
        args: [BigInt(index)],
        gas: 500_000n,
      });
      setFeedback("Cancel TX sent");
    } catch (err: any) {
      setFeedback(err.shortMessage ?? err.message ?? "Cancel failed");
    }
  }

  async function handleExtend() {
    setFeedback(null);
    const newDeadline = BigInt(Math.floor(Date.now() / 1000) + Number(extendHours) * 3600);
    try {
      await extendAsync({
        address: OBSCURA_VOTE_ADDRESS as `0x${string}`,
        abi: OBSCURA_VOTE_ABI,
        functionName: "extendDeadline",
        args: [BigInt(index), newDeadline],
        gas: 500_000n,
      });
      setFeedback("Extend TX sent");
    } catch (err: any) {
      setFeedback(err.shortMessage ?? err.message ?? "Extend failed");
    }
  }

  return (
    <div className="p-3 bg-secondary/30 rounded-md border border-border/30 space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-xs text-foreground truncate">
          #{index} — {proposal.title}
        </div>
        <span className={`text-xs ${proposal.isFinalized ? "text-primary" : ended ? "text-yellow-400" : "text-green-400"}`}>
          {proposal.isFinalized ? "Finalized" : ended ? "Ended" : "Active"}
        </span>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {!proposal.isFinalized && (
          <button
            onClick={handleCancel}
            disabled={cancelling}
            className="flex items-center gap-1 text-xs px-2 py-1 rounded-md border border-red-500/30 text-red-400 hover:bg-red-500/10 disabled:opacity-30"
          >
            {cancelling ? <Loader2 className="w-3 h-3 animate-spin" /> : <Ban className="w-3 h-3" />}
            Cancel
          </button>
        )}

        {!proposal.isFinalized && !ended && (
          <div className="flex items-center gap-1">
            <input
              type="number"
              min="1"
              value={extendHours}
              onChange={(e) => setExtendHours(e.target.value)}
              className="w-12 text-xs bg-background/50 border border-border/30 rounded-md px-1 py-0.5 text-center"
            />
            <button
              onClick={handleExtend}
              disabled={extending}
              className="flex items-center gap-1 text-xs px-2 py-1 rounded-md border border-primary/30 text-primary hover:bg-primary/10 disabled:opacity-30"
            >
              {extending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Clock className="w-3 h-3" />}
              Extend +{extendHours}h
            </button>
          </div>
        )}
      </div>

      {feedback && (
        <div className={`text-xs flex items-center gap-1 ${feedback.includes("sent") ? "text-green-400" : "text-red-400"}`}>
          {feedback.includes("sent") ? <CheckCircle className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
          {feedback}
        </div>
      )}
    </div>
  );
}

export default function AdminControls() {
  const { data: count } = useProposalCount();
  const proposalCount = Number(count ?? 0);

  if (proposalCount === 0) {
    return (
      <div className="glass-panel rounded-md p-6 text-center">
        <p className="text-sm text-muted-foreground">No proposals to manage.</p>
      </div>
    );
  }

  return (
    <div className="glass-panel rounded-md p-4 space-y-3">
      <div className="text-sm tracking-[0.2em] uppercase text-primary mb-2">
        Proposal Management
      </div>
      <div className="space-y-2">
        {Array.from({ length: proposalCount }, (_, i) => (
          <ProposalAdminRow key={i} index={i} />
        ))}
      </div>
    </div>
  );
}
