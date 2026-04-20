import { useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle } from "lucide-react";
import { useInsurePayroll } from "@/hooks/useInsurePayroll";
import { toast } from "sonner";

export default function DisputeForm() {
  const [coverageId, setCoverageId] = useState("");
  const [missedCycle, setMissedCycle] = useState("");
  const { dispute, isPending, error, policies } = useInsurePayroll();

  const submit = async () => {
    let cId: bigint, mc: bigint;
    try {
      cId = BigInt(coverageId || "0");
    } catch {
      toast.error("Coverage ID must be a number");
      return;
    }
    try {
      mc = BigInt(missedCycle || "0");
    } catch {
      toast.error("Missed cycle must be a number");
      return;
    }
    if (cId === 0n) {
      toast.error("Enter your coverage ID (shown after buying coverage)");
      return;
    }
    if (mc === 0n) {
      toast.error("Enter the missed cycle index (starting from 1)");
      return;
    }
    try {
      await dispute(cId, mc);
      toast.success(
        "Dispute filed — if valid, payout is sent automatically"
      );
    } catch (e) {
      toast.error((e as Error).message?.slice(0, 200));
    }
  };

  return (
    <div className="glass-panel rounded-md p-6 space-y-4">
      <div className="flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-amber-500" />
        <h3 className="font-display text-sm tracking-wider text-foreground">
          File a Dispute
        </h3>
        <span className="ml-auto text-[11px] text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
          CLAIM PAYOUT
        </span>
      </div>

      <p className="text-sm text-muted-foreground/70">
        Missed a payroll cycle? Enter your coverage ID and the cycle number
        that was skipped. The smart contract judges the dispute using encrypted
        data and pays you automatically if valid — no human review needed.
      </p>

      {/* Quick-fill from saved policies */}
      {policies.length > 0 && !coverageId && (
        <div className="bg-cyan-500/5 border border-cyan-500/20 rounded-md p-2 space-y-1">
          <span className="text-xs text-cyan-400/80 tracking-wider uppercase">
            Your saved policies — click to fill
          </span>
          <div className="flex flex-wrap gap-1">
            {policies.map((p, i) => (
              <button
                key={i}
                onClick={() => setCoverageId(p.coverageId)}
                className="text-xs text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-md border border-cyan-500/20 hover:bg-cyan-500/20"
              >
                ID {p.coverageId} · Stream {p.streamId} · {p.coverageAmount}{" "}
                cUSDC
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-3">
        <div>
          <label className="text-xs text-muted-foreground tracking-[0.15em] uppercase block mb-1.5">
            Coverage ID{" "}
            <span className="text-muted-foreground/40 normal-case">
              (shown after buying coverage)
            </span>
          </label>
          <input
            type="number"
            value={coverageId}
            onChange={(e) => setCoverageId(e.target.value)}
            placeholder="e.g. 1"
            className="w-full px-3 py-2 bg-background border border-border/50 rounded-md text-xs font-mono"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground tracking-[0.15em] uppercase block mb-1.5">
            Missed Cycle Index{" "}
            <span className="text-muted-foreground/40 normal-case">
              (which payment was skipped, starting from 1)
            </span>
          </label>
          <input
            type="number"
            value={missedCycle}
            onChange={(e) => setMissedCycle(e.target.value)}
            placeholder="e.g. 3"
            className="w-full px-3 py-2 bg-background border border-border/50 rounded-md text-xs font-mono"
          />
        </div>
      </div>

      {error && (
        <div className="text-sm text-red-400 p-2 bg-red-500/10 border border-red-500/20 rounded-md">
          {error.slice(0, 200)}
        </div>
      )}

      <motion.button
        onClick={submit}
        disabled={isPending}
        whileTap={{ scale: 0.99 }}
        className="w-full py-3 text-xs tracking-[0.2em] uppercase bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
      >
        {isPending ? "Submitting…" : "Submit Dispute"}
      </motion.button>
    </div>
  );
}
