/**
 * RiskMonitorCard — HF time-series (sparkline) + interactive what-if sliders.
 *
 * - Sparkline: last ~120 samples of worstHF from useHealthEngine (in-memory).
 * - What-if: drag collateral delta + borrow delta sliders → call
 *   simulateHealth() from lib/healthMath to project new HF.
 *
 * Privacy-safe: reads only public plaintext shadows via useHealthEngine.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Activity, Sliders, ArrowUpFromLine, ArrowDownToLine } from "lucide-react";
import { useHealthEngine } from "@/hooks/useHealthEngine";
import { simulateHealth, severityColor } from "@/lib/healthMath";
import { Slider } from "@/components/ui/slider";

interface Sample { ts: number; hf: number | null; }
const MAX_SAMPLES = 120;

export default function RiskMonitorCard() {
  const { perMarket, worstMarket, worstHF, hasDebt, lastUpdatedAt } = useHealthEngine();
  const [series, setSeries] = useState<Sample[]>([]);
  const lastTs = useRef(0);
  const [dColl, setDColl] = useState(0);   // delta in cUSDC units (1e6)
  const [dBorr, setDBorr] = useState(0);

  // Push a sample whenever the engine refreshes
  useEffect(() => {
    if (lastUpdatedAt === lastTs.current) return;
    lastTs.current = lastUpdatedAt;
    setSeries((prev) => {
      const next = [...prev, { ts: lastUpdatedAt, hf: worstHF }];
      return next.length > MAX_SAMPLES ? next.slice(-MAX_SAMPLES) : next;
    });
  }, [lastUpdatedAt, worstHF]);

  const path = useMemo(() => {
    if (series.length < 2) return "";
    const vals = series.map((s) => (s.hf === null ? 2 : Math.min(3, Math.max(0, s.hf))));
    const min = Math.min(...vals, 0.5);
    const max = Math.max(...vals, 2);
    const W = 200, H = 48;
    return vals.map((v, i) => {
      const x = (i / (vals.length - 1)) * W;
      const y = H - ((v - min) / Math.max(0.01, max - min)) * H;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(" ");
  }, [series]);

  const simulated = useMemo(() => {
    if (!worstMarket) return null;
    const dCollBn = BigInt(Math.round(dColl * 1e6));
    const dBorrBn = BigInt(Math.round(dBorr * 1e6));
    return simulateHealth(
      {
        collateral: worstMarket.collateral,
        borrow: worstMarket.borrow,
        lltvBps: worstMarket.market.lltvBps,
        liqThresholdBps: worstMarket.market.liqThresholdBps,
      },
      dCollBn,
      dBorrBn,
    );
  }, [worstMarket, dColl, dBorr]);

  if (!hasDebt) {
    return (
      <div className="rounded-2xl border border-white/8 bg-white/[0.02] backdrop-blur-xl p-5">
        <div className="flex items-center gap-2 text-white/70 text-sm">
          <Activity className="w-4 h-4 text-emerald-300" />
          No debt — risk monitor idle.
        </div>
        <p className="mt-2 text-[11px] text-white/45">Borrow to activate the realtime HF sparkline & what-if simulator.</p>
      </div>
    );
  }

  const hfColor = severityColor(worstHF);
  const simColor = severityColor(simulated?.hf ?? null);

  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.02] backdrop-blur-xl p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[9.5px] tracking-[0.22em] uppercase text-violet-400/60 font-mono">Risk monitor</div>
          <h3 className="mt-1 text-base text-white/90">Worst market · {worstMarket?.market.label ?? "—"}</h3>
        </div>
        <div className="text-right">
          <div className="text-[9.5px] tracking-[0.18em] uppercase text-white/35 font-mono">HF</div>
          <div className="text-2xl font-light tabular-nums" style={{ color: hfColor }}>
            {worstHF === null ? "—" : worstHF.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Sparkline */}
      <div className="mt-3 h-12 rounded-lg bg-black/30 border border-white/5 px-2 py-1 overflow-hidden">
        {series.length < 2 ? (
          <div className="h-full flex items-center justify-center text-[10px] text-white/30">Collecting samples…</div>
        ) : (
          <svg viewBox="0 0 200 48" preserveAspectRatio="none" className="w-full h-full">
            <path d={path} fill="none" stroke={hfColor} strokeWidth="1.4" strokeLinejoin="round" strokeLinecap="round" />
            <line x1="0" x2="200" y1="32" y2="32" stroke="rgba(245,158,11,0.25)" strokeDasharray="2 3" strokeWidth="0.5" />
          </svg>
        )}
      </div>

      {/* What-if */}
      <div className="mt-4 p-3 rounded-xl bg-black/25 border border-white/8">
        <div className="flex items-center gap-2 text-[10.5px] tracking-[0.15em] uppercase text-white/55 font-mono">
          <Sliders className="w-3 h-3" /> What-if simulator
        </div>

        <div className="mt-3 grid gap-3">
          <div>
            <div className="flex items-center justify-between text-[10.5px] mb-1">
              <span className="flex items-center gap-1 text-emerald-300/80"><ArrowUpFromLine className="w-3 h-3" /> Add collateral</span>
              <span className="font-mono text-white/70">+${dColl.toFixed(2)}</span>
            </div>
            <Slider min={0} max={1000} step={10} value={[dColl]} onValueChange={([v]) => setDColl(v)} />
          </div>
          <div>
            <div className="flex items-center justify-between text-[10.5px] mb-1">
              <span className="flex items-center gap-1 text-orange-300/80"><ArrowDownToLine className="w-3 h-3" /> Repay borrow</span>
              <span className="font-mono text-white/70">-${(-dBorr).toFixed(2)}</span>
            </div>
            <Slider min={-1000} max={0} step={10} value={[dBorr]} onValueChange={([v]) => setDBorr(v)} />
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between p-2.5 rounded-lg bg-violet-500/5 border border-violet-500/15">
          <span className="text-[10.5px] tracking-wide uppercase text-white/55">Projected HF</span>
          <span className="text-lg font-light tabular-nums" style={{ color: simColor }}>
            {simulated?.hf === null || simulated?.hf === undefined ? "—" : simulated.hf.toFixed(2)}
          </span>
        </div>
      </div>

      {perMarket.length > 1 && (
        <div className="mt-3 text-[10px] text-white/40">
          {perMarket.length} markets tracked · refreshed {Math.max(0, Math.round((Date.now() - lastUpdatedAt) / 1000))}s ago
        </div>
      )}
    </div>
  );
}
