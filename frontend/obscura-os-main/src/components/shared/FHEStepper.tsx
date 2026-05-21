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
          className={`mt-3 p-3 rounded-xl border backdrop-blur-md ${
            isError
              ? "bg-red-500/10 border-red-500/30"
              : "bg-black/30 border-white/8"
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
                    <div className={`relative w-7 h-7 rounded-full flex items-center justify-center transition-colors duration-300 ${
                      done   ? "bg-emerald-500/20 border border-emerald-500/40" :
                      active ? "bg-violet-500/20 border border-violet-500/50" :
                                "bg-white/5 border border-white/10"
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
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      ) : active ? (
                        <Loader2 className="w-3.5 h-3.5 text-violet-300 animate-spin" />
                      ) : (
                        <phase.Icon className="w-3.5 h-3.5 text-white/25" />
                      )}
                    </div>
                    <span className={`text-[8px] font-mono tracking-[0.16em] uppercase ${
                      done ? "text-emerald-400/90" : active ? "text-violet-200" : "text-white/30"
                    }`}>
                      {phase.label}
                    </span>
                  </div>
                  {next && (
                    <div className="flex-1 h-px bg-white/8 mb-3 relative overflow-hidden rounded-full">
                      <motion.div
                        className={
                          done ? "h-full bg-emerald-400/50" :
                          active ? "h-full bg-violet-400/60" :
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
            <div className="mt-2 flex items-center justify-between text-[10.5px] text-white/55">
              <span className="flex items-center gap-1.5">
                <span className="text-violet-300 font-medium">{activePhase.label}</span>
                <span className="text-white/30">·</span>
                <span>{activePhase.hint}</span>
              </span>
              <span className="font-mono text-white/40">
                {elapsed.toFixed(1)}s {activePhase.etaSec > 0 && `/ ~${activePhase.etaSec}s`}
              </span>
            </div>
          )}

          {status === FHEStepStatus.READY && (
            <div className="mt-2 text-[10.5px] text-emerald-300 flex items-center gap-1.5">
              <CheckCircle2 className="w-3 h-3" />
              Sealed and confirmed on-chain.
            </div>
          )}

          {isError && error && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-2 flex items-start gap-1.5 text-[10.5px] text-red-300"
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
