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
