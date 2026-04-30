import { useAccount, useBalance, useReadContract } from "wagmi";
import { CheckCircle2, Circle, Loader2 } from "lucide-react";
import { OBSCURA_TOKEN_ADDRESS, OBSCURA_TOKEN_ABI } from "@/config/contracts";
import { useVoterParticipation } from "@/hooks/useProposals";
import { useDelegateTo } from "@/hooks/useDelegation";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

interface VoteSetupGuideProps {
  onNavigate: (tab: string, subTab?: string) => void;
}

export function VoteSetupGuide({ onNavigate }: VoteSetupGuideProps) {
  const { address, isConnected } = useAccount();

  // Step 1: ETH for gas
  const { data: ethBalance, isLoading: ethLoading } = useBalance({
    address,
    query: { enabled: !!address, refetchInterval: 15_000 },
  });
  const hasEth = !!ethBalance && ethBalance.value > 0n;

  // Step 2: OBS tokens — check lastClaim(address) > 0 (FHE token, balanceOf is encrypted)
  const { data: lastClaimRaw, isLoading: obsLoading } = useReadContract({
    address: OBSCURA_TOKEN_ADDRESS,
    abi: OBSCURA_TOKEN_ABI,
    functionName: "lastClaim",
    args: address ? [address] : undefined,
    query: { enabled: !!address, refetchInterval: 15_000 },
  });
  const hasObs = !!lastClaimRaw && (lastClaimRaw as bigint) > 0n;

  // Step 3: Voted at least once
  const { data: participationRaw, isLoading: participationLoading } = useVoterParticipation(
    address as `0x${string}` | undefined
  );
  const hasVoted = !!participationRaw && (participationRaw as bigint) > 0n;

  // Step 4: Delegation set up
  const { data: delegateTo, isLoading: delegateLoading } = useDelegateTo(
    address as `0x${string}` | undefined
  );
  const hasDelegated =
    !!delegateTo &&
    (delegateTo as string) !== ZERO_ADDRESS &&
    (delegateTo as string).toLowerCase() !== address?.toLowerCase();

  const steps = [
    {
      num: 1,
      title: "Get ETH for gas",
      detail: hasEth
        ? `${parseFloat(ethBalance!.formatted).toFixed(4)} ETH on Arbitrum Sepolia`
        : "You need a small amount of ETH to pay for transaction fees.",
      done: hasEth,
      loading: ethLoading && !!address,
      action: null as null | (() => void),
      actionLabel: "",
      externalLink: "https://faucet.triangleplatform.com/arbitrum/sepolia",
      externalLabel: "Get testnet ETH ↗",
    },
    {
      num: 2,
      title: "Claim $OBS governance tokens",
      detail: hasObs
        ? "$OBS claimed — you're ready to vote."
        : "You need $OBS tokens to create proposals and cast votes.",
      done: hasObs,
      loading: obsLoading && !!address,
      action: () => {
        document.getElementById("obs-claim-banner")?.scrollIntoView({ behavior: "smooth", block: "center" });
      },
      actionLabel: "Claim $OBS →",
      externalLink: null as null | string,
      externalLabel: null as null | string,
    },
    {
      num: 3,
      title: "Cast your first encrypted vote",
      detail: hasVoted
        ? "You've participated in governance — your vote is sealed on-chain."
        : "Browse active proposals and cast a fully encrypted ballot.",
      done: hasVoted,
      loading: participationLoading && !!address,
      action: () => onNavigate("voting", "proposals"),
      actionLabel: "Browse Proposals →",
      externalLink: null as null | string,
      externalLabel: null as null | string,
    },
    {
      num: 4,
      title: "Set up vote power delegation",
      detail: hasDelegated
        ? "You've delegated your vote — your power is active."
        : "Delegate your voting power to a trusted representative or keep it yourself.",
      done: hasDelegated,
      loading: delegateLoading && !!address,
      action: () => onNavigate("delegate"),
      actionLabel: "Set Up Delegation →",
      externalLink: null as null | string,
      externalLabel: null as null | string,
    },
  ] as const;

  const doneCount = steps.filter((s) => s.done).length;
  const allDone = doneCount === steps.length;
  const pct = Math.round((doneCount / steps.length) * 100);

  if (!isConnected) {
    return (
      <div className="pay-card p-5 space-y-3">
        <div>
          <div className="text-[10px] tracking-[0.22em] uppercase text-muted-foreground/45 font-mono mb-0.5">
            Setup guide
          </div>
          <h2 className="font-display text-[15px] font-semibold text-foreground leading-tight">
            Get started with ObscuraVote
          </h2>
          <p className="text-[11px] text-muted-foreground/55 mt-0.5">
            Connect your wallet to see your progress.
          </p>
        </div>
        <div className="h-1 rounded-full bg-white/[0.06]" />
      </div>
    );
  }

  return (
    <div className="pay-card p-5 space-y-4">
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[10px] tracking-[0.22em] uppercase text-muted-foreground/45 font-mono mb-0.5">
            Setup guide
          </div>
          <h2 className="font-display text-[15px] font-semibold text-foreground leading-tight">
            {allDone ? "You're all set — start governing" : "Get started with ObscuraVote"}
          </h2>
          <p className="text-[11px] text-muted-foreground/55 mt-0.5">
            {allDone
              ? "All steps complete. Your votes are private and binding."
              : `${doneCount} of ${steps.length} steps complete`}
          </p>
        </div>
        {/* Progress badge */}
        <div
          className={`shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono border tabular-nums ${
            allDone
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
              : "bg-white/[0.04] border-white/[0.08] text-muted-foreground/60"
          }`}
        >
          {allDone && <CheckCircle2 className="w-3 h-3" />}
          {doneCount}/{steps.length}
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 rounded-full bg-white/[0.06] overflow-hidden">
        <div
          className="h-full rounded-full bg-emerald-500 transition-all duration-700"
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Steps */}
      <div className="space-y-2">
        {steps.map((s) => (
          <div
            key={s.num}
            className={`flex items-start gap-3 p-3.5 rounded-xl border transition-colors ${
              s.done
                ? "border-emerald-500/15 bg-emerald-500/[0.03]"
                : "border-white/[0.07] bg-white/[0.02]"
            }`}
          >
            {/* Status icon */}
            <div className={`mt-0.5 shrink-0 ${s.done ? "text-emerald-400" : "text-muted-foreground/25"}`}>
              {s.loading ? (
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground/30" />
              ) : s.done ? (
                <CheckCircle2 className="w-5 h-5" />
              ) : (
                <Circle className="w-5 h-5" />
              )}
            </div>

            {/* Text */}
            <div className="flex-1 min-w-0">
              <div
                className={`text-[13px] font-medium leading-tight ${
                  s.done ? "text-foreground/50 line-through decoration-white/20" : "text-foreground/90"
                }`}
              >
                {s.num}. {s.title}
              </div>
              <div className="text-[11px] text-muted-foreground/50 mt-0.5 leading-snug">
                {s.detail}
              </div>
            </div>

            {/* Actions / Done badge */}
            {s.done ? (
              <span className="shrink-0 text-[10px] text-emerald-400/50 font-mono uppercase tracking-wide self-center">
                Done
              </span>
            ) : (
              <div className="shrink-0 flex flex-col items-end gap-1.5 self-center">
                {s.action && (
                  <button
                    onClick={s.action}
                    className="btn-pay btn-pay-emerald text-[11px] py-1 px-2.5 whitespace-nowrap"
                  >
                    {s.actionLabel}
                  </button>
                )}
                {s.externalLink && (
                  <a
                    href={s.externalLink}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[10px] text-muted-foreground/45 hover:text-muted-foreground/70 transition-colors"
                  >
                    {s.externalLabel}
                  </a>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
