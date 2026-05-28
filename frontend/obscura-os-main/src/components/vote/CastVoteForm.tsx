import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Vote, AlertCircle, AlertTriangle, ExternalLink, CheckCircle2, ShieldCheck, Timer, Eye, Users } from "lucide-react";
import { useAccount, useReadContract, usePublicClient, useWalletClient } from "wagmi";
import { useEncryptedVote } from "@/hooks/useEncryptedVote";
import { useProposalCount, useProposal, useProposalOptions, useHasVoted, CATEGORY_LABELS } from "@/hooks/useProposals";
import { OBSCURA_TOKEN_ABI, OBSCURA_TOKEN_ADDRESS, OBSCURA_VOTE_ABI, OBSCURA_VOTE_ADDRESS } from "@/config/contracts";
import AsyncStepper from "@/components/shared/AsyncStepper";
import { FHEStepStatus } from "@/lib/constants";
import { initFHEClient } from "@/lib/fhe";

import { useChainTime } from "@/hooks/useChainTime";
import { useDelegateTo, useVoteWeight } from "@/hooks/useDelegation";

/** Dropdown option that fetches its own proposal data */
function ProposalOption({ index, now }: { index: number; now: bigint }) {
  const { proposal } = useProposal(BigInt(index));
  const cancelled = proposal?.isCancelled;
  const ended = proposal && (proposal.deadline <= now || proposal.isFinalized);
  const label = proposal?.title
    ? `#${index} — ${proposal.title}${cancelled ? " (cancelled)" : ended ? " (ended)" : ""}`
    : `Proposal #${index}`;
  return <option value={index}>{label}</option>;
}

interface CastVoteFormProps {
  initialProposalId?: string;
}

const getVoteErrorMessage = (error: unknown) => {
  if (error && typeof error === "object") {
    const maybeError = error as { shortMessage?: unknown; message?: unknown };
    if (typeof maybeError.shortMessage === "string") return maybeError.shortMessage;
    if (typeof maybeError.message === "string") return maybeError.message;
  }
  return "Vote failed";
};

export default function CastVoteForm({ initialProposalId = "" }: CastVoteFormProps) {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const { castVote, txHash, isTxPending, status, stepIndex, error: fheError, reset } = useEncryptedVote();
  const { data: count } = useProposalCount();
  const proposalCount = Number(count ?? 0);
  const now = useChainTime();

  // Delegation state — must be called before any returns to satisfy Rules of Hooks
  const { data: delegateTo } = useDelegateTo(address);
  const { data: voteWeight } = useVoteWeight(address);
  const hasDelegated = !!delegateTo && delegateTo !== "0x0000000000000000000000000000000000000000";
  const effectiveWeight = voteWeight !== undefined ? Number(voteWeight) : 1;

  // Check if user has claimed OBS tokens
  const { data: lastClaimRaw } = useReadContract({
    address: OBSCURA_TOKEN_ADDRESS,
    abi: OBSCURA_TOKEN_ABI,
    functionName: 'lastClaim',
    args: address ? [address] : undefined,
    query: { enabled: !!OBSCURA_TOKEN_ADDRESS && !!address },
  });
  const hasClaimed = Number(lastClaimRaw ?? 0) > 0;

  const [selectedProposal, setSelectedProposal] = useState<string>(initialProposalId);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [votedOptionIndex, setVotedOptionIndex] = useState<number | null>(null);
  const [wasRevote, setWasRevote] = useState(false);
  const [showSubmittedChoice, setShowSubmittedChoice] = useState(false);

  // Sync to parent-provided initial proposal id
  useEffect(() => {
    if (initialProposalId) setSelectedProposal(initialProposalId);
  }, [initialProposalId]);

  // Eagerly pre-init FHE SDK so encryption is fast when the user clicks "Cast Vote"
  useEffect(() => {
    if (publicClient && walletClient) {
      initFHEClient(publicClient, walletClient).catch(() => {});
    }
  }, [publicClient, walletClient]);

  const proposalId = selectedProposal ? BigInt(selectedProposal) : undefined;
  const { proposal } = useProposal(proposalId ?? 0n);
  const { data: optionLabels } = useProposalOptions(proposalId ?? 0n);
  const { data: alreadyVoted } = useHasVoted(proposalId ?? 0n, address);

  // Deadline urgency
  const secondsLeft = proposal?.deadline ? Number(proposal.deadline - now) : null;
  const isUrgent = secondsLeft !== null && secondsLeft > 0 && secondsLeft < 3600;
  const isCritical = secondsLeft !== null && secondsLeft > 0 && secondsLeft < 1800;

  const hasSelection = selectedProposal !== '';
  const isActive = hasSelection && proposal?.exists && !proposal.isCancelled && now < proposal.deadline && !proposal.isFinalized;
  const isOwnProposal = !!(address && proposal?.creator && address.toLowerCase() === proposal.creator.toLowerCase());
  // Ended but not yet finalized
  const isEndedNotFinalized = hasSelection && proposal?.exists && !proposal.isCancelled && !proposal.isFinalized && now >= proposal.deadline;
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (selectedOption === null || !selectedProposal || proposalId === undefined) return;
    setError(null);
    setVotedOptionIndex(null);
    setShowSubmittedChoice(false);
    const wasAlreadyVoted = !!alreadyVoted;
    try {
      await castVote(proposalId, selectedOption);
      setVotedOptionIndex(selectedOption);
      setWasRevote(wasAlreadyVoted);
    } catch (err: unknown) {
      setError(getVoteErrorMessage(err));
    }
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-muted hairline">
          <Vote className="w-4 h-4 text-foreground" />
        </div>
        <div className="min-w-0">
          <h3 className="font-display text-sm font-semibold text-foreground leading-tight">Cast Private Vote</h3>
          <p className="text-[10px] text-muted-foreground/45 tracking-widest mt-0.5 uppercase">Encrypted ballot</p>
        </div>
        <span className="ml-auto shrink-0 pay-badge pay-badge-emerald">FHE</span>
      </div>

      <div className="text-[12px] text-muted-foreground/55 leading-relaxed border-l-2 border-emerald-500/20 pl-3">
        Your choice is encrypted before submission. You can change it before the deadline, and only
        final totals are revealed.
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* OBS Token requirement */}
        {isConnected && !hasClaimed && (
          <div className="flex items-start gap-2 p-3 bg-yellow-400/5 border border-yellow-400/20 rounded-md">
            <AlertTriangle className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
            <div>
              <div className="text-sm text-yellow-400 font-semibold">Beta access required</div>
              <div className="text-xs text-yellow-400/70 mt-0.5">
                This testnet contract requires one faucet claim before voting. Open the{" "}
                <Link to="/pay" className="underline text-foreground">Pay app</Link> and unlock beta access first.
              </div>
            </div>
          </div>
        )}

        {/* Delegation banner */}
        {isConnected && hasDelegated && (
          <div className="flex items-start gap-2 p-3 bg-violet-500/5 border border-violet-500/20 rounded-md">
            <Users className="w-4 h-4 text-violet-400 shrink-0 mt-0.5" />
            <div className="text-xs">
              <div className="text-violet-300 font-semibold mb-0.5">Vote delegated</div>
              <div className="text-violet-400/70">
                You have delegated your vote. Your delegate votes on your behalf with combined weight.
                Open Participation to undelegate if you want to vote directly.
              </div>
            </div>
          </div>
        )}

        {/* Vote weight badge */}
        {isConnected && !hasDelegated && effectiveWeight > 1 && (
          <div className="flex items-center gap-2 p-3 bg-violet-500/5 border border-violet-500/20 rounded-md">
            <Users className="w-4 h-4 text-violet-400 shrink-0" />
            <div className="text-xs text-violet-300">
              Your vote weight: <span className="font-bold text-foreground">{effectiveWeight}</span>
              <span className="text-violet-400/70 ml-1">({effectiveWeight - 1} delegate{effectiveWeight - 1 !== 1 ? "s" : ""} have trusted you)</span>
            </div>
          </div>
        )}

        {/* Proposal selector */}
        <div>
          <label className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground/50 font-semibold block mb-1.5">
            Select Proposal
          </label>
          <select
            value={selectedProposal}
            onChange={(e) => {
              setSelectedProposal(e.target.value);
              setSelectedOption(null);
              setShowSubmittedChoice(false);
              reset();
              setError(null);
            }}
            className="pay-select"
          >
            <option value="">Choose a proposal...</option>
            {Array.from({ length: proposalCount }, (_, i) => (
              <ProposalOption key={i} index={i} now={now} />
            ))}
          </select>
        </div>

        {/* Proposal info */}
        {hasSelection && proposal?.exists && (
          <div className="rounded-xl hairline bg-card p-4 space-y-1">
            <div className="text-sm text-foreground font-medium">{proposal.title}</div>
            {proposal.description && (
              <div className="text-xs text-muted-foreground/70">{proposal.description}</div>
            )}
            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground mt-1">
              <span>Deadline: {new Date(Number(proposal.deadline) * 1000).toLocaleString()}</span>
              <span className="text-foreground/30">|</span>
              <span>Category: <span className="text-foreground">{CATEGORY_LABELS[proposal.category] ?? "General"}</span></span>
              <span className="text-foreground/30">|</span>
              <span>Voters: {proposal.totalVoters.toString()}</span>
              {proposal.quorum > 0n && (
                <>
                  <span className="text-foreground/30">|</span>
                  <span>Quorum: {proposal.quorum.toString()}</span>
                </>
              )}
            </div>
            {proposal.isCancelled && (
              <div className="text-xs text-red-400 mt-1">This proposal was cancelled.</div>
            )}
            {!isActive && !proposal.isCancelled && (
              <span className="text-yellow-400 text-xs font-mono">
                {proposal.isFinalized ? "(Finalized)" : "(Ended)"}
              </span>
            )}
            {isEndedNotFinalized && (
              <div className="flex items-start gap-2 p-3 bg-amber-400/5 border border-amber-400/20 rounded-md">
                <Timer className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-400/80">
                  <span className="font-semibold text-amber-400">Voting period ended.</span> This proposal hasn’t been finalized yet.
                  Open Results to finalize and reveal the aggregate tally.
                </div>
              </div>
            )}

            {alreadyVoted && isActive && (
              <div className="text-xs text-foreground">
                You have already voted. Submitting again changes your private vote before the deadline.
              </div>
            )}
            {isOwnProposal && (
              <div className="text-xs text-red-400 mt-1 font-semibold">
                You created this proposal. Creators cannot vote on their own proposals.
              </div>
            )}
          </div>
        )}

        {/* Multi-option vote buttons */}
        {hasSelection && isActive && proposal?.exists && optionLabels && (optionLabels as string[]).length > 0 && (
          <div>
            <label className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground/50 font-semibold block mb-1.5">
              Your Vote
            </label>
            <div className="space-y-2">
              {(optionLabels as string[]).map((label, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setSelectedOption(i)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg border transition-all text-sm text-left ${
                    selectedOption === i
                      ? "border-emerald-400/50 text-foreground bg-emerald-400/10"
                      : "border-border text-muted-foreground hover:border-emerald-500/30 hover:text-foreground"
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                    selectedOption === i ? "border-emerald-400" : "border-muted-foreground/30"
                  }`}>
                    {selectedOption === i && <div className="w-2 h-2 rounded-full bg-emerald-400" />}
                  </div>
                  <span className="text-xs text-muted-foreground/50 w-4">{i}</span>
                  {label}
                  {selectedOption === i && <CheckCircle2 className="w-4 h-4 ml-auto text-foreground" />}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* FHE stepper */}
        {status !== FHEStepStatus.IDLE && (
          <AsyncStepper
            status={status}
            stepIndex={stepIndex}
            labels={["Encrypting Vote", "Submitting TX", "Vote Recorded"]}
          />
        )}

        {/* Error */}
        {(error || fheError) && (
          <div className="flex items-center gap-2 text-red-400 text-sm font-mono">
            <AlertCircle className="w-3.5 h-3.5" />
            {error || fheError}
          </div>
        )}

        {/* TX success state with FHE operations visualizer */}
        {txHash && votedOptionIndex !== null && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {/* Success banner */}
            <div className="flex items-start gap-3 p-4 bg-green-400/5 border border-green-400/20 rounded-md">
              <ShieldCheck className="w-5 h-5 text-green-400 shrink-0 mt-0.5" />
              <div>
                <div className="text-sm text-green-400 font-semibold">
                  {wasRevote ? "Vote changed — privately." : "Vote sealed — privately."}
                </div>
                <div className="text-xs text-green-400/70 mt-1 leading-relaxed">
                  Your ballot is sealed on Arbitrum Sepolia. No one can see which option you chose.
                  Only the aggregate tally is revealed after finalization.
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setShowSubmittedChoice((visible) => !visible)}
                    className="inline-flex h-8 items-center gap-1.5 rounded-full bg-green-400/10 px-3 text-xs font-medium text-green-300 hover:bg-green-400/15"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    {showSubmittedChoice ? "Hide my vote" : "Show my vote"}
                  </button>
                  <button
                    type="button"
                    onClick={() => { reset(); setVotedOptionIndex(null); setSelectedOption(null); setShowSubmittedChoice(false); setError(null); }}
                    className="inline-flex h-8 items-center gap-1.5 rounded-full border border-green-400/20 px-3 text-xs font-medium text-green-300 hover:bg-green-400/10"
                  >
                    Change vote
                  </button>
                </div>
                {showSubmittedChoice && (
                  <div className="mt-2 rounded-lg border border-green-400/20 bg-green-400/5 px-3 py-2 text-xs text-green-300">
                    Shown only on this device: {(optionLabels as string[])?.[votedOptionIndex] ?? `Option ${votedOptionIndex}`}.
                  </div>
                )}
                <div className="text-xs text-muted-foreground/60 mt-2">
                  TX:{" "}
                  <a
                    href={`https://sepolia.arbiscan.io/tx/${txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-foreground hover:underline inline-flex items-center gap-1"
                  >
                    {txHash.slice(0, 10)}…{txHash.slice(-8)}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>

            {/* Verify prompt */}
            <div className="flex items-center gap-2 p-3 bg-emerald-400/5 border border-emerald-400/20 rounded-lg">
              <Eye className="w-4 h-4 text-foreground shrink-0" />
              <div className="text-xs text-foreground/80">
                Want to confirm later? Use <span className="text-foreground font-semibold">Verify My Vote</span>{" "}
                in your ballot history. To change this vote, clear the success state and submit another option before the deadline.
              </div>
            </div>
          </motion.div>
        )}

        {/* TX hash (when no success state shown) */}
        {txHash && votedOptionIndex === null && (
          <div className="text-xs text-muted-foreground flex items-center gap-1">
            TX:{" "}
            <a
              href={`https://sepolia.arbiscan.io/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground hover:underline inline-flex items-center gap-1"
            >
              {txHash.slice(0, 10)}...{txHash.slice(-8)}
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        )}

        {/* Deadline urgency */}
        {isActive && (isCritical || isUrgent) && (
          <div className={`flex items-center gap-2 p-2.5 rounded-md border text-xs ${
            isCritical
              ? "bg-red-400/5 border-red-400/30 text-red-400"
              : "bg-orange-400/5 border-orange-400/30 text-orange-400"
          }`}>
            <Timer className="w-3.5 h-3.5 shrink-0" />
            {isCritical ? "Less than 30 minutes remaining!" : "Less than 1 hour remaining — vote soon!"}
          </div>
        )}

        {/* Confirmation step: shown after option selected, before submit */}
        {hasSelection && isActive && selectedOption !== null && !txHash && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-3 p-3 rounded-lg bg-emerald-400/5 border border-emerald-400/20 text-xs"
          >
            <ShieldCheck className="w-4 h-4 text-foreground shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="text-foreground font-semibold mb-0.5">Ready to cast your encrypted vote?</div>
              <div className="text-muted-foreground/70">
                You selected <span className="text-foreground font-semibold">“{(optionLabels as string[])?.[selectedOption] ?? `Option ${selectedOption}`}”</span> on <span className="text-foreground/80">{proposal?.title}</span>.
                Once confirmed, the ballot is sealed. Submitting again before the deadline changes your private vote.
              </div>
            </div>
          </motion.div>
        )}

        {/* Submit / Confirm */}
        {!txHash && (
          <motion.button
            type="submit"
            disabled={!isConnected || !hasClaimed || hasDelegated || !isActive || isOwnProposal || selectedOption === null || isTxPending || status === FHEStepStatus.COMPUTING || status === FHEStepStatus.ENCRYPTING}
            whileHover={{ scale: 1.005 }}
            whileTap={{ scale: 0.99 }}
            className="btn-pay btn-pay-emerald w-full py-2.5"
          >
            {isTxPending ? "Submitting..." : alreadyVoted ? "Change Private Vote" : "Submit Private Vote"}
          </motion.button>
        )}

        {txHash && (
          <button
            type="button"
            onClick={() => { reset(); setVotedOptionIndex(null); setSelectedOption(null); setShowSubmittedChoice(false); setError(null); }}
            className="btn-pay btn-pay-ghost w-full py-2.5"
          >
            Change this vote or choose another proposal
          </button>
        )}
      </form>
    </div>
  );
}
