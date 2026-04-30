import { useState } from "react";
import { Ban, Clock, Loader2, AlertCircle, CheckCircle, ExternalLink } from "lucide-react";
import { useWriteContract, useAccount } from "wagmi";
import { arbitrumSepolia } from "viem/chains";
import { OBSCURA_VOTE_ADDRESS, OBSCURA_VOTE_ABI } from "@/config/contracts";
import { useProposalCount, useProposal } from "@/hooks/useProposals";
import { useChainTime } from "@/hooks/useChainTime";

function ProposalAdminRow({ index }: { index: number }) {
  const { proposal } = useProposal(BigInt(index));
  const [extendHours, setExtendHours] = useState("24");
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
  const [feedbackSuccess, setFeedbackSuccess] = useState(false);
  const [feedbackTxHash, setFeedbackTxHash] = useState<string | null>(null);

  const { writeContractAsync: cancelAsync, isPending: cancelling } = useWriteContract();
  const { writeContractAsync: extendAsync, isPending: extending } = useWriteContract();
  const { address } = useAccount();

  // Must be called before any early return to satisfy Rules of Hooks
  const now = useChainTime();

  if (!proposal?.exists || proposal.isCancelled) return null;

  const ended = proposal.deadline <= now;

  async function handleCancel() {
    setFeedbackMsg(null); setFeedbackTxHash(null);
    try {
      await cancelAsync({
        address: OBSCURA_VOTE_ADDRESS as `0x${string}`,
        abi: OBSCURA_VOTE_ABI,
        functionName: "cancelProposal",
        args: [BigInt(index)],
        account: address,
        chain: arbitrumSepolia,
        gas: 500_000n,
      });
      setFeedbackSuccess(true); setFeedbackMsg("Proposal cancelled.");
    } catch (err: any) {
      setFeedbackSuccess(false); setFeedbackMsg(err.shortMessage ?? err.message ?? "Cancel failed");
    }
  }

  async function handleExtend() {
    setFeedbackMsg(null); setFeedbackTxHash(null);
    const newDeadline = now + BigInt(Number(extendHours) * 3600);
    try {
      const hash = await extendAsync({
        address: OBSCURA_VOTE_ADDRESS as `0x${string}`,
        abi: OBSCURA_VOTE_ABI,
        functionName: "extendDeadline",
        args: [BigInt(index), newDeadline],
        account: address,
        chain: arbitrumSepolia,
        gas: 500_000n,
      });
      setFeedbackSuccess(true);
      setFeedbackMsg("Deadline extended.");
      setFeedbackTxHash(hash);
    } catch (err: any) {
      setFeedbackSuccess(false);
      setFeedbackMsg(err.shortMessage ?? err.message ?? "Extend failed");
    }
  }

  return (
    <div className="rounded-lg bg-white/[0.025] border border-white/[0.06] p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-xs text-foreground truncate font-medium">
          #{index} — {proposal.title}
        </div>
        <span className={`pay-badge ${
          proposal.isFinalized ? "pay-badge-emerald" : ended ? "pay-badge-amber" : "pay-badge-emerald"
        }`}>
          {proposal.isFinalized ? "Finalized" : ended ? "Ended" : "Active"}
        </span>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {!proposal.isFinalized && (
          <button
            onClick={handleCancel}
            disabled={cancelling}
            className="btn-pay btn-pay-ghost flex items-center gap-1 text-xs px-3 py-1.5 text-red-400 hover:text-red-300 border-red-500/25"
          >
            {cancelling ? <Loader2 className="w-3 h-3 animate-spin" /> : <Ban className="w-3 h-3" />}
            Cancel
          </button>
        )}

        {!proposal.isFinalized && !ended && (
          <div className="flex items-center gap-1.5">
            <input
              type="number"
              min="1"
              value={extendHours}
              onChange={(e) => setExtendHours(e.target.value)}
              className="pay-input w-14 py-1 text-center"
            />
            <button
              onClick={handleExtend}
              disabled={extending}
              className="btn-pay btn-pay-emerald flex items-center gap-1 text-xs px-3 py-1.5"
            >
              {extending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Clock className="w-3 h-3" />}
              Extend +{extendHours}h
            </button>
          </div>
        )}
      </div>

      {feedbackMsg && (
        <div className={`text-xs flex items-center gap-1 ${feedbackSuccess ? "text-green-400" : "text-red-400"}`}>
          {feedbackSuccess ? <CheckCircle className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
          {feedbackMsg}
          {feedbackSuccess && feedbackTxHash && (
            <a
              href={`https://sepolia.arbiscan.io/tx/${feedbackTxHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-400 hover:underline inline-flex items-center"
            >
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
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
      <div className="pay-card p-6 text-center">
        <p className="text-sm text-muted-foreground">No proposals to manage.</p>
      </div>
    );
  }

  return (
    <div className="pay-card p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-700/10 border border-amber-500/25 flex items-center justify-center shrink-0">
          <Ban className="w-4 h-4 text-amber-400" />
        </div>
        <div className="min-w-0">
          <h3 className="font-display text-sm font-semibold text-foreground leading-tight">Proposal Management</h3>
          <p className="text-[10px] text-muted-foreground/45 tracking-widest mt-0.5 uppercase">Admin controls</p>
        </div>
        <span className="ml-auto shrink-0 pay-badge pay-badge-amber">Admin</span>
      </div>
      <div className="space-y-2">
        {Array.from({ length: proposalCount }, (_, i) => (
          <ProposalAdminRow key={i} index={i} />
        ))}
      </div>
    </div>
  );
}
