import { useState, useMemo, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Unlock, AlertTriangle, Info, RefreshCcw, Search,
  ChevronDown, CheckCircle2, Clock, ExternalLink, ArrowRight,
} from "lucide-react";
import { useOcUSDCEscrow } from "@/hooks/useOcUSDCEscrow";
import type { SavedEscrow } from "@/hooks/useOcUSDCEscrow";
import AsyncStepper from "@/components/shared/AsyncStepper";
import { toast } from "sonner";
import { parseUnits, formatUnits } from "viem";
import { useAccount, usePublicClient } from "wagmi";
import { addTrackedUnits } from "@/lib/trackedBalance";
import { getJSON } from "@/lib/scopedStorage";
import { OBSCURA_CONFIDENTIAL_ESCROW_ADDRESS } from "@/config/pay";

const STORAGE_KEY = "obscura_cusdc_escrows";
function loadSavedEscrows(addr: `0x${string}` | undefined): SavedEscrow[] {
  return getJSON<SavedEscrow[]>(STORAGE_KEY, addr, []);
}

export default function OcUSDCEscrowActions() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const [escrowId, setEscrowId] = useState("");
  const [fundAmount, setFundAmount] = useState("");
  const [lookupStatus, setLookupStatus] = useState<
    "idle" | "loading" | "found" | "not-found" | "error"
  >("idle");
  const [expiryInfo, setExpiryInfo] = useState<{ block: bigint; current: bigint } | null>(null);
  const [fundOpen, setFundOpen] = useState(false);
  const [redeemDone, setRedeemDone] = useState(false);

  const { fund, redeem, refund, checkExists, getExpiryBlock, txHash, isTxPending, status, stepIndex } =
    useOcUSDCEscrow();

  const isProcessing = status !== "idle" && status !== "ready" && status !== "error";

  // Auto-fill from claim link: ?tab=escrow&claim=<id>&contract=<addr>
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const params = new URLSearchParams(window.location.search);
      const claim = params.get("claim");
      if (claim && /^\d+$/.test(claim)) {
        setEscrowId(claim);
        toast.message(
          `Claim link detected — escrow #${claim} loaded. Click "Claim Escrow" to receive your ocUSDC.`,
          { duration: 7000 }
        );
      }
    } catch { /* ignore */ }
  }, []);

  // Cross-reference with localStorage for the CURRENT contract only.
  const savedEscrow = useMemo(() => {
    if (!escrowId) return null;
    const target = OBSCURA_CONFIDENTIAL_ESCROW_ADDRESS?.toLowerCase();
    return (
      loadSavedEscrows(address).find(
        (e) =>
          e.escrowId === escrowId &&
          (!target || e.contract?.toLowerCase() === target)
      ) ?? null
    );
  }, [escrowId, address]);

  const isRecipientMatch =
    savedEscrow && address
      ? savedEscrow.recipient.toLowerCase() === address.toLowerCase()
      : null;

  const isCreatorMatch =
    savedEscrow && address
      ? savedEscrow.recipient.toLowerCase() !== address.toLowerCase()
      : false;

  // Non-blocking on-chain lookup — shows info but never prevents redeem.
  const handleLookup = useCallback(async () => {
    if (!escrowId) return;
    setLookupStatus("loading");
    setExpiryInfo(null);
    try {
      const exists = await checkExists(BigInt(escrowId));
      if (exists) {
        setLookupStatus("found");
        try {
          const block = await getExpiryBlock(BigInt(escrowId));
          const current = publicClient ? await publicClient.getBlockNumber() : 0n;
          setExpiryInfo({ block, current });
        } catch { /* expiry optional */ }
      } else {
        setLookupStatus("not-found");
      }
    } catch {
      setLookupStatus("error");
    }
  }, [escrowId, checkExists, getExpiryBlock, publicClient]);

  const handleRedeem = async () => {
    if (!escrowId) {
      toast.error("Enter an escrow ID first");
      return;
    }
    setRedeemDone(false);
    try {
      await redeem(BigInt(escrowId));
      setRedeemDone(true);
      if (savedEscrow && address && isRecipientMatch) {
        addTrackedUnits(address, BigInt(savedEscrow.amount));
        const displayAmt = formatUnits(BigInt(savedEscrow.amount), 6);
        toast.success(
          `Escrow #${escrowId} redeemed — ${displayAmt} ocUSDC received! ` +
            `Go to Dashboard → click REVEAL for your exact on-chain balance. ` +
            `(Arbiscan shows 0.0001 pUSDC — that is a privacy placeholder.)`,
          { duration: 12000 }
        );
      } else {
        toast.success(
          `Escrow #${escrowId} redeemed! Go to Dashboard → click REVEAL to see your updated ocUSDC balance.`,
          { duration: 10000 }
        );
      }
    } catch (err) {
      toast.error((err as Error).message || "Redeem failed");
    }
  };

  const handleFund = async () => {
    if (!escrowId || !fundAmount || Number(fundAmount) <= 0) {
      toast.error("Enter escrow ID and amount");
      return;
    }
    try {
      await fund(BigInt(escrowId), parseUnits(fundAmount, 6));
      toast.success("Escrow topped up with encrypted ocUSDC");
      setFundAmount("");
    } catch (err) {
      toast.error((err as Error).message || "Fund failed");
    }
  };

  const handleRefund = async () => {
    if (!escrowId) {
      toast.error("Enter escrow ID");
      return;
    }
    try {
      await refund(BigInt(escrowId));
      toast.success(`Escrow #${escrowId} refunded — ocUSDC returned to creator.`, { duration: 8000 });
    } catch (err) {
      toast.error((err as Error).message || "Refund failed");
    }
  };

  const isExpired =
    expiryInfo && expiryInfo.block > 0n && expiryInfo.current >= expiryInfo.block;

  return (
    <div className="space-y-5">
      {/* ── Header ── */}
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-muted hairline">
          <Unlock className="w-4 h-4 text-foreground" />
        </div>
        <div className="min-w-0">
          <h3 className="font-display text-lg text-foreground leading-tight">
            Claim / Redeem Escrow
          </h3>
          <p className="text-[10px] text-muted-foreground/45 tracking-widest mt-0.5 uppercase">
            Receive · ocUSDC
          </p>
        </div>
        <span className="ml-auto shrink-0 inline-flex items-center gap-1.5 rounded-full bg-muted border border-border px-2 py-0.5 text-[10.5px] font-medium text-foreground/75">ocUSDC</span>
      </div>

      <p className="text-sm text-muted-foreground leading-relaxed">
        Enter the escrow ID you received. The contract privately verifies your access — no
        information is revealed to observers whether you succeed or fail.
      </p>

      {/* ── Escrow ID input ── */}
      <div className="space-y-2">
        <label className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground/50 font-semibold">
          Escrow ID
        </label>
        <div className="flex gap-2">
          <input
            type="number"
            min={0}
            placeholder="e.g. 6"
            value={escrowId}
            onChange={(e) => {
              setEscrowId(e.target.value);
              setLookupStatus("idle");
              setExpiryInfo(null);
            }}
            className="pay-input flex-1 font-mono text-base"
          />
          <motion.button
            onClick={handleLookup}
            disabled={!escrowId || lookupStatus === "loading"}
            whileTap={{ scale: 0.97 }}
            className="btn-pay btn-pay-ghost px-4 disabled:opacity-30 shrink-0 gap-1.5"
          >
            {lookupStatus === "loading" ? (
              <span className="w-3.5 h-3.5 rounded-full border-2 border-muted-foreground/30 border-t-foreground animate-spin inline-block" />
            ) : (
              <Search className="w-3.5 h-3.5" />
            )}
            Lookup
          </motion.button>
        </div>

        {/* Lookup result — informational only, never blocks redeem */}
        <AnimatePresence>
          {lookupStatus !== "idle" && lookupStatus !== "loading" && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div
                className={`flex items-start gap-2 text-[12px] px-3 py-2.5 rounded-lg border ${
                  lookupStatus === "found"
                    ? "bg-muted/40 border-border text-foreground/80"
                    : lookupStatus === "not-found"
                    ? "bg-amber-500/[0.06] border-amber-500/25 text-amber-300/80"
                    : "bg-muted/40 border-border text-muted-foreground/55"
                }`}
              >
                {lookupStatus === "found" && (
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                )}
                {lookupStatus === "not-found" && (
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                )}
                {lookupStatus === "error" && (
                  <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                )}
                <span className="leading-relaxed">
                  {lookupStatus === "found" && (
                    <>
                      Escrow #{escrowId} found on-chain.
                      {expiryInfo && expiryInfo.block > 0n && (
                        <span className="ml-1 text-muted-foreground/60">
                          {isExpired ? (
                            <span className="text-amber-300">Expiry passed — refundable.</span>
                          ) : (
                            <>
                              Expires in ~
                              {Math.max(
                                1,
                                Math.round(
                                  (Number(expiryInfo.block - expiryInfo.current) * 0.25) / 86400
                                )
                              )}
                              d.
                            </>
                          )}
                        </span>
                      )}
                    </>
                  )}
                  {lookupStatus === "not-found" &&
                    "ID not found on current contract. Double-check the number. You can still try claiming below — a wrong ID safely returns 0 with no fund loss."}
                  {lookupStatus === "error" &&
                    "Lookup failed (network issue). You can still claim — the contract is the source of truth."}
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Redeem / Claim — primary action, always visible ── */}
        <div className="rounded-xl bg-card border border-border p-4 space-y-3">
        <div className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground/50 font-semibold">
          Claim / Redeem
        </div>

        {/* Contextual guidance based on localStorage state */}
        {isRecipientMatch === true && (
          <div className="flex items-center gap-2 p-2.5 bg-muted/50 border border-border rounded-lg">
            <span className="w-1.5 h-1.5 rounded-full bg-foreground/60 shrink-0" />
            <p className="text-[11px] text-foreground/80">
              Your wallet matches the recipient for escrow #{escrowId} — ready to claim.
            </p>
          </div>
        )}
        {isCreatorMatch && (
          <div className="flex items-start gap-2 p-2.5 bg-blue-500/[0.06] border border-blue-500/20 rounded-lg">
            <Info className="w-3 h-3 text-blue-400 mt-0.5 shrink-0" />
            <p className="text-[11px] text-blue-300/80 leading-relaxed">
              You created this escrow. The recipient is{" "}
              <span className="font-mono text-blue-200">
                {savedEscrow?.recipient.slice(0, 8)}…
              </span>
              . Redeeming from the creator wallet returns 0 (the contract verifies the
              encrypted recipient).
            </p>
          </div>
        )}
        {isRecipientMatch === null && (
          <div className="flex items-start gap-2 p-2.5 bg-white/[0.03] border border-white/[0.08] rounded-lg">
            <Info className="w-3 h-3 text-muted-foreground/50 mt-0.5 shrink-0" />
            <p className="text-sm text-muted-foreground leading-relaxed">
              No local record for this ID — that&apos;s normal when you&apos;re the recipient on
              a different device. Enter the ID and click Claim. The contract privately
              verifies your access.
              {address && (
                <span className="block mt-1 text-muted-foreground/40 font-mono text-[10px]">
                  Connected: {address.slice(0, 6)}…{address.slice(-4)}
                </span>
              )}
            </p>
          </div>
        )}

        <motion.button
          onClick={handleRedeem}
          disabled={isProcessing || isTxPending || !escrowId}
          whileTap={{ scale: 0.98 }}
          className="btn-pay btn-pay-primary disabled:opacity-50"
        >
          <Unlock className="w-3.5 h-3.5" />
          {isProcessing || isTxPending
            ? "Processing…"
            : escrowId
            ? `Claim escrow #${escrowId}`
            : "Enter an escrow ID above"}
        </motion.button>

        <p className="text-[11px] text-muted-foreground/35 leading-relaxed">
          Silent-failure: if this wallet is not the encrypted recipient the tx succeeds but
          transfers 0 ocUSDC. Arbiscan shows <b>0.0001 pUSDC</b> — privacy placeholder; click
          REVEAL on Dashboard for the real balance.
        </p>
      </div>

      {/* ── Top-up section (collapsed by default — senders only) ── */}
      <div className="rounded-xl border border-white/[0.06] overflow-hidden">
        <button
          type="button"
          onClick={() => setFundOpen((v) => !v)}
          className="flex items-center justify-between w-full px-4 py-3 text-left hover:bg-muted/40 transition-colors"
        >
          <span className="text-[11px] text-muted-foreground/55 font-medium">
            Top-up escrow (optional · for senders only)
          </span>
          <ChevronDown
            className={`w-3.5 h-3.5 text-muted-foreground/40 transition-transform duration-200 ${
              fundOpen ? "rotate-180" : ""
            }`}
          />
        </button>
        <AnimatePresence initial={false}>
          {fundOpen && (
            <motion.div
              key="fund-panel"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-4 pt-1 space-y-3">
                <p className="text-[11px] text-muted-foreground/45">
                  Add more ocUSDC to an already-funded escrow. New escrows are auto-funded at
                  creation — this is only for top-ups by the original sender.
                </p>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min={0}
                    placeholder="Amount (ocUSDC)"
                    value={fundAmount}
                    onChange={(e) => setFundAmount(e.target.value)}
                    className="pay-input flex-1 font-mono"
                  />
                  <motion.button
                    onClick={handleFund}
                    disabled={isProcessing || isTxPending || !escrowId || !fundAmount}
                    whileTap={{ scale: 0.98 }}
                    className="btn-pay btn-pay-ghost px-5 text-foreground border-emerald-500/25 disabled:opacity-40"
                  >
                    Fund
                  </motion.button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Refund — only shown after lookup confirms expiry ── */}
      {isExpired && (
        <div className="rounded-xl bg-amber-500/[0.04] border border-amber-500/20 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <div className="text-[10px] tracking-[0.15em] uppercase text-amber-300/80 font-semibold">
              Refund Available (Expired)
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground/55 leading-relaxed">
            This escrow&apos;s auto-refund window has passed. Anyone can push the ocUSDC back to
            the original creator.
          </p>
          <motion.button
            onClick={handleRefund}
            disabled={isProcessing || isTxPending}
            whileTap={{ scale: 0.98 }}
            className="btn-pay btn-pay-ghost text-amber-300 hover:text-amber-200 border-amber-500/30 px-4 py-2 disabled:opacity-50"
          >
            <RefreshCcw className="w-3.5 h-3.5" /> Refund to Creator
          </motion.button>
        </div>
      )}

      {/* ── Claim success panel ── */}
      {redeemDone && txHash && (
        <div className="rounded-xl bg-card border border-border p-4 space-y-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-foreground shrink-0" />
            <span className="text-sm font-semibold text-foreground">Claimed!</span>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Your ocUSDC was privately transferred. Arbiscan will show{" "}
            <strong className="text-foreground/75">0.0001 pUSDC</strong> — that is a privacy
            placeholder. Your real encrypted balance lives on-chain. Go to{" "}
            <strong className="text-foreground/75">Dashboard</strong> and click{" "}
            <strong className="text-foreground/75">REVEAL</strong> to decrypt it.
          </p>
          <div className="flex justify-end">
            <a
              href="/dashboard"
              className="btn-pay btn-pay-primary text-xs inline-flex items-center gap-1.5"
            >
              Go to Dashboard &amp; reveal <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      )}

      {/* ── FHE step stepper ── */}
      {status !== "idle" && (
        <div className="pt-1">
          <AsyncStepper status={status} stepIndex={stepIndex} />
        </div>
      )}

      {/* ── TX link ── */}
      {txHash && (
        <div className="flex items-center gap-2 px-3 py-2.5 bg-muted/40 border border-border rounded-lg">
          <ExternalLink className="w-3 h-3 text-foreground shrink-0" />
          <a
            href={`https://sepolia.arbiscan.io/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-[11px] text-foreground hover:text-foreground/70 transition-colors truncate"
          >
            {txHash.slice(0, 12)}…{txHash.slice(-8)}
          </a>
        </div>
      )}
    </div>
  );
}
