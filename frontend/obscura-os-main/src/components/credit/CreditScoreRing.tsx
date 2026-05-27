/**
 * CreditScoreRing — radial 0-1000 dial with single explicit reveal.
 *
 * Uses useCreditScoreValue() but does NOT trigger on mount — the value is
 * only fetched after the user clicks "Reveal". After 30s it auto-hides.
 *
 * Visual: Harmony card with dashed hidden ring until explicitly revealed.
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
    value === null ? "hsl(var(--muted-foreground))" :
    value >= 800 ? "hsl(var(--success))" :
    value >= 650 ? "hsl(var(--accent))" :
    value >= 500 ? "rgb(217,119,6)" :
    "hsl(var(--destructive))";

  return (
    <div className="rounded-2xl hairline bg-card p-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-muted-foreground flex items-center gap-1.5">
            <Award className="w-3 h-3" /> Credit score
          </div>
          <h3 className="mt-1 text-base text-foreground">Encrypted on-chain score</h3>
        </div>
        <div className="flex items-center gap-1.5">
          {revealed && (
            <button
              type="button"
              onClick={refresh}
              disabled={loading}
              className="inline-flex items-center gap-1 rounded-full hairline px-2 py-1 text-[10.5px] text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
            >
              <RefreshCcw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} /> Refresh
            </button>
          )}
          <button
            type="button"
            onClick={() => (revealed ? setRevealed(false) : void reveal())}
            disabled={loading}
            className="inline-flex items-center gap-1 rounded-full bg-foreground px-2.5 py-1 text-[10.5px] text-background hover:opacity-90 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : revealed ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
            {revealed ? "Hide" : PRIVACY_COPY.reveal}
          </button>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-center">
        <div className="relative w-[140px] h-[140px]">
          <svg viewBox="0 0 140 140" className="w-full h-full -rotate-90">
            <circle cx="70" cy="70" r={R} fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
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
            <div className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-muted-foreground">{tier}</div>
          </div>
        </div>
      </div>

      <p className="mt-3 text-center text-[10.5px] text-muted-foreground">
        {revealed
          ? "Auto-hides after 30s. Only you can decrypt this value."
          : PRIVACY_COPY.hidden}
      </p>
    </div>
  );
}
