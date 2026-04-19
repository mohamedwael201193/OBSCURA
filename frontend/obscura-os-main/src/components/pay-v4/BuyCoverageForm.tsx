import { useState } from "react";
import { motion } from "framer-motion";
import { Shield, Lock } from "lucide-react";
import { useInsurePayroll } from "@/hooks/useInsurePayroll";
import { toast } from "sonner";

export default function BuyCoverageForm() {
  const [streamId, setStreamId] = useState("");
  const [escrowId, setEscrowId] = useState("");
  const [cycles, setCycles] = useState("12");
  const [coverageUSDC, setCoverageUSDC] = useState("");
  const [days, setDays] = useState("30");
  const { purchase, isPending, error } = useInsurePayroll();

  const submit = async () => {
    const sId = BigInt(streamId || "0");
    const eId = BigInt(escrowId || "0");
    if (sId === 0n) {
      toast.error("Enter a stream id");
      return;
    }
    if (eId === 0n) {
      toast.error("Enter an escrow id (the cycle to insure)");
      return;
    }
    const amt = BigInt(Math.floor(Number(coverageUSDC) * 1_000_000));
    if (amt <= 0n) {
      toast.error("Enter a coverage amount");
      return;
    }
    const d = Math.max(1, Math.floor(Number(days) || 30));
    try {
      await purchase({
        escrowId: eId,
        streamId: sId,
        expectedCycles: Number(cycles),
        coverageAmount: amt,
        coverageDays: d,
      });
      toast.success("Coverage purchased");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <div className="glass-panel rounded-sm p-6 space-y-4">
      <div className="flex items-center gap-2">
        <Shield className="w-4 h-4 text-primary" />
        <h3 className="font-display text-sm tracking-wider text-foreground">Buy Payroll Insurance</h3>
        <span className="ml-auto text-[8px] font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-sm border border-cyan-500/20">
          cUSDC · ENCRYPTED COVERAGE
        </span>
      </div>

      <p className="text-[10px] font-mono text-muted-foreground/70">
        Protect your salary: if your employer skips a payment cycle, you can dispute and get paid from the insurance pool.
        The coverage amount, premium, and payout are all encrypted — no one can see the terms of your policy.
      </p>

      <div className="space-y-3">
        <div>
          <label className="text-[9px] font-mono text-muted-foreground tracking-[0.15em] uppercase block mb-1.5">
            Stream ID
          </label>
          <input
            type="number"
            value={streamId}
            onChange={(e) => setStreamId(e.target.value)}
            className="w-full px-3 py-2 bg-background border border-border/50 rounded-sm text-xs font-mono"
          />
        </div>
        <div>
          <label className="text-[9px] font-mono text-muted-foreground tracking-[0.15em] uppercase block mb-1.5">
            Escrow ID (cycle to insure)
          </label>
          <input
            type="number"
            value={escrowId}
            onChange={(e) => setEscrowId(e.target.value)}
            className="w-full px-3 py-2 bg-background border border-border/50 rounded-sm text-xs font-mono"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[9px] font-mono text-muted-foreground tracking-[0.15em] uppercase block mb-1.5">
              Expected Cycles
            </label>
            <input
              type="number"
              value={cycles}
              onChange={(e) => setCycles(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-border/50 rounded-sm text-xs font-mono"
            />
          </div>
          <div>
            <label className="text-[9px] font-mono text-muted-foreground tracking-[0.15em] uppercase block mb-1.5">
              Coverage Days
            </label>
            <input
              type="number"
              value={days}
              onChange={(e) => setDays(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-border/50 rounded-sm text-xs font-mono"
            />
          </div>
        </div>
        <div>
          <label className="text-[9px] font-mono text-muted-foreground tracking-[0.15em] uppercase block mb-1.5">
            Coverage (cUSDC)
          </label>
          <input
            type="number"
            value={coverageUSDC}
            onChange={(e) => setCoverageUSDC(e.target.value)}
            placeholder="2500"
            className="w-full px-3 py-2 bg-background border border-border/50 rounded-sm text-xs font-mono"
          />
        </div>
      </div>

      {error && <div className="text-[10px] font-mono text-destructive">{error}</div>}

      <motion.button
        onClick={submit}
        disabled={isPending}
        whileTap={{ scale: 0.99 }}
        className="w-full py-3 text-xs tracking-[0.2em] uppercase font-mono bg-primary text-primary-foreground rounded-sm hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2"
      >
        <Lock className="w-3.5 h-3.5" />
        {isPending ? "Encrypting…" : "Buy Coverage"}
      </motion.button>
    </div>
  );
}
