import { useCallback, useState } from "react";
import { useAccount, usePublicClient, useWalletClient, useWriteContract } from "wagmi";
import { arbitrumSepolia } from "viem/chains";
import {
  OBSCURA_PAY_STREAM_ABI,
  OBSCURA_PAY_STREAM_ADDRESS,
} from "@/config/pay";
import { estimateCappedFees } from "@/lib/gas";

/**
 * useCreateStream — schedules a new recurring payroll stream.
 * Note: employer must SEPARATELY approve cUSDC spend to the stream
 * contract before the first tick. The UI should walk through that step.
 */
export function useCreateStream() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const { writeContractAsync } = useWriteContract();
  const [isPending, setIsPending] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const create = useCallback(
    async (params: {
      recipientHint: `0x${string}`;
      periodSeconds: number;
      startTime: number;
      endTime: number;
    }) => {
      if (!publicClient || !walletClient || !OBSCURA_PAY_STREAM_ADDRESS) {
        throw new Error("Wallet or contract not configured");
      }
      setIsPending(true);
      setError(null);
      try {
        const fees = await estimateCappedFees(publicClient);

        const hash = await writeContractAsync({
          address: OBSCURA_PAY_STREAM_ADDRESS,
          abi: OBSCURA_PAY_STREAM_ABI,
          functionName: "createStream",
          args: [
            params.recipientHint,
            BigInt(params.periodSeconds),
            BigInt(params.startTime),
            BigInt(params.endTime),
          ],
          account: address,
          chain: arbitrumSepolia,
          maxFeePerGas: fees.maxFeePerGas,
          maxPriorityFeePerGas: fees.maxPriorityFeePerGas,
          gas: 300_000n,
        });
        setTxHash(hash);
        await publicClient.waitForTransactionReceipt({ hash });
        return hash;
      } catch (e) {
        setError((e as Error).message);
        throw e;
      } finally {
        setIsPending(false);
      }
    },
    [publicClient, walletClient, writeContractAsync, address]
  );

  return { create, isPending, txHash, error };
}
