/**
 * HealthBar — color-coded health factor progress bar.
 *
 * Visual thresholds:
 *   red    < 1.15  — danger, near liquidation
 *   yellow 1.15–1.5 — caution
 *   green  ≥ 1.5  — safe
 *
 * The HF number is a PUBLIC plaintext shadow (computed from public borrow/
 * collateral mirrors) — safe to display without wallet interaction.
 */
import { motion } from "framer-motion";
import { AlertTriangle, CheckCircle2, Activity } from "lucide-react";

interface HealthBarProps {
  /** Raw health factor, e.g. 1.42. Null = no borrow position. */
  hf: number | null;
  loading?: boolean;
  className?: string;
}

function hfColor(hf: number): { bar: string; text: string; bg: string; icon: string } {
  if (hf < 1.15) return { bar: "bg-red-500", text: "text-red-400", bg: "bg-red-500/10 border-red-500/25", icon: "text-red-400" };
  if (hf < 1.5)  return { bar: "bg-amber-400", text: "text-amber-300", bg: "bg-amber-500/10 border-amber-500/25", icon: "text-amber-300" };
  return { bar: "bg-emerald-500", text: "text-[hsl(var(--success))]", bg: "bg-emerald-500/[0.07] border-emerald-500/25", icon: "text-foreground" };
}

function hfLabel(hf: number): { label: string; hint: string } {
  if (hf < 1.15) return { label: "Danger", hint: "Liquidation risk — repay debt or add collateral now" };
  if (hf < 1.5)  return { label: "Caution", hint: "Add collateral to buffer against price movements" };
  return { label: "Healthy", hint: "Your position is safely collateralised" };
}

/** Map HF to a 0–1 fill fraction. Cap at 3 for visual saturation. */
function hfFill(hf: number): number {
  return Math.min(hf / 3, 1);
}

export default function HealthBar({ hf, loading = false, className = "" }: HealthBarProps) {
  if (loading) {
    return (
      <div className={`rounded-xl hairline bg-card p-4 flex items-center gap-2 ${className}`}>
        <Activity className="w-4 h-4 text-white/30 animate-pulse" />
        <span className="text-xs text-white/30">Loading health factor…</span>
      </div>
    );
  }

  if (hf === null) {
    return (
      <div className={`rounded-xl hairline bg-card p-4 ${className}`}>
        <p className="text-[10px] text-white/30 font-mono">No borrow position — health factor N/A</p>
      </div>
    );
  }

  const colors = hfColor(hf);
  const info   = hfLabel(hf);
  const fill   = hfFill(hf);

  return (
    <div className={`rounded-xl border ${colors.bg} p-4 flex flex-col gap-3 ${className}`}>
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {hf < 1.5 ? (
            <AlertTriangle className={`w-4 h-4 ${colors.icon}`} />
          ) : (
            <CheckCircle2 className={`w-4 h-4 ${colors.icon}`} />
          )}
          <span className="text-xs font-medium text-white/70">Health factor</span>
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className={`text-xl font-mono font-semibold ${colors.text}`}>
            {hf.toFixed(2)}
          </span>
          <span className={`text-[9px] tracking-[0.12em] uppercase font-mono ${colors.text} opacity-70`}>
            {info.label}
          </span>
        </div>
      </div>

      {/* Bar track */}
      <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${colors.bar}`}
          initial={{ width: 0 }}
          animate={{ width: `${fill * 100}%` }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>

      {/* Scale labels */}
      <div className="flex justify-between text-[8px] text-white/25 font-mono">
        <span>0</span>
        <span className="text-red-400/60">1.15 danger</span>
        <span className="text-amber-400/60">1.5 caution</span>
        <span className="text-foreground/60">3+</span>
      </div>

      {/* Hint text */}
      <p className="text-[10px] text-white/40">{info.hint}</p>
    </div>
  );
}
