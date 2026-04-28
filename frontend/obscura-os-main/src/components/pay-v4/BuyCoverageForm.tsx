import { useState } from "react";
import { motion } from "framer-motion";
import { Shield, Lock, CheckCircle2, Copy, Loader2 } from "lucide-react";
import { useInsurePayroll } from "@/hooks/useInsurePayroll";
import type { PurchaseStep } from "@/hooks/useInsurePayroll";
import { toast } from "sonner";

const STEP_LABELS: Record<PurchaseStep, string> = {
  idle: "",
  encrypting: "Encrypting coverage data…",
  authorizing: "Authorizing cUSDC operator (1/2)…",
  purchasing: "Purchasing coverage (2/2)…",
  done: "Coverage purchased!",
};

export default function BuyCoverageForm() {
  const [streamId, setStreamId] = useState("");
  const [escrowId, setEscrowId] = useState("");
  const [cycles, setCycles] = useState("12");
  const [coverageUSDC, setCoverageUSDC] = useState("");
  const [days, setDays] = useState("30");
  const { purchase, isPending, step, error, lastCoverageId, resetStep } =
    useInsurePayroll();

  const submit = async () => {
    let sId: bigint, eId: bigint;
    try { sId = BigInt(streamId || "0"); } catch {
      toast.error("Stream ID must be a number"); return;
    }
    try { eId = BigInt(escrowId || "0"); } catch {
      toast.error("Escrow ID must be a number"); return;
    }
    if (sId === 0n) { toast.error("Enter a stream ID (find it in the Streams tab)"); return; }
    if (eId === 0n) { toast.error("Enter an escrow ID"); return; }
    const parsed = Number(coverageUSDC);
    if (!parsed || parsed <= 0) { toast.error("Enter a coverage amount in cUSDC"); return; }
    const amt = BigInt(Math.floor(parsed * 1_000_000));
    const d = Math.max(1, Math.floor(Number(days) || 30));
    try {
      const result = await purchase({
        escrowId: eId,
        streamId: sId,
        expectedCycles: Number(cycles) || 12,
        coverageAmount: amt,
        coverageDays: d,
      });
      toast.success(`Coverage purchased! ID: ${result.coverageId} — save this for disputes`);
    } catch (e) {
      toast.error((e as Error).message?.slice(0, 200));
    }
  };

  return (
    <div className="pay-card p-6 space-y-5">
      {/* ── Header ── */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-700/10 border border-emerald-500/25 flex items-center justify-center shrink-0">
          <Shield className="w-4 h-4 text-emerald-400" />
        </div>
        <div className="min-w-0">
          <h3 className="font-display text-sm font-semibold text-foreground leading-tight">Buy Payroll Insurance</h3>
          <p className="text-[10px] text-muted-foreground/45 tracking-widest mt-0.5 uppercase">Encrypted Coverage · cUSDC</p>
        </div>
        <span className="ml-auto shrink-0 pay-badge pay-badge-emerald">INSURED</span>
      </div>

      <p className="text-[12px] text-muted-foreground/55 leading-relaxed">
        Protect your salary — if a payment cycle is missed, dispute and get paid from the insurance pool. Coverage terms, premium, and payout are all encrypted.
      </p>

      {/* ── Success: Coverage Active ── */}
      {step === "done" && lastCoverageId && (
        <div className="rounded-lg bg-emerald-500/8 border border-emerald-500/20 p-4 space-y-3">
          <div className="flex items-center gap-2 text-emerald-400">
            <CheckCircle2 className="w-4 h-4" />
            <span className="text-[12px] font-semibold tracking-wider uppercase">Coverage Active</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[12px] text-muted-foreground/70">Coverage ID:</span>
            <code className="font-mono text-[11px] text-cyan-300 bg-cyan-500/10 px-2.5 py-1 rounded-md border border-cyan-500/20">
              {lastCoverageId}
            </code>
            <button
              onClick={() => { navigator.clipboard.writeText(lastCoverageId); toast.success("Coverage ID copied"); }}
              className="p-1.5 hover:bg-white/[0.06] rounded-md transition-colors text-muted-foreground/50 hover:text-muted-foreground"
            >
              <Copy className="w-3 h-3" />
            </button>
          </div>
          <p className="text-[11px] text-amber-300/70">
            Save this ID — you need it to file a dispute if a payment is missed.
          </p>
          <button
            onClick={resetStep}
            className="text-[11px] text-muted-foreground/40 hover:text-muted-foreground/70 underline underline-offset-2 transition-colors"
          >
            Buy another policy
          </button>
        </div>
      )}

      {/* ── Step progress ── */}
      {step !== "idle" && step !== "done" && (
        <div className="rounded-lg bg-white/[0.025] border border-white/[0.07] p-4">
          <div className="flex items-center gap-2.5">
            <Loader2 className="w-3.5 h-3.5 text-primary animate-spin shrink-0" />
            <span className="text-[12px] text-primary">{STEP_LABELS[step]}</span>
          </div>
        </div>
      )}

      {/* ── Form fields ── */}
      {step === "idle" && (
        <>
          <div className="space-y-3">
            <div className="space-y-2">
              <label className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground/50 font-semibold">
                Stream ID <span className="text-muted-foreground/30 normal-case tracking-normal">(from Streams tab)</span>
              </label>
              <input
                type="number"
                value={streamId}
                onChange={(e) => setStreamId(e.target.value)}
                placeholder="e.g. 1"
                className="pay-input"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground/50 font-semibold">
                Escrow ID <span className="text-muted-foreground/30 normal-case tracking-normal">(on-chain escrow)</span>
              </label>
              <input
                type="number"
                value={escrowId}
                onChange={(e) => setEscrowId(e.target.value)}
                placeholder="e.g. 1"
                className="pay-input"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground/50 font-semibold">
                  Expected Cycles
                </label>
                <input
                  type="number"
                  value={cycles}
                  onChange={(e) => setCycles(e.target.value)}
                  className="pay-input"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground/50 font-semibold">
                  Coverage Days
                </label>
                <input
                  type="number"
                  value={days}
                  onChange={(e) => setDays(e.target.value)}
                  className="pay-input"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground/50 font-semibold">
                Coverage Amount (cUSDC)
              </label>
              <input
                type="number"
                value={coverageUSDC}
                onChange={(e) => setCoverageUSDC(e.target.value)}
                placeholder="e.g. 100"
                className="pay-input"
              />
            </div>
          </div>

          {error && (
            <div className="text-[12px] text-red-300 bg-red-500/8 p-3 rounded-lg border border-red-500/20 leading-relaxed">
              {error.slice(0, 200)}
            </div>
          )}

          <motion.button
            onClick={submit}
            disabled={isPending}
            whileTap={{ scale: 0.99 }}
            className="btn-pay btn-pay-emerald w-full py-2.5"
          >
            <Lock className="w-3.5 h-3.5" />
            Buy Coverage
          </motion.button>
        </>
      )}
    </div>
  );
}
