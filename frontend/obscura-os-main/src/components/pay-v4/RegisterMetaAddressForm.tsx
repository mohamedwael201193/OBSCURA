import { motion } from "framer-motion";
import { Eye, Sparkles, AlertTriangle, Lock } from "lucide-react";
import { useStealthMetaAddress } from "@/hooks/useStealthMetaAddress";
import { toast } from "sonner";

export default function RegisterMetaAddressForm() {
  const { keysMeta, onChainMeta, generateAndPublish, isPending, needsMigration, unlock } = useStealthMetaAddress();

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
    <div className="glass-panel rounded-md p-6 space-y-4">
      <div className="flex items-center gap-2">
        <Eye className="w-4 h-4 text-primary" />
        <h3 className="font-display text-sm tracking-wider text-foreground">Your Stealth Address Setup</h3>
        <span className="ml-auto text-[11px] text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-md border border-cyan-500/20">
          ONE-TIME SETUP
        </span>
      </div>

      <p className="text-sm text-muted-foreground/70">
        Generate a keypair that lets you receive payments at unique hidden addresses.
        The public part is saved on-chain so senders can derive stealth addresses for you.
        The private key stays in your browser — only you can scan and claim incoming payments.
      </p>

      {/* Phase 0.5.4: device-only privkey warning */}
      <div className="rounded-md border border-rose-500/30 bg-rose-500/5 p-3 flex gap-2 items-start">
        <AlertTriangle className="w-4 h-4 text-rose-400 mt-0.5 shrink-0" />
        <div className="text-[12px] leading-relaxed text-rose-100/90">
          <strong className="text-rose-300">Your stealth keys live on this device.</strong>{" "}
          They are encrypted with a wallet-signed key and never leave your browser. If you clear site data, switch browsers,
          or lose this device <em>without first unlocking and exporting</em>, any incoming stealth payments will be
          unrecoverable. Back up your keys after generating.
        </div>
      </div>

      {needsMigration && (
        <button
          onClick={async () => {
            try { await unlock(); toast.success("Keystore upgraded to encrypted storage"); }
            catch (e) { toast.error((e as Error).message); }
          }}
          className="w-full py-2 text-[11px] tracking-[0.18em] uppercase rounded-md border border-amber-500/40 bg-amber-500/10 text-amber-200 hover:bg-amber-500/15 transition-all flex items-center justify-center gap-2"
        >
          <Lock className="w-3.5 h-3.5" />
          Upgrade keystore to encrypted storage
        </button>
      )}

      <div className="space-y-2 text-sm font-mono">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Local Spending PubKey</span>
          <span className="text-foreground">{trunc(keysMeta?.spendingPubKey)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Local Viewing PubKey</span>
          <span className="text-foreground">{trunc(keysMeta?.viewingPubKey)}</span>
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
        className="w-full py-3 text-xs tracking-[0.2em] uppercase bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
      >
        <Sparkles className="w-3.5 h-3.5" />
        {isPending ? "Publishing…" : keysMeta ? "Rotate & Republish" : "Generate & Publish"}
      </motion.button>
    </div>
  );
}
