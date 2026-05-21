/**
 * HealthRibbon — sticky top banner showing aggregate position health.
 *
 * Visibility rules:
 *   - Hidden when user has no debt across any market
 *   - Hidden when severity = "safe" (collapses to a tiny pill)
 *   - Expanded when caution/warning/critical
 *
 * Privacy: Uses ONLY public plaintext shadow reads via useHealthEngine.
 * No FHE decrypt, no wallet prompts. Safe to mount globally.
 *
 * Action: Single CTA button routes to the most relevant tab
 * (Repay for caution+, Collateral for the worst market).
 */
import { motion, AnimatePresence } from "framer-motion";
import { Activity, ShieldAlert, AlertTriangle, ShieldCheck, ArrowUpFromLine, ChevronRight } from "lucide-react";
import { useHealthEngine, type HealthSeverity, type MarketHealthSnapshot } from "@/hooks/useHealthEngine";

interface Props {
  /** Notify parent when user clicks the CTA — typically switches tab. */
  onRepay?: (worst: MarketHealthSnapshot) => void;
  onAddCollateral?: (worst: MarketHealthSnapshot) => void;
  className?: string;
}

const STYLE: Record<HealthSeverity, { bg: string; border: string; text: string; icon: React.ElementType; label: string; pulse: boolean }> = {
  idle:     { bg: "",                                  border: "",                            text: "",                     icon: ShieldCheck,  label: "",                            pulse: false },
  safe:     { bg: "bg-emerald-500/5",                  border: "border-emerald-500/15",       text: "text-emerald-200",     icon: ShieldCheck,  label: "Position healthy",            pulse: false },
  caution:  { bg: "bg-amber-500/10",                   border: "border-amber-500/30",         text: "text-amber-200",       icon: Activity,     label: "Caution — HF trending down",  pulse: false },
  warning:  { bg: "bg-orange-500/12",                  border: "border-orange-500/40",        text: "text-orange-100",      icon: AlertTriangle,label: "Warning — top up collateral", pulse: false },
  critical: { bg: "bg-red-500/15",                     border: "border-red-500/50",           text: "text-red-100",         icon: ShieldAlert,  label: "LIQUIDATION RISK",            pulse: true  },
};

function fmt6(v: bigint): string {
  return (Number(v) / 1e6).toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export default function HealthRibbon({ onRepay, onAddCollateral, className = "" }: Props) {
  const { hasDebt, aggregateSeverity, worstHF, worstMarket } = useHealthEngine();

  // Hide entirely when no debt or safe — keeps clean look during normal use
  if (!hasDebt || aggregateSeverity === "idle" || aggregateSeverity === "safe") return null;

  const s = STYLE[aggregateSeverity];
  const Icon = s.icon;
  const hfText = worstHF === null ? "—" : worstHF.toFixed(2);
  const showCritical = aggregateSeverity === "critical";

  return (
    <AnimatePresence>
      <motion.div
        key={aggregateSeverity}
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.25 }}
        className={`${className}`}
      >
        <div
          className={`relative w-full rounded-xl border ${s.border} ${s.bg} backdrop-blur-md px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3`}
        >
          {/* Pulsing glow ring on critical */}
          {s.pulse && (
            <motion.div
              className="absolute inset-0 rounded-xl pointer-events-none"
              animate={{ boxShadow: ["0 0 0 0 rgba(239,68,68,0)", "0 0 0 6px rgba(239,68,68,0.15)", "0 0 0 0 rgba(239,68,68,0)"] }}
              transition={{ repeat: Infinity, duration: 1.6, ease: "easeInOut" }}
            />
          )}

          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className={`shrink-0 w-9 h-9 rounded-lg flex items-center justify-center border ${s.border} ${showCritical ? "bg-red-500/20" : "bg-black/20"}`}>
              <Icon className={`w-4 h-4 ${s.text}`} />
            </div>
            <div className="min-w-0">
              <div className={`text-[11px] tracking-[0.18em] uppercase font-mono ${s.text}`}>
                {s.label}
              </div>
              <div className="text-[12px] text-white/70 truncate">
                Health Factor <span className={`font-mono font-semibold ${s.text}`}>{hfText}</span>
                {worstMarket && (
                  <>
                    <span className="text-white/30 mx-1.5">·</span>
                    {worstMarket.market.label}
                    <span className="text-white/30 mx-1.5">·</span>
                    Debt <span className="font-mono">{fmt6(worstMarket.borrow)}</span> cUSDC
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {onRepay && worstMarket && (
              <button
                onClick={() => onRepay(worstMarket)}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-[12px] font-medium border ${s.border} ${showCritical ? "bg-red-500/25 hover:bg-red-500/40 text-red-50" : "bg-white/5 hover:bg-white/10 text-white/90"}`}
              >
                <ArrowUpFromLine className="w-3.5 h-3.5" />
                Repay
                <ChevronRight className="w-3 h-3 opacity-60" />
              </button>
            )}
            {onAddCollateral && worstMarket && !showCritical && (
              <button
                onClick={() => onAddCollateral(worstMarket)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-[12px] font-medium border border-white/10 bg-white/5 hover:bg-white/10 text-white/80"
              >
                Add collateral
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
