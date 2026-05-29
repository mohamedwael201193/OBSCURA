import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export function VoteCollapsibleSection({
  title,
  eyebrow,
  badge,
  defaultOpen = false,
  open: controlledOpen,
  onOpenChange,
  children,
}: {
  title: string;
  eyebrow?: string;
  badge?: string;
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: ReactNode;
}) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const open = controlledOpen ?? internalOpen;
  const setOpen = (value: boolean | ((prev: boolean) => boolean)) => {
    const next = typeof value === "function" ? value(open) : value;
    onOpenChange?.(next);
    if (controlledOpen === undefined) setInternalOpen(next);
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-[0_1px_3px_hsl(145_18%_12%/0.06)]">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full min-h-[56px] items-center justify-between gap-3 px-5 py-4 text-left hover:bg-muted/20"
        aria-expanded={open}
      >
        <div>
          {eyebrow && (
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{eyebrow}</p>
          )}
          <p className="font-display text-base font-semibold text-foreground">{title}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {badge && (
            <span className="hidden rounded-full border border-foreground bg-foreground px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-background sm:inline">
              {badge}
            </span>
          )}
          <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", open && "rotate-180")} />
        </div>
      </button>
      {open && <div className="border-t border-border px-5 py-5">{children}</div>}
    </div>
  );
}
