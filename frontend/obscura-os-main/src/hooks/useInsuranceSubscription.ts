/**
 * useInsuranceSubscription — wraps ObscuraInsuranceSubscription for the
 * "auto-insure each cycle of stream X" recurring authorization. The
 * subscription contract is the only authorized consumer: each payroll cycle
 * calls `consume()` to draw a single insurance premium up to the encrypted
 * cap the subscriber set at subscription-time.
 *
 * Anti-regression: subscribing requires the cUSDC operator authorization
 * for the subscription contract — `ensureOperator` is wired in here.
 */
import { useCallback, useEffect, useState } from "react";
import {
  useAccount,
  usePublicClient,
  useWalletClient,
  useWriteContract,
} from "wagmi";
import { arbitrumSepolia } from "viem/chains";
import {
  OBSCURA_INSURANCE_SUBSCRIPTION_ABI,
  OBSCURA_INSURANCE_SUBSCRIPTION_ADDRESS,
} from "@/config/payV2";
import { estimateCappedFees } from "@/lib/gas";
import { ensureOperator } from "@/lib/operators";
import { encryptAmount, initFHEClient } from "@/lib/fhe";

export interface SubscriptionRow {
  subId: bigint;
  subscriber: `0x${string}`;
  streamId: bigint;
  maxCycles: bigint;
  cyclesConsumed: bigint;
  periodSeconds: bigint;
  lastConsumedAt: bigint;
  active: boolean;
}

export function useInsuranceSubscription() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const { writeContractAsync } = useWriteContract();

  const [subscriptions, setSubscriptions] = useState<SubscriptionRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!publicClient || !address || !OBSCURA_INSURANCE_SUBSCRIPTION_ADDRESS) {
      setSubscriptions([]);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const ids = (await publicClient.readContract({
        address: OBSCURA_INSURANCE_SUBSCRIPTION_ADDRESS,
        abi: OBSCURA_INSURANCE_SUBSCRIPTION_ABI,
        functionName: "subsBySubscriber",
        args: [address],
      })) as bigint[];

      const rows: SubscriptionRow[] = [];
      for (const id of ids) {
        try {
          const r = (await publicClient.readContract({
            address: OBSCURA_INSURANCE_SUBSCRIPTION_ADDRESS,
            abi: OBSCURA_INSURANCE_SUBSCRIPTION_ABI,
            functionName: "getSubscription",
            args: [id],
          })) as [`0x${string}`, bigint, bigint, bigint, bigint, bigint, boolean];
          rows.push({
            subId: id,
            subscriber: r[0],
            streamId: r[1],
            maxCycles: r[2],
            cyclesConsumed: r[3],
            periodSeconds: r[4],
            lastConsumedAt: r[5],
            active: r[6],
          });
        } catch {
          // skip
        }
      }
      setSubscriptions(rows);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, [publicClient, address]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const subscribe = useCallback(
    async (params: {
      streamId: bigint;
      maxCycles: bigint;
      periodSeconds: bigint;
      maxPremiumPerCycle: bigint; // raw uint64 USDC (6 decimals)
    }) => {
      if (
        !publicClient ||
        !walletClient ||
        !address ||
        !OBSCURA_INSURANCE_SUBSCRIPTION_ADDRESS
      ) {
        throw new Error("Wallet or contract not configured");
      }
      setIsPending(true);
      setError(null);
      try {
        // Operator authorization for the subscription contract (it pulls cUSDC).
        await ensureOperator(
          publicClient,
          walletClient,
          address,
          OBSCURA_INSURANCE_SUBSCRIPTION_ADDRESS
        );
        await initFHEClient(publicClient, walletClient);
        const enc = await encryptAmount(params.maxPremiumPerCycle);

        const fees = await estimateCappedFees(publicClient);
        const hash = await writeContractAsync({
          address: OBSCURA_INSURANCE_SUBSCRIPTION_ADDRESS,
          abi: OBSCURA_INSURANCE_SUBSCRIPTION_ABI,
          functionName: "subscribe",
          args: [params.streamId, params.maxCycles, params.periodSeconds, enc[0]],
          account: address,
          chain: arbitrumSepolia,
          maxFeePerGas: fees.maxFeePerGas,
          maxPriorityFeePerGas: fees.maxPriorityFeePerGas,
          gas: 600_000n,
        });
        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        await refresh();
        return { hash, receipt };
      } catch (e) {
        setError((e as Error).message);
        throw e;
      } finally {
        setIsPending(false);
      }
    },
    [publicClient, walletClient, writeContractAsync, address, refresh]
  );

  const cancel = useCallback(
    async (subId: bigint) => {
      if (
        !publicClient ||
        !walletClient ||
        !address ||
        !OBSCURA_INSURANCE_SUBSCRIPTION_ADDRESS
      ) {
        throw new Error("Wallet or contract not configured");
      }
      setIsPending(true);
      setError(null);
      try {
        const fees = await estimateCappedFees(publicClient);
        const hash = await writeContractAsync({
          address: OBSCURA_INSURANCE_SUBSCRIPTION_ADDRESS,
          abi: OBSCURA_INSURANCE_SUBSCRIPTION_ABI,
          functionName: "cancel",
          args: [subId],
          account: address,
          chain: arbitrumSepolia,
          maxFeePerGas: fees.maxFeePerGas,
          maxPriorityFeePerGas: fees.maxPriorityFeePerGas,
          gas: 100_000n,
        });
        await publicClient.waitForTransactionReceipt({ hash });
        await refresh();
        return hash;
      } catch (e) {
        setError((e as Error).message);
        throw e;
      } finally {
        setIsPending(false);
      }
    },
    [publicClient, walletClient, writeContractAsync, address, refresh]
  );

  return { subscriptions, isLoading, isPending, error, refresh, subscribe, cancel };
}
