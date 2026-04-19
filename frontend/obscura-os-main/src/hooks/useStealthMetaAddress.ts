import { useCallback, useState } from "react";
import { useAccount, usePublicClient, useReadContract, useWriteContract } from "wagmi";
import { arbitrumSepolia } from "viem/chains";
import {
  OBSCURA_STEALTH_REGISTRY_ABI,
  OBSCURA_STEALTH_REGISTRY_ADDRESS,
} from "@/config/wave2";
import {
  generateMetaKeys,
  loadStoredKeys,
  persistKeys,
  type MetaAddressKeys,
  type MetaAddress,
} from "@/lib/stealth";

/**
 * Manages the connected wallet's stealth meta-address: generate locally,
 * persist private parts in localStorage, and publish public parts to
 * ObscuraStealthRegistry.
 */
export function useStealthMetaAddress() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync, isPending } = useWriteContract();
  const [keys, setKeys] = useState<MetaAddressKeys | null>(() => loadStoredKeys(address));
  const [error, setError] = useState<string | null>(null);

  const { data: onChain, refetch } = useReadContract({
    address: OBSCURA_STEALTH_REGISTRY_ADDRESS,
    abi: OBSCURA_STEALTH_REGISTRY_ABI,
    functionName: "getMetaAddress",
    args: address ? [address] : undefined,
    query: { enabled: !!address && !!OBSCURA_STEALTH_REGISTRY_ADDRESS },
  });

  const onChainMeta: MetaAddress | null = onChain
    ? (() => {
        const [s, v, ts] = onChain as readonly [`0x${string}`, `0x${string}`, bigint];
        return ts > 0n ? { spendingPubKey: s, viewingPubKey: v } : null;
      })()
    : null;

  const generateAndPublish = useCallback(async () => {
    if (!address || !publicClient || !OBSCURA_STEALTH_REGISTRY_ADDRESS) {
      throw new Error("Wallet not connected");
    }
    setError(null);
    try {
      const fresh = generateMetaKeys();
      persistKeys(address, fresh);
      setKeys(fresh);

      const feeData = await publicClient.estimateFeesPerGas();
      const maxFeePerGas = feeData.maxFeePerGas
        ? (feeData.maxFeePerGas * 130n) / 100n
        : undefined;

      const hash = await writeContractAsync({
        address: OBSCURA_STEALTH_REGISTRY_ADDRESS,
        abi: OBSCURA_STEALTH_REGISTRY_ABI,
        functionName: "setMetaAddress",
        args: [fresh.meta.spendingPubKey, fresh.meta.viewingPubKey],
        account: address,
        chain: arbitrumSepolia,
        gas: 500_000n,
        maxFeePerGas,
      });
      await publicClient.waitForTransactionReceipt({ hash });
      await refetch();
      return fresh;
    } catch (e) {
      setError((e as Error).message);
      throw e;
    }
  }, [address, writeContractAsync, refetch]);

  return {
    keys,
    onChainMeta,
    generateAndPublish,
    isPending,
    error,
    refetch,
  };
}
