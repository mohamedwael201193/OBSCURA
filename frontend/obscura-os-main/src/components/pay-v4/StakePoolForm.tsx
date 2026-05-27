import { motion } from "framer-motion";
import { Landmark, Loader2 } from "lucide-react";
import { useState } from "react";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";
import { toast } from "sonner";
import {
  FHERC20_ABI,
  INSURANCE_POOL_ADDRESS,
  INSURANCE_POOL_ABI,
} from "@/config/pay";
import { OBSCURA_PAY_OCUSDC_ADDRESS } from "@/config/payV3";
import { initFHEClient, encryptAmount } from "@/lib/fhe";
import { useUnifiedWrite } from "@/hooks/useUnifiedWrite";

export default function StakePoolForm() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const { write } = useUnifiedWrite();
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);

  const handleStake = async () => {
    if (!publicClient || !walletClient || !address) {
      toast.error("Connect wallet first");
      return;
    }
    if (!INSURANCE_POOL_ADDRESS || !OBSCURA_PAY_OCUSDC_ADDRESS) {
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
      const untilTimestamp = BigInt(Math.floor(Date.now() / 1000) + 30 * 86400);

      const authTx = await write({
        address: OBSCURA_PAY_OCUSDC_ADDRESS,
        abi: FHERC20_ABI,
        functionName: "setOperator",
        args: [INSURANCE_POOL_ADDRESS as `0x${string}`, untilTimestamp],
        gas: 100_000n,
        mode: "eoa", // operator approval must always be EOA
      });
      if (publicClient) await publicClient.waitForTransactionReceipt({ hash: authTx });

      // Wait to avoid RPC rate-limit
      await new Promise((r) => setTimeout(r, 2000));

      // 3. Stake into the pool
      toast.info("Step 2/2: Staking into insurance pool…");

      const stakeTx = await write({
        address: INSURANCE_POOL_ADDRESS as `0x${string}`,
        abi: INSURANCE_POOL_ABI,
        functionName: "stake",
        args: [encrypted[0]],
        gas: 800_000n,
        mode: "eoa",
      });
      if (publicClient) await publicClient.waitForTransactionReceipt({ hash: stakeTx });

      toast.success(`Staked ${parsed} ocUSDC into insurance pool`);
      setAmount("");
    } catch (e) {
      console.error("[StakePool]", e);
      toast.error((e as Error).message || "Stake failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-muted hairline">
          <Landmark className="w-4 h-4 text-foreground" />
        </div>
        <div className="min-w-0">
          <h3 className="font-display text-lg text-foreground leading-tight">Stake to Insurance Pool</h3>
          <p className="text-[10px] text-muted-foreground/45 tracking-widest mt-0.5 uppercase">Earn Yield · ocUSDC</p>
        </div>
        <span className="ml-auto shrink-0 inline-flex items-center gap-1.5 rounded-full bg-muted border border-border px-2 py-0.5 text-[10.5px] font-medium text-foreground/75">LP Yield</span>
      </div>

      <p className="text-sm text-muted-foreground leading-relaxed">
        Deposit ocUSDC into the insurance pool so dispute payouts can be funded.
        Anyone can stake — you earn a share of premiums paid by coverage buyers.
        The staked amount is fully encrypted.
      </p>

      <div className="space-y-2">
        <label className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground/50 font-semibold">
          Amount to stake (ocUSDC)
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
            className="btn-pay btn-pay-primary px-5"
          >
            {busy ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Staking…</> : "Stake"}
          </motion.button>
        </div>
      </div>
    </div>
  );
}
