import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Lock, Network, ShieldCheck, Wallet } from "lucide-react";
import { HarmonyFormCard, HarmonyPageIntro } from "@/components/harmony/harmony-ui";
import UsdcIcon from "@/components/shared/UsdcIcon";
import { usePaymentMode } from "@/contexts/PaymentModeContext";
import { useOcUSDCBalance } from "@/hooks/useOcUSDCBalance";
import { useUSDCBalance } from "@/hooks/useUSDCBalance";

export type PayHarmonyTabKey =
  | "send"
  | "receive"
  | "streams"
  | "escrow"
  | "insurance"
  | "receivables"
  | "advanced"
  | "contacts"
  | "settings"
  // W5P1.5 — new IA tabs
  | "pay"
  | "getpaid"
  | "automations"
  | "activity";

const TAB_META: Record<
  PayHarmonyTabKey,
  { eyebrow: string; title: string; description: string }
> = {
  send: {
    eyebrow: "Move money · Encrypted",
    title: "Send",
    description: "Direct, stealth, and cross-chain transfers. Amounts are encrypted in your browser before submission.",
  },
  receive: {
    eyebrow: "Inbound · Stealth",
    title: "Receive",
    description: "Register a meta-address, scan your stealth inbox, and claim encrypted inbound payments.",
  },
  streams: {
    eyebrow: "Automate · Payroll",
    title: "Streams",
    description: "Recurring encrypted payments, subscriptions, and payroll batches.",
  },
  escrow: {
    eyebrow: "Protect · Escrow",
    title: "Escrow",
    description: "Lock funds with resolvers, send invoices, and redeem claim links — all with sealed amounts.",
  },
  insurance: {
    eyebrow: "Protect · Coverage",
    title: "Insurance",
    description: "Buy stream coverage, manage policies, file disputes, and optionally provide LP liquidity.",
  },
  receivables: {
    eyebrow: "Earn · Collect",
    title: "Receivables",
    description: "Manage your active subscriptions, track upcoming debits, collect pending payments, and earn yield as an LP.",
  },
  advanced: {
    eyebrow: "Legacy · V1",
    title: "Legacy access",
    description: "Deprecated surfaces for escrows and streams created before the Wave 3 V2 redeploy.",
  },
  contacts: {
    eyebrow: "Network · Address book",
    title: "Contacts",
    description: "Encrypted on-chain address book. Labels are stored locally in your browser.",
  },
  settings: {
    eyebrow: "Preferences · Privacy",
    title: "Settings",
    description: "UX preferences and privacy maintenance. Nothing here is stored on-chain.",
  },
  // W5P1.5 — new IA tabs
  pay: {
    eyebrow: "Move money · Private",
    title: "Pay",
    description: "Send private payments. Amounts are encrypted on your device before they leave your browser.",
  },
  getpaid: {
    eyebrow: "Inbound · Private",
    title: "Get Paid",
    description: "Set up your private receive address, claim incoming payments, and create invoices.",
  },
  automations: {
    eyebrow: "Recurring · Agreements",
    title: "Automations",
    description: "Streams, escrows, subscriptions, and payroll — all with private amounts.",
  },
  activity: {
    eyebrow: "History · Local",
    title: "Activity",
    description: "Your payment history stored privately in this browser. Never sent to any server.",
  },
};

export function PayHarmonyTabShell({
  tab,
  actions,
  children,
}: {
  tab: PayHarmonyTabKey;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const { privacyMode } = usePaymentMode();
  const meta = TAB_META[tab];
  const modeMeta =
    tab === "pay"
      ? privacyMode === "public"
        ? { ...meta, eyebrow: "Move money · Public", description: "Send normal USDC with passkey approval, smart-account execution, and sponsored gas when enabled." }
        : meta
      : tab === "getpaid"
        ? privacyMode === "public"
          ? { ...meta, eyebrow: "Inbound · Public", description: "Receive normal USDC to your wallet or passkey smart account." }
          : meta
        : tab === "automations"
          ? privacyMode === "public"
            ? { ...meta, eyebrow: "Batching · Public", description: "Batch visible USDC transfers from your passkey smart account." }
            : meta
          : meta;
  return (
    <>
      <HarmonyPageIntro eyebrow={modeMeta.eyebrow} title={modeMeta.title} actions={actions} />
      <p className="mt-4 max-w-2xl text-sm text-muted-foreground">{modeMeta.description}</p>
      <div className="mt-10 space-y-6">{children}</div>
    </>
  );
}

export function PayHarmonyNotConnected({ message }: { message: string }) {
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
            <ShieldCheck className="h-3 w-3" /> No backend logs
          </span>
        </div>
      </div>
    </HarmonyFormCard>
  );
}

export function PayHarmonyPanelCard({
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

export function PayHarmonyDetails({
  eyebrow,
  title,
  children,
}: {
  eyebrow?: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <details className="group overflow-hidden rounded-2xl hairline bg-card">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-6 [&::-webkit-details-marker]:hidden">
        <div>
          {eyebrow && (
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{eyebrow}</p>
          )}
          <p className="mt-1 font-display text-xl">{title}</p>
        </div>
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground group-open:hidden">
          Expand
        </span>
      </summary>
      <div className="border-t border-border px-6 pb-6">{children}</div>
    </details>
  );
}

export function PayHarmonyNotice({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-amber-500/25 bg-amber-500/5 p-5 text-sm leading-relaxed text-amber-900">
      <span className="font-medium">{title}</span> {children}
    </div>
  );
}

export function PayHarmonySendBar({ onShield }: { onShield: () => void }) {
  const usdcBalance = useUSDCBalance();
  const { decrypted, reveal, busy } = useOcUSDCBalance();
  const { privacyMode, activeToken, modeSummary } = usePaymentMode();
  const isRevealed = decrypted !== null && decrypted !== undefined;
  const cusdc = isRevealed ? (Number(decrypted) / 1_000_000).toFixed(2) : null;

  return (
    <div className="rounded-2xl hairline bg-card p-5">
      <div className="flex flex-wrap items-center gap-4">
        <UsdcIcon className="h-8 w-8 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            {privacyMode === "public" ? "Public Mode balances" : "Private Mode balances"}
          </p>
          <p className="mt-1 text-sm text-foreground">
            USDC <span className="font-mono tabular-nums">{usdcBalance ?? "—"}</span>
            {" · "}
            ocUSDC{" "}
            {isRevealed ? (
              <span className="font-mono tabular-nums text-[hsl(var(--success))]">{cusdc}</span>
            ) : (
              <button
                type="button"
                onClick={() => void reveal()}
                disabled={busy}
                className="font-mono text-muted-foreground underline underline-offset-2 hover:text-foreground disabled:opacity-50"
              >
                {busy ? "…" : "reveal"}
              </button>
            )}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground/55">
            Active token: {activeToken}. {modeSummary}.
          </p>
        </div>
        <button
          type="button"
          onClick={onShield}
          className="h-10 rounded-full bg-foreground px-4 text-sm font-medium text-background"
        >
          Shield USDC →
        </button>
      </div>
    </div>
  );
}

export function PayHarmonyLifecycle({
  steps,
}: {
  steps: { t: string; d: string; chip: string; icon: LucideIcon }[];
}) {
  return (
    <div className="grid gap-4 md:grid-cols-4">
      {steps.map((s, i) => (
        <div key={s.t} className="rounded-xl hairline bg-card p-5">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              0{i + 1}
            </span>
            <span className="rounded-full bg-muted px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              {s.chip}
            </span>
          </div>
          <s.icon className="mt-4 h-4 w-4 text-accent" />
          <p className="mt-2 font-display text-xl">{s.t}</p>
          <p className="mt-1 text-sm text-muted-foreground">{s.d}</p>
        </div>
      ))}
    </div>
  );
}
