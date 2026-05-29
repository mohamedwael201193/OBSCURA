import { ArrowRight, Gift, CheckCircle2 } from "lucide-react";
import { useAccount } from "wagmi";
import { useHasVoted, useProposal } from "@/hooks/useProposals";
import { useRewardAccrued } from "@/hooks/useRewards";

const REWARD_ETH = "0.001";

export function VoteRewardPrompt({
  proposalId,
  onGoToRewards,
  compact = false,
}: {
  proposalId: bigint;
  onGoToRewards?: () => void;
  compact?: boolean;
}) {
  const { address, isConnected } = useAccount();
  const { proposal } = useProposal(proposalId);
  const { data: hasVoted } = useHasVoted(proposalId, address);
  const { data: accruedAlready } = useRewardAccrued(proposalId, address);

  if (!isConnected || !address) return null;
  if (!proposal?.exists || !proposal.isFinalized || proposal.isCancelled) return null;
  if (!hasVoted) return null;

  if (accruedAlready) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-border bg-white px-4 py-3 text-sm text-foreground/75">
        <CheckCircle2 className="h-4 w-4 shrink-0 text-[hsl(var(--success))]" />
        <span>
          Voter reward <span className="font-semibold text-foreground">{REWARD_ETH} ETH</span> already claimed for this proposal.
        </span>
      </div>
    );
  }

  return (
    <div
      className={
        compact
          ? "rounded-xl border border-border bg-white p-4"
          : "rounded-2xl border-2 border-foreground bg-white p-5 shadow-[0_2px_8px_hsl(145_18%_12%/0.08)]"
      }
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-foreground text-background">
            <Gift className="h-5 w-5" />
          </div>
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Voter reward ready</p>
            <p className="mt-1 font-display text-xl font-semibold text-foreground">
              Claim {REWARD_ETH} ETH
            </p>
            <p className="mt-1 text-sm leading-relaxed text-foreground/70">
              You voted on this proposal before it finalized. Go to Participation → Rewards to claim your encrypted voter reward.
            </p>
          </div>
        </div>
        {onGoToRewards && (
          <button
            type="button"
            onClick={onGoToRewards}
            className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-foreground px-5 text-sm font-semibold text-background"
          >
            Claim reward
            <ArrowRight className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
