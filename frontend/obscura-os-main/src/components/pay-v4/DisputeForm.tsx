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
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-muted hairline">
          <AlertTriangle className="w-4 h-4 text-foreground" />
        </div>
        <div className="min-w-0">
          <h3 className="font-display text-lg text-foreground leading-tight">File a Dispute</h3>
          <p className="text-[10px] text-muted-foreground/45 tracking-widest mt-0.5 uppercase">Missed Cycle · Auto-Payout</p>
        </div>
        <span className="ml-auto shrink-0 inline-flex items-center gap-1.5 rounded-full bg-muted border border-border px-2 py-0.5 text-[10.5px] font-medium text-foreground/75">Claim payout</span>
      </div>

      <p className="text-sm text-muted-foreground leading-relaxed">
        Missed a payroll cycle? Enter your coverage ID and the cycle number that was skipped. The smart contract judges the dispute using encrypted data and pays you automatically if valid — no human review needed.
      </p>

      {/* Quick-fill from saved policies */}
      {policies.length > 0 && !coverageId && (
        <div className="rounded-xl hairline bg-accent/10 p-3 space-y-2">
          <span className="text-[10px] text-foreground/70 tracking-[0.15em] uppercase">Your saved policies — click to fill</span>
          <div className="flex flex-wrap gap-1.5">
            {policies.map((p, i) => (
              <button key={i} onClick={() => setCoverageId(p.coverageId)}
                className="text-[11px] text-foreground bg-muted px-2.5 py-1 rounded-lg border border-border hover:bg-muted/70 transition-colors font-mono">
                ID {p.coverageId} · Stream {p.streamId} · {p.coverageAmount} ocUSDC
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

      <div className="flex justify-end pt-3 border-t border-border/60">
        <motion.button onClick={submit} disabled={isPending} whileTap={{ scale: 0.99 }}
          className="btn-pay btn-pay-primary disabled:opacity-50">
          {isPending ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Submitting…</> : <><AlertTriangle className="w-3.5 h-3.5" /> Submit dispute</>}
        </motion.button>
      </div>
    </div>
  );
}
