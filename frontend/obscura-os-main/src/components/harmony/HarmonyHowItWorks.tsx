import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { HarmonyFormCard } from "@/components/harmony/harmony-ui";

export type HarmonyStep = {
  title: string;
  description: ReactNode;
};

export function HarmonyHowItWorks({
  title,
  subtitle,
  steps,
  footnote,
}: {
  title: string;
  subtitle?: string;
  steps: HarmonyStep[];
  footnote?: ReactNode;
}) {
  return (
    <HarmonyFormCard title={title} eyebrow={subtitle ?? "How it works"}>
      <div className="space-y-3">
        {steps.map((step, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.35, delay: idx * 0.05 }}
            className="flex items-start gap-3"
          >
            <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg hairline bg-accent/15">
              <span className="font-mono text-[11px] text-[hsl(var(--success))]">{idx + 1}</span>
            </div>
            <div className="flex-1 pt-0.5 text-sm leading-relaxed">
              <span className="font-medium text-foreground">{step.title}</span>
              <span className="text-muted-foreground"> — {step.description}</span>
            </div>
          </motion.div>
        ))}
      </div>
      {footnote && (
        <p className="mt-4 border-t border-border pt-4 text-sm leading-relaxed text-muted-foreground">{footnote}</p>
      )}
    </HarmonyFormCard>
  );
}
