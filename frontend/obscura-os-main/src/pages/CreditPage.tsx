/**
 * Wave 4 v2 — ObscuraCredit dashboard.
 *
 * 4-tab IA: Markets | Position | Vaults | Liquidations.
 * Settings lives in a gear-icon slide-over (not a tab).
 * "Get test funds" CTA in header opens SetupSheet.
 *
 * Privacy rules:
 *  - Markets tab: fully public, no wallet needed
 *  - Position tab: wallet-triggered FHE decrypt only (no auto-decrypt)
 *  - EncryptedTile hides values behind "████████" until user clicks Reveal
 *  - Copy never mentions "euint", "ctHash", "CoFHE", "ACL", or "permit"
 */
import { useEffect, useCallback, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAccount, usePublicClient } from "wagmi";
import {
  BarChart3,
  Wallet,
  PiggyBank,
  Gavel,
  Settings as SettingsIcon,
  Droplet,
  RefreshCcw,
  Eye,
  EyeOff,
  ArrowDownToLine,
  ArrowUpFromLine,
  ShieldCheck,
  X,
  Loader2,
  Lock,
  Info,
} from "lucide-react";

import AmbientBackground from "@/components/elite/AmbientBackground";
import { PageHeader } from "@/components/elite/Layout";
import EncryptedText from "@/components/shared/EncryptedText";
import FHEStepper from "@/components/shared/FHEStepper";

import {
  useCreditMarkets,
  useCreditVaults,
  useCreditAuctions,
  useCreditVault,
  useApprovedSets,
  useUtilizationApr,
  useVaultPosition,
  useMarketPosition,
} from "@/hooks/useCredit";
import {
  CREDIT_MARKETS,
  CREDIT_DEFAULT_AUCTION_WINDOW_SEC,
  type CreditMarketMeta,
  type CreditVaultMeta,
} from "@/config/credit";

import MarketCard from "@/components/credit/MarketCard";
import VaultCard from "@/components/credit/VaultCard";
import BorrowForm from "@/components/credit/BorrowForm";
import RepayForm from "@/components/credit/RepayForm";
import SupplyForm from "@/components/credit/SupplyForm";
import SupplyCollateralForm from "@/components/credit/SupplyCollateralForm";
import SealedAuctionCard from "@/components/credit/SealedAuctionCard";
import CreditScoreRing from "@/components/credit/CreditScoreRing";
import SettingsPanel from "@/components/credit/SettingsPanel";
import PrivateExplorer from "@/components/credit/PrivateExplorer";
import HealthRibbon from "@/components/credit/HealthRibbon";
import LiquidationAlertCenter from "@/components/credit/LiquidationAlertCenter";
import CreditOnboarding from "@/components/credit/CreditOnboarding";
import CreditAlertDrawer from "@/components/credit/CreditAlertDrawer";
import EncryptedTile from "@/components/credit/EncryptedTile";
import HealthBar from "@/components/credit/HealthBar";
import SetupSheet from "@/components/credit/SetupSheet";
import { useCreditOnboarding } from "@/hooks/useCreditOnboarding";
import { useCreditAlerts } from "@/hooks/useCreditAlerts";

// ─── Tab types ────────────────────────────────────────────────────────────
type CreditTab = "markets" | "position" | "vaults" | "liquidations";

const TAB_CONFIG: { key: CreditTab; label: string; icon: React.ReactNode }[] = [
  { key: "markets",      label: "Markets",      icon: <BarChart3 className="w-4 h-4" /> },
  { key: "position",     label: "Position",     icon: <Wallet className="w-4 h-4" /> },
  { key: "vaults",       label: "Vaults",       icon: <PiggyBank className="w-4 h-4" /> },
  { key: "liquidations", label: "Liquidations", icon: <Gavel className="w-4 h-4" /> },
];

// ─── Shared stat chip ─────────────────────────────────────────────────────
function StatChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
      <span className="text-[9px] tracking-[0.18em] uppercase text-white/35 font-mono">{label}</span>
      <span className="text-lg font-mono font-semibold text-white/90">{value}</span>
    </div>
  );
}

// ─── Tab bar ──────────────────────────────────────────────────────────────
function TabBar({ active, onChange }: { active: CreditTab; onChange: (t: CreditTab) => void }) {
  return (
    <div className="flex items-center gap-0.5 p-1 bg-white/[0.03] border border-white/[0.06] rounded-xl">
      {TAB_CONFIG.map((t) => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          className={`flex-1 min-w-0 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
            active === t.key
              ? "bg-violet-500/20 border border-violet-500/30 text-violet-200"
              : "text-white/50 hover:text-white/80"
          }`}
        >
          {t.icon}
          <span className="hidden sm:inline">{t.label}</span>
        </button>
      ))}
    </div>
  );
}

// ─── Markets tab ──────────────────────────────────────────────────────────
function MarketsTab({
  markets,
  onRefresh,
  onBorrow,
  onSupply,
}: {
  markets: (CreditMarketMeta & { totalSupplyAssets?: bigint; totalBorrowAssets?: bigint; utilizationBps?: bigint })[];
  onRefresh: () => void;
  onBorrow: (m: CreditMarketMeta) => void;
  onSupply: (m: CreditMarketMeta) => void;
}) {
  const totalSupplied = markets.reduce((a, m) => a + (m.totalSupplyAssets ?? 0n), 0n);
  const totalBorrowed = markets.reduce((a, m) => a + (m.totalBorrowAssets ?? 0n), 0n);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <StatChip label="Total supplied" value={`$${(Number(totalSupplied) / 1e6).toLocaleString(undefined, { maximumFractionDigits: 0 })}`} />
        <StatChip label="Total borrowed" value={`$${(Number(totalBorrowed) / 1e6).toLocaleString(undefined, { maximumFractionDigits: 0 })}`} />
        <StatChip label="Markets" value={String(markets.length)} />
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[11px] tracking-[0.18em] uppercase text-white/40 font-mono">Lending markets</h3>
          <button onClick={onRefresh} className="text-[10px] text-white/40 hover:text-white/70 inline-flex items-center gap-1">
            <RefreshCcw className="w-3 h-3" /> Refresh
          </button>
        </div>
        {markets.length === 0 && <p className="text-[11px] text-white/30 py-4">No markets configured yet.</p>}
        <div className="space-y-3">
          {markets.map((m) => (
            <div key={m.address ?? m.label} className="rounded-2xl border border-white/[0.06] bg-white/[0.015] overflow-hidden">
              <div className="p-4">
                <MarketCard market={m} compact />
              </div>
              <div className="flex border-t border-white/[0.06]">
                <button
                  onClick={() => onBorrow(m)}
                  className="flex-1 py-2.5 text-[11px] text-violet-300/80 hover:bg-violet-500/[0.06] hover:text-violet-200 transition-colors flex items-center justify-center gap-1.5 border-r border-white/[0.06]"
                >
                  <ArrowDownToLine className="w-3 h-3" /> Borrow now
                </button>
                <button
                  onClick={() => onSupply(m)}
                  className="flex-1 py-2.5 text-[11px] text-emerald-300/80 hover:bg-emerald-500/[0.06] hover:text-emerald-200 transition-colors flex items-center justify-center gap-1.5"
                >
                  <ArrowUpFromLine className="w-3 h-3" /> Supply for yield
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-violet-500/15 bg-violet-950/20 p-5">
        <div className="flex items-start gap-3">
          <Lock className="w-5 h-5 text-violet-400/70 mt-0.5 shrink-0" />
          <div className="space-y-1.5">
            <p className="text-[12px] font-medium text-white/80">Fully encrypted positions</p>
            <p className="text-[10.5px] text-white/45 leading-relaxed">
              Borrow amounts, collateral, and recipients are encrypted on-chain. No one — including Obscura — can see your position size.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Position tab ─────────────────────────────────────────────────────────
type PosAction = "borrow" | "repay" | "collateral" | "supply" | null;

function PositionTab({
  markets,
  onRefresh,
}: {
  markets: (CreditMarketMeta & { totalSupplyAssets?: bigint; totalBorrowAssets?: bigint; utilizationBps?: bigint })[];
  onRefresh: () => void;
}) {
  const { isConnected } = useAccount();
  const [selectedAddr, setSelectedAddr] = useState<`0x${string}` | undefined>(markets[0]?.address);
  const [revealed, setRevealed] = useState(false);
  const [action, setAction] = useState<PosAction>(null);

  const market = useMemo(
    () => markets.find((m) => m.address === selectedAddr) ?? markets[0],
    [markets, selectedAddr]
  );

  const pos = useMarketPosition(selectedAddr);

  // Compute HF from plain shadow reads (no FHE needed, uses public scalars)
  const hfNum = useMemo(() => {
    if (!market || !pos.plainBorrow || pos.plainBorrow === 0n) return null;
    return (Number(pos.plainCollateral ?? 0n) * market.liqThresholdBps) /
           (Number(pos.plainBorrow) * 10000);
  }, [market, pos.plainBorrow, pos.plainCollateral]);

  const handleRevealAll = useCallback(async () => {
    await pos.decryptShares();
    setRevealed(true);
  }, [pos]);

  const fmt = (v: bigint | null) =>
    v === null ? null : (Number(v) / 1e6).toLocaleString(undefined, { maximumFractionDigits: 2 });

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <Lock className="w-8 h-8 text-white/25" />
        <p className="text-sm text-white/50">Connect your wallet to view your position</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {markets.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {markets.map((m) => (
            <button
              key={m.address ?? m.label}
              onClick={() => { setSelectedAddr(m.address); setRevealed(false); setAction(null); }}
              className={`shrink-0 px-3 py-1.5 rounded-lg border text-[10px] font-mono transition-all ${
                m.address === selectedAddr
                  ? "border-violet-500/40 bg-violet-500/15 text-violet-200"
                  : "border-white/10 bg-white/[0.03] text-white/50 hover:text-white/80"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] tracking-[0.15em] uppercase text-white/35 font-mono">Your position</span>
          <button
            onClick={revealed ? () => setRevealed(false) : handleRevealAll}
            disabled={pos.sharesLoading}
            className="inline-flex items-center gap-1.5 text-[10px] text-white/45 hover:text-white/80 transition-colors disabled:opacity-40"
          >
            {pos.sharesLoading ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : revealed ? (
              <><EyeOff className="w-3 h-3" /> Hide all</>
            ) : (
              <><Eye className="w-3 h-3" /> Reveal all</>
            )}
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <EncryptedTile
            label="Supplied" symbol="ocUSDC"
            displayValue={fmt(pos.mySupply)} revealed={revealed}
            loading={pos.sharesLoading} onReveal={handleRevealAll}
            onExpire={() => setRevealed(false)} accent="emerald"
          />
          <EncryptedTile
            label="Borrowed" symbol="ocUSDC"
            displayValue={fmt(pos.myBorrow)} revealed={revealed}
            loading={pos.sharesLoading} onReveal={handleRevealAll}
            onExpire={() => setRevealed(false)} accent="violet"
          />
          <EncryptedTile
            label="Collateral" symbol="ocUSDC"
            displayValue={fmt(pos.myCollateral)} revealed={revealed}
            loading={pos.sharesLoading} onReveal={handleRevealAll}
            onExpire={() => setRevealed(false)} accent="amber"
          />
        </div>
      </div>

      <HealthBar hf={hfNum} loading={pos.loading} />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {([
          { key: "borrow" as PosAction,     label: "Borrow more",    icon: <ArrowDownToLine className="w-3.5 h-3.5" /> },
          { key: "repay" as PosAction,      label: "Repay",          icon: <ArrowUpFromLine className="w-3.5 h-3.5" /> },
          { key: "collateral" as PosAction, label: "Add collateral", icon: <ShieldCheck className="w-3.5 h-3.5" /> },
          { key: "supply" as PosAction,     label: "Supply",         icon: <PiggyBank className="w-3.5 h-3.5" /> },
        ] as const).map((a) => (
          <button
            key={a.key}
            onClick={() => setAction(action === a.key ? null : a.key)}
            className={`py-2.5 rounded-xl border text-[11px] font-medium flex items-center justify-center gap-1.5 transition-all ${
              action === a.key
                ? "border-violet-500/40 bg-violet-500/15 text-violet-200"
                : "border-white/[0.08] bg-white/[0.03] text-white/60 hover:text-white/90 hover:border-white/20"
            }`}
          >
            {a.icon} {a.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {action && market && (
          <motion.div
            key={action}
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[11px] tracking-[0.15em] uppercase text-white/40 font-mono">
                  {action === "borrow" ? "Borrow more" : action === "repay" ? "Repay" : action === "collateral" ? "Add collateral" : "Supply for yield"}
                </span>
                <button onClick={() => setAction(null)} className="text-white/30 hover:text-white/60">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              {action === "borrow" && <BorrowForm market={market} markets={markets} onSelect={(m) => setSelectedAddr(m.address)} onRefresh={onRefresh} />}
              {action === "repay" && <RepayForm market={market} markets={markets} onSelect={(m) => setSelectedAddr(m.address)} onRefresh={onRefresh} />}
              {action === "collateral" && <SupplyCollateralForm market={market} markets={markets} onSelect={(m) => setSelectedAddr(m.address)} onRefresh={onRefresh} />}
              {action === "supply" && <SupplyForm market={market} markets={markets} onSelect={(m) => setSelectedAddr(m.address)} onRefresh={onRefresh} />}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => { void pos.refresh(); onRefresh(); setRevealed(false); }}
        className="text-[10px] text-white/30 hover:text-white/60 inline-flex items-center gap-1"
      >
        <RefreshCcw className="w-3 h-3" /> Refresh position
      </button>
    </div>
  );
}

// ─── Vaults tab ───────────────────────────────────────────────────────────
function VaultsTab({ vaults, onRefresh }: { vaults: CreditVaultMeta[]; onRefresh: () => void }) {
  const [selectedAddr, setSelectedAddr] = useState<`0x${string}` | undefined>(vaults[0]?.address);
  const [vaultAmt, setVaultAmt] = useState("");
  const [busy, setBusy] = useState<"deposit" | "withdraw" | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const vault = useMemo(() => vaults.find((v) => v.address === selectedAddr) ?? vaults[0], [vaults, selectedAddr]);
  const v = useCreditVault(vault?.address);
  const pos = useVaultPosition(vault?.address);

  const run = async (kind: "deposit" | "withdraw") => {
    const u = BigInt(Math.round(parseFloat(vaultAmt || "0") * 1e6));
    if (!u) return;
    setBusy(kind);
    setMsg(null);
    try {
      if (kind === "deposit") await v.deposit(u);
      else await v.withdraw(u);
      setMsg(`${kind === "deposit" ? "Deposited" : "Withdrew"} ${vaultAmt} ocUSDC`);
      setVaultAmt("");
      await pos.refresh();
      onRefresh();
    } catch (e: any) {
      setMsg(e?.shortMessage ?? e?.message ?? "Failed");
    } finally {
      setBusy(null);
    }
  };

  const tvlDisplay = pos.tvl !== null
    ? `$${(Number(pos.tvl) / 1e6).toLocaleString(undefined, { maximumFractionDigits: 2 })}`
    : pos.loading ? "loading…" : "—";

  return (
    <div className="space-y-5">
      <div className="flex gap-2 flex-wrap">
        {vaults.map((vt) => (
          <button
            key={vt.address ?? vt.name}
            onClick={() => { setSelectedAddr(vt.address); setMsg(null); setVaultAmt(""); }}
            className={`px-3 py-1.5 rounded-lg border text-[10px] font-mono transition-all ${
              vt.address === selectedAddr
                ? "border-violet-500/40 bg-violet-500/15 text-violet-200"
                : "border-white/10 bg-white/[0.03] text-white/50 hover:text-white/80"
            }`}
          >
            {vt.name}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {vaults.map((vt) => (
          <VaultCard key={vt.address ?? vt.name} vault={vt} onAction={() => setSelectedAddr(vt.address)} active={vt.address === selectedAddr} />
        ))}
      </div>

      <details className="rounded-xl border border-white/[0.06] overflow-hidden group">
        <summary className="px-4 py-3 cursor-pointer flex items-center gap-2 text-[11px] text-white/50 hover:text-white/80 select-none">
          <Info className="w-3.5 h-3.5" /> What is a vault?
        </summary>
        <div className="px-4 py-3 border-t border-white/[0.06] space-y-2">
          <p className="text-[11px] text-white/60 leading-relaxed">
            Vaults are curated pools that route your ocUSDC across lending markets based on a risk strategy.
          </p>
          <ul className="space-y-1.5 text-[10.5px] text-white/50">
            <li className="flex items-start gap-1.5"><span className="text-violet-400 mt-0.5">·</span><b className="text-white/70">Conservative</b> — 100% M-86 (stable/stable). Lowest volatility.</li>
            <li className="flex items-start gap-1.5"><span className="text-violet-400 mt-0.5">·</span><b className="text-white/70">Balanced</b> — 60% M-86 + 40% M-70-WETH. Higher APY, moderate tail-risk.</li>
          </ul>
        </div>
      </details>

      {vault && (
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-white/80">{vault.name}</span>
            <span className="text-[10px] text-white/40 font-mono">{vault.riskTier}</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-violet-500/20 bg-violet-950/20 p-3">
              <div className="text-[9px] uppercase tracking-wider text-white/35 mb-1 font-mono">Vault TVL</div>
              <div className="text-[14px] font-mono font-semibold text-violet-300">{tvlDisplay}</div>
            </div>
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-950/20 p-3">
              <div className="text-[9px] uppercase tracking-wider text-white/35 mb-1 font-mono">Your shares</div>
              <div className="text-[14px] font-mono text-emerald-300">
                {pos.myShares === null ? "—" : (Number(pos.myShares) / 1e6).toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <input
              inputMode="decimal" value={vaultAmt}
              onChange={(e) => setVaultAmt(e.target.value)}
              placeholder="Amount in ocUSDC"
              className="flex-1 bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-emerald-500/40"
            />
            <button
              disabled={!vaultAmt || !!busy} onClick={() => run("deposit")}
              className="px-4 py-2.5 rounded-lg text-sm bg-emerald-500/10 border border-emerald-500/30 text-emerald-200 hover:bg-emerald-500/20 disabled:opacity-50 flex items-center gap-1.5"
            >
              {busy === "deposit" && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Deposit
            </button>
            <button
              disabled={!vaultAmt || !!busy} onClick={() => run("withdraw")}
              className="px-4 py-2.5 rounded-lg text-sm bg-white/[0.04] border border-white/10 text-white/80 hover:bg-white/[0.07] disabled:opacity-50 flex items-center gap-1.5"
            >
              {busy === "withdraw" && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Withdraw
            </button>
          </div>
          <FHEStepper status={v.fheStatus.status} error={v.fheStatus.error} className="mt-1" />
          {msg && <p className="text-xs text-white/60">{msg}</p>}
        </div>
      )}
    </div>
  );
}

// ─── Liquidations tab ─────────────────────────────────────────────────────
function LiquidationsTab({ markets }: { markets: CreditMarketMeta[] }) {
  const { auctions, refresh, submitBid, settle } = useCreditAuctions();
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-white/80">Sealed liquidation auctions</h3>
          <p className="text-[10.5px] text-white/40 mt-0.5">Encrypted bids — no MEV frontrun, no last-second sniping</p>
        </div>
        <button onClick={refresh} className="text-[10px] text-white/40 hover:text-white/70 inline-flex items-center gap-1">
          <RefreshCcw className="w-3 h-3" /> Refresh
        </button>
      </div>
      {auctions.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.015] p-8 flex flex-col items-center gap-3">
          <Gavel className="w-8 h-8 text-white/20" />
          <p className="text-sm text-white/40">No active auctions</p>
          <p className="text-[10.5px] text-white/30 text-center max-w-sm">
            When a position is undercollateralized, it's opened for sealed bidding.
            Default window: {CREDIT_DEFAULT_AUCTION_WINDOW_SEC / 60} minutes.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {auctions.map((a) => (
            <SealedAuctionCard key={a.id.toString()} auction={a} windowSec={CREDIT_DEFAULT_AUCTION_WINDOW_SEC} onBid={submitBid} onSettle={settle} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Settings slide-over ──────────────────────────────────────────────────
function SettingsSlideOver({ open, onClose, markets }: { open: boolean; onClose: () => void; markets: CreditMarketMeta[] }) {
  const approved = useApprovedSets();
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.div
            className="fixed right-0 top-0 bottom-0 z-50 w-full sm:w-[420px] border-l border-white/[0.08] bg-[#0c0f14] shadow-2xl overflow-y-auto"
            initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
          >
            <div className="sticky top-0 bg-[#0c0f14]/95 backdrop-blur border-b border-white/[0.06] px-5 py-4 flex items-center justify-between z-10">
              <span className="text-sm font-medium text-white/80">Settings</span>
              <button onClick={onClose} className="text-white/40 hover:text-white/80"><X className="w-4 h-4" /></button>
            </div>
            <div className="px-5 py-4 space-y-7">
              <div>
                <div className="text-[9px] tracking-[0.2em] uppercase text-white/30 font-mono mb-3">Faucets · Test funds</div>
                <SettingsPanel markets={markets} approved={approved} />
              </div>
              <div>
                <div className="text-[9px] tracking-[0.2em] uppercase text-white/30 font-mono mb-3">Credit Score</div>
                <CreditScoreRing />
              </div>
              <div>
                <div className="text-[9px] tracking-[0.2em] uppercase text-white/30 font-mono mb-3">Private History</div>
                <PrivateExplorer markets={markets} />
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────
const CreditPage = () => {
  const { isConnected } = useAccount();
  const [tab, setTab] = useState<CreditTab>("markets");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [setupOpen, setSetupOpen] = useState(false);
  const [activeMarketAddress, setActiveMarketAddress] = useState<`0x${string}` | undefined>(undefined);

  const { markets, refresh: refreshMarkets } = useCreditMarkets();
  const { vaults, refresh: refreshVaults } = useCreditVaults();
  const onboarding = useCreditOnboarding();
  const { unreadCount } = useCreditAlerts();

  const activeMarket = useMemo(
    () => activeMarketAddress ? markets.find((m) => m.address === activeMarketAddress) ?? markets[0] : markets[0],
    [markets, activeMarketAddress]
  );

  useEffect(() => {
    refreshMarkets();
    refreshVaults();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleBorrowFromMarket = useCallback((m: CreditMarketMeta) => {
    setActiveMarketAddress(m.address);
    setTab("position");
  }, []);

  const handleSupplyFromMarket = useCallback((m: CreditMarketMeta) => {
    setActiveMarketAddress(m.address);
    setTab("vaults");
  }, []);

  return (
    <div className="min-h-screen bg-[#06090c] text-foreground antialiased">
      <AmbientBackground />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 pb-24 relative">

        {/* Header */}
        <PageHeader
          breadcrumb={["Dashboard", "Credit"]}
          title={<><EncryptedText duration={1100}>ObscuraCredit</EncryptedText></>}
          lede="Encrypted lending — borrow with privacy, earn from vaults. All positions are private on-chain."
          badge={
            <div className="flex items-center gap-2">
              {isConnected && (
                <button
                  onClick={() => setSetupOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-cyan-500/40 bg-cyan-500/10 text-cyan-100 hover:bg-cyan-500/20 text-[11px] font-medium transition-all"
                >
                  <Droplet className="w-3 h-3" /> Get test funds
                </button>
              )}
              <CreditAlertDrawer />
              <button
                onClick={() => setSettingsOpen(true)}
                className="p-1.5 rounded-lg border border-white/[0.08] bg-white/[0.03] text-white/50 hover:text-white/80 hover:border-white/20 transition-colors"
                aria-label="Settings"
              >
                <SettingsIcon className="w-3.5 h-3.5" />
              </button>
            </div>
          }
        />

        {/* Health ribbon */}
        {isConnected && (
          <div className="mt-3 sticky top-3 z-30">
            <HealthRibbon
              onRepay={(w) => { setActiveMarketAddress(w.market.address); setTab("position"); }}
              onAddCollateral={(w) => { setActiveMarketAddress(w.market.address); setTab("position"); }}
            />
          </div>
        )}

        {/* Tab bar */}
        <div className="mt-6 mb-6">
          <TabBar active={tab} onChange={setTab} />
        </div>

        {/* Tab content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          >
            {tab === "markets" && (
              <MarketsTab markets={markets} onRefresh={refreshMarkets} onBorrow={handleBorrowFromMarket} onSupply={handleSupplyFromMarket} />
            )}
            {tab === "position" && (
              <PositionTab markets={markets} onRefresh={refreshMarkets} />
            )}
            {tab === "vaults" && (
              <VaultsTab vaults={vaults} onRefresh={refreshVaults} />
            )}
            {tab === "liquidations" && (
              <LiquidationsTab markets={markets} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Settings slide-over */}
      <SettingsSlideOver open={settingsOpen} onClose={() => setSettingsOpen(false)} markets={markets} />

      {/* Setup sheet (faucet → operator → borrow onboarding) */}
      <SetupSheet
        open={setupOpen}
        onClose={() => setSetupOpen(false)}
        market={activeMarket}
        onSuccess={() => { setSetupOpen(false); setTab("position"); }}
      />

      {/* Side-effect mounts */}
      {isConnected && <LiquidationAlertCenter />}
      <CreditOnboarding open={onboarding.open} onComplete={onboarding.complete} onDismiss={onboarding.dismiss} />
    </div>
  );
};

export default CreditPage;
