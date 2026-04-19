import { motion } from "framer-motion";
import { Landmark } from "lucide-react";
import { useState } from "react";
import { useAccount, usePublicClient, useWalletClient, useWriteContract } from "wagmi";
import { arbitrumSepolia } from "viem/chains";
import { toast } from "sonner";
import {
  REINEIRA_CUSDC_ABI,
  REINEIRA_CUSDC_ADDRESS,
  REINEIRA_INSURANCE_POOL_ADDRESS,
  REINEIRA_INSURANCE_POOL_ABI,
} from "@/config/wave2";
import { initFHEClient, encryptAmount } from "@/lib/fhe";

export default function StakePoolForm() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const { writeContractAsync } = useWriteContract();
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);

  const handleStake = async () => {
    if (!publicClient || !walletClient || !address) {
      toast.error("Connect wallet first");
      return;
    }
    if (!REINEIRA_INSURANCE_POOL_ADDRESS || !REINEIRA_CUSDC_ADDRESS) {
      toast.error("Insurance pool not configured");
      return;
    }
    const parsed = Number(amount);
    if (!parsed || parsed <= 0) {
      toast.error("Enter a valid amount");
      return;
    }

    setBusy(true);
    try {
      const rawAmount = BigInt(Math.floor(parsed * 1_000_000));

      // 1. Init FHE + encrypt the stake amount
      toast.info("Encrypting stake amount…");
      await initFHEClient(publicClient, walletClient);
      const encrypted = await encryptAmount(rawAmount);
      const ctHash = (encrypted[0] as { ctHash: bigint }).ctHash;

      // 2. Approve the pool to spend cUSDC (pass the ct handle)
      toast.info("Step 1/2: Approving pool to spend cUSDC…");
      const feeData = await publicClient.estimateFeesPerGas();
      const maxFee = feeData.maxFeePerGas ? (feeData.maxFeePerGas * 130n) / 100n : undefined;

      const approveTx = await writeContractAsync({
        address: REINEIRA_CUSDC_ADDRESS,
        abi: REINEIRA_CUSDC_ABI,
        functionName: "approve",
        args: [REINEIRA_INSURANCE_POOL_ADDRESS as `0x${string}`, ctHash],
        account: address,
        chain: arbitrumSepolia,
        maxFeePerGas: maxFee,
        gas: 300_000n,
      });
      await publicClient.waitForTransactionReceipt({ hash: approveTx });

      // Wait to avoid RPC rate-limit
      await new Promise((r) => setTimeout(r, 2000));

      // 3. Stake into the pool
      toast.info("Step 2/2: Staking into insurance pool…");
      const feeData2 = await publicClient.estimateFeesPerGas();
      const maxFee2 = feeData2.maxFeePerGas ? (feeData2.maxFeePerGas * 130n) / 100n : undefined;

      const stakeTx = await writeContractAsync({
        address: REINEIRA_INSURANCE_POOL_ADDRESS as `0x${string}`,
        abi: REINEIRA_INSURANCE_POOL_ABI,
        functionName: "stake",
        args: [encrypted[0]],
        account: address,
        chain: arbitrumSepolia,
        maxFeePerGas: maxFee2,
        gas: 800_000n,
      });
      await publicClient.waitForTransactionReceipt({ hash: stakeTx });

      toast.success(`Staked ${parsed} cUSDC into insurance pool!`);
      setAmount("");
    } catch (e) {
      console.error("[StakePool]", e);
      toast.error((e as Error).message || "Stake failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="glass-panel rounded-sm p-6 space-y-4">
      <div className="flex items-center gap-2">
        <Landmark className="w-4 h-4 text-primary" />
        <h3 className="font-display text-sm tracking-wider text-foreground">Stake to Insurance Pool</h3>
        <span className="ml-auto text-[8px] font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-sm border border-cyan-500/20">
          SEED LIQUIDITY
        </span>
      </div>

      <p className="text-[10px] font-mono text-muted-foreground/70">
        Deposit cUSDC into the insurance pool so dispute payouts can be funded.
        Anyone can stake — you earn a share of premiums paid by coverage buyers.
        The staked amount is fully encrypted.
      </p>

      <div>
        <label className="text-[9px] font-mono text-muted-foreground tracking-[0.15em] uppercase block mb-1.5">
          Amount to Stake (cUSDC)
        </label>
        <div className="flex gap-2">
          <input
            type="number"
            placeholder="10"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="flex-1 px-3 py-2 bg-background border border-border/50 rounded-sm text-xs font-mono"
          />
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={handleStake}
            disabled={busy || !amount}
            className="px-4 py-2 text-[10px] tracking-[0.2em] uppercase font-mono bg-primary text-primary-foreground rounded-sm disabled:opacity-50"
          >
            {busy ? "Staking…" : "Stake"}
          </motion.button>
        </div>
      </div>
    </div>
  );
}
