import { useState } from "react";
import { motion } from "framer-motion";
import { Shield, Lock, CheckCircle2, Copy, ExternalLink } from "lucide-react";
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
    try {
      sId = BigInt(streamId || "0");
    } catch {
      toast.error("Stream ID must be a number");
      return;
    }
    try {
      eId = BigInt(escrowId || "0");
    } catch {
      toast.error("Escrow ID must be a number");
      return;
    }
    if (sId === 0n) {
      toast.error("Enter a stream ID (find it in the Streams tab)");
      return;
    }
    if (eId === 0n) {
      toast.error("Enter an escrow ID");
      return;
    }
    const parsed = Number(coverageUSDC);
    if (!parsed || parsed <= 0) {
      toast.error("Enter a coverage amount in cUSDC");
      return;
    }
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
      toast.success(
        `Coverage purchased! ID: ${result.coverageId} — save this for disputes`
      );
    } catch (e) {
      toast.error((e as Error).message?.slice(0, 200));
    }
  };

  return (
    <div className="glass-panel rounded-md p-6 space-y-4">
      <div className="flex items-center gap-2">
        <Shield className="w-4 h-4 text-primary" />
        <h3 className="font-display text-sm tracking-wider text-foreground">
          Buy Payroll Insurance
        </h3>
        <span className="ml-auto text-[11px] text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-md border border-cyan-500/20">
          cUSDC · ENCRYPTED COVERAGE
        </span>
      </div>

      <p className="text-sm text-muted-foreground/70">
        Protect your salary: if your employer skips a payment cycle, you can
        dispute and get paid from the insurance pool. The coverage amount,
        premium, and payout are all encrypted — no one can see the terms of
        your policy.
      </p>

      {/* Success state — show coverage ID */}
      {step === "done" && lastCoverageId && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-md p-3 space-y-2">
          <div className="flex items-center gap-2 text-emerald-400">
            <CheckCircle2 className="w-4 h-4" />
            <span className="text-sm tracking-wider uppercase">
              Coverage Active
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              Coverage ID:
            </span>
            <code className="font-mono text-xs text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-md">
              {lastCoverageId}
            </code>
            <button
              onClick={() => {
                navigator.clipboard.writeText(lastCoverageId);
                toast.success("Coverage ID copied");
              }}
              className="p-1 hover:bg-muted/50 rounded-md"
            >
              <Copy className="w-3 h-3 text-muted-foreground" />
            </button>
          </div>
          <p className="text-xs text-amber-400/80">
            Save this ID — you need it to file a dispute if a payment is missed.
          </p>
          <button
            onClick={resetStep}
            className="text-xs text-muted-foreground/50 hover:text-muted-foreground underline"
          >
            Buy another policy
          </button>
        </div>
      )}

      {/* Step progress */}
      {step !== "idle" && step !== "done" && (
        <div className="bg-primary/5 border border-primary/20 rounded-md p-3">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-primary">
              {STEP_LABELS[step]}
            </span>
          </div>
        </div>
      )}

      {/* Form fields — hide when processing or done */}
      {step === "idle" && (
        <>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground tracking-[0.15em] uppercase block mb-1.5">
                Stream ID{" "}
                <span className="text-muted-foreground/40 normal-case">
                  (from Streams tab)
                </span>
              </label>
              <input
                type="number"
                value={streamId}
                onChange={(e) => setStreamId(e.target.value)}
                placeholder="e.g. 1"
                className="w-full px-3 py-2 bg-background border border-border/50 rounded-md text-xs font-mono"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground tracking-[0.15em] uppercase block mb-1.5">
                Escrow ID{" "}
                <span className="text-muted-foreground/40 normal-case">
                  (on-chain escrow tied to this cycle)
                </span>
              </label>
              <input
                type="number"
                value={escrowId}
                onChange={(e) => setEscrowId(e.target.value)}
                placeholder="e.g. 1"
                className="w-full px-3 py-2 bg-background border border-border/50 rounded-md text-xs font-mono"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground tracking-[0.15em] uppercase block mb-1.5">
                  Expected Cycles
                </label>
                <input
                  type="number"
                  value={cycles}
                  onChange={(e) => setCycles(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-border/50 rounded-md text-xs font-mono"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground tracking-[0.15em] uppercase block mb-1.5">
                  Coverage Days
                </label>
                <input
                  type="number"
                  value={days}
                  onChange={(e) => setDays(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-border/50 rounded-md text-xs font-mono"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground tracking-[0.15em] uppercase block mb-1.5">
                Coverage Amount (cUSDC)
              </label>
              <input
                type="number"
                value={coverageUSDC}
                onChange={(e) => setCoverageUSDC(e.target.value)}
                placeholder="e.g. 100"
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
            className="w-full py-3 text-xs tracking-[0.2em] uppercase bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Lock className="w-3.5 h-3.5" />
            Buy Coverage
          </motion.button>
        </>
      )}
    </div>
  );
}
