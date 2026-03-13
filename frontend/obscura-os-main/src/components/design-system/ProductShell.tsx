import { ReactNode } from "react";
import { motion } from "framer-motion";
import { LucideIcon, Lock, RadioTower } from "lucide-react";
import { cn } from "@/lib/utils";
import AppIconRail, { type AppModuleKey } from "./AppIconRail";
import AppTopBar from "./AppTopBar";

export type ProductAccent = "pay" | "credit" | "vote" | "system";

const accentClasses: Record<ProductAccent, {
  text: string;
  bg: string;
  border: string;
  dot: string;
}> = {
  pay: {
    text: "text-emerald-700",
    bg: "bg-emerald-50",
    border: "border-emerald-200/80",
    dot: "bg-emerald-500",
  },
  credit: {
    text: "text-violet-700",
    bg: "bg-violet-50",
    border: "border-violet-200/80",
    dot: "bg-violet-500",
  },
  vote: {
    text: "text-amber-800",
    bg: "bg-amber-50",
    border: "border-amber-200/80",
    dot: "bg-amber-500",
  },
  system: {
    text: "text-forest/70",
    bg: "bg-sage-2",
    border: "border-forest/12",
    dot: "bg-lime-accent",
  },
};

/** Shared flat panel — minimal, no glass */
export const appPanelClass =
  "rounded-2xl border border-forest/10 bg-white";

export function ProductShell({
  children,
  sidebar,
  maxWidth = "max-w-6xl",
  module = "pay",
  searchPlaceholder,
}: {
  children: ReactNode;
  sidebar?: ReactNode;
  maxWidth?: string;
  module?: AppModuleKey;
  searchPlaceholder?: string;
  productLabel?: string;
}) {
  return (
    <div className="obscura-app min-h-screen bg-sage-1 text-forest antialiased">
      <div className="flex min-h-screen">
        <AppIconRail active={module} />
        {sidebar}
        <div className="flex min-w-0 flex-1 flex-col">
          <AppTopBar searchPlaceholder={searchPlaceholder} />
          <main className={cn("mx-auto w-full flex-1 px-4 py-6 pb-20 sm:px-6 lg:px-8", maxWidth)}>
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}

export function ProductHeader({
  eyebrow,
  title,
  description,
  accent: _accent = "system",
  actions,
  children,
}: {
  eyebrow: string;
  title: ReactNode;
  description: ReactNode;
  accent?: ProductAccent;
  actions?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <motion.header
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="mb-8 border-b border-forest/10 pb-8"
    >
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.22em] text-forest/40">
            {eyebrow}
          </p>
          <h1 className="font-editorial text-[2.5rem] font-medium leading-[1.02] tracking-tight text-forest sm:text-5xl">
            {title}
          </h1>
          {description && (
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-forest/55 sm:text-[15px]">
              {description}
            </p>
          )}
          {children && <div className="mt-5">{children}</div>}
        </div>
        {actions && <div className="shrink-0">{actions}</div>}
      </div>
    </motion.header>
  );
}

export function SurfaceCard({
  children,
  className,
  dark = false,
}: {
  children: ReactNode;
  className?: string;
  accent?: ProductAccent;
  interactive?: boolean;
  dark?: boolean;
}) {
  return (
    <div
      className={cn(
        dark
          ? "rounded-2xl border border-forest bg-forest text-sage-1"
          : appPanelClass,
        className,
      )}
    >
      {children}
    </div>
  );
}

export function MetricTile({
  label,
  value,
  helper,
  icon: Icon,
  masked,
}: {
  label: string;
  value: ReactNode;
  helper?: string;
  accent?: ProductAccent;
  icon?: LucideIcon;
  masked?: boolean;
}) {
  return (
    <div className={cn(appPanelClass, "p-5")}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-forest/40">{label}</div>
          <div className={cn("mt-2 font-editorial text-2xl font-medium tracking-tight text-forest", masked && "tracking-[0.14em]")}>
            {value}
          </div>
          {helper && <div className="mt-1 text-[11px] leading-relaxed text-forest/45">{helper}</div>}
        </div>
        {Icon && (
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-forest/10 bg-sage-1">
            <Icon className="h-4 w-4 text-forest/55" />
          </div>
        )}
      </div>
    </div>
  );
}

export function PrivacyBadge({
  children,
  accent = "system",
  icon: Icon = Lock,
}: {
  children: ReactNode;
  accent?: ProductAccent;
  icon?: LucideIcon;
}) {
  const accentStyle = accentClasses[accent];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10.5px] font-medium", accentStyle.bg, accentStyle.border, accentStyle.text)}>
      <Icon className="h-3.5 w-3.5" />
      {children}
    </span>
  );
}

export function TransactionLifecycle({
  accent = "system",
  steps = ["Prepare", "Encrypt", "Sign", "Submit", "Settle"],
  title = "Transaction lifecycle",
  subtitle = "Narrated, end-to-end. Always clear what's encrypted.",
}: {
  accent?: ProductAccent;
  steps?: string[];
  title?: string;
  subtitle?: string;
}) {
  const accentStyle = accentClasses[accent];
  const labels = ["Local", "Sealed", "Compute", "Onchain", "Settle"];
  return (
    <section className={cn(appPanelClass, "p-6")}>
      <div className="mb-5 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-editorial text-2xl font-medium tracking-tight text-forest">{title}</h2>
          <p className="mt-1 text-sm text-forest/50">{subtitle}</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-forest/45">
          <RadioTower className="h-3.5 w-3.5" />
          FHE pipeline
        </div>
      </div>
      <div className="grid gap-2 sm:grid-cols-5">
        {steps.map((step, idx) => (
          <div key={step} className="rounded-xl border border-forest/10 bg-sage-1 p-3.5">
            <div className="mb-2 flex items-center justify-between">
              <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-forest/35">
                {labels[idx] ?? "Step"}
              </span>
              <span className="font-mono text-[9px] text-forest/30">0{idx + 1}</span>
            </div>
            <div className={cn("mb-2 h-0.5 rounded-full", idx === 0 ? accentStyle.dot : "bg-forest/10")} />
            <div className="text-xs font-medium text-forest">{step}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function ProductNavTabs<T extends string>({
  items,
  active,
  onChange,
}: {
  items: { key: T; label: string; icon?: ReactNode }[];
  active: T;
  onChange: (key: T) => void;
  accent?: ProductAccent;
}) {
  return (
    <div className="flex items-center gap-0.5 overflow-x-auto rounded-xl border border-forest/10 bg-sage-2 p-1">
      {items.map((item) => {
        const isActive = active === item.key;
        return (
          <button
            key={item.key}
            onClick={() => onChange(item.key)}
            className={cn(
              "flex min-w-max flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-colors",
              isActive ? "bg-white text-forest" : "text-forest/45 hover:text-forest/75",
            )}
          >
            {item.icon}
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

export function PrimaryButton({
  children,
  className,
  onClick,
  type = "button",
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-full bg-forest px-5 py-2.5 text-sm font-medium text-sage-1 transition-opacity hover:opacity-90",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function SecondaryButton({
  children,
  className,
  onClick,
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-full border border-forest/15 bg-white px-5 py-2.5 text-sm font-medium text-forest transition-colors hover:border-forest/25",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function AccentButton({
  children,
  className,
  onClick,
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-full bg-lime-accent px-5 py-2.5 text-sm font-semibold text-forest transition-opacity hover:opacity-90",
        className,
      )}
    >
      {children}
    </button>
  );
}

export const productAccentClasses = accentClasses;
