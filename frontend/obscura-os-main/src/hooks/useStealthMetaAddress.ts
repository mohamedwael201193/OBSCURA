import { useCallback, useEffect, useState } from "react";
import { useAccount, usePublicClient, useReadContract, useWalletClient, useWriteContract } from "wagmi";
import { arbitrumSepolia } from "viem/chains";
import {
  OBSCURA_STEALTH_REGISTRY_ABI,
  OBSCURA_STEALTH_REGISTRY_ADDRESS,
} from "@/config/pay";
import {
  generateMetaKeys,
  loadStoredMetaPublic,
  persistKeysEncrypted,
  unlockStoredKeys,
  hasStoredKeys,
  hasLegacyPlaintextKeys,
  type MetaAddressKeys,
  type MetaAddress,
} from "@/lib/stealth";
import { estimateCappedFees } from "@/lib/gas";

/**
 * Manages the connected wallet's stealth meta-address: generate locally,
 * persist private parts as an AES-GCM ciphertext (Phase 0.5.2 \u2014
 * encrypted at rest), and publish public parts to ObscuraStealthRegistry.
 */
export function useStealthMetaAddress() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const { writeContractAsync, isPending } = useWriteContract();
  // SYNC view: only the public meta we already published. Privkeys stay
  // sealed until the user takes an action that requires them \u2014 then we
  // call `unlock()` which prompts a single signMessage to derive the AES key.
  const [keysMeta, setKeysMeta] = useState<MetaAddress | null>(() =>
    loadStoredMetaPublic(address)
  );
  const [keys, setKeys] = useState<MetaAddressKeys | null>(null);
  const [needsMigration, setNeedsMigration] = useState<boolean>(() =>
    hasLegacyPlaintextKeys(address)
  );
  const [error, setError] = useState<string | null>(null);

  // Re-evaluate stored state when the connected account changes.
  useEffect(() => {
    setKeysMeta(loadStoredMetaPublic(address));
    setNeedsMigration(hasLegacyPlaintextKeys(address));
    setKeys(null); // never carry decrypted material across accounts
  }, [address]);

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

  /** Prompt the wallet for the keystore unlock signature and decrypt the
   *  stealth privkeys into memory. Idempotent: once unlocked in the same
   *  tab session, returns the cached value without re-prompting. */
  const unlock = useCallback(async (): Promise<MetaAddressKeys | null> => {
    if (!address || !walletClient) return null;
    if (keys) return keys;
    const k = await unlockStoredKeys(address, walletClient);
    if (k) {
      setKeys(k);
      setNeedsMigration(false);
    }
    return k;
  }, [address, walletClient, keys]);

  const generateAndPublish = useCallback(async () => {
    if (!address || !publicClient || !walletClient || !OBSCURA_STEALTH_REGISTRY_ADDRESS) {
      throw new Error("Wallet not connected");
    }
    setError(null);
    try {
      const fresh = generateMetaKeys();
      // Phase 0.5.2: encrypt privkeys before storing. Prompts signMessage.
      await persistKeysEncrypted(address, fresh, walletClient);
      setKeys(fresh);
      setKeysMeta(fresh.meta);
      setNeedsMigration(false);

      const fees = await estimateCappedFees(publicClient);

      const hash = await writeContractAsync({
        address: OBSCURA_STEALTH_REGISTRY_ADDRESS,
        abi: OBSCURA_STEALTH_REGISTRY_ABI,
        functionName: "setMetaAddress",
        args: [fresh.meta.spendingPubKey, fresh.meta.viewingPubKey],
        account: address,
        chain: arbitrumSepolia,
        gas: 500_000n,
        maxFeePerGas: fees.maxFeePerGas,
        maxPriorityFeePerGas: fees.maxPriorityFeePerGas,
      });
      await publicClient.waitForTransactionReceipt({ hash });
      await refetch();
      return fresh;
    } catch (e) {
      setError((e as Error).message);
      throw e;
    }
  }, [address, publicClient, walletClient, writeContractAsync, refetch]);

  return {
    keys,
    keysMeta,
    onChainMeta,
    generateAndPublish,
    unlock,
    needsMigration,
    isPending,
    error,
    refetch,
  };
}
