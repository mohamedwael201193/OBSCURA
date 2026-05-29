import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Eye, BarChart3, AlertCircle, Unlock, ExternalLink, Download, Ban, Trophy, ShieldCheck, User, Users, Timer, Clock } from "lucide-react";
import { useAccount, useWriteContract, usePublicClient } from "wagmi";
import { useProposalCount, useProposal, useProposalOptions, CATEGORY_LABELS } from "@/hooks/useProposals";
import { useVoteTally, type TallyResult as TallyResultData } from "@/hooks/useVoteTally";
import { OBSCURA_VOTE_ABI, OBSCURA_VOTE_ADDRESS } from "@/config/contracts";
import { arbitrumSepolia } from "viem/chains";
import AsyncStepper from "@/components/shared/AsyncStepper";
import { FHEStepStatus } from "@/lib/constants";

import { useChainTime } from "@/hooks/useChainTime";

import { VoteStatGrid } from "@/components/harmony/voteHarmonyUi";
import { VoteRewardPrompt } from "@/components/vote/VoteRewardPrompt";

const BAR_COLORS = [
  "bg-foreground/85", "bg-foreground/55", "bg-foreground/40", "bg-foreground/30",
  "bg-foreground/25", "bg-foreground/20", "bg-foreground/18", "bg-foreground/15",
  "bg-foreground/12", "bg-foreground/10",
];

type TallyFilter = "all" | "action" | "active" | "finalized" | "cancelled";

/** Live countdown to when a proposal can be finalized. */
function DeadlineCountdown({ deadline }: { deadline: bigint }) {
  const [remaining, setRemaining] = useState("");
  useEffect(() => {
    function update() {
      const diff = Number(deadline) - Math.floor(Date.now() / 1000);
      if (diff <= 0) { setRemaining(""); return; }
      const d = Math.floor(diff / 86400);
      const h = Math.floor((diff % 86400) / 3600);
      const m = Math.floor((diff % 3600) / 60);
      const s = diff % 60;
      if (d > 0) setRemaining(`${d}d ${h}h ${m}m`);
      else if (h > 0) setRemaining(`${h}h ${m}m ${s}s`);
      else setRemaining(`${m}m ${s}s`);
    }
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [deadline]);
  if (!remaining) return null;
  return (
    <span className="inline-flex items-center gap-1 text-foreground/70">
      <Clock className="w-3 h-3" />
      <span className="font-mono">{remaining}</span>
    </span>
  );
}
const TEXT_COLORS = [
  "text-foreground", "text-foreground/85", "text-foreground/75", "text-foreground/65",
  "text-foreground/60", "text-foreground/55", "text-foreground", "text-foreground/50",
  "text-foreground/45", "text-foreground/40",
];

function exportCSV(title: string, options: string[], tallies: TallyResultData[]) {
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

function formatWriteError(error: unknown, fallback: string): string {
  const txError = error as { shortMessage?: string; cause?: { reason?: string }; message?: string };
  return txError.shortMessage ?? txError.cause?.reason ?? txError.message ?? fallback;
}

function TallyResult({
  proposalId,
  filter,
  onClaimRewards,
}: {
  proposalId: bigint;
  filter: TallyFilter;
  onClaimRewards?: () => void;
}) {
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
  const [isFinalizeConfirming, setIsFinalizeConfirming] = useState(false);

  // Must be called before any early return to satisfy Rules of Hooks
  const now = useChainTime();

  if (!proposal?.exists) return null;

  const isFinalized = proposal.isFinalized;
  const isCancelled = proposal.isCancelled;
  // Use the LATER of chain time and system time so the Finalize button appears
  // even when chain time (block.timestamp) is slightly ahead of the user's
  // system clock (or before the first block response arrives).
  const systemNow = BigInt(Math.floor(Date.now() / 1000));
  const effectiveNow = now > systemNow ? now : systemNow;
  const deadlinePassed = effectiveNow >= proposal.deadline;
  const canFinalize = deadlinePassed && !isFinalized && !isCancelled;
  const quorumMet = proposal.quorum === 0n || proposal.totalVoters >= proposal.quorum;
  const isCreator = !!(address && proposal.creator && address.toLowerCase() === proposal.creator.toLowerCase());

  // Apply filter — return null if this proposal doesn't match the selected tab
  // "action" = proposals the connected user needs to act on (creator-only finalize)
  if (filter === "action" && !(canFinalize && quorumMet && isCreator)) return null;
  if (filter === "finalized" && !isFinalized) return null;
  if (filter === "active" && (deadlinePassed || isCancelled || isFinalized)) return null;
  if (filter === "cancelled" && !isCancelled) return null;

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
      setIsFinalizeConfirming(true);
      const receipt = await publicClient!.waitForTransactionReceipt({ hash });
      if (receipt.status !== "success") {
        throw new Error("Finalize transaction reverted");
      }
      await refetchProposal();
    } catch (err: unknown) {
      setError(formatWriteError(err, "Finalization failed"));
    } finally {
      setIsFinalizeConfirming(false);
    }
  }

  async function handleDecrypt() {
    setError(null);
    try {
      await decryptTally();
    } catch (err: unknown) {
      setError(formatWriteError(err, "Decryption failed"));
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-white p-5 shadow-[0_1px_3px_hsl(145_18%_12%/0.06)] space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs text-muted-foreground">#{proposalId.toString()}</span>
            <span className="text-muted-foreground">·</span>
            <span className="text-xs font-medium text-foreground">{CATEGORY_LABELS[proposal.category] ?? "General"}</span>
            {isFinalized && (
              <span className="rounded-full border border-foreground bg-foreground px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-background">
                Finalized
              </span>
            )}
          </div>
          <h4 className="mt-1 font-display text-xl font-semibold text-foreground">{proposal.title}</h4>
        </div>
      </div>

      <VoteStatGrid
        items={[
          { label: "Voters", value: proposal.totalVoters.toString() },
          {
            label: "Quorum",
            value: proposal.quorum > 0n ? `${proposal.totalVoters}/${proposal.quorum}` : "None",
            hint: proposal.quorum > 0n ? (quorumMet ? "Met" : "Not met") : undefined,
          },
          { label: "Options", value: proposal.numOptions.toString() },
          {
            label: "Status",
            value: isCancelled ? "Cancelled" : isFinalized ? "Finalized" : deadlinePassed ? "Ended" : "Active",
          },
        ]}
      />

      {isCancelled && (
        <div className="flex items-center gap-2 text-xs text-red-400">
          <Ban className="w-3.5 h-3.5" /> Proposal cancelled
        </div>
      )}

      {!isCancelled && !isFinalized && !deadlinePassed && (
        <div className="text-xs text-muted-foreground/50 flex items-center gap-2">
          Voting active — results available after deadline.
          <DeadlineCountdown deadline={proposal.deadline} />
        </div>
      )}

      {canFinalize && (
        <div className="space-y-2">
          <div className="text-xs text-yellow-400">
            Voting ended.{!quorumMet ? " Quorum not reached — cannot finalize." : " Finalize to reveal the aggregate tally on-chain."}
          </div>
          {/* Who should finalize */}
          {quorumMet && (
            <div className="flex items-start gap-2 p-2.5 rounded-md bg-muted border border-border text-xs text-muted-foreground/70">
              {isCreator ? (
                <><User className="w-3.5 h-3.5 text-foreground shrink-0 mt-0.5" />
                <span><span className="text-foreground font-semibold">You created this proposal.</span> Finalizing publishes the encrypted tallies on-chain so voters can decrypt their portion of the result.</span></>
              ) : (
                <><Users className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                <span><span className="text-amber-400 font-semibold">Waiting for creator to finalize.</span> Only the proposal creator (<span className="font-mono text-foreground/70">{proposal.creator.slice(0,6)}…{proposal.creator.slice(-4)}</span>) can finalize this vote.</span></>
              )}
            </div>
          )}
          {quorumMet && isCreator && (
          <motion.button
            onClick={handleFinalize}
            disabled={isFinalizePending || isFinalizeConfirming}
            whileHover={{ scale: 1.005 }}
            whileTap={{ scale: 0.99 }}
            className="btn-pay btn-pay-amber w-full py-2.5"
          >
            <Unlock className="w-3.5 h-3.5 inline mr-2" />
            {isFinalizePending ? "Sign in Wallet..." : isFinalizeConfirming ? "Confirming..." : "Finalize My Proposal"}
          </motion.button>
          )}
        </div>
      )}

      {isFinalized && !tallies && (
        <VoteRewardPrompt proposalId={proposalId} onGoToRewards={onClaimRewards} />
      )}

      {isFinalized && !tallies && (
        <div className="rounded-xl border border-border bg-muted/25 px-4 py-3 text-sm text-foreground/75">
          ✓ Finalized — decrypt the public tally below to reveal aggregate totals.
        </div>
      )}

      {finalizeTxHash && (
        <div className="text-xs text-muted-foreground flex items-center gap-1">
          Finalize TX:{" "}
          <a
            href={`https://sepolia.arbiscan.io/tx/${finalizeTxHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-foreground hover:underline inline-flex items-center gap-1"
          >
            {finalizeTxHash.slice(0, 10)}...{finalizeTxHash.slice(-8)}
            <ExternalLink className="w-3 h-3" />
          </a>
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
              <div className="rounded-2xl border border-border bg-foreground p-5 text-background">
                <div className="flex items-start gap-3">
                <Trophy className="w-5 h-5 shrink-0 mt-0.5 text-background/90" />
                <div className="space-y-1">
                  {tie ? (
                    <div className="text-base font-semibold">It&apos;s a tie!</div>
                  ) : (
                    <>
                      <div className="text-lg font-semibold leading-tight">
                        Winner: {options[winnerIdx] ?? `Option ${winnerIdx}`}
                      </div>
                      <div className="text-sm text-background/75">
                        {winnerPct}% of votes · leads by{" "}
                        <span className="font-mono font-medium text-background">{margin.toString()} vote{margin !== 1n ? "s" : ""}</span>
                        {" "}({marginPct}% margin)
                      </div>
                    </>
                  )}
                  <div className="text-xs text-background/60 mt-1">
                    {total.toString()} total votes · Individual ballots stay encrypted forever
                  </div>
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

          {onClaimRewards && (
            <VoteRewardPrompt proposalId={proposalId} onGoToRewards={onClaimRewards} compact />
          )}

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Total: {total?.toString()} votes</span>
            <button
              type="button"
              onClick={() => exportCSV(proposal.title, options, tallies)}
              className="inline-flex items-center gap-1 rounded-full border border-border bg-white px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted/40"
            >
              <Download className="w-3 h-3" /> Export CSV
            </button>
          </div>

          {/* Privacy guarantee note */}
          <div className="flex items-start gap-2 rounded-xl border border-border bg-white p-4">
            <ShieldCheck className="w-4 h-4 text-[hsl(var(--success))] shrink-0 mt-0.5" />
            <div className="text-xs text-foreground/70 leading-relaxed">
              These are aggregate totals made public at finalization. Individual ballots remain encrypted handles on-chain and{" "}
              <span className="font-semibold text-foreground">are never revealed</span>.
            </div>
          </div>
        </div>
      ) : (
        <motion.button
          onClick={handleDecrypt}
          disabled={!isFinalized || status === FHEStepStatus.COMPUTING || status === FHEStepStatus.ENCRYPTING}
          whileHover={{ scale: 1.005 }}
          whileTap={{ scale: 0.99 }}
          className="inline-flex w-full min-h-[2.75rem] items-center justify-center gap-2 rounded-full bg-foreground py-3 text-sm font-semibold text-background disabled:opacity-50"
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

export default function TallyReveal({ onClaimRewards }: { onClaimRewards?: () => void }) {
  const { data: count } = useProposalCount();
  const proposalCount = Number(count ?? 0);
  const [filter, setFilter] = useState<TallyFilter>("all");

  const filterTabs: { key: TallyFilter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "action", label: "Needs Action" },
    { key: "active", label: "Active" },
    { key: "finalized", label: "Finalized" },
    { key: "cancelled", label: "Cancelled" },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-muted hairline">
          <BarChart3 className="w-4 h-4 text-foreground" />
        </div>
        <div className="min-w-0">
          <h3 className="font-display text-sm font-semibold text-foreground leading-tight">Vote Results</h3>
          <p className="text-[10px] text-muted-foreground/45 tracking-widest mt-0.5 uppercase">Finalize &amp; decrypt tallies</p>
        </div>
        <span className="ml-auto shrink-0 rounded-full border border-border bg-muted px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-foreground">
          On-chain
        </span>
      </div>

      <div className="rounded-xl border border-border bg-white px-4 py-3 text-sm leading-relaxed text-foreground/75">
        After finalization, anyone can reveal aggregate totals. Individual votes remain permanently encrypted.
      </div>

      {/* Filter tabs */}
      {proposalCount > 0 && (
        <div className="flex flex-wrap gap-2">
          {filterTabs.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                filter === f.key
                  ? "border-foreground bg-foreground text-background"
                  : "border-border bg-white text-muted-foreground hover:border-foreground/30 hover:text-foreground"
              }`}
            >
              {f.key === "action" && <Timer className="w-2.5 h-2.5 inline mr-1" />}
              {f.label}
            </button>
          ))}
        </div>
      )}

      {proposalCount === 0 ? (
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <BarChart3 className="w-8 h-8 text-muted-foreground/20" />
          <div className="text-sm text-muted-foreground/60">No proposals yet.</div>
        </div>
      ) : (
        <div className="space-y-3">
          {Array.from({ length: proposalCount }, (_, i) => (
            <TallyResult key={i} proposalId={BigInt(i)} filter={filter} onClaimRewards={onClaimRewards} />
          ))}
        </div>
      )}
    </div>
  );
}
