import { useAccount, usePublicClient, useWriteContract } from "wagmi";
import { parseUnits } from "viem";
import { motion } from "framer-motion";
import { useStreamList, type StreamSummary } from "@/hooks/useStreamList";
import { useTickStream } from "@/hooks/useTickStream";
import { useCUSDCTransfer } from "@/hooks/useCUSDCTransfer";
import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Play, Clock, Ban, Timer, CheckCircle2, XCircle, Check, Pause, PlayCircle, Shield, Zap } from "lucide-react";
import { arbitrumSepolia } from "viem/chains";
import {
  OBSCURA_STEALTH_REGISTRY_ABI,
  OBSCURA_STEALTH_REGISTRY_ADDRESS,
} from "@/config/pay";
import {
  OBSCURA_PAY_STREAM_V2_ABI,
  OBSCURA_PAY_STREAM_V2_ADDRESS,
} from "@/config/payV2";
import type { MetaAddress } from "@/lib/stealth";
import { getString, setString } from "@/lib/scopedStorage";

function RecipientStatus({ address: addr }: { address: `0x${string}` }) {
  const publicClient = usePublicClient();
  const [registered, setRegistered] = useState<boolean | null>(null);

  useEffect(() => {
    if (!publicClient || !OBSCURA_STEALTH_REGISTRY_ADDRESS) return;
    let cancelled = false;
    publicClient
      .readContract({
        address: OBSCURA_STEALTH_REGISTRY_ADDRESS,
        abi: OBSCURA_STEALTH_REGISTRY_ABI,
        functionName: "getMetaAddress",
        args: [addr],
      })
      .then((r) => {
        if (cancelled) return;
        const [, , ts] = r as readonly [`0x${string}`, `0x${string}`, bigint];
        setRegistered(ts > 0n);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [addr, publicClient]);

  if (registered === null) return null;
  return registered ? (
    <span className="inline-flex items-center gap-1 text-[11px] text-green-400"><CheckCircle2 className="w-2.5 h-2.5" /> stealth ready</span>
  ) : (
    <span className="inline-flex items-center gap-1 text-[11px] text-red-400"><XCircle className="w-2.5 h-2.5" /> no stealth</span>
  );
}

function CountdownTimer({ nextDue, now, onRefresh }: { nextDue: number; now: number; onRefresh: () => void }) {
  const secsLeft = nextDue - now;
  const display = secsLeft > 86400
    ? `${Math.ceil(secsLeft / 86400)}d`
    : secsLeft > 3600
      ? `${Math.ceil(secsLeft / 3600)}h`
      : secsLeft > 60
        ? `${Math.ceil(secsLeft / 60)}m`
        : secsLeft > 0
          ? `${secsLeft}s`
          : "now";
  return (
    <div className="space-y-1.5">
      <div className="w-full py-2 text-[11px] tracking-[0.15em] uppercase text-muted-foreground/40 border border-white/[0.07] rounded-lg flex items-center justify-center gap-1.5">
        <Timer className="w-3 h-3" /> Next cycle in {display}
      </div>
      {secsLeft <= 0 && (
        <button onClick={() => onRefresh()}
          className="w-full py-1.5 text-[10px] tracking-[0.15em] uppercase text-emerald-400/60 hover:text-emerald-400 transition-colors">
          Refresh to check
        </button>
      )}
    </div>
  );
}

export default function StreamList({ mode }: { mode: "employer" | "recipient" }) {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const filter = mode === "employer" ? { employer: address } : { recipient: address };
  const { streams, isLoading, refresh } = useStreamList(filter);
  const { tick, isTicking } = useTickStream();
  const { transfer: directTransfer } = useCUSDCTransfer();
  const { writeContractAsync } = useWriteContract();
  const [tickAmount, setTickAmount] = useState("");
  const [payMode, setPayMode] = useState<"direct" | "stealth">("direct");
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  const [lastPayment, setLastPayment] = useState<{ streamId: string; txHash: string; announceTx?: string; amount: string; stealthAddress?: string } | null>(null);
  const [streamAction, setStreamAction] = useState<string | null>(null);

  // Track paid cycles in localStorage (on-chain counter won't update since we bypass PayStream)
  const getLocalPaid = useCallback((streamId: bigint): number => {
    try {
      const key = `obscura_paid_${streamId.toString()}`;
      const v = getString(key, address);
      return parseInt(v ?? "0", 10);
    } catch { return 0; }
  }, [address]);

  const incrementLocalPaid = useCallback((streamId: bigint) => {
    try {
      const key = `obscura_paid_${streamId.toString()}`;
      const cur = parseInt(getString(key, address) ?? "0", 10);
      setString(key, address, String(cur + 1));
    } catch { /* noop */ }
  }, [address]);

  const getLastLocalTick = useCallback((streamId: bigint): number => {
    try {
      const key = `obscura_lastTick_${streamId.toString()}`;
      return parseInt(getString(key, address) ?? "0", 10);
    } catch { return 0; }
  }, [address]);

  const setLastLocalTick = useCallback((streamId: bigint) => {
    try {
      const key = `obscura_lastTick_${streamId.toString()}`;
      setString(key, address, String(Math.floor(Date.now() / 1000)));
    } catch { /* noop */ }
  }, [address]);

  // Auto-refresh "next due" countdown every 5s
  useState(() => {
    const iv = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 5000);
    return () => clearInterval(iv);
  });

  const tickOne = async (stream: StreamSummary) => {
    if (!publicClient || !OBSCURA_STEALTH_REGISTRY_ADDRESS) {
      toast.error("Not connected");
      return;
    }

    // Parse amount using parseUnits for correct decimal handling
    let amt: bigint;
    try {
      amt = parseUnits(tickAmount, 6);
    } catch {
      toast.error("Invalid amount — enter a number like 2.5");
      return;
    }
    if (amt <= 0n) {
      toast.error("Enter a per-cycle amount in cUSDC (e.g. 2.5)");
      return;
    }

    try {
      if (payMode === "direct") {
        // ── Direct mode: send cUSDC straight to recipientHint ──────────────
        // Encrypted on-chain (cUSDC is FHE) but goes to the actual wallet address
        // so the recipient can see and use it immediately.
        const hash = await directTransfer(stream.recipientHint, amt);
        await publicClient.waitForTransactionReceipt({ hash: hash as `0x${string}` });
        incrementLocalPaid(stream.id);
        setLastLocalTick(stream.id);
        setLastPayment({
          streamId: stream.id.toString(),
          txHash: hash as string,
          amount: tickAmount,
        });
        toast.success(`✅ ${tickAmount} cUSDC sent directly to ${stream.recipientHint.slice(0, 8)}…`);
        refresh();
      } else {
        // ── Stealth mode: derive one-time stealth address, announce ─────────
        // Maximum privacy — recipient must scan Stealth Inbox to claim.
        const meta = (await publicClient.readContract({
          address: OBSCURA_STEALTH_REGISTRY_ADDRESS,
          abi: OBSCURA_STEALTH_REGISTRY_ABI,
          functionName: "getMetaAddress",
          args: [stream.recipientHint],
        })) as readonly [`0x${string}`, `0x${string}`, bigint];

        const [s, v, ts] = meta;
        if (ts === 0n) {
          toast.error(
            `Recipient hasn't registered a stealth meta-address yet. Use Direct mode, or ask them to register in the Stealth tab.`
          );
          return;
        }

        const recipientMeta: MetaAddress = { spendingPubKey: s, viewingPubKey: v };
        const result = await tick({ streamId: stream.id, amount: amt, recipientMeta });
        incrementLocalPaid(stream.id);
        setLastLocalTick(stream.id);
        setLastPayment({
          streamId: stream.id.toString(),
          txHash: result.txHash,
          announceTx: result.announceTx,
          amount: tickAmount,
          stealthAddress: result.stealth?.stealthAddress,
        });
        toast.success(
          `✅ ${tickAmount} cUSDC → stealth address. Recipient must scan Stealth Inbox to claim.`
        );
        refresh();
      }
    } catch (e) {
      const msg = (e as Error).message ?? "tick failed";
      console.error("[tickOne] full error:", e);
      toast.error(msg.length > 200 ? msg.slice(0, 200) + "…" : msg);
    }
  };

  if (!address) return null;

  return (
    <div className="pay-card p-5 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
          mode === "employer"
            ? "bg-gradient-to-br from-emerald-500/20 to-emerald-700/10 border border-emerald-500/25"
            : "bg-gradient-to-br from-emerald-500/20 to-emerald-700/10 border border-emerald-500/25"
        }`}>
          {mode === "employer" ? <Play className="w-4 h-4 text-emerald-400" /> : <Clock className="w-4 h-4 text-cyan-400" />}
        </div>
        <div className="min-w-0">
          <h3 className="font-display text-sm font-semibold text-foreground leading-tight">
            {mode === "employer" ? "Streams You're Paying" : "Streams Paying You"}
          </h3>
          <p className="text-[10px] text-muted-foreground/45 tracking-widest mt-0.5 uppercase">cUSDC · FHE Encrypted</p>
        </div>
        <button onClick={() => refresh()}
          className="ml-auto text-[10px] tracking-[0.15em] uppercase text-muted-foreground/40 hover:text-emerald-400 transition-colors shrink-0">
          Refresh
        </button>
      </div>

      {mode === "employer" && (
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground/50 font-semibold">
              Amount Per Cycle (cUSDC)
            </label>
            <input type="number" value={tickAmount} onChange={(e) => setTickAmount(e.target.value)}
              placeholder="e.g. 2.5" className="pay-input font-mono" />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground/50 font-semibold">
              Payment Mode
            </label>
            <div className="flex gap-1.5">
              {(["direct", "stealth"] as const).map((m) => (
                <button key={m} onClick={() => setPayMode(m)}
                  className={`flex-1 py-2 text-[11px] tracking-[0.12em] uppercase font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all border ${
                    payMode === m
                      ? m === "direct"
                        ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/35 shadow-[0_0_8px_rgba(52,211,153,0.15)]"
                        : "bg-violet-500/15 text-violet-300 border-violet-500/35 shadow-[0_0_8px_rgba(139,92,246,0.15)]"
                      : "bg-white/[0.03] text-muted-foreground/50 border-white/[0.07] hover:text-muted-foreground hover:border-white/[0.12]"
                  }`}>
                  {m === "direct" ? <Zap className="w-3 h-3" /> : <Shield className="w-3 h-3" />}
                  {m}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground/40 leading-relaxed">
              {payMode === "direct"
                ? "cUSDC lands directly in the recipient's wallet — they see it immediately."
                : "cUSDC goes to a derived one-time address. Recipient must scan Stealth Inbox to claim."}
            </p>
          </div>
        </div>
      )}

      {lastPayment && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="p-3.5 bg-emerald-500/8 border border-emerald-500/25 rounded-xl flex items-start gap-2.5">
          <Check className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
          <div className="min-w-0 space-y-1">
            <div className="text-[12px] text-emerald-300 font-medium">
              {lastPayment.amount} cUSDC sent → Stream #{lastPayment.streamId}
            </div>
            <div className="font-mono text-[11px] text-emerald-400/50">
              tx: {lastPayment.txHash.slice(0, 14)}…{lastPayment.txHash.slice(-8)}
            </div>
            {lastPayment.stealthAddress && (
              <div className="text-[11px] text-violet-300/70 space-y-0.5">
                <div>Stealth: {lastPayment.stealthAddress.slice(0, 14)}…{lastPayment.stealthAddress.slice(-6)}</div>
                {lastPayment.announceTx
                  ? <div className="text-emerald-400/70 flex items-center gap-1"><Check className="w-2.5 h-2.5" /> Announced — recipient can scan Stealth Inbox</div>
                  : <div className="text-amber-400/70">Announcement pending — recipient must wait then rescan</div>}
              </div>
            )}
            {!lastPayment.stealthAddress && (
              <div className="text-[11px] text-emerald-400/50">Direct — encrypted on-chain, visible after REVEAL</div>
            )}
          </div>
          <button onClick={() => setLastPayment(null)}
            className="text-[11px] text-muted-foreground/30 hover:text-muted-foreground ml-auto shrink-0">✕</button>
        </motion.div>
      )}

      {isLoading && (
        <div className="text-[12px] text-muted-foreground/50 text-center py-4">Loading streams…</div>
      )}
      {!isLoading && streams.length === 0 && (
        <div className="text-[12px] text-muted-foreground/40 text-center py-6">No streams yet.</div>
      )}

      <div className="space-y-2.5">
        {streams.map((s) => {
          const localPaid = getLocalPaid(s.id);
          const totalPaid = Number(s.cyclesPaid) + localPaid;
          const localLastTick = getLastLocalTick(s.id);
          const effectiveLastTick = Math.max(Number(s.lastTickTime), localLastTick);
          const nextDue = effectiveLastTick + Number(s.periodSeconds);
          const effectivePending = Math.max(0, Math.floor((now - effectiveLastTick) / Number(s.periodSeconds)));
          return (
            <div key={s.id.toString()} className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-4 space-y-3">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <div className="font-display text-sm font-semibold text-foreground">Stream #{s.id.toString()}</div>
                  <div className="text-[11px] text-muted-foreground/50">
                    every {Number(s.periodSeconds) >= 86400
                      ? `${Math.round(Number(s.periodSeconds) / 86400)}d`
                      : Number(s.periodSeconds) >= 3600
                        ? `${Math.round(Number(s.periodSeconds) / 3600)}h`
                        : `${Number(s.periodSeconds)}s`} ·{" "}
                    <span className={totalPaid > 0 ? "text-emerald-400" : ""}>{totalPaid} paid</span>
                  </div>
                </div>
                {effectivePending > 0 ? (
                  <span className="pay-badge pay-badge-emerald">{effectivePending} pending</span>
                ) : (
                  <span className="pay-badge">{effectivePending} pending</span>
                )}
              </div>

              <div className="text-[11px] text-muted-foreground/40 font-mono truncate flex items-center gap-2">
                <span className="truncate">→ {s.recipientHint}</span>
                {mode === "employer" && <RecipientStatus address={s.recipientHint} />}
              </div>

              {mode === "employer" && effectivePending > 0 && (
                <motion.button whileTap={{ scale: 0.98 }} disabled={isTicking} onClick={() => tickOne(s)}
                  className="btn-pay btn-pay-emerald w-full py-2">
                  {payMode === "stealth" ? <Shield className="w-3 h-3" /> : <Zap className="w-3 h-3" />}
                  {isTicking ? "Sending…" : `Pay Cycle (${payMode})`}
                </motion.button>
              )}
              {mode === "employer" && effectivePending === 0 && !s.paused && (
                <CountdownTimer nextDue={nextDue} now={now} onRefresh={refresh} />
              )}
              {mode === "employer" && !s.paused && (
                <div className="flex gap-1.5 pt-0.5">
                  <button disabled={streamAction === s.id.toString()}
                    onClick={async () => {
                      if (!publicClient || !OBSCURA_PAY_STREAM_V2_ADDRESS) return;
                      setStreamAction(s.id.toString());
                      try {
                        const feeData = await publicClient.estimateFeesPerGas();
                        const maxFeePerGas = feeData.maxFeePerGas ? (feeData.maxFeePerGas * 130n) / 100n : undefined;
                        const hash = await writeContractAsync({ address: OBSCURA_PAY_STREAM_V2_ADDRESS, abi: OBSCURA_PAY_STREAM_V2_ABI, functionName: "setPaused", args: [s.id, true], account: address, chain: arbitrumSepolia, maxFeePerGas, gas: 200_000n });
                        await publicClient.waitForTransactionReceipt({ hash });
                        toast.success(`Stream #${s.id.toString()} paused`);
                        refresh();
                      } catch (e) { toast.error((e as Error).message || "Pause failed"); } finally { setStreamAction(null); }
                    }}
                    className="btn-pay btn-pay-ghost flex-1 py-1.5 text-amber-400 hover:text-amber-300 border-amber-500/25 disabled:opacity-50">
                    <Pause className="w-3 h-3" /> {streamAction === s.id.toString() ? "Pausing…" : "Pause"}
                  </button>
                  <button disabled={streamAction === s.id.toString()}
                    onClick={async () => {
                      if (!publicClient || !OBSCURA_PAY_STREAM_V2_ADDRESS) return;
                      setStreamAction(s.id.toString());
                      try {
                        const feeData = await publicClient.estimateFeesPerGas();
                        const maxFeePerGas = feeData.maxFeePerGas ? (feeData.maxFeePerGas * 130n) / 100n : undefined;
                        const hash = await writeContractAsync({ address: OBSCURA_PAY_STREAM_V2_ADDRESS, abi: OBSCURA_PAY_STREAM_V2_ABI, functionName: "cancelStream", args: [s.id], account: address, chain: arbitrumSepolia, maxFeePerGas, gas: 200_000n });
                        await publicClient.waitForTransactionReceipt({ hash });
                        toast.success(`Stream #${s.id.toString()} cancelled permanently`);
                        refresh();
                      } catch (e) { toast.error((e as Error).message || "Cancel failed"); } finally { setStreamAction(null); }
                    }}
                    className="btn-pay btn-pay-ghost flex-1 py-1.5 text-red-400 hover:text-red-300 border-red-500/25 disabled:opacity-50">
                    <Ban className="w-3 h-3" /> Cancel
                  </button>
                </div>
              )}
              {s.paused && (
                <div className="flex gap-2 items-center">
                  <span className="text-[11px] text-amber-400/60 flex-1">Stream paused / cancelled</span>
                  <button disabled={streamAction === s.id.toString()}
                    onClick={async () => {
                      if (!publicClient || !OBSCURA_PAY_STREAM_V2_ADDRESS) return;
                      setStreamAction(s.id.toString());
                      try {
                        const feeData = await publicClient.estimateFeesPerGas();
                        const maxFeePerGas = feeData.maxFeePerGas ? (feeData.maxFeePerGas * 130n) / 100n : undefined;
                        const hash = await writeContractAsync({ address: OBSCURA_PAY_STREAM_V2_ADDRESS, abi: OBSCURA_PAY_STREAM_V2_ABI, functionName: "setPaused", args: [s.id, false], account: address, chain: arbitrumSepolia, maxFeePerGas, gas: 200_000n });
                        await publicClient.waitForTransactionReceipt({ hash });
                        toast.success(`Stream #${s.id.toString()} resumed`);
                        refresh();
                      } catch (e) { toast.error((e as Error).message || "Resume failed"); } finally { setStreamAction(null); }
                    }}
                    className="btn-pay btn-pay-ghost py-1.5 px-3 text-emerald-400 hover:text-emerald-300 border-emerald-500/25 disabled:opacity-50">
                    <PlayCircle className="w-3 h-3" /> {streamAction === s.id.toString() ? "Resuming…" : "Resume"}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
