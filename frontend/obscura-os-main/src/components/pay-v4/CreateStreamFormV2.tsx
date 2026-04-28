/**
 * CreateStreamFormV2 — Wave 3 stream creation with privacy hardening
 * (encrypted recipient hint + jitter) and an optional one-click
 * "Auto-insure each cycle" subscription that delegates to
 * `useInsuranceSubscription.subscribe`.
 */
import { useState } from "react";
import { motion } from "framer-motion";
import { Repeat, CheckCircle2, XCircle, Loader2, Shield } from "lucide-react";
import { isAddress } from "viem";
import { toast } from "sonner";

import { usePayStreamV2 } from "@/hooks/usePayStreamV2";
import { useInsuranceSubscription } from "@/hooks/useInsuranceSubscription";
import { useReceipts } from "@/hooks/useReceipts";
import { useRecipientStealthCheck } from "@/hooks/useRecipientStealthCheck";
import ContactPicker from "./ContactPicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { arbitrumSepolia } from "viem/chains";
import { parseUnits } from "viem";

const PERIODS = [
  { label: "1 Min", seconds: 60 },
  { label: "5 Min", seconds: 300 },
  { label: "Daily", seconds: 86_400 },
  { label: "Weekly", seconds: 604_800 },
  { label: "Bi-Weekly", seconds: 1_209_600 },
  { label: "Monthly", seconds: 2_592_000 },
];

export default function CreateStreamFormV2({ onCreated }: { onCreated?: () => void } = {}) {
  const stream = usePayStreamV2();
  const insurance = useInsuranceSubscription();
  const receipts = useReceipts();

  const [hint, setHint] = useState("");
  const [period, setPeriod] = useState(PERIODS[2].seconds);
  const [durationDays, setDurationDays] = useState("90");
  const [jitterSeconds, setJitterSeconds] = useState("0");
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
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-panel rounded-md p-6 space-y-4"
    >
      <div className="flex items-center gap-2">
        <Repeat className="w-4 h-4 text-primary" />
        <h3 className="font-display text-sm tracking-wider text-foreground">Create payroll stream (V2)</h3>
        <span className="ml-auto text-[11px] text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
          cUSDC · RECURRING · ENC HINT
        </span>
      </div>

      <p className="text-sm text-muted-foreground/70">
        Each cycle sends cUSDC to a fresh stealth address. The recipient hint is encrypted on-chain and
        cycle commits use a per-cycle salt + optional jitter so the schedule cannot be timed.
      </p>

      <div className="space-y-3">
        <div>
          <Label className="text-[11px] tracking-wide uppercase text-muted-foreground/70">Recipient</Label>
          <ContactPicker value={hint} onChange={setHint} placeholder="0x… recipient address or contact" />
          {recipientStatus === "registered" && (
            <div className="text-[11px] text-emerald-300 mt-1.5 inline-flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Stealth meta-address found
            </div>
          )}
          {recipientStatus === "not-registered" && (
            <div className="text-[11px] text-amber-300 mt-1.5 inline-flex items-center gap-1">
              <XCircle className="w-3 h-3" /> Recipient hasn't registered a meta-address yet
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-[11px] tracking-wide uppercase text-muted-foreground/70">Period</Label>
            <div className="relative mt-1.5">
              <select
                value={period}
                onChange={(e) => setPeriod(Number(e.target.value))}
                className="appearance-none w-full bg-gradient-to-b from-white/[0.04] to-white/[0.02] border border-white/10 hover:border-emerald-500/30 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 rounded-md pl-3 pr-8 py-2 text-[12px] font-mono text-foreground transition-colors cursor-pointer"
              >
                {PERIODS.map((p) => (
                  <option key={p.seconds} value={p.seconds} className="bg-[#0a0d12] text-foreground">{p.label}</option>
                ))}
              </select>
              <svg className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-emerald-300/70" viewBox="0 0 12 12" fill="none"><path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
          </div>
          <div>
            <Label className="text-[11px] tracking-wide uppercase text-muted-foreground/70">Duration (days)</Label>
            <Input
              type="number"
              value={durationDays}
              onChange={(e) => setDurationDays(e.target.value)}
              className="mt-1.5 font-mono"
            />
          </div>
        </div>

        <div>
          <Label className="text-[11px] tracking-wide uppercase text-muted-foreground/70">
            Jitter (seconds, ± random per cycle)
          </Label>
          <Input
            type="number"
            min="0"
            value={jitterSeconds}
            onChange={(e) => setJitterSeconds(e.target.value)}
            className="mt-1.5 font-mono"
            placeholder="0 disables jitter"
          />
        </div>

        <label className="flex items-start gap-2.5 p-3 rounded-md border border-white/[0.06] bg-white/[0.02] cursor-pointer hover:border-emerald-500/30">
          <input
            type="checkbox"
            checked={autoInsure}
            onChange={(e) => setAutoInsure(e.target.checked)}
            className="mt-0.5"
          />
          <div className="flex-1">
            <div className="flex items-center gap-1.5 text-[12.5px] text-foreground">
              <Shield className="w-3.5 h-3.5 text-emerald-300" />
              Auto-insure each cycle
            </div>
            <div className="text-[11px] text-muted-foreground/65 mt-0.5">
              Subscribes the recipient to insurance coverage for every cycle of this stream.
            </div>
            {autoInsure && (
              <div className="mt-2">
                <Label className="text-[10px] tracking-wide uppercase text-muted-foreground/65">
                  Max premium per cycle (USDC)
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={maxPremium}
                  onChange={(e) => setMaxPremium(e.target.value)}
                  className="mt-1 font-mono"
                />
              </div>
            )}
          </div>
        </label>

        <Button onClick={() => void submit()} disabled={submitting} className="w-full">
          {submitting ? (
            <>
              <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" /> Creating…
            </>
          ) : autoInsure ? (
            "Create insured stream"
          ) : (
            "Create stream"
          )}
        </Button>
      </div>
    </motion.div>
  );
}
