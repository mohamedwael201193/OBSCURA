import { motion } from "framer-motion";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Eye,
  FileText,
  Inbox,
  Lock,
  Repeat,
  Send,
  ShieldCheck,
  Users,
} from "lucide-react";
import { useAccount } from "wagmi";
import { HarmonyEncryptedValue } from "@/components/harmony/HarmonyEncryptedValue";
import {
  HarmonyAction,
  HarmonyPageIntro,
  HarmonySection,
  HarmonyStat,
} from "@/components/harmony/harmony-ui";
import { useOcUSDCBalance } from "@/hooks/useOcUSDCBalance";
import { useUSDCBalance } from "@/hooks/useUSDCBalance";
import { useStealthInbox } from "@/hooks/useStealthInbox";
import { useReceipts } from "@/hooks/useReceipts";
import { getTrackedUnits } from "@/lib/trackedBalance";
import PayHomeDashboard from "@/components/pay-v4/PayHomeDashboard";

type PayTab =
  | "home"
  | "send"
  | "receive"
  | "streams"
  | "escrow"
  | "insurance"
  | "advanced"
  | "contacts"
  | "settings";

export function PayHarmonyHome({ onNavigate }: { onNavigate: (tab: PayTab) => void }) {
  const { address } = useAccount();
  const { decrypted } = useOcUSDCBalance();
  const usdcBalance = useUSDCBalance();
  const inbox = useStealthInbox();
  const receipts = useReceipts();

  const cusdcUnits = address ? getTrackedUnits(address) : 0n;
  const cusdcNum = Number(cusdcUnits) / 1_000_000;
  const ocDisplay =
    decrypted != null ? (Number(decrypted) / 1_000_000).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "••••••";
  const usdcNum = usdcBalance ? parseFloat(usdcBalance) : 0;
  const unread = inbox.unreadCount ?? 0;

  const activityRows = receipts.receipts.slice(0, 5).map((r) => ({
    icon: ArrowUpRight,
    title: r.kind.replace(/-/g, " "),
    who: r.recipientLabel ?? (r.txHash ? `${r.txHash.slice(0, 6)}…${r.txHash.slice(-4)}` : "—"),
    value: r.amount ? `${r.amount} USDC` : "••••• ocUSDC",
    chip: "Sealed",
    color: "text-emerald-500",
  }));

  const defaultActivity = [
    { icon: Inbox, title: "Stealth inbox", who: unread ? `${unread} pending` : "Empty", value: "+•••• ocUSDC", chip: "Encrypted", color: "text-sky-500" },
    { icon: Repeat, title: "Shield · USDC → ocUSDC", who: "Self", value: cusdcNum > 0 ? cusdcNum.toFixed(2) : "—", chip: "Public→Sealed", color: "text-rose-500" },
  ];

  const rows = activityRows.length > 0 ? activityRows : defaultActivity;

  return (
    <>
      <HarmonyPageIntro
        eyebrow="Good evening · Treasury"
        title="Obscura Pay"
        actions={
          <>
            <HarmonyAction icon={Send} label="Send" primary onClick={() => onNavigate("send")} />
            <HarmonyAction icon={ArrowDownLeft} label="Receive" onClick={() => onNavigate("receive")} />
            <HarmonyAction icon={Repeat} label="Shield / Unshield" onClick={() => onNavigate("send")} />
          </>
        }
      />

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mt-10 overflow-hidden rounded-2xl hairline bg-card"
      >
        <div className="grid items-center gap-8 p-8 md:grid-cols-12 md:p-10">
          <div className="md:col-span-7">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-[hsl(var(--success))]" />
              <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                Shielded Balance · ocUSDC
              </span>
            </div>
            <div className="mt-4">
              <HarmonyEncryptedValue value={ocDisplay} symbol="ocUSDC" size="lg" />
            </div>
            <div className="mt-6 flex flex-wrap gap-6 text-sm">
              <HarmonyStat label="Public · USDC" value={usdcNum > 0 ? `$${usdcNum.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : "$0.00"} />
              <HarmonyStat label="30d outflow" value="•••••" cipher />
              <HarmonyStat label="Tracked ocUSDC" value={cusdcNum > 0 ? cusdcNum.toFixed(2) : "0"} />
              <HarmonyStat label="Stealth inbox" value={unread ? `${unread} unread` : "Clear"} />
            </div>
          </div>

          <div className="rounded-xl bg-foreground p-6 text-background md:col-span-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] opacity-70">Quick send · Encrypted</p>
            <div className="mt-4">
              <p className="font-display text-4xl">
                <span className="cipher-shimmer opacity-80">••••</span>{" "}
                <span className="font-sans text-sm opacity-70">ocUSDC</span>
              </p>
              <p className="mt-1 text-xs opacity-60">Compose in Send — amounts encrypted on device</p>
            </div>
            <div className="mt-5 grid grid-cols-3 gap-2 text-xs">
              {["Encrypt", "Sign", "Submit"].map((s, i) => (
                <div
                  key={s}
                  className={`rounded-md px-2 py-2 text-center ${i === 0 ? "bg-accent text-accent-foreground" : "bg-white/10"}`}
                >
                  {s}
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => onNavigate("send")}
              className="mt-5 inline-flex h-10 w-full items-center justify-center gap-2 rounded-full bg-accent text-sm font-medium text-accent-foreground"
            >
              <Lock className="h-3.5 w-3.5" /> Encrypt &amp; send
            </button>
          </div>
        </div>
      </motion.div>

      <HarmonySection title="Transaction lifecycle" hint="Narrated, end-to-end. Always clear what's encrypted.">
        <div className="grid gap-4 md:grid-cols-4">
          {[
            { t: "Compose", d: "Amount encrypted on device with ZKPoK", chip: "Local", icon: Lock },
            { t: "Relay", d: "Submitted to CoFHE TaskManager", chip: "Sealed", icon: Send },
            { t: "Compute", d: "FHE.transfer runs on ciphertext", chip: "Compute", icon: ShieldCheck },
            { t: "Settle", d: "Threshold network confirms on L2", chip: "Onchain", icon: Eye },
          ].map((s, i) => (
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
      </HarmonySection>

      <div className="mt-12 grid gap-6 lg:grid-cols-3">
        <div className="hairline bg-card lg:col-span-2 rounded-2xl">
          <div className="flex items-center justify-between border-b border-border p-6">
            <p className="font-display text-2xl">Activity</p>
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Recent</span>
          </div>
          <ul>
            {rows.map((r, i) => (
              <li
                key={i}
                className="grid grid-cols-12 items-center border-b border-border px-6 py-4 last:border-0"
              >
                <div className="col-span-5 flex items-center gap-3">
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-muted">
                    <r.icon className={`h-4 w-4 ${r.color}`} />
                  </span>
                  <div>
                    <p className="text-sm font-medium">{r.title}</p>
                    <p className="text-xs text-muted-foreground">{r.who}</p>
                  </div>
                </div>
                <div className="col-span-4 font-mono text-sm tabular-nums">{r.value}</div>
                <div className="col-span-3 text-right">
                  <span className="rounded-full bg-muted px-2 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                    {r.chip}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl hairline bg-card p-6">
          <p className="font-display text-2xl">Setup</p>
          <p className="mt-1 text-sm text-muted-foreground">Onboarding checklist</p>
          <div className="mt-4 max-h-[280px] overflow-y-auto">
            <PayHomeDashboard onNavigate={onNavigate} />
          </div>
        </div>
      </div>
    </>
  );
}
