import { Link } from "react-router-dom";
import {
  ArrowRight,
  BarChart3,
  CheckSquare,
  Lock,
  Network,
  ShieldCheck,
  WalletCards,
} from "lucide-react";
import { HarmonyAppShell } from "@/components/harmony/HarmonyAppShell";
import { HarmonyPageIntro, HarmonySection } from "@/components/harmony/harmony-ui";

const modules = [
  {
    name: "Pay",
    href: "/pay",
    icon: WalletCards,
    title: "Private value movement",
    body: "Shield, send, receive, stream, escrow, insure and invoice through encrypted ocUSDC flows.",
  },
  {
    name: "Credit",
    href: "/credit",
    icon: BarChart3,
    title: "Sealed lending positions",
    body: "Supply, borrow, repay and monitor health while sensitive position data stays encrypted.",
  },
  {
    name: "Vote",
    href: "/vote",
    icon: CheckSquare,
    title: "Confidential governance",
    body: "Cast sealed ballots, manage treasury decisions, delegate, and execute Governor proposals.",
  },
];

const privacyRows = [
  ["Public", "Contract addresses, transaction existence, proposal metadata, market configuration"],
  ["Encrypted", "Balances, transfer values, collateral/debt, vote choices, liquidation bids"],
  ["User revealed", "Balances and position details only after explicit reveal actions"],
  ["Aggregate only", "Vote totals and protocol-level market metrics"],
];

export default function EcosystemPage() {
  return (
    <HarmonyAppShell
      appName="Ecosystem"
      sidebar={[
        { key: "pay", label: "Obscura Pay", href: "/pay" },
        { key: "credit", label: "Obscura Credit", href: "/credit" },
        { key: "vote", label: "Obscura Vote", href: "/vote" },
      ]}
      searchPlaceholder="Search ecosystem…"
    >
      <HarmonyPageIntro
        eyebrow="Ecosystem architecture"
        title="One privacy engine"
        actions={
          <Link
            to="/pay"
            className="inline-flex h-10 items-center gap-2 rounded-full bg-foreground px-4 text-sm font-medium text-background"
          >
            Start with Pay <ArrowRight className="h-4 w-4" />
          </Link>
        }
      />
      <p className="mt-4 max-w-2xl text-sm text-muted-foreground">
        Obscura connects payments, credit, and governance through shared encrypted state — without exposing user data.
      </p>

      <div className="mt-10 grid gap-4 lg:grid-cols-3">
        {modules.map((module) => {
          const Icon = module.icon;
          return (
            <Link
              key={module.name}
              to={module.href}
              className="rounded-2xl hairline bg-card p-6 transition-colors hover:bg-muted/30"
            >
              <Icon className="h-5 w-5 text-accent" />
              <div className="mt-6 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{module.name}</div>
              <h2 className="mt-2 font-display text-2xl">{module.title}</h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{module.body}</p>
              <span className="mt-6 inline-flex items-center gap-2 text-sm font-medium">
                Open {module.name} <ArrowRight className="h-4 w-4" />
              </span>
            </Link>
          );
        })}
      </div>

      <HarmonySection title="Privacy matrix" hint="Verifiability without disclosure">
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl hairline bg-card p-6">
            <Lock className="h-5 w-5 text-accent" />
            <p className="mt-4 text-sm text-muted-foreground">
              The chain verifies actions while sensitive values remain sealed until you choose to reveal them.
            </p>
            <div className="mt-6 space-y-3">
              {privacyRows.map(([label, body]) => (
                <div key={label} className="rounded-xl hairline p-4">
                  <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{label}</div>
                  <p className="mt-2 text-sm leading-relaxed">{body}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-2xl hairline bg-card p-6">
            <h3 className="font-display text-2xl">Cross-product encrypted score</h3>
            <p className="mt-3 text-sm text-muted-foreground">
              Pay activity and Vote participation can improve Credit reputation without publishing the raw activity graph.
            </p>
            <div className="mt-6 flex flex-wrap gap-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1 rounded-full hairline px-3 py-1">
                <Network className="h-3 w-3" /> Arbitrum Sepolia
              </span>
              <span className="inline-flex items-center gap-1 rounded-full hairline px-3 py-1">
                <ShieldCheck className="h-3 w-3" /> Manual reveal UX
              </span>
            </div>
          </div>
        </div>
      </HarmonySection>
    </HarmonyAppShell>
  );
}
