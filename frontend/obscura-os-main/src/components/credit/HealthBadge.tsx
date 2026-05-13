/**
 * HealthBadge — derived plaintext HF from public scalars + per-asset overrides.
 *
 * Encrypted handles (collateral, debt) cannot be read without a permit; UI
 * here uses the plaintext mirrors maintained by the market.
 */
import { useMemo, useState } from "react";
import { Activity, ShieldAlert, ShieldCheck } from "lucide-react";
import type { CreditMarketMeta } from "@/config/credit";
import { useHealthFactor } from "@/hooks/useCredit";

interface Props {
  market: CreditMarketMeta;
  user: `0x${string}`;
}

const HealthBadge = ({ market }: Props) => {
  const [collat, setCollat] = useState("100");
  const [debt, setDebt] = useState("60");

  const collatN = parseFloat(collat) || 0;
  const debtN = parseFloat(debt) || 0;
  const hf = useHealthFactor(market, collatN, debtN);

  const tone = useMemo(() => {
    if (!isFinite(hf)) return { color: "text-white/60", icon: ShieldCheck, label: "No debt" };
    if (hf >= 1.5) return { color: "text-emerald-300", icon: ShieldCheck, label: "Healthy" };
    if (hf >= 1.1) return { color: "text-amber-300", icon: Activity, label: "Watch" };
    return { color: "text-rose-300", icon: ShieldAlert, label: "At risk" };
  }, [hf]);

  const Icon = tone.icon;

  return (
    <div className="grid gap-3">
      <div className="grid grid-cols-2 gap-2">
        <label className="text-[11px] uppercase tracking-wider text-white/50">Collateral USD</label>
        <label className="text-[11px] uppercase tracking-wider text-white/50">Debt USD</label>
        <input
          inputMode="decimal"
          value={collat}
          onChange={(e) => setCollat(e.target.value)}
          className="bg-white/[0.03] border border-white/10 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-emerald-500/40"
        />
        <input
          inputMode="decimal"
          value={debt}
          onChange={(e) => setDebt(e.target.value)}
          className="bg-white/[0.03] border border-white/10 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-rose-500/40"
        />
      </div>
      <div className="rounded-lg border border-white/10 bg-black/20 p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Icon className={`w-6 h-6 ${tone.color}`} />
          <div>
            <div className="text-[11px] uppercase tracking-wider text-white/40">Health factor</div>
            <div className={`text-2xl font-mono font-light ${tone.color}`}>
              {isFinite(hf) ? hf.toFixed(2) : "∞"}
            </div>
          </div>
        </div>
        <div className={`text-[11px] uppercase tracking-[0.18em] font-mono ${tone.color}`}>
          {tone.label}
        </div>
      </div>
      <p className="text-[11px] text-white/45">
        Computed locally from your inputs and market liquidation threshold ({(market.liqThresholdBps / 100).toFixed(0)}%).
        Encrypted on-chain values stay private; reveal them via permit if you need a precise figure.
      </p>
    </div>
  );
};

export default HealthBadge;
