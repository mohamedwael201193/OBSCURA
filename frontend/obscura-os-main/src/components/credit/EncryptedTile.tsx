/**
 * EncryptedTile — privacy-first encrypted value tile.
 *
 * Shows "████████ <symbol>" by default (value locked with shield icon).
 * On reveal the tile transitions to display the decrypted amount with a
 * 30-second countdown ring before auto-hiding. The parent controls reveal
 * state via props so multiple tiles can be revealed together with one click.
 *
 * Privacy rules:
 *  - Never calls decrypt automatically on mount
 *  - Value is formatted server-side and passed as `displayValue` once revealed
 *  - No plaintext is stored in local state
 */
import { useEffect, useRef, useState } from "react";
import { Shield, Eye, EyeOff } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface EncryptedTileProps {
  label: string;
  symbol: string;
  /** Human-readable formatted value string, e.g. "1,234.56". Null = not yet revealed. */
  displayValue: string | null;
  /** Whether the tile is currently in revealed state */
  revealed: boolean;
  /** Called when user clicks reveal within this tile (optional, if parent handles globally) */
  onReveal?: () => void;
  /** Time in seconds before auto-hide. Default 30. */
  revealDurationSec?: number;
  /** Called when reveal expires */
  onExpire?: () => void;
  loading?: boolean;
  /** Accent color key for theming */
  accent?: "emerald" | "violet" | "amber" | "blue";
  className?: string;
}

const ACCENT_CLASSES: Record<string, { border: string; glow: string; text: string; icon: string }> = {
  emerald: {
    border: "border-emerald-500/25",
    glow: "bg-emerald-500/[0.06]",
    text: "text-emerald-300",
    icon: "text-emerald-400",
  },
  violet: {
    border: "border-violet-500/25",
    glow: "bg-violet-500/[0.06]",
    text: "text-violet-300",
    icon: "text-violet-400",
  },
  amber: {
    border: "border-amber-500/25",
    glow: "bg-amber-500/[0.06]",
    text: "text-amber-300",
    icon: "text-amber-400",
  },
  blue: {
    border: "border-blue-500/25",
    glow: "bg-blue-500/[0.06]",
    text: "text-blue-300",
    icon: "text-blue-400",
  },
};

export default function EncryptedTile({
  label,
  symbol,
  displayValue,
  revealed,
  onReveal,
  revealDurationSec = 30,
  onExpire,
  loading = false,
  accent = "violet",
  className = "",
}: EncryptedTileProps) {
  const [secondsLeft, setSecondsLeft] = useState(revealDurationSec);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const ac = ACCENT_CLASSES[accent] ?? ACCENT_CLASSES["violet"];

  // Start countdown when revealed, clear when hidden
  useEffect(() => {
    if (revealed) {
      setSecondsLeft(revealDurationSec);
      timerRef.current = setInterval(() => {
        setSecondsLeft((s) => {
          if (s <= 1) {
            clearInterval(timerRef.current!);
            onExpire?.();
            return 0;
          }
          return s - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setSecondsLeft(revealDurationSec);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [revealed, revealDurationSec]); // eslint-disable-line react-hooks/exhaustive-deps

  // SVG ring countdown
  const radius = 10;
  const circumference = 2 * Math.PI * radius;
  const dash = revealed
    ? circumference * (secondsLeft / revealDurationSec)
    : circumference;

  return (
    <div
      className={`relative rounded-2xl border ${ac.border} ${ac.glow} backdrop-blur-sm p-4 flex flex-col gap-2 select-none ${className}`}
    >
      {/* Label row */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Shield className={`w-3 h-3 ${ac.icon} opacity-60`} />
          <span className="text-[9px] tracking-[0.18em] uppercase text-white/40 font-mono">
            {label}
          </span>
        </div>

        {/* Countdown ring — shows only when revealed */}
        {revealed && (
          <svg width="26" height="26" viewBox="0 0 26 26" className="shrink-0">
            <circle cx="13" cy="13" r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="2" />
            <circle
              cx="13"
              cy="13"
              r={radius}
              fill="none"
              stroke={accent === "emerald" ? "#34d399" : accent === "amber" ? "#fbbf24" : "#a78bfa"}
              strokeWidth="2"
              strokeDasharray={`${dash} ${circumference}`}
              strokeDashoffset={circumference * 0.25}
              strokeLinecap="round"
              style={{ transform: "rotate(-90deg)", transformOrigin: "center", transition: "stroke-dasharray 1s linear" }}
            />
            <text x="13" y="17" textAnchor="middle" fontSize="7" fill="rgba(255,255,255,0.5)" fontFamily="monospace">
              {secondsLeft}
            </text>
          </svg>
        )}
      </div>

      {/* Value area */}
      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="h-8 flex items-center">
            <span className="text-[11px] text-white/30 animate-pulse">loading…</span>
          </motion.div>
        ) : revealed && displayValue !== null ? (
          <motion.div key="revealed"
            initial={{ filter: "blur(6px)", opacity: 0 }}
            animate={{ filter: "blur(0px)", opacity: 1 }}
            exit={{ filter: "blur(6px)", opacity: 0 }}
            transition={{ duration: 0.35 }}
            className="flex items-baseline gap-1.5"
          >
            <span className={`text-2xl font-mono font-semibold tracking-tight ${ac.text}`}>
              {displayValue}
            </span>
            <span className="text-[10px] text-white/35 font-mono">{symbol}</span>
          </motion.div>
        ) : (
          <motion.div key="hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex items-baseline gap-1.5 cursor-pointer group" onClick={onReveal}>
            <span className="text-2xl font-mono text-white/20 tracking-[0.12em] group-hover:text-white/30 transition-colors">
              ████████
            </span>
            <span className="text-[10px] text-white/25 font-mono">{symbol}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reveal hint (only when hidden) */}
      {!revealed && !loading && onReveal && (
        <button
          onClick={onReveal}
          className="text-[9px] text-white/30 hover:text-white/60 transition-colors flex items-center gap-1 mt-0.5"
        >
          <Eye className="w-2.5 h-2.5" /> Tap to reveal
        </button>
      )}

      {/* Hide hint (only when revealed) */}
      {revealed && !loading && (
        <button
          onClick={onExpire}
          className="text-[9px] text-white/25 hover:text-white/50 transition-colors flex items-center gap-1 mt-0.5"
        >
          <EyeOff className="w-2.5 h-2.5" /> Hide
        </button>
      )}
    </div>
  );
}
