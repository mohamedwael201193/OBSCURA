import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { payHarmony as h } from "@/components/harmony/payHarmonyClasses";
import { cn } from "@/lib/utils";

export function PayFormHeader({
  icon: Icon,
  title,
  eyebrow,
  badge,
  trailing,
}: {
  icon: LucideIcon;
  title: string;
  eyebrow?: string;
  badge?: ReactNode;
  trailing?: ReactNode;
}) {
  return (
    <div className={h.headerRow}>
      <div className={h.headerIcon}>
        <Icon className={h.iconMuted} />
      </div>
      <div className="min-w-0 flex-1">
        <h3 className={h.headerTitle}>{title}</h3>
        {eyebrow && <p className={cn(h.headerEyebrow, "mt-0.5")}>{eyebrow}</p>}
      </div>
      {badge}
      {trailing}
    </div>
  );
}

export function PayFormShell({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn(h.shell, className)}>{children}</div>;
}
