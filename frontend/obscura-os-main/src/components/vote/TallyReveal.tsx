import { useState } from "react";
import { motion } from "framer-motion";
import { Eye, BarChart3, AlertCircle, Unlock, ExternalLink, Download, Ban, Trophy, ShieldCheck } from "lucide-react";
import { useAccount, useWriteContract, usePublicClient } from "wagmi";
import { useProposalCount, useProposal, useProposalOptions, CATEGORY_LABELS } from "@/hooks/useProposals";
import { useVoteTally, TallyResult } from "@/hooks/useVoteTally";
import { OBSCURA_VOTE_ABI, OBSCURA_VOTE_ADDRESS } from "@/config/contracts";
import { arbitrumSepolia } from "viem/chains";
import AsyncStepper from "@/components/shared/AsyncStepper";
import { FHEStepStatus } from "@/lib/constants";
import FHEOperationsVisual, { buildFinalizeOps } from "@/components/vote/FHEOperationsVisual";
import { useChainTime } from "@/hooks/useChainTime";

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

  // Must be called before any early return to satisfy Rules of Hooks
  const now = useChainTime();

  if (!proposal?.exists) return null;

  const isFinalized = proposal.isFinalized;
  const isCancelled = proposal.isCancelled;
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

      // Simulate first to surface revert reason without spending gas
      await publicClient!.simulateContract({
        address: OBSCURA_VOTE_ADDRESS!,
        abi: OBSCURA_VOTE_ABI,
        functionName: "finalizeVote",
        args: [proposalId],
        account: address,
      });

      const hash = await writeContractAsync({
        address: OBSCURA_VOTE_ADDRESS!,
        abi: OBSCURA_VOTE_ABI,
        functionName: "finalizeVote",
        args: [proposalId],
        account: address,
        chain: arbitrumSepolia,
        gas: 10_000_000n,
        maxFeePerGas,
        maxPriorityFeePerGas,
      });
      setFinalizeTxHash(hash);
      setTimeout(() => refetchProposal(), 3000);
    } catch (err: any) {
      // Prefer the decoded revert reason (shortMessage) over raw message
      const msg: string = err.shortMessage ?? err.cause?.reason ?? err.message ?? "Finalization failed";
      setError(msg);
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
    <div className="rounded-lg bg-white/[0.025] border border-white/[0.06] p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-foreground font-medium">{proposal.title}</div>
          <div className="text-xs text-muted-foreground flex items-center gap-2">
            <span>#{proposalId.toString()}</span>
            <span className="text-emerald-400/30">|</span>
            <span>{CATEGORY_LABELS[proposal.category] ?? "General"}</span>
            <span className="text-emerald-400/30">|</span>
            <span>{proposal.totalVoters.toString()} voter{proposal.totalVoters !== 1n ? "s" : ""}</span>
            {proposal.quorum > 0n && (
              <>
                <span className="text-emerald-400/30">|</span>
                <span className={quorumMet ? "text-emerald-400" : "text-red-400"}>
                  Quorum: {proposal.totalVoters.toString()}/{proposal.quorum.toString()}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {isCancelled && (
        <div className="flex items-center gap-2 text-xs text-red-400">
          <Ban className="w-3.5 h-3.5" /> Proposal cancelled
        </div>
      )}

      {!isCancelled && !isFinalized && !deadlinePassed && (
        <div className="text-xs text-muted-foreground/50">
          Voting still active. Results available after the deadline.
        </div>
      )}

      {canFinalize && (
        <div className="space-y-2">
          <div className="text-xs text-yellow-400">
            Voting ended.{!quorumMet ? " Quorum not reached — cannot finalize." : " Finalize to reveal the aggregate tally on-chain."}
          </div>
          {quorumMet && (
          <motion.button
            onClick={handleFinalize}
            disabled={isFinalizePending}
            whileHover={{ scale: 1.005 }}
            whileTap={{ scale: 0.99 }}
            className="btn-pay btn-pay-amber w-full py-2.5"
          >
            <Unlock className="w-3.5 h-3.5 inline mr-2" />
            {isFinalizePending ? "Finalizing..." : "Finalize Vote"}
          </motion.button>
          )}
          {finalizeTxHash && (
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                TX:{" "}
                <a
                  href={`https://sepolia.arbiscan.io/tx/${finalizeTxHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-400 hover:underline inline-flex items-center gap-1"
                >
                  {finalizeTxHash.slice(0, 10)}...{finalizeTxHash.slice(-8)}
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              {/* FHE ops that just ran on finalize */}
              <div className="p-3 bg-secondary/20 rounded-md border border-border/20">
                <FHEOperationsVisual
                  ops={buildFinalizeOps(numOptions)}
                  title="FHE Operations on Finalize"
                  animate
                />
              </div>
            </div>
          )}
        </div>
      )}

      {isFinalized && (
        <div className="text-xs text-green-400">
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
        <div className="space-y-3">
          {/* Winner analysis */}
          {total && total > 0n && (() => {
            const winnerIdx = tallies.reduce((best, t, i) => t.votes > tallies[best].votes ? i : best, 0);
            const winner = tallies[winnerIdx];
            const second = tallies.reduce((best, t, i) => i !== winnerIdx && t.votes > (best !== -1 ? tallies[best].votes : -1n) ? i : best, -1);
            const margin = second !== -1 ? winner.votes - tallies[second].votes : winner.votes;
            const marginPct = Number((margin * 100n) / total);
            const winnerPct = Number((winner.votes * 100n) / total);
            const tie = tallies.filter(t => t.votes === maxVotes && maxVotes > 0n).length > 1;
            return (
              <div className="p-3 bg-emerald-400/5 border border-emerald-400/20 rounded-md flex items-start gap-3">
                <Trophy className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  {tie ? (
                    <div className="text-sm text-yellow-400 font-semibold">It&apos;s a tie!</div>
                  ) : (
                    <>
                      <div className="text-sm text-foreground font-semibold">
                        Winner: <span className="text-emerald-400">{options[winnerIdx] ?? `Option ${winnerIdx}`}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {winnerPct}% of votes · leads by{" "}
                        <span className="text-emerald-400 font-mono">{margin.toString()} vote{margin !== 1n ? "s" : ""}</span>
                        {" "}({marginPct}% margin)
                      </div>
                    </>
                  )}
                  <div className="text-[11px] text-muted-foreground/50 mt-1">
                    {total.toString()} total votes · Individual ballots stay encrypted forever
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Per-option bars (sorted by votes desc for display) */}
          {[...tallies].sort((a, b) => Number(b.votes - a.votes)).map((t) => {
            const origIdx = t.optionIndex;
            const pct = total && total > 0n ? Number((t.votes * 100n) / total) : 0;
            const isWinner = t.votes === maxVotes && maxVotes > 0n;
            return (
              <div key={origIdx} className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="flex justify-between text-xs mb-1">
                    <span className={TEXT_COLORS[origIdx % TEXT_COLORS.length]}>
                      {options[origIdx] ?? `Option ${origIdx}`}
                      {isWinner && " ★"}
                    </span>
                    <span className="text-foreground font-mono">{t.votes.toString()} <span className="text-muted-foreground/60">({pct}%)</span></span>
                  </div>
                  <div className="h-2 rounded-full bg-secondary">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.6, ease: "easeOut" }}
                      className={`h-full rounded-full ${BAR_COLORS[origIdx % BAR_COLORS.length]}`}
                    />
                  </div>
                </div>
              </div>
            );
          })}

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Total: {total?.toString()} votes</span>
            <button
              onClick={() => exportCSV(proposal.title, options, tallies)}
              className="flex items-center gap-1 text-emerald-400 hover:underline"
            >
              <Download className="w-3 h-3" /> Export CSV
            </button>
          </div>

          {/* Privacy guarantee note */}
          <div className="flex items-start gap-2 p-3 bg-secondary/20 rounded-md border border-border/20">
            <ShieldCheck className="w-3.5 h-3.5 text-green-400 shrink-0 mt-0.5" />
            <div className="text-[11px] text-muted-foreground/70 leading-relaxed">
              These tallies are publicly decryptable via{" "}
              <span className="font-mono text-emerald-400">FHE.allowPublic</span> — called at finalization.
              Individual ballots remain as encrypted handles on-chain and{" "}
              <span className="text-foreground/80">can never be decrypted</span>.
            </div>
          </div>
        </div>
      ) : (
        <motion.button
          onClick={handleDecrypt}
          disabled={!isFinalized || status === FHEStepStatus.COMPUTING || status === FHEStepStatus.ENCRYPTING}
          whileHover={{ scale: 1.005 }}
          whileTap={{ scale: 0.99 }}
          className="btn-pay btn-pay-emerald w-full py-2.5"
        >
          <Eye className="w-3.5 h-3.5 inline mr-2" />
          Decrypt Public Tally
        </motion.button>
      )}

      {error && (
        <div className="flex items-center gap-2 text-red-400 text-sm font-mono">
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
    <div className="pay-card p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-700/10 border border-emerald-500/25 flex items-center justify-center shrink-0">
          <BarChart3 className="w-4 h-4 text-emerald-400" />
        </div>
        <div className="min-w-0">
          <h3 className="font-display text-sm font-semibold text-foreground leading-tight">Vote Results</h3>
          <p className="text-[10px] text-muted-foreground/45 tracking-widest mt-0.5 uppercase">Finalize &amp; decrypt tallies</p>
        </div>
        <span className="ml-auto shrink-0 pay-badge pay-badge-emerald">On-chain</span>
      </div>

      <div className="text-[12px] text-muted-foreground/55 leading-relaxed border-l-2 border-emerald-500/20 pl-3">
        After finalization, the aggregate tally becomes publicly decryptable via FHE.allowPublic().
        Individual votes remain permanently encrypted. Export results to CSV after reveal.
      </div>

      {proposalCount === 0 ? (
        <div className="text-sm text-muted-foreground text-center py-8">
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
