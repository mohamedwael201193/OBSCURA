import { useState } from "react";
import { useAccount } from "wagmi";
import { motion } from "framer-motion";
import { Repeat, Calendar, User, CheckCircle2, XCircle, Loader2, Copy, Link2 } from "lucide-react";
import { useCreateStream } from "@/hooks/useCreateStream";
import { useRecipientStealthCheck } from "@/hooks/useRecipientStealthCheck";
import { toast } from "sonner";

const PERIODS = [
  { label: "1 Min", seconds: 60 },
  { label: "5 Min", seconds: 300 },
  { label: "Daily", seconds: 86_400 },
  { label: "Weekly", seconds: 604_800 },
  { label: "Bi-Weekly", seconds: 1_209_600 },
  { label: "Monthly", seconds: 2_592_000 },
];

export default function CreateStreamForm({ onCreated }: { onCreated?: () => void } = {}) {
  const { address } = useAccount();
  const [hint, setHint] = useState("");
  const [period, setPeriod] = useState(PERIODS[0].seconds);
  const [durationDays, setDurationDays] = useState("90");
  const { create, isPending, error } = useCreateStream();
  const recipientStatus = useRecipientStealthCheck(hint);

  const copyInviteLink = () => {
    const url = `${window.location.origin}/pay?tab=stealth`;
    const msg = `You've been invited to receive encrypted payroll on Obscura.\n\nBefore I can pay you, you need to register your stealth address (one-time, takes 10 seconds):\n\n1. Go to: ${url}\n2. Connect your wallet (${hint})\n3. Click "Generate & Publish"\n\nThat's it! Once registered, I'll start your encrypted salary stream.`;
    navigator.clipboard.writeText(msg);
    toast.success("Invite message copied to clipboard — send it to your recipient");
  };

  const submit = async () => {
    if (!/^0x[a-fA-F0-9]{40}$/.test(hint)) {
      toast.error("Invalid recipient hint address");
      return;
    }
    if (recipientStatus === "not-registered") {
      toast.error("This recipient hasn't registered a stealth address yet. Send them the invite link below.");
      return;
    }
    const days = Number(durationDays);
    if (!Number.isFinite(days) || days <= 0) {
      toast.error("Invalid duration");
      return;
    }
    const start = Math.floor(Date.now() / 1000);
    const end = start + Math.floor(days * 86_400);
    try {
      await create({
        recipientHint: hint as `0x${string}`,
        periodSeconds: period,
        startTime: start,
        endTime: end,
      });
      toast.success("Stream created — it will appear below shortly");
      setHint("");
      onCreated?.();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <div className="pay-card p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-700/10 border border-emerald-500/25 flex items-center justify-center shrink-0">
          <Repeat className="w-4 h-4 text-emerald-400" />
        </div>
        <div className="min-w-0">
          <h3 className="font-display text-sm font-semibold text-foreground leading-tight">Create Payroll Stream</h3>
          <p className="text-[10px] text-muted-foreground/45 tracking-widest mt-0.5 uppercase">cUSDC · Recurring</p>
        </div>
        <span className="ml-auto shrink-0 pay-badge pay-badge-emerald">PAYROLL</span>
      </div>

      <p className="text-[12px] text-muted-foreground/55 leading-relaxed">
        Set up automatic encrypted salary payments. Each cycle sends cUSDC to a fresh stealth address
        that only the recipient can claim. The recipient needs to register their stealth meta-address first (Stealth tab).
      </p>

      <div className="space-y-4">
        <div>
          <label className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground/50 font-semibold block mb-1.5">
            Recipient Wallet Address
          </label>
          <div className="flex gap-2">
            <input type="text" placeholder="0x..." value={hint} onChange={(e) => setHint(e.target.value)}
              className="pay-input flex-1" />
            {address && (
              <button type="button" onClick={() => setHint(address)} title="Use your own address (self-test)"
                className="btn-pay btn-pay-ghost px-3 whitespace-nowrap">
                <User className="w-3 h-3" /> Me
              </button>
            )}
          </div>

          {/* Live stealth registration status */}
          {hint && /^0x[a-fA-F0-9]{40}$/.test(hint) && (
            <div className="mt-2">
              {recipientStatus === "checking" && (
                <div className="flex items-center gap-2 text-[12px] text-muted-foreground/50">
                  <Loader2 className="w-3 h-3 animate-spin" /> Checking stealth registration…
                </div>
              )}
              {recipientStatus === "registered" && (
                <div className="flex items-center gap-2 text-[12px] text-emerald-400">
                  <CheckCircle2 className="w-3 h-3" /> Stealth address registered — ready to receive streams
                </div>
              )}
              {recipientStatus === "not-registered" && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-[12px] text-red-400">
                    <XCircle className="w-3 h-3" /> Not registered — this address cannot receive stealth payments yet
                  </div>
                  <div className="rounded-xl bg-white/[0.025] border border-white/[0.07] p-3 space-y-2">
                    <p className="text-[12px] text-muted-foreground/55">
                      The recipient needs to register their stealth address first. Send them this invite:
                    </p>
                    <button type="button" onClick={copyInviteLink}
                      className="btn-pay btn-pay-ghost w-full py-2">
                      <Copy className="w-3 h-3" /> Copy Invite Message
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div>
          <label className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground/50 font-semibold block mb-1.5">
            Pay Frequency
          </label>
          <div className="flex gap-2">
            {PERIODS.map((p) => (
              <button key={p.seconds} onClick={() => setPeriod(p.seconds)}
                className={`flex-1 py-2 text-[11px] tracking-[0.15em] uppercase rounded-xl border transition-all ${
                  period === p.seconds
                    ? "border-emerald-500/40 text-emerald-400 bg-emerald-500/5"
                    : "border-white/[0.07] text-muted-foreground/50 hover:text-foreground hover:border-white/[0.12]"
                }`}>
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground/50 font-semibold block mb-1.5">
            Duration (days)
          </label>
          <input type="number" value={durationDays} onChange={(e) => setDurationDays(e.target.value)}
            className="pay-input w-full" />
        </div>
      </div>

      {error && <div className="text-[12px] text-red-400">{error}</div>}

      <motion.button onClick={submit} disabled={isPending} whileTap={{ scale: 0.99 }}
        className="btn-pay btn-pay-emerald w-full py-3">
        <Calendar className="w-3.5 h-3.5" />
        {isPending ? "Creating..." : "Create Stream"}
      </motion.button>
    </div>
  );
}
