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

      // Persist recipient so StreamList can display it (V2 stores encrypted hint on-chain)
      localStorage.setItem(`v2_stream_recipient_${streamId.toString()}`, hint);

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
      className="pay-card p-6 space-y-5"
    >
      {/* ── Header ── */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-700/10 border border-emerald-500/25 flex items-center justify-center shrink-0">
          <Repeat className="w-4 h-4 text-emerald-400" />
        </div>
        <div className="min-w-0">
          <h3 className="font-display text-sm font-semibold text-foreground leading-tight">Create Payroll Stream</h3>
          <p className="text-[10px] text-muted-foreground/45 tracking-widest mt-0.5 uppercase">Encrypted Hint · V2 · Jitter</p>
        </div>
        <span className="ml-auto shrink-0 pay-badge pay-badge-emerald">V2</span>
      </div>

      <p className="text-[12px] text-muted-foreground/55 leading-relaxed">
        Each cycle sends cUSDC to a fresh stealth address. The recipient hint is encrypted on-chain and per-cycle salts + optional jitter prevent timing correlation.
      </p>

      <div className="space-y-4">
        {/* Recipient */}
        <div className="space-y-2">
          <Label className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground/50 font-semibold">Recipient</Label>
          <ContactPicker value={hint} onChange={setHint} placeholder="0x… recipient address or contact" />
          {recipientStatus === "registered" && (
            <div className="flex items-center gap-1.5 text-[11px] text-emerald-300 mt-1">
              <CheckCircle2 className="w-3 h-3" /> Stealth meta-address found
            </div>
          )}
          {recipientStatus === "not-registered" && (
            <div className="flex items-center gap-1.5 text-[11px] text-red-400 mt-1">
              <XCircle className="w-3 h-3" /> Recipient hasn't registered a meta-address yet
            </div>
          )}
        </div>

        {/* Period pills */}
        <div className="space-y-2">
          <Label className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground/50 font-semibold">Period</Label>
          <div className="flex flex-wrap gap-1.5">
            {PERIODS.map((p) => (
              <button
                key={p.seconds}
                type="button"
                onClick={() => setPeriod(p.seconds)}
                className={`px-3 py-1.5 text-[11px] font-mono rounded-lg border transition-all ${
                  period === p.seconds
                    ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300 shadow-[0_0_12px_rgba(52,211,153,0.18)]"
                    : "bg-white/[0.025] border-white/[0.08] text-muted-foreground/60 hover:border-white/[0.15] hover:text-foreground/80"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Duration + Jitter */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground/50 font-semibold">Duration (days)</Label>
            <Input
              type="number"
              value={durationDays}
              onChange={(e) => setDurationDays(e.target.value)}
              className="mt-0 font-mono bg-white/[0.03] border-white/[0.09] focus:border-emerald-500/40 text-[12px]"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground/50 font-semibold">Jitter (seconds)</Label>
            <Input
              type="number"
              min="0"
              value={jitterSeconds}
              onChange={(e) => setJitterSeconds(e.target.value)}
              className="mt-0 font-mono bg-white/[0.03] border-white/[0.09] focus:border-emerald-500/40 text-[12px]"
              placeholder="0 disables jitter"
            />
          </div>
        </div>

        {/* Auto-insure toggle */}
        <label className="flex items-start gap-3 p-4 rounded-xl border border-white/[0.07] bg-white/[0.02] cursor-pointer hover:border-emerald-500/25 hover:bg-white/[0.03] transition-all">
          <div className="relative mt-0.5 shrink-0">
            <input
              type="checkbox"
              checked={autoInsure}
              onChange={(e) => setAutoInsure(e.target.checked)}
              className="sr-only"
            />
            <div className={`w-8 h-4.5 rounded-full transition-all ${autoInsure ? "bg-emerald-500" : "bg-white/[0.1]"}`}
                 style={{ height: "18px" }}>
              <div className={`w-3.5 h-3.5 rounded-full bg-white shadow transition-transform mt-0.5 ${autoInsure ? "translate-x-4" : "translate-x-0.5"}`}
                   style={{ marginLeft: "2px" }} />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 text-[12px] text-foreground">
              <Shield className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
              Auto-insure each cycle
            </div>
            <div className="text-[11px] text-muted-foreground/55 mt-0.5 leading-relaxed">
              Subscribes the recipient to insurance coverage for every cycle of this stream.
            </div>
            {autoInsure && (
              <div className="mt-3 space-y-1.5">
                <Label className="text-[10px] tracking-[0.12em] uppercase text-muted-foreground/50">
                  Max premium per cycle (cUSDC)
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={maxPremium}
                  onChange={(e) => setMaxPremium(e.target.value)}
                  className="font-mono bg-white/[0.03] border-white/[0.09] focus:border-emerald-500/40 text-[12px]"
                />
              </div>
            )}
          </div>
        </label>

        <motion.button
          whileTap={{ scale: 0.99 }}
          onClick={() => void submit()}
          disabled={submitting}
          className="btn-pay btn-pay-emerald w-full py-2.5"
        >
          {submitting
            ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Creating…</>
            : autoInsure
              ? <><Shield className="w-3.5 h-3.5" /> Create Insured Stream</>
              : <><Repeat className="w-3.5 h-3.5" /> Create Stream</>
          }
        </motion.button>
      </div>
    </motion.div>
  );
}
