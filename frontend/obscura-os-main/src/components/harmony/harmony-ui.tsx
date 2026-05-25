import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function HarmonyAction({
  icon: Icon,
  label,
  primary,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  primary?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-medium transition-colors",
        primary ? "bg-foreground text-background" : "hairline hover:bg-muted",
      )}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

export function HarmonyStat({
  label,
  value,
  cipher,
}: {
  label: string;
  value: ReactNode;
  cipher?: boolean;
}) {
  return (
    <div>
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
      <p className={cn("mt-1 font-display text-xl", cipher && "cipher-shimmer text-muted-foreground")}>{value}</p>
    </div>
  );
}

export function HarmonySection({
  title,
  hint,
  children,
  className,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("mt-14", className)}>
      <div className="mb-5 flex items-end justify-between gap-4">
        <h2 className="font-display text-3xl">{title}</h2>
        {hint && <p className="text-sm text-muted-foreground">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

export function HarmonyKpiGrid({ children }: { children: ReactNode }) {
  return (
    <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{children}</div>
  );
}

export function HarmonyKpi({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl hairline bg-card p-5">
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
      <div className="mt-3">{children}</div>
    </div>
  );
}

export function HarmonyPageIntro({
  eyebrow,
  title,
  actions,
}: {
  eyebrow: string;
  title: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-6">
      <div>
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">{eyebrow}</p>
        <h1 className="mt-2 font-display text-5xl leading-none md:text-6xl">{title}</h1>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function HarmonyFormCard({
  title,
  eyebrow,
  children,
  className,
  noPadding,
}: {
  title?: string;
  eyebrow?: string;
  children: ReactNode;
  className?: string;
  /** Set when children include their own padded header (e.g. StealthInbox). */
  noPadding?: boolean;
}) {
  return (
    <div className={cn("overflow-hidden rounded-2xl hairline bg-card", className)}>
      {(title || eyebrow) && (
        <div className="border-b border-border p-6">
          {eyebrow && (
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{eyebrow}</p>
          )}
          {title && <p className="mt-1 font-display text-2xl">{title}</p>}
        </div>
      )}
      <div className={cn(!noPadding && "p-6", "harmony-form-inner")}>{children}</div>
    </div>
  );
}

export function HarmonyDarkPanel({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-foreground p-6 text-background">
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] opacity-70">{eyebrow}</p>
      <p className="mt-4 font-display text-3xl leading-tight">{title}</p>
      {description && <p className="mt-3 text-sm opacity-70">{description}</p>}
      {children}
    </div>
  );
}
