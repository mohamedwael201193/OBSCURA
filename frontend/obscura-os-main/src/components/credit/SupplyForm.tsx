/**
 * SupplyForm — two-step FHE supply to a credit market (earn interest).
 *
 * Supply flow (two-step):
 *   Step 1: ocUSDC.confidentialTransfer(market, encAmt1)  ← user signs
 *   Step 2: market.supply(amtPlain, encAmt2)              ← user signs
 *
 * Withdraw flow (single call, market IS the holder):
 *   market.withdraw(amtPlain)
 *
 * The user's supply position is tracked via encrypted shares. The plaintext
 * shadow (_plainSupplyShares) is used to show an approximate balance in the UI.
 */
import { useState } from "react";
import { usePreWarmFHE } from "@/hooks/usePreWarmFHE";
import { ArrowUpToLine, ArrowDownToLine, AlertTriangle } from "lucide-react";
import { useAccount } from "wagmi";
import { useCreditMarket, useMarketPosition } from "@/hooks/useCredit";
import type { CreditMarketMeta } from "@/config/credit";
import { useOcUSDCBalance } from "@/hooks/useOcUSDCBalance";
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

const SupplyForm = ({ market, markets, onSelect, onRefresh }: Props) => {
  const preWarm = usePreWarmFHE();
  const { address } = useAccount();
  const { supply, withdraw, fheStatus } = useCreditMarket(market.address);
  const pos = useMarketPosition(market.address);
  const { decrypted: ocUSDCDecrypted } = useOcUSDCBalance();
  const cUSDCBal = market.isCanonical ? (ocUSDCDecrypted ?? 0n) : 0n;

  const [tab, setTab]     = useState<Tab>("supply");
  const [amount, setAmount] = useState("");
  const [busy, setBusy]   = useState(false);
  const [msg, setMsg]     = useState<string | null>(null);

  const parsedAmt = (): bigint | null => {
    const n = parseFloat(amount);
    if (isNaN(n) || n <= 0) return null;
    return BigInt(Math.round(n * 1e6));
  };

  const amtBig = parsedAmt();

  const submit = async () => {
    if (!amtBig || !address) return;
    setBusy(true);
    setMsg(null);
    try {
      if (tab === "supply") {
        await supply(amtBig);
        setMsg(`Supplied ${amount} ${market.loanSymbol} to market.`);
      } else {
        await withdraw(amtBig);
        setMsg(`Withdrew ${amount} ${market.loanSymbol} from market.`);
      }
      setAmount("");
      pos.resetDecrypted(); // clear stale tile so user re-reveals fresh value
      await pos.refresh();
      onRefresh?.();
    } catch (e: any) {
      setMsg(e?.shortMessage ?? e?.message ?? "Transaction failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-3">
      {/* Position summary */}
      <div className="grid grid-cols-2 gap-2 mb-1">
        <EncryptedValue
          label="Your Supply"
          value={pos.mySupply}
          loading={pos.sharesLoading}
          symbol={market.loanSymbol}
          accent="cyan"
          onReveal={pos.decryptShares}
        />
        <div className="rounded-xl hairline bg-card p-3 space-y-2">
          <div className="text-[9px] tracking-[0.18em] uppercase text-white/35">Risk tier</div>
          <div className={`text-sm font-semibold ${
            market.riskTier === "Conservative"
              ? "text-[hsl(var(--success))]"
              : market.riskTier === "Aggressive"
              ? "text-rose-300"
              : "text-amber-300"
          }`}>
            {market.riskTier}
          </div>
        </div>
      </div>

      {/* Supply / Withdraw tabs */}
      <div className="flex gap-1 rounded-md bg-white/5 p-0.5 text-xs">
        {(["supply", "withdraw"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setMsg(null); }}
            className={`flex-1 rounded py-1.5 capitalize transition-colors ${
              tab === t ? "bg-cyan-500/20 text-cyan-100" : "text-white/50 hover:text-white/80"
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
        className="bg-[#0d0d14] text-white border border-white/10 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-cyan-500/40"
      >
        {markets.map((m) => (
          <option key={m.address} value={m.address} className="bg-[#0d0d14] text-white">
            {m.label}
          </option>
        ))}
      </select>

      {/* Amount input */}
      <label className="text-[11px] uppercase tracking-wider text-white/50">
        Amount ({market.loanSymbol})
      </label>
      <input
        inputMode="decimal"
        value={amount}
        onFocus={preWarm.onFocus}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="0.0"
        className="border-border bg-background rounded-md px-3 py-2 text-sm focus:outline-none focus:border-cyan-500/40"
      />
      <PercentChips
        max={tab === "supply" ? cUSDCBal : (pos.mySupply ?? 0n)}
        decimals={6}
        onPick={(v) => setAmount(v === 0n ? "" : (Number(v) / 1e6).toString())}
        accent="cyan"
      />

      {/* Withdraw warning when no supply */}
      {tab === "withdraw" && pos.mySupply !== null && pos.mySupply === 0n && (
        <p className="text-[11px] text-amber-300/80 flex items-center gap-1.5">
          <AlertTriangle className="w-3 h-3 flex-shrink-0" />
          No supply position in this market.
        </p>
      )}

      {/* Supply privacy note */}
      {tab === "supply" && (
        <p className="text-[11px] text-white/40">
          Two-step FHE: {market.loanSymbol} is transferred, then supply shares are credited.
          Your position amount is private on-chain.
        </p>
      )}

      <button
        disabled={!amtBig || busy}
        onClick={submit}
        className="mt-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-sm bg-cyan-500/15 border border-cyan-500/40 text-cyan-100 hover:bg-cyan-500/25 disabled:opacity-50"
      >
        {tab === "supply" ? (
          <ArrowUpToLine className="w-4 h-4" />
        ) : (
          <ArrowDownToLine className="w-4 h-4" />
        )}
        {tab === "supply" ? "Supply to market" : "Withdraw from market"}
      </button>

      <FHEStepper status={fheStatus.status} error={fheStatus.error} />

      {msg && (
        <p className={`text-xs ${msg.toLowerCase().includes("fail") || msg.toLowerCase().includes("error") ? "text-red-300/70" : "text-cyan-300/70"}`}>
          {msg}
        </p>
      )}
    </div>
  );
};

export default SupplyForm;
