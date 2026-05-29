import { AlertTriangle, ShieldCheck } from "lucide-react";
import { VoteNotice } from "@/components/harmony/voteHarmonyUi";

const LIFECYCLE_STEPS = [
  { label: "Draft", detail: "Attach spend or propose via Governor" },
  { label: "Vote", detail: "Private proposals stay separate" },
  { label: "Queue", detail: "Succeeded proposals enter timelock" },
  { label: "Execute", detail: "Irreversible on-chain action" },
];

export function VoteAdvancedIntro() {
  return (
    <div className="vote-harmony-panel space-y-4">
      <div className="rounded-2xl border border-border bg-muted/35 p-5">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Protocol operators</p>
        <h2 className="mt-1 font-display text-xl font-semibold text-foreground">Advanced governance</h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Treasury spends and public Governor proposals live here. Normal voters can stay in Proposals and Participation
          — this area is for timelock execution and treasury operations.
        </p>

        <div className="mt-5 grid gap-2 sm:grid-cols-4">
          {LIFECYCLE_STEPS.map((step, index) => (
            <div key={step.label} className="rounded-xl hairline bg-card px-3 py-2.5">
              <p className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
                {index + 1}. {step.label}
              </p>
              <p className="mt-1 text-xs text-foreground">{step.detail}</p>
            </div>
          ))}
        </div>
      </div>

      <VoteNotice variant="warn" icon={AlertTriangle}>
        Execute and treasury spend actions are irreversible once confirmed. Review recipient, amount, and timelock state
        before signing.
      </VoteNotice>

      <VoteNotice icon={ShieldCheck}>
        Private Vote ballots remain encrypted in the main proposal flow. Advanced Governor votes are public on-chain by
        design — separate from sealed private proposals.
      </VoteNotice>
    </div>
  );
}
