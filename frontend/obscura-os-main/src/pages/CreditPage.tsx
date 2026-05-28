/**
 * Wave 4 v2 — ObscuraCredit dashboard.
 *
 * Primary IA: Overview | Borrow | Position | Earn | Liquidations | Risk.
 * Settings lives in a gear-icon slide-over (not a tab).
 * Header setup CTA opens SetupSheet.
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
  Coins,
  Gauge,
  Landmark,
  WalletCards,
  Bell,
  X,
  Loader2,
  Lock,
  Info,
} from "lucide-react";

import { HarmonyAppShell } from "@/components/harmony/HarmonyAppShell";
import { CreditHarmonyOverview } from "@/components/harmony/CreditHarmonyOverview";
import {
  CreditHarmonyNotConnected,
  CreditHarmonyPanelCard,
  CreditHarmonyStatChip,
  CreditHarmonyTabShell,
} from "@/components/harmony/CreditHarmonyTabShell";
import FHEStepper from "@/components/shared/FHEStepper";

import {
  useCreditMarkets,
  useCreditVaults,
  useCreditAuctions,
  useCreditVault,
  useApprovedSets,
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
import HealthRibbon from "@/components/credit/HealthRibbon";
import LiquidationAlertCenter from "@/components/credit/LiquidationAlertCenter";
import CreditOnboarding from "@/components/credit/CreditOnboarding";
import CreditAlertDrawer from "@/components/credit/CreditAlertDrawer";
import { CreditReputationPanel } from "@/components/credit/CreditReputationPanel";
import EncryptedTile from "@/components/credit/EncryptedTile";
import HealthBar from "@/components/credit/HealthBar";
import SetupSheet from "@/components/credit/SetupSheet";
import { useCreditOnboarding } from "@/hooks/useCreditOnboarding";
import { useCreditAlerts } from "@/hooks/useCreditAlerts";
import { ActivityFeed } from "@/components/harmony/ActivityFeed";
import { useNotificationPrefs } from "@/hooks/useNotificationPrefs";

const CREDIT_NOTIFICATION_TYPES = [
  "credit.borrowed",
  "credit.repaid",
  "credit.supplied",
  "credit.collateral_supplied",
  "credit.health_warning",
  "credit.liquidation_opened",
  "credit.auction_settled",
  "credit.score_tier_changed",
] as const;

// ─── Tab types ────────────────────────────────────────────────────────────
type CreditTab = "overview" | "borrow" | "position" | "earn" | "liquidations" | "risk";

// ─── Borrow tab ───────────────────────────────────────────────────────────
function BorrowTab({
  markets,
  showingAdvanced,
  onToggleAdvanced,
  onRefresh,
  onSetup,
  onSelectMarket,
  onGoEarn,
}: {
  markets: (CreditMarketMeta & { totalSupplyAssets?: bigint; totalBorrowAssets?: bigint; utilizationBps?: bigint })[];
  showingAdvanced: boolean;
  onToggleAdvanced: () => void;
  onRefresh: () => void;
  onSetup: () => void;
  onSelectMarket: (m: CreditMarketMeta) => void;
  onGoEarn: () => void;
}) {
  const totalSupplied = markets.reduce((a, m) => a + (m.totalSupplyAssets ?? 0n), 0n);
  const totalBorrowed = markets.reduce((a, m) => a + (m.totalBorrowAssets ?? 0n), 0n);
  const [selectedAddress, setSelectedAddress] = useState<`0x${string}` | undefined>(markets[0]?.address);
  const primary = markets.find((market) => market.address === selectedAddress) ?? markets[0];
  const availableLiquidity = totalSupplied >= totalBorrowed ? totalSupplied - totalBorrowed : 0n;
  const selectMarket = (market: CreditMarketMeta) => {
    setSelectedAddress(market.address);
    onSelectMarket(market);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <CreditHarmonyStatChip label="Pool supplied" value={`$${(Number(totalSupplied) / 1e6).toLocaleString(undefined, { maximumFractionDigits: 0 })}`} />
        <CreditHarmonyStatChip label="Pool borrowed" value={`$${(Number(totalBorrowed) / 1e6).toLocaleString(undefined, { maximumFractionDigits: 0 })}`} />
        <CreditHarmonyStatChip label="Available" value={`$${(Number(availableLiquidity) / 1e6).toLocaleString(undefined, { maximumFractionDigits: 0 })}`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="space-y-4">
          <div className="rounded-2xl hairline bg-card p-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Borrow path</p>
            <div className="mt-4 grid gap-3">
              {[
                { label: "Use Pay-backed private USDC", body: "Shield once in Pay, then reuse that encrypted balance in Credit." },
                { label: "Commit encrypted collateral", body: "Credit moves ocUSDC directly through the market, so collateral accounting stays aligned with Pay-backed private USDC." },
                { label: "Borrow against encrypted collateral", body: "Amounts are encrypted before transaction submit and settle through the existing FHE flow." },
              ].map((item, index) => (
                <div key={item.label} className="grid grid-cols-[auto_1fr] gap-3 rounded-xl bg-muted/50 p-3">
                  <span className="grid h-7 w-7 place-items-center rounded-full bg-foreground text-xs font-medium text-background">{index + 1}</span>
                  <div>
                    <p className="text-sm font-medium text-foreground">{item.label}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{item.body}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" onClick={() => { window.location.href = "/pay"; }} className="btn-pay btn-pay-emerald">
                <WalletCards className="h-3.5 w-3.5" /> Open Pay
              </button>
              <button type="button" onClick={onSetup} className="btn-pay btn-pay-ghost">
                <ShieldCheck className="h-3.5 w-3.5" /> Set up credit
              </button>
            </div>
          </div>

          {primary ? (
            <div className="overflow-hidden rounded-2xl hairline bg-card">
              <div className="border-b border-border p-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Default market</p>
              </div>
              <div className="p-4">
                <MarketCard market={primary} compact />
              </div>
              <div className="flex border-t border-border">
                <button
                  onClick={onGoEarn}
                  className="flex-1 py-2.5 text-sm text-[hsl(var(--success))] hover:bg-accent/10 transition-colors flex items-center justify-center gap-1.5"
                >
                  <ArrowUpFromLine className="w-3 h-3" /> Supply liquidity
                </button>
                <button
                  onClick={onRefresh}
                  className="flex-1 border-l border-border py-2.5 text-sm text-muted-foreground hover:bg-muted transition-colors flex items-center justify-center gap-1.5"
                >
                  <RefreshCcw className="w-3 h-3" /> Refresh
                </button>
              </div>
            </div>
          ) : (
            <p className="rounded-2xl hairline bg-card p-5 text-sm text-muted-foreground">No Credit market configured yet.</p>
          )}

          <div className="flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={onToggleAdvanced}
              className="rounded-full hairline px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-pressed={showingAdvanced}
            >
              {showingAdvanced ? "Hide testnet" : "Advanced/Testnet"}
            </button>
          </div>

          {showingAdvanced && markets.length > 1 && (
            <div className="rounded-2xl hairline bg-card p-4">
              <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Legacy/testnet markets</p>
              <div className="space-y-2">
                {markets.slice(1).map((m) => (
                  <button
                    key={m.address ?? m.label}
                    type="button"
                    onClick={() => selectMarket(m)}
                    className="w-full rounded-xl hairline bg-muted/40 p-3 text-left hover:bg-muted"
                  >
                    <span className="block text-sm text-foreground">{m.label}</span>
                    <span className="mt-1 block text-[11px] text-muted-foreground">{m.riskTier} · {m.lltvBps / 100}% LLTV · lab market</span>
                  </button>
                ))}
              </div>
              <p className="mt-3 text-[11px] text-muted-foreground">Advanced markets remain available for repay, withdraw, and lab collateral flows.</p>
            </div>
          )}
        </div>

        <CreditHarmonyPanelCard title="Borrow privately" eyebrow="FHE transaction">
          {!primary ? (
            <p className="text-sm text-muted-foreground">No Credit market configured yet.</p>
          ) : (
            <BorrowForm market={primary} markets={markets} onSelect={selectMarket} onRefresh={onRefresh} onGoToCollateral={onSetup} />
          )}
        </CreditHarmonyPanelCard>
      </div>

      <div className="rounded-2xl hairline bg-accent/10 p-5">
        <div className="flex items-start gap-3">
          <Lock className="w-5 h-5 text-accent mt-0.5 shrink-0" />
          <div className="space-y-1.5">
            <p className="text-sm font-medium text-foreground">Fully encrypted borrow flow</p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Borrow amounts, collateral changes, and recipient handles remain encrypted on-chain. Position values only reveal when you explicitly request a view decrypt.
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
    v === null ? null : (Number(v) / 1e6).toLocaleString(undefined, { maximumFractionDigits: 6 });

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
                  ? "border-accent/40 bg-accent/15 text-foreground"
                  : "hairline bg-card text-muted-foreground hover:text-foreground"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-3">
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Your position</span>
          <button
            onClick={revealed ? () => setRevealed(false) : handleRevealAll}
            disabled={pos.sharesLoading}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
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
            label="Supplied" symbol={market?.loanSymbol ?? "ocUSDC"}
            displayValue={fmt(pos.mySupply)} revealed={revealed}
            loading={pos.sharesLoading} onReveal={handleRevealAll}
            onExpire={() => setRevealed(false)} accent="emerald"
          />
          <EncryptedTile
            label="Borrowed" symbol={market?.loanSymbol ?? "ocUSDC"}
            displayValue={fmt(pos.myBorrow)} revealed={revealed}
            loading={pos.sharesLoading} onReveal={handleRevealAll}
            onExpire={() => setRevealed(false)} accent="violet"
          />
          <EncryptedTile
            label="Collateral" symbol={market?.collateralSymbol ?? "ocUSDC"}
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
                ? "border-accent/40 bg-accent/15 text-foreground"
                : "hairline bg-card text-muted-foreground hover:text-foreground hover:bg-muted/50"
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
            <CreditHarmonyPanelCard
              eyebrow="Action"
              title={
                action === "borrow"
                  ? "Borrow more"
                  : action === "repay"
                    ? "Repay"
                    : action === "collateral"
                      ? "Add collateral"
                      : "Supply for yield"
              }
            >
              <div className="mb-4 flex justify-end">
                <button type="button" onClick={() => setAction(null)} className="text-muted-foreground hover:text-foreground">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="harmony-form-inner">
                {action === "borrow" && <BorrowForm market={market} markets={markets} onSelect={(m) => setSelectedAddr(m.address)} onRefresh={onRefresh} />}
                {action === "repay" && <RepayForm market={market} markets={markets} onSelect={(m) => setSelectedAddr(m.address)} onRefresh={onRefresh} />}
                {action === "collateral" && <SupplyCollateralForm market={market} markets={markets} onSelect={(m) => setSelectedAddr(m.address)} onRefresh={onRefresh} />}
                {action === "supply" && <SupplyForm market={market} markets={markets} onSelect={(m) => setSelectedAddr(m.address)} onRefresh={onRefresh} />}
              </div>
            </CreditHarmonyPanelCard>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => { void pos.refresh(); onRefresh(); setRevealed(false); }}
        className="text-[10px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
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
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Failed";
      setMsg(message);
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
                ? "border-accent/40 bg-accent/15 text-foreground"
                : "hairline bg-card text-muted-foreground hover:text-foreground"
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

      <details className="group overflow-hidden rounded-xl hairline bg-card">
        <summary className="px-4 py-3 cursor-pointer flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground select-none">
          <Info className="w-3.5 h-3.5" /> What is a vault?
        </summary>
        <div className="px-4 py-3 border-t border-border space-y-2">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Vaults are curated pools that route your ocUSDC across lending markets based on a risk strategy.
          </p>
          <ul className="space-y-1.5 text-sm text-muted-foreground">
            <li className="flex items-start gap-1.5"><span className="text-accent mt-0.5">·</span><b className="text-foreground">Conservative</b> — 100% M-86 (stable/stable). Lowest volatility.</li>
            <li className="flex items-start gap-1.5"><span className="text-accent mt-0.5">·</span><b className="text-foreground">Balanced</b> — 60% M-86 + 40% M-70-WETH. Higher APY, moderate tail-risk.</li>
          </ul>
        </div>
      </details>

      {vault && (
        <div className="space-y-4 rounded-2xl hairline bg-card p-5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">{vault.name}</span>
            <span className="font-mono text-[10px] text-muted-foreground">{vault.riskTier}</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl hairline bg-muted/50 p-3">
              <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Vault TVL</div>
              <div className="font-mono text-sm font-semibold text-foreground">{tvlDisplay}</div>
            </div>
            <div className="rounded-xl hairline bg-accent/10 p-3">
              <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Your shares</div>
              <div className="font-mono text-sm text-[hsl(var(--success))]">
                {pos.myShares === null ? "—" : (Number(pos.myShares) / 1e6).toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <input
              inputMode="decimal" value={vaultAmt}
              onChange={(e) => setVaultAmt(e.target.value)}
              placeholder="Amount in ocUSDC"
              className="pay-input flex-1"
            />
            <button
              disabled={!vaultAmt || !!busy} onClick={() => run("deposit")}
              className="btn-pay btn-pay-emerald disabled:opacity-50 flex items-center gap-1.5"
            >
              {busy === "deposit" && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Deposit
            </button>
            <button
              disabled={!vaultAmt || !!busy} onClick={() => run("withdraw")}
              className="btn-pay btn-pay-ghost disabled:opacity-50 flex items-center gap-1.5"
            >
              {busy === "withdraw" && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Withdraw
            </button>
          </div>
          <FHEStepper status={v.fheStatus.status} error={v.fheStatus.error} className="mt-1" />
          {msg && <p className="text-xs text-muted-foreground">{msg}</p>}
        </div>
      )}
    </div>
  );
}

function EarnTab({
  markets,
  vaults,
  onRefreshMarkets,
  onRefreshVaults,
  onSelectMarket,
}: {
  markets: (CreditMarketMeta & { totalSupplyAssets?: bigint; totalBorrowAssets?: bigint; utilizationBps?: bigint })[];
  vaults: CreditVaultMeta[];
  onRefreshMarkets: () => void;
  onRefreshVaults: () => void;
  onSelectMarket: (m: CreditMarketMeta) => void;
}) {
  const primary = markets[0];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
        <CreditHarmonyPanelCard title="Supply private USDC" eyebrow="Default earn path">
          {primary ? (
            <SupplyForm market={primary} markets={markets} onSelect={onSelectMarket} onRefresh={onRefreshMarkets} />
          ) : (
            <p className="text-sm text-muted-foreground">No Credit market configured yet.</p>
          )}
        </CreditHarmonyPanelCard>
        <div className="rounded-2xl hairline bg-card p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Earn strategy</p>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Direct supply keeps the main Credit path aligned with Pay-backed ocUSDC. Vaults remain available below for curated testnet allocation and strategy checks.
          </p>
          {primary && (
            <div className="mt-4 grid grid-cols-2 gap-3">
              <CreditHarmonyStatChip label="Pool supplied" value={`$${(Number(primary.totalSupplyAssets ?? 0n) / 1e6).toLocaleString(undefined, { maximumFractionDigits: 0 })}`} />
              <CreditHarmonyStatChip label="Utilization" value={`${(Number(primary.utilizationBps ?? 0n) / 100).toFixed(1)}%`} />
            </div>
          )}
        </div>
      </div>

      <div>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Advanced/Testnet</p>
            <h3 className="mt-1 font-display text-2xl">Curated vaults</h3>
          </div>
          <button type="button" onClick={onRefreshVaults} className="inline-flex h-9 items-center gap-1.5 rounded-full hairline px-3 text-xs hover:bg-muted">
            <RefreshCcw className="h-3.5 w-3.5" /> Refresh
          </button>
        </div>
        <VaultsTab vaults={vaults} onRefresh={onRefreshVaults} />
      </div>
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
          <h3 className="text-sm font-medium text-foreground">Sealed liquidation auctions</h3>
          <p className="mt-0.5 text-sm text-muted-foreground">Encrypted bids — no MEV frontrun, no last-second sniping</p>
        </div>
        <button onClick={refresh} className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
          <RefreshCcw className="w-3 h-3" /> Refresh
        </button>
      </div>
      {auctions.length === 0 ? (
        <div className="rounded-2xl hairline bg-card p-8 flex flex-col items-center gap-3">
          <Gavel className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No active auctions</p>
          <p className="text-center text-sm text-muted-foreground max-w-sm">
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
function CreditNotificationsPanel() {
  const { prefs, isLoading, pushSupported, permission, serviceWorkerReady, enable, repair, testPush, savePrefs } = useNotificationPrefs();
  const [busy, setBusy] = useState<"enable" | "repair" | "test" | "credit" | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const creditEventsEnabled = !!prefs?.events?.includes("*") || CREDIT_NOTIFICATION_TYPES.some((event) => prefs?.events?.includes(event));

  const run = async (
    kind: "enable" | "repair" | "test" | "credit",
    action: () => Promise<void | { sent: number; attempted: number; displayed: boolean }>,
  ) => {
    setBusy(kind);
    setMessage(null);
    try {
      const result = await action();
      if (kind === "test" && result && "attempted" in result) {
        setMessage(result.displayed ? `Browser displayed. Server sent ${result.sent}/${result.attempted}.` : `Server sent ${result.sent}/${result.attempted}.`);
      } else if (kind === "credit") {
        setMessage("Credit notification types saved.");
      } else {
        setMessage("Notification setup updated.");
      }
    } catch (e) {
      setMessage((e as Error).message || "Notification update failed.");
    } finally {
      setBusy(null);
    }
  };

  const focusCreditEvents = async () => {
    const existing = prefs?.events?.filter((event) => event !== "*" && !event.startsWith("credit.")) ?? [];
    await savePrefs({ events: [...existing, ...CREDIT_NOTIFICATION_TYPES] });
  };

  return (
    <CreditHarmonyPanelCard title="Shared notifications" eyebrow="Supabase · Web Push">
      <div className="space-y-4 text-sm">
        <div className="grid grid-cols-[1fr_auto] gap-y-2 text-xs text-muted-foreground">
          <span>Push alerts</span>
          <span className="font-mono text-foreground/70">{isLoading ? "loading" : prefs?.push_enabled ? "enabled" : "off"}</span>
          <span>Browser permission</span>
          <span className="font-mono text-foreground/70">{permission}</span>
          <span>Service worker</span>
          <span className="font-mono text-foreground/70">{serviceWorkerReady ? "ready" : "starting"}</span>
          <span>Credit event types</span>
          <span className="font-mono text-foreground/70">{creditEventsEnabled ? "enabled" : "custom"}</span>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={!pushSupported || busy !== null}
            onClick={() => void run("enable", enable)}
            className="btn-pay btn-pay-ghost justify-center disabled:opacity-50"
          >
            {busy === "enable" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Bell className="h-3.5 w-3.5" />}
            Enable push
          </button>
          <button
            type="button"
            disabled={!pushSupported || busy !== null}
            onClick={() => void run("credit", focusCreditEvents)}
            className="btn-pay btn-pay-ghost justify-center disabled:opacity-50"
          >
            Save Credit types
          </button>
          <button
            type="button"
            disabled={!pushSupported || busy !== null}
            onClick={() => void run("repair", repair)}
            className="btn-pay btn-pay-ghost justify-center disabled:opacity-50"
          >
            Repair
          </button>
          <button
            type="button"
            disabled={!pushSupported || busy !== null}
            onClick={() => void run("test", testPush)}
            className="btn-pay btn-pay-ghost justify-center disabled:opacity-50"
          >
            Test
          </button>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {CREDIT_NOTIFICATION_TYPES.map((event) => (
            <span key={event} className="rounded-full bg-muted px-2 py-1 font-mono text-[10px] text-muted-foreground">
              {event}
            </span>
          ))}
        </div>

        <p className="text-xs text-muted-foreground">
          Credit alerts use the same activity rows and push dispatcher as Pay. Messages stay generic and never include position amounts.
        </p>
        {message && <p className="text-xs text-muted-foreground">{message}</p>}
      </div>
    </CreditHarmonyPanelCard>
  );
}

function RiskTab({ markets }: { markets: CreditMarketMeta[] }) {
  const primary = markets[0];
  const utilization = primary?.utilizationBps === undefined ? null : Number(primary.utilizationBps) / 100;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
        <CreditReputationPanel />
        <div className="space-y-4">
          <div className="rounded-2xl hairline bg-card p-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Public market risk</p>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              These are public pool metrics. Your supplied, borrowed, and collateral amounts stay hidden until you reveal them from Position.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <CreditHarmonyStatChip label="LLTV" value={primary ? `${primary.lltvBps / 100}%` : "—"} />
              <CreditHarmonyStatChip label="Utilization" value={utilization === null ? "—" : `${utilization.toFixed(1)}%`} />
            </div>
          </div>
          <CreditNotificationsPanel />
        </div>
      </div>

      <ActivityFeed
        mode="private"
        defaultFilter="credit"
        filters={["credit", "all"]}
        title="Credit risk activity"
        eyebrow="Realtime · Shared index"
        emptyMessage="No indexed Credit activity for this wallet yet. Generic risk, auction, and score events will appear here after the worker indexes them."
      />
    </div>
  );
}

function SettingsSlideOver({
  open,
  onClose,
  markets,
  showingAdvanced,
  onToggleAdvanced,
}: {
  open: boolean;
  onClose: () => void;
  markets: CreditMarketMeta[];
  showingAdvanced: boolean;
  onToggleAdvanced: () => void;
}) {
  const approved = useApprovedSets();
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.div
            className="fixed right-0 top-0 bottom-0 z-50 w-full overflow-y-auto border-l hairline bg-card shadow-2xl sm:w-[420px]"
            initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
          >
            <div className="sticky top-0 z-10 border-b border-border bg-card/95 px-5 py-4 backdrop-blur flex items-center justify-between z-10">
              <span className="text-sm font-medium text-foreground">Settings</span>
              <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
            </div>
            <div className="px-5 py-4 space-y-7">
              <CreditHarmonyPanelCard title="Advanced/Testnet markets" eyebrow="Legacy access">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-muted-foreground">
                    {showingAdvanced ? "Legacy markets are visible in the main Credit workspace." : "Main Credit paths show only the Pay-backed private USDC market."}
                  </span>
                  <button
                    type="button"
                    onClick={onToggleAdvanced}
                    className="rounded-full hairline px-3 py-1.5 text-xs hover:bg-muted"
                    aria-pressed={showingAdvanced}
                  >
                    {showingAdvanced ? "Hide" : "Show"}
                  </button>
                </div>
              </CreditHarmonyPanelCard>
              <CreditNotificationsPanel />
              <CreditReputationPanel compact />
              <div>
                <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Credit setup</div>
                <SettingsPanel markets={markets} approved={approved} />
              </div>
              <div>
                <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Credit Score</div>
                <CreditScoreRing />
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
  const [tab, setTab] = useState<CreditTab>("overview");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [setupOpen, setSetupOpen] = useState(false);
  const [showAdvancedMarkets, setShowAdvancedMarkets] = useState(false);
  const [activeMarketAddress, setActiveMarketAddress] = useState<`0x${string}` | undefined>(undefined);

  const { markets, refresh: refreshMarkets } = useCreditMarkets();
  const { vaults, refresh: refreshVaults } = useCreditVaults();
  const onboarding = useCreditOnboarding();
  const { unreadCount } = useCreditAlerts();

  const canonicalMarkets = useMemo(
    () => markets.filter((m) => m.isCanonical || m.status === "canonical"),
    [markets]
  );
  const primaryMarkets = canonicalMarkets.length > 0 ? canonicalMarkets : markets.slice(0, 1);
  const workspaceMarkets = showAdvancedMarkets ? markets : primaryMarkets;

  const activeMarket = useMemo(
    () => activeMarketAddress ? workspaceMarkets.find((m) => m.address === activeMarketAddress) ?? workspaceMarkets[0] : workspaceMarkets[0],
    [workspaceMarkets, activeMarketAddress]
  );

  useEffect(() => {
    if (!activeMarketAddress) return;
    if (!workspaceMarkets.some((market) => market.address === activeMarketAddress)) {
      setActiveMarketAddress(workspaceMarkets[0]?.address);
    }
  }, [activeMarketAddress, workspaceMarkets]);

  useEffect(() => {
    refreshMarkets();
    refreshVaults();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleBorrowFromMarket = useCallback((m: CreditMarketMeta) => {
    setActiveMarketAddress(m.address);
    setTab("borrow");
  }, []);

  const handleSupplyFromMarket = useCallback((m: CreditMarketMeta) => {
    setActiveMarketAddress(m.address);
    setTab("earn");
  }, []);

  const harmonySidebar = [
    { key: "overview", label: "Overview", mobileLabel: "Home", icon: Landmark, active: tab === "overview", onClick: () => setTab("overview") },
    {
      key: "borrow",
      label: "Borrow",
      badge: workspaceMarkets.length ? String(workspaceMarkets.length) : undefined,
      mobileLabel: "Borrow",
      icon: ArrowDownToLine,
      active: tab === "borrow",
      onClick: () => setTab("borrow"),
    },
    { key: "position", label: "Position", mobileLabel: "Pos", icon: WalletCards, active: tab === "position", onClick: () => setTab("position") },
    { key: "earn", label: "Earn", mobileLabel: "Earn", icon: Coins, active: tab === "earn", onClick: () => setTab("earn") },
    { key: "liquidations", label: "Liquidations", mobileLabel: "Liq", icon: Gavel, active: tab === "liquidations", onClick: () => setTab("liquidations") },
    { key: "risk", label: "Risk", mobileLabel: "Risk", icon: Gauge, active: tab === "risk", onClick: () => setTab("risk") },
  ];

  return (
    <HarmonyAppShell appName="Credit" sidebar={harmonySidebar} searchPlaceholder="Search credit…">
      <div className="mb-6 flex flex-wrap items-center justify-end gap-2">
        {isConnected && (
          <button
            type="button"
            onClick={() => setSetupOpen(true)}
            className="inline-flex h-10 items-center gap-1.5 rounded-full hairline px-4 text-sm hover:bg-muted"
          >
            <Droplet className="h-3.5 w-3.5" /> Set up credit
          </button>
        )}
        <CreditAlertDrawer />
        <button
          type="button"
          onClick={() => setSettingsOpen(true)}
          className="grid h-10 w-10 place-items-center rounded-full hairline hover:bg-muted"
          aria-label="Settings"
        >
          <SettingsIcon className="h-3.5 w-3.5" />
        </button>
      </div>

      {isConnected && tab !== "overview" && (
        <div className="sticky top-3 z-30 mb-6">
          <HealthRibbon
            onRepay={(w) => {
              setActiveMarketAddress(w.market.address);
              setTab("position");
            }}
            onAddCollateral={(w) => {
              setActiveMarketAddress(w.market.address);
              setTab("position");
            }}
          />
        </div>
      )}

      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        >
          {tab === "overview" && (
            <>
              <CreditHarmonyOverview
                markets={workspaceMarkets}
                vaults={vaults}
                onSupply={() => setTab("earn")}
                onBorrow={() => setTab("borrow")}
                onOpenVault={() => setTab("earn")}
              />
              <div className="mt-10">
                <ActivityFeed
                  mode="private"
                  defaultFilter="credit"
                  filters={["credit", "all"]}
                  title="Credit activity"
                  eyebrow="Shared feed · Indexed from chain"
                  emptyMessage="No indexed Credit activity for this wallet yet. Borrow, repay, collateral, liquidation, and score events will appear here."
                />
              </div>
            </>
          )}
          {tab === "borrow" && (
            <CreditHarmonyTabShell
              tab="borrow"
              actions={
                <button
                  type="button"
                  onClick={refreshMarkets}
                  className="inline-flex h-10 items-center gap-1.5 rounded-full hairline px-4 text-sm hover:bg-muted"
                >
                  <RefreshCcw className="h-3.5 w-3.5" /> Refresh
                </button>
              }
            >
              <BorrowTab
                markets={workspaceMarkets}
                showingAdvanced={showAdvancedMarkets}
                onToggleAdvanced={() => setShowAdvancedMarkets((value) => !value)}
                onRefresh={refreshMarkets}
                onSetup={() => setSetupOpen(true)}
                onSelectMarket={handleBorrowFromMarket}
                onGoEarn={() => setTab("earn")}
              />
            </CreditHarmonyTabShell>
          )}
          {tab === "position" && (
            <CreditHarmonyTabShell tab="position">
              {!isConnected ? (
                <CreditHarmonyNotConnected message="Connect your wallet to view and manage your encrypted lending position." />
              ) : (
                <PositionTab markets={workspaceMarkets} onRefresh={refreshMarkets} />
              )}
            </CreditHarmonyTabShell>
          )}
          {tab === "earn" && (
            <CreditHarmonyTabShell
              tab="earn"
              actions={
                <button
                  type="button"
                  onClick={refreshVaults}
                  className="inline-flex h-10 items-center gap-1.5 rounded-full hairline px-4 text-sm hover:bg-muted"
                >
                  <RefreshCcw className="h-3.5 w-3.5" /> Refresh
                </button>
              }
            >
              <EarnTab
                markets={workspaceMarkets}
                vaults={vaults}
                onRefreshMarkets={refreshMarkets}
                onRefreshVaults={refreshVaults}
                onSelectMarket={handleSupplyFromMarket}
              />
            </CreditHarmonyTabShell>
          )}
          {tab === "liquidations" && (
            <CreditHarmonyTabShell tab="liquidations">
              <LiquidationsTab markets={workspaceMarkets} />
            </CreditHarmonyTabShell>
          )}
          {tab === "risk" && (
            <CreditHarmonyTabShell tab="risk">
              <RiskTab markets={workspaceMarkets} />
            </CreditHarmonyTabShell>
          )}
        </motion.div>
      </AnimatePresence>

      <SettingsSlideOver
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        markets={markets}
        showingAdvanced={showAdvancedMarkets}
        onToggleAdvanced={() => setShowAdvancedMarkets((value) => !value)}
      />

      <SetupSheet
        open={setupOpen}
        onClose={() => setSetupOpen(false)}
        market={activeMarket}
        onSuccess={() => {
          setSetupOpen(false);
          setTab("position");
        }}
      />

      {isConnected && <LiquidationAlertCenter />}
      <CreditOnboarding open={onboarding.open} onComplete={onboarding.complete} onDismiss={onboarding.dismiss} />
    </HarmonyAppShell>
  );
};

export default CreditPage;
