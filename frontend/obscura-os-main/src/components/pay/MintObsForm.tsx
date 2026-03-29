import { useState } from "react";
import { motion } from "framer-motion";
import { Coins, Send } from "lucide-react";
import { useMintObs } from "@/hooks/useMintObs";
import AsyncStepper from "@/components/shared/AsyncStepper";
import { toast } from "sonner";
import { OBSCURA_TOKEN_ADDRESS } from "@/config/contracts";

export default function MintObsForm() {
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const { mintObs, txHash, isTxPending, status, stepIndex } = useMintObs();

  const isValidAddress = (addr: string) => /^0x[a-fA-F0-9]{40}$/.test(addr);
  const isProcessing = status !== "idle" && status !== "ready" && status !== "error";

  const handleMint = async () => {
    if (!isValidAddress(recipient)) {
      toast.error("Enter a valid recipient address");
      return;
    }
    if (!amount || Number(amount) <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    if (!OBSCURA_TOKEN_ADDRESS) {
      toast.error("Token contract not configured — set VITE_OBSCURA_TOKEN_ADDRESS");
      return;
    }

    try {
      await mintObs(recipient as `0x${string}`, BigInt(Math.floor(Number(amount))));
      toast.success("$OBS minted successfully");
      setRecipient("");
      setAmount("");
    } catch (err) {
      toast.error((err as Error).message || "Mint failed");
    }
  };

  return (
    <div className="glass-panel rounded-sm p-6 space-y-4">
      <div className="flex items-center gap-2">
        <Coins className="w-4 h-4 text-primary" />
        <h3 className="font-display text-sm tracking-wider text-foreground">
          Mint $OBS Tokens
        </h3>
        <span className="ml-auto text-[8px] font-mono text-muted-foreground bg-secondary px-2 py-0.5 rounded-sm">
          OWNER ONLY
        </span>
      </div>

      <div className="space-y-3">
        <div>
          <label className="text-[9px] font-mono text-muted-foreground tracking-[0.15em] uppercase block mb-1.5">
            Recipient Address
          </label>
          <input
            type="text"
            placeholder="0x... recipient"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            className="w-full px-3 py-2 bg-background border border-border/50 rounded-sm text-xs font-mono text-foreground placeholder:text-muted-foreground/30 focus:border-primary/40 focus:outline-none"
          />
        </div>
        <div>
          <label className="text-[9px] font-mono text-muted-foreground tracking-[0.15em] uppercase block mb-1.5">
            Amount
          </label>
          <input
            type="number"
            placeholder="e.g. 1000"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full px-3 py-2 bg-background border border-border/50 rounded-sm text-xs font-mono text-foreground placeholder:text-muted-foreground/30 focus:border-primary/40 focus:outline-none"
          />
        </div>
      </div>

      {status !== "idle" && (
        <div className="pt-1">
          <AsyncStepper status={status} stepIndex={stepIndex} />
        </div>
      )}

      <motion.button
        onClick={handleMint}
        disabled={isProcessing || isTxPending}
        whileHover={!isProcessing ? { scale: 1.01 } : {}}
        whileTap={!isProcessing ? { scale: 0.99 } : {}}
        className="w-full py-3 text-xs tracking-[0.2em] uppercase font-mono bg-primary text-primary-foreground rounded-sm hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        <Send className="w-3.5 h-3.5" />
        {isProcessing ? "Processing..." : "Encrypt & Mint $OBS"}
      </motion.button>

      {txHash && (
        <div className="text-[9px] font-mono text-muted-foreground/60 text-center">
          TX:{" "}
          <a
            href={`https://sepolia.arbiscan.io/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            {txHash.slice(0, 10)}...{txHash.slice(-8)}
          </a>
        </div>
      )}
    </div>
  );
}
