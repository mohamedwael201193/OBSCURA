import { useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, Loader2 } from "lucide-react";
import { useInsurePayroll } from "@/hooks/useInsurePayroll";
import { toast } from "sonner";

export default function DisputeForm() {
  const [coverageId, setCoverageId] = useState("");
  const [missedCycle, setMissedCycle] = useState("");
  const { dispute, isPending, error, policies } = useInsurePayroll();

  const submit = async () => {
    let cId: bigint, mc: bigint;
    try { cId = BigInt(coverageId || "0"); } catch { toast.error("Coverage ID must be a number"); return; }
    try { mc = BigInt(missedCycle || "0"); } catch { toast.error("Missed cycle must be a number"); return; }
    if (cId === 0n) { toast.error("Enter your coverage ID (shown after buying coverage)"); return; }
    if (mc === 0n) { toast.error("Enter the missed cycle index (starting from 1)"); return; }
    try {
      await dispute(cId, mc);
      toast.success("Dispute filed — if valid, payout is sent automatically");
    } catch (e) {
      toast.error((e as Error).message?.slice(0, 200));
    }
  };

  return (
    <div className="pay-card pay-card-amber p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-700/10 border border-amber-500/25 flex items-center justify-center shrink-0">
          <AlertTriangle className="w-4 h-4 text-amber-400" />
        </div>
        <div className="min-w-0">
          <h3 className="font-display text-sm font-semibold text-foreground leading-tight">File a Dispute</h3>
          <p className="text-[10px] text-muted-foreground/45 tracking-widest mt-0.5 uppercase">Missed Cycle · Auto-Payout</p>
        </div>
        <span className="ml-auto shrink-0 pay-badge pay-badge-amber">CLAIM PAYOUT</span>
      </div>

      <p className="text-[12px] text-muted-foreground/55 leading-relaxed">
        Missed a payroll cycle? Enter your coverage ID and the cycle number that was skipped. The smart contract judges the dispute using encrypted data and pays you automatically if valid — no human review needed.
      </p>

      {/* Quick-fill from saved policies */}
      {policies.length > 0 && !coverageId && (
        <div className="rounded-lg bg-cyan-500/[0.05] border border-cyan-500/20 p-3 space-y-2">
          <span className="text-[10px] text-cyan-400/70 tracking-[0.15em] uppercase">Your saved policies — click to fill</span>
          <div className="flex flex-wrap gap-1.5">
            {policies.map((p, i) => (
              <button key={i} onClick={() => setCoverageId(p.coverageId)}
                className="text-[11px] text-cyan-300 bg-cyan-500/10 px-2.5 py-1 rounded-lg border border-cyan-500/20 hover:bg-cyan-500/20 transition-colors font-mono">
                ID {p.coverageId} · Stream {p.streamId} · {p.coverageAmount} cUSDC
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-3">
        <div className="space-y-2">
          <label className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground/50 font-semibold">
            Coverage ID <span className="normal-case tracking-normal text-muted-foreground/30">(shown after buying coverage)</span>
          </label>
          <input type="number" value={coverageId} onChange={(e) => setCoverageId(e.target.value)}
            placeholder="e.g. 1" className="pay-input font-mono" />
        </div>
        <div className="space-y-2">
          <label className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground/50 font-semibold">
            Missed Cycle Index <span className="normal-case tracking-normal text-muted-foreground/30">(which payment was skipped, starting from 1)</span>
          </label>
          <input type="number" value={missedCycle} onChange={(e) => setMissedCycle(e.target.value)}
            placeholder="e.g. 3" className="pay-input font-mono" />
        </div>
      </div>

      {error && (
        <div className="text-[12px] text-red-300 bg-red-500/8 p-3 rounded-lg border border-red-500/20 leading-relaxed">
          {error.slice(0, 200)}
        </div>
      )}

      <motion.button onClick={submit} disabled={isPending} whileTap={{ scale: 0.99 }}
        className="btn-pay btn-pay-amber w-full py-2.5">
        {isPending ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Submitting…</> : <><AlertTriangle className="w-3.5 h-3.5" /> Submit Dispute</>}
      </motion.button>
    </div>
  );
}
