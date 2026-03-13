import { cn } from "@/lib/utils";

export function AppShell({
  title,
  tabs,
  active,
  children,
  accent = "green",
}: {
  title: string;
  tabs: string[];
  active: string;
  children: React.ReactNode;
  accent?: "green" | "amber" | "violet";
}) {
  const accentColors = {
    green: "bg-[oklch(0.55_0.15_150)]",
    amber: "bg-[oklch(0.72_0.16_85)]",
    violet: "bg-[oklch(0.55_0.15_290)]",
  };

  return (
    <div className="bg-surface min-h-screen">
      <div className="mx-auto max-w-[1400px] px-6 md:px-8 pt-12 pb-24">
        <div className="flex items-center gap-3 mb-2">
          <div className={cn("size-2.5 rounded-full", accentColors[accent])} />
          <div className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
            ▸ Obscura · {title}
          </div>
        </div>
        <h1 className="font-display text-5xl md:text-6xl tracking-tight">{title}</h1>

        <div className="mt-10 flex gap-1 overflow-x-auto border-b border-border-subtle">
          {tabs.map((t) => (
            <div
              key={t}
              className={cn(
                "px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition",
                t === active
                  ? "border-brand text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {t}
            </div>
          ))}
        </div>

        <div className="mt-10">{children}</div>
      </div>
    </div>
  );
}

export function Card({
  children,
  className,
  title,
  meta,
}: {
  children: React.ReactNode;
  className?: string;
  title?: string;
  meta?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-3xl border border-border-subtle bg-surface-elevated p-6 shadow-[var(--shadow-card)]",
        className,
      )}
    >
      {title && (
        <div className="flex items-center justify-between mb-4">
          <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            ▸ {title}
          </div>
          {meta && <div className="text-[11px] text-muted-foreground">{meta}</div>}
        </div>
      )}
      {children}
    </div>
  );
}

export function EncryptedValue({
  label,
  value,
  hint,
  large = false,
}: {
  label: string;
  value: string;
  hint?: string;
  large?: boolean;
}) {
  return (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div
        className={cn(
          "font-display tabular-nums tracking-tight mt-1",
          large ? "text-5xl md:text-6xl" : "text-2xl",
        )}
      >
        {value}
      </div>
      {hint && (
        <div className="mt-1 inline-flex items-center gap-1.5 text-[11px] text-brand">
          <span className="size-1.5 rounded-full bg-brand" />
          {hint}
        </div>
      )}
    </div>
  );
}
