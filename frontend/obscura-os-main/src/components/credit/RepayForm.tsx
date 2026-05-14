/**
 * RepayForm — encrypted repay using cUSDC operator approval.
 * Shows user's current borrow debt (decrypted via FHE).
 */
import { useState } from "react";
import { ArrowUpFromLine } from "lucide-react";
import { useCreditMarket, useMarketPosition } from "@/hooks/useCredit";
import type { CreditMarketMeta } from "@/config/credit";
import EncryptedValue from "@/components/shared/EncryptedValue";
import FHEStepper from "@/components/shared/FHEStepper";
import PercentChips from "@/components/shared/PercentChips";

interface Props {
  market: CreditMarketMeta;
  markets: CreditMarketMeta[];
  onSelect: (m: CreditMarketMeta) => void;
  onRefresh?: () => void;
}

const RepayForm = ({ market, markets, onSelect, onRefresh }: Props) => {
  const { repay, accrue, fheStatus } = useCreditMarket(market.address);
  const pos = useMarketPosition(market.address);
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState<"repay" | "accrue" | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const submit = async () => {
    if (!amount) return;
    setBusy("repay");
    setMsg(null);
    try {
      const u = BigInt(Math.round(parseFloat(amount) * 1e6));
      await repay(u);
      setMsg(`Repaid ${amount} cUSDC.`);
      setAmount("");
      await pos.refresh();
      onRefresh?.();
    } catch (e: any) {
      setMsg(e?.shortMessage ?? e?.message ?? "Repay failed");
    } finally {
      setBusy(null);
    }
  };

  const tickAccrue = async () => {
    setBusy("accrue");
    setMsg(null);
    try {
      await accrue();
      setMsg("Accrued interest tick complete.");
      onRefresh?.();
    } catch (e: any) {
      setMsg(e?.shortMessage ?? e?.message ?? "Accrue failed");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="grid gap-3">
      {/* Encrypted debt tile */}
      <EncryptedValue
        label="Outstanding borrow"
        value={pos.myBorrow}
        loading={pos.loading}
        symbol="cUSDC"
        accent="violet"
        onReveal={pos.refresh}
      />

      <label className="text-[11px] uppercase tracking-wider text-white/50">Market</label>
      <select
        value={market.address ?? ""}
        onChange={(e) => {
          const next = markets.find((m) => m.address === (e.target.value as `0x${string}`));
          if (next) onSelect(next);
        }}
        className="bg-white/[0.03] border border-white/10 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-emerald-500/40"
      >
        {markets.map((m) => (
          <option key={m.address} value={m.address}>{m.label}</option>
        ))}
      </select>

      <label className="text-[11px] uppercase tracking-wider text-white/50">Amount (cUSDC)</label>
      <input
        inputMode="decimal"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="0.0"
        className="bg-white/[0.03] border border-white/10 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-emerald-500/40"
      />
      <PercentChips
        max={pos.plainBorrow ?? 0n}
        decimals={6}
        onPick={(v) => setAmount(v === 0n ? "" : (Number(v) / 1e6).toString())}
        accent="emerald"
      />

      <div className="flex flex-wrap gap-2 mt-2">
        <button
          disabled={!amount || !!busy}
          onClick={submit}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md text-sm bg-emerald-500/15 border border-emerald-500/40 text-emerald-100 hover:bg-emerald-500/25 disabled:opacity-50"
        >
          <ArrowUpFromLine className="w-4 h-4" />
          Repay
        </button>
        {(pos.plainBorrow ?? 0n) > 0n && (
          <button
            type="button"
            disabled={!!busy}
            onClick={() => setAmount((Number(pos.plainBorrow ?? 0n) / 1e6).toString())}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md text-sm bg-violet-500/10 border border-violet-500/30 text-violet-200 hover:bg-violet-500/20 disabled:opacity-50"
          >
            Repay all
          </button>
        )}
        <button
          disabled={!!busy}
          onClick={tickAccrue}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md text-sm bg-white/[0.03] border border-white/10 text-white/80 hover:bg-white/[0.06] disabled:opacity-50"
        >
          Accrue interest
        </button>
      </div>
      <FHEStepper status={fheStatus.status} error={fheStatus.error} />
      {msg && <p className="text-xs text-white/60">{msg}</p>}
    </div>
  );
};

export default RepayForm;
