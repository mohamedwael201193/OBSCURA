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
  OBSCURA_PAY_STREAM_ABI,
  OBSCURA_PAY_STREAM_ADDRESS,
} from "@/config/wave2";
import type { MetaAddress } from "@/lib/stealth";

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
    <div className="space-y-2">
      <button
        disabled
        className="w-full py-2 text-sm tracking-[0.2em] uppercase bg-secondary/20 text-muted-foreground border border-border/30 rounded-md flex items-center justify-center gap-2 opacity-60"
      >
        <Timer className="w-3 h-3" /> Next cycle due in {display}
      </button>
      {secsLeft <= 0 && (
        <button
          onClick={() => onRefresh()}
          className="w-full py-1.5 text-xs tracking-[0.15em] uppercase text-primary hover:text-primary/80"
        >
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
  const [lastPayment, setLastPayment] = useState<{ streamId: string; txHash: string; amount: string; stealthAddress?: string } | null>(null);
  const [streamAction, setStreamAction] = useState<string | null>(null);

  // Track paid cycles in localStorage (on-chain counter won't update since we bypass PayStream)
  const getLocalPaid = useCallback((streamId: bigint): number => {
    try {
      const key = `obscura_paid_${streamId.toString()}`;
      return parseInt(localStorage.getItem(key) ?? "0", 10);
    } catch { return 0; }
  }, []);

  const incrementLocalPaid = useCallback((streamId: bigint) => {
    try {
      const key = `obscura_paid_${streamId.toString()}`;
      const cur = parseInt(localStorage.getItem(key) ?? "0", 10);
      localStorage.setItem(key, String(cur + 1));
    } catch { /* noop */ }
  }, []);

  const getLastLocalTick = useCallback((streamId: bigint): number => {
    try {
      const key = `obscura_lastTick_${streamId.toString()}`;
      return parseInt(localStorage.getItem(key) ?? "0", 10);
    } catch { return 0; }
  }, []);

  const setLastLocalTick = useCallback((streamId: bigint) => {
    try {
      const key = `obscura_lastTick_${streamId.toString()}`;
      localStorage.setItem(key, String(Math.floor(Date.now() / 1000)));
    } catch { /* noop */ }
  }, []);

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
    <div className="glass-panel rounded-md p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-sm tracking-wider text-foreground">
          {mode === "employer" ? "Streams You're Paying" : "Streams Paying You"}
        </h3>
        <button
          onClick={() => refresh()}
          className="text-xs text-muted-foreground hover:text-primary"
        >
          Refresh
        </button>
      </div>

      {mode === "employer" && (
        <div className="space-y-3">
          {/* Amount input */}
          <div>
            <label className="text-xs text-muted-foreground tracking-[0.15em] uppercase block mb-1.5">
              Amount Per Cycle (cUSDC)
            </label>
            <input
              type="number"
              value={tickAmount}
              onChange={(e) => setTickAmount(e.target.value)}
            placeholder="e.g. 2.5"
            className="w-full px-3 py-2 bg-background border border-border/50 rounded-md text-xs font-mono"
          />
          </div>

          {/* Payment mode toggle */}
          <div>
            <label className="text-xs text-muted-foreground tracking-[0.15em] uppercase block mb-1.5">
              Payment Mode
            </label>
            <div className="flex rounded-md border border-border/50 overflow-hidden text-xs">
              <button
                onClick={() => setPayMode("direct")}
                className={`flex-1 py-2 flex items-center justify-center gap-1.5 transition-colors ${
                  payMode === "direct"
                    ? "bg-primary/20 text-primary border-r border-border/50"
                    : "text-muted-foreground hover:text-foreground border-r border-border/50"
                }`}
              >
                <Zap className="w-3 h-3" /> Direct
                {payMode === "direct" && <span className="text-[10px] opacity-70">(recommended)</span>}
              </button>
              <button
                onClick={() => setPayMode("stealth")}
                className={`flex-1 py-2 flex items-center justify-center gap-1.5 transition-colors ${
                  payMode === "stealth"
                    ? "bg-emerald-500/10 text-emerald-400"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Shield className="w-3 h-3" /> Stealth
                {payMode === "stealth" && <span className="text-[10px] opacity-70">(advanced)</span>}
              </button>
            </div>
            <p className="text-[11px] text-muted-foreground/60 mt-1">
              {payMode === "direct"
                ? "cUSDC lands directly in the recipient's wallet — they see it immediately."
                : "cUSDC goes to a derived one-time address. Recipient must scan Stealth Inbox to claim."}
            </p>
          </div>
        </div>
      )}
      {lastPayment && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3 bg-green-500/10 border border-green-500/30 rounded-md flex items-start gap-2"
        >
          <Check className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
          <div className="min-w-0">
            <div className="text-sm text-green-400">
              Payment sent! {lastPayment.amount} cUSDC → Stream #{lastPayment.streamId}
            </div>
            <div className="font-mono text-[11px] text-green-400/60 mt-0.5">
              tx: {lastPayment.txHash.slice(0, 14)}…{lastPayment.txHash.slice(-8)}
            </div>
            {lastPayment.stealthAddress && (
              <div className="text-[11px] text-amber-400/80 mt-1">
                ⚠ Stealth address: {lastPayment.stealthAddress.slice(0, 14)}…{lastPayment.stealthAddress.slice(-6)} — recipient must scan Stealth Inbox to claim.
              </div>
            )}
            {!lastPayment.stealthAddress && (
              <div className="text-[11px] text-green-400/70 mt-1">
                Direct transfer — cUSDC is now in recipient's wallet (encrypted on-chain, visible after REVEAL).
              </div>
            )}
          </div>
          <button
            onClick={() => setLastPayment(null)}
            className="text-[11px] text-green-400/50 hover:text-green-400 ml-auto flex-shrink-0"
          >✕</button>
        </motion.div>
      )}

      {isLoading && <div className="text-sm text-muted-foreground">Loading…</div>}
      {!isLoading && streams.length === 0 && (
        <div className="text-sm text-muted-foreground/60">No streams yet.</div>
      )}

      <div className="space-y-2">
        {streams.map((s) => {
          const localPaid = getLocalPaid(s.id);
          const totalPaid = Number(s.cyclesPaid) + localPaid;
          const localLastTick = getLastLocalTick(s.id);
          // Effective lastTickTime: use whichever is more recent
          const effectiveLastTick = Math.max(Number(s.lastTickTime), localLastTick);
          const nextDue = effectiveLastTick + Number(s.periodSeconds);
          const effectivePending = Math.max(0, Math.floor((now - effectiveLastTick) / Number(s.periodSeconds)));
          return (
          <div key={s.id.toString()} className="p-3 bg-secondary/20 border border-border/30 rounded-md">
            <div className="flex justify-between items-start mb-2">
              <div>
                <div className="text-sm text-foreground">Stream #{s.id.toString()}</div>
                <div className="text-xs text-muted-foreground/70">
                  every {Number(s.periodSeconds) >= 86400
                    ? `${Math.round(Number(s.periodSeconds) / 86400)}d`
                    : Number(s.periodSeconds) >= 3600
                      ? `${Math.round(Number(s.periodSeconds) / 3600)}h`
                      : `${Number(s.periodSeconds)}s`} · {totalPaid > 0 ? (
                    <span className="text-green-400">{totalPaid} paid</span>
                  ) : (
                    <span>{totalPaid} paid</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1 text-xs text-primary">
                <Clock className="w-3 h-3" />
                {effectivePending} pending
              </div>
            </div>
            <div className="text-[11px] text-muted-foreground/50 truncate mb-2 flex items-center gap-2">
              <span className="font-mono truncate">recipient: {s.recipientHint}</span>
              {mode === "employer" && <RecipientStatus address={s.recipientHint} />}
            </div>
            {mode === "employer" && effectivePending > 0 && (
              <motion.button
                whileTap={{ scale: 0.98 }}
                disabled={isTicking}
                onClick={() => tickOne(s)}
                className="w-full py-2 text-sm tracking-[0.2em] uppercase bg-primary/10 text-primary border border-primary/30 rounded-md hover:bg-primary/20 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {payMode === "stealth" ? <Shield className="w-3 h-3" /> : <Zap className="w-3 h-3" />}
                {isTicking ? "Sending…" : `Send Next Cycle (${payMode})`}
              </motion.button>
            )}
            {mode === "employer" && effectivePending === 0 && !s.paused && (
              <CountdownTimer nextDue={nextDue} now={now} onRefresh={refresh} />
            )}
            {mode === "employer" && !s.paused && (
              <div className="mt-1 flex gap-1">
                <button
                  disabled={streamAction === s.id.toString()}
                  onClick={async () => {
                    if (!publicClient || !OBSCURA_PAY_STREAM_ADDRESS) return;
                    setStreamAction(s.id.toString());
                    try {
                      const feeData = await publicClient.estimateFeesPerGas();
                      const maxFeePerGas = feeData.maxFeePerGas
                        ? (feeData.maxFeePerGas * 130n) / 100n
                        : undefined;
                      const hash = await writeContractAsync({
                        address: OBSCURA_PAY_STREAM_ADDRESS,
                        abi: OBSCURA_PAY_STREAM_ABI,
                        functionName: "setPaused",
                        args: [s.id, true],
                        account: address,
                        chain: arbitrumSepolia,
                        maxFeePerGas,
                        gas: 200_000n,
                      });
                      await publicClient.waitForTransactionReceipt({ hash });
                      toast.success(`Stream #${s.id.toString()} paused`);
                      refresh();
                    } catch (e) {
                      toast.error((e as Error).message || "Pause failed");
                    } finally {
                      setStreamAction(null);
                    }
                  }}
                  className="flex-1 py-1.5 text-xs tracking-[0.15em] uppercase text-amber-400/70 hover:text-amber-400 border border-amber-500/20 rounded-md flex items-center justify-center gap-1 disabled:opacity-50"
                >
                  <Pause className="w-3 h-3" /> {streamAction === s.id.toString() ? "Pausing…" : "Pause"}
                </button>
                <button
                  disabled={streamAction === s.id.toString()}
                  onClick={async () => {
                    if (!publicClient || !OBSCURA_PAY_STREAM_ADDRESS) return;
                    setStreamAction(s.id.toString());
                    try {
                      const feeData = await publicClient.estimateFeesPerGas();
                      const maxFeePerGas = feeData.maxFeePerGas
                        ? (feeData.maxFeePerGas * 130n) / 100n
                        : undefined;
                      const hash = await writeContractAsync({
                        address: OBSCURA_PAY_STREAM_ADDRESS,
                        abi: OBSCURA_PAY_STREAM_ABI,
                        functionName: "cancelStream",
                        args: [s.id],
                        account: address,
                        chain: arbitrumSepolia,
                        maxFeePerGas,
                        gas: 200_000n,
                      });
                      await publicClient.waitForTransactionReceipt({ hash });
                      toast.success(`Stream #${s.id.toString()} cancelled permanently`);
                      refresh();
                    } catch (e) {
                      toast.error((e as Error).message || "Cancel failed");
                    } finally {
                      setStreamAction(null);
                    }
                  }}
                  className="flex-1 py-1.5 text-xs tracking-[0.15em] uppercase text-red-400/70 hover:text-red-400 border border-red-500/20 rounded-md flex items-center justify-center gap-1 disabled:opacity-50"
                >
                  <Ban className="w-3 h-3" /> Cancel
                </button>
              </div>
            )}
            {s.paused && (
              <div className="mt-1 flex gap-1 items-center">
                <div className="flex-1 text-xs text-amber-400/80 text-center">Stream paused / cancelled</div>
                <button
                  disabled={streamAction === s.id.toString()}
                  onClick={async () => {
                    if (!publicClient || !OBSCURA_PAY_STREAM_ADDRESS) return;
                    setStreamAction(s.id.toString());
                    try {
                      const feeData = await publicClient.estimateFeesPerGas();
                      const maxFeePerGas = feeData.maxFeePerGas
                        ? (feeData.maxFeePerGas * 130n) / 100n
                        : undefined;
                      const hash = await writeContractAsync({
                        address: OBSCURA_PAY_STREAM_ADDRESS,
                        abi: OBSCURA_PAY_STREAM_ABI,
                        functionName: "setPaused",
                        args: [s.id, false],
                        account: address,
                        chain: arbitrumSepolia,
                        maxFeePerGas,
                        gas: 200_000n,
                      });
                      await publicClient.waitForTransactionReceipt({ hash });
                      toast.success(`Stream #${s.id.toString()} resumed`);
                      refresh();
                    } catch (e) {
                      toast.error((e as Error).message || "Resume failed");
                    } finally {
                      setStreamAction(null);
                    }
                  }}
                  className="py-1.5 px-3 text-xs tracking-[0.15em] uppercase text-green-400/70 hover:text-green-400 border border-green-500/20 rounded-md flex items-center justify-center gap-1 disabled:opacity-50"
                >
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
