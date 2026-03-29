import { motion } from "framer-motion";
import { Lock, Send, Eye, AlertCircle } from "lucide-react";
import { FHEStepStatus } from "@/lib/constants";

interface AsyncStepperProps {
  status: FHEStepStatus;
  stepIndex: number;
  labels?: [string, string, string];
}

const defaultLabels: [string, string, string] = ["Encrypting", "Computing", "Ready"];

export default function AsyncStepper({
  status,
  stepIndex,
  labels = defaultLabels,
}: AsyncStepperProps) {
  const icons = [Lock, Send, Eye];
  const isError = status === FHEStepStatus.ERROR;

  return (
    <div className="flex items-center gap-2 w-full">
      {labels.map((label, i) => {
        const Icon = icons[i];
        const isDone = stepIndex > i;
        const isActive = stepIndex === i;
        const isErrorStep = isError && isActive;

        return (
          <div key={label} className="flex items-center gap-2 flex-1">
            <motion.div
              animate={
                isActive && !isErrorStep
                  ? { scale: [1, 1.1, 1] }
                  : { scale: 1 }
              }
              transition={
                isActive ? { repeat: Infinity, duration: 1.5 } : {}
              }
              className={`w-7 h-7 rounded-full flex items-center justify-center border transition-all ${
                isErrorStep
                  ? "bg-red-500/20 border-red-500 text-red-400"
                  : isDone
                  ? "bg-primary/20 border-primary text-primary"
                  : isActive
                  ? "border-primary/50 text-primary"
                  : "border-border text-muted-foreground/30"
              }`}
            >
              {isErrorStep ? (
                <AlertCircle className="w-3 h-3" />
              ) : (
                <Icon className="w-3 h-3" />
              )}
            </motion.div>
            <span
              className={`text-[9px] font-mono tracking-wider ${
                isErrorStep
                  ? "text-red-400"
                  : isDone
                  ? "text-primary"
                  : isActive
                  ? "text-primary/70"
                  : "text-muted-foreground/30"
              }`}
            >
              {label}
            </span>
            {i < labels.length - 1 && (
              <div
                className={`flex-1 h-px ${
                  isDone ? "bg-primary/40" : "bg-border"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
