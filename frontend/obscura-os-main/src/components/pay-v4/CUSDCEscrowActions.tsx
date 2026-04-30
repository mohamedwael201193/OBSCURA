import { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import { DollarSign, Unlock, AlertTriangle, Info, RefreshCcw } from "lucide-react";
import { useCUSDCEscrow } from "@/hooks/useCUSDCEscrow";
import type { SavedEscrow } from "@/hooks/useCUSDCEscrow";
import AsyncStepper from "@/components/shared/AsyncStepper";
import { toast } from "sonner";
import { parseUnits, formatUnits } from "viem";
import { useAccount, usePublicClient } from "wagmi";
import { addTrackedUnits } from "@/lib/trackedBalance";
import { getJSON } from "@/lib/scopedStorage";
import { OBSCURA_CONFIDENTIAL_ESCROW_ADDRESS } from "@/config/pay";

const STORAGE_KEY = 'obscura_cusdc_escrows';
function loadSavedEscrows(addr: `0x${string}` | undefined): SavedEscrow[] {
  return getJSON<SavedEscrow[]>(STORAGE_KEY, addr, []);
}

export default function CUSDCEscrowActions() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const [escrowId, setEscrowId] = useState("");
  const [fundAmount, setFundAmount] = useState("");
  const [escrowExists, setEscrowExists] = useState<boolean | null>(null);
  const [expiryInfo, setExpiryInfo] = useState<{ block: bigint; current: bigint } | null>(null);

  const { fund, redeem, refund, checkExists, getExpiryBlock, txHash, isTxPending, status, stepIndex } = useCUSDCEscrow();

  const isProcessing = status !== "idle" && status !== "ready" && status !== "error";

  // Auto-fill from claim link: ?tab=escrow&claim=<id>&contract=<addr>
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const params = new URLSearchParams(window.location.search);
      const claim = params.get("claim");
      if (claim && /^\d+$/.test(claim)) {
        setEscrowId(claim);
        toast.message(`Claim link detected — escrow #${claim} pre-filled. Click Redeem to claim.`, { duration: 6000 });
      }
    } catch { /* ignore */ }
  }, []);

  // Cross-reference entered escrow ID with saved escrows for the CURRENT contract
  // (filtering by contract address prevents stale records from older deployments
  // matching the same numeric escrowId on the new deployment).
  const savedEscrow = useMemo(() => {
    if (!escrowId) return null;
    const target = OBSCURA_CONFIDENTIAL_ESCROW_ADDRESS?.toLowerCase();
    return loadSavedEscrows(address).find(
      (e) =>
        e.escrowId === escrowId &&
        (!target || e.contract?.toLowerCase() === target)
    ) ?? null;
  }, [escrowId, address]);

  const isRecipientMatch = savedEscrow && address
    ? savedEscrow.recipient.toLowerCase() === address.toLowerCase()
    : null; // null = unknown (escrow not in localStorage for this contract)

  const handleCheckExists = async () => {
    if (!escrowId) return;
    try {
      const exists = await checkExists(BigInt(escrowId));
      setEscrowExists(exists);
      if (exists) {
        try {
          const block = await getExpiryBlock(BigInt(escrowId));
          const current = publicClient ? await publicClient.getBlockNumber() : 0n;
          setExpiryInfo({ block, current });
        } catch {
          setExpiryInfo(null);
        }
      } else {
        setExpiryInfo(null);
      }
    } catch {
      setEscrowExists(null);
      setExpiryInfo(null);
    }
  };

  const handleRefund = async () => {
    if (!escrowId) {
      toast.error("Enter escrow ID");
      return;
    }
    try {
      await refund(BigInt(escrowId));
      toast.success(`Escrow #${escrowId} refunded — cUSDC returned to creator.`, { duration: 8000 });
    } catch (err) {
      toast.error((err as Error).message || "Refund failed");
    }
  };

  const handleFund = async () => {
    if (!escrowId || !fundAmount || Number(fundAmount) <= 0) {
      toast.error("Enter escrow ID and amount");
      return;
    }
    try {
      await fund(BigInt(escrowId), parseUnits(fundAmount, 6));
      toast.success("Escrow funded with encrypted cUSDC");
      setFundAmount("");
    } catch (err) {
      toast.error((err as Error).message || "Fund failed");
    }
  };

  const handleRedeem = async () => {
    if (!escrowId) {
      toast.error("Enter escrow ID");
      return;
    }
    // NOTE: We deliberately do NOT block on a localStorage mismatch.
    // The on-chain redeem() uses silent-failure (FHE.select(valid, paidAmount, 0)
    // and isRedeemed is only mutated on valid=true). A wrong-wallet redeem costs
    // gas but transfers 0 cUSDC and consumes no escrow state — the contract IS the
    // security boundary, not localStorage (which is empty for fresh recipients).
    if (isRecipientMatch === false) {
      toast.message(
        `Local record says this escrow's recipient is ${savedEscrow?.recipient.slice(0, 8)}…. ` +
        `Proceeding anyway — if you are not the recipient, the contract will privately transfer 0 cUSDC.`,
        { duration: 8000 }
      );
    }
    try {
      await redeem(BigInt(escrowId));
      // exists() is unreliable (returns true even after successful redeem), so just show success
      if (savedEscrow && address) {
        addTrackedUnits(address, BigInt(savedEscrow.amount));
        const displayAmt = formatUnits(BigInt(savedEscrow.amount), 6);
        toast.success(
          `Escrow #${escrowId} redeemed — ${displayAmt} cUSDC received! ` +
          `Dashboard balance updated. Click REVEAL for exact on-chain amount. ` +
          `Note: Arbiscan shows 0.0001 pUSDC — this is a privacy placeholder, the real amount is encrypted.`,
          { duration: 12000 }
        );
      } else {
        toast.success(
          "Escrow redeemed! Go to Dashboard → click REVEAL to see your updated cUSDC balance. " +
          "Note: Arbiscan shows 0.0001 pUSDC — this is a privacy placeholder.",
          { duration: 10000 }
        );
      }
      setEscrowExists(false);
    } catch (err) {
      toast.error((err as Error).message || "Redeem failed");
    }
  };

  return (
    <div className="pay-card p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-700/10 border border-emerald-500/25 flex items-center justify-center shrink-0">
          <DollarSign className="w-4 h-4 text-emerald-400" />
        </div>
        <div className="min-w-0">
          <h3 className="font-display text-sm font-semibold text-foreground leading-tight">Escrow Actions</h3>
          <p className="text-[10px] text-muted-foreground/45 tracking-widest mt-0.5 uppercase">Fund · Redeem · cUSDC</p>
        </div>
        <span className="ml-auto shrink-0 pay-badge pay-badge-emerald">cUSDC</span>
      </div>

      <p className="text-[12px] text-muted-foreground/55 leading-relaxed">
        Fund or redeem existing cUSDC escrows. Redemption uses the silent failure pattern —
        if you're not the rightful owner, the transaction succeeds but returns zero (no information leak).
      </p>

      <div className="space-y-3">
        <div className="space-y-2">
          <label className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground/50 font-semibold">Escrow ID</label>
          <div className="flex gap-2">
            <input type="number" placeholder="e.g. 0" value={escrowId}
              onChange={(e) => { setEscrowId(e.target.value); setEscrowExists(null); }}
              className="pay-input flex-1 font-mono" />
            <motion.button onClick={handleCheckExists} disabled={!escrowId}
              whileTap={{ scale: 0.98 }}
              className="btn-pay btn-pay-ghost px-4 disabled:opacity-30">
              Check
            </motion.button>
          </div>
        </div>

        {escrowExists !== null && (
          <div className="flex items-center gap-2 text-[12px] px-3 py-2.5 bg-white/[0.025] rounded-lg border border-white/[0.07]">
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${escrowExists ? "bg-emerald-400" : "bg-red-400"}`} />
            <span className="text-muted-foreground/60">{escrowExists ? "Active escrow found" : "Not found"}</span>
            {escrowExists && expiryInfo && expiryInfo.block > 0n && (
              <span className="ml-auto text-[11px] font-mono text-muted-foreground/55">
                {expiryInfo.current >= expiryInfo.block
                  ? <span className="text-amber-300">expired — refundable</span>
                  : <span>expires in ~{Math.max(1, Number((expiryInfo.block - expiryInfo.current) / 7200n))}d</span>}
              </span>
            )}
          </div>
        )}

        {/* Fund section */}
        <div className="rounded-xl bg-white/[0.02] border border-white/[0.07] p-4 space-y-3">
          <div>
            <div className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground/50 font-semibold">Top-Up Escrow (Optional)</div>
            <p className="text-[11px] text-muted-foreground/40 mt-1">
              Add more cUSDC to an already-funded escrow. New escrows are auto-funded at creation — this is only for top-ups.
            </p>
          </div>
          <div className="flex gap-2">
            <input type="number" placeholder="Amount (cUSDC)" value={fundAmount}
              onChange={(e) => setFundAmount(e.target.value)}
              className="pay-input flex-1 font-mono" />
            <motion.button onClick={handleFund} disabled={isProcessing || isTxPending || escrowExists === false}
              whileTap={{ scale: 0.98 }}
              className="btn-pay btn-pay-emerald px-5 disabled:opacity-50">
              Fund
            </motion.button>
          </div>
        </div>

        {/* Redeem section */}
        <div className="rounded-xl bg-white/[0.02] border border-white/[0.07] p-4 space-y-3">
          <div className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground/50 font-semibold">Redeem Escrow</div>

          {escrowId && isRecipientMatch === false && (
            <div className="flex items-start gap-2 p-3 bg-amber-500/8 border border-amber-500/25 rounded-lg">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />
              <p className="text-[11px] text-amber-300/85 leading-relaxed">
                <strong>Local record mismatch.</strong> Our local record for escrow #{escrowId} lists recipient <span className="font-mono text-emerald-300">{savedEscrow?.recipient.slice(0, 8)}…</span>, but you are connected as <span className="font-mono text-amber-300">{address?.slice(0, 6)}…{address?.slice(-4)}</span>.
                <span className="block mt-1 text-muted-foreground/55">Proceed only if you are the rightful recipient. A wrong-wallet redeem privately transfers <b>0 cUSDC</b> (no fund loss, no info leak — only gas).</span>
              </p>
            </div>
          )}
          {escrowId && isRecipientMatch === true && (
            <div className="flex items-center gap-2 p-2.5 bg-emerald-500/8 border border-emerald-500/20 rounded-lg">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
              <p className="text-[11px] text-emerald-300/80">Wallet matches recipient for escrow #{escrowId} — safe to redeem.</p>
            </div>
          )}
          {(!escrowId || isRecipientMatch === null) && (
            <div className="flex items-start gap-2 p-2.5 bg-blue-500/[0.06] border border-blue-500/25 rounded-lg">
              <Info className="w-3 h-3 text-blue-400 mt-0.5 shrink-0" />
              <p className="text-[11px] text-blue-300/85 leading-relaxed">
                <strong>No local record for this ID on this device.</strong>{" "}
                If you are the recipient, click Redeem — the contract will privately verify your access. Wrong-wallet attempts harmlessly transfer 0 cUSDC.
                {address && <span className="block mt-1 text-muted-foreground/45 font-mono">Connected: {address.slice(0, 6)}...{address.slice(-4)}</span>}
              </p>
            </div>
          )}
          <motion.button onClick={handleRedeem}
            disabled={isProcessing || isTxPending || !escrowId}
            whileTap={{ scale: 0.98 }}
            className="btn-pay btn-pay-ghost text-emerald-400 hover:text-emerald-300 border-emerald-500/25 px-4 py-2 disabled:opacity-50">
            <Unlock className="w-3.5 h-3.5" /> Redeem
          </motion.button>
          <p className="text-[11px] text-muted-foreground/35 leading-relaxed">
            Arbiscan shows <b>0.0001 pUSDC</b> — privacy placeholder. Click REVEAL on Dashboard for true balance.
          </p>
        </div>

        {/* Refund section — visible only when expiry has passed */}
        {expiryInfo && expiryInfo.block > 0n && expiryInfo.current >= expiryInfo.block && (
          <div className="rounded-xl bg-amber-500/[0.04] border border-amber-500/20 p-4 space-y-3">
            <div className="text-[10px] tracking-[0.15em] uppercase text-amber-300/80 font-semibold">Refund (Expired)</div>
            <p className="text-[11px] text-muted-foreground/55 leading-relaxed">
              This escrow's auto-refund window has passed. Anyone can return the cUSDC to the original creator.
            </p>
            <motion.button onClick={handleRefund}
              disabled={isProcessing || isTxPending || !escrowId}
              whileTap={{ scale: 0.98 }}
              className="btn-pay btn-pay-ghost text-amber-300 hover:text-amber-200 border-amber-500/30 px-4 py-2 disabled:opacity-50">
              <RefreshCcw className="w-3.5 h-3.5" /> Refund to Creator
            </motion.button>
          </div>
        )}
      </div>

      {status !== "idle" && (
        <div className="pt-1">
          <AsyncStepper status={status} stepIndex={stepIndex} />
        </div>
      )}

      {txHash && (
        <div className="flex items-center gap-2 px-3 py-2.5 bg-white/[0.025] border border-white/[0.07] rounded-lg">
          <span className="text-[10px] text-muted-foreground/40 uppercase tracking-wider shrink-0">TX</span>
          <a href={`https://sepolia.arbiscan.io/tx/${txHash}`} target="_blank" rel="noopener noreferrer"
            className="font-mono text-[11px] text-emerald-300 hover:text-emerald-200 transition-colors truncate">
            {txHash.slice(0, 12)}…{txHash.slice(-8)}
          </a>
        </div>
      )}
    </div>

  );
}
