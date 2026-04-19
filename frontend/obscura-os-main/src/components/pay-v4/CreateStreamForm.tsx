import { useState } from "react";
import { motion } from "framer-motion";
import { Repeat, Calendar } from "lucide-react";
import { useCreateStream } from "@/hooks/useCreateStream";
import { toast } from "sonner";

const PERIODS = [
  { label: "Daily", seconds: 86_400 },
  { label: "Weekly", seconds: 604_800 },
  { label: "Bi-Weekly", seconds: 1_209_600 },
  { label: "Monthly", seconds: 2_592_000 },
];

export default function CreateStreamForm() {
  const [hint, setHint] = useState("");
  const [period, setPeriod] = useState(PERIODS[1].seconds);
  const [durationDays, setDurationDays] = useState("90");
  const { create, isPending, error } = useCreateStream();

  const submit = async () => {
    if (!/^0x[a-fA-F0-9]{40}$/.test(hint)) {
      toast.error("Invalid recipient hint address");
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
      toast.success("Stream created");
      setHint("");
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
          <input
            type="text"
            placeholder="0x..."
            value={hint}
            onChange={(e) => setHint(e.target.value)}
            className="w-full px-3 py-2 bg-background border border-border/50 rounded-sm text-xs font-mono text-foreground focus:border-primary/40 focus:outline-none"
          />
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
