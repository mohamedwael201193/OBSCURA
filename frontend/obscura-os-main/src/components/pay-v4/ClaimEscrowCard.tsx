import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Gift, Loader2, CheckCircle2, AlertCircle, Lock, ExternalLink, ShieldCheck } from "lucide-react";
import { useCUSDCEscrow } from "@/hooks/useCUSDCEscrow";
import { useAccount, usePublicClient } from "wagmi";
import { toast } from "sonner";
import { OBSCURA_CONFIDENTIAL_ESCROW_ADDRESS } from "@/config/pay";

/**
 * ClaimEscrowCard — dedicated landing UI for ?claim=<id> deep links.
 *
 * Renders only when a claim ID is in the URL. Acts as the "Stripe Payment
 * Link" page: a single hero card with a giant "Claim cUSDC" button so a
 * recipient who has never used the app can complete redemption in one click.
 *
 * Why a separate card vs. reusing CUSDCEscrowActions:
 *   - Recipients should not see fund / inspect / refund controls
 *   - Hero treatment + clear "you've been sent a private payment" copy
 *   - Big primary button, large status feedback, Arbiscan tx link
 *   - Friendly explanation of silent-failure (won't lose funds even if wrong wallet)
 */
export default function ClaimEscrowCard({ claimId, contractParam }: { claimId: string; contractParam?: string | null }) {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { redeem, checkExists, getExpiryBlock, txHash, isTxPending, status } = useCUSDCEscrow();

  const [exists, setExists] = useState<boolean | null>(null);
  const [expiryInfo, setExpiryInfo] = useState<{ block: bigint; current: bigint } | null>(null);
  const [redeemHash, setRedeemHash] = useState<string | null>(null);
  const [redeemed, setRedeemed] = useState(false);
  const [loadingProbe, setLoadingProbe] = useState(true);

  const isProcessing = status !== "idle" && status !== "ready" && status !== "error";

  // Mismatched contract warning: the link points at a different deployment.
  const contractMismatch =
    contractParam &&
    OBSCURA_CONFIDENTIAL_ESCROW_ADDRESS &&
    contractParam.toLowerCase() !== OBSCURA_CONFIDENTIAL_ESCROW_ADDRESS.toLowerCase();

  // Probe the escrow on mount so we can show useful pre-claim info.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingProbe(true);
      try {
        const id = BigInt(claimId);
        const ex = await checkExists(id);
        if (cancelled) return;
        setExists(ex);
        if (ex) {
          try {
            const block = await getExpiryBlock(id);
            const current = publicClient ? await publicClient.getBlockNumber() : 0n;
            if (!cancelled) setExpiryInfo({ block, current });
          } catch {
            /* ignore */
          }
        }
      } catch {
        if (!cancelled) setExists(null);
      } finally {
        if (!cancelled) setLoadingProbe(false);
      }
    })();
    return () => { cancelled = true; };
  }, [claimId, checkExists, getExpiryBlock, publicClient]);

  const handleClaim = useCallback(async () => {
    if (!isConnected) {
      toast.error("Connect your wallet to claim");
      return;
    }
    try {
      const hash = await redeem(BigInt(claimId));
      setRedeemHash(hash);
      setRedeemed(true);
      toast.success(
        `Claim transaction sent. If this wallet is the encrypted recipient, the cUSDC will appear in your balance shortly. ` +
        `If not, the transaction harmlessly transfers 0 — no funds lost, no information leaked.`,
        { duration: 12000 }
      );
    } catch (err) {
      toast.error((err as Error).message || "Claim failed");
    }
  }, [claimId, redeem, isConnected]);

  const expired = expiryInfo && expiryInfo.block > 0n && expiryInfo.current >= expiryInfo.block;
  const daysLeft = expiryInfo && expiryInfo.block > 0n && expiryInfo.current < expiryInfo.block
    ? Math.max(1, Number((expiryInfo.block - expiryInfo.current) / 7200n))
    : null;

  return (
    <div className="pay-card relative overflow-hidden p-6 space-y-5 border-emerald-500/25 bg-gradient-to-br from-emerald-500/[0.06] via-transparent to-cyan-500/[0.04]">
      {/* Decorative gradient accent */}
      <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-emerald-400/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 -left-20 w-56 h-56 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />

      <div className="relative flex items-start gap-4">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-400/30 to-emerald-600/15 border border-emerald-400/40 flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/20">
          <Gift className="w-5 h-5 text-emerald-300" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[10px] tracking-[0.2em] uppercase text-emerald-400/80 font-bold mb-1">Confidential Payment for You</div>
          <h2 className="font-display text-xl sm:text-2xl font-semibold text-foreground leading-tight">
            You've been sent a private cUSDC payment
          </h2>
          <p className="text-[13px] text-muted-foreground/65 leading-relaxed mt-2">
            Escrow <span className="font-mono font-bold text-foreground/85">#{claimId}</span> is waiting to be claimed.
            The amount and recipient are encrypted on-chain — only you (the intended wallet) can unlock it.
          </p>
        </div>
      </div>

      {/* Probe results */}
      {!redeemed && (
        <div className="relative grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
          <div className="px-3 py-2.5 rounded-lg bg-white/[0.04] border border-white/[0.07]">
            <div className="text-[9px] tracking-[0.15em] uppercase text-muted-foreground/45 mb-0.5">Status</div>
            <div className="font-mono text-[12px] font-semibold flex items-center gap-1.5">
              {loadingProbe ? <><Loader2 className="w-3 h-3 animate-spin" /> Checking…</>
                : exists === true ? <><span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Active</>
                : exists === false ? <><span className="w-1.5 h-1.5 rounded-full bg-red-400" /> Not found</>
                : <span className="text-muted-foreground/50">unknown</span>}
            </div>
          </div>
          <div className="px-3 py-2.5 rounded-lg bg-white/[0.04] border border-white/[0.07]">
            <div className="text-[9px] tracking-[0.15em] uppercase text-muted-foreground/45 mb-0.5">Amount</div>
            <div className="font-mono text-[12px] font-semibold inline-flex items-center gap-1">
              <Lock className="w-3 h-3 text-emerald-300/70" /> encrypted
            </div>
          </div>
          <div className="px-3 py-2.5 rounded-lg bg-white/[0.04] border border-white/[0.07]">
            <div className="text-[9px] tracking-[0.15em] uppercase text-muted-foreground/45 mb-0.5">Window</div>
            <div className="font-mono text-[12px] font-semibold">
              {expired ? <span className="text-amber-300">expired · refundable</span>
                : daysLeft ? <span className="text-cyan-300">{daysLeft}d left</span>
                : <span className="text-muted-foreground/50">no expiry</span>}
            </div>
          </div>
        </div>
      )}

      {/* Mismatched contract warning */}
      {contractMismatch && !redeemed && (
        <div className="relative flex gap-2.5 px-3 py-2.5 rounded-lg bg-amber-500/[0.06] border border-amber-500/25 text-[11px]">
          <AlertCircle className="w-3.5 h-3.5 text-amber-300 shrink-0 mt-0.5" />
          <p className="text-amber-200/80 leading-relaxed">
            This claim link points at a different escrow deployment ({contractParam?.slice(0, 8)}…).
            Your app is connected to {OBSCURA_CONFIDENTIAL_ESCROW_ADDRESS?.slice(0, 8)}…. The claim may not work.
          </p>
        </div>
      )}

      {/* Connected wallet pill */}
      {isConnected && (
        <div className="relative flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.025] border border-white/[0.07] text-[11px]">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-300/70" />
          <span className="text-muted-foreground/55">Claiming as</span>
          <span className="font-mono text-foreground/80">{address?.slice(0, 8)}…{address?.slice(-6)}</span>
        </div>
      )}

      {/* Primary CTA / success state */}
      <AnimatePresence mode="wait">
        {!redeemed ? (
          <motion.div key="cta" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="relative">
            <motion.button
              onClick={handleClaim}
              disabled={isProcessing || isTxPending || exists === false || !isConnected}
              whileTap={{ scale: 0.99 }}
              whileHover={{ scale: isProcessing ? 1 : 1.005 }}
              className="w-full py-4 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-400 hover:from-emerald-400 hover:to-emerald-300 disabled:from-muted-foreground/20 disabled:to-muted-foreground/20 disabled:opacity-50 text-black font-display font-bold text-[15px] tracking-wide inline-flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 transition-all"
            >
              {isProcessing || isTxPending
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Claiming privately…</>
                : !isConnected
                ? <>Connect wallet to claim</>
                : exists === false
                ? <>Escrow not found</>
                : <>Claim cUSDC privately</>}
            </motion.button>
            <p className="mt-3 text-[10px] text-muted-foreground/45 leading-relaxed text-center">
              Silent-failure design: if this wallet is not the encrypted recipient, the transaction succeeds but transfers 0 cUSDC.
              No funds lost, no information leaked. Anyone safely can click — only the right wallet receives the payment.
            </p>
          </motion.div>
        ) : (
          <motion.div key="success" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="relative space-y-3">
            <div className="px-4 py-3.5 rounded-xl bg-emerald-500/[0.08] border border-emerald-500/30 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-300 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="font-display text-sm font-semibold text-emerald-300">Claim transaction sent</div>
                <p className="text-[12px] text-muted-foreground/65 leading-relaxed mt-1">
                  Click <b>REVEAL</b> on the Pay Dashboard to decrypt your cUSDC balance and confirm receipt.
                  If your wallet was the encrypted recipient, the amount has been transferred privately.
                </p>
              </div>
            </div>
            {redeemHash && (
              <a href={`https://sepolia.arbiscan.io/tx/${redeemHash}`} target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 py-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.07] text-cyan-300 hover:text-cyan-200 text-[11px] font-mono transition-colors">
                View claim tx · {redeemHash.slice(0, 12)}…{redeemHash.slice(-8)} <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
