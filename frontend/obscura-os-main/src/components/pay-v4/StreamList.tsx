import { useAccount, usePublicClient } from "wagmi";
import { motion } from "framer-motion";
import { useStreamList, type StreamSummary } from "@/hooks/useStreamList";
import { useTickStream } from "@/hooks/useTickStream";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Play, Clock, Ban, Timer, CheckCircle2, XCircle } from "lucide-react";
import {
  OBSCURA_STEALTH_REGISTRY_ABI,
  OBSCURA_STEALTH_REGISTRY_ADDRESS,
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
    <span className="inline-flex items-center gap-1 text-[8px] font-mono text-green-400"><CheckCircle2 className="w-2.5 h-2.5" /> stealth ready</span>
  ) : (
    <span className="inline-flex items-center gap-1 text-[8px] font-mono text-red-400"><XCircle className="w-2.5 h-2.5" /> no stealth</span>
  );
}

export default function StreamList({ mode }: { mode: "employer" | "recipient" }) {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const filter = mode === "employer" ? { employer: address } : { recipient: address };
  const { streams, isLoading, refresh } = useStreamList(filter);
  const { tick, isTicking } = useTickStream();
  const [tickAmount, setTickAmount] = useState("");
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));

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
    const amt = BigInt(Math.floor(Number(tickAmount) * 1_000_000));
    if (amt <= 0n) {
      toast.error("Enter a per-cycle amount in cUSDC");
      return;
    }

    // Fetch the RECIPIENT's meta-address from the registry
    try {
      const meta = (await publicClient.readContract({
        address: OBSCURA_STEALTH_REGISTRY_ADDRESS,
        abi: OBSCURA_STEALTH_REGISTRY_ABI,
        functionName: "getMetaAddress",
        args: [stream.recipientHint],
      })) as readonly [`0x${string}`, `0x${string}`, bigint];

      const [s, v, ts] = meta;
      if (ts === 0n) {
        toast.error(
          `Recipient ${stream.recipientHint.slice(0, 8)}… hasn't registered a stealth meta-address yet. They need to go to the Stealth tab first.`
        );
        return;
      }

      const recipientMeta: MetaAddress = { spendingPubKey: s, viewingPubKey: v };
      await tick({ streamId: stream.id, amount: amt, recipientMeta });
      toast.success(`Cycle settled for stream #${stream.id.toString()}`);
      refresh();
    } catch (e) {
      const msg = (e as Error).message ?? "tick failed";
      // Truncate for toast but log full error to console for debugging.
      console.error("[tickOne] full error:", e);
      toast.error(msg.length > 200 ? msg.slice(0, 200) + "…" : msg);
    }
  };

  if (!address) return null;

  return (
    <div className="glass-panel rounded-sm p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-sm tracking-wider text-foreground">
          {mode === "employer" ? "Streams You're Paying" : "Streams Paying You"}
        </h3>
        <button
          onClick={() => refresh()}
          className="text-[9px] font-mono text-muted-foreground hover:text-primary"
        >
          Refresh
        </button>
      </div>

      {mode === "employer" && (
        <div>
          <label className="text-[9px] font-mono text-muted-foreground tracking-[0.15em] uppercase block mb-1.5">
            Amount Per Cycle (cUSDC)
          </label>
          <input
            type="number"
            value={tickAmount}
            onChange={(e) => setTickAmount(e.target.value)}
            placeholder="e.g. 2500"
            className="w-full px-3 py-2 bg-background border border-border/50 rounded-sm text-xs font-mono"
          />
        </div>
      )}

      {isLoading && <div className="text-[10px] font-mono text-muted-foreground">Loading…</div>}
      {!isLoading && streams.length === 0 && (
        <div className="text-[10px] font-mono text-muted-foreground/60">No streams yet.</div>
      )}

      <div className="space-y-2">
        {streams.map((s) => (
          <div key={s.id.toString()} className="p-3 bg-secondary/20 border border-border/30 rounded-sm">
            <div className="flex justify-between items-start mb-2">
              <div>
                <div className="text-[10px] font-mono text-foreground">Stream #{s.id.toString()}</div>
                <div className="text-[9px] font-mono text-muted-foreground/70">
                  every {Number(s.periodSeconds) >= 86400
                    ? `${Math.round(Number(s.periodSeconds) / 86400)}d`
                    : Number(s.periodSeconds) >= 3600
                      ? `${Math.round(Number(s.periodSeconds) / 3600)}h`
                      : `${Number(s.periodSeconds)}s`} · {s.cyclesPaid.toString()} paid
                </div>
              </div>
              <div className="flex items-center gap-1 text-[9px] font-mono text-primary">
                <Clock className="w-3 h-3" />
                {s.pendingCycles.toString()} pending
              </div>
            </div>
            <div className="text-[8px] font-mono text-muted-foreground/50 truncate mb-2 flex items-center gap-2">
              <span className="truncate">recipient: {s.recipientHint}</span>
              {mode === "employer" && <RecipientStatus address={s.recipientHint} />}
            </div>
            {mode === "employer" && s.pendingCycles > 0n && (
              <motion.button
                whileTap={{ scale: 0.98 }}
                disabled={isTicking}
                onClick={() => tickOne(s)}
                className="w-full py-2 text-[10px] tracking-[0.2em] uppercase font-mono bg-primary/10 text-primary border border-primary/30 rounded-sm hover:bg-primary/20 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Play className="w-3 h-3" /> {isTicking ? "Sending…" : "Send Next Cycle"}
              </motion.button>
            )}
            {mode === "employer" && s.pendingCycles === 0n && !s.paused && (() => {
              const nextDue = Number(s.lastTickTime) + Number(s.periodSeconds);
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
                    className="w-full py-2 text-[10px] tracking-[0.2em] uppercase font-mono bg-secondary/20 text-muted-foreground border border-border/30 rounded-sm flex items-center justify-center gap-2 opacity-60"
                  >
                    <Timer className="w-3 h-3" /> Next cycle due in {display}
                  </button>
                  {secsLeft <= 0 && (
                    <button
                      onClick={() => refresh()}
                      className="w-full py-1.5 text-[9px] tracking-[0.15em] uppercase font-mono text-primary hover:text-primary/80"
                    >
                      Refresh to check
                    </button>
                  )}
                </div>
              );
            })()}
            {mode === "employer" && !s.paused && (
              <button
                onClick={async () => {
                  // cancel is just setting paused
                  toast.info("Pause/cancel not yet wired — coming soon");
                }}
                className="mt-1 w-full py-1.5 text-[9px] tracking-[0.15em] uppercase font-mono text-red-400/70 hover:text-red-400 flex items-center justify-center gap-1"
              >
                <Ban className="w-3 h-3" /> Cancel Stream
              </button>
            )}
            {s.paused && (
              <div className="mt-1 text-[9px] font-mono text-amber-400/80 text-center">Stream paused / cancelled</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
