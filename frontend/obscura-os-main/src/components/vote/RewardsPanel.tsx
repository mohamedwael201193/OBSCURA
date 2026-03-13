import { useState } from "react";
import { useAccount } from "wagmi";
import { motion } from "framer-motion";
import {
  Gift, Coins, Lock, CheckCircle, AlertCircle,
  Loader2, ExternalLink, Info, Trophy,
} from "lucide-react";
import { formatEther } from "viem";
import {
  useRewardPoolBalance,
  useRewardPerVote,
  usePendingReward,
  useRewardAccrued,
  useWithdrawalRequested,
  useAccrueReward,
  useRequestWithdrawal,
  useWithdrawReward,
  useFundRewards,
} from "@/hooks/useRewards";
import { useProposalCount, useProposal, useHasVoted } from "@/hooks/useProposals";

const ARBISCAN = "https://sepolia.arbiscan.io";
const REWARD_PER_VOTE_ETH = "0.001"; // 1_000_000 gwei

function TxLink({ hash }: { hash?: `0x${string}` }) {
  if (!hash) return null;
  return (
    <a href={`${ARBISCAN}/tx/${hash}`} target="_blank" rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-emerald-400 hover:underline text-xs">
      View tx <ExternalLink className="h-3 w-3" />
    </a>
  );
}

// ─── Single proposal reward row ────────────────────────────────────────────

function ProposalRewardRow({
  proposalId,
  voterAddress,
}: {
  proposalId: number;
  voterAddress: `0x${string}`;
}) {
  const { proposal } = useProposal(BigInt(proposalId));
  const { data: hasVoted } = useHasVoted(BigInt(proposalId), voterAddress);
  const { data: accruedAlready } = useRewardAccrued(BigInt(proposalId), voterAddress);
  const { accrue, isPending, isConfirming, isSuccess, txHash, error } = useAccrueReward();

  // Only show finalized proposals where user voted
  if (!proposal?.exists || !proposal.isFinalized || proposal.isCancelled) return null;
  if (!hasVoted) return null;

  return (
    <div className="flex items-center justify-between gap-3 py-2.5 border-b border-white/5 last:border-0">
      <div className="min-w-0">
        <p className="text-sm text-white truncate">#{proposalId} — {proposal.title}</p>
        <p className="text-xs text-white/40 mt-0.5">Reward: {REWARD_PER_VOTE_ETH} ETH</p>
      </div>
      <div className="shrink-0">
        {accruedAlready ? (
          <span className="flex items-center gap-1 text-xs text-emerald-400">
            <CheckCircle className="h-3.5 w-3.5" /> Accrued
          </span>
        ) : isSuccess ? (
          <span className="flex items-center gap-1 text-xs text-emerald-400">
            <CheckCircle className="h-3.5 w-3.5" /> Done <TxLink hash={txHash} />
          </span>
        ) : (
          <button
            onClick={() => accrue(BigInt(proposalId))}
            disabled={isPending || isConfirming}
            className="flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-400 hover:bg-emerald-500/20 disabled:opacity-50 transition-colors"
          >
            {isPending || isConfirming ? <Loader2 className="h-3 w-3 animate-spin" /> : <Coins className="h-3 w-3" />}
            Claim
          </button>
        )}
        {error && <p className="text-xs text-red-400 mt-0.5">{error.slice(0, 60)}</p>}
      </div>
    </div>
  );
}

// ─── Main Panel ────────────────────────────────────────────────────────────

export function RewardsPanel() {
  const { address, isConnected } = useAccount();
  const { data: poolWei } = useRewardPoolBalance();
  const { data: pendingWei, refetch: refetchPending } = usePendingReward(address);
  const { data: withdrawalReady, refetch: refetchWithdrawal } = useWithdrawalRequested(address);
  const { data: count } = useProposalCount();
  const proposalCount = Number(count ?? 0);

  const { request, isPending: requesting, isConfirming: requestConfirming, txHash: requestTx, error: requestErr, isSuccess: requestSuccess } = useRequestWithdrawal();
  const { withdrawReward, isPending: withdrawing, isConfirming: withdrawConfirming, txHash: withdrawTx, error: withdrawErr, isSuccess: withdrawSuccess } = useWithdrawReward();
  const { fund, isPending: funding, isConfirming: fundConfirming, txHash: fundTx, error: fundErr, isSuccess: fundSuccess } = useFundRewards();

  const [fundInput, setFundInput] = useState("");
  const [activeTab, setActiveTab] = useState<"earn" | "withdraw" | "fund">("earn");

  const poolEth = poolWei ? parseFloat(formatEther(poolWei as bigint)).toFixed(4) : "0";
  const pendingEth = pendingWei ? parseFloat(formatEther(pendingWei as bigint)).toFixed(4) : "0";
  const hasPending = pendingWei && (pendingWei as bigint) > 0n;
  const poolInsufficient = hasPending && poolWei !== undefined && (poolWei as bigint) < (pendingWei as bigint);

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 flex items-center gap-3">
          <Gift className="h-8 w-8 text-emerald-400 shrink-0" />
          <div>
            <p className="text-xs text-white/50 mb-0.5">Reward Pool</p>
            <p className="text-xl font-bold text-white">{poolEth} ETH</p>
          </div>
        </div>
        <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-4 flex items-center gap-3">
          <Lock className="h-8 w-8 text-violet-400 shrink-0" />
          <div>
            <p className="text-xs text-white/50 mb-0.5">Pending Reward</p>
            <p className="text-xl font-bold text-white">
              {isConnected ? `${pendingEth} ETH` : "—"}
            </p>
            <p className="text-xs text-white/30">Claimable after accrual</p>
          </div>
        </div>
      </div>

      {/* FHE info */}
      <div className="rounded-lg border border-violet-500/10 bg-violet-500/[0.04] p-3 flex items-start gap-2">
        <Info className="h-3.5 w-3.5 text-violet-400 shrink-0 mt-0.5" />
        <p className="text-xs text-violet-300/70">
          Your accumulated reward balance is stored as a <span className="text-violet-300 font-semibold">Fhenix FHE euint64</span> on-chain.
          Nobody can see your total — not other voters, not observers. Only you can decrypt it via the Fhenix gateway after requesting withdrawal.
          You earn <span className="text-white/70 font-semibold">{REWARD_PER_VOTE_ETH} ETH</span> per finalized proposal you voted on.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg bg-white/5 p-1">
        {(["earn", "withdraw", "fund"] as const).map(t => (
          <button key={t} onClick={() => setActiveTab(t)}
            className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-colors ${
              activeTab === t ? "bg-white/10 text-white" : "text-white/40 hover:text-white/70"
            }`}>
            {t === "earn" ? "Earn Rewards" : t === "withdraw" ? "Withdraw" : "Fund Pool"}
          </button>
        ))}
      </div>

      {/* Earn Rewards */}
      {activeTab === "earn" && (
        <div className="space-y-2">
          {!isConnected ? (
            <p className="text-xs text-white/50 text-center py-6">Connect your wallet to see eligible proposals.</p>
          ) : proposalCount === 0 ? (
            <p className="text-xs text-white/50 text-center py-6">No finalized proposals yet.</p>
          ) : (
            <div className="rounded-lg border border-white/[0.06] bg-white/[0.025] p-4">
              <p className="text-xs font-semibold text-white/50 uppercase tracking-wider flex items-center gap-1.5 mb-3">
                <Trophy className="h-3.5 w-3.5" /> Proposals where you voted
              </p>
              {Array.from({ length: proposalCount }, (_, i) => (
                <ProposalRewardRow key={i} proposalId={i} voterAddress={address!} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Withdraw */}
      {activeTab === "withdraw" && (
        <div className="space-y-3">
          {!isConnected ? (
            <p className="text-xs text-white/50 text-center py-6">Connect your wallet.</p>
          ) : (
            <>
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-4 space-y-3">
                <div>
                  <p className="text-xs text-white/50 mb-0.5">Pending Reward</p>
                  <p className="text-2xl font-bold text-white">{pendingEth} ETH</p>
                </div>

                {/* Step 1: Request withdrawal (triggers FHE.allow for private decryption) */}
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-white/50">Step 1 — Reveal your balance</p>
                  <p className="text-xs text-white/30">
                    Grants you Fhenix FHE decryption permission for your encrypted balance. You can then verify the amount via the gateway.
                  </p>
                  <button
                    onClick={async () => { await request(); refetchWithdrawal(); }}
                    disabled={requesting || requestConfirming || !hasPending || !!withdrawalReady}
                    className="flex items-center gap-1.5 rounded-lg border border-violet-500/30 bg-violet-500/10 px-4 py-2 text-sm text-violet-400 hover:bg-violet-500/20 disabled:opacity-50 transition-colors"
                  >
                    {requesting || requestConfirming ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Lock className="h-3.5 w-3.5" />}
                    {withdrawalReady ? "Balance Revealed" : requestConfirming ? "Confirming…" : requesting ? "Requesting…" : "Request Withdrawal"}
                  </button>
                  {requestSuccess && requestTx && <div className="flex items-center gap-1.5 text-xs text-emerald-400"><CheckCircle className="h-3 w-3" /> FHE permission granted <TxLink hash={requestTx} /></div>}
                  {requestErr && <p className="text-xs text-red-400">{requestErr}</p>}
                </div>

                {/* Step 2: Withdraw ETH */}
                {withdrawalReady && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-white/50">Step 2 — Collect ETH</p>
                    <p className="text-xs text-white/30">
                      Transfers your accrued ETH and atomically zeroes your FHE encrypted balance.
                    </p>
                    {poolInsufficient && (
                      <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2.5">
                        <AlertCircle className="h-3.5 w-3.5 text-amber-400 shrink-0 mt-0.5" />
                        <div className="text-xs text-amber-400/80">
                          <span className="font-semibold text-amber-400">Reward pool is empty.</span>{" "}
                          The pool needs to be funded before you can withdraw. Go to the{" "}
                          <button onClick={() => setActiveTab("fund")} className="underline text-amber-300 hover:text-amber-200">
                            Fund Pool
                          </button>{" "}
                          tab and contribute ETH.
                        </div>
                      </div>
                    )}
                    <motion.button
                      onClick={async () => { await withdrawReward(); refetchPending(); refetchWithdrawal(); }}
                      disabled={withdrawing || withdrawConfirming || !hasPending || !!poolInsufficient}
                      whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                      className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                    >
                      {withdrawing || withdrawConfirming ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Coins className="h-3.5 w-3.5" />}
                      {withdrawConfirming ? "Confirming…" : withdrawing ? "Withdrawing…" : `Withdraw ${pendingEth} ETH`}
                    </motion.button>
                    {withdrawSuccess && withdrawTx && <div className="flex items-center gap-1.5 text-xs text-emerald-400"><CheckCircle className="h-3 w-3" /> Withdrawn! <TxLink hash={withdrawTx} /></div>}
                    {withdrawErr && <p className="text-xs text-red-400">{withdrawErr}</p>}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* Fund Pool */}
      {activeTab === "fund" && (
        <div className="space-y-3">
          <p className="text-xs text-white/50">
            Donate ETH to the voter rewards pool. Funds are distributed to governance participants.
          </p>
          <div className="flex gap-2">
            <input type="number" step="0.001" placeholder="ETH amount (e.g. 0.1)"
              value={fundInput} onChange={e => setFundInput(e.target.value)}
              className="flex-1 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white placeholder-white/30 focus:border-emerald-500/50 focus:outline-none" />
            <button onClick={() => fund(fundInput)} disabled={funding || fundConfirming || !fundInput}
              className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors">
              {funding || fundConfirming ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Gift className="h-3.5 w-3.5" />}
              Fund
            </button>
          </div>
          {fundErr && <p className="text-xs text-red-400 flex items-center gap-1"><AlertCircle className="h-3 w-3" />{fundErr}</p>}
          {fundSuccess && fundTx && <div className="flex items-center gap-1.5 text-xs text-emerald-400"><CheckCircle className="h-3 w-3" /> Funded! <TxLink hash={fundTx} /></div>}
        </div>
      )}
    </div>
  );
}
