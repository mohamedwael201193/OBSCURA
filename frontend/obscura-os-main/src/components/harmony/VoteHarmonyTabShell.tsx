import type { ComponentType, ReactNode } from "react";
import { Lock, Network, ShieldCheck, Wallet } from "lucide-react";
import { HarmonyFormCard, HarmonyPageIntro } from "@/components/harmony/harmony-ui";

export type VoteHarmonyTabKey = "proposals" | "participation" | "advanced";
export type VoteVotingSubKey = "browse" | "create" | "vote" | "results";

const TAB_META: Record<
  VoteHarmonyTabKey,
  { eyebrow: string; title: string; description: string }
> = {
  proposals: {
    eyebrow: "Private proposals",
    title: "Proposals",
    description: "Browse proposals, cast a private vote, change it before the deadline, and reveal only final totals.",
  },
  participation: {
    eyebrow: "Participation",
    title: "Participation",
    description: "Your governance identity — reputation tier, ballot history, delegation, rewards, and indexed activity without exposing vote choices.",
  },
  advanced: {
    eyebrow: "Advanced governance",
    title: "Advanced Governance",
    description: "Treasury timelock spends and public Governor execution for protocol operators. Private voting stays in Proposals.",
  },
};

const SUB_META: Record<VoteVotingSubKey, string> = {
  browse: "Open an active proposal to vote privately. Create and results stay secondary to the voting path.",
  create: "Create a private proposal when the choice is ready for voters.",
  vote: "Choose an option, submit an encrypted ballot, and change it before the deadline if needed.",
  results: "Finalize closed proposals and explicitly reveal aggregate totals only.",
};

export function VoteHarmonyTabShell({
  tab,
  sub,
  actions,
  children,
}: {
  tab: VoteHarmonyTabKey;
  sub?: VoteVotingSubKey;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const meta = TAB_META[tab];
  return (
    <>
      <HarmonyPageIntro eyebrow={meta.eyebrow} title={meta.title} actions={actions} />
      <p className="mt-4 max-w-2xl text-sm leading-relaxed text-foreground/75">
        {sub ? SUB_META[sub] : meta.description}
      </p>
      <div className="mt-10 space-y-6">{children}</div>
    </>
  );
}

export function VoteHarmonyNotConnected({ message }: { message: string }) {
  return (
    <HarmonyFormCard title="Connect your wallet" eyebrow="Wallet required">
      <div className="py-6 text-center">
        <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-muted">
          <Wallet className="h-6 w-6 text-muted-foreground" />
        </div>
        <p className="mx-auto max-w-sm text-sm leading-relaxed text-muted-foreground">{message}</p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1 rounded-full hairline px-2.5 py-1">
            <Lock className="h-3 w-3" /> Vote encrypted
          </span>
          <span className="inline-flex items-center gap-1 rounded-full hairline px-2.5 py-1">
            <Network className="h-3 w-3" /> Arbitrum Sepolia
          </span>
          <span className="inline-flex items-center gap-1 rounded-full hairline px-2.5 py-1">
            <ShieldCheck className="h-3 w-3" /> No vote buying
          </span>
        </div>
      </div>
    </HarmonyFormCard>
  );
}

export function VoteHarmonyPanelCard({
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

export function VoteHarmonySubNav<T extends string>({
  active,
  onChange,
  items,
}: {
  active: T;
  onChange: (k: T) => void;
  items: { key: T; label: string; icon: ComponentType<{ className?: string }> }[];
}) {
  return (
    <div className="flex gap-1 rounded-full hairline bg-muted/60 p-1">
      {items.map((t) => {
        const Icon = t.icon;
        const isActive = active === t.key;
        return (
          <button
            key={t.key}
            type="button"
            onClick={() => onChange(t.key)}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-full px-2 py-2 text-xs font-medium transition-colors sm:px-3 ${
              isActive
                ? "bg-card text-foreground shadow-sm hairline"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="h-3.5 w-3.5 shrink-0" />
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        );
      })}
    </div>
  );
}
