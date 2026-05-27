import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Gift, Loader2, CheckCircle2, AlertCircle, Lock, ExternalLink, ShieldCheck, Eye, ArrowUpRight } from "lucide-react";
import { useOcUSDCEscrow } from "@/hooks/useOcUSDCEscrow";
import { useOcUSDCBalance } from "@/hooks/useOcUSDCBalance";
import { useAccount, usePublicClient } from "wagmi";
import { toast } from "sonner";
import { OBSCURA_CONFIDENTIAL_ESCROW_ADDRESS } from "@/config/pay";
import { getTrackedUnits, setTrackedUnits } from "@/lib/trackedBalance";
import { formatUSDC } from "@/lib/usdc";

/**
 * ClaimEscrowCard — dedicated landing UI for ?claim=<id> deep links.
 *
 * Renders only when a claim ID is in the URL. Acts as the "Stripe Payment
 * Link" page: a single hero card with a giant "Claim ocUSDC" button so a
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
  const { redeem, checkExists, getExpiryBlock, txHash, isTxPending, status } = useOcUSDCEscrow();
  const { reveal, busy: revealBusy, decrypted: cusdcDecrypted } = useOcUSDCBalance();

  const [exists, setExists] = useState<boolean | null>(null);
  const [expiryInfo, setExpiryInfo] = useState<{ block: bigint; current: bigint } | null>(null);
  const [redeemHash, setRedeemHash] = useState<string | null>(null);
  const [redeemed, setRedeemed] = useState(false);
  const [loadingProbe, setLoadingProbe] = useState(true);

  // ── Phase A1/A2/A5 — post-claim verification state ────────────────────────
  // Track balance before/after the redeem tx so we can show "+X.XX ocUSDC"
  // (or detect zero-delta = wrong wallet / already claimed).
  type VerifyPhase = "idle" | "settling" | "ready-to-reveal" | "revealing" | "confirmed" | "zero-delta" | "reveal-failed";
  const [verifyPhase, setVerifyPhase] = useState<VerifyPhase>("idle");
  const [preClaimUnits, setPreClaimUnits] = useState<bigint | null>(null);
  const [postClaimUnits, setPostClaimUnits] = useState<bigint | null>(null);
  const [settleSecondsLeft, setSettleSecondsLeft] = useState(0);
  const settleTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
      // Capture pre-claim tracked balance so we can compute the delta
      // after the private balance settles. Tracked balance is our best
      // local snapshot — Reineira's confidentialBalanceOf returns 403 on
      // sealOutput from third-party wallets, so we cannot eth_call decrypt.
      const pre = address ? getTrackedUnits(address) : 0n;
      setPreClaimUnits(pre);

      const hash = await redeem(BigInt(claimId));
      setRedeemHash(hash);
      setRedeemed(true);

      // Start the ~30 s settling countdown. CoFHE finalizes the encrypted
      // transfer asynchronously after the on-chain tx is mined.
      setVerifyPhase("settling");
      const SETTLE_SECONDS = 30;
      setSettleSecondsLeft(SETTLE_SECONDS);
      if (settleTimerRef.current) clearInterval(settleTimerRef.current);
      settleTimerRef.current = setInterval(() => {
        setSettleSecondsLeft((s) => {
          if (s <= 1) {
            if (settleTimerRef.current) clearInterval(settleTimerRef.current);
            return 0;
          }
          return s - 1;
        });
      }, 1000);

      toast.success(
        "Claim transaction confirmed. Waiting for your private balance to settle…",
        { duration: 6000 }
      );
    } catch (err) {
      toast.error((err as Error).message || "Claim failed");
      setVerifyPhase("idle");
    }
  }, [claimId, redeem, isConnected, address]);

  // User-triggered balance reveal after the settle countdown completes.
  const runVerify = useCallback(async () => {
    if (!address) return;
    setVerifyPhase("revealing");
    try {
      await reveal();
      // useOcUSDCBalance updates `decrypted` in state; we read it from the
      // hook closure on the next render via the effect below.
    } catch (err) {
      console.warn("[ClaimEscrowCard] reveal failed:", err);
      setVerifyPhase("reveal-failed");
    }
  }, [address, reveal]);

  // When settling timer reaches zero, wait for an explicit reveal click.
  useEffect(() => {
    if (verifyPhase === "settling" && settleSecondsLeft === 0) {
      setVerifyPhase("ready-to-reveal");
    }
  }, [verifyPhase, settleSecondsLeft]);

  // When `cusdcDecrypted` updates after a reveal, compute the delta and
  // persist the new balance to the tracked store.
  useEffect(() => {
    if (verifyPhase !== "revealing") return;
    if (cusdcDecrypted === null || cusdcDecrypted === undefined) return;
    if (revealBusy) return;
    const post = cusdcDecrypted;
    setPostClaimUnits(post);
    if (address) setTrackedUnits(address, post);
    const pre = preClaimUnits ?? 0n;
    if (post > pre) {
      const delta = post - pre;
      setVerifyPhase("confirmed");
      toast.success(`+${formatUSDC(delta)} ocUSDC received privately`, { duration: 10000 });
    } else {
      setVerifyPhase("zero-delta");
    }
  }, [cusdcDecrypted, revealBusy, verifyPhase, preClaimUnits, address]);

  // Cleanup the timer on unmount.
  useEffect(() => () => {
    if (settleTimerRef.current) clearInterval(settleTimerRef.current);
  }, []);

  const expired = expiryInfo && expiryInfo.block > 0n && expiryInfo.current >= expiryInfo.block;
  const daysLeft = expiryInfo && expiryInfo.block > 0n && expiryInfo.current < expiryInfo.block
    ? Math.max(1, Math.round((Number(expiryInfo.block - expiryInfo.current) * 0.25) / 86400))
    : null;

  return (
    <div className="pay-card relative overflow-hidden p-6 space-y-5">
      {/* Decorative accent */}
      <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-foreground/[0.03] blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 -left-20 w-56 h-56 rounded-full bg-foreground/[0.02] blur-3xl pointer-events-none" />

      <div className="relative flex items-start gap-4">
        <div className="w-12 h-12 rounded-2xl bg-muted border border-border flex items-center justify-center shrink-0">
          <Gift className="w-5 h-5 text-foreground" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[10px] tracking-[0.2em] uppercase text-foreground/80 font-bold mb-1">Confidential Payment for You</div>
          <h2 className="font-display text-xl sm:text-2xl font-semibold text-foreground leading-tight">
            You've been sent a private ocUSDC payment
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
          <div className="px-3 py-2.5 rounded-lg bg-muted/40 border border-border">
            <div className="text-[9px] tracking-[0.15em] uppercase text-muted-foreground/45 mb-0.5">Status</div>
            <div className="font-mono text-[12px] font-semibold flex items-center gap-1.5">
              {loadingProbe ? <><Loader2 className="w-3 h-3 animate-spin" /> Checking…</>
                : exists === true ? <><span className="w-1.5 h-1.5 rounded-full bg-foreground/60" /> Active</>
                : exists === false ? <><span className="w-1.5 h-1.5 rounded-full bg-red-400" /> Not found</>
                : <span className="text-muted-foreground/50">unknown</span>}
            </div>
          </div>
          <div className="px-3 py-2.5 rounded-lg bg-muted/40 border border-border">
            <div className="text-[9px] tracking-[0.15em] uppercase text-muted-foreground/45 mb-0.5">Amount</div>
            <div className="font-mono text-[12px] font-semibold inline-flex items-center gap-1">
              <Lock className="w-3 h-3 text-muted-foreground/70" /> encrypted
            </div>
          </div>
          <div className="px-3 py-2.5 rounded-lg bg-muted/40 border border-border">
            <div className="text-[9px] tracking-[0.15em] uppercase text-muted-foreground/45 mb-0.5">Window</div>
            <div className="font-mono text-[12px] font-semibold">
              {expired ? <span className="text-amber-300">expired · refundable</span>
                : daysLeft ? <span className="text-foreground">{daysLeft}d left</span>
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
          <div className="relative flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/40 border border-border text-[11px]">
          <ShieldCheck className="w-3.5 h-3.5 text-[hsl(var(--success))]/70" />
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
              className="w-full py-4 rounded-xl bg-foreground hover:bg-foreground/90 disabled:bg-muted/40 disabled:opacity-50 text-background font-display font-bold text-[15px] tracking-wide inline-flex items-center justify-center gap-2 transition-all"
            >
              {isProcessing || isTxPending
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Claiming privately…</>
                : !isConnected
                ? <>Connect wallet to claim</>
                : exists === false
                ? <>Escrow not found</>
                : <>Claim ocUSDC privately</>}
            </motion.button>
            <p className="mt-3 text-[10px] text-muted-foreground/45 leading-relaxed text-center">
              Silent-failure design: if this wallet is not the encrypted recipient, the transaction succeeds but transfers 0 ocUSDC.
              No funds lost, no information leaked. Anyone safely can click — only the right wallet receives the payment.
            </p>
          </motion.div>
        ) : (
          <motion.div key="success" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="relative space-y-3">
            {/* Phase: settling — countdown while CoFHE finalizes */}
            {verifyPhase === "settling" && (
              <div className="px-4 py-3.5 rounded-xl bg-card border border-border flex items-start gap-3">
                <Loader2 className="w-5 h-5 text-foreground shrink-0 mt-0.5 animate-spin" />
                <div className="flex-1 min-w-0">
                  <div className="font-display text-lg text-foreground">Settling privately…</div>
                  <p className="text-[12px] text-muted-foreground/65 leading-relaxed mt-1">
                    Your transaction is mined. Waiting <span className="font-mono text-foreground">{settleSecondsLeft}s</span> for the private balance to settle. You can reveal the result after that.
                  </p>
                </div>
              </div>
            )}

            {verifyPhase === "ready-to-reveal" && (
              <div className="px-4 py-3.5 rounded-xl bg-card border border-border flex items-start gap-3">
                <Eye className="w-5 h-5 text-foreground shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="font-display text-lg text-foreground">Ready to reveal the receipt</div>
                  <p className="text-[12px] text-muted-foreground/65 leading-relaxed mt-1">
                    Reveal your updated balance with a wallet signature to confirm whether this wallet received the payment.
                  </p>
                  <button
                    onClick={() => void runVerify()}
                    disabled={revealBusy}
                    className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-foreground px-3 py-1.5 text-[11px] font-medium text-background disabled:opacity-50"
                  >
                    {revealBusy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Eye className="w-3 h-3" />}
                    Reveal received amount
                  </button>
                </div>
              </div>
            )}

            {/* Phase: revealing — actively decrypting */}
            {verifyPhase === "revealing" && (
              <div className="px-4 py-3.5 rounded-xl bg-card border border-border flex items-start gap-3">
                <Loader2 className="w-5 h-5 text-foreground shrink-0 mt-0.5 animate-spin" />
                <div className="flex-1 min-w-0">
                  <div className="font-display text-lg text-foreground">Revealing your balance…</div>
                  <p className="text-[12px] text-muted-foreground/65 leading-relaxed mt-1">
                    Asking for a fresh wallet-authorized balance reveal. This usually takes 5-20 seconds.
                  </p>
                </div>
              </div>
            )}

            {/* Phase: confirmed — positive delta, success */}
            {verifyPhase === "confirmed" && preClaimUnits !== null && postClaimUnits !== null && (
              <div className="px-4 py-3.5 rounded-xl bg-card border border-border flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-foreground shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="font-display text-lg text-foreground flex items-center gap-2">
                    Confirmed — you received <ArrowUpRight className="w-3.5 h-3.5" />
                    <span className="font-mono">+{formatUSDC(postClaimUnits - preClaimUnits)} ocUSDC</span>
                  </div>
                  <p className="text-[12px] text-muted-foreground/65 leading-relaxed mt-1">
                    Pre-claim: <span className="font-mono">{formatUSDC(preClaimUnits)}</span> ocUSDC ·
                    Post-claim: <span className="font-mono text-foreground">{formatUSDC(postClaimUnits)}</span> ocUSDC.
                    The funds are now in your encrypted balance.
                  </p>
                </div>
              </div>
            )}

            {/* Phase: zero-delta — wrong wallet or already claimed */}
            {verifyPhase === "zero-delta" && (
              <div className="px-4 py-3.5 rounded-xl bg-amber-500/[0.06] border border-amber-500/30 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-300 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="font-display text-lg text-amber-200">Transaction confirmed — no funds moved</div>
                  <p className="text-[12px] text-muted-foreground/65 leading-relaxed mt-1">
                    Your balance did not change. This wallet is most likely <b>not</b> the encrypted recipient of escrow #{claimId},
                    or the escrow has already been claimed. No funds were lost — the private safety check held.
                  </p>
                  <p className="text-[11px] text-muted-foreground/50 leading-relaxed mt-2">
                    Ask the sender to confirm the recipient address they encrypted, or to re-send to this wallet.
                  </p>
                </div>
              </div>
            )}

            {/* Phase: reveal-failed — fallback (e.g. Reineira 403) */}
            {verifyPhase === "reveal-failed" && (
              <div className="px-4 py-3.5 rounded-xl bg-card border border-border flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-foreground shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="font-display text-lg text-foreground">Claim transaction confirmed</div>
                  <p className="text-[12px] text-muted-foreground/65 leading-relaxed mt-1">
                    The balance reveal could not finish. Use the Pay header reveal button to check your new balance and confirm the receipt.
                  </p>
                  <button
                    onClick={() => void runVerify()}
                    className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-mono text-foreground hover:text-foreground/70"
                  >
                    <Eye className="w-3 h-3" /> Try reveal again
                  </button>
                </div>
              </div>
            )}

            {redeemHash && (
              <a href={`https://sepolia.arbiscan.io/tx/${redeemHash}`} target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 py-2 rounded-lg bg-muted/40 hover:bg-muted/60 text-foreground hover:text-foreground/70 text-[11px] font-mono transition-colors">
                View claim tx · {redeemHash.slice(0, 12)}…{redeemHash.slice(-8)} <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
