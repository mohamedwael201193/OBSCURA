/**
 * AuditorGrantPanel — Phase B3 selective disclosure UI.
 *
 * Lets the creator of an invoice grant a third party (accountant,
 * regulator, audit firm) the right to decrypt the encrypted billed and
 * paid amounts of one specific invoice. The grant uses on-chain
 * FHE.allow inside ObscuraInvoice.grantAuditor and is permanent: the
 * UI explains this clearly so the user makes an informed choice.
 *
 * Pattern mirrored from "Share with accountant" flows in QuickBooks /
 * Xero — small modal-style card, explicit consent, success state.
 */
import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { ShieldCheck, Loader2, AlertTriangle, UserPlus, X } from "lucide-react";
import { isAddress } from "viem";
import { useAccount, usePublicClient } from "wagmi";
import { toast } from "sonner";
import { OBSCURA_INVOICE_ADDRESS, OBSCURA_INVOICE_ABI } from "@/config/pay";
import { useUnifiedWrite } from "@/hooks/useUnifiedWrite";

export default function AuditorGrantPanel({
  invoiceId,
  defaultOpen = false,
}: {
  invoiceId: string;
  defaultOpen?: boolean;
}) {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { write } = useUnifiedWrite();

  const [open, setOpen] = useState(defaultOpen);
  const [auditor, setAuditor] = useState("");
  const [busy, setBusy] = useState(false);
  const [list, setList] = useState<string[]>([]);

  const refresh = useCallback(async () => {
    if (!publicClient || !OBSCURA_INVOICE_ADDRESS) return;
    try {
      const res = (await publicClient.readContract({
        address: OBSCURA_INVOICE_ADDRESS,
        abi: OBSCURA_INVOICE_ABI,
        functionName: "getAuditors",
        args: [BigInt(invoiceId)],
      })) as `0x${string}`[];
      setList(res);
    } catch {
      // Older invoices (deployed before B3) won't have this view.
      setList([]);
    }
  }, [publicClient, invoiceId]);

  useEffect(() => {
    if (open) void refresh();
  }, [open, refresh]);

  const grant = async () => {
    if (!isAddress(auditor)) {
      toast.error("Invalid auditor address");
      return;
    }
    if (!address || !OBSCURA_INVOICE_ADDRESS) {
      toast.error("Wallet not connected");
      return;
    }
    setBusy(true);
    try {
      const hash = await write({
        address: OBSCURA_INVOICE_ADDRESS,
        abi: OBSCURA_INVOICE_ABI,
        functionName: "grantAuditor",
        args: [BigInt(invoiceId), auditor as `0x${string}`],
        gas: 300_000n,
        mode: "eoa",
      });
      if (publicClient) await publicClient.waitForTransactionReceipt({ hash });
      toast.success(`Auditor ${auditor.slice(0, 10)}… can view invoice #${invoiceId}`);
      setAuditor("");
      await refresh();
    } catch (err) {
      toast.error((err as Error).message || "Grant failed");
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="btn-pay btn-pay-ghost"
      >
        <ShieldCheck className="w-3.5 h-3.5" />
        Grant auditor view
      </button>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-border bg-card p-4 space-y-3"
    >
      <div className="flex items-start gap-2.5">
        <ShieldCheck className="w-4 h-4 text-foreground mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="font-display text-[13px] font-semibold text-foreground">
            Share with auditor
          </div>
          <p className="text-[11px] text-muted-foreground/65 leading-relaxed mt-0.5">
            Grant a wallet permission to view the billed amount, the cumulative paid amount, and the
            settled flag of invoice #{invoiceId}. Useful for accountants, tax filings, or regulator audits.
          </p>
        </div>
        <button
          onClick={() => setOpen(false)}
          className="text-muted-foreground/40 hover:text-muted-foreground"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={auditor}
          onChange={(e) => setAuditor(e.target.value)}
          placeholder="0x… auditor wallet"
          className="pay-input flex-1 font-mono text-[11.5px]"
          disabled={busy}
        />
        <button
          onClick={grant}
          disabled={busy || !isAddress(auditor)}
          className="btn-pay btn-pay-primary px-4 font-mono text-[11.5px] inline-flex items-center gap-1.5 disabled:opacity-50"
        >
          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
          Grant
        </button>
      </div>

      <div className="flex gap-2 px-3 py-2 rounded-lg bg-amber-500/[0.06] border border-amber-500/25 text-[10.5px] text-amber-200/85 leading-relaxed">
        <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
        Grants are <strong>permanent</strong>. CoFHE FHE.allow cannot be revoked. Only grant access to
        wallets you trust for the lifetime of this invoice.
      </div>

      {list.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground/45 font-mono">
            Auditors granted ({list.length})
          </div>
          {list.map((a) => (
            <div key={a} className="font-mono text-[11px] px-2 py-1.5 rounded hairline bg-card truncate">
              {a}
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
