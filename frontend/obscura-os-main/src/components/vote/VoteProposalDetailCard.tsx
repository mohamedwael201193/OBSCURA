import { Timer, Users, ShieldCheck } from "lucide-react";
import { CATEGORY_LABELS, type ProposalData } from "@/hooks/useProposals";
import { VoteNotice, VoteStatusPill, type VoteProposalStatus } from "@/components/harmony/voteHarmonyUi";

function getProposalStatus(proposal: ProposalData, now: bigint): VoteProposalStatus {
  if (proposal.isCancelled) return "cancelled";
  if (proposal.isFinalized) return "finalized";
  return now < proposal.deadline ? "active" : "ended";
}

function formatTimeLeft(secondsLeft: number): string {
  if (secondsLeft <= 0) return "Ended";
  const d = Math.floor(secondsLeft / 86400);
  const h = Math.floor((secondsLeft % 86400) / 3600);
  const m = Math.floor((secondsLeft % 3600) / 60);
  if (d > 0) return `${d}d ${h}h left`;
  if (h > 0) return `${h}h ${m}m left`;
  return `${m}m left`;
}

export function VoteProposalDetailCard({
  proposal,
  now,
  alreadyVoted,
  isOwnProposal,
  isEndedNotFinalized,
}: {
  proposal: ProposalData;
  now: bigint;
  alreadyVoted?: boolean;
  isOwnProposal?: boolean;
  isEndedNotFinalized?: boolean;
}) {
  const status = getProposalStatus(proposal, now);
  const secondsLeft = Number(proposal.deadline - now);
  const deadlineDate = new Date(Number(proposal.deadline) * 1000);
  const catLabel = CATEGORY_LABELS[proposal.category] ?? "General";
  const quorumPct =
    proposal.quorum > 0n
      ? Math.min(Number((proposal.totalVoters * 100n) / proposal.quorum), 100)
      : null;

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-muted/30">
      <div className="border-b border-border bg-card/80 px-4 py-4 sm:px-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              Proposal #{proposal.id.toString()} · {catLabel}
            </p>
            <h4 className="mt-1 font-display text-lg font-semibold leading-snug text-foreground">
              {proposal.title}
            </h4>
            {proposal.description && (
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{proposal.description}</p>
            )}
          </div>
          <VoteStatusPill status={status} />
        </div>
      </div>

      <div className="grid gap-3 p-4 sm:grid-cols-3 sm:p-5">
        <div className="rounded-xl hairline bg-card px-3 py-2.5">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            <Timer className="h-3.5 w-3.5" />
            Deadline
          </div>
          <p className="mt-1 text-sm font-medium text-foreground">{deadlineDate.toLocaleString()}</p>
          {status === "active" && (
            <p className="mt-0.5 text-xs text-[hsl(var(--success))]">{formatTimeLeft(secondsLeft)}</p>
          )}
        </div>
        <div className="rounded-xl hairline bg-card px-3 py-2.5">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            <Users className="h-3.5 w-3.5" />
            Participation
          </div>
          <p className="mt-1 text-sm font-medium text-foreground">
            {proposal.totalVoters.toString()} voter{proposal.totalVoters === 1n ? "" : "s"}
          </p>
          {proposal.quorum > 0n && (
            <p className="mt-0.5 text-xs text-muted-foreground">
              Quorum {proposal.totalVoters.toString()} / {proposal.quorum.toString()}
            </p>
          )}
        </div>
        <div className="rounded-xl hairline bg-card px-3 py-2.5">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5" />
            Privacy
          </div>
          <p className="mt-1 text-sm font-medium text-foreground">Choice stays private</p>
          <p className="mt-0.5 text-xs text-muted-foreground">Only totals revealed after close</p>
        </div>
      </div>

      {quorumPct !== null && (
        <div className="border-t border-border px-4 pb-4 sm:px-5">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>Quorum progress</span>
            <span>{quorumPct}%</span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-[hsl(var(--success))] transition-all duration-500"
              style={{ width: `${quorumPct}%` }}
            />
          </div>
        </div>
      )}

      {(alreadyVoted || isOwnProposal || isEndedNotFinalized || proposal.isCancelled) && (
        <div className="space-y-2 border-t border-border px-4 py-4 sm:px-5">
          {proposal.isCancelled && (
            <VoteNotice variant="warn">This proposal was cancelled and can no longer receive votes.</VoteNotice>
          )}
          {isEndedNotFinalized && !proposal.isCancelled && (
            <VoteNotice variant="warn">
              Voting has ended. Open Results to finalize and reveal aggregate totals only.
            </VoteNotice>
          )}
          {alreadyVoted && status === "active" && (
            <VoteNotice>You already voted. Submit again before the deadline to change your private choice.</VoteNotice>
          )}
          {isOwnProposal && (
            <VoteNotice variant="warn">Creators cannot vote on their own proposals.</VoteNotice>
          )}
        </div>
      )}
    </div>
  );
}
