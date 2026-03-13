/**
 * OperatorApprovalModal — Wave 4 v3.17
 *
 * Plain-language modal that explains the operator grant and triggers
 * ObscuraConfidentialToken.setOperator(router, expiry) on the user's behalf.
 *
 * Why this exists:
 *   The ObscuraCreditRouter needs operator approval to move encrypted
 *   ocUSDC from the user's account. This is analogous to an ERC-20
 *   `approve()` but for confidential balances. Approval expires in 7 days
 *   (or a custom duration) to minimize persistent exposure.
 *
 * Privacy note:
 *   - setOperator is a plaintext call (no FHE encryption needed).
 *   - The operator address (router) and expiry are public.
 *   - The user's balance remains encrypted throughout.
 */
import { useState, useCallback } from "react";
import { usePublicClient, useWalletClient, useWriteContract } from "wagmi";
import { ShieldCheck, Lock, Clock, AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CONFIDENTIAL_TOKEN_ABI,
  CREDIT_OCUSDC_ADDRESS,
  CREDIT_ROUTER_ADDRESS,
} from "@/config/credit";
import { estimateCappedFees } from "@/lib/gas";
import { withRateLimitRetry } from "@/lib/rateLimit";

const DEFAULT_EXPIRY_DAYS = 7;

interface OperatorApprovalModalProps {
  open: boolean;
  /** Called after the tx is confirmed, or dismissed if the user cancels. */
  onClose: (approved: boolean) => void;
  /** Override the token being approved; defaults to CREDIT_OCUSDC_ADDRESS (credit market cUSDC). */
  tokenAddress?: `0x${string}`;
  /** Override the operator address; defaults to CREDIT_ROUTER_ADDRESS. */
  operatorAddress?: `0x${string}`;
  /** Approval duration in days (default 7). */
  expiryDays?: number;
}

export default function OperatorApprovalModal({
  open,
  onClose,
  tokenAddress,
  operatorAddress,
  expiryDays = DEFAULT_EXPIRY_DAYS,
}: OperatorApprovalModalProps) {
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const { writeContractAsync } = useWriteContract();
  const [status, setStatus] = useState<"idle" | "pending" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const token    = tokenAddress    ?? CREDIT_OCUSDC_ADDRESS;
  const operator = operatorAddress ?? CREDIT_ROUTER_ADDRESS;

  const expirySeconds = BigInt(Math.floor(Date.now() / 1000) + expiryDays * 86_400);

  const handleApprove = useCallback(async () => {
    if (!publicClient || !walletClient || !token || !operator) return;
    setStatus("pending");
    setErrorMsg(null);
    try {
      const fees = await withRateLimitRetry(() => estimateCappedFees(publicClient));
      const hash = await writeContractAsync({
        address: token,
        abi: CONFIDENTIAL_TOKEN_ABI,
        functionName: "setOperator",
        args: [operator, expirySeconds],
        ...fees,
      });
      await publicClient.waitForTransactionReceipt({ hash });
      setStatus("done");
      setTimeout(() => onClose(true), 1_200);
    } catch (err: unknown) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Transaction failed");
    }
  }, [publicClient, walletClient, token, operator, expirySeconds, writeContractAsync, onClose]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && status !== "pending" && onClose(false)}>
      <DialogContent className="max-w-sm bg-[#0a0d11] border border-white/10 backdrop-blur-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white/90">
            <ShieldCheck className="w-5 h-5 text-violet-400" />
            Approve Credit Router
          </DialogTitle>
          <DialogDescription className="text-white/50 text-xs mt-1">
            One-time approval to enable encrypted transfers via the Obscura router
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Privacy explanation */}
          <div className="rounded-xl border border-white/8 bg-white/4 p-4 space-y-3">
            <div className="flex items-start gap-3">
              <Lock className="w-4 h-4 text-violet-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-white/80 mb-0.5">
                  What you're approving
                </p>
                <p className="text-xs text-white/50 leading-relaxed">
                  Allow the Obscura Credit Router to move your encrypted ocUSDC on your
                  behalf. This is required for the single-transaction borrow flow — the
                  router bundles collateral supply + borrow into one wallet signature.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Clock className="w-4 h-4 text-foreground mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-white/80 mb-0.5">
                  Expires in {expiryDays} days
                </p>
                <p className="text-xs text-white/50 leading-relaxed">
                  The approval auto-expires — no persistent delegation of your
                  encrypted balance. You can revoke earlier by setting the expiry to 0.
                </p>
              </div>
            </div>
          </div>

          {/* Operator address badges */}
          <div className="space-y-1.5">
            <p className="text-[10px] text-white/30 uppercase tracking-widest">Operator</p>
            <Badge variant="outline" className="font-mono text-[10px] text-white/60 border-white/10 truncate block max-w-full px-2 py-1">
              {operator ?? "—"}
            </Badge>
          </div>

          {/* Error message */}
          {status === "error" && errorMsg && (
            <div className="flex items-start gap-2 rounded-lg bg-red-500/10 border border-red-500/20 p-3">
              <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
              <p className="text-xs text-red-300 break-words">{errorMsg}</p>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-2 pt-1">
            <Button
              variant="ghost"
              size="sm"
              className="flex-1 text-white/50 hover:text-white/80 border border-white/8 hover:border-white/20"
              disabled={status === "pending"}
              onClick={() => onClose(false)}
            >
              Not now
            </Button>
            <Button
              size="sm"
              className="flex-1 bg-violet-600 hover:bg-violet-500 text-white disabled:opacity-60"
              disabled={status === "pending" || status === "done" || !token || !operator}
              onClick={handleApprove}
            >
              {status === "pending"
                ? "Approving…"
                : status === "done"
                  ? "Approved ✓"
                  : "Approve router"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
