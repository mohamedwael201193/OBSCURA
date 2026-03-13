import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { payHarmony as h } from "@/components/harmony/payHarmonyClasses";

export interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: ReactNode;
  cta?: { label: string; onClick: () => void };
  className?: string;
}

export default function EmptyState({ icon: Icon, title, description, cta, className }: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center px-6 py-10 text-center ${className ?? ""}`}>
      <div className={`mb-4 grid h-14 w-14 place-items-center rounded-2xl ${h.noticeAccent}`}>
        <Icon className="h-6 w-6 text-foreground" />
      </div>
      <div className="mb-1.5 font-display text-lg text-foreground">{title}</div>
      {description && <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">{description}</p>}
      {cta && (
        <button type="button" onClick={cta.onClick} className="btn-pay btn-pay-ghost mt-4">
          {cta.label}
        </button>
      )}
    </div>
  );
}
