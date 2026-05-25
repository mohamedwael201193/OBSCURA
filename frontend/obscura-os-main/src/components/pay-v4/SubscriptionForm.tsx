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
import { CheckCircle2, Loader2, ArrowRight } from "lucide-react";
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

import { HarmonyField, HarmonyFieldGrid, HarmonyPillGroup } from "@/components/harmony/harmony-ui";

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
          `Subscription #${streamId.toString()} active — ${monthly} ocUSDC paid now, renews in 30 days`,
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
    <div className="space-y-4">
      <p className="text-[12px] text-muted-foreground leading-relaxed">
        Pay a fixed monthly amount privately. Each renewal is hidden on-chain. Cancel anytime from Streams.
      </p>

      {/* Merchant (full row) */}
      <HarmonyField label="Merchant address">
        <input
          value={merchant}
          onChange={(e) => setMerchant(e.target.value)}
          placeholder="0x… (the wallet getting paid)"
          className="pay-input"
        />
        {merchant && isAddress(merchant) && (
          <div className="mt-1 text-[10.5px] flex items-center gap-1.5 text-muted-foreground/65">
            {recipientStatus === "registered" && (
              <><CheckCircle2 className="w-3 h-3 text-foreground" /> Private receiving enabled</>
            )}
            {recipientStatus === "not-registered" && (
              <><span className="w-1.5 h-1.5 rounded-full bg-amber-400" /> Merchant must enable private receiving first</>
            )}
            {recipientStatus === "checking" && <span>Checking…</span>}
          </div>
        )}
      </HarmonyField>

      {/* Monthly + Duration — 2-col */}
      <HarmonyFieldGrid>
        <HarmonyField label="Monthly (USDC)">
          <input
            inputMode="decimal"
            value={monthly}
            onChange={(e) => setMonthly(e.target.value)}
            className="pay-input pay-input-sm"
          />
          <div className="mt-2">
            <HarmonyPillGroup
              size="sm"
              options={QUICK_AMOUNTS.map((a) => ({ value: a, label: `$${a}` }))}
              value={monthly}
              onChange={setMonthly}
            />
          </div>
        </HarmonyField>
        <HarmonyField label="Duration">
          <input
            type="number"
            min="1"
            value={months}
            onChange={(e) => setMonths(e.target.value)}
            className="pay-input pay-input-sm"
          />
          <div className="mt-2">
            <HarmonyPillGroup
              size="sm"
              options={QUICK_DURATIONS.map((d) => ({ value: String(d.months), label: d.label }))}
              value={months}
              onChange={setMonths}
            />
          </div>
        </HarmonyField>
      </HarmonyFieldGrid>

      {/* Summary */}
      <div className="rounded-xl border border-border bg-card p-3 space-y-1.5">
        <div className="flex items-center justify-between text-[12px]">
          <span className="text-muted-foreground">Per month</span>
          <span className="font-mono">{monthly || "0"} USDC</span>
        </div>
        <div className="flex items-center justify-between text-[12px]">
          <span className="text-muted-foreground">For</span>
          <span className="font-mono">{months || "0"} months</span>
        </div>
        <div className="h-px bg-border" />
        <div className="flex items-center justify-between text-[13px]">
          <span className="text-foreground font-medium">Lifetime cap</span>
          <span className="font-mono font-semibold">{totalLifetime} USDC</span>
        </div>
        <p className="text-[10.5px] text-muted-foreground/60 leading-snug">
          Charges happen only at each renewal. Amounts are hidden on-chain.
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

      <div className="flex items-center justify-end gap-2 pt-3 mt-2 border-t border-border/60">
        <button
          type="button"
          onClick={submit}
          disabled={submitting}
          className="btn-pay btn-pay-primary"
        >
          {submitting ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Activating…</>
          ) : (
            <>Start subscription <ArrowRight className="w-4 h-4" /></>
          )}
        </button>
      </div>

      <p className="text-[10.5px] text-muted-foreground/55 text-center leading-snug">
        Renews every 30 days. Manage from <strong className="text-foreground/70">Streams</strong>.
      </p>
    </div>
  );
}
