import type { ComponentType, ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Tailwind tokens aligned with obscure-harmony-system Vote page */
export const vh = {
  panel: "vote-harmony-panel space-y-6",
  label: "font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground",
  body: "text-sm leading-relaxed text-foreground/75",
  emphasis: "font-semibold text-foreground",
  kpiGrid: "grid gap-4 sm:grid-cols-2 lg:grid-cols-4",
  kpiGrid2: "grid grid-cols-2 gap-4",
  kpi: "rounded-2xl border border-border bg-white p-5 shadow-[0_1px_3px_hsl(145_18%_12%/0.06)]",
  kpiRow: "flex items-center gap-2 text-muted-foreground",
  kpiValue: "font-display text-3xl mt-2 text-foreground tabular-nums",
  kpiSub: "mt-1 text-sm text-foreground/65",
  notice: "rounded-xl border border-border bg-white p-4 flex gap-3 text-sm leading-relaxed text-foreground/75 shadow-[0_1px_2px_hsl(145_18%_12%/0.04)]",
  noticeWarn:
    "rounded-xl border border-amber-500/30 bg-amber-50 p-4 flex gap-3 text-sm leading-relaxed text-amber-950",
  tabRow: "flex gap-1 rounded-full border border-border bg-muted/50 p-1",
  tabBtn: "flex-1 rounded-full px-4 py-2.5 text-sm font-medium transition-colors",
  tabActive: "bg-white text-foreground shadow-sm border border-border",
  tabIdle: "text-muted-foreground hover:text-foreground",
  listCard: "rounded-2xl border border-border bg-white p-5 shadow-[0_1px_2px_hsl(145_18%_12%/0.04)]",
  section: "overflow-hidden rounded-2xl border border-border bg-white shadow-[0_1px_3px_hsl(145_18%_12%/0.06)]",
  sectionHead: "border-b border-border bg-muted/20 px-5 py-4",
  row: "border-b border-border py-3 last:border-0",
  link: "font-mono text-sm text-foreground underline-offset-2 hover:underline inline-flex items-center gap-1",
  empty: "rounded-2xl border border-border bg-white p-12 text-center shadow-[0_1px_2px_hsl(145_18%_12%/0.04)]",
  badgeOk: "rounded-full border border-border bg-muted px-2.5 py-0.5 text-xs font-medium text-foreground",
  badgeMuted: "rounded-full border border-border bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground",
  badgeAccent: "rounded-full border border-[hsl(var(--success))]/30 bg-[hsl(var(--success))]/10 px-2.5 py-0.5 text-xs font-semibold text-[hsl(var(--success))]",
  input: "pay-input w-full",
  btnPrimary: "btn-pay btn-pay-emerald min-h-[2.75rem] text-sm font-semibold",
  btnGhost: "btn-pay btn-pay-ghost min-h-[2.75rem] text-sm font-medium",
  statGrid: "grid grid-cols-2 gap-3 sm:grid-cols-4",
  statCell: "rounded-xl border border-border bg-white px-3 py-2.5",
} as const;

export function VoteKpi({
  icon: Icon,
  label,
  value,
  sub,
  iconClass = "text-foreground",
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
  sub?: string;
  iconClass?: string;
}) {
  return (
    <div className={vh.kpi}>
      <div className={vh.kpiRow}>
        <Icon className={`h-4 w-4 shrink-0 ${iconClass}`} />
        <span className={vh.label}>{label}</span>
      </div>
      <p className={vh.kpiValue}>{value}</p>
      {sub && <p className={vh.kpiSub}>{sub}</p>}
    </div>
  );
}

export function VoteNotice({
  icon: Icon,
  children,
  variant = "default",
}: {
  icon?: ComponentType<{ className?: string }>;
  children: ReactNode;
  variant?: "default" | "warn";
}) {
  const box = variant === "warn" ? vh.noticeWarn : vh.notice;
  return (
    <div className={box}>
      {Icon && <Icon className="mt-0.5 h-4 w-4 shrink-0 text-foreground" />}
      <div>{children}</div>
    </div>
  );
}

export function VoteTabs<T extends string>({
  tabs,
  active,
  onChange,
}: {
  tabs: { key: T; label: string }[];
  active: T;
  onChange: (k: T) => void;
}) {
  return (
    <div className={vh.tabRow}>
      {tabs.map((t) => (
        <button
          key={t.key}
          type="button"
          onClick={() => onChange(t.key)}
          className={`${vh.tabBtn} ${active === t.key ? vh.tabActive : vh.tabIdle}`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

export function VoteSection({
  title,
  children,
  action,
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className={vh.section}>
      <div className={`${vh.sectionHead} flex items-center justify-between gap-3`}>
        <p className={vh.label}>{title}</p>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

export function VoteStatGrid({
  items,
}: {
  items: { label: string; value: string; hint?: string }[];
}) {
  return (
    <div className={vh.statGrid}>
      {items.map((item) => (
        <div key={item.label} className={vh.statCell}>
          <p className={vh.label}>{item.label}</p>
          <p className="mt-1 font-display text-lg text-foreground tabular-nums">{item.value}</p>
          {item.hint && <p className="mt-0.5 text-[11px] text-muted-foreground">{item.hint}</p>}
        </div>
      ))}
    </div>
  );
}

export type VoteProposalStatus = "active" | "ended" | "finalized" | "cancelled";

const STATUS_STYLES: Record<
  VoteProposalStatus,
  { label: string; pill: string; rail: string }
> = {
  active: {
    label: "Open for voting",
    pill: "bg-white text-foreground border-foreground/20",
    rail: "border-l-foreground",
  },
  ended: {
    label: "Awaiting finalization",
    pill: "bg-amber-50 text-amber-950 border-amber-500/25",
    rail: "border-l-amber-500",
  },
  finalized: {
    label: "Results available",
    pill: "bg-foreground text-background border-foreground",
    rail: "border-l-foreground",
  },
  cancelled: {
    label: "Cancelled",
    pill: "bg-destructive/10 text-destructive border-destructive/25",
    rail: "border-l-destructive",
  },
};

export function VoteStatusPill({ status }: { status: VoteProposalStatus }) {
  const cfg = STATUS_STYLES[status];
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${cfg.pill}`}>
      {cfg.label}
    </span>
  );
}

export function VoteFormField({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div>
        <label className="text-sm font-semibold text-foreground">{label}</label>
        {hint && <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{hint}</p>}
      </div>
      {children}
    </div>
  );
}

export function VoteWizardSteps({
  steps,
  current,
}: {
  steps: { id: string; label: string; description: string }[];
  current: number;
}) {
  return (
    <div className="rounded-2xl border border-border bg-white p-4 sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        {steps.map((step, index) => {
          const done = index < current;
          const active = index === current;
          return (
            <div key={step.id} className="flex min-w-0 flex-1 items-start gap-3">
              <div
                className={cn(
                  "grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-semibold",
                  done && "bg-foreground text-background",
                  active && !done && "bg-foreground text-background",
                  !done && !active && "border border-border bg-white text-muted-foreground",
                )}
              >
                {done ? "✓" : index + 1}
              </div>
              <div className="min-w-0 pt-0.5">
                <p className={cn("text-xs font-semibold", active ? "text-foreground" : "text-muted-foreground")}>
                  {step.label}
                </p>
                <p className="mt-0.5 hidden text-[11px] leading-relaxed text-muted-foreground sm:block">
                  {step.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-4 h-1 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-foreground transition-all duration-300"
          style={{ width: `${((current + 1) / steps.length) * 100}%` }}
        />
      </div>
    </div>
  );
}

export function VotePanelHeader({
  icon: Icon,
  title,
  subtitle,
  badge,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  subtitle: string;
  badge?: string;
}) {
  return (
    <div className="flex items-start gap-3 border-b border-border pb-4">
      <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-border bg-white">
        <Icon className="h-5 w-5 text-foreground" />
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="font-display text-lg font-semibold leading-tight text-foreground">{title}</h3>
        <p className="mt-1 text-sm text-foreground/70">{subtitle}</p>
      </div>
      {badge && (
        <span className="shrink-0 rounded-full border border-border bg-muted px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          {badge}
        </span>
      )}
    </div>
  );
}

export function VoteTimelineRow({
  rail,
  children,
}: {
  rail: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="relative pl-8">
      <div className="absolute left-[11px] top-0 bottom-0 w-px bg-border last:hidden" aria-hidden />
      <div className="absolute left-0 top-3">{rail}</div>
      <div className="pb-4">{children}</div>
    </div>
  );
}
