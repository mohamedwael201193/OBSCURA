/**
 * FHEStepper v2 — 5-phase pill row with optimistic tween + ETA hints.
 *
 * Phases:
 *   Seal (Encrypt) → Submit → Compute → Settle → Done
 *
 * Visual rules:
 *   - Completed: emerald check, connector emerald
 *   - Active:    violet pulse + spinner + ETA caption
 *   - Future:    grey idle
 *   - Error:     red shake + reason line
 *
 * Optimistic tween: the connector to the next step fills smoothly so the
 * user feels progress (CoFHE settle ~6-8s would otherwise look frozen).
 */
import { motion, AnimatePresence } from "framer-motion";
import { Lock, Send, Cpu, Hourglass, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { FHEStepStatus } from "@/lib/constants";

interface Phase {
  key: "encrypt" | "submit" | "compute" | "settle" | "done";
  label: string;
  Icon: React.ElementType;
  matches: FHEStepStatus[];
  etaSec: number;
  hint: string;
}

const PHASES: Phase[] = [
  { key: "encrypt", label: "Seal",    Icon: Lock,         matches: [FHEStepStatus.ENCRYPTING], etaSec: 1, hint: "Sealing inputs client-side" },
  { key: "submit",  label: "Submit",  Icon: Send,         matches: [FHEStepStatus.SENDING],    etaSec: 2, hint: "Awaiting wallet signature" },
  { key: "compute", label: "Compute", Icon: Cpu,          matches: [FHEStepStatus.COMPUTING],  etaSec: 3, hint: "Broadcasting transaction" },
  { key: "settle",  label: "Settle",  Icon: Hourglass,    matches: [FHEStepStatus.SETTLING],   etaSec: 6, hint: "CoFHE coprocessor settling" },
  { key: "done",    label: "Done",    Icon: CheckCircle2, matches: [FHEStepStatus.READY],      etaSec: 0, hint: "Sealed and confirmed" },
];

function activeIndex(status: FHEStepStatus): number {
  for (let i = 0; i < PHASES.length; i++) if (PHASES[i].matches.includes(status)) return i;
  return -1;
}

interface Props {
  status: FHEStepStatus;
  error?: string;
  className?: string;
}

export default function FHEStepper({ status, error, className = "" }: Props) {
  const isError = status === FHEStepStatus.ERROR;
  const idx = activeIndex(status);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (status === FHEStepStatus.IDLE || status === FHEStepStatus.READY || isError) {
      setElapsed(0);
      return;
    }
    setElapsed(0);
    const id = setInterval(() => setElapsed((e) => e + 0.1), 100);
    return () => clearInterval(id);
  }, [status, isError]);

  if (status === FHEStepStatus.IDLE) return null;

  const activePhase = idx >= 0 ? PHASES[idx] : null;
  const etaPct = activePhase
    ? Math.min(1, elapsed / Math.max(activePhase.etaSec, 0.5))
    : 0;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: "auto" }}
        exit={{ opacity: 0, height: 0 }}
        className={`overflow-hidden ${className}`}
      >
        <motion.div
          animate={isError ? { x: [0, -4, 4, -3, 3, 0] } : {}}
          transition={{ duration: 0.4 }}
          className={`harmony-fhe-stepper mt-3 rounded-xl hairline p-4 ${
            isError ? "border-destructive/30 bg-destructive/5" : "bg-card"
          }`}
        >
          <div className="flex items-stretch gap-1">
            {PHASES.map((phase, i) => {
              const done   = !isError && idx > i;
              const active = !isError && idx === i;
              const next   = i + 1 < PHASES.length;
              return (
                <div key={phase.key} className="flex-1 flex items-center gap-1">
                  <div className="flex flex-col items-center gap-1 min-w-0 flex-1">
                    <div className={`relative flex h-7 w-7 items-center justify-center rounded-full transition-colors duration-300 ${
                      done   ? "border border-[hsl(var(--success))]/40 bg-accent/20" :
                      active ? "border border-accent/50 bg-accent/25" :
                                "hairline bg-muted"
                    }`}>
                      {active && (
                        <motion.div
                          className="absolute inset-0 rounded-full"
                          animate={{ boxShadow: [
                            "0 0 0 0 rgba(139,92,246,0)",
                            "0 0 0 6px rgba(139,92,246,0.22)",
                            "0 0 0 0 rgba(139,92,246,0)",
                          ] }}
                          transition={{ repeat: Infinity, duration: 1.6, ease: "easeInOut" }}
                        />
                      )}
                      {done ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-[hsl(var(--success))]" />
                      ) : active ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-foreground" />
                      ) : (
                        <phase.Icon className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                    </div>
                    <span className={`font-mono text-[8px] uppercase tracking-[0.16em] ${
                      done ? "text-[hsl(var(--success))]" : active ? "text-foreground" : "text-muted-foreground"
                    }`}>
                      {phase.label}
                    </span>
                  </div>
                  {next && (
                    <div className="relative mb-3 h-px flex-1 overflow-hidden rounded-full bg-border">
                      <motion.div
                        className={
                          done ? "h-full bg-[hsl(var(--success))]" :
                          active ? "h-full bg-accent" :
                          "h-full bg-transparent"
                        }
                        initial={false}
                        animate={{ width: done ? "100%" : active ? `${Math.max(15, etaPct * 100)}%` : "0%" }}
                        transition={{ duration: 0.4, ease: "easeOut" }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {activePhase && !isError && (
            <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="font-medium text-foreground">{activePhase.label}</span>
                <span>·</span>
                <span>{activePhase.hint}</span>
              </span>
              <span className="font-mono">
                {elapsed.toFixed(1)}s {activePhase.etaSec > 0 && `/ ~${activePhase.etaSec}s`}
              </span>
            </div>
          )}

          {status === FHEStepStatus.READY && (
            <div className="mt-2 flex items-center gap-1.5 text-[11px] text-[hsl(var(--success))]">
              <CheckCircle2 className="w-3 h-3" />
              Sealed and confirmed on-chain.
            </div>
          )}

          {isError && error && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-2 flex items-start gap-1.5 text-[11px] text-destructive"
            >
              <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </motion.div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
