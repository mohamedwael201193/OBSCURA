import { motion } from "framer-motion";
import { Landmark, Loader2 } from "lucide-react";
import { useState } from "react";
import { useAccount, usePublicClient, useWalletClient, useWriteContract } from "wagmi";
import { arbitrumSepolia } from "viem/chains";
import { toast } from "sonner";
import {
  REINEIRA_CUSDC_ABI,
  REINEIRA_CUSDC_ADDRESS,
  REINEIRA_INSURANCE_POOL_ADDRESS,
  REINEIRA_INSURANCE_POOL_ABI,
} from "@/config/pay";
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

      // 2. Authorize the pool as operator (time-bounded, 30 days)
      toast.info("Step 1/2: Authorizing pool as operator…");
      const feeData = await publicClient.estimateFeesPerGas();
      const maxFee = feeData.maxFeePerGas ? (feeData.maxFeePerGas * 130n) / 100n : undefined;
      const untilTimestamp = BigInt(Math.floor(Date.now() / 1000) + 30 * 86400);

      const authTx = await writeContractAsync({
        address: REINEIRA_CUSDC_ADDRESS,
        abi: REINEIRA_CUSDC_ABI,
        functionName: "setOperator",
        args: [REINEIRA_INSURANCE_POOL_ADDRESS as `0x${string}`, untilTimestamp],
        account: address,
        chain: arbitrumSepolia,
        maxFeePerGas: maxFee,
        gas: 100_000n,
      });
      await publicClient.waitForTransactionReceipt({ hash: authTx });

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
    <div className="pay-card p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-700/10 border border-amber-500/25 flex items-center justify-center shrink-0">
          <Landmark className="w-4 h-4 text-amber-400" />
        </div>
        <div className="min-w-0">
          <h3 className="font-display text-sm font-semibold text-foreground leading-tight">Stake to Insurance Pool</h3>
          <p className="text-[10px] text-muted-foreground/45 tracking-widest mt-0.5 uppercase">Earn Yield · cUSDC</p>
        </div>
        <span className="ml-auto shrink-0 pay-badge pay-badge-amber">LP YIELD</span>
      </div>

      <p className="text-[12px] text-muted-foreground/55 leading-relaxed">
        Deposit cUSDC into the insurance pool so dispute payouts can be funded.
        Anyone can stake — you earn a share of premiums paid by coverage buyers.
        The staked amount is fully encrypted.
      </p>

      <div className="space-y-2">
        <label className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground/50 font-semibold">
          Amount to Stake (cUSDC)
        </label>
        <div className="flex gap-2">
          <input
            type="number"
            placeholder="e.g. 10"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="pay-input flex-1 font-mono"
          />
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={handleStake}
            disabled={busy || !amount}
            className="btn-pay btn-pay-amber px-5"
          >
            {busy ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Staking…</> : "Stake"}
          </motion.button>
        </div>
      </div>
    </div>
  );
}
