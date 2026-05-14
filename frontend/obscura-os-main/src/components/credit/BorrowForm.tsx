/**
 * BorrowForm — encrypted borrow with optional stealth destination.
 * Shows user's current collateral + borrow position (decrypted via FHE).
 * Plaintext shadow reads (getPlainCollateral, maxBorrowable) give instant
 * pre-check warnings before the user signs any transaction.
 */
import { useMemo, useState } from "react";
import { Loader2, Lock, ArrowDownToLine, ShieldAlert, AlertTriangle } from "lucide-react";
import { useAccount } from "wagmi";
import { useCreditMarket, useMarketPosition } from "@/hooks/useCredit";
import type { CreditMarketMeta } from "@/config/credit";

interface Props {
  market: CreditMarketMeta;
  markets: CreditMarketMeta[];
  onSelect: (m: CreditMarketMeta) => void;
  onRefresh?: () => void;
}

const BorrowForm = ({ market, markets, onSelect, onRefresh }: Props) => {
  const { address } = useAccount();
  const { borrow } = useCreditMarket(market.address);
  const pos = useMarketPosition(market.address);
  const [amount, setAmount] = useState("");
  const [dest, setDest] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const destResolved = useMemo(() => (dest.trim() ? dest.trim() : address ?? ""), [dest, address]);

  // Plaintext pre-checks (no FHE decrypt needed — fast shadow reads)
  const plainColl       = pos.plainCollateral  ?? 0n;
  const maxBorrowable   = pos.maxBorrowableAmt ?? 0n;
  const amtBig          = amount ? BigInt(Math.round(parseFloat(amount) * 1e6)) : 0n;
  const noCollateral    = plainColl === 0n;
  const wouldBreakLLTV  = amtBig > 0n && amtBig > maxBorrowable;
  const noLiquidity     = false; // checked on-chain — the contract will revert with "InsufficientLiquidity"

  const fmt6 = (v: bigint) =>
    (Number(v) / 1e6).toLocaleString(undefined, { maximumFractionDigits: 4 });

  const submit = async () => {
    if (!amount || !destResolved) return;
    setBusy(true);
    setMsg(null);
    try {
      const u = BigInt(Math.round(parseFloat(amount) * 1e6));
      await borrow(u, destResolved as `0x${string}`);
      setMsg(`Borrowed ${amount} cUSDC under stealth.`);
      setAmount("");
      await pos.refresh();
      onRefresh?.();
    } catch (e: any) {
      setMsg(e?.shortMessage ?? e?.message ?? "Borrow failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-3">
      {/* Position tiles — plaintext shadows (fast) + FHE decrypted values */}
      <div className="grid grid-cols-2 gap-2 mb-1">
        <div className="rounded-md bg-black/20 px-3 py-2">
          <div className="text-[10px] uppercase tracking-wider text-white/40 flex items-center gap-1">
            <Lock className="w-2.5 h-2.5" /> Your collateral
          </div>
          <div className="font-mono text-sm text-emerald-200 mt-0.5">
            {pos.loading
              ? <Loader2 className="w-3 h-3 animate-spin inline" />
              : `${fmt6(plainColl)} cUSDC`}
          </div>
        </div>
        <div className="rounded-md bg-black/20 px-3 py-2">
          <div className="text-[10px] uppercase tracking-wider text-white/40 flex items-center gap-1">
            <Lock className="w-2.5 h-2.5" /> Max borrowable
          </div>
          <div className="font-mono text-sm text-amber-200 mt-0.5">
            {pos.loading
              ? <Loader2 className="w-3 h-3 animate-spin inline" />
              : `${fmt6(maxBorrowable)} cUSDC`}
          </div>
        </div>
      </div>

      <label className="text-[11px] uppercase tracking-wider text-white/50">Market</label>
      <select
        value={market.address ?? ""}
        onChange={(e) => {
          const next = markets.find((m) => m.address === (e.target.value as `0x${string}`));
          if (next) onSelect(next);
        }}
        className="bg-white/[0.03] border border-white/10 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-violet-500/40"
      >
        {markets.map((m) => (
          <option key={m.address} value={m.address}>
            {m.label} · LLTV {(m.lltvBps / 100).toFixed(0)}%
          </option>
        ))}
      </select>

      <label className="text-[11px] uppercase tracking-wider text-white/50">Amount (cUSDC)</label>
      <input
        inputMode="decimal"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="0.0"
        className="bg-white/[0.03] border border-white/10 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-violet-500/40"
      />

      <label className="text-[11px] uppercase tracking-wider text-white/50 flex items-center gap-1.5">
        <Lock className="w-3 h-3" /> Encrypted destination (optional)
      </label>
      <input
        value={dest}
        onChange={(e) => setDest(e.target.value)}
        placeholder={address ?? "0x…"}
        className="bg-white/[0.03] border border-white/10 rounded-md px-3 py-2 text-xs font-mono focus:outline-none focus:border-violet-500/40"
      />
      <p className="text-[11px] text-white/45 -mt-1">
        The recipient is encrypted into the cUSDC transfer; observers cannot link borrower to receiver.
      </p>

      {/* Pre-flight warnings — shown before user signs, no FHE needed */}
      {noCollateral && (
        <p className="text-[11px] text-amber-300/80 flex items-center gap-1.5">
          <ShieldAlert className="w-3 h-3 flex-shrink-0" />
          You have no collateral. Go to the Collateral tab to supply collateral first.
        </p>
      )}
      {!noCollateral && wouldBreakLLTV && (
        <p className="text-[11px] text-red-300/80 flex items-center gap-1.5">
          <ShieldAlert className="w-3 h-3 flex-shrink-0" />
          Amount exceeds max borrowable ({fmt6(maxBorrowable)} cUSDC). Reduce amount or add more collateral.
        </p>
      )}
      {!noCollateral && maxBorrowable === 0n && (
        <p className="text-[11px] text-amber-300/80 flex items-center gap-1.5">
          <AlertTriangle className="w-3 h-3 flex-shrink-0" />
          Max borrowable is 0 — your collateral is fully utilized. Repay debt or add collateral.
        </p>
      )}

      <button
        disabled={!amount || !destResolved || busy || noCollateral || wouldBreakLLTV}
        onClick={submit}
        className="mt-2 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-sm bg-violet-500/15 border border-violet-500/40 text-violet-100 hover:bg-violet-500/25 disabled:opacity-50"
      >
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowDownToLine className="w-4 h-4" />}
        Borrow encrypted
      </button>
      {msg && <p className="text-xs text-white/60">{msg}</p>}
    </div>
  );
};

export default BorrowForm;
