/**
 * PayHomeDashboard � streamlined 3-step setup guide.
 * Auto-hides after 7 days if steps are not all done.
 * Shown inside PayHarmonyHome overview card.
 */
import { useAccount, useReadContract, usePublicClient } from "wagmi";
import { useState, useEffect } from "react";
import { CheckCircle2, Circle, ExternalLink, Loader2 } from "lucide-react";
import { useUSDCBalance } from "@/hooks/useUSDCBalance";
import { getTrackedUnits } from "@/lib/trackedBalance";
import {
  OBSCURA_STEALTH_REGISTRY_ABI,
  OBSCURA_STEALTH_REGISTRY_ADDRESS,
} from "@/config/pay";

const FIRST_SEEN_KEY = "obscura.setup.firstSeenAt";
const HIDE_AFTER_MS = 7 * 24 * 60 * 60 * 1000;

type Tab =
  | "home"
  | "send"
  | "receive"
  | "streams"
  | "escrow"
  | "receivables"
  | "advanced"
  | "contacts"
  | "settings";

interface Props {
  onNavigate: (tab: Tab) => void;
}

export default function PayHomeDashboard({ onNavigate }: Props) {
  const { address } = useAccount();
  const publicClient = usePublicClient();

  useEffect(() => {
    if (!localStorage.getItem(FIRST_SEEN_KEY)) {
      localStorage.setItem(FIRST_SEEN_KEY, String(Date.now()));
    }
  }, []);

  const [ethNum, setEthNum] = useState<number>(0);
  const [ethChecked, setEthChecked] = useState(false);
  useEffect(() => {
    if (!address || !publicClient) return;
    setEthChecked(false);
    publicClient
      .getBalance({ address })
      .then((bal) => {
        setEthNum(Number(bal) / 1e18);
        setEthChecked(true);
      })
      .catch(() => setEthChecked(true));
  }, [address, publicClient]);

  const usdcBalance = useUSDCBalance();
  const cusdcUnits = address ? getTrackedUnits(address) : 0n;
  const cusdcNum = Number(cusdcUnits) / 1_000_000;
  const usdcNum = usdcBalance ? parseFloat(usdcBalance) : 0;

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

  const steps = [
    {
      num: 1,
      title: "Get ETH for gas",
      detail: !ethChecked
        ? "Checking balance..."
        : ethNum > 0.0001
          ? `${ethNum.toFixed(4)} ETH ready`
          : "You need a small amount of ETH to pay transaction fees",
      done: ethChecked && ethNum > 0.0001,
      loading: !ethChecked,
      action: null as null | (() => void),
      actionLabel: null as null | string,
      externalLink: "https://www.alchemy.com/faucets/arbitrum-sepolia",
      externalLabel: "Get Arbitrum Sepolia ETH",
    },
    {
      num: 2,
      title: "Make USDC private",
      detail:
        cusdcNum > 0
          ? `${cusdcNum.toFixed(2)} private ocUSDC ready`
          : usdcNum > 0
            ? `${usdcNum.toFixed(2)} USDC available � shield it to make it private`
            : "Get USDC from a faucet, then shield it to private ocUSDC",
      done: cusdcNum > 0,
      loading: false,
      action: () => onNavigate("pay"),
      actionLabel: "Shield USDC",
      externalLink: "https://faucet.circle.com",
      externalLabel: "Get testnet USDC",
    },
    {
      num: 3,
      title: "Register private address",
      detail: stealthLoading
        ? "Checking registration..."
        : isStealthRegistered
          ? "Registered � others can send you private payments"
          : "One-time setup so others can send payments to your wallet privately",
      done: isStealthRegistered,
      loading: stealthLoading,
      action: () => onNavigate("getpaid"),
      actionLabel: "Register now",
      externalLink: null,
      externalLabel: null,
    },
  ] as const;

  const doneCount = steps.filter((s) => s.done).length;
  const allDone = doneCount === steps.length;
  const pct = Math.round((doneCount / steps.length) * 100);

  const firstSeen = parseInt(localStorage.getItem(FIRST_SEEN_KEY) ?? "0", 10);
  const tooOld = !allDone && firstSeen > 0 && Date.now() - firstSeen > HIDE_AFTER_MS;
  if (tooOld) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] text-muted-foreground">
          {allDone ? "All set." : `${doneCount} of ${steps.length} complete`}
        </p>
        <span
          className={`shrink-0 rounded-full px-2.5 py-0.5 font-mono text-[10px] tabular-nums ${
            allDone
              ? "bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]"
              : "bg-muted text-muted-foreground"
          }`}
        >
          {doneCount}/{steps.length}
        </span>
      </div>

      <div className="h-1 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-accent transition-all duration-700"
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="space-y-2">
        {steps.map((s) => (
          <div
            key={s.num}
            className={`flex items-start gap-3 p-3 rounded-xl transition-colors ${
              s.done
                ? "border border-[hsl(var(--success))]/20 bg-[hsl(var(--success))]/5"
                : "hairline bg-card/50"
            }`}
          >
            <div className={`mt-0.5 shrink-0 ${s.done ? "text-[hsl(var(--success))]" : "text-muted-foreground/30"}`}>
              {s.loading ? (
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground/30" />
              ) : s.done ? (
                <CheckCircle2 className="w-5 h-5" />
              ) : (
                <Circle className="w-5 h-5" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className={`text-[12px] font-medium leading-tight ${s.done ? "text-foreground/50 line-through" : "text-foreground"}`}>
                {s.title}
              </div>
              <div className="text-[11px] text-muted-foreground/60 mt-0.5 leading-snug">
                {s.detail}
              </div>
            </div>

            {s.done ? (
              <span className="shrink-0 font-mono text-[10px] text-muted-foreground/50 uppercase tracking-wide self-center">
                Done
              </span>
            ) : (
              <div className="shrink-0 flex flex-col items-end gap-1.5 self-center">
                {s.action && (
                  <button
                    onClick={s.action}
                    className="inline-flex h-7 items-center gap-1 rounded-full bg-foreground px-3 text-[11px] font-medium text-background whitespace-nowrap"
                  >
                    {s.actionLabel} ?
                  </button>
                )}
                {s.externalLink && (
                  <a
                    href={s.externalLink}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-0.5 text-[10px] text-muted-foreground/50 hover:text-muted-foreground/80 transition-colors"
                  >
                    {s.externalLabel} ?
                    <ExternalLink className="w-2.5 h-2.5 ml-0.5" />
                  </a>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
