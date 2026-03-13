/**
 * useSocialResolver — handle ↔ meta-address registry.
 *
 *   Anyone can `selfRegister(handle, ...)` to claim a fresh handle (marked
 *   self-claimed in the registry, so resolvers can show a warning).
 *
 *   `registerWithEnsProof` accepts an EIP-191 signature from the configured
 *   `ensVerifier` to mint a verified handle (e.g. ENS-bound).
 *
 *   The on-chain meta is stored as `(bytes32 X, uint8 prefix)` for both
 *   spending & viewing pubkeys — we compress/decompress the standard 33-byte
 *   secp256k1 compressed form here.
 */
import { useCallback, useEffect, useState } from "react";
import {
  useAccount,
  usePublicClient,
  useWalletClient,
  useWriteContract,
} from "wagmi";
import { arbitrumSepolia } from "viem/chains";
import { hexToBytes, bytesToHex } from "viem";
import {
  OBSCURA_SOCIAL_RESOLVER_ABI,
  OBSCURA_SOCIAL_RESOLVER_ADDRESS,
} from "@/config/payV2";
import { estimateCappedFees } from "@/lib/gas";
import type { MetaAddress } from "@/lib/stealth";

/** Split a 33-byte compressed pubkey into (X bytes32, prefix uint8). */
function splitCompressedPubKey(compressed: `0x${string}`): {
  x: `0x${string}`;
  prefix: number;
} {
  const bytes = hexToBytes(compressed);
  if (bytes.length !== 33) {
    throw new Error(`Compressed pubkey must be 33 bytes, got ${bytes.length}`);
  }
  return {
    prefix: bytes[0],
    x: bytesToHex(bytes.slice(1)) as `0x${string}`,
  };
}

/** Re-assemble (X bytes32, prefix uint8) into a 33-byte compressed pubkey. */
function joinCompressedPubKey(x: `0x${string}`, prefix: number): `0x${string}` {
  const xb = hexToBytes(x);
  const out = new Uint8Array(33);
  out[0] = prefix;
  out.set(xb, 1);
  return bytesToHex(out) as `0x${string}`;
}

export interface ResolvedHandle {
  owner: `0x${string}`;
  meta: MetaAddress;
  selfClaimed: boolean;
}

export function useSocialResolver() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const { writeContractAsync } = useWriteContract();

  const [myHandles, setMyHandles] = useState<`0x${string}`[]>([]);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!publicClient || !address || !OBSCURA_SOCIAL_RESOLVER_ADDRESS) {
      setMyHandles([]);
      return;
    }
    try {
      const handleHashes = (await publicClient.readContract({
        address: OBSCURA_SOCIAL_RESOLVER_ADDRESS,
        abi: OBSCURA_SOCIAL_RESOLVER_ABI,
        functionName: "handlesByOwner",
        args: [address],
      })) as `0x${string}`[];
      setMyHandles(handleHashes);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [publicClient, address]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const resolve = useCallback(
    async (handle: string): Promise<ResolvedHandle | null> => {
      if (!publicClient || !OBSCURA_SOCIAL_RESOLVER_ADDRESS) return null;
      try {
        const res = (await publicClient.readContract({
          address: OBSCURA_SOCIAL_RESOLVER_ADDRESS,
          abi: OBSCURA_SOCIAL_RESOLVER_ABI,
          functionName: "resolve",
          args: [handle],
        })) as [`0x${string}`, `0x${string}`, `0x${string}`, number, number, boolean];
        const [owner, sX, vX, sPrefix, vPrefix, selfClaimed] = res;
        if (owner === "0x0000000000000000000000000000000000000000") return null;
        return {
          owner,
          meta: {
            spendingPubKey: joinCompressedPubKey(sX, sPrefix),
            viewingPubKey: joinCompressedPubKey(vX, vPrefix),
          },
          selfClaimed,
        };
      } catch {
        return null;
      }
    },
    [publicClient]
  );

  const selfRegister = useCallback(
    async (handle: string, meta: MetaAddress) => {
      if (!publicClient || !walletClient || !address || !OBSCURA_SOCIAL_RESOLVER_ADDRESS) {
        throw new Error("Wallet or contract not configured");
      }
      const trimmed = handle.trim().toLowerCase();
      if (!trimmed) throw new Error("Handle cannot be empty");
      setIsPending(true);
      setError(null);
      try {
        const s = splitCompressedPubKey(meta.spendingPubKey);
        const v = splitCompressedPubKey(meta.viewingPubKey);
        const fees = await estimateCappedFees(publicClient);
        const hash = await writeContractAsync({
          address: OBSCURA_SOCIAL_RESOLVER_ADDRESS,
          abi: OBSCURA_SOCIAL_RESOLVER_ABI,
          functionName: "selfRegister",
          args: [trimmed, s.x, v.x, s.prefix, v.prefix],
          account: address,
          chain: arbitrumSepolia,
          maxFeePerGas: fees.maxFeePerGas,
          maxPriorityFeePerGas: fees.maxPriorityFeePerGas,
          gas: 200_000n,
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

  const registerWithEnsProof = useCallback(
    async (handle: string, meta: MetaAddress, ensSignature: `0x${string}`) => {
      if (!publicClient || !walletClient || !address || !OBSCURA_SOCIAL_RESOLVER_ADDRESS) {
        throw new Error("Wallet or contract not configured");
      }
      const trimmed = handle.trim().toLowerCase();
      if (!trimmed) throw new Error("Handle cannot be empty");
      setIsPending(true);
      setError(null);
      try {
        const s = splitCompressedPubKey(meta.spendingPubKey);
        const v = splitCompressedPubKey(meta.viewingPubKey);
        const fees = await estimateCappedFees(publicClient);
        const hash = await writeContractAsync({
          address: OBSCURA_SOCIAL_RESOLVER_ADDRESS,
          abi: OBSCURA_SOCIAL_RESOLVER_ABI,
          functionName: "registerWithEnsProof",
          args: [trimmed, s.x, v.x, s.prefix, v.prefix, ensSignature],
          account: address,
          chain: arbitrumSepolia,
          maxFeePerGas: fees.maxFeePerGas,
          maxPriorityFeePerGas: fees.maxPriorityFeePerGas,
          gas: 240_000n,
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

  const updateMeta = useCallback(
    async (handle: string, meta: MetaAddress) => {
      if (!publicClient || !walletClient || !address || !OBSCURA_SOCIAL_RESOLVER_ADDRESS) {
        throw new Error("Wallet or contract not configured");
      }
      setIsPending(true);
      setError(null);
      try {
        const s = splitCompressedPubKey(meta.spendingPubKey);
        const v = splitCompressedPubKey(meta.viewingPubKey);
        const fees = await estimateCappedFees(publicClient);
        const hash = await writeContractAsync({
          address: OBSCURA_SOCIAL_RESOLVER_ADDRESS,
          abi: OBSCURA_SOCIAL_RESOLVER_ABI,
          functionName: "updateMeta",
          args: [handle.trim().toLowerCase(), s.x, v.x, s.prefix, v.prefix],
          account: address,
          chain: arbitrumSepolia,
          maxFeePerGas: fees.maxFeePerGas,
          maxPriorityFeePerGas: fees.maxPriorityFeePerGas,
          gas: 120_000n,
        });
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

  const transferHandle = useCallback(
    async (handle: string, newOwner: `0x${string}`) => {
      if (!publicClient || !walletClient || !address || !OBSCURA_SOCIAL_RESOLVER_ADDRESS) {
        throw new Error("Wallet or contract not configured");
      }
      setIsPending(true);
      setError(null);
      try {
        const fees = await estimateCappedFees(publicClient);
        const hash = await writeContractAsync({
          address: OBSCURA_SOCIAL_RESOLVER_ADDRESS,
          abi: OBSCURA_SOCIAL_RESOLVER_ABI,
          functionName: "transferHandle",
          args: [handle.trim().toLowerCase(), newOwner],
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

  return {
    myHandles,
    isPending,
    error,
    refresh,
    resolve,
    selfRegister,
    registerWithEnsProof,
    updateMeta,
    transferHandle,
  };
}
