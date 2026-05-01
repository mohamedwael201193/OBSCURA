import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

/**
 * EmptyState — shared empty-list / zero-data card.
 *
 * Used everywhere a Pay surface can render nothing (no policies, no streams,
 * no inbox items, no receipts, no contacts). Stripe / Linear empty-state idiom:
 * subtle icon tile, h3, one-line description, optional ghost-button CTA.
 */
export interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: ReactNode;
  cta?: { label: string; onClick: () => void };
  className?: string;
}

export default function EmptyState({ icon: Icon, title, description, cta, className }: EmptyStateProps) {
  return (
    <div
      className={
        "flex flex-col items-center justify-center text-center py-10 px-6 " +
        (className ?? "")
      }
    >
      <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-emerald-500/[0.06] border border-emerald-500/15 mb-4">
        <Icon className="w-6 h-6 text-emerald-400/80" />
      </div>
      <div className="font-display text-[15px] text-foreground mb-1.5">{title}</div>
      {description && (
        <p className="text-[12.5px] text-muted-foreground/70 max-w-sm leading-relaxed">
          {description}
        </p>
      )}
      {cta && (
        <button
          onClick={cta.onClick}
          className="mt-4 inline-flex items-center gap-1.5 text-[12px] font-medium px-3.5 py-1.5 rounded-md border border-emerald-500/30 bg-emerald-500/[0.06] text-emerald-200 hover:bg-emerald-500/[0.12] hover:border-emerald-500/50 transition-colors"
        >
          {cta.label}
        </button>
      )}
    </div>
  );
}
