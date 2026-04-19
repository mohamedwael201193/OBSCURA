import { useAccount } from "wagmi";
import { motion } from "framer-motion";
import { useStreamList } from "@/hooks/useStreamList";
import { useTickStream } from "@/hooks/useTickStream";
import { useStealthMetaAddress } from "@/hooks/useStealthMetaAddress";
import { useState } from "react";
import { toast } from "sonner";
import { Play, Clock } from "lucide-react";

export default function StreamList({ mode }: { mode: "employer" | "recipient" }) {
  const { address } = useAccount();
  const filter = mode === "employer" ? { employer: address } : { recipient: address };
  const { streams, isLoading, refresh } = useStreamList(filter);
  const { tick, isTicking } = useTickStream();
  const { onChainMeta } = useStealthMetaAddress();
  const [tickAmount, setTickAmount] = useState("");

  const tickOne = async (streamId: bigint) => {
    if (!onChainMeta) {
      toast.error("Recipient has no on-chain meta-address yet");
      return;
    }
    const amt = BigInt(Math.floor(Number(tickAmount) * 1_000_000));
    if (amt <= 0n) {
      toast.error("Enter a per-cycle amount in cUSDC");
      return;
    }
    try {
      await tick({ streamId, amount: amt, recipientMeta: onChainMeta });
      toast.success(`Cycle settled for stream #${streamId.toString()}`);
      refresh();
    } catch (e) {
      toast.error((e as Error).message);
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
                  every {Math.round(Number(s.periodSeconds) / 86_400)}d · {s.cyclesPaid.toString()} paid
                </div>
              </div>
              <div className="flex items-center gap-1 text-[9px] font-mono text-primary">
                <Clock className="w-3 h-3" />
                {s.pendingCycles.toString()} pending
              </div>
            </div>
            <div className="text-[8px] font-mono text-muted-foreground/50 truncate mb-2">
              recipient: {s.recipientHint}
            </div>
            {mode === "employer" && s.pendingCycles > 0n && (
              <motion.button
                whileTap={{ scale: 0.98 }}
                disabled={isTicking}
                onClick={() => tickOne(s.id)}
                className="w-full py-2 text-[10px] tracking-[0.2em] uppercase font-mono bg-primary/10 text-primary border border-primary/30 rounded-sm hover:bg-primary/20 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Play className="w-3 h-3" /> {isTicking ? "Sending…" : "Send Next Cycle"}
              </motion.button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
