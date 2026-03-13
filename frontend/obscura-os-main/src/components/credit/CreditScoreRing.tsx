/**
 * CreditScoreRing — radial 0-1000 dial with single explicit reveal.
 *
 * Uses useCreditScoreValue() but does NOT trigger on mount — the value is
 * only fetched after the user clicks "Reveal". After 30s it auto-hides.
 *
 * Visual: SVG ring with violet glow when revealed, gray dashed when hidden.
 */
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Eye, EyeOff, Award, Loader2, RefreshCcw } from "lucide-react";
import { useCreditScoreValue } from "@/hooks/useCredit";
import { PRIVACY_COPY } from "@/lib/privacyCopy";

const MAX_SCORE = 1000;

export default function CreditScoreRing() {
  const { score, loading, refresh } = useCreditScoreValue();
  const [revealed, setRevealed] = useState(false);
  const [triggered, setTriggered] = useState(false);

  // Auto-hide after 30s
  useEffect(() => {
    if (!revealed) return;
    const id = setTimeout(() => setRevealed(false), 30_000);
    return () => clearTimeout(id);
  }, [revealed]);

  const reveal = async () => {
    setTriggered(true);
    await refresh();
    setRevealed(true);
  };

  const value = revealed && triggered && score !== null ? Number(score) : null;
  const pct = value === null ? 0 : Math.min(1, value / MAX_SCORE);
  const R = 56, C = 2 * Math.PI * R;
  const offset = C * (1 - pct);

  const tier =
    value === null ? "Hidden" :
    value >= 800 ? "Excellent" :
    value >= 650 ? "Good" :
    value >= 500 ? "Fair" :
    "Building";

  const tierColor =
    value === null ? "rgb(120,120,140)" :
    value >= 800 ? "rgb(34,197,94)" :
    value >= 650 ? "rgb(139,92,246)" :
    value >= 500 ? "rgb(245,158,11)" :
    "rgb(248,113,113)";

  return (
    <div className="rounded-2xl hairline bg-card p-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[9.5px] tracking-[0.22em] uppercase text-violet-400/60 font-mono flex items-center gap-1.5">
            <Award className="w-3 h-3" /> Credit score
          </div>
          <h3 className="mt-1 text-base text-white/90">Encrypted reputation</h3>
        </div>
        <div className="flex items-center gap-1.5">
          {revealed && (
            <button
              type="button"
              onClick={refresh}
              disabled={loading}
              className="text-[10.5px] text-white/55 hover:text-white inline-flex items-center gap-1 px-2 py-1 rounded border border-white/10 hover:border-white/20 disabled:opacity-50"
            >
              <RefreshCcw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} /> Refresh
            </button>
          )}
          <button
            type="button"
            onClick={() => (revealed ? setRevealed(false) : void reveal())}
            disabled={loading}
            className="text-[10.5px] inline-flex items-center gap-1 px-2 py-1 rounded border border-violet-500/30 bg-violet-500/10 hover:bg-violet-500/20 text-violet-200 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : revealed ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
            {revealed ? "Hide" : PRIVACY_COPY.reveal}
          </button>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-center">
        <div className="relative w-[140px] h-[140px]">
          <svg viewBox="0 0 140 140" className="w-full h-full -rotate-90">
            <circle cx="70" cy="70" r={R} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
            <motion.circle
              cx="70" cy="70" r={R}
              fill="none"
              stroke={tierColor}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={C}
              strokeDashoffset={value === null ? C : offset}
              initial={false}
              animate={{ strokeDashoffset: value === null ? C : offset }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              style={value === null ? { strokeDasharray: "4 4" } : undefined}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-3xl font-light tabular-nums" style={{ color: tierColor }}>
              {value === null ? PRIVACY_COPY.hiddenGlyph : value.toString()}
            </div>
            <div className="text-[9.5px] tracking-[0.18em] uppercase text-white/45 font-mono">{tier}</div>
          </div>
        </div>
      </div>

      <p className="mt-3 text-center text-[10.5px] text-white/40">
        {revealed
          ? "Auto-hides after 30s · only you can decrypt this value"
          : PRIVACY_COPY.hidden}
      </p>
    </div>
  );
}
