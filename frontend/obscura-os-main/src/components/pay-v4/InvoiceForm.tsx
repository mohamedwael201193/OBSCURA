import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { FileText, Loader2, Copy, Check, Lock, Calendar, ExternalLink } from "lucide-react";
import { useInvoice } from "@/hooks/useInvoice";
import { useAccount, usePublicClient } from "wagmi";
import { toast } from "sonner";
import { parseUSDC } from "@/lib/usdc";
import { OBSCURA_INVOICE_ADDRESS } from "@/config/pay";
import AuditorGrantPanel from "./AuditorGrantPanel";

const ARB_BLOCKS_PER_DAY = 7200n;
type ExpiryOption = "0" | "7" | "30" | "90";

/**
 * InvoiceForm — Phase B1 UI.
 *
 * Lets the user (the recipient of funds) publish a confidential invoice.
 * On success, copies a `?invoice=<id>` link to the clipboard so they can
 * share it with the payer.
 */
export default function InvoiceForm() {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { createInvoice } = useInvoice();

  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");
  const [expiry, setExpiry] = useState<ExpiryOption>("30");
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<{ id: string; link: string; hash: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const amountValid = useMemo(() => {
    try {
      const v = parseUSDC(amount);
      return v > 0n;
    } catch {
      return false;
    }
  }, [amount]);

  const handleCreate = async () => {
    if (!isConnected || !address) {
      toast.error("Connect wallet first");
      return;
    }
    if (!amountValid) {
      toast.error("Enter a valid amount");
      return;
    }
    setBusy(true);
    try {
      // Resolve expiry block: current + days * blocksPerDay (Arbitrum ≈ 7200).
      let expiryBlock = 0n;
      if (expiry !== "0" && publicClient) {
        const cur = await publicClient.getBlockNumber();
        expiryBlock = cur + BigInt(parseInt(expiry, 10)) * ARB_BLOCKS_PER_DAY;
      }
      const { invoiceId, hash } = await createInvoice(parseUSDC(amount), memo.trim(), expiryBlock);
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const link = `${origin}/pay?tab=escrow&invoice=${invoiceId}&contract=${OBSCURA_INVOICE_ADDRESS}`;
      setCreated({ id: invoiceId, link, hash });
      toast.success(`Invoice #${invoiceId} created. Link copied to clipboard.`);
      try { await navigator.clipboard.writeText(link); setCopied(true); } catch { /* ignore */ }
      setAmount("");
      setMemo("");
    } catch (err) {
      toast.error((err as Error).message || "Invoice creation failed");
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    if (!created) return;
    try {
      await navigator.clipboard.writeText(created.link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch { /* ignore */ }
  };

  return (
    <div className="pay-card p-5 space-y-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center shrink-0">
          <FileText className="w-4 h-4 text-cyan-300" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-display text-[15px] font-semibold text-foreground">Request a private payment</div>
          <p className="text-[12px] text-muted-foreground/70 mt-0.5 leading-relaxed">
            Publish an encrypted invoice. Share the link — only the billed amount is encrypted on-chain.
          </p>
        </div>
      </div>

      {/* Amount */}
      <div className="space-y-1.5">
        <label className="text-[11px] tracking-[0.12em] uppercase text-muted-foreground/60">Amount (cUSDC)</label>
        <div className="relative">
          <input
            type="text"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="100.00"
            className="pay-input w-full pr-16 font-mono"
            disabled={busy}
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] tracking-[0.18em] text-emerald-300/60 font-mono">cUSDC</span>
        </div>
      </div>

      {/* Memo */}
      <div className="space-y-1.5">
        <label className="text-[11px] tracking-[0.12em] uppercase text-muted-foreground/60">Memo (optional)</label>
        <input
          type="text"
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          placeholder="Invoice 2026-04 — services"
          className="pay-input w-full"
          disabled={busy}
        />
        <p className="text-[10px] text-muted-foreground/40">
          Stored as keccak256 hash on-chain. The plaintext memo stays in your browser only.
        </p>
      </div>

      {/* Expiry */}
      <div className="space-y-1.5">
        <label className="text-[11px] tracking-[0.12em] uppercase text-muted-foreground/60 flex items-center gap-1.5">
          <Calendar className="w-3 h-3" /> Expiry
        </label>
        <div className="grid grid-cols-4 gap-1.5">
          {(["0", "7", "30", "90"] as ExpiryOption[]).map((opt) => (
            <button
              key={opt}
              onClick={() => setExpiry(opt)}
              disabled={busy}
              className={`py-2 rounded-lg text-[11px] font-mono border transition-colors ${
                expiry === opt
                  ? "bg-cyan-500/15 border-cyan-500/40 text-cyan-200"
                  : "bg-white/[0.025] border-white/[0.06] text-muted-foreground/70 hover:border-white/[0.12]"
              }`}
            >
              {opt === "0" ? "No expiry" : `${opt}d`}
            </button>
          ))}
        </div>
      </div>

      <motion.button
        onClick={handleCreate}
        disabled={busy || !amountValid || !isConnected}
        whileTap={{ scale: 0.99 }}
        className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-400 text-black font-display font-semibold text-[13px] inline-flex items-center justify-center gap-2 disabled:opacity-50 disabled:from-muted-foreground/20 disabled:to-muted-foreground/20"
      >
        {busy ? <><Loader2 className="w-4 h-4 animate-spin" /> Encrypting + publishing…</>
          : !isConnected ? "Connect wallet"
          : <><Lock className="w-3.5 h-3.5" /> Create encrypted invoice</>}
      </motion.button>

      {created && (
        <div className="rounded-xl bg-emerald-500/[0.07] border border-emerald-500/25 p-4 space-y-2">
          <div className="font-display text-[13px] font-semibold text-emerald-200">
            Invoice #{created.id} published
          </div>
          <p className="text-[11px] text-muted-foreground/65">
            Share this link with the payer. They click, connect, pay — funds settle directly to your encrypted balance.
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 truncate text-[11px] font-mono px-2 py-1.5 rounded bg-black/20 text-emerald-200/80">
              {created.link}
            </code>
            <button
              onClick={copy}
              className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-mono text-[11px] inline-flex items-center gap-1"
            >
              {copied ? <><Check className="w-3 h-3" /> Copied</> : <><Copy className="w-3 h-3" /> Copy</>}
            </button>
          </div>
          <a
            href={`https://sepolia.arbiscan.io/tx/${created.hash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[10.5px] font-mono text-cyan-300 hover:text-cyan-200"
          >
            View tx <ExternalLink className="w-3 h-3" />
          </a>
          {/* Phase B3: optional auditor grant */}
          <AuditorGrantPanel invoiceId={created.id} />
        </div>
      )}
    </div>
  );
}
