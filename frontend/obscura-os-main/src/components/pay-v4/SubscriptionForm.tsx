/**
 * SubscriptionForm — Phase B2.
 *
 * Stripe Billing-style wrapper around PayStreamV2: "Pay $X every month
 * for N months." Instead of asking the user to think about cycles and
 * jitter, this form only asks for the merchant address, the monthly
 * amount, and the number of months. Internally it creates a regular
 * stream with periodSeconds = 30 days. Subscriptions are visible in the
 * normal Streams list (and pause / cancel work the same way).
 *
 * UX pattern lifted from popular subscription billing flows
 * (Stripe Checkout, Patreon, Substack): one big primary CTA, simple
 * total summary, transparent renewal frequency.
 */
import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Repeat, CheckCircle2, Loader2, Calendar, ArrowRight } from "lucide-react";
import { isAddress, parseUnits } from "viem";
import { toast } from "sonner";
import { arbitrumSepolia } from "viem/chains";
import { usePublicClient } from "wagmi";
import TxProgressPanel from "@/components/shared/TxProgressPanel";
import { useTxProgress, SUBSCRIPTION_STEPS } from "@/hooks/useTxProgress";

import { usePayStreamV2 } from "@/hooks/usePayStreamV2";
import { useTickStream } from "@/hooks/useTickStream";
import { useReceipts } from "@/hooks/useReceipts";
import { useRecipientStealthCheck } from "@/hooks/useRecipientStealthCheck";
import type { MetaAddress } from "@/lib/stealth";
import {
  OBSCURA_STEALTH_REGISTRY_ABI,
  OBSCURA_STEALTH_REGISTRY_ADDRESS,
} from "@/config/pay";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const MONTH_SECONDS = 2_592_000; // 30 days

const QUICK_AMOUNTS = ["5", "10", "25", "50"];
const QUICK_DURATIONS: { label: string; months: number }[] = [
  { label: "3 mo", months: 3 },
  { label: "6 mo", months: 6 },
  { label: "12 mo", months: 12 },
  { label: "24 mo", months: 24 },
];

export default function SubscriptionForm({ onCreated }: { onCreated?: () => void } = {}) {
  const stream = usePayStreamV2();
  const tickStream = useTickStream();
  const receipts = useReceipts();
  const publicClient = usePublicClient();

  const [merchant, setMerchant] = useState("");
  const [monthly, setMonthly] = useState("10.00");
  const [months, setMonths] = useState("12");
  const [submitting, setSubmitting] = useState(false);
  const subProgress = useTxProgress(SUBSCRIPTION_STEPS);

  const recipientStatus = useRecipientStealthCheck(merchant);

  const totalLifetime = useMemo(() => {
    const m = Number(monthly) || 0;
    const n = Number(months) || 0;
    return (m * n).toFixed(2);
  }, [monthly, months]);

  const submit = async () => {
    if (!isAddress(merchant)) {
      toast.error("Invalid merchant address");
      return;
    }
    if (recipientStatus === "not-registered") {
      toast.error("Merchant has not registered a stealth meta-address yet.");
      return;
    }
    const n = Math.max(1, Math.floor(Number(months) || 0));
    if (!n) {
      toast.error("Pick a duration");
      return;
    }
    if (!monthly || Number(monthly) <= 0) {
      toast.error("Enter a monthly amount");
      return;
    }

    const startTime = Math.floor(Date.now() / 1000);
    const endTime = startTime + n * MONTH_SECONDS;
    const amountRaw = parseUnits(monthly, 6);

    setSubmitting(true);
    subProgress.resetSteps();
    try {
      // ── Step 1: register stream schedule on-chain ──────────────────────
      subProgress.setStepStatus("create", "active");
      toast.loading("Creating subscription schedule…", { id: "sub-create" });
      const { hash, streamId } = await stream.createStream({
        recipientAddress: merchant as `0x${string}`,
        periodSeconds: MONTH_SECONDS,
        startTime,
        endTime,
        jitterSeconds: 0,
      });
      subProgress.setStepStatus("create", "done", { txHash: hash });
      toast.dismiss("sub-create");

      // Persist recipient locally so StreamList can show plaintext label.
      localStorage.setItem(`v2_stream_recipient_${streamId.toString()}`, merchant);
      // Persist suggested per-cycle amount so StreamList "Pay all due" picks it up.
      localStorage.setItem("obscura.streams.tickAmount.v1", monthly);
      // Tag this stream as a subscription so we can later filter it.
      localStorage.setItem(`obscura.subscription.${streamId.toString()}`, JSON.stringify({
        merchant,
        monthlyAmount: monthly,
        totalMonths: n,
        createdAt: Date.now(),
      }));

      receipts.add({
        kind: "stream-create",
        txHash: hash,
        chainId: arbitrumSepolia.id,
        recipientLabel: merchant,
        amount: `${monthly}/mo × ${n}`,
        note: "Subscription",
        meta: { streamId: streamId.toString(), periodSeconds: MONTH_SECONDS, subscription: true },
      });

      // ── Step 2: pay cycle 1 immediately via direct cUSDC transfer ──────
      try {
        subProgress.setStepStatus("enc1", "active");
        toast.loading("Schedule active — paying first cycle now…", { id: "sub-tick" });

        // Fetch merchant's stealth meta-address from registry.
        let recipientMeta: MetaAddress | null = null;
        if (publicClient && OBSCURA_STEALTH_REGISTRY_ADDRESS) {
          const [spendingPubKey, viewingPubKey, publishedAt] = await publicClient.readContract({
            address: OBSCURA_STEALTH_REGISTRY_ADDRESS,
            abi: OBSCURA_STEALTH_REGISTRY_ABI,
            functionName: "getMetaAddress",
            args: [merchant as `0x${string}`],
          }) as [`0x${string}`, `0x${string}`, bigint];
          if (publishedAt > 0n) recipientMeta = { spendingPubKey, viewingPubKey };
        }

        if (!recipientMeta) throw new Error("Could not read merchant stealth meta-address");
        subProgress.setStepStatus("enc1", "done");
        subProgress.setStepStatus("transfer", "active");
        toast.dismiss("sub-tick");

        const { txHash: tickHash } = await tickStream.tick({
          streamId,
          amount: amountRaw,
          recipientMeta,
        });
        subProgress.setStepStatus("transfer", "done", { txHash: tickHash });
        subProgress.setStepStatus("wait1", "done");
        subProgress.setStepStatus("announce", "done");

        receipts.add({
          kind: "stream-create",
          txHash: tickHash,
          chainId: arbitrumSepolia.id,
          recipientLabel: merchant,
          amount: monthly,
          note: `Subscription #${streamId.toString()} — cycle 1 paid`,
          meta: { streamId: streamId.toString(), cycle: 1 },
        });

        toast.success(
          `Subscription #${streamId.toString()} active — ${monthly} cUSDC paid now, renews in 30 days`,
        );
      } catch (tickErr) {
        toast.dismiss("sub-tick");
        // Stream is created; only first payment failed. Guide user to retry.
        toast.warning(
          `Schedule created but first payment failed: ${(tickErr as Error).message}. ` +
          `Open Streams → "Pay all due" to retry.`,
          { duration: 8000 },
        );
      }

      setMerchant("");
      onCreated?.();
    } catch (err) {
      toast.dismiss("sub-create");
      toast.error((err as Error).message || "Subscription creation failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="pay-card p-5 space-y-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-violet-500/15 border border-violet-500/30 flex items-center justify-center shrink-0">
          <Repeat className="w-4 h-4 text-violet-300" />
        </div>
        <div className="min-w-0">
          <div className="font-display text-[15px] font-semibold">Confidential subscription</div>
          <p className="text-[12px] text-muted-foreground/70 mt-0.5 leading-relaxed">
            Pay a fixed monthly amount privately. Each renewal goes through CoFHE-encrypted cUSDC.
            Cancel any time from Streams.
          </p>
        </div>
      </div>

      {/* Merchant */}
      <div className="space-y-1.5">
        <Label className="text-[11px] tracking-[0.12em] uppercase text-muted-foreground/60">Merchant address</Label>
        <Input
          value={merchant}
          onChange={(e) => setMerchant(e.target.value)}
          placeholder="0x… (the wallet getting paid)"
          className="font-mono"
        />
        {merchant && isAddress(merchant) && (
          <div className="text-[10.5px] flex items-center gap-1.5 text-muted-foreground/65">
            {recipientStatus === "registered" && (
              <><CheckCircle2 className="w-3 h-3 text-emerald-400" /> stealth-ready merchant</>
            )}
            {recipientStatus === "not-registered" && (
              <><span className="w-1.5 h-1.5 rounded-full bg-amber-400" /> merchant needs to register stealth meta-address first</>
            )}
            {recipientStatus === "checking" && <span>checking…</span>}
          </div>
        )}
      </div>

      {/* Monthly */}
      <div className="space-y-1.5">
        <Label className="text-[11px] tracking-[0.12em] uppercase text-muted-foreground/60">Monthly amount (cUSDC)</Label>
        <Input
          inputMode="decimal"
          value={monthly}
          onChange={(e) => setMonthly(e.target.value)}
          className="font-mono"
        />
        <div className="flex gap-1.5">
          {QUICK_AMOUNTS.map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => setMonthly(a)}
              className={`px-3 py-1 rounded-md text-[11px] font-mono border ${
                monthly === a
                  ? "bg-violet-500/15 border-violet-500/40 text-violet-200"
                  : "bg-white/[0.025] border-white/[0.06] text-muted-foreground/65 hover:border-white/[0.12]"
              }`}
            >
              ${a}
            </button>
          ))}
        </div>
      </div>

      {/* Duration */}
      <div className="space-y-1.5">
        <Label className="text-[11px] tracking-[0.12em] uppercase text-muted-foreground/60 flex items-center gap-1.5">
          <Calendar className="w-3 h-3" /> Duration
        </Label>
        <div className="grid grid-cols-4 gap-1.5">
          {QUICK_DURATIONS.map((d) => (
            <button
              key={d.months}
              type="button"
              onClick={() => setMonths(String(d.months))}
              className={`py-2 rounded-lg text-[11px] font-mono border ${
                Number(months) === d.months
                  ? "bg-violet-500/15 border-violet-500/40 text-violet-200"
                  : "bg-white/[0.025] border-white/[0.06] text-muted-foreground/70 hover:border-white/[0.12]"
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary */}
      <div className="rounded-xl bg-white/[0.025] border border-white/[0.07] p-3.5 space-y-1.5">
        <div className="flex items-center justify-between text-[12px]">
          <span className="text-muted-foreground/65">Per month</span>
          <span className="font-mono font-semibold">{monthly || "0"} cUSDC</span>
        </div>
        <div className="flex items-center justify-between text-[12px]">
          <span className="text-muted-foreground/65">For</span>
          <span className="font-mono">{months || "0"} months</span>
        </div>
        <div className="h-px bg-white/[0.08]" />
        <div className="flex items-center justify-between text-[13px]">
          <span className="text-foreground/85 font-display font-semibold">Lifetime cap</span>
          <span className="font-mono font-bold text-violet-200">{totalLifetime} cUSDC</span>
        </div>
        <p className="text-[10px] text-muted-foreground/45 leading-relaxed">
          You only spend cUSDC at each renewal. Each charge is encrypted end-to-end via CoFHE.
        </p>
      </div>

      <AnimatePresence>
        {submitting && (
          <motion.div
            key="sub-progress"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <TxProgressPanel
              steps={subProgress.steps}
              title="Starting subscription"
              subtitle="Create schedule + pay first cycle"
              doneMessage="Subscription active — first month paid"
            />
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div whileTap={{ scale: 0.99 }}>
        <Button
          onClick={submit}
          disabled={submitting}
          className="w-full py-5 bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-400 hover:to-fuchsia-400 text-white font-display font-semibold text-[13px]"
        >
          {submitting ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Activating subscription…</>
          ) : (
            <>Start subscription <ArrowRight className="w-4 h-4 ml-2" /></>
          )}
        </Button>
      </motion.div>

      <p className="text-[10.5px] text-muted-foreground/45 text-center leading-relaxed">
        Renews every 30 days. Manage / pause / cancel from <strong className="text-foreground/70">Streams</strong>.
        Use the "Pay all due cycles" button there to charge multiple subscriptions at once.
      </p>
    </div>
  );
}
