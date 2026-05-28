import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowDownToLine, ArrowUpRight, Eye, EyeOff, Layers, Loader2, ShieldAlert, WalletCards } from "lucide-react";
import { CreditReputationPanel } from "@/components/credit/CreditReputationPanel";
import {
  HarmonyKpi,
  HarmonyKpiGrid,
  HarmonyPageIntro,
  HarmonySection,
} from "@/components/harmony/harmony-ui";
import type { CreditMarketMeta } from "@/hooks/useCreditMarkets";
import type { CreditVaultMeta } from "@/hooks/useCreditVaults";
import { useUtilizationApr } from "@/hooks/useCredit";
import { useOcUSDCBalance } from "@/hooks/useOcUSDCBalance";

function formatUsd(value?: bigint) {
  if (value === undefined) return "—";
  const amount = Number(value) / 1e6;
  const maximumFractionDigits = amount > 0 && amount < 1 ? 6 : 2;
  return `$${amount.toLocaleString(undefined, { maximumFractionDigits })}`;
}

function formatPercentBps(value?: bigint | number) {
  if (value === undefined) return "—";
  return `${(Number(value) / 100).toFixed(1)}%`;
}

function formatOcusdc(value: bigint) {
  const amount = Number(value) / 1e6;
  const maximumFractionDigits = amount > 0 && amount < 1 ? 6 : 4;
  return amount.toLocaleString(undefined, { maximumFractionDigits });
}

function CreditPrivateBalanceKpi() {
  const { decrypted, busy, error, reveal } = useOcUSDCBalance();
  const [revealed, setRevealed] = useState(false);
  const display = decrypted === null ? null : formatOcusdc(decrypted);

  const handleReveal = async () => {
    if (display !== null) {
      setRevealed(true);
      return;
    }
    setRevealed(false);
    try {
      const plain = await reveal();
      setRevealed(plain !== null);
    } catch {
      setRevealed(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-baseline gap-3">
        <span className="font-display text-2xl tabular-nums">
          {revealed && display !== null ? display : <span className="cipher-shimmer text-muted-foreground">••••••</span>}
        </span>
        <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">ocUSDC</span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => revealed ? setRevealed(false) : void handleReveal()}
          disabled={busy}
          className="inline-flex h-7 items-center gap-1.5 rounded-full hairline px-2.5 text-[11px] text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : revealed ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
          {busy ? "Decrypting" : revealed ? "Hide" : "Reveal"}
        </button>
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground/70">Pay balance</span>
      </div>
      {error && <p className="text-xs leading-relaxed text-destructive/80">{error}</p>}
    </div>
  );
}

function RiskRow({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between border-b border-border/40 pb-1.5">
      <span className="opacity-70">{k}</span>
      <span>{v}</span>
    </div>
  );
}

export function CreditHarmonyOverview({
  markets,
  vaults: _vaults,
  onSupply,
  onBorrow,
  onOpenVault,
}: {
  markets: CreditMarketMeta[];
  vaults: CreditVaultMeta[];
  onSupply: () => void;
  onBorrow: () => void;
  onOpenVault: () => void;
}) {
  const primary = markets[0];
  const totalSupplied = markets.reduce((sum, market) => sum + (market.totalSupplyAssets ?? 0n), 0n);
  const totalBorrowed = markets.reduce((sum, market) => sum + (market.totalBorrowAssets ?? 0n), 0n);
  const availableLiquidity = totalSupplied >= totalBorrowed ? totalSupplied - totalBorrowed : 0n;
  const utilizationBps = totalSupplied > 0n ? Number((totalBorrowed * 10000n) / totalSupplied) : Number(primary?.utilizationBps ?? 0n);
  const { aprBps } = useUtilizationApr(primary?.utilizationBps);
  const borrowApy = aprBps === null ? "—" : `${(aprBps / 100).toFixed(2)}%`;
  const supplyApy = aprBps === null ? "—" : `${((aprBps * utilizationBps) / 10000 / 100).toFixed(2)}%`;

  return (
    <>
      <HarmonyPageIntro
        eyebrow="Encrypted lending terminal"
        title="Obscura Credit"
        actions={
          <>
            <button
              type="button"
              onClick={onSupply}
              className="inline-flex h-10 items-center gap-2 rounded-full bg-foreground px-4 text-sm font-medium text-background"
            >
              <WalletCards className="h-3.5 w-3.5" />
              Supply
            </button>
            <button type="button" onClick={onBorrow} className="inline-flex h-10 items-center gap-2 rounded-full hairline px-4 text-sm">
              <ArrowDownToLine className="h-3.5 w-3.5" />
              Borrow
            </button>
            <button type="button" onClick={onOpenVault} className="inline-flex h-10 items-center gap-2 rounded-full hairline px-4 text-sm">
              <Layers className="h-3.5 w-3.5" />
              Earn
            </button>
          </>
        }
      />

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <HarmonyKpiGrid>
          <HarmonyKpi label="Private balance">
            <CreditPrivateBalanceKpi />
          </HarmonyKpi>
          <HarmonyKpi label="Borrow APY">
            <span className="font-display text-3xl">{borrowApy}</span>
          </HarmonyKpi>
          <HarmonyKpi label="Utilization">
            <span className="font-display text-3xl text-[hsl(var(--success))]">{formatPercentBps(utilizationBps)}</span>
          </HarmonyKpi>
          <HarmonyKpi label="Borrowable liquidity">
            <span className="font-display text-3xl">{formatUsd(availableLiquidity)}</span>
          </HarmonyKpi>
        </HarmonyKpiGrid>
      </motion.div>

      <div className="mt-10 grid gap-6 lg:grid-cols-3">
        <div className="rounded-2xl hairline bg-card p-6 lg:col-span-2">
          <div className="flex items-center justify-between">
            <p className="font-display text-2xl">Your position</p>
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              {primary?.label ?? "Select market"}
            </span>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Supplied</p>
              <p className="mt-2 font-display text-3xl cipher-shimmer text-muted-foreground">••••••</p>
              <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                ocUSDC · encrypted
              </p>
            </div>
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Borrow</p>
              <p className="mt-2 font-display text-3xl cipher-shimmer text-muted-foreground">••••••</p>
              <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                ocUSDC · reveal in Position
              </p>
            </div>
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Collateral</p>
              <p className="mt-2 font-display text-3xl cipher-shimmer text-muted-foreground">••••••</p>
              <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                ocUSDC · hidden by default
              </p>
            </div>
          </div>
          <div className="mt-8 rounded-xl bg-muted/50 p-4">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="text-muted-foreground">Primary path</span>
              <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-foreground">Direct market</span>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Use Pay-backed ocUSDC from Pay, commit encrypted collateral directly to the market, then borrow after settlement.
            </p>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl bg-foreground p-6 text-background">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-accent" />
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] opacity-70">Risk · Encrypted</span>
          </div>
          <p className="mt-4 font-display text-3xl leading-tight">Risk is managed without exposing position size.</p>
          <p className="mt-3 text-sm opacity-70">
            Liquidations and score changes flow through the shared activity worker and generic notifications.
          </p>
          <div className="mt-6 space-y-2 font-mono text-[11px]">
            <RiskRow k="Feed" v="Supabase realtime" />
            <RiskRow k="Liq. bonus" v="5%" />
            <RiskRow k="LLTV" v={primary ? `${primary.lltvBps / 100}%` : "—"} />
            <RiskRow k="Notifications" v="shared dispatcher" />
          </div>
        </div>
      </div>

      <div className="mt-6">
        <CreditReputationPanel compact />
      </div>

      <HarmonySection title="Borrow market" hint="Live public pool metrics. Wallet balances stay encrypted until Position reveal.">
        <div className="grid gap-3 md:hidden">
          {markets.map((m) => (
            <div key={m.address} className="rounded-2xl hairline bg-card p-5">
              <div className="flex items-start justify-between gap-3">
                <p className="text-base font-medium leading-snug">{m.label}</p>
                <span className="rounded-full bg-muted px-2 py-1 font-mono text-[10px] text-muted-foreground">LLTV {m.lltvBps / 100}%</span>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Supplied</p>
                  <p className="mt-1 font-mono text-foreground">{formatUsd(m.totalSupplyAssets)}</p>
                </div>
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Borrowed</p>
                  <p className="mt-1 font-mono text-foreground">{formatUsd(m.totalBorrowAssets)}</p>
                </div>
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Est. supply APY</p>
                  <p className="mt-1 font-mono text-[hsl(var(--success))]">{m.address === primary?.address ? supplyApy : "—"}</p>
                </div>
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Utilization</p>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                    <span className="block h-full bg-accent" style={{ width: `${Math.min(100, Number(m.utilizationBps ?? 0n) / 100)}%` }} />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="hidden overflow-hidden rounded-2xl hairline bg-card md:block">
          <div className="grid grid-cols-12 bg-surface px-6 py-3 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            <span className="col-span-4">Market</span>
            <span className="col-span-2">Supplied</span>
            <span className="col-span-2">Borrowed</span>
            <span className="col-span-1">LLTV</span>
            <span className="col-span-2">Est. supply APY</span>
            <span className="col-span-1 text-right">Util</span>
          </div>
          {markets.map((m) => (
            <div
              key={m.address}
              className="grid grid-cols-12 items-center border-t border-border px-6 py-4 transition-colors hover:bg-muted/40"
            >
              <span className="col-span-4 font-medium">{m.label}</span>
              <span className="col-span-2 font-mono text-sm text-muted-foreground">{formatUsd(m.totalSupplyAssets)}</span>
              <span className="col-span-2 font-mono text-sm text-muted-foreground">{formatUsd(m.totalBorrowAssets)}</span>
              <span className="col-span-1 font-mono text-sm">{m.lltvBps / 100}%</span>
              <span className="col-span-2 font-mono text-sm text-[hsl(var(--success))]">{m.address === primary?.address ? supplyApy : "—"}</span>
              <span className="col-span-1 flex items-center justify-end gap-2">
                <span className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                  <span className="block h-full bg-accent" style={{ width: `${Math.min(100, Number(m.utilizationBps ?? 0n) / 100)}%` }} />
                </span>
              </span>
            </div>
          ))}
        </div>
      </HarmonySection>

      <HarmonySection title="Earn options" hint="Direct supply is the default path. Vaults live in Earn when you want curated allocation.">
        <div className="rounded-2xl hairline bg-card p-5 sm:flex sm:items-center sm:justify-between sm:gap-6">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Pay-backed ocUSDC</p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Keep the overview focused, then move to Earn for direct supply, withdrawals, and advanced vault management.
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenVault}
            className="mt-4 inline-flex h-10 items-center gap-1.5 rounded-full bg-foreground px-4 text-sm text-background sm:mt-0"
          >
            Open Earn <ArrowUpRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </HarmonySection>
    </>
  );
}
