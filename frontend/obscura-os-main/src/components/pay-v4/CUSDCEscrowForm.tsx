import { useState } from "react";
import { motion } from "framer-motion";
import { Lock, Plus, Copy, CheckCircle2, Loader2, ExternalLink } from "lucide-react";
import UsdcIcon from "@/components/shared/UsdcIcon";
import { useCUSDCEscrow } from "@/hooks/useCUSDCEscrow";
import AsyncStepper from "@/components/shared/AsyncStepper";
import { toast } from "sonner";
import { parseUnits } from "viem";
import { useUSDCBalance } from "@/hooks/useUSDCBalance";

export default function CUSDCEscrowForm() {
  const [ownerAddr, setOwnerAddr] = useState("");
  const [amount, setAmount] = useState("");
  const [resolver, setResolver] = useState("");
  const [resolverData, setResolverData] = useState("");
  const [copied, setCopied] = useState(false);

  const { create, txHash, isTxPending, status, stepIndex, lastEscrowId, reset } = useCUSDCEscrow();
  const usdcBalance = useUSDCBalance();

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
      const data = resolverData.startsWith("0x") ? (resolverData as `0x${string}`) : ("0x" as `0x${string}`);
      await create(ownerAddr as `0x${string}`, parsedAmount, resolverAddr, data);
      toast.success("Escrow created & auto-funded with cUSDC! Send the ID to the recipient.", { duration: 8000 });
      setOwnerAddr(""); setAmount(""); setResolver(""); setResolverData("");
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
      <div className="pay-card p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-700/10 border border-emerald-500/25 flex items-center justify-center">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <h3 className="font-display text-sm font-semibold text-emerald-300">Escrow Created &amp; Funded</h3>
            <p className="text-[10px] text-muted-foreground/40 tracking-widest uppercase">cUSDC · Encrypted</p>
          </div>
        </div>
        <div className="rounded-lg bg-emerald-500/8 border border-emerald-500/20 p-4 space-y-2">
          <div className="text-[11px] text-muted-foreground/55 uppercase tracking-wider">Escrow ID</div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xl font-bold text-emerald-300">#{lastEscrowId}</span>
            <button onClick={handleCopyId} className="p-1.5 hover:bg-white/[0.06] rounded-md transition-colors text-muted-foreground/40 hover:text-muted-foreground">
              {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
          <p className="text-[11px] text-muted-foreground/55 leading-relaxed">
            Escrow created and funded automatically. Share this ID with the recipient so they can redeem.
          </p>
        </div>
        {txHash && (
          <div className="flex items-center gap-2 px-3 py-2.5 bg-white/[0.025] border border-white/[0.07] rounded-lg">
            <ExternalLink className="w-3 h-3 text-cyan-400 shrink-0" />
            <a href={`https://sepolia.arbiscan.io/tx/${txHash}`} target="_blank" rel="noopener noreferrer"
              className="font-mono text-[11px] text-cyan-300 hover:text-cyan-200 transition-colors truncate">
              {txHash.slice(0, 10)}…{txHash.slice(-8)}
            </a>
          </div>
        )}
        <motion.button onClick={reset} whileTap={{ scale: 0.99 }} className="btn-pay btn-pay-ghost w-full py-2.5">
          Create Another Escrow
        </motion.button>
      </div>
    );
  }

  return (
    <div className="pay-card p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-700/10 border border-emerald-500/25 flex items-center justify-center shrink-0">
          <Lock className="w-4 h-4 text-emerald-400" />
        </div>
        <div className="min-w-0">
          <h3 className="font-display text-sm font-semibold text-foreground leading-tight">Create Encrypted Escrow</h3>
          <p className="text-[10px] text-muted-foreground/45 tracking-widest mt-0.5 uppercase">cUSDC · FHE Locked</p>
        </div>
        <span className="ml-auto shrink-0 pay-badge pay-badge-emerald">cUSDC</span>
      </div>

      {/* USDC balance pill */}
      <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-[#3e73c4]/10 border border-[#3e73c4]/25">
        <UsdcIcon className="w-4 h-4 shrink-0" />
        <span className="text-[11px] text-white/60 font-medium tracking-wide">USDC Balance</span>
        <span className="ml-auto font-mono text-[14px] text-white font-semibold">
          {usdcBalance !== null ? usdcBalance : "—"}
        </span>
        <span className="text-[10px] text-[#3e73c4] font-semibold uppercase tracking-wider">USDC</span>
      </div>

      <p className="text-[12px] text-muted-foreground/55 leading-relaxed">
        Lock cUSDC in an encrypted escrow. The owner address and locked amount are both encrypted on-chain.
        You must have enough cUSDC balance (wrap USDC first in Dashboard tab).
      </p>

      {!isProcessing && (
        <div className="space-y-3">
          <div className="space-y-2">
            <label className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground/50 font-semibold">
              Owner / Recipient <span className="normal-case tracking-normal text-muted-foreground/30">(who can redeem)</span>
            </label>
            <input type="text" placeholder="0x… owner address" value={ownerAddr}
              onChange={(e) => setOwnerAddr(e.target.value)} className="pay-input font-mono" />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground/50 font-semibold">Amount (cUSDC)</label>
            <input type="number" placeholder="e.g. 100" value={amount}
              onChange={(e) => setAmount(e.target.value)} className="pay-input font-mono" />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground/50 font-semibold">
              Resolver Contract <span className="normal-case tracking-normal text-muted-foreground/30">(optional)</span>
            </label>
            <input type="text" placeholder="0x… or leave blank for no resolver" value={resolver}
              onChange={(e) => setResolver(e.target.value)} className="pay-input font-mono" />
            <p className="text-[11px] text-muted-foreground/35">Leave empty for unconditional escrow</p>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground/50 font-semibold">
              Resolver Data <span className="normal-case tracking-normal text-muted-foreground/30">(optional hex)</span>
            </label>
            <input type="text" placeholder="0x… or leave blank" value={resolverData}
              onChange={(e) => setResolverData(e.target.value)} className="pay-input font-mono" />
          </div>
        </div>
      )}

      {status !== "idle" && (
        <div className="rounded-lg bg-white/[0.025] border border-white/[0.07] p-4">
          {isProcessing && (
            <div className="flex items-center gap-2.5 mb-3">
              <Loader2 className="w-3.5 h-3.5 text-emerald-400 animate-spin shrink-0" />
              <span className="text-[12px] text-emerald-300">Creating &amp; funding escrow…</span>
            </div>
          )}
          <AsyncStepper status={status} stepIndex={stepIndex} />
        </div>
      )}

      {!isDone && (
        <motion.button onClick={handleCreate} disabled={isProcessing || isTxPending} whileTap={{ scale: 0.99 }}
          className="btn-pay btn-pay-emerald w-full py-2.5">
          <Plus className="w-3.5 h-3.5" />
          {isProcessing ? "Creating & Funding…" : "+ Create & Fund Escrow"}
        </motion.button>
      )}
    </div>
  );
}
