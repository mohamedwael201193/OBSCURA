import { useState } from "react";
import { motion } from "framer-motion";
import { Eye, BarChart3, AlertCircle, Unlock, ExternalLink, Download, Ban } from "lucide-react";
import { useAccount, useWriteContract, usePublicClient } from "wagmi";
import { useProposalCount, useProposal, useProposalOptions, CATEGORY_LABELS } from "@/hooks/useProposals";
import { useVoteTally, TallyResult } from "@/hooks/useVoteTally";
import { OBSCURA_VOTE_ABI, OBSCURA_VOTE_ADDRESS } from "@/config/contracts";
import { arbitrumSepolia } from "viem/chains";
import AsyncStepper from "@/components/shared/AsyncStepper";
import { FHEStepStatus } from "@/lib/constants";

const BAR_COLORS = [
  "bg-green-400/60", "bg-red-400/60", "bg-blue-400/60", "bg-yellow-400/60",
  "bg-purple-400/60", "bg-pink-400/60", "bg-cyan-400/60", "bg-orange-400/60",
  "bg-emerald-400/60", "bg-indigo-400/60",
];
const TEXT_COLORS = [
  "text-green-400", "text-red-400", "text-blue-400", "text-yellow-400",
  "text-purple-400", "text-pink-400", "text-cyan-400", "text-orange-400",
  "text-emerald-400", "text-indigo-400",
];

function exportCSV(title: string, options: string[], tallies: TallyResult[]) {
  const rows = [["Option", "Votes"]];
  tallies.forEach((t, i) => {
    rows.push([options[i] ?? `Option ${i}`, t.votes.toString()]);
  });
  const total = tallies.reduce((sum, t) => sum + t.votes, 0n);
  rows.push(["Total", total.toString()]);
  const csv = rows.map(r => r.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${title.replace(/\s+/g, "_")}_results.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function TallyResult({ proposalId }: { proposalId: bigint }) {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { proposal, refetch: refetchProposal } = useProposal(proposalId);
  const { data: optionLabels } = useProposalOptions(proposalId);
  const options = (optionLabels as string[]) ?? [];
  const numOptions = proposal?.numOptions ?? 2;
  const { tallies, decryptTally, status, stepIndex } = useVoteTally(proposalId, numOptions);
  const { writeContractAsync, isPending: isFinalizePending } = useWriteContract();
  const [error, setError] = useState<string | null>(null);
  const [finalizeTxHash, setFinalizeTxHash] = useState<string | null>(null);

  if (!proposal?.exists) return null;

  const isFinalized = proposal.isFinalized;
  const isCancelled = proposal.isCancelled;
  const now = BigInt(Math.floor(Date.now() / 1000));
  const deadlinePassed = now >= proposal.deadline;
  const canFinalize = deadlinePassed && !isFinalized && !isCancelled;
  const quorumMet = proposal.quorum === 0n || proposal.totalVoters >= proposal.quorum;

  const total = tallies ? tallies.reduce((sum, t) => sum + t.votes, 0n) : null;
  const maxVotes = tallies ? tallies.reduce((max, t) => t.votes > max ? t.votes : max, 0n) : 0n;

  async function handleFinalize() {
    setError(null);
    setFinalizeTxHash(null);
    try {
      const block = await publicClient!.getBlock();
      const baseFee = block.baseFeePerGas ?? 20_000_000n;
      const maxFeePerGas = baseFee * 3n;
      const maxPriorityFeePerGas = baseFee;

      const hash = await writeContractAsync({
        address: OBSCURA_VOTE_ADDRESS!,
        abi: OBSCURA_VOTE_ABI,
        functionName: "finalizeVote",
        args: [proposalId],
        account: address,
        chain: arbitrumSepolia,
        gas: 3_000_000n,
        maxFeePerGas,
        maxPriorityFeePerGas,
      });
      setFinalizeTxHash(hash);
      setTimeout(() => refetchProposal(), 3000);
    } catch (err: any) {
      setError(err.shortMessage ?? err.message ?? "Finalization failed");
    }
  }

  async function handleDecrypt() {
    setError(null);
    try {
      await decryptTally();
    } catch (err: any) {
      setError(err.message ?? "Decryption failed");
    }
  }

  return (
    <div className="p-4 bg-secondary/30 rounded-sm border border-border/30 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-mono text-foreground">{proposal.title}</div>
          <div className="text-[9px] font-mono text-muted-foreground flex items-center gap-2">
            <span>#{proposalId.toString()}</span>
            <span className="text-primary/50">|</span>
            <span>{CATEGORY_LABELS[proposal.category] ?? "General"}</span>
            <span className="text-primary/50">|</span>
            <span>{proposal.totalVoters.toString()} voter{proposal.totalVoters !== 1n ? "s" : ""}</span>
            {proposal.quorum > 0n && (
              <>
                <span className="text-primary/50">|</span>
                <span className={quorumMet ? "text-green-400" : "text-red-400"}>
                  Quorum: {proposal.totalVoters.toString()}/{proposal.quorum.toString()}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {isCancelled && (
        <div className="flex items-center gap-2 text-[9px] font-mono text-red-400">
          <Ban className="w-3.5 h-3.5" /> Proposal cancelled
        </div>
      )}

      {!isCancelled && !isFinalized && !deadlinePassed && (
        <div className="text-[9px] font-mono text-muted-foreground/50">
          Voting still active. Results available after the deadline.
        </div>
      )}

      {canFinalize && (
        <div className="space-y-2">
          <div className="text-[9px] font-mono text-yellow-400">
            Voting ended.{!quorumMet ? " Quorum not reached — cannot finalize." : " Finalize to reveal the aggregate tally on-chain."}
          </div>
          {quorumMet && (
            <button
              onClick={handleFinalize}
              disabled={isFinalizePending}
              className="w-full py-2.5 rounded-sm border border-yellow-400/40 text-yellow-400 text-[10px] tracking-[0.2em] uppercase font-mono hover:bg-yellow-400/10 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Unlock className="w-3.5 h-3.5 inline mr-2" />
              {isFinalizePending ? "Finalizing..." : "Finalize Vote"}
            </button>
          )}
          {finalizeTxHash && (
            <div className="text-[9px] font-mono text-muted-foreground flex items-center gap-1">
              TX:{" "}
              <a
                href={`https://sepolia.arbiscan.io/tx/${finalizeTxHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline inline-flex items-center gap-1"
              >
                {finalizeTxHash.slice(0, 10)}...{finalizeTxHash.slice(-8)}
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}
        </div>
      )}

      {isFinalized && (
        <div className="text-[9px] font-mono text-green-400">
          ✓ Finalized — tally is publicly decryptable.
        </div>
      )}

      {status !== FHEStepStatus.IDLE && status !== FHEStepStatus.READY && (
        <AsyncStepper
          status={status}
          stepIndex={stepIndex}
          labels={["Connecting", "Decrypting", "Revealed"]}
        />
      )}

      {tallies ? (
        <div className="space-y-2">
          {tallies.map((t, i) => {
            const pct = total && total > 0n ? Number((t.votes * 100n) / total) : 0;
            const isWinner = t.votes === maxVotes && maxVotes > 0n;
            return (
              <div key={i} className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="flex justify-between text-[9px] font-mono mb-1">
                    <span className={TEXT_COLORS[i % TEXT_COLORS.length]}>
                      {options[i] ?? `Option ${i}`}
                      {isWinner && " ★"}
                    </span>
                    <span className="text-foreground">{t.votes.toString()} ({pct}%)</span>
                  </div>
                  <div className="h-2 rounded-full bg-secondary">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      className={`h-full rounded-full ${BAR_COLORS[i % BAR_COLORS.length]}`}
                    />
                  </div>
                </div>
              </div>
            );
          })}
          <div className="flex items-center justify-between text-[9px] font-mono text-muted-foreground">
            <span>Total votes: {total?.toString()}</span>
            <button
              onClick={() => exportCSV(proposal.title, options, tallies)}
              className="flex items-center gap-1 text-primary hover:underline"
            >
              <Download className="w-3 h-3" /> Export CSV
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={handleDecrypt}
          disabled={!isFinalized || status === FHEStepStatus.COMPUTING || status === FHEStepStatus.ENCRYPTING}
          className="w-full py-2.5 rounded-sm border border-primary/40 text-primary text-[10px] tracking-[0.2em] uppercase font-mono hover:bg-primary/10 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <Eye className="w-3.5 h-3.5 inline mr-2" />
          Decrypt Public Tally
        </button>
      )}

      {error && (
        <div className="flex items-center gap-2 text-red-400 text-[10px] font-mono">
          <AlertCircle className="w-3.5 h-3.5" />
          {error}
        </div>
      )}
    </div>
  );
}

export default function TallyReveal() {
  const { data: count } = useProposalCount();
  const proposalCount = Number(count ?? 0);

  return (
    <div className="glass-panel rounded-sm p-6 space-y-4">
      <div className="flex items-center gap-2">
        <BarChart3 className="w-4 h-4 text-primary" />
        <span className="text-[10px] tracking-[0.2em] uppercase text-primary font-mono">
          Vote Results
        </span>
      </div>

      <div className="text-[9px] font-mono text-muted-foreground/50 px-1 border-l border-primary/20 pl-3">
        After finalization, the aggregate tally becomes publicly decryptable via FHE.allowPublic().
        Individual votes remain permanently encrypted. Export results to CSV after reveal.
      </div>

      {proposalCount === 0 ? (
        <div className="text-sm font-mono text-muted-foreground text-center py-8">
          No proposals to show results for.
        </div>
      ) : (
        <div className="space-y-3">
          {Array.from({ length: proposalCount }, (_, i) => (
            <TallyResult key={i} proposalId={BigInt(i)} />
          ))}
        </div>
      )}
    </div>
  );
}
