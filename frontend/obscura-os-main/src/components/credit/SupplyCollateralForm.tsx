/**
 * SupplyCollateralForm — two-step FHE collateral supply & withdraw.
 *
 * Supply flow (two-step, mirrors proven Escrow pattern):
 *   Step 1: cToken.confidentialTransfer(market, encAmt1)   ← user signs
 *   Step 2: market.supplyCollateral(amtPlain, encAmt2)     ← user signs
 *
 * Withdraw flow (single call, market IS the holder):
 *   market.withdrawCollateral(amtPlain, encAmt)
 *   Contract does plaintext LLTV check before sending cToken back.
 *
 * Uses plaintext shadow reads (getPlainCollateral, maxBorrowable) for
 * instant pre-check warnings — no FHE decrypt required for these.
 */
import { useState } from "react";
import { Lock, ShieldCheck, ShieldAlert, ArrowUpToLine, ArrowDownToLine } from "lucide-react";
import { useAccount } from "wagmi";
import { useCreditMarket, useMarketPosition } from "@/hooks/useCredit";
import { CREDIT_TOKENS } from "@/config/credit";
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

type Tab = "supply" | "withdraw";

const SupplyCollateralForm = ({ market, markets, onSelect, onRefresh }: Props) => {
  const { address } = useAccount();
  const { supplyCollateral, withdrawCollateral, fheStatus } = useCreditMarket(market.address);
  const pos = useMarketPosition(market.address);

  const [tab, setTab]     = useState<Tab>("supply");
  const [amount, setAmount] = useState("");
  const [busy, setBusy]   = useState(false);
  const [msg, setMsg]     = useState<string | null>(null);

  const collToken = CREDIT_TOKENS[market.collateralSymbol];

  const parsedAmt = (): bigint | null => {
    const n = parseFloat(amount);
    if (isNaN(n) || n <= 0) return null;
    return BigInt(Math.round(n * 1e6));
  };

  const amtBig = parsedAmt();

  // Plaintext pre-check for withdraw: would LLTV breach after this withdrawal?
  const plainColl  = pos.plainCollateral  ?? 0n;
  const plainBorrow = pos.plainBorrow     ?? 0n;
  const maxB = pos.maxBorrowableAmt       ?? 0n;

  const withdrawWouldBreachLLTV = (): boolean => {
    if (tab !== "withdraw" || !amtBig) return false;
    if (amtBig > plainColl) return true;
    const remainColl = plainColl - amtBig;
    const maxBorrowAfter = BigInt(Math.floor(Number(remainColl) * market.lltvBps / 10000));
    return plainBorrow > maxBorrowAfter;
  };

  const lltvBreach = withdrawWouldBreachLLTV();

  const submit = async () => {
    if (!amtBig || !address) return;
    setBusy(true);
    setMsg(null);
    try {
      if (tab === "supply") {
        const collAddr = collToken?.address;
        if (!collAddr) throw new Error("Collateral token address not configured");
        await supplyCollateral(amtBig, collAddr);
        setMsg(`Supplied ${amount} ${market.collateralSymbol} as collateral.`);
      } else {
        if (lltvBreach) throw new Error("Withdrawal would breach LLTV — repay some debt first");
        if (amtBig > plainColl) throw new Error("Insufficient collateral deposited");
        await withdrawCollateral(amtBig);
        setMsg(`Withdrew ${amount} ${market.collateralSymbol} collateral.`);
      }
      setAmount("");
      await pos.refresh();
      onRefresh?.();
    } catch (e: any) {
      setMsg(e?.shortMessage ?? e?.message ?? "Transaction failed");
    } finally {
      setBusy(false);
    }
  };

  const fmt6 = (v: bigint) =>
    (Number(v) / 1e6).toLocaleString(undefined, { maximumFractionDigits: 4 });

  return (
    <div className="grid gap-3">
      {/* Position summary */}
      <div className="grid grid-cols-3 gap-2 mb-1">
        <EncryptedValue
          label="Collateral"
          value={pos.loading ? null : plainColl}
          loading={pos.loading}
          symbol={market.collateralSymbol}
          accent="emerald"
          onReveal={pos.refresh}
        />
        <EncryptedValue
          label="Outstanding"
          value={pos.loading ? null : plainBorrow}
          loading={pos.loading}
          symbol="cUSDC"
          accent="violet"
          onReveal={pos.refresh}
        />
        <EncryptedValue
          label="Max Borrow"
          value={pos.loading ? null : maxB}
          loading={pos.loading}
          symbol="cUSDC"
          accent="amber"
          onReveal={pos.refresh}
        />
      </div>

      {/* Supply / Withdraw tabs */}
      <div className="flex gap-1 rounded-md bg-white/5 p-0.5 text-xs">
        {(["supply", "withdraw"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setMsg(null); }}
            className={`flex-1 rounded py-1.5 capitalize transition-colors ${
              tab === t ? "bg-violet-500/20 text-violet-100" : "text-white/50 hover:text-white/80"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Market selector */}
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
            {m.label}
          </option>
        ))}
      </select>

      {/* Amount input */}
      <label className="text-[11px] uppercase tracking-wider text-white/50">
        Amount ({market.collateralSymbol})
      </label>
      <input
        inputMode="decimal"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="0.0"
        className="bg-white/[0.03] border border-white/10 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-violet-500/40"
      />
      <PercentChips
        max={tab === "supply" ? 0n : plainColl}
        decimals={6}
        onPick={(v) => setAmount(v === 0n ? "" : (Number(v) / 1e6).toString())}
        accent="violet"
      />

      {/* Warnings */}
      {tab === "supply" && plainColl === 0n && (
        <p className="text-[11px] text-amber-300/80 flex items-center gap-1.5">
          <ShieldAlert className="w-3 h-3 flex-shrink-0" />
          You have no collateral yet. Supply collateral before borrowing.
        </p>
      )}
      {tab === "supply" && plainColl > 0n && (
        <p className="text-[11px] text-emerald-300/70 flex items-center gap-1.5">
          <ShieldCheck className="w-3 h-3 flex-shrink-0" />
          Collateral deposited: {fmt6(plainColl)} {market.collateralSymbol}.
          Max borrowable: {fmt6(maxB)} cUSDC.
        </p>
      )}
      {tab === "withdraw" && lltvBreach && (
        <p className="text-[11px] text-red-300/80 flex items-center gap-1.5">
          <ShieldAlert className="w-3 h-3 flex-shrink-0" />
          This withdrawal would breach LLTV. Repay debt first.
        </p>
      )}
      {tab === "withdraw" && amtBig !== null && amtBig > plainColl && (
        <p className="text-[11px] text-red-300/80 flex items-center gap-1.5">
          <ShieldAlert className="w-3 h-3 flex-shrink-0" />
          Amount exceeds your deposited collateral ({fmt6(plainColl)} {market.collateralSymbol}).
        </p>
      )}

      {/* Privacy note for supply */}
      {tab === "supply" && (
        <p className="text-[11px] text-white/40">
          Two-step FHE: collateral is transferred then the encrypted handle is settled.
          Amount is private on-chain.
        </p>
      )}

      <button
        disabled={!amtBig || busy || (tab === "withdraw" && (lltvBreach || amtBig > plainColl))}
        onClick={submit}
        className="mt-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-sm bg-emerald-500/15 border border-emerald-500/40 text-emerald-100 hover:bg-emerald-500/25 disabled:opacity-50"
      >
        {tab === "supply" ? (
          <ArrowUpToLine className="w-4 h-4" />
        ) : (
          <ArrowDownToLine className="w-4 h-4" />
        )}
        {tab === "supply" ? "Supply collateral" : "Withdraw collateral"}
      </button>

      <FHEStepper status={fheStatus.status} error={fheStatus.error} />

      {msg && (
        <p className={`text-xs ${msg.toLowerCase().includes("fail") || msg.toLowerCase().includes("error") ? "text-red-300/70" : "text-emerald-300/70"}`}>
          {msg}
        </p>
      )}
    </div>
  );
};

export default SupplyCollateralForm;
