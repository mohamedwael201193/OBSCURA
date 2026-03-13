import { ReactNode } from "react";
import { motion } from "framer-motion";

interface SectionHeaderProps {
  eyebrow?: string;
  title: ReactNode;
  description?: string;
  action?: ReactNode;
  accent?: "emerald" | "cyan" | "violet";
}

const accentTextMap = {
  emerald: "text-emerald-400",
  cyan: "text-cyan-400",
  violet: "text-violet-400",
};

/**
 * Reusable elegant section header with animated entry.
 */
export const SectionHeader = ({ eyebrow, title, description, action, accent = "emerald" }: SectionHeaderProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16, filter: "blur(8px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6"
    >
      <div className="space-y-2 min-w-0 flex-1">
        {eyebrow && (
          <div className="flex items-center gap-2">
            <span className={`w-1 h-1 rounded-full ${accent === "emerald" ? "bg-emerald-400" : accent === "cyan" ? "bg-cyan-400" : "bg-violet-400"}`} />
            <span className={`text-[10px] tracking-[0.25em] uppercase ${accentTextMap[accent]} font-mono`}>{eyebrow}</span>
          </div>
        )}
        <h2 className="font-display text-3xl lg:text-4xl text-foreground tracking-tight leading-[1.1]">
          {title}
        </h2>
        {description && (
          <p className="text-sm md:text-base text-muted-foreground/75 max-w-2xl leading-relaxed">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </motion.div>
  );
};

interface PanelProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
}

/**
 * Premium glass panel — gradient border, subtle glow, optional hover spotlight.
 */
export const Panel = ({ children, className = "", hover = false }: PanelProps) => {
  return (
    <div
      className={`relative rounded-xl border border-white/[0.06] bg-gradient-to-br from-white/[0.04] via-white/[0.02] to-transparent backdrop-blur-sm overflow-hidden ${
        hover ? "hover:border-white/[0.12] transition-colors" : ""
      } ${className}`}
    >
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      {children}
    </div>
  );
};

/**
 * Numbered step card — for tutorials in tabs.
 */
export const StepCard = ({
  number,
  title,
  description,
  children,
  accent = "emerald",
  status,
}: {
  number: number;
  title: string;
  description?: string;
  children?: ReactNode;
  accent?: "emerald" | "cyan" | "violet";
  status?: "active" | "complete" | "upcoming";
}) => {
  const colors = {
    emerald: { text: "text-emerald-400", bg: "bg-emerald-500/15", border: "border-emerald-500/40" },
    cyan: { text: "text-cyan-400", bg: "bg-cyan-500/15", border: "border-cyan-500/40" },
    violet: { text: "text-violet-400", bg: "bg-violet-500/15", border: "border-violet-500/40" },
  }[accent];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="relative pl-12 pb-8 last:pb-0"
    >
      {/* Connection line */}
      <div className="absolute left-[19px] top-10 bottom-0 w-px bg-gradient-to-b from-white/10 to-transparent" />

      {/* Number bubble */}
      <div
        className={`absolute left-0 top-0 w-10 h-10 rounded-full ${colors.bg} ${colors.border} border-2 flex items-center justify-center font-mono text-sm font-bold ${colors.text} ${
          status === "active" ? "animate-pulse" : ""
        }`}
      >
        {status === "complete" ? "✓" : number}
      </div>

      <div className="space-y-2">
        <div className="flex items-baseline gap-3">
          <h4 className="font-display text-base font-semibold text-foreground">{title}</h4>
          {status === "active" && (
            <span className={`text-[10px] tracking-[0.2em] uppercase ${colors.text} font-mono`}>● In progress</span>
          )}
        </div>
        {description && <p className="text-sm text-muted-foreground/75 leading-relaxed">{description}</p>}
        {children && <div className="mt-3">{children}</div>}
      </div>
    </motion.div>
  );
};

/**
 * Educational tooltip card — explains web3 concepts in plain English.
 */
export const InfoCallout = ({
  title,
  children,
  variant = "info",
}: {
  title: string;
  children: ReactNode;
  variant?: "info" | "warning" | "success";
}) => {
  const styles = {
    info: { border: "border-cyan-500/20", bg: "bg-cyan-500/5", text: "text-cyan-400", icon: "ℹ" },
    warning: { border: "border-amber-500/20", bg: "bg-amber-500/5", text: "text-amber-400", icon: "⚠" },
    success: { border: "border-emerald-500/20", bg: "bg-emerald-500/5", text: "text-emerald-400", icon: "✓" },
  }[variant];

  return (
    <div className={`flex gap-3 p-4 rounded-lg border ${styles.border} ${styles.bg} backdrop-blur-sm`}>
      <span className={`shrink-0 w-6 h-6 rounded-full ${styles.bg} ${styles.text} flex items-center justify-center text-sm font-bold border ${styles.border}`}>
        {styles.icon}
      </span>
      <div className="space-y-1 min-w-0">
        <div className={`text-xs tracking-[0.15em] uppercase ${styles.text} font-mono`}>{title}</div>
        <div className="text-sm text-foreground/80 leading-relaxed">{children}</div>
      </div>
    </div>
  );
};

/**
 * Stat tile — animated number with label.
 */
export const StatTile = ({
  label,
  value,
  hint,
  accent = "emerald",
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: "emerald" | "cyan" | "violet";
}) => {
  const text = accentTextMap[accent];
  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
      className="relative p-5 rounded-xl bg-gradient-to-br from-white/[0.04] to-white/[0.01] border border-white/[0.06] hover:border-white/[0.12] transition-colors overflow-hidden"
    >
      <div className={`absolute -top-12 -right-12 w-24 h-24 rounded-full bg-${accent}-500/10 blur-2xl`} />
      <div className="relative text-[10px] tracking-[0.2em] uppercase text-muted-foreground/60 font-mono">{label}</div>
      <div className={`relative font-display text-3xl mt-2 ${text}`}>{value}</div>
      {hint && <div className="relative text-xs text-muted-foreground/50 mt-1">{hint}</div>}
    </motion.div>
  );
};

export default SectionHeader;
