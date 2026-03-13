import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Vote, AlertCircle, AlertTriangle, ExternalLink, CheckCircle2, ShieldCheck, Timer, Eye } from "lucide-react";
import { useAccount, useReadContract, usePublicClient, useWalletClient } from "wagmi";
import { useEncryptedVote } from "@/hooks/useEncryptedVote";
import { useProposalCount, useProposal, useProposalOptions, useHasVoted, CATEGORY_LABELS } from "@/hooks/useProposals";
import { OBSCURA_TOKEN_ABI, OBSCURA_TOKEN_ADDRESS, OBSCURA_VOTE_ABI, OBSCURA_VOTE_ADDRESS } from "@/config/contracts";
import AsyncStepper from "@/components/shared/AsyncStepper";
import { FHEStepStatus } from "@/lib/constants";
import { initFHEClient } from "@/lib/fhe";
import FHEOperationsVisual, { buildVoteOps, buildRevoteOps } from "@/components/vote/FHEOperationsVisual";

/** Dropdown option that fetches its own proposal data */
function ProposalOption({ index }: { index: number }) {
  const { proposal } = useProposal(BigInt(index));
  const now = BigInt(Math.floor(Date.now() / 1000));
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

export default function CastVoteForm({ initialProposalId = "" }: CastVoteFormProps) {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const { castVote, txHash, isTxPending, status, stepIndex, error: fheError, reset } = useEncryptedVote();
  const { data: count } = useProposalCount();
  const proposalCount = Number(count ?? 0);

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
  const now = BigInt(Math.floor(Date.now() / 1000));
  const secondsLeft = proposal?.deadline ? Number(proposal.deadline - now) : null;
  const isUrgent = secondsLeft !== null && secondsLeft > 0 && secondsLeft < 3600;
  const isCritical = secondsLeft !== null && secondsLeft > 0 && secondsLeft < 1800;

  const hasSelection = selectedProposal !== '';
  const isActive = hasSelection && proposal?.exists && !proposal.isCancelled && now < proposal.deadline && !proposal.isFinalized;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (selectedOption === null || !selectedProposal || proposalId === undefined) return;
    setError(null);
    setVotedOptionIndex(null);
    const wasAlreadyVoted = !!alreadyVoted;
    try {
      await castVote(proposalId, selectedOption);
      setVotedOptionIndex(selectedOption);
      setWasRevote(wasAlreadyVoted);
    } catch (err: any) {
      setError(err.shortMessage ?? err.message ?? "Vote failed");
    }
  }

  return (
    <div className="glass-panel rounded-md p-6 space-y-4">
      <div className="flex items-center gap-2">
        <Vote className="w-4 h-4 text-primary" />
        <span className="text-sm tracking-[0.2em] uppercase text-primary font-mono">
          Cast Encrypted Vote
        </span>
      </div>

      <div className="text-xs text-muted-foreground/50 px-1 border-l border-primary/20 pl-3">
        Your vote is encrypted client-side via FHE before submission. No one — including the
        contract — can see your individual choice. You can revote at any time before the deadline.
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* OBS Token requirement */}
        {isConnected && !hasClaimed && (
          <div className="flex items-start gap-2 p-3 bg-yellow-400/5 border border-yellow-400/20 rounded-md">
            <AlertTriangle className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
            <div>
              <div className="text-sm text-yellow-400 font-semibold">OBS Tokens Required</div>
              <div className="text-xs text-yellow-400/70 mt-0.5">
                You must claim daily $OBS tokens before voting. Go to the{" "}
                <Link to="/pay" className="underline text-primary">Pay app</Link> and click "Claim Daily OBS" first.
              </div>
            </div>
          </div>
        )}

        {/* Proposal selector */}
        <div>
          <label className="text-xs text-muted-foreground tracking-wider uppercase block mb-1.5">
            Select Proposal
          </label>
          <select
            value={selectedProposal}
            onChange={(e) => {
              setSelectedProposal(e.target.value);
              setSelectedOption(null);
              reset();
              setError(null);
            }}
            className="w-full bg-secondary/50 border border-border/50 rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/40"
          >
            <option value="">Choose a proposal...</option>
            {Array.from({ length: proposalCount }, (_, i) => (
              <ProposalOption key={i} index={i} />
            ))}
          </select>
        </div>

        {/* Proposal info */}
        {hasSelection && proposal?.exists && (
          <div className="p-3 bg-secondary/30 rounded-md border border-border/30 space-y-1">
            <div className="text-sm text-foreground">{proposal.title}</div>
            {proposal.description && (
              <div className="text-xs text-muted-foreground/70">{proposal.description}</div>
            )}
            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground mt-1">
              <span>Deadline: {new Date(Number(proposal.deadline) * 1000).toLocaleString()}</span>
              <span className="text-primary/50">|</span>
              <span>Category: <span className="text-primary">{CATEGORY_LABELS[proposal.category] ?? "General"}</span></span>
              <span className="text-primary/50">|</span>
              <span>Voters: {proposal.totalVoters.toString()}</span>
              {proposal.quorum > 0n && (
                <>
                  <span className="text-primary/50">|</span>
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
            {alreadyVoted && (
              <div className="text-xs text-primary mt-1">
                You have already voted — submitting will change your vote (anti-coercion revote)
              </div>
            )}
          </div>
        )}

        {/* Multi-option vote buttons */}
        {hasSelection && isActive && proposal?.exists && optionLabels && (optionLabels as string[]).length > 0 && (
          <div>
            <label className="text-xs text-muted-foreground tracking-wider uppercase block mb-1.5">
              Your Vote
            </label>
            <div className="space-y-2">
              {(optionLabels as string[]).map((label, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setSelectedOption(i)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-md border transition-all text-sm text-left ${
                    selectedOption === i
                      ? "border-primary/40 text-primary bg-primary/10"
                      : "border-border/50 text-muted-foreground hover:border-primary/20 hover:text-foreground"
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                    selectedOption === i ? "border-primary" : "border-muted-foreground/30"
                  }`}>
                    {selectedOption === i && <div className="w-2 h-2 rounded-full bg-primary" />}
                  </div>
                  <span className="text-xs text-muted-foreground/50 w-4">{i}</span>
                  {label}
                  {selectedOption === i && <CheckCircle2 className="w-4 h-4 ml-auto text-primary" />}
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
                  Your ballot is an encrypted ciphertext on Arbitrum Sepolia.
                  No one — not the contract, not the admin, not block explorers —
                  can see which option you chose. Only the aggregate tally is revealed after finalization.
                </div>
                <div className="text-xs text-muted-foreground/60 mt-2">
                  TX:{" "}
                  <a
                    href={`https://sepolia.arbiscan.io/tx/${txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline inline-flex items-center gap-1"
                  >
                    {txHash.slice(0, 10)}…{txHash.slice(-8)}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>

            {/* FHE operations that just ran */}
            <div className="p-3 bg-secondary/20 rounded-md border border-border/20">
              <FHEOperationsVisual
                ops={wasRevote ? buildRevoteOps(proposal?.numOptions ?? 2) : buildVoteOps(proposal?.numOptions ?? 2)}
                title="FHE Operations That Ran"
                animate
              />
            </div>

            {/* Verify prompt */}
            <div className="flex items-center gap-2 p-3 bg-primary/5 border border-primary/20 rounded-md">
              <Eye className="w-4 h-4 text-primary shrink-0" />
              <div className="text-xs text-foreground/80">
                Want to confirm your vote? Use{" "}
                <span className="text-primary font-semibold">Verify My Vote</span>{" "}
                in the Voting History tab — your wallet can self-decrypt its own ballot via{" "}
                <span className="font-mono text-primary">FHE.allow</span>.
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
              className="text-primary hover:underline inline-flex items-center gap-1"
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

        {/* Submit */}
        {!txHash && (
          <button
            type="submit"
            disabled={!isConnected || !hasClaimed || !isActive || selectedOption === null || isTxPending || status === FHEStepStatus.COMPUTING || status === FHEStepStatus.ENCRYPTING}
            className="w-full py-3 rounded-md border border-primary/40 text-primary text-sm tracking-[0.2em] uppercase hover:bg-primary/10 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {isTxPending ? "Submitting..." : alreadyVoted ? "Change Vote (Encrypted)" : "Cast Vote (Encrypted)"}
          </button>
        )}

        {txHash && (
          <button
            type="button"
            onClick={() => { reset(); setVotedOptionIndex(null); setSelectedOption(null); setError(null); }}
            className="w-full py-2 rounded-md border border-border/40 text-muted-foreground text-xs tracking-[0.15em] uppercase hover:border-primary/20 hover:text-foreground transition-all"
          >
            Vote on another proposal
          </button>
        )}
      </form>
    </div>
  );
}
