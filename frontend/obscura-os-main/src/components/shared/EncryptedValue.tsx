/**
 * EncryptedValue (shared) — professional FHE-encrypted balance display tile.
 * Used by both ObscuraPay and ObscuraCredit surfaces.
 *
 * Five visual states:
 *  • null / loading  → shield + animated shimmer ring + "FHE Encrypted" badge
 *  • pending         → pulsing lock + "Awaiting CoFHE settle ~6-8s" (two-step gap)
 *  • decrypting      → spinning lock + "Decrypting…"
 *  • revealed        → green shield + formatted value + "on-chain decrypted" caption
 */
import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck, Eye, Loader2, Lock, Hourglass } from "lucide-react";

export type EncryptedValueAccent = "cyan" | "emerald" | "violet" | "amber";

interface Props {
  value: bigint | null;
  loading?: boolean;
  /** Show CoFHE settle-pending state (two-step gap) */
  pending?: boolean;
  onReveal?: () => void;
  symbol?: string;
  decimals?: number;
  className?: string;
  label?: string;
  accent?: EncryptedValueAccent;
}

const ACCENT: Record<EncryptedValueAccent, { ring: string; border: string; text: string; bg: string; badge: string }> = {
  cyan:    { ring: "from-cyan-500/30 via-cyan-400/10 to-transparent",    border: "border-cyan-500/20",    text: "text-cyan-300",    bg: "bg-cyan-950/30",    badge: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20"    },
  emerald: { ring: "from-emerald-500/30 via-emerald-400/10 to-transparent", border: "border-emerald-500/20", text: "text-emerald-300", bg: "bg-emerald-950/30", badge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  violet:  { ring: "from-violet-500/30 via-violet-400/10 to-transparent",  border: "border-violet-500/20",  text: "text-violet-300",  bg: "bg-violet-950/30",  badge: "bg-violet-500/10 text-violet-400 border-violet-500/20"  },
  amber:   { ring: "from-amber-500/30 via-amber-400/10 to-transparent",    border: "border-amber-500/20",   text: "text-amber-300",   bg: "bg-amber-950/30",   badge: "bg-amber-500/10 text-amber-400 border-amber-500/20"   },
};

function fmt(value: bigint, decimals: number): string {
  const divisor = 10 ** decimals;
  return (Number(value) / divisor).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  });
}

export default function EncryptedValue({
  value,
  loading = false,
  pending = false,
  onReveal,
  symbol = "cUSDC",
  decimals = 6,
  className = "",
  label,
  accent = "cyan",
}: Props) {
  const a = ACCENT[accent];
  const revealed = value !== null && !loading && !pending;

  return (
    <div className={`relative rounded-xl overflow-hidden border ${a.border} ${a.bg} p-3 space-y-2 ${className}`}>

      {/* Animated shimmer ring — visible while locked */}
      <AnimatePresence>
        {!revealed && (
          <motion.div
            key="shimmer"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="pointer-events-none absolute inset-0"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 5, ease: "linear" }}
              className={`absolute -inset-0.5 rounded-xl bg-gradient-conic ${a.ring} opacity-50`}
            />
            <motion.div
              animate={{ x: ["-100%", "200%"] }}
              transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut", repeatDelay: 1.5 }}
              className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/5 to-transparent skew-x-[-20deg]"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Label */}
      {label && (
        <div className="relative text-[9px] tracking-[0.18em] uppercase text-white/35 flex items-center gap-1.5">
          {revealed
            ? <ShieldCheck className="w-2.5 h-2.5 text-emerald-400" />
            : <Lock className={`w-2.5 h-2.5 ${a.text}`} />}
          {label}
        </div>
      )}

      {/* Value display */}
      <div className="relative flex items-center gap-2 min-h-[28px]">
        <AnimatePresence mode="wait">
          {pending ? (
            <motion.div
              key="pending"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="flex items-center gap-2"
            >
              <motion.div
                animate={{ opacity: [0.4, 1, 0.4] }}
                transition={{ repeat: Infinity, duration: 1.6, ease: "easeInOut" }}
              >
                <Hourglass className={`w-3.5 h-3.5 ${a.text}`} />
              </motion.div>
              <span className={`text-[11px] font-medium ${a.text}`}>Awaiting CoFHE settle ~6-8s</span>
            </motion.div>
          ) : loading ? (
            <motion.div
              key="decrypting"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="flex items-center gap-2"
            >
              <Loader2 className={`w-3.5 h-3.5 animate-spin ${a.text}`} />
              <span className={`text-[12px] font-medium ${a.text}`}>Decrypting…</span>
            </motion.div>
          ) : revealed ? (
            <motion.div
              key="revealed"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-baseline gap-1.5"
            >
              <span className={`font-mono text-[15px] font-semibold ${a.text}`}>
                {fmt(value!, decimals)}
              </span>
              <span className={`text-[10px] font-medium ${a.text} opacity-70`}>{symbol}</span>
            </motion.div>
          ) : (
            <motion.div
              key="locked"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex items-center gap-2"
            >
              <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-[9px] font-semibold tracking-widest uppercase ${a.badge}`}>
                <Lock className="w-2 h-2" />
                FHE Encrypted
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Caption + Reveal button */}
      <div className="relative flex items-center justify-between gap-2">
        <p className="text-[9px] text-white/25">
          {revealed
            ? "on-chain decrypted"
            : pending
            ? "CoFHE task in queue"
            : "encrypted on FHENix · tap reveal"}
        </p>
        {onReveal && !revealed && !pending && (
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={onReveal}
            disabled={loading}
            className={`flex items-center gap-1 px-2 py-0.5 rounded-md border text-[9px] font-semibold tracking-wide uppercase transition-colors ${a.badge} hover:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed`}
          >
            {loading
              ? <Loader2 className="w-2.5 h-2.5 animate-spin" />
              : <Eye className="w-2.5 h-2.5" />}
            Reveal
          </motion.button>
        )}
      </div>
    </div>
  );
}
