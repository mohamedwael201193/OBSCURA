import { useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle } from "lucide-react";
import { useInsurePayroll } from "@/hooks/useInsurePayroll";
import { toast } from "sonner";

export default function DisputeForm() {
  const [coverageId, setCoverageId] = useState("");
  const [missedCycle, setMissedCycle] = useState("");
  const { dispute, isPending } = useInsurePayroll();

  const submit = async () => {
    const cId = BigInt(coverageId || "0");
    const mc = BigInt(missedCycle || "0");
    if (cId === 0n || mc === 0n) {
      toast.error("Need both coverageId and missed cycle index");
      return;
    }
    try {
      await dispute(cId, mc);
      toast.success("Dispute filed");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <div className="glass-panel rounded-sm p-6 space-y-4">
      <div className="flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-amber-500" />
        <h3 className="font-display text-sm tracking-wider text-foreground">File a Dispute</h3>
        <span className="ml-auto text-[8px] font-mono text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-sm border border-amber-500/20">
          CLAIM PAYOUT
        </span>
      </div>

      <p className="text-[10px] font-mono text-muted-foreground/70">
        Missed a payroll cycle? Enter your coverage ID and the cycle number that was skipped.
        The smart contract judges the dispute using encrypted data and pays you automatically if valid — no human review needed.
      </p>

      <div className="space-y-3">
        <div>
          <label className="text-[9px] font-mono text-muted-foreground tracking-[0.15em] uppercase block mb-1.5">
            Coverage ID
          </label>
          <input
            type="number"
            value={coverageId}
            onChange={(e) => setCoverageId(e.target.value)}
            className="w-full px-3 py-2 bg-background border border-border/50 rounded-sm text-xs font-mono"
          />
        </div>
        <div>
          <label className="text-[9px] font-mono text-muted-foreground tracking-[0.15em] uppercase block mb-1.5">
            Missed Cycle Index
          </label>
          <input
            type="number"
            value={missedCycle}
            onChange={(e) => setMissedCycle(e.target.value)}
            className="w-full px-3 py-2 bg-background border border-border/50 rounded-sm text-xs font-mono"
          />
        </div>
      </div>

      <motion.button
        onClick={submit}
        disabled={isPending}
        whileTap={{ scale: 0.99 }}
        className="w-full py-3 text-xs tracking-[0.2em] uppercase font-mono bg-primary text-primary-foreground rounded-sm hover:bg-primary/90 disabled:opacity-50"
      >
        {isPending ? "Submitting…" : "Submit Dispute"}
      </motion.button>
    </div>
  );
}
