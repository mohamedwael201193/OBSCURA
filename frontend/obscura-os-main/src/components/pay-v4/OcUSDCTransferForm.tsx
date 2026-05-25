import { useState } from "react";
import { motion } from "framer-motion";
import { Send, ArrowRight, Lock, Loader2, ExternalLink } from "lucide-react";
import UsdcIcon from "@/components/shared/UsdcIcon";
import { useOcUSDCTransfer } from "@/hooks/useOcUSDCTransfer";
import AsyncStepper from "@/components/shared/AsyncStepper";
import { toast } from "sonner";
import { parseUnits } from "viem";
import { useUSDCBalance } from "@/hooks/useUSDCBalance";

export default function OcUSDCTransferForm() {
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const { transfer, txHash, isTxPending, status, stepIndex } = useOcUSDCTransfer();
  const usdcBalance = useUSDCBalance();

  const isValidAddress = (addr: string) => /^0x[a-fA-F0-9]{40}$/.test(addr);
  const isProcessing = status !== "idle" && status !== "ready" && status !== "error";

  const handleTransfer = async () => {
    if (!isValidAddress(recipient)) {
      toast.error("Enter a valid recipient address");
      return;
    }
    if (!amount || Number(amount) <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    try {
      const parsed = parseUnits(amount, 6);
      await transfer(recipient as `0x${string}`, parsed);
      toast.success("Confidential ocUSDC transfer submitted");
      setRecipient("");
      setAmount("");
    } catch (err) {
      toast.error((err as Error).message || "Transfer failed");
    }
  };

  return (
    <div className="space-y-5">
      {/* ── Header ── */}
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-muted hairline">
          <Send className="w-4 h-4 text-foreground" />
        </div>
        <div className="min-w-0">
          <h3 className="font-display text-lg text-foreground leading-tight">Confidential P2P Transfer</h3>
          <p className="text-[10px] text-muted-foreground/45 tracking-widest mt-0.5 uppercase">Private transfer · ocUSDC</p>
        </div>
        <span className="ml-auto shrink-0 inline-flex items-center gap-1.5 rounded-full bg-muted border border-border px-2 py-0.5 text-[10.5px] font-medium text-foreground/75">Encrypted</span>
      </div>

      {/* USDC balance pill */}
      <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-muted border border-border">
        <UsdcIcon className="w-4 h-4 shrink-0" />
        <span className="text-[11px] text-muted-foreground font-medium tracking-wide">USDC Balance</span>
        <span className="ml-auto font-mono text-[14px] text-foreground font-semibold">
          {usdcBalance !== null ? usdcBalance : "\u2014"}
        </span>
        <span className="text-[10px] text-foreground/50 font-semibold uppercase tracking-wider">USDC</span>
      </div>

      <p className="text-sm text-muted-foreground leading-relaxed">
        Send ocUSDC to any address. The transfer amount is fully encrypted — no one can see how much was sent, not even block explorers.
      </p>

      <div className="space-y-3">
        <div className="space-y-2">
          <label className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground/50 font-semibold">
            Recipient Address
          </label>
          <div className="relative">
            <ArrowRight className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/30 pointer-events-none" />
            <input
              type="text"
              placeholder="0x… recipient"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              className="pay-input pl-9"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground/50 font-semibold">
            Amount (ocUSDC)
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-foreground/40 pointer-events-none" />
            <input
              type="number"
              placeholder="e.g. 50"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="pay-input pl-9"
            />
          </div>
        </div>
      </div>

      {status !== "idle" && (
        <div className="rounded-xl hairline bg-card p-4">
          <AsyncStepper status={status} stepIndex={stepIndex} />
        </div>
      )}

      <div className="flex justify-end pt-3 border-t border-border/60">
        <motion.button
          onClick={handleTransfer}
          disabled={isProcessing || isTxPending}
          whileTap={!isProcessing ? { scale: 0.99 } : {}}
          className="btn-pay btn-pay-primary disabled:opacity-50"
        >
          {isProcessing
            ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Processing…</>
            : <><Send className="w-3.5 h-3.5" /> Shield &amp; send</>
          }
        </motion.button>
      </div>

      {txHash && (
        <div className="flex items-center gap-2 px-3 py-2.5 bg-muted/40 border border-border rounded-lg">
          <ExternalLink className="w-3 h-3 text-foreground shrink-0" />
          <a
            href={`https://sepolia.arbiscan.io/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-[11px] text-foreground hover:text-foreground/70 transition-colors truncate"
          >
            {txHash.slice(0, 10)}…{txHash.slice(-8)}
          </a>
          <span className="ml-auto text-[10px] text-muted-foreground/35 tracking-wider shrink-0">CONFIRMED</span>
        </div>
      )}
    </div>
  );
}


