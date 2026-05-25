import { motion } from "framer-motion";
import { ArrowUpRight, Layers, ShieldAlert } from "lucide-react";
import { HarmonyEncryptedValue } from "@/components/harmony/HarmonyEncryptedValue";
import {
  HarmonyKpi,
  HarmonyKpiGrid,
  HarmonyPageIntro,
  HarmonySection,
} from "@/components/harmony/harmony-ui";
import type { CreditMarketMeta } from "@/hooks/useCreditMarkets";
import type { CreditVaultMeta } from "@/hooks/useCreditVaults";

function Sparkline() {
  const pts = [40, 42, 38, 50, 55, 48, 60, 58, 65, 62, 70, 72, 68, 75, 78, 80, 76, 82, 85, 84, 90, 88, 92, 94, 95, 93, 96, 98, 97, 99];
  const max = 100;
  const min = 30;
  const W = 600;
  const H = 80;
  const path = pts
    .map((p, i) => {
      const x = (i / (pts.length - 1)) * W;
      const y = H - ((p - min) / (max - min)) * H;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-20 w-full text-[hsl(var(--success))]" preserveAspectRatio="none">
      <path d={path} fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
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
  vaults,
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
              className="h-10 rounded-full bg-foreground px-4 text-sm font-medium text-background"
            >
              Supply
            </button>
            <button type="button" onClick={onBorrow} className="h-10 rounded-full hairline px-4 text-sm">
              Borrow
            </button>
            <button type="button" onClick={onOpenVault} className="h-10 rounded-full hairline px-4 text-sm">
              Open vault
            </button>
          </>
        }
      />

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <HarmonyKpiGrid>
          <HarmonyKpi label="Net worth">
            <HarmonyEncryptedValue value="$—" size="md" />
          </HarmonyKpi>
          <HarmonyKpi label="Borrow APY">
            <span className="font-display text-3xl">—</span>
          </HarmonyKpi>
          <HarmonyKpi label="Health factor">
            <span className="font-display text-3xl text-[hsl(var(--success))]">—</span>
          </HarmonyKpi>
          <HarmonyKpi label="Available to borrow">
            <span className="font-display text-3xl cipher-shimmer text-muted-foreground">••••••</span>
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
          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Collateral</p>
              <p className="mt-2 font-display text-3xl cipher-shimmer text-muted-foreground">••••••</p>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
                <div className="h-full w-[72%] bg-[hsl(var(--success))]" />
              </div>
              <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                Encrypted on-chain
              </p>
            </div>
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Borrow</p>
              <p className="mt-2 font-display text-3xl cipher-shimmer text-muted-foreground">••••••</p>
              <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                Revealed only with permit
              </p>
            </div>
          </div>
          <div className="mt-8">
            <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Health factor · 30d
            </p>
            <Sparkline />
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl bg-foreground p-6 text-background">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-accent" />
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] opacity-70">Risk · Encrypted</span>
          </div>
          <p className="mt-4 font-display text-3xl leading-tight">No liquidator can read your position.</p>
          <p className="mt-3 text-sm opacity-70">
            Only the threshold network can trigger reveals at the liquidation boundary.
          </p>
          <div className="mt-6 space-y-2 font-mono text-[11px]">
            <RiskRow k="Oracle" v="Chainlink" />
            <RiskRow k="Liq. bonus" v="5%" />
            <RiskRow k="LLTV" v={primary ? `${primary.lltvBps / 100}%` : "—"} />
            <RiskRow k="Keeper" v="dry-run · ok" />
          </div>
        </div>
      </div>

      <HarmonySection title="Markets" hint="Risk profiles. All positions encrypted by default.">
        <div className="overflow-hidden rounded-2xl hairline bg-card">
          <div className="grid grid-cols-12 bg-surface px-6 py-3 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            <span className="col-span-4">Market</span>
            <span className="col-span-2">Collateral</span>
            <span className="col-span-1">LLTV</span>
            <span className="col-span-2">Supply APY</span>
            <span className="col-span-2">Borrow APY</span>
            <span className="col-span-1 text-right">Util</span>
          </div>
          {markets.map((m) => (
            <div
              key={m.address}
              className="grid grid-cols-12 items-center border-t border-border px-6 py-4 transition-colors hover:bg-muted/40"
            >
              <span className="col-span-4 font-medium">{m.label}</span>
              <span className="col-span-2 text-sm text-muted-foreground">{m.collateralSymbol}</span>
              <span className="col-span-1 font-mono text-sm">{m.lltvBps / 100}%</span>
              <span className="col-span-2 font-mono text-sm text-[hsl(var(--success))]">—</span>
              <span className="col-span-2 font-mono text-sm">—</span>
              <span className="col-span-1 flex items-center justify-end gap-2">
                <span className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                  <span className="block h-full bg-accent" style={{ width: "60%" }} />
                </span>
              </span>
            </div>
          ))}
        </div>
      </HarmonySection>

      {vaults.length > 0 && (
        <HarmonySection title="Vaults" hint="Curated allocation across encrypted markets.">
          <div className="grid gap-6 md:grid-cols-2">
            {vaults.slice(0, 2).map((v) => (
              <div key={v.address} className="rounded-2xl hairline bg-card p-6">
                <div className="flex items-center justify-between">
                  <Layers className="h-5 w-5 text-accent" />
                  <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Vault</span>
                </div>
                <p className="mt-4 font-display text-2xl">{v.name}</p>
                <div className="mt-6 flex items-end justify-between">
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Net APY</p>
                    <p className="mt-1 font-display text-3xl">—</p>
                  </div>
                  <button
                    type="button"
                    onClick={onOpenVault}
                    className="inline-flex h-10 items-center gap-1.5 rounded-full bg-foreground px-4 text-sm text-background"
                  >
                    Deposit <ArrowUpRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </HarmonySection>
      )}
    </>
  );
}
