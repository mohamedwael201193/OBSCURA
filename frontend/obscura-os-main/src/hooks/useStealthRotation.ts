/**
 * useStealthRotation — wraps ObscuraStealthRotation V2 contract for the
 * "rotate meta-address" privacy operation. The history is append-only;
 * each rotate() emits a new MetaRotated event and bumps the index. Old
 * payments to previous metas remain decryptable because the recipient still
 * holds those private keys locally.
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
  OBSCURA_STEALTH_ROTATION_ABI,
  OBSCURA_STEALTH_ROTATION_ADDRESS,
} from "@/config/payV2";
import { estimateCappedFees } from "@/lib/gas";
import {
  generateMetaKeys,
  persistKeysEncrypted,
  type MetaAddress,
} from "@/lib/stealth";

export interface RotationCurrent {
  meta: MetaAddress;
  publishedAt: bigint;
  index: bigint;
}

export function useStealthRotation() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const { writeContractAsync } = useWriteContract();

  const [current, setCurrent] = useState<RotationCurrent | null>(null);
  const [historyLength, setHistoryLength] = useState<bigint>(0n);
  const [hasMeta, setHasMeta] = useState<boolean>(false);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!publicClient || !address || !OBSCURA_STEALTH_ROTATION_ADDRESS) {
      setCurrent(null);
      setHistoryLength(0n);
      setHasMeta(false);
      return;
    }
    try {
      const [hasMetaRes, len] = await Promise.all([
        publicClient.readContract({
          address: OBSCURA_STEALTH_ROTATION_ADDRESS,
          abi: OBSCURA_STEALTH_ROTATION_ABI,
          functionName: "hasMeta",
          args: [address],
        }) as Promise<boolean>,
        publicClient.readContract({
          address: OBSCURA_STEALTH_ROTATION_ADDRESS,
          abi: OBSCURA_STEALTH_ROTATION_ABI,
          functionName: "historyLength",
          args: [address],
        }) as Promise<bigint>,
      ]);
      setHasMeta(hasMetaRes);
      setHistoryLength(len);
      if (hasMetaRes) {
        const res = (await publicClient.readContract({
          address: OBSCURA_STEALTH_ROTATION_ADDRESS,
          abi: OBSCURA_STEALTH_ROTATION_ABI,
          functionName: "currentMeta",
          args: [address],
        })) as [`0x${string}`, `0x${string}`, bigint, bigint];
        setCurrent({
          meta: { spendingPubKey: res[0], viewingPubKey: res[1] },
          publishedAt: res[2],
          index: res[3],
        });
      } else {
        setCurrent(null);
      }
    } catch (e) {
      setError((e as Error).message);
    }
  }, [publicClient, address]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  /** Generate a fresh meta-address client-side, persist privkeys encrypted,
   *  and publish the new meta on-chain. The previous meta remains in history
   *  so old in-flight payments can still be received. */
  const rotate = useCallback(async () => {
    if (
      !publicClient ||
      !walletClient ||
      !address ||
      !OBSCURA_STEALTH_ROTATION_ADDRESS
    ) {
      throw new Error("Wallet or contract not configured");
    }
    setIsPending(true);
    setError(null);
    try {
      const fresh = generateMetaKeys();
      // 1. Persist locally first so we never lose the privkeys if tx fails.
      await persistKeysEncrypted(address, fresh, walletClient);

      // 2. Publish on chain.
      const fees = await estimateCappedFees(publicClient);
      const hash = await writeContractAsync({
        address: OBSCURA_STEALTH_ROTATION_ADDRESS,
        abi: OBSCURA_STEALTH_ROTATION_ABI,
        functionName: "rotate",
        args: [fresh.meta.spendingPubKey, fresh.meta.viewingPubKey],
        account: address,
        chain: arbitrumSepolia,
        maxFeePerGas: fees.maxFeePerGas,
        maxPriorityFeePerGas: fees.maxPriorityFeePerGas,
        gas: 250_000n,
      });
      await publicClient.waitForTransactionReceipt({ hash });
      await refresh();
      return { hash, meta: fresh.meta };
    } catch (e) {
      setError((e as Error).message);
      throw e;
    } finally {
      setIsPending(false);
    }
  }, [publicClient, walletClient, writeContractAsync, address, refresh]);

  const fetchMetaAt = useCallback(
    async (idx: bigint): Promise<{
      meta: MetaAddress;
      publishedAt: bigint;
      active: boolean;
    } | null> => {
      if (!publicClient || !address || !OBSCURA_STEALTH_ROTATION_ADDRESS) return null;
      try {
        const res = (await publicClient.readContract({
          address: OBSCURA_STEALTH_ROTATION_ADDRESS,
          abi: OBSCURA_STEALTH_ROTATION_ABI,
          functionName: "metaAt",
          args: [address, idx],
        })) as [`0x${string}`, `0x${string}`, bigint, boolean];
        return {
          meta: { spendingPubKey: res[0], viewingPubKey: res[1] },
          publishedAt: res[2],
          active: res[3],
        };
      } catch {
        return null;
      }
    },
    [publicClient, address]
  );

  return {
    current,
    historyLength,
    hasMeta,
    isPending,
    error,
    rotate,
    refresh,
    fetchMetaAt,
  };
}
