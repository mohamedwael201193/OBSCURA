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
    <div className="glass-panel rounded-sm p-6 space-y-4">
      <div className="flex items-center gap-2">
        <Repeat className="w-4 h-4 text-primary" />
        <h3 className="font-display text-sm tracking-wider text-foreground">Create Payroll Stream</h3>
        <span className="ml-auto text-[8px] font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-sm border border-cyan-500/20">
          cUSDC · RECURRING
        </span>
      </div>

      <p className="text-[10px] font-mono text-muted-foreground/70">
        Set up automatic encrypted salary payments. Each cycle sends cUSDC to a fresh stealth address
        that only the recipient can claim. The recipient needs to register their stealth meta-address first (Stealth tab).
      </p>

      <div className="space-y-3">
        <div>
          <label className="text-[9px] font-mono text-muted-foreground tracking-[0.15em] uppercase block mb-1.5">
            Recipient Wallet Address
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="0x..."
              value={hint}
              onChange={(e) => setHint(e.target.value)}
              className="flex-1 px-3 py-2 bg-background border border-border/50 rounded-sm text-xs font-mono text-foreground focus:border-primary/40 focus:outline-none"
            />
            {address && (
              <button
                type="button"
                onClick={() => setHint(address)}
                title="Use your own address (self-test)"
                className="px-3 py-2 text-[9px] font-mono text-primary border border-primary/30 rounded-sm hover:bg-primary/10 flex items-center gap-1 whitespace-nowrap"
              >
                <User className="w-3 h-3" /> Me
              </button>
            )}
          </div>

          {/* Live stealth registration status */}
          {hint && /^0x[a-fA-F0-9]{40}$/.test(hint) && (
            <div className="mt-2">
              {recipientStatus === "checking" && (
                <div className="flex items-center gap-2 text-[9px] font-mono text-muted-foreground">
                  <Loader2 className="w-3 h-3 animate-spin" /> Checking stealth registration…
                </div>
              )}
              {recipientStatus === "registered" && (
                <div className="flex items-center gap-2 text-[9px] font-mono text-green-400">
                  <CheckCircle2 className="w-3 h-3" /> Stealth address registered — ready to receive streams
                </div>
              )}
              {recipientStatus === "not-registered" && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-[9px] font-mono text-red-400">
                    <XCircle className="w-3 h-3" /> Not registered — this address cannot receive stealth payments yet
                  </div>
                  <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-sm space-y-2">
                    <p className="text-[9px] font-mono text-amber-400">
                      The recipient needs to register their stealth address first. Send them this invite:
                    </p>
                    <button
                      type="button"
                      onClick={copyInviteLink}
                      className="w-full py-2 text-[9px] font-mono text-amber-400 border border-amber-500/30 rounded-sm hover:bg-amber-500/10 flex items-center justify-center gap-2"
                    >
                      <Copy className="w-3 h-3" /> Copy Invite Message
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div>
          <label className="text-[9px] font-mono text-muted-foreground tracking-[0.15em] uppercase block mb-1.5">
            Pay Frequency
          </label>
          <div className="flex gap-2">
            {PERIODS.map((p) => (
              <button
                key={p.seconds}
                onClick={() => setPeriod(p.seconds)}
                className={`flex-1 py-2 text-[10px] tracking-[0.15em] uppercase font-mono rounded-sm border transition-all ${
                  period === p.seconds
                    ? "border-primary/40 text-primary bg-primary/5"
                    : "border-border/50 text-muted-foreground hover:text-foreground"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-[9px] font-mono text-muted-foreground tracking-[0.15em] uppercase block mb-1.5">
            Duration (days)
          </label>
          <input
            type="number"
            value={durationDays}
            onChange={(e) => setDurationDays(e.target.value)}
            className="w-full px-3 py-2 bg-background border border-border/50 rounded-sm text-xs font-mono text-foreground focus:border-primary/40 focus:outline-none"
          />
        </div>
      </div>

      {error && <div className="text-[10px] font-mono text-destructive">{error}</div>}

      <motion.button
        onClick={submit}
        disabled={isPending}
        whileTap={{ scale: 0.99 }}
        className="w-full py-3 text-xs tracking-[0.2em] uppercase font-mono bg-primary text-primary-foreground rounded-sm hover:bg-primary/90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
      >
        <Calendar className="w-3.5 h-3.5" />
        {isPending ? "Creating..." : "Create Stream"}
      </motion.button>
    </div>
  );
}
