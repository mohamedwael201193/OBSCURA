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
    <div className="pay-card p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-700/10 border border-emerald-500/25 flex items-center justify-center shrink-0">
          <Eye className="w-4 h-4 text-emerald-400" />
        </div>
        <div className="min-w-0">
          <h3 className="font-display text-sm font-semibold text-foreground leading-tight">Your Stealth Address Setup</h3>
          <p className="text-[10px] text-muted-foreground/45 tracking-widest mt-0.5 uppercase">One-Time Setup</p>
        </div>
        <span className="ml-auto shrink-0 pay-badge pay-badge-emerald">STEALTH</span>
      </div>

      <p className="text-[12px] text-muted-foreground/55 leading-relaxed">
        Generate a keypair that lets you receive payments at unique hidden addresses.
        The public part is saved on-chain so senders can derive stealth addresses for you.
        The private key stays in your browser — only you can scan and claim incoming payments.
      </p>

      {/* Device-only privkey warning */}
      <div className="rounded-xl border border-red-500/25 bg-red-500/[0.05] p-4 flex gap-3 items-start">
        <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
        <div className="text-[12px] leading-relaxed text-red-100/85">
          <strong className="text-red-300">Your stealth keys live on this device.</strong>{" "}
          They are encrypted with a wallet-signed key and never leave your browser. If you clear site data, switch browsers,
          or lose this device <em>without first unlocking and exporting</em>, any incoming stealth payments will be
          unrecoverable. Back up your keys after generating.
        </div>
      </div>

      {needsMigration && (
        <button onClick={async () => {
            try { await unlock(); toast.success("Keystore upgraded to encrypted storage"); }
            catch (e) { toast.error((e as Error).message); }
          }}
          className="btn-pay btn-pay-ghost w-full py-2.5 text-amber-400 hover:text-amber-300 border-amber-500/25">
          <Lock className="w-3.5 h-3.5" />
          Upgrade keystore to encrypted storage
        </button>
      )}

      <div className="space-y-2.5">
        {[
          { label: "Local Spending PubKey", value: trunc(keysMeta?.spendingPubKey) },
          { label: "Local Viewing PubKey",  value: trunc(keysMeta?.viewingPubKey) },
          { label: "On-Chain Spending",      value: trunc(onChainMeta?.spendingPubKey) },
          { label: "On-Chain Viewing",       value: trunc(onChainMeta?.viewingPubKey) },
        ].map(({ label, value }) => (
          <div key={label} className="flex justify-between items-center py-2 px-3 rounded-lg bg-white/[0.025] border border-white/[0.07]">
            <span className="text-[11px] text-muted-foreground/50">{label}</span>
            <span className="text-[11px] font-mono text-foreground/75">{value}</span>
          </div>
        ))}
      </div>

      <motion.button onClick={onClick} disabled={isPending} whileTap={{ scale: 0.99 }}
        className="btn-pay btn-pay-emerald w-full py-3">
        <Sparkles className="w-3.5 h-3.5" />
        {isPending ? "Publishing…" : keysMeta ? "Rotate & Republish" : "Generate & Publish"}
      </motion.button>
    </div>
  );
}
