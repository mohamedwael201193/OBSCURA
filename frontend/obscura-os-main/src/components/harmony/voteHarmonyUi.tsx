import type { ComponentType, ReactNode } from "react";

/** Tailwind tokens aligned with obscure-harmony-system Vote page */
export const vh = {
  panel: "vote-harmony-panel space-y-5",
  label: "font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground",
  body: "text-sm leading-relaxed text-muted-foreground",
  emphasis: "font-medium text-foreground",
  kpiGrid: "grid gap-4 sm:grid-cols-2 lg:grid-cols-4",
  kpiGrid2: "grid grid-cols-2 gap-4",
  kpi: "rounded-2xl hairline bg-card p-5",
  kpiRow: "flex items-center gap-2 text-muted-foreground",
  kpiValue: "font-display text-2xl mt-2 text-foreground tabular-nums",
  kpiSub: "mt-1 text-sm text-muted-foreground",
  notice: "rounded-xl hairline bg-muted/50 p-4 flex gap-3 text-sm leading-relaxed text-muted-foreground",
  noticeWarn:
    "rounded-xl border border-amber-500/25 bg-amber-500/8 p-4 flex gap-3 text-sm leading-relaxed text-amber-950",
  tabRow: "flex gap-1 rounded-full hairline bg-muted/60 p-1",
  tabBtn: "flex-1 rounded-full px-3 py-2 text-xs font-medium transition-colors",
  tabActive: "bg-card text-foreground shadow-sm hairline",
  tabIdle: "text-muted-foreground hover:text-foreground",
  listCard: "rounded-2xl hairline bg-card p-4",
  section: "overflow-hidden rounded-2xl hairline bg-card",
  sectionHead: "border-b border-border px-5 py-3.5",
  row: "border-b border-border py-3 last:border-0",
  link: "font-mono text-sm text-[hsl(var(--success))] hover:text-foreground inline-flex items-center gap-1",
  empty: "rounded-2xl hairline bg-card p-10 text-center",
  badgeOk: "rounded-full border border-accent/35 bg-accent/15 px-2 py-0.5 text-xs font-medium text-[hsl(var(--success))]",
  badgeMuted: "rounded-full hairline bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground",
  input: "pay-input w-full",
  btnPrimary: "btn-pay btn-pay-emerald",
  btnGhost: "btn-pay btn-pay-ghost",
} as const;

export function VoteKpi({
  icon: Icon,
  label,
  value,
  sub,
  iconClass = "text-[hsl(var(--success))]",
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
      {Icon && <Icon className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--success))]" />}
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

export type VoteProposalStatus = "active" | "ended" | "finalized" | "cancelled";

const STATUS_STYLES: Record<
  VoteProposalStatus,
  { label: string; pill: string; rail: string }
> = {
  active: {
    label: "Open for voting",
    pill: "bg-[hsl(var(--success))]/12 text-[hsl(var(--success))] border-[hsl(var(--success))]/25",
    rail: "border-l-[hsl(var(--success))]",
  },
  ended: {
    label: "Awaiting finalization",
    pill: "bg-amber-500/10 text-amber-800 border-amber-500/25",
    rail: "border-l-amber-500",
  },
  finalized: {
    label: "Results available",
    pill: "bg-sky-500/10 text-sky-900 border-sky-500/25",
    rail: "border-l-sky-600",
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
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${cfg.pill}`}>
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
        <label className="text-xs font-medium text-foreground">{label}</label>
        {hint && <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">{hint}</p>}
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
    <div className="rounded-2xl border border-border bg-muted/35 p-4 sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        {steps.map((step, index) => {
          const done = index < current;
          const active = index === current;
          return (
            <div key={step.id} className="flex min-w-0 flex-1 items-start gap-3">
              <div
                className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-semibold ${
                  done
                    ? "bg-[hsl(var(--success))]/15 text-[hsl(var(--success))]"
                    : active
                      ? "bg-foreground text-background"
                      : "hairline bg-card text-muted-foreground"
                }`}
              >
                {done ? "✓" : index + 1}
              </div>
              <div className="min-w-0 pt-0.5">
                <p className={`text-xs font-medium ${active ? "text-foreground" : "text-muted-foreground"}`}>
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
          className="h-full rounded-full bg-[hsl(var(--success))] transition-all duration-300"
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
      <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[hsl(var(--accent))]/10 hairline">
        <Icon className="h-5 w-5 text-[hsl(var(--success))]" />
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="font-display text-lg font-semibold leading-tight text-foreground">{title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
      </div>
      {badge && (
        <span className="shrink-0 rounded-full hairline bg-muted px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
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
