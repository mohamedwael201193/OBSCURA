import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Gift, Clock } from "lucide-react";
import { useAccount, useWriteContract, usePublicClient, useReadContract } from "wagmi";
import { arbitrumSepolia } from "viem/chains";
import { toast } from "sonner";
import { OBSCURA_TOKEN_ABI, OBSCURA_TOKEN_ADDRESS } from "@/config/contracts";

function formatCountdown(seconds: number): string {
  if (seconds <= 0) return "Available now";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h}h ${m.toString().padStart(2, "0")}m ${s.toString().padStart(2, "0")}s`;
}

export default function ClaimDailyObsForm() {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync, isPending } = useWriteContract();

  const [countdown, setCountdown] = useState<number | null>(null);
  const [isClaiming, setIsClaiming] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);

  const { data: nextClaimRaw, refetch: refetchCooldown } = useReadContract({
    address: OBSCURA_TOKEN_ADDRESS,
    abi: OBSCURA_TOKEN_ABI,
    functionName: "nextClaimIn",
    account: address,
    query: { enabled: !!OBSCURA_TOKEN_ADDRESS && !!address },
  });

  // Seed countdown from contract, then tick locally
  useEffect(() => {
    if (nextClaimRaw !== undefined) {
      setCountdown(Number(nextClaimRaw));
    }
  }, [nextClaimRaw]);

  useEffect(() => {
    if (countdown === null || countdown <= 0) return;
    const id = setInterval(() => {
      setCountdown((c) => {
        if (c === null || c <= 1) {
          clearInterval(id);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [countdown]);

  const canClaim = countdown === 0 || countdown === null;

  const handleClaim = async () => {
    if (!OBSCURA_TOKEN_ADDRESS || !address || !publicClient) {
      toast.error("Connect your wallet first");
      return;
    }
    try {
      setIsClaiming(true);
      const feeData = await publicClient.estimateFeesPerGas();
      const maxFeePerGas = feeData.maxFeePerGas
        ? (feeData.maxFeePerGas * 130n) / 100n
        : undefined;

      const hash = await writeContractAsync({
        address: OBSCURA_TOKEN_ADDRESS,
        abi: OBSCURA_TOKEN_ABI,
        functionName: "claimDailyTokens",
        account: address,
        chain: arbitrumSepolia,
        maxFeePerGas,
      });

      setTxHash(hash);
      toast.success("Claimed 100 $OBS! Check Employee tab to decrypt your balance.");
      // Reset countdown to 24h
      setCountdown(86400);
      refetchCooldown();
    } catch (err) {
      const msg = (err as Error).message ?? "Claim failed";
      if (msg.includes("Already claimed today")) {
        toast.error("Already claimed today — come back in 24 hours.");
        refetchCooldown();
      } else {
        toast.error(msg);
      }
    } finally {
      setIsClaiming(false);
    }
  };

  const isProcessing = isClaiming || isPending;

  return (
    <div className="glass-panel rounded-sm p-6 space-y-4">
      <div className="flex items-center gap-2">
        <Gift className="w-4 h-4 text-primary" />
        <h3 className="font-display text-sm tracking-wider text-foreground">
          Daily $OBS Claim
        </h3>
        <span className="ml-auto text-[8px] font-mono text-muted-foreground bg-primary/10 text-primary px-2 py-0.5 rounded-sm border border-primary/20">
          FREE · 100 $OBS / DAY
        </span>
      </div>

      <p className="text-[10px] font-mono text-muted-foreground/70">
        Claim 100 encrypted $OBS tokens once every 24 hours. No cost except gas.
        Your balance stays fully encrypted on-chain — only you can decrypt it.
      </p>

      {/* Cooldown display */}
      {isConnected && countdown !== null && countdown > 0 && (
        <div className="flex items-center gap-2 text-[10px] font-mono text-muted-foreground bg-secondary/50 rounded-sm px-3 py-2">
          <Clock className="w-3.5 h-3.5 text-primary/60" />
          <span>Next claim in:</span>
          <span className="text-primary font-medium tracking-widest">
            {formatCountdown(countdown)}
          </span>
        </div>
      )}

      {isConnected && (countdown === 0 || countdown === null) && (
        <div className="flex items-center gap-2 text-[10px] font-mono text-primary/80 bg-primary/5 border border-primary/20 rounded-sm px-3 py-2">
          <Gift className="w-3.5 h-3.5" />
          Ready to claim your 100 $OBS!
        </div>
      )}

      <motion.button
        onClick={handleClaim}
        disabled={!isConnected || isProcessing || (countdown !== null && countdown > 0)}
        whileHover={!isProcessing && canClaim ? { scale: 1.01 } : {}}
        whileTap={!isProcessing && canClaim ? { scale: 0.99 } : {}}
        className="w-full py-3 text-xs tracking-[0.2em] uppercase font-mono border border-primary/40 text-primary hover:bg-primary/10 transition-all rounded-sm disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {!isConnected
          ? "Connect Wallet to Claim"
          : isProcessing
          ? "Claiming..."
          : countdown !== null && countdown > 0
          ? `Claim Again in ${formatCountdown(countdown)}`
          : "⬡ Claim 100 $OBS"}
      </motion.button>

      {txHash && (
        <p className="text-[9px] font-mono text-muted-foreground/50 text-center">
          TX:{" "}
          <a
            href={`https://sepolia.arbiscan.io/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary/60 hover:text-primary"
          >
            {txHash.slice(0, 10)}...{txHash.slice(-8)}
          </a>
        </p>
      )}
    </div>
  );
}
