import { ReactNode } from "react";
import { motion } from "framer-motion";
import { LucideIcon, ArrowRight, ChevronRight } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Card — calm, single-style container                               */
/* ------------------------------------------------------------------ */

export const Card = ({
  children,
  className = "",
  as: Tag = "div",
}: {
  children: ReactNode;
  className?: string;
  as?: any;
}) => (
  <Tag
    className={`relative rounded-xl border border-white/[0.06] bg-white/[0.015] backdrop-blur-sm ${className}`}
  >
    {children}
  </Tag>
);

export const CardHeader = ({
  title,
  eyebrow,
  action,
}: {
  title: string;
  eyebrow?: string;
  action?: ReactNode;
}) => (
  <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-white/[0.05]">
    <div className="flex items-center gap-2 min-w-0">
      {eyebrow && (
        <span className="text-[10px] tracking-[0.22em] uppercase text-emerald-400/80 font-mono">
          {eyebrow}
        </span>
      )}
      <span className="text-[13px] font-display font-semibold text-foreground tracking-wide truncate">
        {title}
      </span>
    </div>
    {action}
  </div>
);

/* ------------------------------------------------------------------ */
/*  ActionGrid — the 6-card module grid (matches reference image)     */
/* ------------------------------------------------------------------ */

export type ActionItem = {
  key: string;
  label: string;
  description: string;
  icon: LucideIcon;
};

export const ActionGrid = ({
  items,
  active,
  onSelect,
}: {
  items: ActionItem[];
  active?: string;
  onSelect: (key: string) => void;
}) => (
  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
    {items.map((item, idx) => {
      const Icon = item.icon;
      const isActive = active === item.key;
      return (
        <motion.button
          key={item.key}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: idx * 0.04, ease: [0.16, 1, 0.3, 1] }}
          onClick={() => onSelect(item.key)}
          className={`group relative text-left rounded-xl border p-4 transition-all overflow-hidden ${
            isActive
              ? "border-emerald-500/40 bg-emerald-500/[0.04]"
              : "border-white/[0.06] bg-white/[0.015] hover:border-emerald-500/20 hover:bg-white/[0.025]"
          }`}
        >
          <div className="flex items-start gap-3">
            <div
              className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border transition-colors ${
                isActive
                  ? "bg-emerald-500/10 border-emerald-500/30"
                  : "bg-white/[0.03] border-white/[0.05] group-hover:bg-emerald-500/[0.06] group-hover:border-emerald-500/20"
              }`}
            >
              <Icon className={`w-[17px] h-[17px] ${isActive ? "text-emerald-400" : "text-foreground/80"}`} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-display font-semibold text-foreground leading-tight mb-1">
                {item.label}
              </div>
              <div className="text-[11px] text-muted-foreground/65 leading-snug">
                {item.description}
              </div>
            </div>
          </div>
          {/* subtle bottom hover line */}
          <div
            className={`absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent transition-opacity ${
              isActive ? "opacity-100" : "opacity-0 group-hover:opacity-60"
            }`}
          />
        </motion.button>
      );
    })}
  </div>
);

/* ------------------------------------------------------------------ */
/*  HowItWorks — numbered steps panel (matches reference image)       */
/* ------------------------------------------------------------------ */

export type Step = {
  title: string;
  description: ReactNode;
};

export const HowItWorks = ({
  title,
  subtitle,
  steps,
  footnote,
}: {
  title: string;
  subtitle?: string;
  steps: Step[];
  footnote?: ReactNode;
}) => (
  <Card className="overflow-hidden">
    <CardHeader title={title} eyebrow={subtitle} />
    <div className="p-5 space-y-3">
      {steps.map((step, idx) => (
        <motion.div
          key={idx}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.35, delay: idx * 0.05 }}
          className="flex items-start gap-3 px-1"
        >
          <div className="w-6 h-6 rounded-md bg-emerald-500/[0.08] border border-emerald-500/20 flex items-center justify-center shrink-0 mt-0.5">
            <span className="text-[11px] font-mono text-emerald-300">{idx + 1}</span>
          </div>
          <div className="flex-1 pt-0.5">
            <div className="text-[13px] text-foreground/95 leading-snug">
              <span className="font-display font-semibold text-foreground">{step.title}</span>{" "}
              <span className="text-muted-foreground/75">— {step.description}</span>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
    {footnote && (
      <div className="px-5 pb-4 -mt-1">
        <div className="text-[11px] text-muted-foreground/55 leading-relaxed border-t border-white/[0.05] pt-3">
          {footnote}
        </div>
      </div>
    )}
  </Card>
);

/* ------------------------------------------------------------------ */
/*  PageHeader — breadcrumb + title + lede                            */
/* ------------------------------------------------------------------ */

export const PageHeader = ({
  breadcrumb,
  title,
  lede,
  badge,
}: {
  breadcrumb: string[];
  title: ReactNode;
  lede: ReactNode;
  badge?: ReactNode;
}) => (
  <div className="mb-7">
    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground/55 mb-3">
      {breadcrumb.map((b, i) => (
        <span key={i} className="flex items-center gap-1.5">
          {i > 0 && <ChevronRight className="w-3 h-3 opacity-50" />}
          <span className={i === breadcrumb.length - 1 ? "text-foreground/80" : ""}>{b}</span>
        </span>
      ))}
    </div>
    <h1 className="font-display text-[34px] sm:text-[40px] leading-[1.05] tracking-tight font-semibold text-foreground mb-3">
      {title}
    </h1>
    <p className="text-[13.5px] text-muted-foreground/75 leading-relaxed max-w-xl">{lede}</p>
    {badge && <div className="mt-4">{badge}</div>}
  </div>
);

/* ------------------------------------------------------------------ */
/*  FeatureStrip — bottom 4 feature cards                             */
/* ------------------------------------------------------------------ */

export type FeatureItem = {
  icon: LucideIcon;
  title: string;
  description: string;
};

export const FeatureStrip = ({ items }: { items: FeatureItem[] }) => (
  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
    {items.map((f) => {
      const Icon = f.icon;
      return (
        <Card key={f.title} className="p-4">
          <div className="flex items-start gap-2.5">
            <div className="w-7 h-7 rounded-md bg-emerald-500/[0.08] border border-emerald-500/15 flex items-center justify-center shrink-0">
              <Icon className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="min-w-0">
              <div className="text-[12px] font-display font-semibold text-foreground leading-tight mb-1">
                {f.title}
              </div>
              <div className="text-[10.5px] text-muted-foreground/65 leading-snug">
                {f.description}
              </div>
            </div>
          </div>
        </Card>
      );
    })}
  </div>
);

/* ------------------------------------------------------------------ */
/*  LinkRow — used inside NEED HELP cards                             */
/* ------------------------------------------------------------------ */

export const LinkRow = ({
  icon: Icon,
  title,
  description,
  to,
  external,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  to: string;
  external?: boolean;
}) => {
  const Tag: any = external ? "a" : "a";
  const props = external
    ? { href: to, target: "_blank", rel: "noopener noreferrer" }
    : { href: to };
  return (
    <Tag
      {...props}
      className="group flex items-center gap-3 p-3 rounded-md bg-white/[0.015] border border-white/[0.05] hover:border-emerald-500/20 hover:bg-white/[0.025] transition-all"
    >
      <div className="w-8 h-8 rounded-md bg-emerald-500/[0.06] border border-emerald-500/15 flex items-center justify-center shrink-0">
        <Icon className="w-3.5 h-3.5 text-emerald-400" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[12px] font-medium text-foreground leading-tight">{title}</div>
        <div className="text-[10.5px] text-muted-foreground/60 truncate">{description}</div>
      </div>
      <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all" />
    </Tag>
  );
};
