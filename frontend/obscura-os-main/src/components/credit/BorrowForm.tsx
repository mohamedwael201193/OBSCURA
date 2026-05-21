/**
 * BorrowForm — encrypted borrow with optional stealth destination.
 * Shows user's current collateral + borrow position (decrypted via FHE).
 * Plaintext shadow reads (getPlainCollateral, maxBorrowable) give instant
 * pre-check warnings before the user signs any transaction.
 */
import { useMemo, useState } from "react";
import { Lock, ArrowDownToLine, ShieldAlert, AlertTriangle, Activity, ArrowRight } from "lucide-react";
import { useAccount } from "wagmi";
import { useCreditMarket, useMarketPosition } from "@/hooks/useCredit";
import type { CreditMarketMeta } from "@/config/credit";
import EncryptedValue from "@/components/shared/EncryptedValue";
import FHEStepper from "@/components/shared/FHEStepper";
import PercentChips from "@/components/shared/PercentChips";
import { useGasPreflight, GasPreflightError } from "@/hooks/useGasPreflight";
import { usePreWarmFHE } from "@/hooks/usePreWarmFHE";

interface Props {
  market: CreditMarketMeta;
  markets: CreditMarketMeta[];
  onSelect: (m: CreditMarketMeta) => void;
  onRefresh?: () => void;
  /** Navigate to the Collateral tab (passed from CreditPage) */
  onGoToCollateral?: () => void;
}

const BorrowForm = ({ market, markets, onSelect, onRefresh, onGoToCollateral }: Props) => {
  const preWarm = usePreWarmFHE();
  const { address } = useAccount();
  const { borrow, fheStatus } = useCreditMarket(market.address);
  const pos = useMarketPosition(market.address);
  const { check: checkGas } = useGasPreflight();
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
  const plainBorrow  = pos.plainBorrow ?? 0n;

  // Health Factor: collateral value / borrow (simplified; 0 if no borrow)
  const healthFactor = useMemo(() => {
    if (plainBorrow === 0n) return null;
    const hf = Number(plainColl) * market.lltvBps / 10000 / Number(plainBorrow);
    return hf;
  }, [plainColl, plainBorrow, market.lltvBps]);

  // Available liquidity = totalSupplyAssets - totalBorrowAssets (public on-chain)
  const availableLiquidity = useMemo(() => {
    const tsa = market.totalSupplyAssets ?? 0n;
    const tba = market.totalBorrowAssets ?? 0n;
    return tsa >= tba ? tsa - tba : 0n;
  }, [market.totalSupplyAssets, market.totalBorrowAssets]);

  const noLiquidity = amtBig > 0n && amtBig > availableLiquidity;

  const fmt6 = (v: bigint) =>
    (Number(v) / 1e6).toLocaleString(undefined, { maximumFractionDigits: 4 });

  const hfColor = healthFactor === null ? "text-white/40" : healthFactor >= 1.5 ? "text-emerald-400" : healthFactor >= 1.1 ? "text-amber-400" : "text-red-400";

  const submit = async () => {
    if (!amount || !destResolved) return;
    setBusy(true);
    setMsg(null);
    try {
      // Pre-flight gas check — avoid MetaMask prompt + permit signature
      // when the wallet can't even cover the two-step submit.
      await checkGas();
      const u = BigInt(Math.round(parseFloat(amount) * 1e6));
      await borrow(u, destResolved as `0x${string}`);
      setMsg(`Borrowed ${amount} cUSDC under stealth.`);
      setAmount("");
      pos.resetDecrypted(); // clear stale 0.00 tile — user re-reveals fresh value
      await pos.refresh();
      onRefresh?.();
    } catch (e: any) {
      if (e instanceof GasPreflightError) {
        setMsg(e.message);
      } else {
        setMsg(e?.shortMessage ?? e?.message ?? "Borrow failed");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-3">
      {/* Position tiles — FHE encrypted, explicit reveal */}
      <div className="grid grid-cols-2 gap-2 mb-1">
        <EncryptedValue
          label="Your Collateral"
          value={pos.myCollateral}
          loading={pos.sharesLoading}
          symbol="cUSDC"
          accent="emerald"
          onReveal={pos.decryptShares}
        />
        <EncryptedValue
          label="Borrow Debt"
          value={pos.myBorrow}
          loading={pos.sharesLoading}
          symbol="cUSDC"
          accent="amber"
          onReveal={pos.decryptShares}
        />
      </div>
      {/* Max borrowable — plaintext computed from public shadow + LLTV config */}
      {maxBorrowable > 0n && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-black/20 border border-white/[0.05]">
          <span className="text-[10px] text-white/40 uppercase tracking-wider">Max Borrowable</span>
          <span className="text-[9px] text-white/20 ml-1">(public)</span>
          <span className="ml-auto font-mono text-[13px] text-violet-300">{fmt6(maxBorrowable)} cUSDC</span>
        </div>
      )}

      {/* Health Factor tile */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-black/20 border border-white/[0.05]">
        <Activity className="w-3.5 h-3.5 text-white/40" />
        <span className="text-[10px] text-white/40 uppercase tracking-wider">Health Factor</span>
        <span className={`ml-auto font-mono text-[13px] font-semibold ${hfColor}`}>
          {healthFactor === null ? "—" : healthFactor.toFixed(2)}
        </span>
      </div>

      <label className="text-[11px] uppercase tracking-wider text-white/50">Market</label>
      <select
        value={market.address ?? ""}
        onChange={(e) => {
          const next = markets.find((m) => m.address === (e.target.value as `0x${string}`));
          if (next) onSelect(next);
        }}
        className="bg-[#0d0d14] text-white border border-white/10 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-violet-500/40"
      >
        {markets.map((m) => (
          <option key={m.address} value={m.address} className="bg-[#0d0d14] text-white">
            {m.label}
          </option>
        ))}
      </select>

      <label className="text-[11px] uppercase tracking-wider text-white/50">Amount (cUSDC)</label>
      <input
        inputMode="decimal"
        value={amount}
        onFocus={preWarm.onFocus}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="0.0"
        className="bg-white/[0.03] border border-white/10 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-violet-500/40"
      />
      <PercentChips
        max={maxBorrowable}
        decimals={6}
        onPick={(v) => setAmount(v === 0n ? "" : (Number(v) / 1e6).toString())}
        accent="violet"
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
        <div className="rounded-lg border border-amber-500/25 bg-amber-500/[0.06] p-3 grid gap-2">
          <p className="text-[11px] text-amber-300/90 flex items-start gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            <span>
              <span className="font-semibold">No collateral deposited.</span>{" "}
              Supplying to earn interest (Supply tab) is separate from depositing collateral to borrow against.
              You need to supply <span className="text-amber-200 font-mono">{market.collateralSymbol}</span> as collateral first.
            </span>
          </p>
          {onGoToCollateral && (
            <button
              onClick={onGoToCollateral}
              className="self-start inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] bg-amber-500/15 border border-amber-500/30 text-amber-200 hover:bg-amber-500/25 transition-colors"
            >
              Supply Collateral <ArrowRight className="w-3 h-3" />
            </button>
          )}
        </div>
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
      {!noCollateral && noLiquidity && (
        <p className="text-[11px] text-orange-300/80 flex items-center gap-1.5">
          <AlertTriangle className="w-3 h-3 flex-shrink-0" />
          Insufficient pool liquidity — only {fmt6(availableLiquidity)} cUSDC available to borrow.
          Supply cUSDC to the pool first to create lending liquidity.
        </p>
      )}

      <button
        disabled={!amount || !destResolved || busy || noCollateral || wouldBreakLLTV || noLiquidity}
        onClick={submit}
        className="mt-2 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-sm bg-violet-500/15 border border-violet-500/40 text-violet-100 hover:bg-violet-500/25 disabled:opacity-50"
      >
        <ArrowDownToLine className="w-4 h-4" />
        Borrow under stealth
      </button>
      <FHEStepper status={fheStatus.status} error={fheStatus.error} />
      {msg && <p className="text-xs text-white/60">{msg}</p>}
    </div>
  );
};

export default BorrowForm;
