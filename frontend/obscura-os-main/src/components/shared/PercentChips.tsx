/**
 * PercentChips — 0 / 25 / 50 / 75 / 100 % quick-fill buttons.
 *
 * Usage:
 *   <PercentChips max={balance} decimals={6} onPick={(v) => setAmount(formatUnits(v, 6))} />
 */
import { motion } from "framer-motion";

const PERCENTS = [0, 25, 50, 75, 100] as const;

interface Props {
  max: bigint;
  decimals?: number;
  onPick: (value: bigint) => void;
  className?: string;
  /** Highlight colour (default violet) */
  accent?: "violet" | "cyan" | "emerald";
}

const ACCENT_CLASS: Record<string, string> = {
  violet:  "bg-violet-500/10 border-violet-500/30 text-violet-300 hover:bg-violet-500/20",
  cyan:    "bg-cyan-500/10 border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/20",
  emerald: "bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20",
};

export default function PercentChips({ max, decimals = 6, onPick, className = "", accent = "violet" }: Props) {
  const cls = ACCENT_CLASS[accent] ?? ACCENT_CLASS.violet;

  const pick = (pct: number) => {
    const value = (max * BigInt(pct)) / 100n;
    onPick(value);
  };

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {PERCENTS.map((pct) => (
        <motion.button
          key={pct}
          type="button"
          whileTap={{ scale: 0.92 }}
          onClick={() => pick(pct)}
          className={`px-2 py-0.5 rounded-md border text-[9px] font-semibold tracking-wide uppercase transition-colors ${cls}`}
        >
          {pct === 0 ? "Clear" : `${pct}%`}
        </motion.button>
      ))}
    </div>
  );
}
