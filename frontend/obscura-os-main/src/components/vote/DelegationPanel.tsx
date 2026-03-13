import { useState } from "react";
import { useAccount } from "wagmi";
import {
  Users, ArrowRight, XCircle, Loader2, CheckCircle, AlertCircle,
  ExternalLink, Scale, Copy, Check, ChevronDown, ChevronUp, Shield, Eye,
} from "lucide-react";
import {
  useDelegateTo, useVoteWeight, useDelegationWrite, useDelegators,
} from "@/hooks/useDelegation";

const ARBISCAN = "https://sepolia.arbiscan.io";
const ZERO_ADDR = "0x0000000000000000000000000000000000000000";

function shortAddr(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

/** Deterministic gradient avatar from address */
function AddrAvatar({ addr, size = 40 }: { addr: string; size?: number }) {
  const seed = parseInt(addr.slice(2, 10), 16);
  const hue1 = seed % 360;
  const hue2 = (seed * 137) % 360;
  return (
    <div
      className="rounded-full shrink-0 flex items-center justify-center font-bold text-white/80 text-xs"
      style={{
        width: size, height: size,
        background: `linear-gradient(135deg, hsl(${hue1},65%,40%), hsl(${hue2},70%,30%))`,
      }}
    >
      {addr.slice(2, 4).toUpperCase()}
    </div>
  );
}

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className="text-muted-foreground/40 hover:text-muted-foreground/80 transition-colors"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

function DelegatorRow({ addr, index }: { addr: `0x${string}`; index: number }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.05] last:border-0">
      <span className="text-[10px] text-muted-foreground/30 font-mono w-5 text-right shrink-0">{index + 1}</span>
      <AddrAvatar addr={addr} size={28} />
      <div className="flex-1 min-w-0">
        <span className="font-mono text-[13px] text-foreground/80">{shortAddr(addr)}</span>
      </div>
      <CopyBtn text={addr} />
      <a
        href={`${ARBISCAN}/address/${addr}`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-muted-foreground/30 hover:text-muted-foreground/70 transition-colors"
      >
        <ExternalLink className="w-3.5 h-3.5" />
      </a>
    </div>
  );
}

export function DelegationPanel() {
  const { address } = useAccount();
  const [showHowTo, setShowHowTo] = useState(false);

  const { data: currentDelegatee, refetch: refetchDelegatee } = useDelegateTo(address);
  const { data: voteWeight, refetch: refetchWeight } = useVoteWeight(address);
  const { delegators, isLoading: loadingDelegators } = useDelegators(address);

  const {
    delegateeInput, setDelegateeInput,
    txHash, isConfirming, error,
    handleDelegate, handleUndelegate,
    isPending, isSuccess,
  } = useDelegationWrite();

  const hasDelegated =
    !!currentDelegatee &&
    currentDelegatee !== ZERO_ADDR;

  const effectiveWeight = voteWeight !== undefined ? Number(voteWeight) : 1;

  async function onDelegate() { await handleDelegate(); refetchDelegatee(); refetchWeight(); }
  async function onUndelegate() { await handleUndelegate(); refetchDelegatee(); refetchWeight(); }

  if (!address) {
    return (
      <div className="pay-card p-8 text-center">
        <Users className="w-8 h-8 text-muted-foreground/20 mx-auto mb-3" />
        <p className="text-[13px] text-muted-foreground/50">Connect your wallet to manage delegation.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">

      {/* ── Profile header ─────────────────────────────────────── */}
      <div className="pay-card p-5">
        <div className="flex items-start gap-4">
          <AddrAvatar addr={address} size={52} />
          <div className="flex-1 min-w-0">
            <div className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground/40 font-mono mb-0.5">
              Your Profile
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-[15px] text-foreground font-semibold">
                {shortAddr(address)}
              </span>
              <CopyBtn text={address} />
              <a
                href={`${ARBISCAN}/address/${address}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground/30 hover:text-muted-foreground/70 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            {/* Stats row */}
            <div className="flex flex-wrap gap-4 mt-3">
              <div className="text-center">
                <div className="flex items-center gap-1.5">
                  <Scale className="w-3.5 h-3.5 text-violet-400" />
                  <span className="font-display text-xl font-bold text-violet-300">{effectiveWeight}</span>
                </div>
                <div className="text-[10px] text-muted-foreground/45 uppercase tracking-wider mt-0.5">Vote Weight</div>
              </div>
              <div className="w-px bg-white/[0.07] self-stretch" />
              <div className="text-center">
                <div className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="font-display text-xl font-bold text-emerald-300">
                    {loadingDelegators ? "…" : delegators.length}
                  </span>
                </div>
                <div className="text-[10px] text-muted-foreground/45 uppercase tracking-wider mt-0.5">Delegators</div>
              </div>
              <div className="w-px bg-white/[0.07] self-stretch" />
              <div className="text-center">
                <div className="flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-blue-400" />
                  <span className="font-display text-xl font-bold text-blue-300">
                    {hasDelegated ? "Delegated" : "Direct"}
                  </span>
                </div>
                <div className="text-[10px] text-muted-foreground/45 uppercase tracking-wider mt-0.5">Voting Mode</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Current delegation target ───────────────────────────── */}
      <div className="pay-card overflow-hidden">
        <div className="px-5 py-3.5 border-b border-white/[0.06]">
          <div className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground/40 font-mono">
            Delegating To
          </div>
        </div>

        {hasDelegated ? (
          <div className="p-5">
            <div className="flex items-center gap-4">
              <AddrAvatar addr={currentDelegatee as string} size={44} />
              <div className="flex-1 min-w-0">
                <div className="font-mono text-[14px] text-foreground/90 font-medium">
                  {shortAddr(currentDelegatee as string)}
                </div>
                <div className="text-[11px] text-amber-400/60 mt-0.5">Active delegate</div>
                <div className="flex items-center gap-3 mt-1">
                  <CopyBtn text={currentDelegatee as string} />
                  <a
                    href={`${ARBISCAN}/address/${currentDelegatee}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-muted-foreground/40 hover:text-muted-foreground/70 flex items-center gap-1 transition-colors"
                  >
                    View on Arbiscan <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
              <button
                onClick={onUndelegate}
                disabled={isPending || isConfirming}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-500/25 bg-red-500/[0.07] text-[12px] text-red-400 hover:bg-red-500/15 transition-colors disabled:opacity-50 shrink-0"
              >
                {isPending || isConfirming
                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  : <XCircle className="h-3.5 w-3.5" />}
                {isConfirming ? "Wait…" : isPending ? "Removing…" : "Remove"}
              </button>
            </div>
            <div className="mt-3 flex items-start gap-2 p-2.5 rounded-lg bg-amber-500/[0.05] border border-amber-500/15">
              <AlertCircle className="w-3.5 h-3.5 text-amber-400/70 mt-0.5 shrink-0" />
              <p className="text-[11px] text-amber-300/50 leading-snug">
                While delegated, you cannot vote directly. Remove delegation to vote yourself.
              </p>
            </div>
          </div>
        ) : (
          <div className="p-5 flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
              <Shield className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="text-[13px] font-medium text-foreground/80">Voting directly</div>
              <div className="text-[11px] text-muted-foreground/50 mt-0.5">
                You cast your own votes. Delegate below to let a representative vote for you.
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Set / Change Delegate form ──────────────────────────── */}
      <div className="pay-card overflow-hidden">
        <div className="px-5 py-3.5 border-b border-white/[0.06]">
          <div className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground/40 font-mono">
            {hasDelegated ? "Change Delegate" : "Set Delegate"}
          </div>
        </div>
        <div className="p-5 space-y-3">
          <p className="text-[12px] text-muted-foreground/50 leading-snug">
            Enter any wallet address. That address will cast votes using your weight added to theirs.
            Chains are blocked — your delegate cannot re-delegate.
          </p>

          {/* Privacy disclosure */}
          <div className="flex items-start gap-2 p-2.5 rounded-lg border border-amber-500/15 bg-amber-500/[0.05]">
            <Eye className="w-3.5 h-3.5 text-amber-400/70 mt-0.5 shrink-0" />
            <div className="text-[11px] text-amber-300/55 leading-snug space-y-1">
              <p><span className="text-amber-300/80 font-medium">Delegation is public by design.</span> The contract must know your delegatee’s address to add your weight to their votes — this cannot be encrypted with FHE without breaking the vote-weight calculation. Your actual <span className="text-amber-300/80">vote choice remains fully private.</span></p>
              <p className="text-amber-300/40">If you want to hide the link between your identity and your delegate, use a separate wallet address for delegation.</p>
            </div>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={delegateeInput}
              onChange={(e) => setDelegateeInput(e.target.value)}
              placeholder="0x… delegate address"
              className="flex-1 rounded-lg border border-white/[0.09] bg-black/30 px-3 py-2.5 text-[13px] text-white placeholder-white/25 focus:border-violet-500/50 focus:outline-none"
            />
            <button
              onClick={onDelegate}
              disabled={isPending || isConfirming || !delegateeInput.trim()}
              className="flex items-center gap-1.5 rounded-lg bg-violet-600/80 hover:bg-violet-600 px-4 py-2.5 text-[13px] font-medium text-white transition-colors disabled:opacity-50"
            >
              {isPending || isConfirming
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : <ArrowRight className="h-3.5 w-3.5" />}
              {isConfirming ? "Wait…" : isPending ? "Delegating…" : "Delegate"}
            </button>
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/[0.07] px-3 py-2 text-[12px] text-red-400">
              <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              {error}
            </div>
          )}

          {isSuccess && txHash && !error && (
            <div className="flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/[0.07] px-3 py-2 text-[12px] text-emerald-400">
              <CheckCircle className="h-3.5 w-3.5 shrink-0" />
              Done!{" "}
              <a
                href={`${ARBISCAN}/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="underline flex items-center gap-1"
              >
                View tx <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          )}
        </div>
      </div>

      {/* ── Delegators to me ───────────────────────────────────── */}
      <div className="pay-card overflow-hidden">
        <div className="px-5 py-3.5 border-b border-white/[0.06] flex items-center justify-between">
          <div className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground/40 font-mono">
            Delegated to You
          </div>
          <span className={`text-[11px] font-mono px-2 py-0.5 rounded-full border ${
            delegators.length > 0
              ? "border-violet-500/25 bg-violet-500/10 text-violet-300"
              : "border-white/[0.07] bg-white/[0.03] text-muted-foreground/40"
          }`}>
            {loadingDelegators ? "…" : delegators.length}
          </span>
        </div>

        {loadingDelegators ? (
          <div className="flex items-center justify-center gap-2 py-8 text-[12px] text-muted-foreground/40">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading delegators…
          </div>
        ) : delegators.length === 0 ? (
          <div className="p-6 text-center">
            <Users className="w-7 h-7 text-muted-foreground/15 mx-auto mb-2" />
            <p className="text-[12px] text-muted-foreground/40">No one has delegated to you yet.</p>
          </div>
        ) : (
          <div>
            {delegators.map((d, i) => (
              <DelegatorRow key={d} addr={d} index={i} />
            ))}
          </div>
        )}
      </div>

      {/* ── How delegation works (collapsible) ─────────────────── */}
      <div className="pay-card overflow-hidden">
        <button
          onClick={() => setShowHowTo((v) => !v)}
          className="w-full flex items-center justify-between px-5 py-3.5 text-left hover:bg-white/[0.02] transition-colors"
        >
          <div className="flex items-center gap-2">
            <Users className="w-3.5 h-3.5 text-muted-foreground/40" />
            <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground/50 font-mono">
              How Delegation Works
            </span>
          </div>
          {showHowTo
            ? <ChevronUp className="w-4 h-4 text-muted-foreground/30" />
            : <ChevronDown className="w-4 h-4 text-muted-foreground/30" />}
        </button>

        {showHowTo && (
          <ul className="px-5 pb-4 text-[12px] text-muted-foreground/50 space-y-2 leading-relaxed border-t border-white/[0.05] pt-3">
            <li>• Delegate to any address — they vote with your weight added to theirs.</li>
            <li>• Delegation chains are blocked (A→B→C is not allowed).</li>
            <li>• Your vote privacy is still preserved — only vote direction is hidden on-chain.</li>
            <li>• You can change or remove your delegation at any time before a vote deadline.</li>
            <li>• Already-cast votes are not retroactively changed when delegation changes.</li>
          </ul>
        )}
      </div>
    </div>
  );
}

