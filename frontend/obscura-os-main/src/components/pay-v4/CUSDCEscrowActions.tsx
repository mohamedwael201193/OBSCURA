import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { DollarSign, Unlock, AlertTriangle, ShieldAlert } from "lucide-react";
import { useCUSDCEscrow } from "@/hooks/useCUSDCEscrow";
import type { SavedEscrow } from "@/hooks/useCUSDCEscrow";
import AsyncStepper from "@/components/shared/AsyncStepper";
import { toast } from "sonner";
import { parseUnits, formatUnits } from "viem";
import { useAccount } from "wagmi";
import { addTrackedUnits } from "@/lib/trackedBalance";
import { getJSON } from "@/lib/scopedStorage";

const STORAGE_KEY = 'obscura_cusdc_escrows';
function loadSavedEscrows(addr: `0x${string}` | undefined): SavedEscrow[] {
  return getJSON<SavedEscrow[]>(STORAGE_KEY, addr, []);
}

export default function CUSDCEscrowActions() {
  const { address } = useAccount();
  const [escrowId, setEscrowId] = useState("");
  const [fundAmount, setFundAmount] = useState("");
  const [escrowExists, setEscrowExists] = useState<boolean | null>(null);

  const { fund, redeem, checkExists, txHash, isTxPending, status, stepIndex } = useCUSDCEscrow();

  const isProcessing = status !== "idle" && status !== "ready" && status !== "error";

  // Cross-reference entered escrow ID with saved escrows to check recipient match
  const savedEscrow = useMemo(() => {
    if (!escrowId) return null;
    return loadSavedEscrows(address).find(e => e.escrowId === escrowId) ?? null;
  }, [escrowId]);

  const isRecipientMatch = savedEscrow && address
    ? savedEscrow.recipient.toLowerCase() === address.toLowerCase()
    : null; // null = unknown (escrow not in localStorage)

  const handleCheckExists = async () => {
    if (!escrowId) return;
    try {
      const exists = await checkExists(BigInt(escrowId));
      setEscrowExists(exists);
    } catch {
      setEscrowExists(null);
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
    // Warn if connected wallet doesn't match saved recipient
    if (isRecipientMatch === false) {
      toast.error(
        `Your wallet (${address?.slice(0, 6)}...) is NOT the recipient for escrow #${escrowId}. ` +
        `Switch to ${savedEscrow?.recipient.slice(0, 8)}... to redeem. ` +
        `Redeeming from the wrong wallet will silently lose the funds!`,
        { duration: 10000 }
      );
      return; // Block the redeem
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
            <div className="flex items-start gap-2 p-3 bg-red-500/8 border border-red-500/25 rounded-lg">
              <ShieldAlert className="w-3.5 h-3.5 text-red-400 mt-0.5 shrink-0" />
              <p className="text-[11px] text-red-300/90 leading-relaxed">
                <strong>WRONG WALLET!</strong> Escrow #{escrowId} belongs to <span className="font-mono text-emerald-300">{savedEscrow?.recipient.slice(0, 8)}…</span>.
                You are connected as <span className="font-mono text-amber-300">{address?.slice(0, 6)}…{address?.slice(-4)}</span>.
                <span className="block mt-1">Switch MetaMask to the recipient account before redeeming.</span>
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
            <div className="flex items-start gap-2 p-2.5 bg-amber-500/[0.05] border border-amber-500/20 rounded-lg">
              <AlertTriangle className="w-3 h-3 text-amber-400 mt-0.5 shrink-0" />
              <p className="text-[11px] text-amber-300/80 leading-relaxed">
                <strong>You must be connected as the recipient wallet to redeem.</strong>{" "}
                Redeeming from the wrong wallet permanently consumes the escrow.
                {address && <span className="block mt-1 text-muted-foreground/45 font-mono">Connected: {address.slice(0, 6)}...{address.slice(-4)}</span>}
              </p>
            </div>
          )}
          <motion.button onClick={handleRedeem}
            disabled={isProcessing || isTxPending || !escrowId || isRecipientMatch === false}
            whileTap={{ scale: 0.98 }}
            className="btn-pay btn-pay-ghost text-emerald-400 hover:text-emerald-300 border-emerald-500/25 px-4 py-2 disabled:opacity-50">
            <Unlock className="w-3.5 h-3.5" /> Redeem
          </motion.button>
          <p className="text-[11px] text-muted-foreground/35 leading-relaxed">
            Arbiscan shows <b>0.0001 pUSDC</b> — privacy placeholder. Click REVEAL on Dashboard for true balance.
          </p>
        </div>
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
