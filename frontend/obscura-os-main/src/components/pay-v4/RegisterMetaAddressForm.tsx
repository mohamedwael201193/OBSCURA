import { motion } from "framer-motion";
import { Eye, Sparkles } from "lucide-react";
import { useStealthMetaAddress } from "@/hooks/useStealthMetaAddress";
import { toast } from "sonner";

export default function RegisterMetaAddressForm() {
  const { keys, onChainMeta, generateAndPublish, isPending } = useStealthMetaAddress();

  const onClick = async () => {
    try {
      await generateAndPublish();
      toast.success("Meta-address published on-chain");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const trunc = (s?: string) => (s ? `${s.slice(0, 14)}…${s.slice(-6)}` : "—");

  return (
    <div className="glass-panel rounded-sm p-6 space-y-4">
      <div className="flex items-center gap-2">
        <Eye className="w-4 h-4 text-primary" />
        <h3 className="font-display text-sm tracking-wider text-foreground">Your Stealth Address Setup</h3>
        <span className="ml-auto text-[8px] font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-sm border border-cyan-500/20">
          ONE-TIME SETUP
        </span>
      </div>

      <p className="text-[10px] font-mono text-muted-foreground/70">
        Generate a keypair that lets you receive payments at unique hidden addresses.
        The public part is saved on-chain so senders can derive stealth addresses for you.
        The private key stays in your browser — only you can scan and claim incoming payments.
      </p>

      <div className="space-y-2 text-[10px] font-mono">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Local Spending PubKey</span>
          <span className="text-foreground">{trunc(keys?.meta.spendingPubKey)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Local Viewing PubKey</span>
          <span className="text-foreground">{trunc(keys?.meta.viewingPubKey)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">On-Chain Spending</span>
          <span className="text-foreground">{trunc(onChainMeta?.spendingPubKey)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">On-Chain Viewing</span>
          <span className="text-foreground">{trunc(onChainMeta?.viewingPubKey)}</span>
        </div>
      </div>

      <motion.button
        onClick={onClick}
        disabled={isPending}
        whileTap={{ scale: 0.99 }}
        className="w-full py-3 text-xs tracking-[0.2em] uppercase font-mono bg-primary text-primary-foreground rounded-sm hover:bg-primary/90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
      >
        <Sparkles className="w-3.5 h-3.5" />
        {isPending ? "Publishing…" : keys ? "Rotate & Republish" : "Generate & Publish"}
      </motion.button>
    </div>
  );
}
