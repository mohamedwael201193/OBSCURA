import { ElementType, ReactNode } from "react";
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
  as?: ElementType;
}) => (
  <Tag
    className={`rounded-2xl border border-forest/10 bg-white ${className}`}
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
  <div className="flex items-center justify-between gap-4 border-b border-forest/8 px-5 pb-3 pt-4">
    <div className="min-w-0">
      {eyebrow && (
        <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.22em] text-forest/40">
          {eyebrow}
        </div>
      )}
      <div className="truncate font-spadeDisplay text-[14px] font-semibold tracking-tight text-forest">
        {title}
      </div>
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
          className={`group rounded-2xl border p-4 text-left transition-colors ${
            isActive
              ? "border-forest/20 bg-white"
              : "border-forest/10 bg-white hover:border-forest/18"
          }`}
        >
          <div className="flex items-start gap-3">
            <div
              className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border transition-colors ${
                isActive
                  ? "bg-emerald-500/12 border-emerald-500/30"
                  : "bg-sage-1 border-forest/8 group-hover:bg-emerald-500/[0.06] group-hover:border-emerald-500/20"
              }`}
            >
              <Icon className={`w-[17px] h-[17px] ${isActive ? "text-emerald-700" : "text-forest/70"}`} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-display font-semibold text-forest leading-tight mb-1">
                {item.label}
              </div>
              <div className="text-[11px] text-forest/50 leading-snug">
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
            <span className="text-[11px] font-mono text-emerald-700">{idx + 1}</span>
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
        <div className="text-[11px] text-forest/45 leading-relaxed border-t border-forest/8 pt-3">
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
    <div className="mb-3 flex items-center gap-1.5 text-[11px] text-forest/40">
      {breadcrumb.map((b, i) => (
        <span key={i} className="flex items-center gap-1.5">
          {i > 0 && <ChevronRight className="w-3 h-3 opacity-50" />}
          <span className={i === breadcrumb.length - 1 ? "text-forest/80" : ""}>{b}</span>
        </span>
      ))}
    </div>
    <h1 className="mb-3 font-editorial text-[34px] font-medium leading-[1.05] tracking-tight text-forest sm:text-[42px]">
      {title}
    </h1>
    <p className="max-w-2xl text-[14px] leading-relaxed text-forest/55">{lede}</p>
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
              <Icon className="w-3.5 h-3.5 text-emerald-700" />
            </div>
            <div className="min-w-0">
              <div className="text-[12px] font-display font-semibold text-forest leading-tight mb-1">
                {f.title}
              </div>
              <div className="text-[10.5px] text-forest/50 leading-snug">
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
  const props = external
    ? { href: to, target: "_blank", rel: "noopener noreferrer" }
    : { href: to };
  return (
    <a
      {...props}
      className="group flex items-center gap-3 p-3 rounded-xl border border-forest/8 bg-sage-1/50 hover:border-emerald-500/25 hover:bg-white transition-all"
    >
      <div className="w-8 h-8 rounded-md bg-emerald-500/[0.06] border border-emerald-500/15 flex items-center justify-center shrink-0">
        <Icon className="w-3.5 h-3.5 text-emerald-400" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[12px] font-medium text-foreground leading-tight">{title}</div>
        <div className="text-[10.5px] text-muted-foreground/60 truncate">{description}</div>
      </div>
      <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all" />
    </a>
  );
};
