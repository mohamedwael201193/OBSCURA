import type { ReactNode } from "react";
import { Lock, Network, ShieldCheck, Wallet } from "lucide-react";
import { HarmonyFormCard, HarmonyPageIntro } from "@/components/harmony/harmony-ui";

export type CreditHarmonyTabKey = "markets" | "position" | "vaults" | "liquidations";

const TAB_META: Record<
  CreditHarmonyTabKey,
  { eyebrow: string; title: string; description: string }
> = {
  markets: {
    eyebrow: "Lend · Public rates",
    title: "Markets",
    description: "Browse lending markets, supply for yield, or open an encrypted borrow position.",
  },
  position: {
    eyebrow: "Portfolio · Encrypted",
    title: "Your position",
    description: "Collateral, borrow, and supply balances stay sealed until you reveal them with a permit.",
  },
  vaults: {
    eyebrow: "Curated · Strategy",
    title: "Vaults",
    description: "Deposit ocUSDC into risk-tiered vaults that route liquidity across encrypted markets.",
  },
  liquidations: {
    eyebrow: "Auctions · Sealed bids",
    title: "Liquidations",
    description: "Undercollateralized positions open sealed auctions — bids are encrypted, no MEV sniping.",
  },
};

export function CreditHarmonyTabShell({
  tab,
  actions,
  children,
}: {
  tab: CreditHarmonyTabKey;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const meta = TAB_META[tab];
  return (
    <>
      <HarmonyPageIntro eyebrow={meta.eyebrow} title={meta.title} actions={actions} />
      <p className="mt-4 max-w-2xl text-sm text-muted-foreground">{meta.description}</p>
      <div className="mt-10 space-y-6">{children}</div>
    </>
  );
}

export function CreditHarmonyNotConnected({ message }: { message: string }) {
  return (
    <HarmonyFormCard title="Connect your wallet" eyebrow="Wallet required">
      <div className="py-6 text-center">
        <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-muted">
          <Wallet className="h-6 w-6 text-muted-foreground" />
        </div>
        <p className="mx-auto max-w-sm text-sm leading-relaxed text-muted-foreground">{message}</p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1 rounded-full hairline px-2.5 py-1">
            <Lock className="h-3 w-3" /> FHE encrypted
          </span>
          <span className="inline-flex items-center gap-1 rounded-full hairline px-2.5 py-1">
            <Network className="h-3 w-3" /> Arbitrum Sepolia
          </span>
          <span className="inline-flex items-center gap-1 rounded-full hairline px-2.5 py-1">
            <ShieldCheck className="h-3 w-3" /> Reveal on demand
          </span>
        </div>
      </div>
    </HarmonyFormCard>
  );
}

export function CreditHarmonyPanelCard({
  title,
  eyebrow,
  children,
  className,
}: {
  title?: string;
  eyebrow?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <HarmonyFormCard title={title} eyebrow={eyebrow} className={className}>
      {children}
    </HarmonyFormCard>
  );
}

export function CreditHarmonyStatChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-xl hairline bg-card px-4 py-3">
      <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{label}</span>
      <span className="font-mono text-lg font-semibold tabular-nums text-foreground">{value}</span>
    </div>
  );
}
