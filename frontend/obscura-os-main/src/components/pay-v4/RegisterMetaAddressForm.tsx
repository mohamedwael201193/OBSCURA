import { useState } from "react";
import { motion } from "framer-motion";
import {
  Sparkles,
  AlertTriangle,
  Lock,
  KeyRound,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";
import { useStealthMetaAddress } from "@/hooks/useStealthMetaAddress";
import { toast } from "sonner";

export default function RegisterMetaAddressForm() {
  const { keysMeta, onChainMeta, generateAndPublish, isPending, needsMigration, unlock } =
    useStealthMetaAddress();
  const [isWorking, setIsWorking] = useState(false);
  const [showRotateConfirm, setShowRotateConfirm] = useState(false);

  const handleSetup = async () => {
    setIsWorking(true);
    try {
      await generateAndPublish();
      toast.success("Private receiving enabled!");
      setShowRotateConfirm(false);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setIsWorking(false);
    }
  };

  const trunc = (s?: string) => (s ? `${s.slice(0, 14)}…${s.slice(-6)}` : "—");
  const busy = isWorking || isPending;

  // ── State A: No local keys, never registered ────────────────────────────
  if (!keysMeta && !onChainMeta) {
    return (
      <div className="space-y-5">
        <div className="flex flex-col items-center text-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-muted hairline flex items-center justify-center">
            <KeyRound className="w-6 h-6 text-foreground/60" />
          </div>
          <div>
            <h3 className="font-display text-lg text-foreground mb-1">Enable private receiving</h3>
            <p className="text-[13px] text-muted-foreground leading-relaxed max-w-sm">
              Generate a stealth receive address so anyone can pay you privately — each payment goes to
              a fresh address with no on-chain link to your wallet.
            </p>
          </div>
        </div>

        <div className="space-y-2">
          {[
            { n: "1", title: "Generate keys in browser",  desc: "Spending + viewing keys — never leave your device." },
            { n: "2", title: "Sign to encrypt your keys", desc: "One MetaMask message-sign to derive an AES key for local storage." },
            { n: "3", title: "Publish your receive address", desc: "Public keys stored on-chain so senders can pay you privately." },
          ].map(({ n, title, desc }) => (
            <div key={n} className="flex gap-3 items-start rounded-xl bg-muted/40 hairline p-3">
              <div className="w-6 h-6 rounded-full bg-muted hairline flex items-center justify-center shrink-0 text-[11px] font-mono text-foreground/60">
                {n}
              </div>
              <div>
                <div className="text-[12px] font-medium text-foreground/85">{title}</div>
                <div className="text-[11px] text-muted-foreground/60 mt-0.5">{desc}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-center pt-1 border-t border-border/60">
          <motion.button
            onClick={() => void handleSetup()}
            disabled={busy}
            whileTap={{ scale: 0.98 }}
            className="btn-pay btn-pay-primary disabled:opacity-50 min-w-[200px]"
          >
            {busy ? (
              <>
                <svg className="animate-spin w-3.5 h-3.5 mr-2 shrink-0" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Setting up…
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                Enable private receiving
              </>
            )}
          </motion.button>
        </div>
      </div>
    );
  }

  // ── State B: On-chain exists but local keys missing (different device / cleared) ──
  if (!keysMeta && onChainMeta) {
    return (
      <div className="space-y-5">
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/[0.05] p-4 flex gap-3 items-start">
          <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
          <div className="text-[12px] leading-relaxed text-foreground/80">
            <strong className="text-foreground/90">Keys not found in this browser.</strong>{" "}
            Your receive address is registered on-chain, but the private keys are missing from this device —
            possibly cleared or set up in a different browser. Generating new keys will update your on-chain
            receive address; payments sent to the old address can only be claimed with the original private keys.
          </div>
        </div>

        <div className="space-y-2">
          {[
            { label: "On-Chain Spending", value: trunc(onChainMeta.spendingPubKey) },
            { label: "On-Chain Viewing",  value: trunc(onChainMeta.viewingPubKey) },
          ].map(({ label, value }) => (
            <div key={label} className="flex justify-between items-center rounded-lg hairline bg-muted/40 py-2 px-3">
              <span className="text-[11px] text-muted-foreground/50">{label}</span>
              <span className="text-[11px] font-mono text-foreground/75">{value}</span>
            </div>
          ))}
        </div>

        {needsMigration && (
          <button
            onClick={async () => {
              try {
                await unlock();
                toast.success("Keystore upgraded");
              } catch (e) {
                toast.error((e as Error).message);
              }
            }}
            className="btn-pay btn-pay-ghost text-amber-500 hover:text-amber-400 border-amber-500/25 w-full"
          >
            <Lock className="w-3.5 h-3.5" />
            Restore & upgrade keystore
          </button>
        )}

        <div className="flex justify-end pt-3 border-t border-border/60">
          <motion.button
            onClick={() => void handleSetup()}
            disabled={busy}
            whileTap={{ scale: 0.99 }}
            className="btn-pay btn-pay-primary disabled:opacity-50"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            {busy ? "Generating…" : "Generate new keys"}
          </motion.button>
        </div>
      </div>
    );
  }

  // ── State C: Local keys exist, not yet published ─────────────────────────
  if (keysMeta && !onChainMeta) {
    return (
      <div className="space-y-5">
        <div className="rounded-xl border border-blue-500/25 bg-blue-500/[0.04] p-4 flex gap-3 items-start">
          <AlertTriangle className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
          <div className="text-[12px] leading-relaxed text-foreground/80">
            Keys are stored locally but not yet published. Senders can't find you until you publish on-chain.
          </div>
        </div>

        <div className="space-y-2">
          {[
            { label: "Local Spending PubKey", value: trunc(keysMeta.spendingPubKey) },
            { label: "Local Viewing PubKey",  value: trunc(keysMeta.viewingPubKey) },
          ].map(({ label, value }) => (
            <div key={label} className="flex justify-between items-center rounded-lg hairline bg-muted/40 py-2 px-3">
              <span className="text-[11px] text-muted-foreground/50">{label}</span>
              <span className="text-[11px] font-mono text-foreground/75">{value}</span>
            </div>
          ))}
        </div>

        <div className="flex justify-end pt-3 border-t border-border/60">
          <motion.button
            onClick={() => void handleSetup()}
            disabled={busy}
            whileTap={{ scale: 0.99 }}
            className="btn-pay btn-pay-primary disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5 mr-1.5" />
            {busy ? "Publishing…" : "Publish to chain"}
          </motion.button>
        </div>
      </div>
    );
  }

  // ── State D: Active — both local and on-chain ────────────────────────────
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-[hsl(var(--success))]/25 bg-[hsl(var(--success))]/[0.04] p-4 flex gap-3 items-center">
        <CheckCircle2 className="w-4 h-4 text-[hsl(var(--success))] shrink-0" />
        <div className="text-[12px] text-foreground/80">
          Private receiving is <strong className="text-foreground/90">active</strong>. Senders can pay you at a
          fresh private address every time — no on-chain link to your wallet.
        </div>
      </div>

      <div className="space-y-2">
        {[
          { label: "Local Spending PubKey", value: trunc(keysMeta!.spendingPubKey) },
          { label: "Local Viewing PubKey",  value: trunc(keysMeta!.viewingPubKey) },
          { label: "On-Chain Spending",      value: trunc(onChainMeta!.spendingPubKey) },
          { label: "On-Chain Viewing",       value: trunc(onChainMeta!.viewingPubKey) },
        ].map(({ label, value }) => (
          <div key={label} className="flex justify-between items-center rounded-lg hairline bg-muted/40 py-2 px-3">
            <span className="text-[11px] text-muted-foreground/50">{label}</span>
            <span className="text-[11px] font-mono text-foreground/75">{value}</span>
          </div>
        ))}
      </div>

      <div className="border-t border-border/60 pt-3">
        {showRotateConfirm ? (
          <div className="space-y-3">
            <div className="rounded-xl border border-amber-500/25 bg-amber-500/[0.04] p-3 text-[11px] text-foreground/75 leading-relaxed">
              <strong>Rotating your keys</strong> generates new spending + viewing keys and publishes them.
              Payments sent to your old receive address will still exist on-chain but can only be claimed
              with the original private keys.
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowRotateConfirm(false)}
                className="btn-pay btn-pay-ghost text-[12px]"
              >
                Cancel
              </button>
              <motion.button
                onClick={() => void handleSetup()}
                disabled={busy}
                whileTap={{ scale: 0.99 }}
                className="btn-pay btn-pay-primary disabled:opacity-50 text-[12px]"
              >
                <RefreshCw className="w-3 h-3 mr-1.5" />
                {busy ? "Rotating…" : "Rotate & republish"}
              </motion.button>
            </div>
          </div>
        ) : (
          <div className="flex justify-end">
            <button
              onClick={() => setShowRotateConfirm(true)}
              className="btn-pay btn-pay-ghost text-[12px] text-muted-foreground hover:text-foreground"
            >
              <RefreshCw className="w-3 h-3 mr-1.5" />
              Rotate keys
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
