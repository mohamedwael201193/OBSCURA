import { cn } from "@/lib/utils";

interface ReceiptTagProps {
  label: string;
  value: React.ReactNode;
  className?: string;
}

export function ReceiptTag({ label, value, className }: ReceiptTagProps) {
  return (
    <div className={cn("receipt-card px-4 py-3 min-w-[220px]", className)}>
      <div className="tag-bracket flex items-center gap-1">
        <span>▸</span>
        <span>{label}</span>
      </div>
      <div className="font-mono text-[13px] leading-snug text-foreground/85 mt-1 whitespace-pre-line">
        {value}
      </div>
    </div>
  );
}

interface MerchantPillProps {
  name: string;
  meta: string;
  amount: string;
  icon?: React.ReactNode;
  accent?: "forest" | "lime" | "deep" | "moss" | "emerald" | "amber" | "rose" | "violet" | "sky";
  className?: string;
}

export function MerchantPill({
  name,
  meta,
  amount,
  icon,
  accent = "forest",
  className,
}: MerchantPillProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-2xl bg-surface-elevated px-4 py-3 shadow-[var(--shadow-float)] border border-border-subtle min-w-[280px]",
        className,
      )}
    >
      <div className={cn("chip-icon size-10 shrink-0", `chip-${accent}`)}>
        {icon ?? <span className="text-sm font-semibold">{name.slice(0, 1)}</span>}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-foreground truncate">{name}</div>
        <div className="font-mono text-[11px] text-muted-foreground truncate">{meta}</div>
      </div>
      <div className="font-display text-xl text-foreground tabular-nums">{amount}</div>
    </div>
  );
}
