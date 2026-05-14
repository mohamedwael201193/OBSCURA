/**
 * FHEStepper — compact inline progress strip for FHE transaction flows.
 * Reads FHEStepStatus and shows 4 phase badges: Encrypt → Submit → Settle → Done.
 *
 * Usage:
 *   <FHEStepper status={fheStatus.status} error={fheStatus.error} />
 */
import { motion, AnimatePresence } from "framer-motion";
import { Lock, Send, Hourglass, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { FHEStepStatus } from "@/lib/constants";

interface Step {
  id: FHEStepStatus[];
  label: string;
  Icon: React.ElementType;
}

const PHASES: Step[] = [
  { id: [FHEStepStatus.ENCRYPTING],                label: "Encrypt",  Icon: Lock      },
  { id: [FHEStepStatus.SENDING],                   label: "Submit",   Icon: Send      },
  { id: [FHEStepStatus.COMPUTING, FHEStepStatus.SETTLING], label: "Settle", Icon: Hourglass },
  { id: [FHEStepStatus.READY],                     label: "Done",     Icon: CheckCircle2 },
];

function phaseIndex(status: FHEStepStatus): number {
  if (status === FHEStepStatus.IDLE) return -1;
  if (status === FHEStepStatus.ERROR) return -1;
  for (let i = 0; i < PHASES.length; i++) {
    if (PHASES[i].id.includes(status)) return i;
  }
  return -1;
}

interface Props {
  status: FHEStepStatus;
  error?: string;
  className?: string;
}

export default function FHEStepper({ status, error, className = "" }: Props) {
  if (status === FHEStepStatus.IDLE) return null;

  const activeIdx = phaseIndex(status);
  const isError = status === FHEStepStatus.ERROR;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: "auto" }}
        exit={{ opacity: 0, height: 0 }}
        className={`overflow-hidden ${className}`}
      >
        <div className="mt-3 p-3 rounded-xl bg-black/30 border border-white/8">
          {/* Phase strip */}
          <div className="flex items-center justify-between gap-1">
            {PHASES.map((phase, i) => {
              const done = !isError && activeIdx > i;
              const active = !isError && activeIdx === i;
              const idle = isError || activeIdx < i;

              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  {/* Icon */}
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors duration-300 ${
                      done
                        ? "bg-emerald-500/20 border border-emerald-500/40"
                        : active
                        ? "bg-cyan-500/20 border border-cyan-500/40"
                        : "bg-white/5 border border-white/10"
                    }`}
                  >
                    {done ? (
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    ) : active ? (
                      <Loader2 className="w-3 h-3 text-cyan-400 animate-spin" />
                    ) : (
                      <phase.Icon className={`w-3 h-3 ${idle ? "text-white/20" : "text-cyan-400"}`} />
                    )}
                  </div>
                  {/* Label */}
                  <span
                    className={`text-[8px] font-mono tracking-wide uppercase leading-none ${
                      done ? "text-emerald-400" : active ? "text-cyan-300" : "text-white/25"
                    }`}
                  >
                    {phase.label}
                  </span>

                  {/* Connector line (after each except last) */}
                  {i < PHASES.length - 1 && (
                    <div className={`absolute`} /> // spacer — real connector is below
                  )}
                </div>
              );
            })}
          </div>

          {/* Connector bars between icons */}
          <div className="flex items-center mt-1 px-4 gap-1">
            {PHASES.slice(0, -1).map((_, i) => {
              const done = !isError && activeIdx > i;
              return (
                <div key={i} className="flex-1 h-px">
                  <motion.div
                    className={`h-full ${done ? "bg-emerald-500/40" : "bg-white/10"}`}
                    initial={false}
                    animate={{ width: done ? "100%" : "0%" }}
                    transition={{ duration: 0.4 }}
                  />
                </div>
              );
            })}
          </div>

          {/* Error state */}
          {isError && error && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-2 flex items-start gap-1.5 text-[10px] text-red-400"
            >
              <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </motion.div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
