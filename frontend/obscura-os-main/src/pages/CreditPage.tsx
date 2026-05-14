/**
 * Wave 4 — ObscuraCredit dashboard.
 *
 * Single page hosting nine tab sections. Style cloned from PayPage so the
 * surface feels native: AmbientBackground + DashboardSidebar + PageHeader.
 *
 * All on-chain actions use hooks from `@/hooks/useCredit` which already
 * handle FHE encryption + capped EIP-1559 fees + per-call gas caps.
 */
import { useEffect, useCallback, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAccount, usePublicClient } from "wagmi";
import {
  LayoutDashboard,
  PiggyBank,
  Layers,
  ArrowDownToLine,
  ArrowUpFromLine,
  Activity,
  Gavel,
  Award,
  ScrollText,
  Settings as SettingsIcon,
  Sparkles,
  RefreshCcw,
  Loader2,
  ShieldCheck,
  Lock,
} from "lucide-react";

import AmbientBackground from "@/components/elite/AmbientBackground";
import DashboardSidebar, { SidebarSection } from "@/components/elite/DashboardSidebar";
import { PageHeader, Card, CardHeader, FeatureStrip } from "@/components/elite/Layout";
import EncryptedText from "@/components/shared/EncryptedText";

// Local helper: card with overline + title + helper text + body.
const Section = ({ title, overline, hint, children }: { title: string; overline?: string; hint?: string; children: React.ReactNode }) => (
  <Card>
    {overline && (
      <div className="px-5 pt-4 text-[9px] tracking-[0.22em] uppercase text-violet-400/60 font-mono">{overline}</div>
    )}
    <CardHeader title={title} />
    {hint && <p className="px-5 pt-2 text-[11px] text-white/55">{hint}</p>}
    <div className="px-5 py-4">{children}</div>
  </Card>
);

import {
  useCreditMarkets,
  useCreditVaults,
  useCreditAuctions,
  useCreditMarket,
  useCreditVault,
  useCreditScore,
  useCreditStreamHook,
  useCreditInsuranceHook,
  useApprovedSets,
  useGovernanceProxy,
  useUtilizationApr,
  useHealthFactor,
  useVaultPosition,
} from "@/hooks/useCredit";
import {
  CREDIT_HEALTH_FACTOR_FORMULA,
  CREDIT_DEFAULT_AUCTION_WINDOW_SEC,
  type CreditMarketMeta,
  type CreditVaultMeta,
} from "@/config/credit";

import VaultCard from "@/components/credit/VaultCard";
import MarketCard from "@/components/credit/MarketCard";
import BorrowForm from "@/components/credit/BorrowForm";
import RepayForm from "@/components/credit/RepayForm";
import HealthBadge from "@/components/credit/HealthBadge";
import AuctionCard from "@/components/credit/AuctionCard";
import CreditScoreCard from "@/components/credit/CreditScoreCard";
import SettingsPanel from "@/components/credit/SettingsPanel";
import HistoryFeed from "@/components/credit/HistoryFeed";
import SupplyCollateralForm from "@/components/credit/SupplyCollateralForm";
import SupplyForm from "@/components/credit/SupplyForm";

type CreditTab =
  | "home"
  | "vaults"
  | "markets"
  | "collateral"
  | "supply"
  | "borrow"
  | "repay"
  | "health"
  | "auctions"
  | "score"
  | "history"
  | "settings";

const sidebarSections: SidebarSection[] = [
  { items: [{ key: "home", label: "Overview", icon: LayoutDashboard }] },
  {
    heading: "Earn",
    items: [
      { key: "vaults", label: "Vaults", icon: PiggyBank },
      { key: "markets", label: "Markets", icon: Layers },
      { key: "supply", label: "Supply", icon: ArrowUpFromLine },
    ],
  },
  {
    heading: "Borrow",
    items: [
      { key: "collateral", label: "Collateral", icon: ShieldCheck },
      { key: "borrow", label: "Borrow", icon: ArrowDownToLine },
      { key: "repay", label: "Repay", icon: ArrowUpFromLine },
      { key: "health", label: "Health", icon: Activity },
    ],
  },
  {
    heading: "Risk",
    items: [
      { key: "auctions", label: "Sealed Auctions", icon: Gavel },
      { key: "score", label: "Credit Score", icon: Award },
    ],
  },
  {
    heading: "Tools",
    items: [
      { key: "history", label: "History", icon: ScrollText },
      { key: "settings", label: "Settings", icon: SettingsIcon },
    ],
  },
];

const featureItems = [
  { icon: Lock, title: "Fully encrypted", body: "Borrow amounts, collateral and recipients are all CoFHE handles — zero plaintext leakage." },
  { icon: ShieldCheck, title: "Curated risk", body: "Vaults route deposits across approved markets with hard LLTV ceilings." },
  { icon: Sparkles, title: "Sealed bidding", body: "Liquidation auctions use encrypted bids — no MEV frontrun or last-second sniping." },
];

const CreditPage = () => {
  const { isConnected, address } = useAccount();
  const [tab, setTab] = useState<CreditTab>("home");
  const [activeMarket, setActiveMarket] = useState<CreditMarketMeta | undefined>(undefined);
  const [activeVault, setActiveVault] = useState<CreditVaultMeta | undefined>(undefined);

  const { markets, refresh: refreshMarkets } = useCreditMarkets();
  const { vaults, refresh: refreshVaults } = useCreditVaults();
  const { auctions, refresh: refreshAuctions, submitBid, settle } = useCreditAuctions();
  const approved = useApprovedSets();

  // initial select
  useEffect(() => {
    if (!activeMarket && markets[0]) setActiveMarket(markets[0]);
    if (!activeVault && vaults[0]) setActiveVault(vaults[0]);
  }, [markets, vaults, activeMarket, activeVault]);

  // refresh on mount
  useEffect(() => {
    refreshMarkets();
    refreshVaults();
    refreshAuctions();
    approved.refresh();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const totalSupplied = useMemo(
    () => markets.reduce((acc, m) => acc + (m.totalSupplyAssets ?? 0n), 0n),
    [markets]
  );
  const totalBorrowed = useMemo(
    () => markets.reduce((acc, m) => acc + (m.totalBorrowAssets ?? 0n), 0n),
    [markets]
  );

  const renderHome = () => (
    <div className="grid gap-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Section title="Total supplied" hint="Sum of all market public mirrors">
          <p className="text-3xl font-light text-emerald-300">${(Number(totalSupplied) / 1e6).toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
        </Section>
        <Section title="Total borrowed" hint="Plaintext mirror sum">
          <p className="text-3xl font-light text-violet-300">${(Number(totalBorrowed) / 1e6).toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
        </Section>
        <Section title="Active markets" hint="Approved by governance">
          <p className="text-3xl font-light text-amber-300">{markets.length}</p>
        </Section>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Section title="Top vault" hint="Curated supply destination">
          {vaults[0] ? (
            <VaultCard vault={vaults[0]} compact onAction={() => { setActiveVault(vaults[0]); setTab("vaults"); }} />
          ) : <p className="text-xs text-white/50">No vaults yet</p>}
        </Section>
        <Section title="Top market" hint="Most utilization right now">
          {markets[0] ? (
            <MarketCard market={markets[0]} compact onAction={() => { setActiveMarket(markets[0]); setTab("borrow"); }} />
          ) : <p className="text-xs text-white/50">No markets yet</p>}
        </Section>
      </div>

      <FeatureStrip items={featureItems} />
    </div>
  );

  const renderVaults = () => (
    <div className="grid gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg text-white/90">Curated vaults</h2>
        <button onClick={refreshVaults} className="text-xs text-white/60 hover:text-white inline-flex items-center gap-1.5">
          <RefreshCcw className="w-3 h-3" /> Refresh
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {vaults.map((v) => (
          <VaultCard key={v.address} vault={v} onAction={() => setActiveVault(v)} active={activeVault?.address === v.address} />
        ))}
      </div>
      {activeVault && <VaultActionsCard vault={activeVault} onRefresh={refreshVaults} />}
    </div>
  );

  const renderMarkets = () => (
    <div className="grid gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg text-white/90">Lending markets</h2>
        <button onClick={refreshMarkets} className="text-xs text-white/60 hover:text-white inline-flex items-center gap-1.5">
          <RefreshCcw className="w-3 h-3" /> Refresh
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {markets.map((m) => (
          <MarketCard
            key={m.address}
            market={m}
            onAction={() => { setActiveMarket(m); setTab("borrow"); }}
            active={activeMarket?.address === m.address}
          />
        ))}
      </div>
    </div>
  );

  const renderBorrow = () => (
    <div className="grid gap-4">
      <Section title="Borrow" hint="Stealth — recipient & amount encrypted. Supply collateral first.">
        {activeMarket ? (
          <BorrowForm market={activeMarket} markets={markets} onSelect={setActiveMarket} onRefresh={refreshMarkets} />
        ) : <p className="text-xs text-white/50">Select a market on the Markets tab.</p>}
      </Section>
    </div>
  );

  const renderCollateral = () => (
    <div className="grid gap-4">
      <Section
        title="Supply / Withdraw Collateral"
        hint="Required before borrowing. Two-step FHE: collateral amount is private on-chain."
      >
        {activeMarket ? (
          <SupplyCollateralForm market={activeMarket} markets={markets} onSelect={setActiveMarket} onRefresh={refreshMarkets} />
        ) : <p className="text-xs text-white/50">Select a market on the Markets tab.</p>}
      </Section>
    </div>
  );

  const renderSupply = () => (
    <div className="grid gap-4">
      <Section
        title="Supply to Market"
        hint="Earn interest from borrowers. Supply positions are FHE-encrypted."
      >
        {activeMarket ? (
          <SupplyForm market={activeMarket} markets={markets} onSelect={setActiveMarket} onRefresh={refreshMarkets} />
        ) : <p className="text-xs text-white/50">Select a market on the Markets tab.</p>}
      </Section>
    </div>
  );

  const renderRepay = () => (
    <div className="grid gap-4">
      <Section title="Repay" hint="Burns encrypted debt against your position.">
        {activeMarket ? (
          <RepayForm market={activeMarket} markets={markets} onSelect={setActiveMarket} onRefresh={refreshMarkets} />
        ) : <p className="text-xs text-white/50">Select a market on the Markets tab.</p>}
      </Section>
    </div>
  );

  const renderHealth = () => (
    <div className="grid gap-4">
      <Section title="Position health" hint={CREDIT_HEALTH_FACTOR_FORMULA}>
        {activeMarket && address ? (
          <HealthBadge market={activeMarket} user={address} />
        ) : <p className="text-xs text-white/50">Connect wallet & pick a market.</p>}
      </Section>
    </div>
  );

  const renderAuctions = () => (
    <div className="grid gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg text-white/90">Sealed Auctions</h2>
        <button onClick={refreshAuctions} className="text-xs text-white/60 hover:text-white inline-flex items-center gap-1.5">
          <RefreshCcw className="w-3 h-3" /> Refresh
        </button>
      </div>
      {auctions.length === 0 ? (
        <Section title="No auctions" hint={`Default auction window: ${CREDIT_DEFAULT_AUCTION_WINDOW_SEC / 60} minutes.`}>
          <p className="text-sm text-white/60">Nothing to bid on right now.</p>
        </Section>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {auctions.map((a) => (
            <AuctionCard key={a.id.toString()} auction={a} onBid={submitBid} onSettle={settle} />
          ))}
        </div>
      )}
    </div>
  );

  const renderScore = () => (
    <div className="grid gap-4">
      <CreditScoreCard />
    </div>
  );

  const renderHistory = () => (
    <div className="grid gap-4">
      <HistoryFeed markets={markets} />
    </div>
  );

  const renderSettings = () => (
    <div className="grid gap-4">
      <SettingsPanel markets={markets} approved={approved} />
    </div>
  );

  const renderActive = () => {
    switch (tab) {
      case "home":       return renderHome();
      case "vaults":     return renderVaults();
      case "markets":    return renderMarkets();
      case "collateral": return renderCollateral();
      case "supply":     return renderSupply();
      case "borrow":     return renderBorrow();
      case "repay":      return renderRepay();
      case "health":     return renderHealth();
      case "auctions":   return renderAuctions();
      case "score":      return renderScore();
      case "history":    return renderHistory();
      case "settings":   return renderSettings();
    }
  };

  return (
    <div className="min-h-screen flex bg-[#06090c] text-foreground antialiased">
      <AmbientBackground />

      <DashboardSidebar
        sections={sidebarSections}
        active={tab}
        onSelect={(k) => setTab(k as CreditTab)}
      />

      <div className="flex-1 min-w-0 flex flex-col">
        <main className="flex-1 min-w-0 px-6 lg:px-8 py-7 max-w-5xl w-full mx-auto">
          <PageHeader
            breadcrumb={["Dashboard", "Credit"]}
            title={<><EncryptedText duration={1100}>ObscuraCredit</EncryptedText></>}
            lede={<>Encrypted lending — supply to vaults, borrow under stealth, settle via sealed auctions. All amounts are CoFHE handles on-chain.</>}
            badge={
              isConnected ? (
                <span className="hidden md:inline-flex items-center gap-1.5 text-[10.5px] tracking-[0.05em] text-violet-300/80 px-2.5 py-1 rounded-md border border-violet-500/20 bg-violet-500/[0.04]">
                  Live on Arbitrum Sepolia
                </span>
              ) : null
            }
          />

          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            >
              {renderActive()}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────
// Inline: Vault deposit/withdraw card (small enough to keep inline).
// ─────────────────────────────────────────────────────────────────────────
import { useState as useStateVault } from "react";

const VaultActionsCard = ({ vault, onRefresh }: { vault: CreditVaultMeta; onRefresh?: () => void }) => {
  const v = useCreditVault(vault.address);
  const pos = useVaultPosition(vault.address);
  const [amt, setAmt] = useStateVault("");
  const [busy, setBusy] = useStateVault<"deposit" | "withdraw" | null>(null);
  const [msg, setMsg] = useStateVault<string | null>(null);

  const run = async (kind: "deposit" | "withdraw") => {
    setBusy(kind);
    setMsg(null);
    try {
      const u = BigInt(Math.round(parseFloat(amt) * 1e6));
      if (kind === "deposit") await v.deposit(u);
      else await v.withdraw(u);
      setMsg(`${kind === "deposit" ? "Deposited" : "Withdrew"} ${amt} cUSDC`);
      setAmt("");
      // refresh both local position and the parent vault list TVL
      await pos.refresh();
      onRefresh?.();
    } catch (e: any) {
      setMsg(e?.shortMessage ?? e?.message ?? "Failed");
    } finally {
      setBusy(null);
    }
  };

  const mySharesDisplay = pos.myShares !== null
    ? `${(Number(pos.myShares) / 1e6).toLocaleString(undefined, { maximumFractionDigits: 6 })} cUSDC`
    : pos.loading ? "loading…" : "—";
  const tvlDisplay = pos.tvl !== null
    ? `$${(Number(pos.tvl) / 1e6).toLocaleString(undefined, { maximumFractionDigits: 2 })}`
    : pos.loading ? "loading…" : "—";

  return (
    <Section title={`Manage ${vault.name}`} hint="Encrypted deposit & withdraw">
      {/* Position row */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <div className="rounded-md bg-black/20 px-2.5 py-2">
          <div className="text-[10px] uppercase tracking-wider text-white/40">Your deposit</div>
          <div className="text-[13px] font-mono text-emerald-200">{mySharesDisplay}</div>
        </div>
        <div className="rounded-md bg-black/20 px-2.5 py-2">
          <div className="text-[10px] uppercase tracking-wider text-white/40">Vault TVL</div>
          <div className="text-[13px] font-mono text-emerald-200">{tvlDisplay}</div>
        </div>
      </div>
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          inputMode="decimal"
          value={amt}
          onChange={(e) => setAmt(e.target.value)}
          placeholder="Amount in cUSDC"
          className="flex-1 bg-white/[0.03] border border-white/10 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-emerald-500/40"
        />
        <button
          disabled={!amt || !!busy}
          onClick={() => run("deposit")}
          className="px-4 py-2 rounded-md text-sm bg-emerald-500/10 border border-emerald-500/30 text-emerald-200 hover:bg-emerald-500/20 disabled:opacity-50 inline-flex items-center justify-center gap-1.5"
        >
          {busy === "deposit" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
          Deposit
        </button>
        <button
          disabled={!amt || !!busy}
          onClick={() => run("withdraw")}
          className="px-4 py-2 rounded-md text-sm bg-white/[0.03] border border-white/10 text-white/80 hover:bg-white/[0.06] disabled:opacity-50 inline-flex items-center justify-center gap-1.5"
        >
          {busy === "withdraw" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
          Withdraw
        </button>
      </div>
      {msg && <p className="mt-2 text-xs text-white/60">{msg}</p>}
    </Section>
  );
};

export default CreditPage;
