/**
 * MarketStatStrip — compact KPI strip for one market: TVL, util%, APR,
 * tiny utilization sparkline (live, public data only).
 */
import { useMemo } from "react";
import { useVaultHistory } from "@/hooks/useVaultHistory";
import { useUtilizationApr } from "@/hooks/useCredit";
import type { CreditMarketMeta } from "@/config/credit";

interface Props {
  market: CreditMarketMeta;
}

export default function MarketStatStrip({ market }: Props) {
  const { samples } = useVaultHistory({ address: market.address, kind: "market", windowMs: 6 * 3600 * 1000 });
  const latest = samples[samples.length - 1];
  const utilBps = typeof latest?.utilizationBps === "number" ? BigInt(latest.utilizationBps) : undefined;
  const { aprBps } = useUtilizationApr(utilBps);

  const path = useMemo(() => {
    const vals = samples.map((s) => typeof s.utilizationBps === "number" ? s.utilizationBps : 0);
    if (vals.length < 2) return "";
    const min = Math.min(...vals);
    const max = Math.max(...vals, min + 1);
    const W = 80, H = 18;
    return vals.map((v, i) => {
      const x = (i / (vals.length - 1)) * W;
      const y = H - ((v - min) / Math.max(1, max - min)) * H;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(" ");
  }, [samples]);

  const tvl = latest ? Number(latest.tvl) / 1e6 : null;
  const utilPct = utilBps !== undefined ? Number(utilBps) / 100 : null;
  const aprPct = aprBps !== null && aprBps !== undefined ? aprBps / 100 : null;

  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.02] backdrop-blur-md px-4 py-2.5 flex items-center justify-between gap-4">
      <div className="min-w-0 flex-1">
        <div className="text-[10px] text-white/45 font-mono truncate">{market.label}</div>
        <div className="mt-0.5 flex items-baseline gap-3">
          <span className="text-[11px] text-white/75 tabular-nums">${tvl === null ? "—" : tvl.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
          <span className="text-[10px] text-cyan-300/80 tabular-nums">{utilPct === null ? "—" : `${utilPct.toFixed(1)}%`}</span>
          <span className="text-[10px] text-violet-300/80 tabular-nums">{aprPct === null ? "—" : `${aprPct.toFixed(2)}% APR`}</span>
        </div>
      </div>
      <svg viewBox="0 0 80 18" preserveAspectRatio="none" className="w-20 h-5 flex-shrink-0">
        <path d={path} fill="none" stroke="rgba(34,211,238,0.65)" strokeWidth="1" />
      </svg>
    </div>
  );
}
