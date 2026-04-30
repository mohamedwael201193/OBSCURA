import { useState } from "react";
import { useAccount } from "wagmi";
import { motion } from "framer-motion";
import {
  Vault, ArrowDownToLine, Lock, CheckCircle, AlertCircle,
  Loader2, ExternalLink, Clock, Shield, Info, Settings, Timer,
} from "lucide-react";
import { formatEther } from "viem";
import {
  useTreasuryBalance,
  useSpendRequest,
  useAttachSpend,
  useRecordFinalization,
  useExecuteSpend,
  useDepositTreasury,
  useTimelockDuration,
  useSetTimelockDuration,
} from "@/hooks/useTreasury";
import { useProposalCount, useProposal } from "@/hooks/useProposals";
import { useChainTime } from "@/hooks/useChainTime";
import { useVoteOwner, useVoteRole } from "@/hooks/useProposals";
import { Role, FHEStepStatus } from "@/lib/constants";
import AsyncStepper from "@/components/shared/AsyncStepper";

const ARBISCAN = "https://sepolia.arbiscan.io";

function TxLink({ hash }: { hash?: `0x${string}` }) {
  if (!hash) return null;
  return (
    <a href={`${ARBISCAN}/tx/${hash}`} target="_blank" rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-emerald-400 hover:underline text-xs">
      View tx <ExternalLink className="h-3 w-3" />
    </a>
  );
}

// ─── Spend Request Row ─────────────────────────────────────────────────────

function SpendRequestRow({ proposalId }: { proposalId: number }) {
  const { proposal } = useProposal(BigInt(proposalId));
  const { data: req } = useSpendRequest(BigInt(proposalId));
  const now = useChainTime();

  const { record, isPending: recording, txHash: recordTx, error: recordErr } = useRecordFinalization();
  const {
    execute, isPending: executing, txHash: executeTx, error: executeErr,
  } = useExecuteSpend();

  // req is a tuple: [recipient, executed, exists, timelockEnds, amountGwei]
  const reqTuple = req as readonly [`0x${string}`, boolean, boolean, bigint, bigint] | undefined;
  if (!reqTuple?.[2] || !proposal?.exists) return null;

  const reqRecipient = reqTuple[0];
  const reqExecuted = reqTuple[1];
  const timelockEnds = reqTuple[3];
  const reqAmountGwei = reqTuple[4];
  const reqAmountEth = reqAmountGwei > 0n ? (Number(reqAmountGwei) / 1e9).toFixed(4) : "?";
  const timelockElapsed = timelockEnds > 0n && now >= timelockEnds;
  // canRecord: proposal finalized AND timelock not yet started
  const canRecord = proposal.isFinalized && timelockEnds === 0n;
  const canExecute = !reqExecuted && timelockElapsed;

  const secondsLeft = timelockEnds > 0n && now < timelockEnds ? Number(timelockEnds - now) : 0;
  const timeLeftLabel = secondsLeft <= 0 ? ""
    : secondsLeft < 60 ? `${secondsLeft}s`
    : secondsLeft < 3600 ? `${Math.ceil(secondsLeft / 60)}m`
    : `${Math.ceil(secondsLeft / 3600)}h`;

  // Badge label
  let badgeLabel: string;
  let badgeClass: string;
  if (reqExecuted) {
    badgeLabel = "Executed";
    badgeClass = "border-emerald-500/30 bg-emerald-500/10 text-emerald-400";
  } else if (timelockElapsed) {
    badgeLabel = "Ready to Execute";
    badgeClass = "border-amber-500/30 bg-amber-500/10 text-amber-400";
  } else if (timelockEnds > 0n) {
    badgeLabel = `Timelock ${timeLeftLabel}`;
    badgeClass = "border-blue-500/30 bg-blue-500/10 text-blue-400";
  } else if (canRecord) {
    badgeLabel = "Start Timelock";
    badgeClass = "border-violet-500/30 bg-violet-500/10 text-violet-400";
  } else {
    // Not finalized yet
    badgeLabel = "Vote Pending";
    badgeClass = "border-white/10 bg-white/5 text-white/50";
  }

  return (
    <div className="rounded-lg border border-white/[0.06] bg-white/[0.025] p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-white">#{proposalId} — {proposal.title}</p>
          <p className="text-xs text-white/50 mt-0.5 font-mono">
            Recipient: {reqRecipient.slice(0, 8)}…{reqRecipient.slice(-4)}
          </p>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full border shrink-0 ${badgeClass}`}>
          {badgeLabel}
        </span>
      </div>

      <div className="text-xs text-white/40 flex items-center gap-1.5">
        <Lock className="h-3 w-3 text-violet-400" />
        Amount: <span className="text-white/60 font-mono">{reqAmountEth} ETH</span>
        <span className="text-white/20 mx-1">·</span>
        <span className="text-white/30">Recipient receives on execution</span>
      </div>

      <div className="flex flex-wrap gap-2">
        {canRecord && (
          <button onClick={() => record(BigInt(proposalId))} disabled={recording}
            className="flex items-center gap-1.5 rounded-lg border border-violet-500/30 bg-violet-500/10 px-3 py-1.5 text-xs text-violet-400 hover:bg-violet-500/20 disabled:opacity-50 transition-colors">
            {recording ? <Loader2 className="h-3 w-3 animate-spin" /> : <Clock className="h-3 w-3" />}
            Start Timelock
          </button>
        )}
        {!reqExecuted && timelockEnds > 0n && !timelockElapsed && (
          <p className="text-xs text-white/40 self-center">
            Timelock: {timeLeftLabel} remaining before execution is allowed.
          </p>
        )}
        {canExecute && (
          <button onClick={() => execute(BigInt(proposalId))} disabled={executing}
            className="flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs text-amber-400 hover:bg-amber-500/20 disabled:opacity-50 transition-colors">
            {executing ? <Loader2 className="h-3 w-3 animate-spin" /> : <ArrowDownToLine className="h-3 w-3" />}
            Execute Spend ({reqAmountEth} ETH)
          </button>
        )}
        {(recordTx || executeTx) && <TxLink hash={(executeTx ?? recordTx) as `0x${string}` | undefined} />}
      </div>

      {(executeErr || recordErr) && (
        <p className="text-xs text-red-400 flex items-center gap-1">
          <AlertCircle className="h-3 w-3" /> {executeErr ?? recordErr}
        </p>
      )}
    </div>
  );
}

// ─── Main Panel ────────────────────────────────────────────────────────────

export function TreasuryPanel() {
  const { address, isConnected } = useAccount();
  const { data: balanceWei } = useTreasuryBalance();
  const { data: count } = useProposalCount();
  const proposalCount = Number(count ?? 0);

  const {
    proposalIdInput, setProposalIdInput,
    recipientInput, setRecipientInput,
    ethAmountInput, setEthAmountInput,
    isPending: attaching, isConfirming: attachConfirming, isSuccess: attachSuccess,
    txHash: attachTx, error: attachError, handleAttach,
    status: attachStatus, stepIndex: attachStepIndex,
  } = useAttachSpend();

  const {
    deposit, isPending: depositing, isConfirming: depositConfirming,
    isSuccess: depositSuccess, txHash: depositTx, error: depositError,
  } = useDepositTreasury();

  const [depositInput, setDepositInput] = useState("");
  const [activeTab, setActiveTab] = useState<"requests" | "attach" | "fund" | "settings">("requests");

  const { data: ownerAddress } = useVoteOwner();
  const { data: userRoleRaw } = useVoteRole(address);
  const isOwner = !!address && !!ownerAddress && address.toLowerCase() === (ownerAddress as string).toLowerCase();
  const isAdmin = (userRoleRaw as number) === Role.ADMIN || isOwner;

  const { data: timelockRaw, refetch: refetchTimelock } = useTimelockDuration();
  const { setDuration, isPending: settingTimelock, receipt: timelockReceipt, error: timelockError } = useSetTimelockDuration();
  const timelockSeconds = timelockRaw ? Number(timelockRaw as bigint) : 172800;

  const TIMELOCK_PRESETS = [
    { label: "5 min", seconds: 300 },
    { label: "10 min", seconds: 600 },
    { label: "30 min", seconds: 1800 },
    { label: "1 hour", seconds: 3600 },
    { label: "6 hours", seconds: 21600 },
    { label: "24 hours", seconds: 86400 },
    { label: "48 hours", seconds: 172800 },
  ] as const;

  function formatDuration(secs: number): string {
    if (secs < 3600) return `${Math.round(secs / 60)} min`;
    if (secs < 86400) return `${Math.round(secs / 3600)} hour${secs >= 7200 ? "s" : ""}`;
    return `${Math.round(secs / 86400)} hour${secs >= 172800 ? "s" : ""} (${Math.round(secs / 86400)}d)`;
  }

  const balanceEth = balanceWei ? formatEther(balanceWei as bigint) : "0";

  return (
    <div className="space-y-5">
      {/* Header stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 flex items-center gap-3">
          <Vault className="h-8 w-8 text-amber-400 shrink-0" />
          <div>
            <p className="text-xs text-white/50 mb-0.5">Treasury Balance</p>
            <p className="text-xl font-bold text-white">{parseFloat(balanceEth).toFixed(4)} ETH</p>
          </div>
        </div>
        <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-4 flex items-center gap-3">
          <Lock className="h-8 w-8 text-violet-400 shrink-0" />
          <div>
            <p className="text-xs text-white/50 mb-0.5">FHE Privacy</p>
            <p className="text-sm font-semibold text-violet-300">Amounts encrypted</p>
            <p className="text-xs text-white/40">until execution</p>
          </div>
        </div>
      </div>

      {/* FHE info banner */}
      <div className="rounded-lg border border-violet-500/10 bg-violet-500/[0.04] p-3 flex items-start gap-2">
        <Info className="h-3.5 w-3.5 text-violet-400 shrink-0 mt-0.5" />
        <p className="text-xs text-violet-300/70">
          Spend amounts are sealed with <span className="text-violet-300 font-semibold">Fhenix FHE</span> at submission time.
          Only the proposal creator and recipient can decrypt the amount privately until the vote finalizes.
          After a 48h timelock, the amount is revealed on-chain and ETH is transferred.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg bg-white/5 p-1">
        {(["requests", "attach", "fund", ...(isAdmin ? ["settings"] : [])] as const).map(t => (
          <button key={t} onClick={() => setActiveTab(t)}
            className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-colors ${
              activeTab === t ? "bg-white/10 text-white" : "text-white/40 hover:text-white/70"
            }`}>
            {t === "requests" ? "Spend Requests" : t === "attach" ? "Attach Spend" : t === "fund" ? "Fund Treasury" : "Settings"}
          </button>
        ))}
      </div>

      {/* Spend Requests */}
      {activeTab === "requests" && (
        <div className="space-y-3">
          {proposalCount === 0 ? (
            <p className="text-xs text-white/40 text-center py-6">No proposals yet.</p>
          ) : (
            Array.from({ length: proposalCount }, (_, i) => (
              <SpendRequestRow key={i} proposalId={i} />
            ))
          )}
        </div>
      )}

      {/* Attach Spend Form */}
      {activeTab === "attach" && (
        <div className="space-y-3">
          {!isConnected && (
            <p className="text-xs text-white/50 text-center py-4">Connect your wallet to attach a spend request.</p>
          )}
          {isConnected && (
            <>
              <p className="text-xs text-white/50">
                Attach an encrypted ETH spend request to one of your proposals. The amount is hidden until the vote passes and timelock elapses.
              </p>
              <div className="space-y-2">
                <input type="number" placeholder="Proposal ID (e.g. 0)"
                  value={proposalIdInput} onChange={e => setProposalIdInput(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white placeholder-white/30 focus:border-violet-500/50 focus:outline-none" />
                <input type="text" placeholder="Recipient address (0x…)"
                  value={recipientInput} onChange={e => setRecipientInput(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white placeholder-white/30 focus:border-violet-500/50 focus:outline-none" />
                <div className="flex gap-2">
                  <input type="number" step="0.0001" placeholder="Amount in ETH (e.g. 0.05)"
                    value={ethAmountInput} onChange={e => setEthAmountInput(e.target.value)}
                    className="flex-1 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white placeholder-white/30 focus:border-violet-500/50 focus:outline-none" />
                  <motion.button onClick={handleAttach}
                    disabled={attaching || attachConfirming || !proposalIdInput || !recipientInput || !ethAmountInput}
                    whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                    className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50 transition-colors">
                    {attaching || attachConfirming ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Lock className="h-3.5 w-3.5" />}
                    {attachConfirming ? "Confirming…" : attaching ? "Encrypting…" : "Attach"}
                  </motion.button>
                </div>
                {attachError && <p className="text-xs text-red-400 flex items-center gap-1"><AlertCircle className="h-3 w-3" /> {attachError}</p>}
                {attachStatus !== FHEStepStatus.IDLE && (
                  <div className="pt-1">
                    <AsyncStepper
                      status={attachStatus}
                      stepIndex={attachStepIndex}
                      labels={["Encrypting Amount", "Submitting TX", "Spend Attached"]}
                    />
                  </div>
                )}
                {attachSuccess && attachTx && <div className="flex items-center gap-2 text-xs text-emerald-400"><CheckCircle className="h-3 w-3" /> Attached! <TxLink hash={attachTx} /></div>}
              </div>
            </>
          )}
        </div>
      )}

      {/* Fund Treasury */}
      {activeTab === "fund" && (
        <div className="space-y-3">
          <p className="text-xs text-white/50">
            Deposit ETH into the DAO treasury. Funds are disbursed only by successful governance votes with a 48h timelock.
          </p>
          <div className="flex gap-2">
            <input type="number" step="0.001" placeholder="ETH amount (e.g. 0.1)"
              value={depositInput} onChange={e => setDepositInput(e.target.value)}
              className="flex-1 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white placeholder-white/30 focus:border-amber-500/50 focus:outline-none" />
            <button onClick={() => deposit(depositInput)} disabled={depositing || depositConfirming || !depositInput}
              className="flex items-center gap-1.5 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50 transition-colors">
              {depositing || depositConfirming ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ArrowDownToLine className="h-3.5 w-3.5" />}
              Deposit
            </button>
          </div>
          {depositError && <p className="text-xs text-red-400 flex items-center gap-1"><AlertCircle className="h-3 w-3" /> {depositError}</p>}
          {depositSuccess && depositTx && <div className="flex items-center gap-2 text-xs text-emerald-400"><CheckCircle className="h-3 w-3" /> Deposited! <TxLink hash={depositTx} /></div>}

          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4 space-y-1.5 mt-2">
            <p className="text-xs font-semibold text-white/40 uppercase tracking-wider flex items-center gap-1.5">
              <Shield className="h-3.5 w-3.5" /> Treasury Security
            </p>
            <ul className="text-xs text-white/30 space-y-1 list-disc list-inside">
              <li>Spend amounts are FHE-encrypted until execution.</li>
              <li>Timelock between vote finalization and execution.</li>
              <li>Only creator, recipient, or admin can execute a spend.</li>
              <li>Encrypted running total — even the aggregate is hidden.</li>
            </ul>
          </div>
        </div>
      )}

      {/* Settings — Admin only */}
      {activeTab === "settings" && isAdmin && (
        <div className="space-y-4">
          <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-4 space-y-1">
            <p className="text-xs font-semibold text-violet-300 flex items-center gap-1.5">
              <Timer className="h-3.5 w-3.5" /> Current Timelock
            </p>
            <p className="text-2xl font-bold text-white">{formatDuration(timelockSeconds)}</p>
            <p className="text-[10px] text-white/30">Applied to all new finalization records. Existing pending requests keep their original timelock.</p>
          </div>

          <div className="space-y-2">
            <p className="text-xs text-white/50 font-medium uppercase tracking-wider">Set New Timelock</p>
            <div className="grid grid-cols-4 gap-2">
              {TIMELOCK_PRESETS.map((p) => {
                const isActive = timelockSeconds === p.seconds;
                return (
                  <button
                    key={p.seconds}
                    onClick={() => { setDuration(p.seconds); }}
                    disabled={settingTimelock || isActive}
                    className={`py-2 rounded-lg border text-xs font-medium transition-all ${
                      isActive
                        ? "border-violet-500/50 bg-violet-500/20 text-violet-300 cursor-default"
                        : "border-white/10 bg-white/[0.03] text-white/60 hover:border-violet-500/30 hover:text-violet-300 disabled:opacity-40"
                    }`}
                  >
                    {settingTimelock && !isActive ? <Loader2 className="h-3 w-3 animate-spin mx-auto" /> : p.label}
                  </button>
                );
              })}
            </div>
          </div>

          {timelockError && (
            <p className="text-xs text-red-400 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" /> {timelockError}
            </p>
          )}
          {timelockReceipt?.isSuccess && (
            <p className="text-xs text-emerald-400 flex items-center gap-1">
              <CheckCircle className="h-3 w-3" /> Timelock updated successfully!
            </p>
          )}

          <div className="rounded-lg border border-amber-500/10 bg-amber-500/[0.04] p-3 text-xs text-amber-300/60 flex items-start gap-2">
            <Info className="h-3.5 w-3.5 shrink-0 mt-0.5 text-amber-400/60" />
            <span>Shorter timelocks (5–30 min) are for testnet demo only. Production DAOs should use 24–48 hours to allow community review before execution.</span>
          </div>
        </div>
      )}
    </div>
  );
}
