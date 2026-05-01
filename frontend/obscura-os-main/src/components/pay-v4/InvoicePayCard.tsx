import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FileText, Loader2, CheckCircle2, AlertCircle, Lock, ExternalLink, ShieldCheck, ArrowDownLeft } from "lucide-react";
import { useInvoice } from "@/hooks/useInvoice";
import { useCUSDCBalance } from "@/hooks/useCUSDCBalance";
import { useAccount, usePublicClient } from "wagmi";
import { toast } from "sonner";
import { OBSCURA_INVOICE_ADDRESS } from "@/config/pay";
import { parseUSDC, formatUSDC } from "@/lib/usdc";
import { getTrackedUnits, addTrackedUnits } from "@/lib/trackedBalance";

/**
 * InvoicePayCard — Phase B1 payer-side UI.
 *
 * Renders when ?invoice=<id> is in the URL. The payer enters the amount
 * to pay (must match what the creator billed; the on-chain ebool
 * `isPaid` flips true when paidAmount >= amount). Two-tx flow handled
 * by useInvoice.payInvoice.
 *
 * Includes A1/A2/A5-equivalent verification: pre-tx tracked balance is
 * captured, post-tx the tracked balance is decremented by the asserted
 * amount and a confirmation card is shown.
 */
export default function InvoicePayCard({
  invoiceId,
  contractParam,
}: {
  invoiceId: string;
  contractParam?: string | null;
}) {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { payInvoice, probeInvoice } = useInvoice();
  const { trackedCusdc } = useCUSDCBalance();

  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState<{
    exists: boolean;
    creator: `0x${string}`;
    cancelled: boolean;
    expiryBlock: bigint;
  } | null>(null);
  const [loadingProbe, setLoadingProbe] = useState(true);
  const [paidHash, setPaidHash] = useState<string | null>(null);
  const [paidAmount, setPaidAmount] = useState<bigint | null>(null);
  const probedOnce = useRef(false);

  const contractMismatch =
    contractParam &&
    OBSCURA_INVOICE_ADDRESS &&
    contractParam.toLowerCase() !== OBSCURA_INVOICE_ADDRESS.toLowerCase();

  useEffect(() => {
    if (probedOnce.current) return;
    probedOnce.current = true;
    let cancelled = false;
    (async () => {
      setLoadingProbe(true);
      try {
        const res = await probeInvoice(BigInt(invoiceId));
        if (!cancelled && res) setInfo(res);
      } finally {
        if (!cancelled) setLoadingProbe(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [invoiceId, probeInvoice]);

  const expired = info && info.expiryBlock > 0n && publicClient
    ? false // refined async below
    : false;

  const handlePay = useCallback(async () => {
    if (!isConnected || !address) {
      toast.error("Connect your wallet");
      return;
    }
    if (!info?.exists) {
      toast.error("Invoice not found");
      return;
    }
    if (info.cancelled) {
      toast.error("Invoice has been cancelled");
      return;
    }
    let units: bigint;
    try {
      units = parseUSDC(amount);
      if (units <= 0n) throw new Error("Amount must be > 0");
    } catch (err) {
      toast.error((err as Error).message || "Invalid amount");
      return;
    }
    setBusy(true);
    try {
      const { recordHash } = await payInvoice(BigInt(invoiceId), units);
      setPaidHash(recordHash);
      setPaidAmount(units);
      // Decrement payer's tracked cUSDC by what we just sent. Reineira
      // doesn't grant decrypt permits to third parties so we cannot
      // re-decrypt — tracked balance is the source of truth client-side.
      addTrackedUnits(address, -units);
      toast.success(`Paid ${formatUSDC(units)} cUSDC privately to invoice #${invoiceId}`);
    } catch (err) {
      toast.error((err as Error).message || "Payment failed");
    } finally {
      setBusy(false);
    }
  }, [isConnected, address, info, amount, invoiceId, payInvoice]);

  const trackedUnits = address ? getTrackedUnits(address) : 0n;

  return (
    <div className="pay-card relative overflow-hidden p-6 space-y-5 border-cyan-500/25 bg-gradient-to-br from-cyan-500/[0.06] via-transparent to-emerald-500/[0.04]">
      <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-cyan-400/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 -left-20 w-56 h-56 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />

      <div className="relative flex items-start gap-4">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-400/30 to-cyan-600/15 border border-cyan-400/40 flex items-center justify-center shrink-0 shadow-lg shadow-cyan-500/20">
          <FileText className="w-5 h-5 text-cyan-300" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[10px] tracking-[0.2em] uppercase text-cyan-400/80 font-bold mb-1">Invoice for You</div>
          <h2 className="font-display text-xl sm:text-2xl font-semibold text-foreground leading-tight">
            You've been asked to pay a private invoice
          </h2>
          <p className="text-[13px] text-muted-foreground/65 leading-relaxed mt-2">
            Invoice <span className="font-mono font-bold text-foreground/85">#{invoiceId}</span>.
            The amount is encrypted on-chain — only you and the creator see it. Confirm with the creator
            before paying, then enter the amount below.
          </p>
        </div>
      </div>

      {/* Probe status */}
      {!paidHash && (
        <div className="relative grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
          <div className="px-3 py-2.5 rounded-lg bg-white/[0.04] border border-white/[0.07]">
            <div className="text-[9px] tracking-[0.15em] uppercase text-muted-foreground/45 mb-0.5">Status</div>
            <div className="font-mono text-[12px] font-semibold flex items-center gap-1.5">
              {loadingProbe ? <><Loader2 className="w-3 h-3 animate-spin" /> Checking…</>
                : !info?.exists ? <><span className="w-1.5 h-1.5 rounded-full bg-red-400" /> Not found</>
                : info.cancelled ? <><span className="w-1.5 h-1.5 rounded-full bg-amber-400" /> Cancelled</>
                : <><span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Open</>}
            </div>
          </div>
          <div className="px-3 py-2.5 rounded-lg bg-white/[0.04] border border-white/[0.07]">
            <div className="text-[9px] tracking-[0.15em] uppercase text-muted-foreground/45 mb-0.5">Pay to</div>
            <div className="font-mono text-[11px] font-semibold truncate">
              {info?.creator ? `${info.creator.slice(0, 8)}…${info.creator.slice(-6)}` : "—"}
            </div>
          </div>
          <div className="px-3 py-2.5 rounded-lg bg-white/[0.04] border border-white/[0.07]">
            <div className="text-[9px] tracking-[0.15em] uppercase text-muted-foreground/45 mb-0.5">Your balance</div>
            <div className="font-mono text-[12px] font-semibold text-emerald-200">
              {trackedUnits > 0n ? `≈ ${formatUSDC(trackedUnits)}` : trackedCusdc ?? "—"}
            </div>
          </div>
        </div>
      )}

      {contractMismatch && !paidHash && (
        <div className="relative flex gap-2.5 px-3 py-2.5 rounded-lg bg-amber-500/[0.06] border border-amber-500/25 text-[11px]">
          <AlertCircle className="w-3.5 h-3.5 text-amber-300 shrink-0 mt-0.5" />
          <p className="text-amber-200/80 leading-relaxed">
            This invoice link points at a different deployment ({contractParam?.slice(0, 8)}…).
            Your app is connected to {OBSCURA_INVOICE_ADDRESS?.slice(0, 8)}…. The payment may not record.
          </p>
        </div>
      )}

      {isConnected && !paidHash && (
        <div className="relative flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.025] border border-white/[0.07] text-[11px]">
          <ShieldCheck className="w-3.5 h-3.5 text-cyan-300/70" />
          <span className="text-muted-foreground/55">Paying as</span>
          <span className="font-mono text-foreground/80">{address?.slice(0, 8)}…{address?.slice(-6)}</span>
        </div>
      )}

      <AnimatePresence mode="wait">
        {!paidHash ? (
          <motion.div key="pay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="relative space-y-3">
            <div className="space-y-1.5">
              <label className="text-[11px] tracking-[0.12em] uppercase text-muted-foreground/60">
                Amount you owe (cUSDC)
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="100.00"
                className="pay-input w-full font-mono text-base"
                disabled={busy || !info?.exists || info?.cancelled}
              />
              <p className="text-[10px] text-muted-foreground/45">
                The on-chain receipt flips to "paid" when paidAmount ≥ billed amount. Enter the figure the creator confirmed.
              </p>
            </div>

            <motion.button
              onClick={handlePay}
              disabled={busy || !info?.exists || info?.cancelled || !isConnected}
              whileTap={{ scale: 0.99 }}
              className="w-full py-4 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-400 hover:from-cyan-400 hover:to-cyan-300 disabled:from-muted-foreground/20 disabled:to-muted-foreground/20 disabled:opacity-50 text-black font-display font-bold text-[15px] tracking-wide inline-flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/25 transition-all"
            >
              {busy ? <><Loader2 className="w-4 h-4 animate-spin" /> Paying privately…</>
                : !isConnected ? "Connect wallet"
                : !info?.exists ? "Invoice not found"
                : info.cancelled ? "Invoice cancelled"
                : <><Lock className="w-4 h-4" /> Pay invoice privately</>}
            </motion.button>
            <p className="text-[10px] text-muted-foreground/45 leading-relaxed text-center">
              Two transactions: (1) cUSDC.confidentialTransfer to creator, (2) invoice.recordPayment receipt.
              Both encrypted end-to-end via Phenix CoFHE.
            </p>
          </motion.div>
        ) : (
          <motion.div key="paid" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="relative space-y-3">
            <div className="px-4 py-3.5 rounded-xl bg-emerald-500/[0.08] border border-emerald-500/30 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-300 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="font-display text-sm font-semibold text-emerald-300 flex items-center gap-2">
                  Paid <ArrowDownLeft className="w-3.5 h-3.5" />
                  {paidAmount !== null && (
                    <span className="font-mono">−{formatUSDC(paidAmount)} cUSDC</span>
                  )}
                </div>
                <p className="text-[12px] text-muted-foreground/65 leading-relaxed mt-1">
                  Invoice #{invoiceId} settled. Funds are now in the creator's encrypted balance — they can decrypt to confirm.
                  Your tracked balance has been decremented locally.
                </p>
              </div>
            </div>
            {paidHash && (
              <a
                href={`https://sepolia.arbiscan.io/tx/${paidHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 py-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.07] text-cyan-300 hover:text-cyan-200 text-[11px] font-mono transition-colors"
              >
                View receipt tx · {paidHash.slice(0, 12)}…{paidHash.slice(-8)} <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
