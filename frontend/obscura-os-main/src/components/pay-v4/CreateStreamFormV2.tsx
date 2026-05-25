/**
 * CreateStreamFormV2 — Wave 3 stream creation with privacy hardening
 * (encrypted recipient hint + jitter) and an optional one-click
 * "Auto-insure each cycle" subscription that delegates to
 * `useInsuranceSubscription.subscribe`.
 *
 * Routing logic:
 *   - If VITE_OBSCURA_PAY_STREAM_V3_ADDRESS is set → uses V3 stream (handle-based, no CoFHE forwarding)
 *   - Otherwise falls back to V2 (deprecated, CoFHE forwarding bug)
 */
import { useState } from "react";
import { Repeat, CheckCircle2, XCircle, Loader2, Shield } from "lucide-react";
import { isAddress } from "viem";
import { toast } from "sonner";

import { usePayStreamV2 } from "@/hooks/usePayStreamV2";
import { usePayStreamV3 } from "@/hooks/usePayStreamV3";
import { useInsuranceSubscription } from "@/hooks/useInsuranceSubscription";
import { useReceipts } from "@/hooks/useReceipts";
import { useRecipientStealthCheck } from "@/hooks/useRecipientStealthCheck";
import ContactPicker from "./ContactPicker";
import { HarmonyField, HarmonyFieldGrid, HarmonyPillGroup } from "@/components/harmony/harmony-ui";
import { arbitrumSepolia } from "viem/chains";
import { parseUnits } from "viem";
import { OBSCURA_PAY_STREAM_V3_ADDRESS } from "@/config/payV3";

const PERIODS = [
  { label: "1 Min", seconds: 60 },
  { label: "5 Min", seconds: 300 },
  { label: "Daily", seconds: 86_400 },
  { label: "Weekly", seconds: 604_800 },
  { label: "Bi-Weekly", seconds: 1_209_600 },
  { label: "Monthly", seconds: 2_592_000 },
];

export default function CreateStreamFormV2({ onCreated }: { onCreated?: () => void } = {}) {
  // Route to V3 if contract is deployed; keep V2 as fallback.
  const useV3 = !!OBSCURA_PAY_STREAM_V3_ADDRESS;
  const streamV2 = usePayStreamV2();
  const streamV3 = usePayStreamV3();
  const stream = useV3 ? streamV3 : streamV2;
  const insurance = useInsuranceSubscription();
  const receipts = useReceipts();

  const [hint, setHint] = useState("");
  const [period, setPeriod] = useState(PERIODS[2].seconds);
  const [durationDays, setDurationDays] = useState("90");
  // Privacy-by-default: 5-minute jitter window prevents timing correlation
  // attacks across cycles. Power users can set 0 to disable.
  const [jitterSeconds, setJitterSeconds] = useState("300");
  const [autoInsure, setAutoInsure] = useState(false);
  const [maxPremium, setMaxPremium] = useState("1.00");
  const [submitting, setSubmitting] = useState(false);

  const recipientStatus = useRecipientStealthCheck(hint);

  const submit = async () => {
    if (!isAddress(hint)) {
      toast.error("Invalid recipient hint address");
      return;
    }
    if (recipientStatus === "not-registered") {
      toast.error("Recipient has not registered a stealth meta-address yet.");
      return;
    }
    const days = Number(durationDays);
    if (!Number.isFinite(days) || days <= 0) {
      toast.error("Invalid duration");
      return;
    }
    const jitter = Math.max(0, Math.floor(Number(jitterSeconds) || 0));
    const startTime = Math.floor(Date.now() / 1000);
    const endTime = startTime + Math.floor(days * 86_400);

    setSubmitting(true);
    try {
      const { hash, streamId } = await stream.createStream({
        recipientAddress: hint as `0x${string}`,
        periodSeconds: period,
        startTime,
        endTime,
        jitterSeconds: jitter,
      });

      // Persist recipient so StreamList can display it
      const storageKey = useV3
        ? `v3_stream_recipient_${streamId.toString()}`
        : `v2_stream_recipient_${streamId.toString()}`;
      localStorage.setItem(storageKey, hint);

      receipts.add({
        kind: "stream-create",
        txHash: hash,
        chainId: arbitrumSepolia.id,
        recipientLabel: hint,
        meta: { streamId: streamId.toString(), periodSeconds: period, jitterSeconds: jitter },
      });
      toast.success(`Stream #${streamId.toString()} created`);

      if (autoInsure) {
        const cycles = Math.max(1, Math.floor((endTime - startTime) / period));
        const premiumWei = parseUnits(maxPremium || "0", 6);
        try {
          const { hash: subHash } = await insurance.subscribe({
            streamId,
            maxCycles: BigInt(cycles),
            periodSeconds: BigInt(period),
            maxPremiumPerCycle: premiumWei,
          });
          receipts.add({
            kind: "insurance-subscribe",
            txHash: subHash,
            chainId: arbitrumSepolia.id,
            amount: maxPremium,
            recipientLabel: hint,
            meta: { streamId: streamId.toString(), maxCycles: cycles },
          });
          toast.success("Auto-insurance subscribed for every cycle");
        } catch (e) {
          toast.error("Stream created, but insurance subscription failed: " + (e as Error).message);
        }
      }

      setHint("");
      onCreated?.();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* One-line context — drawer header already carries the title */}
      <p className="text-[12px] text-muted-foreground leading-relaxed">
        {useV3
          ? "Each cycle delivers private USDC to escrow. The recipient claims it from a fresh stealth address."
          : "Each cycle sends private USDC to a new stealth address. The recipient hint is hidden on-chain."}
      </p>

      {/* Recipient (full row) */}
      <HarmonyField label="Recipient">
        <ContactPicker value={hint} onChange={setHint} placeholder="0x… address or contact" />
        {recipientStatus === "registered" && (
          <div className="mt-1 flex items-center gap-1.5 text-[11px] text-foreground/70">
            <CheckCircle2 className="w-3 h-3" /> Stealth meta-address found
          </div>
        )}
        {recipientStatus === "not-registered" && (
          <div className="mt-1 flex items-center gap-1.5 text-[11px] text-destructive">
            <XCircle className="w-3 h-3" /> Recipient hasn't registered a meta-address yet
          </div>
        )}
      </HarmonyField>

      {/* Period (full row, compact pills) */}
      <HarmonyField label="Pay every">
        <HarmonyPillGroup
          options={PERIODS.map((p) => ({ value: p.seconds, label: p.label }))}
          value={period}
          onChange={setPeriod}
        />
      </HarmonyField>

      {/* Duration + Jitter (2-col) */}
      <HarmonyFieldGrid>
        <HarmonyField label="Duration (days)">
          <input
            type="number"
            value={durationDays}
            onChange={(e) => setDurationDays(e.target.value)}
            className="pay-input pay-input-sm"
          />
        </HarmonyField>
        <HarmonyField label="Jitter (seconds)" helper="0 disables jitter">
          <input
            type="number"
            min="0"
            value={jitterSeconds}
            onChange={(e) => setJitterSeconds(e.target.value)}
            className="pay-input pay-input-sm"
            placeholder="e.g. 300"
          />
        </HarmonyField>
      </HarmonyFieldGrid>

      {/* Auto-insure — compact 1-line row */}
      <div className="rounded-xl border border-border bg-card">
        <label className="flex items-center gap-3 p-3 cursor-pointer">
          <input
            type="checkbox"
            checked={autoInsure}
            onChange={(e) => setAutoInsure(e.target.checked)}
            className="h-4 w-4 rounded border-border accent-foreground"
          />
          <Shield className="w-3.5 h-3.5 text-foreground/55 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-[12px] text-foreground">Auto-insure each cycle</div>
            <div className="text-[11px] text-muted-foreground/65 leading-snug">
              Subscribes coverage for every cycle automatically.
            </div>
          </div>
        </label>
        {autoInsure && (
          <div className="px-3 pb-3 pt-1">
            <HarmonyField label="Max premium per cycle (USDC)">
              <input
                type="number"
                step="0.01"
                min="0"
                value={maxPremium}
                onChange={(e) => setMaxPremium(e.target.value)}
                className="pay-input pay-input-sm"
              />
            </HarmonyField>
          </div>
        )}
      </div>

      {/* Submit footer */}
      <div className="flex items-center justify-end pt-3 mt-2 border-t border-border/60">
        <button
          type="button"
          onClick={() => void submit()}
          disabled={submitting}
          className="btn-pay btn-pay-primary"
        >
          {submitting ? (
            <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Creating…</>
          ) : autoInsure ? (
            <><Shield className="w-3.5 h-3.5" /> Create insured stream</>
          ) : (
            <><Repeat className="w-3.5 h-3.5" /> Create stream</>
          )}
        </button>
      </div>
    </div>
  );
}
