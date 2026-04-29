/**
 * PayHomeDashboard — the first thing a user sees on Pay.
 * Shows a smart setup checklist, quick actions, and recent receipts.
 */
import { useAccount, useBalance, useReadContract } from "wagmi";
import {
  CheckCircle2,
  Circle,
  Send,
  ArrowDownToLine,
  Repeat,
  ShieldCheck,
  Lock,
  Globe2,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { arbitrumSepolia } from "viem/chains";
import { useUSDCBalance } from "@/hooks/useUSDCBalance";
import { getTrackedUnits } from "@/lib/trackedBalance";
import { ReceiptList } from "@/components/pay-v4/PaymentReceipt";
import UsdcIcon from "@/components/shared/UsdcIcon";
import {
  OBSCURA_STEALTH_REGISTRY_ABI,
  OBSCURA_STEALTH_REGISTRY_ADDRESS,
} from "@/config/pay";

type Tab =
  | "home"
  | "send"
  | "receive"
  | "streams"
  | "escrow"
  | "insurance"
  | "advanced"
  | "contacts"
  | "settings";

interface Props {
  onNavigate: (tab: Tab) => void;
}

export default function PayHomeDashboard({ onNavigate }: Props) {
  const { address } = useAccount();
  const { data: ethBal, isLoading: ethLoading } = useBalance({
    address,
    chainId: arbitrumSepolia.id,
  });
  const usdcBalance = useUSDCBalance();

  // Read cUSDC tracked balance directly from localStorage — avoids needing
  // an FHE decryption call just to detect "has the user wrapped any USDC?"
  const cusdcUnits = address ? getTrackedUnits(address) : 0n;
  const cusdcNum = Number(cusdcUnits) / 1_000_000;

  const { data: stealthOnChain, isLoading: stealthLoading } = useReadContract({
    address: OBSCURA_STEALTH_REGISTRY_ADDRESS,
    abi: OBSCURA_STEALTH_REGISTRY_ABI,
    functionName: "getMetaAddress",
    args: address ? [address] : undefined,
    query: { enabled: !!address && !!OBSCURA_STEALTH_REGISTRY_ADDRESS },
  });

  const isStealthRegistered = stealthOnChain
    ? (stealthOnChain as readonly [`0x${string}`, `0x${string}`, bigint])[2] > 0n
    : false;

  const ethNum = ethBal ? parseFloat(ethBal.formatted) : 0;
  const usdcNum = usdcBalance ? parseFloat(usdcBalance) : 0;

  const steps = [
    {
      num: 1,
      title: "Get ETH for gas",
      detail:
        ethLoading
          ? "Checking balance…"
          : ethNum > 0.0001
            ? `${ethNum.toFixed(4)} ETH on Arbitrum Sepolia`
            : "You need a small amount of ETH to pay transaction fees",
      done: !ethLoading && ethNum > 0.0001,
      loading: ethLoading,
      action: null as null | (() => void),
      actionLabel: null as null | string,
      externalLink: "https://www.alchemy.com/faucets/arbitrum-sepolia",
      externalLabel: "Get Arbitrum Sepolia ETH ↗",
    },
    {
      num: 2,
      title: "Get USDC",
      detail:
        usdcNum > 0
          ? `${usdcNum.toFixed(2)} USDC available on Arbitrum`
          : "Bridge from Ethereum or claim from the Circle testnet faucet",
      done: usdcNum > 0,
      loading: false,
      action: () => onNavigate("send"),
      actionLabel: "Bridge USDC →",
      externalLink: "https://faucet.circle.com",
      externalLabel: "Get testnet USDC ↗",
    },
    {
      num: 3,
      title: "Encrypt USDC → cUSDC",
      detail:
        cusdcNum > 0
          ? `${cusdcNum.toFixed(2)} cUSDC encrypted on-chain with FHE`
          : "Convert your USDC to private cUSDC — required to send",
      done: cusdcNum > 0,
      loading: false,
      action: () => onNavigate("send"),
      actionLabel: "Encrypt USDC →",
      externalLink: null,
      externalLabel: null,
    },
    {
      num: 4,
      title: "Register stealth address",
      detail:
        stealthLoading
          ? "Checking registration…"
          : isStealthRegistered
            ? "Registered — others can now send you private payments"
            : "One-time setup so others can send stealth payments to your wallet",
      done: isStealthRegistered,
      loading: stealthLoading,
      action: () => onNavigate("receive"),
      actionLabel: "Register now →",
      externalLink: null,
      externalLabel: null,
    },
  ] as const;

  const doneCount = steps.filter((s) => s.done).length;
  const allDone = doneCount === steps.length;
  const pct = Math.round((doneCount / steps.length) * 100);

  return (
    <div className="space-y-5">
      {/* ── Setup checklist ──────────────────────────────────────── */}
      <div className="pay-card p-5 space-y-4">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[10px] tracking-[0.22em] uppercase text-muted-foreground/45 font-mono mb-0.5">
              Setup guide
            </div>
            <h2 className="font-display text-[15px] font-semibold text-foreground leading-tight">
              {allDone ? "You're all set 🎉" : "Get started with ObscuraPay"}
            </h2>
            <p className="text-[11px] text-muted-foreground/55 mt-0.5">
              {allDone
                ? "All steps complete. Start sending private payments."
                : `${doneCount} of ${steps.length} steps complete`}
            </p>
          </div>
          {/* Progress badge */}
          <div
            className={`shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono border tabular-nums ${
              allDone
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                : "bg-white/[0.04] border-white/[0.08] text-muted-foreground/60"
            }`}
          >
            {allDone && <CheckCircle2 className="w-3 h-3" />}
            {doneCount}/{steps.length}
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-1 rounded-full bg-white/[0.06] overflow-hidden">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all duration-700"
            style={{ width: `${pct}%` }}
          />
        </div>

        {/* Steps */}
        <div className="space-y-2">
          {steps.map((s) => (
            <div
              key={s.num}
              className={`flex items-start gap-3 p-3.5 rounded-xl border transition-colors ${
                s.done
                  ? "border-emerald-500/15 bg-emerald-500/[0.03]"
                  : "border-white/[0.07] bg-white/[0.02]"
              }`}
            >
              {/* Status icon */}
              <div
                className={`mt-0.5 shrink-0 ${
                  s.done ? "text-emerald-400" : "text-muted-foreground/25"
                }`}
              >
                {s.loading ? (
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground/30" />
                ) : s.done ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : (
                  <Circle className="w-5 h-5" />
                )}
              </div>

              {/* Text */}
              <div className="flex-1 min-w-0">
                <div
                  className={`text-[13px] font-medium leading-tight ${
                    s.done ? "text-foreground/55 line-through decoration-white/20" : "text-foreground/90"
                  }`}
                >
                  {s.num}. {s.title}
                </div>
                <div className="text-[11px] text-muted-foreground/50 mt-0.5 leading-snug">
                  {s.detail}
                </div>
              </div>

              {/* Actions / Done badge */}
              {s.done ? (
                <span className="shrink-0 text-[10px] text-emerald-400/50 font-mono uppercase tracking-wide self-center">
                  Done
                </span>
              ) : (
                <div className="shrink-0 flex flex-col items-end gap-1.5 self-center">
                  {s.action && (
                    <button
                      onClick={s.action}
                      className="btn-pay btn-pay-emerald text-[11px] py-1 px-2.5 whitespace-nowrap"
                    >
                      {s.actionLabel}
                    </button>
                  )}
                  {s.externalLink && (
                    <a
                      href={s.externalLink}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[10px] text-muted-foreground/45 hover:text-muted-foreground/70 transition-colors flex items-center gap-0.5"
                    >
                      {s.externalLabel}
                      <ExternalLink className="w-2.5 h-2.5 ml-0.5" />
                    </a>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Quick actions ─────────────────────────────────────────── */}
      <div className="pay-card p-5 space-y-3">
        <div className="text-[10px] tracking-[0.22em] uppercase text-muted-foreground/45 font-mono">
          Quick actions
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {(
            [
              {
                icon: Send,
                label: "Send cUSDC",
                sub: "Private · Stealth",
                tab: "send" as Tab,
              },
              {
                icon: ArrowDownToLine,
                label: "Receive",
                sub: "Inbox · Stealth keys",
                tab: "receive" as Tab,
              },
              {
                icon: Repeat,
                label: "Streams",
                sub: "Recurring payroll",
                tab: "streams" as Tab,
              },
              {
                icon: ShieldCheck,
                label: "Escrow",
                sub: "Lock · Dispute",
                tab: "escrow" as Tab,
              },
            ] as const
          ).map(({ icon: Icon, label, sub, tab }) => (
            <button
              key={tab}
              onClick={() => onNavigate(tab)}
              className="flex flex-col items-center gap-2 p-3.5 rounded-xl border border-white/[0.07] bg-white/[0.02] hover:bg-white/[0.05] hover:border-emerald-500/20 transition-all text-center group"
            >
              <div className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center group-hover:border-emerald-500/25 group-hover:bg-emerald-500/[0.06] transition-colors">
                <Icon className="w-4 h-4 text-muted-foreground/50 group-hover:text-emerald-400 transition-colors" />
              </div>
              <div>
                <div className="text-[12px] text-foreground/70 group-hover:text-foreground/90 transition-colors font-medium leading-tight">
                  {label}
                </div>
                <div className="text-[10px] text-muted-foreground/35 leading-tight mt-0.5">{sub}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ── How it works ──────────────────────────────────────────── */}
      <div className="pay-card p-5 space-y-3">
        <div className="text-[10px] tracking-[0.22em] uppercase text-muted-foreground/45 font-mono">
          How it works
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {(
            [
              {
                Icon: UsdcIcon,
                title: "USDC ↔ cUSDC",
                desc: "Encrypt your USDC into cUSDC on Arbitrum. Decrypt back any time. Always 1:1.",
              },
              {
                Icon: Lock,
                title: "FHE-encrypted amounts",
                desc: "Balances and transfer amounts are encrypted on-chain — invisible to everyone, including validators.",
              },
              {
                Icon: Send,
                title: "Stealth sends",
                desc: "Every send goes to a fresh one-time address. Recipients scan on-chain events to discover and sweep funds.",
              },
              {
                Icon: Globe2,
                title: "Cross-chain via CCTP",
                desc: "Bridge USDC from Ethereum Sepolia directly into Arbitrum cUSDC using Circle's CCTP protocol.",
              },
            ] as const
          ).map(({ Icon, title, desc }) => (
            <div
              key={title}
              className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]"
            >
              <div className="w-7 h-7 rounded-lg bg-emerald-500/[0.07] border border-emerald-500/15 flex items-center justify-center shrink-0 mt-0.5">
                <Icon className="w-3.5 h-3.5 text-emerald-400/60" />
              </div>
              <div>
                <div className="text-[12px] text-foreground/75 font-medium leading-tight">
                  {title}
                </div>
                <div className="text-[11px] text-muted-foreground/45 mt-0.5 leading-snug">
                  {desc}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Recent receipts ───────────────────────────────────────── */}
      <ReceiptList limit={5} />
    </div>
  );
}
