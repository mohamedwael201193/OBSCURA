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
    <div className="glass-panel rounded-md p-6 space-y-4">
      <div className="flex items-center gap-2">
        <DollarSign className="w-4 h-4 text-cyan-400" />
        <h3 className="font-display text-sm tracking-wider text-foreground">
          Escrow Actions
        </h3>
        <span className="ml-auto text-[11px] bg-cyan-500/10 text-cyan-400 px-2 py-0.5 rounded-md border border-cyan-500/20">
          cUSDC
        </span>
      </div>

      <p className="text-sm text-muted-foreground/70">
        Fund or redeem existing cUSDC escrows. Redemption uses the silent failure pattern —
        if you're not the rightful owner, the transaction succeeds but returns zero (no information leak).
      </p>

      <div className="space-y-3">
        <div>
          <label className="text-xs text-muted-foreground tracking-[0.15em] uppercase block mb-1.5">
            Escrow ID
          </label>
          <div className="flex gap-2">
            <input
              type="number"
              placeholder="e.g. 0"
              value={escrowId}
              onChange={(e) => {
                setEscrowId(e.target.value);
                setEscrowExists(null);
              }}
              className="flex-1 px-3 py-2 bg-background border border-border/50 rounded-md font-mono text-xs text-foreground placeholder:text-muted-foreground/30 focus:border-cyan-500/40 focus:outline-none"
            />
            <motion.button
              onClick={handleCheckExists}
              disabled={!escrowId}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="px-3 py-2 text-xs tracking-[0.1em] uppercase border border-border/50 text-muted-foreground rounded-md hover:text-foreground hover:border-cyan-500/40 disabled:opacity-30 transition-all"
            >
              Check
            </motion.button>
          </div>
        </div>

        {escrowExists !== null && (
          <div className="flex items-center gap-2 text-xs px-3 py-2 bg-secondary/30 rounded-md border border-border/30">
            <span className={`w-1.5 h-1.5 rounded-full ${escrowExists ? "bg-green-400" : "bg-red-400"}`} />
            <span className="text-muted-foreground">
              {escrowExists ? "Active" : "Not found"}
            </span>
          </div>
        )}

        {/* Fund section */}
        <div className="p-3 bg-secondary/20 rounded-md border border-border/20 space-y-2">
          <div className="text-xs text-muted-foreground tracking-[0.15em] uppercase">
            Top-Up Escrow (Optional)
          </div>
          <p className="text-[11px] text-muted-foreground/50">
            Add more cUSDC to an already-funded escrow. New escrows are auto-funded at creation — this is only for top-ups.
          </p>
          <div className="flex gap-2">
            <input
              type="number"
              placeholder="Amount (cUSDC)"
              value={fundAmount}
              onChange={(e) => setFundAmount(e.target.value)}
              className="flex-1 px-3 py-1.5 bg-background border border-border/50 rounded-md font-mono text-xs text-foreground placeholder:text-muted-foreground/30 focus:border-cyan-500/40 focus:outline-none"
            />
            <motion.button
              onClick={handleFund}
              disabled={isProcessing || isTxPending || escrowExists === false}
              whileHover={!isProcessing ? { scale: 1.02 } : {}}
              whileTap={!isProcessing ? { scale: 0.98 } : {}}
              className="px-4 py-1.5 text-xs tracking-[0.15em] uppercase bg-cyan-600 text-white rounded-md hover:bg-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Fund
            </motion.button>
          </div>
        </div>

        {/* Redeem section */}
        <div className="p-3 bg-secondary/20 rounded-md border border-border/20 space-y-2">
          <div className="text-xs text-muted-foreground tracking-[0.15em] uppercase">
            Redeem Escrow (Step 3)
          </div>

          {/* Recipient match check */}
          {escrowId && isRecipientMatch === false && (
            <div className="flex items-start gap-1.5 p-2 bg-red-500/10 border border-red-500/30 rounded-md">
              <ShieldAlert className="w-3.5 h-3.5 text-red-400 mt-0.5 flex-shrink-0" />
              <p className="text-[11px] text-red-300/90 leading-relaxed">
                <strong>WRONG WALLET!</strong> Escrow #{escrowId} belongs to <span className="font-mono text-cyan-400">{savedEscrow?.recipient.slice(0, 8)}…</span>.
                You are connected as <span className="font-mono text-yellow-300">{address?.slice(0, 6)}…{address?.slice(-4)}</span>.
                <span className="block mt-1">Switch MetaMask to the recipient account before redeeming. Redeeming from the wrong wallet will permanently consume the escrow and the funds are lost.</span>
              </p>
            </div>
          )}
          {escrowId && isRecipientMatch === true && (
            <div className="flex items-center gap-1.5 p-2 bg-green-500/10 border border-green-500/20 rounded-md">
              <span className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0" />
              <p className="text-[11px] text-green-300/80">
                Wallet matches recipient for escrow #{escrowId} — you can safely redeem.
              </p>
            </div>
          )}
          {(!escrowId || isRecipientMatch === null) && (
            <div className="flex items-start gap-1.5 p-2 bg-yellow-500/5 border border-yellow-500/20 rounded-md">
              <AlertTriangle className="w-3 h-3 text-yellow-400 mt-0.5 flex-shrink-0" />
              <p className="text-[11px] text-yellow-300/80 leading-relaxed">
                <strong>You must be connected as the recipient (owner) wallet to redeem.</strong>{" "}
                If the creator tries to redeem, the tx confirms but returns zero cUSDC and the escrow is consumed — funds are lost forever.
                {address && (
                  <span className="block mt-1 text-muted-foreground/50">
                    Connected: {address.slice(0, 6)}...{address.slice(-4)}
                  </span>
                )}
              </p>
            </div>
          )}
          <motion.button
            onClick={handleRedeem}
            disabled={isProcessing || isTxPending || !escrowId || isRecipientMatch === false}
            whileHover={!isProcessing ? { scale: 1.02 } : {}}
            whileTap={!isProcessing ? { scale: 0.98 } : {}}
            className="px-4 py-1.5 text-xs tracking-[0.15em] uppercase border border-cyan-500/30 text-cyan-400 rounded-md hover:bg-cyan-500/10 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
          >
            <Unlock className="w-3 h-3" />
            Redeem
          </motion.button>
          <p className="text-[11px] text-muted-foreground/40 leading-relaxed">
            Arbiscan will show <b>0.0001 pUSDC</b> — this is a privacy placeholder. The real encrypted amount is processed via FHE. Click REVEAL on Dashboard to see your true balance.
          </p>
        </div>
      </div>

      {status !== "idle" && (
        <div className="pt-1">
          <AsyncStepper status={status} stepIndex={stepIndex} />
        </div>
      )}

      {txHash && (
        <div className="text-xs text-muted-foreground/60 text-center">
          TX:{" "}
          <a href={`https://sepolia.arbiscan.io/tx/${txHash}`} target="_blank" rel="noopener noreferrer" className="font-mono text-cyan-400 hover:underline">
            {txHash.slice(0, 10)}...{txHash.slice(-8)}
          </a>
        </div>
      )}
    </div>
  );
}
