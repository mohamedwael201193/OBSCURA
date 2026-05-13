/**
 * MarketCard — market summary tile.
 */
import { Layers, ArrowRight, Activity } from "lucide-react";
import type { CreditMarketMeta } from "@/config/credit";
import { useUtilizationApr } from "@/hooks/useCredit";

interface Props {
  market: CreditMarketMeta & {
    totalSupplyAssets?: bigint;
    totalBorrowAssets?: bigint;
    utilizationBps?: bigint;
    borrowersCount?: bigint;
  };
  onAction?: () => void;
  active?: boolean;
  compact?: boolean;
}

const MarketCard = ({ market, onAction, active, compact }: Props) => {
  const { aprBps } = useUtilizationApr(market.utilizationBps);
  const util = market.utilizationBps !== undefined
    ? `${(Number(market.utilizationBps) / 100).toFixed(1)}%`
    : "—";
  const apr = aprBps !== null ? `${(aprBps / 100).toFixed(2)}%` : "—";
  const supplied = market.totalSupplyAssets !== undefined
    ? `$${(Number(market.totalSupplyAssets) / 1e6).toLocaleString(undefined, { maximumFractionDigits: 2 })}`
    : "—";

  return (
    <button
      type="button"
      onClick={onAction}
      className={`text-left w-full p-4 rounded-xl border transition group ${
        active
          ? "border-violet-400/40 bg-violet-500/[0.04]"
          : "border-white/[0.06] bg-white/[0.015] hover:border-white/[0.12]"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-violet-400/80" />
            <span className="text-[13px] font-medium text-white/90 truncate">{market.label}</span>
          </div>
          <p className="text-[11px] text-white/45 mt-1.5">
            LLTV {(market.lltvBps / 100).toFixed(0)}% · Liq bonus {(market.liqBonusBps / 100).toFixed(1)}%
          </p>
        </div>
        <span className="text-[10px] tracking-[0.18em] uppercase text-violet-300/70 font-mono">
          {market.lltvBps >= 8500 ? "AGGR" : "BAL"}
        </span>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <div className="rounded-md bg-black/20 px-2.5 py-2">
          <div className="text-[10px] uppercase tracking-wider text-white/40">Supplied</div>
          <div className="text-[12px] font-mono text-emerald-200">{supplied}</div>
        </div>
        <div className="rounded-md bg-black/20 px-2.5 py-2">
          <div className="text-[10px] uppercase tracking-wider text-white/40">Util</div>
          <div className="text-[12px] font-mono text-amber-200">{util}</div>
        </div>
        <div className="rounded-md bg-black/20 px-2.5 py-2">
          <div className="text-[10px] uppercase tracking-wider text-white/40">APR</div>
          <div className="text-[12px] font-mono text-violet-200">{apr}</div>
        </div>
      </div>
      {!compact && (
        <div className="mt-3 flex items-center gap-1.5 text-[11px] text-violet-300/80 group-hover:text-violet-300">
          <Activity className="w-3 h-3" /> Borrow <ArrowRight className="w-3 h-3" />
        </div>
      )}
    </button>
  );
};

export default MarketCard;
