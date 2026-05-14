/**
 * HealthBadge — live health factor from on-chain plaintext shadows.
 *
 * Uses plainCollateral + plainBorrow (plaintext mirrors maintained by the
 * market) for instant, permit-free reads. Also supports a "what-if"
 * simulator where the user can override the values.
 */
import { useEffect, useMemo, useState } from "react";
import { Activity, ShieldAlert, ShieldCheck, RefreshCcw } from "lucide-react";
import type { CreditMarketMeta } from "@/config/credit";
import { useHealthFactor, useMarketPosition } from "@/hooks/useCredit";

interface Props {
  market: CreditMarketMeta;
  user: `0x${string}`;
}

const HealthBadge = ({ market, user }: Props) => {
  const pos = useMarketPosition(market.address);

  // Seed from real chain data; allow "what-if" overrides
  const [collat, setCollat] = useState("");
  const [debt,   setDebt]   = useState("");

  // Whenever on-chain data loads, update the inputs
  useEffect(() => {
    if (pos.plainCollateral !== null)
      setCollat((Number(pos.plainCollateral) / 1e6).toFixed(4));
  }, [pos.plainCollateral]);

  useEffect(() => {
    if (pos.plainBorrow !== null)
      setDebt((Number(pos.plainBorrow) / 1e6).toFixed(4));
  }, [pos.plainBorrow]);

  const collatN = parseFloat(collat) || 0;
  const debtN   = parseFloat(debt)   || 0;
  const hf = useHealthFactor(market, collatN, debtN);

  const tone = useMemo(() => {
    if (!isFinite(hf)) return { color: "text-white/60", icon: ShieldCheck, label: "No debt" };
    if (hf >= 1.5) return { color: "text-emerald-300", icon: ShieldCheck, label: "Healthy" };
    if (hf >= 1.1) return { color: "text-amber-300",   icon: Activity,    label: "Watch"   };
    return               { color: "text-rose-300",     icon: ShieldAlert, label: "At risk"  };
  }, [hf]);

  const Icon = tone.icon;

  return (
    <div className="grid gap-3">

      {/* Live HF display */}
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
        <div className="flex flex-col items-end gap-1">
          <div className={`text-[11px] uppercase tracking-[0.18em] font-mono ${tone.color}`}>
            {tone.label}
          </div>
          <button
            onClick={() => pos.refresh()}
            disabled={pos.loading}
            className="flex items-center gap-1 text-[9px] text-white/30 hover:text-white/60 transition-colors"
          >
            <RefreshCcw className={`w-2.5 h-2.5 ${pos.loading ? "animate-spin" : ""}`} />
            {pos.loading ? "Loading…" : "Refresh"}
          </button>
        </div>
      </div>

      {/* What-if simulator */}
      <div className="grid grid-cols-2 gap-2">
        <label className="text-[11px] uppercase tracking-wider text-white/50">Collateral (cUSDC)</label>
        <label className="text-[11px] uppercase tracking-wider text-white/50">Debt (cUSDC)</label>
        <input
          inputMode="decimal"
          value={collat}
          onChange={(e) => setCollat(e.target.value)}
          placeholder="0.0"
          className="bg-white/[0.03] border border-white/10 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-emerald-500/40"
        />
        <input
          inputMode="decimal"
          value={debt}
          onChange={(e) => setDebt(e.target.value)}
          placeholder="0.0"
          className="bg-white/[0.03] border border-white/10 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-rose-500/40"
        />
      </div>

      <p className="text-[11px] text-white/45">
        Values seeded from on-chain plaintext mirrors. Edit to simulate what-if scenarios.
        Liq. threshold: {(market.liqThresholdBps / 100).toFixed(0)}%.
      </p>
    </div>
  );
};

export default HealthBadge;

