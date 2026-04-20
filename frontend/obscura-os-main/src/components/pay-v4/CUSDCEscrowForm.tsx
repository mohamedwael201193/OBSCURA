import { useState } from "react";
import { motion } from "framer-motion";
import { Lock, Plus, Copy, CheckCircle } from "lucide-react";
import { useCUSDCEscrow } from "@/hooks/useCUSDCEscrow";
import AsyncStepper from "@/components/shared/AsyncStepper";
import { toast } from "sonner";
import { parseUnits } from "viem";

export default function CUSDCEscrowForm() {
  const [ownerAddr, setOwnerAddr] = useState("");
  const [amount, setAmount] = useState("");
  const [resolver, setResolver] = useState("");
  const [resolverData, setResolverData] = useState("");
  const [copied, setCopied] = useState(false);

  const { create, txHash, isTxPending, status, stepIndex, lastEscrowId, reset } = useCUSDCEscrow();

  const isValidAddress = (addr: string) => /^0x[a-fA-F0-9]{40}$/.test(addr);
  const isProcessing = status !== "idle" && status !== "ready" && status !== "error";
  const isDone = status === "ready" && lastEscrowId;

  const handleCreate = async () => {
    if (!isValidAddress(ownerAddr)) {
      toast.error("Enter a valid owner/recipient address");
      return;
    }
    if (!amount || Number(amount) <= 0) {
      toast.error("Enter a valid escrow amount");
      return;
    }

    try {
      const parsedAmount = parseUnits(amount, 6);
      const resolverAddr = isValidAddress(resolver)
        ? (resolver as `0x${string}`)
        : ("0x0000000000000000000000000000000000000000" as `0x${string}`);
      const data = resolverData.startsWith("0x")
        ? (resolverData as `0x${string}`)
        : ("0x" as `0x${string}`);

      await create(ownerAddr as `0x${string}`, parsedAmount, resolverAddr, data);
      toast.success("Escrow created & auto-funded with cUSDC! Send the ID to the recipient.", { duration: 8000 });
      setOwnerAddr("");
      setAmount("");
      setResolver("");
      setResolverData("");
    } catch (err) {
      toast.error((err as Error).message || "Escrow creation failed");
    }
  };

  const handleCopyId = () => {
    if (lastEscrowId) {
      navigator.clipboard.writeText(lastEscrowId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (isDone) {
    return (
      <div className="glass-panel rounded-sm p-6 space-y-4">
        <div className="flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-green-400" />
          <h3 className="font-display text-sm tracking-wider text-green-400">Escrow Created &amp; Funded</h3>
        </div>
        <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-sm space-y-2">
          <div className="text-[10px] font-mono text-muted-foreground">Escrow ID:</div>
          <div className="flex items-center gap-2">
            <span className="text-lg font-mono text-green-400 font-bold">#{lastEscrowId}</span>
            <button onClick={handleCopyId} className="p-1 hover:bg-secondary rounded-sm">
              {copied ? <CheckCircle className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5 text-muted-foreground" />}
            </button>
          </div>
          <p className="text-[9px] font-mono text-muted-foreground/60">
            Escrow created and funded automatically. Send this ID to the recipient so they can redeem.
          </p>
        </div>
        {txHash && (
          <div className="text-[9px] font-mono text-muted-foreground/60 text-center">
            TX:{" "}
            <a href={`https://sepolia.arbiscan.io/tx/${txHash}`} target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">
              {txHash.slice(0, 10)}...{txHash.slice(-8)}
            </a>
          </div>
        )}
        <motion.button
          onClick={reset}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          className="w-full py-2 text-xs tracking-[0.15em] uppercase font-mono border border-border/50 text-muted-foreground rounded-sm hover:text-foreground hover:border-primary/40 transition-all"
        >
          Create Another Escrow
        </motion.button>
      </div>
    );
  }

  return (
    <div className="glass-panel rounded-sm p-6 space-y-4">
      <div className="flex items-center gap-2">
        <Lock className="w-4 h-4 text-cyan-400" />
        <h3 className="font-display text-sm tracking-wider text-foreground">
          Create Encrypted Escrow
        </h3>
        <span className="ml-auto text-[8px] font-mono bg-cyan-500/10 text-cyan-400 px-2 py-0.5 rounded-sm border border-cyan-500/20">
          cUSDC
        </span>
      </div>

      <p className="text-[10px] font-mono text-muted-foreground/70">
        Lock cUSDC in an encrypted escrow. The owner address and locked amount are both encrypted on-chain.
        You must have enough cUSDC balance (wrap USDC first in Dashboard tab).
      </p>

      {!isProcessing && (
        <div className="space-y-3">
          <div>
            <label className="text-[9px] font-mono text-muted-foreground tracking-[0.15em] uppercase block mb-1.5">
              Owner / Recipient (who can redeem)
            </label>
            <input
              type="text"
              placeholder="0x... owner address"
              value={ownerAddr}
              onChange={(e) => setOwnerAddr(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-border/50 rounded-sm text-xs font-mono text-foreground placeholder:text-muted-foreground/30 focus:border-cyan-500/40 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-[9px] font-mono text-muted-foreground tracking-[0.15em] uppercase block mb-1.5">
              Amount (cUSDC)
            </label>
            <input
              type="number"
              placeholder="e.g. 100"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-border/50 rounded-sm text-xs font-mono text-foreground placeholder:text-muted-foreground/30 focus:border-cyan-500/40 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-[9px] font-mono text-muted-foreground tracking-[0.15em] uppercase block mb-1.5">
              Resolver Contract (optional)
            </label>
            <input
              type="text"
              placeholder="0x... or leave blank for no resolver"
              value={resolver}
              onChange={(e) => setResolver(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-border/50 rounded-sm text-xs font-mono text-foreground placeholder:text-muted-foreground/30 focus:border-cyan-500/40 focus:outline-none"
            />
            <span className="text-[8px] font-mono text-muted-foreground/40 mt-0.5 block">
              Leave empty for unconditional escrow
            </span>
          </div>

          <div>
            <label className="text-[9px] font-mono text-muted-foreground tracking-[0.15em] uppercase block mb-1.5">
              Resolver Data (optional hex)
            </label>
            <input
              type="text"
              placeholder="0x... or leave blank"
              value={resolverData}
              onChange={(e) => setResolverData(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-border/50 rounded-sm text-xs font-mono text-foreground placeholder:text-muted-foreground/30 focus:border-cyan-500/40 focus:outline-none"
            />
          </div>
        </div>
      )}

      {status !== "idle" && (
        <div className="pt-1">
          <AsyncStepper status={status} stepIndex={stepIndex} />
        </div>
      )}

      {!isDone && (
        <motion.button
          onClick={handleCreate}
          disabled={isProcessing || isTxPending}
          whileHover={!isProcessing ? { scale: 1.01 } : {}}
          whileTap={!isProcessing ? { scale: 0.99 } : {}}
          className="w-full py-3 text-xs tracking-[0.2em] uppercase font-mono bg-cyan-600 text-white rounded-sm hover:bg-cyan-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <Plus className="w-3.5 h-3.5" />
          {isProcessing ? "Creating & Funding..." : "Create & Fund Escrow"}
        </motion.button>
      )}

      {txHash && !isDone && (
        <div className="text-[9px] font-mono text-muted-foreground/60 text-center">
          TX:{" "}
          <a href={`https://sepolia.arbiscan.io/tx/${txHash}`} target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">
            {txHash.slice(0, 10)}...{txHash.slice(-8)}
          </a>
        </div>
      )}
    </div>
  );
}
