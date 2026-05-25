import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect } from "react";
import { AlertTriangle, ArrowRight, CheckCircle2, ChevronRight, Eye, EyeOff, Inbox, Info, Lock, Send, Shield, X } from "lucide-react";
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

// ── HarmonySubNav ──────────────────────────────────────────────────────────

/**
 * W5P1.8 — Chip-style sub-navigation strip rendered inside a top tab.
 * Only ONE workspace panel is visible at a time. Drives nested workspace UX.
 */
export function HarmonySubNav<T extends string>({
  value,
  onChange,
  items,
  className,
}: {
  value: T;
  onChange: (next: T) => void;
  items: { key: T; label: string; icon?: LucideIcon; badge?: string | number }[];
  className?: string;
}) {
  return (
    <nav
      className={cn(
        "-mx-2 flex items-center gap-1 overflow-x-auto px-2 pb-1",
        "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className,
      )}
      role="tablist"
    >
      {items.map((item) => {
        const active = item.key === value;
        const Icon = item.icon;
        return (
          <button
            key={item.key}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(item.key)}
            className={cn(
              "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[12px] font-medium transition-colors",
              active
                ? "bg-foreground text-background"
                : "hairline text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {Icon && <Icon className="h-3.5 w-3.5" />}
            <span>{item.label}</span>
            {item.badge !== undefined && item.badge !== "" && (
              <span
                className={cn(
                  "ml-0.5 inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full px-1 font-mono text-[10px]",
                  active
                    ? "bg-background/20 text-background"
                    : "bg-muted text-foreground/70",
                )}
              >
                {item.badge}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}

/**
 * Harmony-styled select. Replaces PrettySelect / any dark-bg select.
 * Inherits the ivory background and hairline border of the design system.
 */
export function HarmonySelect({
  value,
  onChange,
  children,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("relative inline-block", className)}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 appearance-none rounded-lg hairline bg-background px-3 pr-8 font-mono text-[12px] text-foreground focus:outline-none focus:ring-2 focus:ring-accent/40 min-w-[160px] cursor-pointer"
      >
        {children}
      </select>
      <svg
        className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground"
        viewBox="0 0 12 12"
        fill="none"
      >
        <path
          d="M3 4.5L6 7.5L9 4.5"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

// ── HarmonyStatusBanner ────────────────────────────────────────────────────

/**
 * Sticky status banner (network-mismatch, CoFHE degradation, etc.)
 * variant: "warning" = amber, "error" = red, "info" = neutral
 */
export function HarmonyStatusBanner({
  variant = "warning",
  icon,
  message,
  action,
  onDismiss,
}: {
  variant?: "warning" | "error" | "info";
  icon?: ReactNode;
  message: string;
  action?: { label: string; onClick: () => void };
  onDismiss?: () => void;
}) {
  const cls =
    variant === "warning"
      ? "border-amber-400/40 bg-amber-50 text-amber-900"
      : variant === "error"
        ? "border-destructive/30 bg-destructive/5 text-destructive"
        : "border-border bg-muted text-foreground";

  const DefaultIcon =
    variant === "warning" ? AlertTriangle : variant === "error" ? AlertTriangle : Info;

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-xl border px-4 py-3 text-sm",
        cls,
      )}
    >
      <span className="shrink-0">{icon ?? <DefaultIcon className="h-4 w-4" />}</span>
      <span className="flex-1 leading-snug">{message}</span>
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="shrink-0 font-medium underline underline-offset-2 hover:no-underline"
        >
          {action.label}
        </button>
      )}
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 rounded-full p-1 hover:bg-black/10"
          aria-label="Dismiss"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

// ── HarmonyFreshnessStrip ──────────────────────────────────────────────────

/**
 * Small "Synced · Checked HH:MM:SS · [↺]" strip at the top of async lists.
 */
export function HarmonyFreshnessStrip({
  checkedAt,
  onRefresh,
  refreshing,
}: {
  checkedAt: Date | null;
  onRefresh: () => void;
  refreshing?: boolean;
}) {
  const timeStr = checkedAt
    ? checkedAt.toLocaleTimeString(undefined, {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    : null;
  return (
    <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground/40">
      {timeStr ? (
        <>
          <span className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--success))]" />
          <span>Synced · Checked {timeStr}</span>
        </>
      ) : (
        <span>Not yet synced</span>
      )}
      <button
        type="button"
        onClick={onRefresh}
        disabled={refreshing}
        aria-label="Refresh"
        className="ml-1 hover:text-foreground disabled:opacity-50 transition-colors"
      >
        {refreshing ? "…" : "↺"}
      </button>
    </div>
  );
}

// ── HarmonyRevealChip ──────────────────────────────────────────────────────

/**
 * Countdown chip shown while a balance is revealed.
 * Turns amber when secondsLeft < 60.
 */
export function HarmonyRevealChip({
  secondsLeft,
  onHide,
}: {
  secondsLeft: number;
  onHide?: () => void;
}) {
  const mm = Math.floor(secondsLeft / 60);
  const ss = secondsLeft % 60;
  const label = `Hidden again in ${mm}:${String(ss).padStart(2, "0")}`;
  const isUrgent = secondsLeft < 60;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.15em]",
        isUrgent
          ? "bg-amber-100 text-amber-800"
          : "bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]",
      )}
    >
      {label}
      {onHide && (
        <button type="button" onClick={onHide} className="hover:opacity-70">
          <X className="h-2.5 w-2.5" />
        </button>
      )}
    </span>
  );
}

// ── HarmonyCheckCircle ─────────────────────────────────────────────────────

export function HarmonySuccessChip({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-[hsl(var(--success))]/10 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.15em] text-[hsl(var(--success))]">
      <CheckCircle2 className="h-3 w-3" />
      {label}
    </span>
  );
}

// ── HarmonyDrawer ──────────────────────────────────────────────────────────
/**
 * W5P1.9 — Right-side slide-in drawer for create/edit flows.
 * Replaces inline create-forms in workspace sub-tabs.
 * Pattern reference: Linear "create issue", Stripe Connect onboarding.
 */
export function HarmonyDrawer({
  open,
  onClose,
  title,
  eyebrow,
  width = "md",
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  eyebrow?: string;
  width?: "sm" | "md" | "lg";
  children: ReactNode;
  footer?: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  const widthClass =
    width === "sm" ? "max-w-[420px]" : width === "lg" ? "max-w-[640px]" : "max-w-[520px]";

  return (
    <div className="fixed inset-0 z-[60] flex" role="dialog" aria-modal="true">
      <button
        type="button"
        aria-label="Close drawer"
        onClick={onClose}
        className="absolute inset-0 bg-foreground/30 backdrop-blur-[2px] transition-opacity"
      />
      <div
        className={cn(
          "relative ml-auto flex h-full w-full flex-col bg-card shadow-2xl",
          widthClass,
          "animate-in slide-in-from-right duration-200",
        )}
      >
        <header className="flex items-start justify-between border-b border-border px-6 py-5">
          <div>
            {eyebrow && (
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                {eyebrow}
              </p>
            )}
            <h2 className="mt-1 font-display text-2xl text-foreground">{title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid h-9 w-9 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer && (
          <footer className="border-t border-border px-6 py-4">{footer}</footer>
        )}
      </div>
    </div>
  );
}

// ── HarmonyActionTile ──────────────────────────────────────────────────────
/**
 * W5P1.9 — Compact square-ish action tile, icon over label.
 * Used in Mission Control quick-actions row.
 */
export function HarmonyActionTile({
  icon: Icon,
  label,
  sublabel,
  onClick,
  badge,
}: {
  icon: LucideIcon;
  label: string;
  sublabel?: string;
  onClick?: () => void;
  badge?: string | number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative flex h-full flex-col items-start justify-between rounded-xl hairline bg-card p-4 text-left transition-all hover:bg-muted hover:-translate-y-0.5"
    >
      <div className="flex w-full items-center justify-between">
        <span className="grid h-8 w-8 place-items-center rounded-full bg-muted text-foreground">
          <Icon className="h-4 w-4" />
        </span>
        {badge !== undefined && badge !== "" && (
          <span className="rounded-full bg-foreground px-2 py-0.5 font-mono text-[10px] text-background">
            {badge}
          </span>
        )}
      </div>
      <div className="mt-4">
        <p className="text-sm font-medium text-foreground">{label}</p>
        {sublabel && (
          <p className="mt-0.5 text-xs text-muted-foreground">{sublabel}</p>
        )}
      </div>
    </button>
  );
}

// ── HarmonyMissionHero ─────────────────────────────────────────────────────
/**
 * W5P1.9 — State-driven hero card with ONE primary CTA.
 * Drives onboarding progression; replaces 5-banner stack on Home.
 */
export function HarmonyMissionHero({
  eyebrow,
  headline,
  description,
  primaryCta,
  secondaryCta,
  progress,
}: {
  eyebrow: string;
  headline: string;
  description?: string;
  primaryCta: { label: string; icon?: LucideIcon; onClick: () => void; disabled?: boolean };
  secondaryCta?: { label: string; onClick: () => void };
  progress?: { current: number; total: number; labels?: string[] };
}) {
  const PrimaryIcon = primaryCta.icon ?? ArrowRight;
  return (
    <section className="rounded-2xl hairline bg-card p-6 sm:p-8">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-xl">
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
            {eyebrow}
          </p>
          <h1 className="mt-3 font-display text-3xl leading-tight text-foreground sm:text-4xl">
            {headline}
          </h1>
          {description && (
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              {description}
            </p>
          )}
          {progress && (
            <div className="mt-5 flex items-center gap-1.5">
              {Array.from({ length: progress.total }).map((_, i) => (
                <span
                  key={i}
                  className={cn(
                    "h-1 w-8 rounded-full",
                    i < progress.current
                      ? "bg-foreground"
                      : i === progress.current
                        ? "bg-foreground/60"
                        : "bg-muted",
                  )}
                />
              ))}
              <span className="ml-3 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Step {Math.min(progress.current + 1, progress.total)} of {progress.total}
              </span>
            </div>
          )}
        </div>
        <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
          {secondaryCta && (
            <button
              type="button"
              onClick={secondaryCta.onClick}
              className="inline-flex h-10 items-center justify-center gap-1.5 rounded-full px-4 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {secondaryCta.label}
            </button>
          )}
          <button
            type="button"
            onClick={primaryCta.onClick}
            disabled={primaryCta.disabled}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-foreground px-5 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            {primaryCta.label}
            <PrimaryIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
    </section>
  );
}

// ── HarmonyMetricRow ───────────────────────────────────────────────────────
/**
 * W5P1.9 — Compact horizontal metric strip. Used as workspace summary.
 */
export function HarmonyMetricRow({
  items,
  className,
}: {
  items: { label: string; value: ReactNode; cipher?: boolean }[];
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-baseline gap-x-8 gap-y-3 rounded-xl hairline bg-card px-5 py-4",
        className,
      )}
    >
      {items.map((it) => (
        <div key={it.label} className="flex flex-col">
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            {it.label}
          </span>
          <span
            className={cn(
              "mt-1 font-display text-lg text-foreground",
              it.cipher && "cipher-shimmer text-muted-foreground",
            )}
          >
            {it.value}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── HarmonyActivityRow ─────────────────────────────────────────────────────
/**
 * W5P1.9 — Single-line activity row. Dense, no chips, no badges.
 */
export function HarmonyActivityRow({
  icon: Icon,
  title,
  meta,
  value,
  time,
  onClick,
}: {
  icon: LucideIcon;
  title: string;
  meta?: string;
  value: ReactNode;
  time?: string;
  onClick?: () => void;
}) {
  const Element = onClick ? "button" : "div";
  return (
    <Element
      {...(onClick ? { type: "button" as const, onClick } : {})}
      className={cn(
        "grid w-full grid-cols-12 items-center border-b border-border px-5 py-3 text-left last:border-0",
        onClick && "transition-colors hover:bg-muted/40",
      )}
    >
      <div className="col-span-6 flex items-center gap-3 min-w-0">
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-muted text-foreground">
          <Icon className="h-3.5 w-3.5" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium capitalize text-foreground">
            {title}
          </p>
          {meta && (
            <p className="truncate font-mono text-[11px] text-muted-foreground">
              {meta}
            </p>
          )}
        </div>
      </div>
      <div className="col-span-4 text-right font-mono text-sm text-foreground">
        {value}
      </div>
      <div className="col-span-2 text-right font-mono text-[11px] text-muted-foreground">
        {time}
        {onClick && (
          <ChevronRight className="ml-1 inline h-3 w-3 align-middle text-muted-foreground/60" />
        )}
      </div>
    </Element>
  );
}

// ── HarmonyWorkspaceHeader ────────────────────────────────────────────────
/**
 * W5P1.9 — Standard workspace title block for automations sub-tabs.
 * Title left, primary CTA right.
 */
export function HarmonyWorkspaceHeader({
  eyebrow,
  title,
  description,
  cta,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  cta?: { label: string; icon?: LucideIcon; onClick: () => void };
}) {
  const Icon = cta?.icon;
  return (
    <header className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow && (
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            {eyebrow}
          </p>
        )}
        <h2 className="mt-1 font-display text-2xl text-foreground">{title}</h2>
        {description && (
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {cta && (
        <button
          type="button"
          onClick={cta.onClick}
          className="inline-flex h-10 items-center gap-2 rounded-full bg-foreground px-4 text-sm font-medium text-background transition-opacity hover:opacity-90"
        >
          {Icon && <Icon className="h-4 w-4" />}
          {cta.label}
        </button>
      )}
    </header>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
 * W5P1.9.1 — Form density + privacy storytelling primitives
 * ──────────────────────────────────────────────────────────────────────────── */

/** 2-col responsive grid for paired form fields. Collapses to 1 col on mobile. */
export function HarmonyFieldGrid({
  cols = 2,
  children,
  className,
}: {
  cols?: 1 | 2;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid gap-x-3 gap-y-3",
        cols === 2 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1",
        className
      )}
    >
      {children}
    </div>
  );
}

/** Sentence-case label + input slot + optional helper text. */
export function HarmonyField({
  label,
  helper,
  htmlFor,
  children,
  className,
}: {
  label?: string;
  helper?: string;
  htmlFor?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      {label && (
        <label
          htmlFor={htmlFor}
          className="block text-[11px] font-medium text-muted-foreground"
        >
          {label}
        </label>
      )}
      {children}
      {helper && (
        <p className="text-[11px] text-muted-foreground/65 leading-snug">{helper}</p>
      )}
    </div>
  );
}

/** Sticky-feeling drawer footer with cancel + primary submit. */
export function HarmonyDrawerFooter({
  cancelLabel = "Cancel",
  onCancel,
  primaryLabel,
  onPrimary,
  primaryDisabled,
  primaryLoading,
  extra,
}: {
  cancelLabel?: string;
  onCancel?: () => void;
  primaryLabel: string;
  onPrimary?: () => void;
  primaryDisabled?: boolean;
  primaryLoading?: boolean;
  extra?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-end gap-2 pt-4 mt-2 border-t border-border/60">
      {extra && <div className="mr-auto text-[11px] text-muted-foreground">{extra}</div>}
      {onCancel && (
        <button type="button" onClick={onCancel} className="btn-pay btn-pay-ghost">
          {cancelLabel}
        </button>
      )}
      <button
        type={onPrimary ? "button" : "submit"}
        onClick={onPrimary}
        disabled={primaryDisabled || primaryLoading}
        className="btn-pay btn-pay-primary"
      >
        {primaryLoading ? "Working…" : primaryLabel}
      </button>
    </div>
  );
}

/** Masked/private balance display with optional reveal toggle. */
export function HarmonyMaskedBalance({
  value,
  symbol,
  label,
  revealed,
  onToggle,
  size = "md",
}: {
  value?: string | null;
  symbol?: string;
  label?: string;
  revealed?: boolean;
  onToggle?: () => void;
  size?: "sm" | "md" | "lg";
}) {
  const sizes = {
    sm: "text-base",
    md: "text-2xl",
    lg: "text-3xl",
  } as const;
  const showValue = revealed && value;
  return (
    <div className="space-y-1">
      {label && (
        <div className="text-[10px] font-medium tracking-wide uppercase text-muted-foreground/70">
          {label}
        </div>
      )}
      <div className="flex items-baseline gap-2">
        <span
          className={cn(
            "font-mono font-medium tabular-nums transition-[filter] duration-300",
            sizes[size],
            !showValue && "tracking-[0.15em]"
          )}
        >
          {showValue ? value : "••••"}
        </span>
        {symbol && (
          <span className="text-xs text-muted-foreground">{symbol}</span>
        )}
        {onToggle && (
          <button
            type="button"
            onClick={onToggle}
            className="ml-1 inline-flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label={revealed ? "Hide balance" : "Reveal balance"}
          >
            {revealed ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          </button>
        )}
      </div>
    </div>
  );
}

/** Small ivory pill: "Hidden on-chain", "Private", etc. */
export function HarmonyPrivacyBadge({
  state = "hidden",
  label,
}: {
  state?: "hidden" | "private" | "revealed" | "encrypted";
  label?: string;
}) {
  const icon =
    state === "revealed" ? <Eye className="h-3 w-3" /> : <Lock className="h-3 w-3" />;
  const defaultLabel =
    label ??
    (state === "hidden"
      ? "Hidden on-chain"
      : state === "private"
      ? "Private"
      : state === "revealed"
      ? "Revealed to you"
      : "Encrypted");
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full bg-muted border border-border px-2 py-0.5 text-[10.5px] font-medium text-foreground/75"
      title={
        state === "revealed"
          ? "Only you can see this value."
          : "Encrypted with FHE — only the owner can decrypt."
      }
    >
      {icon}
      {defaultLabel}
    </span>
  );
}

/** Single-row "posture" strip used beneath Mission Control metric row. */
export function HarmonyPrivacyPosture({
  items,
}: {
  items?: { icon?: LucideIcon; label: string }[];
}) {
  const data = items ?? [
    { icon: Lock, label: "Balance hidden" },
    { icon: Send, label: "Receiving private" },
    { icon: Inbox, label: "Inbox sealed" },
  ];
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-3 mt-3 border-t border-border/60">
      {data.map((it, i) => {
        const Icon = it.icon ?? Shield;
        return (
          <div key={i} className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Icon className="h-3 w-3 text-foreground/55" />
            <span>{it.label}</span>
          </div>
        );
      })}
    </div>
  );
}

/** 5-dot progress trail showing onboarding stage. */
export function HarmonyProgressTrail({
  stages,
  current,
}: {
  stages: string[];
  current: number; // 0-based index
}) {
  return (
    <div className="flex items-center gap-2 pt-2">
      {stages.map((label, i) => {
        const past = i < current;
        const now = i === current;
        return (
          <div key={i} className="flex items-center gap-2">
            <div
              className={cn(
                "h-1.5 w-1.5 rounded-full transition-colors",
                past && "bg-foreground/70",
                now && "ring-2 ring-foreground/40 bg-foreground",
                !past && !now && "bg-border"
              )}
              title={label}
            />
            {i < stages.length - 1 && (
              <div
                className={cn(
                  "h-px w-6 transition-colors",
                  past ? "bg-foreground/40" : "bg-border"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

/** Compact pill selector — replaces emerald-glow pill rows in forms. */
export function HarmonyPillGroup<T extends string | number>({
  options,
  value,
  onChange,
  size = "md",
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  size?: "sm" | "md";
}) {
  return (
    <div className="inline-flex flex-wrap items-center gap-1 rounded-full bg-muted border border-border p-0.5">
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={String(opt.value)}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              "rounded-full transition-colors",
              size === "sm" ? "h-6 px-2 text-[11px]" : "h-7 px-2.5 text-[12px]",
              active
                ? "bg-foreground text-background font-medium"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
