/**
 * VaultCard — vault summary tile.
 */
import { PiggyBank, ArrowRight } from "lucide-react";
import type { CreditVaultMeta } from "@/config/credit";

interface Props {
  vault: CreditVaultMeta & { publicTotalDeposited?: bigint; feeBps?: number };
  onAction?: () => void;
  active?: boolean;
  compact?: boolean;
}

const VaultCard = ({ vault, onAction, active, compact }: Props) => {
  const tvl = vault.publicTotalDeposited
    ? `$${(Number(vault.publicTotalDeposited) / 1e6).toLocaleString(undefined, { maximumFractionDigits: 2 })}`
    : "—";
  const fee = vault.feeBps !== undefined ? `${(vault.feeBps / 100).toFixed(2)}%` : "—";
  return (
    <button
      type="button"
      onClick={onAction}
      className={`text-left w-full p-4 rounded-xl border transition group ${
        active
          ? "border-emerald-400/40 bg-emerald-500/[0.04]"
          : "border-white/[0.06] bg-white/[0.015] hover:border-white/[0.12]"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <PiggyBank className="w-4 h-4 text-emerald-400/80" />
            <span className="text-[13px] font-medium text-white/90 truncate">{vault.name}</span>
          </div>
          {vault.description && !compact && (
            <p className="text-[11.5px] text-white/55 mt-1.5 leading-relaxed">{vault.description}</p>
          )}
        </div>
        <span className="text-[10px] tracking-[0.18em] uppercase text-emerald-300/70 font-mono">
          {vault.riskTier}
        </span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-md bg-black/20 px-2.5 py-2">
          <div className="text-[10px] uppercase tracking-wider text-white/40">TVL (mirror)</div>
          <div className="text-[13px] font-mono text-emerald-200">{tvl}</div>
        </div>
        <div className="rounded-md bg-black/20 px-2.5 py-2">
          <div className="text-[10px] uppercase tracking-wider text-white/40">Curator fee</div>
          <div className="text-[13px] font-mono text-white/80">{fee}</div>
        </div>
      </div>
      {!compact && (
        <div className="mt-3 flex items-center gap-1.5 text-[11px] text-emerald-300/80 group-hover:text-emerald-300">
          Manage <ArrowRight className="w-3 h-3" />
        </div>
      )}
    </button>
  );
};

export default VaultCard;
