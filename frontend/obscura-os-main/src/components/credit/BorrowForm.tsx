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

  const hfColor = healthFactor === null ? "text-muted-foreground" : healthFactor >= 1.5 ? "text-foreground" : healthFactor >= 1.1 ? "text-amber-600" : "text-destructive";

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
      setMsg(`Borrowed ${amount} ${market.loanSymbol}.`);
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
          symbol={market.collateralSymbol}
          accent="emerald"
          onReveal={pos.decryptShares}
        />
        <EncryptedValue
          label="Borrow Debt"
          value={pos.myBorrow}
          loading={pos.sharesLoading}
          symbol={market.loanSymbol}
          accent="amber"
          onReveal={pos.decryptShares}
        />
      </div>
      {/* Max borrowable — plaintext computed from public shadow + LLTV config */}
      {maxBorrowable > 0n && (
        <div className="flex items-center gap-2 rounded-lg hairline bg-muted/50 px-3 py-2">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Max Borrowable</span>
          <span className="ml-1 text-[9px] text-muted-foreground/70">(public)</span>
          <span className="ml-auto font-mono text-[13px] text-foreground">{fmt6(maxBorrowable)} {market.loanSymbol}</span>
        </div>
      )}

      {/* Health Factor tile */}
      <div className="flex items-center gap-2 rounded-lg hairline bg-muted/50 px-3 py-2">
        <Activity className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Health Factor</span>
        <span className={`ml-auto font-mono text-[13px] font-semibold ${hfColor}`}>
          {healthFactor === null ? "—" : healthFactor.toFixed(2)}
        </span>
      </div>

      <label className="text-[11px] uppercase tracking-wider text-muted-foreground">Market</label>
      <select
        value={market.address ?? ""}
        onChange={(e) => {
          const next = markets.find((m) => m.address === (e.target.value as `0x${string}`));
          if (next) onSelect(next);
        }}
        className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:border-accent/50"
      >
        {markets.map((m) => (
          <option key={m.address} value={m.address} className="bg-background text-foreground">
            {m.label}
          </option>
        ))}
      </select>

      <label className="text-[11px] uppercase tracking-wider text-muted-foreground">Amount ({market.loanSymbol})</label>
      <input
        inputMode="decimal"
        value={amount}
        onFocus={preWarm.onFocus}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="0.0"
        className="rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:border-accent/50"
      />
      <PercentChips
        max={maxBorrowable}
        decimals={6}
        onPick={(v) => setAmount(v === 0n ? "" : (Number(v) / 1e6).toString())}
        accent="violet"
      />

      <label className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">
        <Lock className="w-3 h-3" /> Encrypted destination (optional)
      </label>
      <input
        value={dest}
        onChange={(e) => setDest(e.target.value)}
        placeholder={address ?? "0x…"}
        className="rounded-md border border-border bg-background px-3 py-2 font-mono text-xs focus:outline-none focus:border-accent/50"
      />
      <p className="-mt-1 text-[11px] text-muted-foreground">
        Borrow proceeds are sent by the market as encrypted {market.loanSymbol}. The optional destination is reserved for compatible router flows.
      </p>

      {/* Pre-flight warnings — shown before user signs, no FHE needed */}
      {noCollateral && (
        <div className="rounded-lg border border-amber-500/25 bg-amber-500/[0.06] p-3 grid gap-2">
          <p className="flex items-start gap-1.5 text-[11px] text-amber-700">
            <ShieldAlert className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            <span>
              <span className="font-semibold">No collateral deposited.</span>{" "}
              Supplying to earn interest (Supply tab) is separate from depositing collateral to borrow against.
              You need to supply <span className="font-mono text-amber-800">{market.collateralSymbol}</span> as collateral first.
            </span>
          </p>
          {onGoToCollateral && (
            <button
              onClick={onGoToCollateral}
              className="self-start inline-flex items-center gap-1.5 rounded-md border border-amber-500/30 bg-amber-500/15 px-3 py-1.5 text-[11px] text-amber-800 transition-colors hover:bg-amber-500/25"
            >
              Supply Collateral <ArrowRight className="w-3 h-3" />
            </button>
          )}
        </div>
      )}
      {!noCollateral && wouldBreakLLTV && (
        <p className="flex items-center gap-1.5 text-[11px] text-destructive">
          <ShieldAlert className="w-3 h-3 flex-shrink-0" />
          Amount exceeds max borrowable ({fmt6(maxBorrowable)} {market.loanSymbol}). Reduce amount or add more collateral.
        </p>
      )}
      {!noCollateral && maxBorrowable === 0n && (
        <p className="flex items-center gap-1.5 text-[11px] text-amber-700">
          <AlertTriangle className="w-3 h-3 flex-shrink-0" />
          Max borrowable is 0 — your collateral is fully utilized. Repay debt or add collateral.
        </p>
      )}
      {!noCollateral && noLiquidity && (
        <p className="flex items-center gap-1.5 text-[11px] text-amber-700">
          <AlertTriangle className="w-3 h-3 flex-shrink-0" />
          Insufficient pool liquidity — only {fmt6(availableLiquidity)} {market.loanSymbol} available to borrow.
          Supply {market.loanSymbol} to the pool first to create lending liquidity.
        </p>
      )}

      <button
        disabled={!amount || !destResolved || busy || noCollateral || wouldBreakLLTV || noLiquidity}
        onClick={submit}
        className="mt-2 inline-flex items-center justify-center gap-2 rounded-md border border-foreground/15 bg-foreground px-4 py-2.5 text-sm text-background hover:opacity-90 disabled:opacity-50"
      >
        <ArrowDownToLine className="w-4 h-4" />
        Borrow privately
      </button>
      <FHEStepper status={fheStatus.status} error={fheStatus.error} />
      {msg && <p className="text-xs text-muted-foreground">{msg}</p>}
    </div>
  );
};

export default BorrowForm;
