/**
 * usePayStreamV2 — wraps the privacy-hardened V2 stream contract.
 *
 *   • Encrypts the recipient hint as `eaddress` so observers can't link the
 *     stream-id to a wallet (V1 leaked it as plaintext bytes32).
 *   • Adds `jitterSeconds`: the contract honours `lastTickTime + period` exactly
 *     (no jitter accumulation — Wave 3 fix), but each tick can fall anywhere
 *     within the jitter window so observers can't time-correlate cycles.
 *   • `tickStream` requires a per-cycle salt; we keep them in
 *     `obscura.stream.salts.v1:<addr>:<streamId>` so the same salt can be
 *     reused for the matching `PayrollResolverV2.cancel/approve` call.
 */
import { useCallback, useEffect, useState } from "react";
import {
  useAccount,
  usePublicClient,
  useWalletClient,
  useWriteContract,
} from "wagmi";
import { arbitrumSepolia } from "viem/chains";
import { keccak256, toHex } from "viem";
import {
  OBSCURA_PAY_STREAM_V2_ABI,
  OBSCURA_PAY_STREAM_V2_ADDRESS,
} from "@/config/payV2";
import { estimateCappedFees } from "@/lib/gas";
import { ensureOperator } from "@/lib/operators";
import { encryptAddress, encryptAmount, initFHEClient } from "@/lib/fhe";
import { getJSON, setJSON } from "@/lib/scopedStorage";
import {
  loadStoredMetaPublic,
  deriveStealthPayment,
  type MetaAddress,
  type StealthPayment,
} from "@/lib/stealth";

const SALT_KEY = "obscura.stream.salts.v1";
type SaltMap = Record<string, string[]>; // streamId -> [salt0x, salt0x, ...]

function makeSalt(streamId: bigint, account: `0x${string}`, idx: number): `0x${string}` {
  // Deterministic but un-guessable — keccak(account||streamId||idx||randomNonce)
  const nonce = crypto.getRandomValues(new Uint32Array(4));
  const nonceHex = Array.from(nonce)
    .map((n) => n.toString(16).padStart(8, "0"))
    .join("");
  return keccak256(
    toHex(`${account.toLowerCase()}|${streamId.toString()}|${idx}|${nonceHex}`)
  );
}

export interface StreamRow {
  streamId: bigint;
  employer: `0x${string}`;
  periodSeconds: bigint;
  startTime: bigint;
  endTime: bigint;
  lastTickTime: bigint;
  jitterSeconds: number;
  cyclesPaid: bigint;
  paused: boolean;
}

export function usePayStreamV2() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const { writeContractAsync } = useWriteContract();

  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createStream = useCallback(
    async (params: {
      recipientAddress: `0x${string}`;
      periodSeconds: number;
      startTime: number;
      endTime: number;
      jitterSeconds?: number;
    }): Promise<{ hash: `0x${string}`; streamId: bigint }> => {
      if (
        !publicClient ||
        !walletClient ||
        !address ||
        !OBSCURA_PAY_STREAM_V2_ADDRESS
      ) {
        throw new Error("Wallet or contract not configured");
      }
      setIsPending(true);
      setError(null);
      try {
        await ensureOperator(
          publicClient,
          walletClient,
          address,
          OBSCURA_PAY_STREAM_V2_ADDRESS
        );
        await initFHEClient(publicClient, walletClient);
        const enc = await encryptAddress(params.recipientAddress);
        const fees = await estimateCappedFees(publicClient);
        const hash = await writeContractAsync({
          address: OBSCURA_PAY_STREAM_V2_ADDRESS,
          abi: OBSCURA_PAY_STREAM_V2_ABI,
          functionName: "createStream",
          args: [
            enc[0],
            BigInt(params.periodSeconds),
            BigInt(params.startTime),
            BigInt(params.endTime),
            params.jitterSeconds ?? 0,
          ],
          account: address,
          chain: arbitrumSepolia,
          maxFeePerGas: fees.maxFeePerGas,
          maxPriorityFeePerGas: fees.maxPriorityFeePerGas,
          gas: 800_000n,
        });
        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        // Read streamCount-1 to get the new stream id.
        const count = (await publicClient.readContract({
          address: OBSCURA_PAY_STREAM_V2_ADDRESS,
          abi: OBSCURA_PAY_STREAM_V2_ABI,
          functionName: "streamCount",
          args: [],
        })) as bigint;
        const streamId = count > 0n ? count - 1n : 0n;
        void receipt;
        return { hash, streamId };
      } catch (e) {
        setError((e as Error).message);
        throw e;
      } finally {
        setIsPending(false);
      }
    },
    [publicClient, walletClient, writeContractAsync, address]
  );

  const tickStream = useCallback(
    async (params: {
      streamId: bigint;
      amount: bigint; // raw uint64 USDC (6 decimals)
      recipientMeta?: MetaAddress; // for stealth derivation; optional fallback
    }): Promise<{ hash: `0x${string}`; salt: `0x${string}`; stealth?: StealthPayment }> => {
      if (
        !publicClient ||
        !walletClient ||
        !address ||
        !OBSCURA_PAY_STREAM_V2_ADDRESS
      ) {
        throw new Error("Wallet or contract not configured");
      }
      setIsPending(true);
      setError(null);
      try {
        await ensureOperator(
          publicClient,
          walletClient,
          address,
          OBSCURA_PAY_STREAM_V2_ADDRESS
        );
        await initFHEClient(publicClient, walletClient);
        const encA = await encryptAmount(params.amount);

        // Per-cycle salt (also used to authorize the resolver later).
        const saltMap = getJSON<SaltMap>(SALT_KEY, address) ?? {};
        const arr = saltMap[params.streamId.toString()] ?? [];
        const salt = makeSalt(params.streamId, address, arr.length);
        arr.push(salt);
        saltMap[params.streamId.toString()] = arr;
        setJSON(SALT_KEY, address, saltMap);

        const fees = await estimateCappedFees(publicClient);
        const hash = await writeContractAsync({
          address: OBSCURA_PAY_STREAM_V2_ADDRESS,
          abi: OBSCURA_PAY_STREAM_V2_ABI,
          functionName: "tickStream",
          args: [params.streamId, encA[0], salt],
          account: address,
          chain: arbitrumSepolia,
          maxFeePerGas: fees.maxFeePerGas,
          maxPriorityFeePerGas: fees.maxPriorityFeePerGas,
          gas: 1_500_000n,
        });
        await publicClient.waitForTransactionReceipt({ hash });

        // Derive a stealth address ON THE SENDER side (employer) only if a
        // recipient meta is supplied — the actual on-chain stealth Announcement
        // is emitted by the post-cycle hook in PayStreamV2 / ConfidentialEscrow,
        // but we surface the derived address for receipts.
        let stealth: StealthPayment | undefined;
        const meta = params.recipientMeta ?? loadStoredMetaPublic(address);
        if (meta) stealth = deriveStealthPayment(meta);

        return { hash, salt, stealth };
      } catch (e) {
        setError((e as Error).message);
        throw e;
      } finally {
        setIsPending(false);
      }
    },
    [publicClient, walletClient, writeContractAsync, address]
  );

  const setPaused = useCallback(
    async (streamId: bigint, paused: boolean) => {
      if (
        !publicClient ||
        !walletClient ||
        !address ||
        !OBSCURA_PAY_STREAM_V2_ADDRESS
      ) {
        throw new Error("Wallet or contract not configured");
      }
      const fees = await estimateCappedFees(publicClient);
      const hash = await writeContractAsync({
        address: OBSCURA_PAY_STREAM_V2_ADDRESS,
        abi: OBSCURA_PAY_STREAM_V2_ABI,
        functionName: "setPaused",
        args: [streamId, paused],
        account: address,
        chain: arbitrumSepolia,
        maxFeePerGas: fees.maxFeePerGas,
        maxPriorityFeePerGas: fees.maxPriorityFeePerGas,
        gas: 80_000n,
      });
      await publicClient.waitForTransactionReceipt({ hash });
      return hash;
    },
    [publicClient, walletClient, writeContractAsync, address]
  );

  const cancelStream = useCallback(
    async (streamId: bigint) => {
      if (
        !publicClient ||
        !walletClient ||
        !address ||
        !OBSCURA_PAY_STREAM_V2_ADDRESS
      ) {
        throw new Error("Wallet or contract not configured");
      }
      const fees = await estimateCappedFees(publicClient);
      const hash = await writeContractAsync({
        address: OBSCURA_PAY_STREAM_V2_ADDRESS,
        abi: OBSCURA_PAY_STREAM_V2_ABI,
        functionName: "cancelStream",
        args: [streamId],
        account: address,
        chain: arbitrumSepolia,
        maxFeePerGas: fees.maxFeePerGas,
        maxPriorityFeePerGas: fees.maxPriorityFeePerGas,
        gas: 80_000n,
      });
      await publicClient.waitForTransactionReceipt({ hash });
      return hash;
    },
    [publicClient, walletClient, writeContractAsync, address]
  );

  const updateJitter = useCallback(
    async (streamId: bigint, jitterSeconds: number) => {
      if (
        !publicClient ||
        !walletClient ||
        !address ||
        !OBSCURA_PAY_STREAM_V2_ADDRESS
      ) {
        throw new Error("Wallet or contract not configured");
      }
      const fees = await estimateCappedFees(publicClient);
      const hash = await writeContractAsync({
        address: OBSCURA_PAY_STREAM_V2_ADDRESS,
        abi: OBSCURA_PAY_STREAM_V2_ABI,
        functionName: "updateJitter",
        args: [streamId, jitterSeconds],
        account: address,
        chain: arbitrumSepolia,
        maxFeePerGas: fees.maxFeePerGas,
        maxPriorityFeePerGas: fees.maxPriorityFeePerGas,
        gas: 60_000n,
      });
      await publicClient.waitForTransactionReceipt({ hash });
      return hash;
    },
    [publicClient, walletClient, writeContractAsync, address]
  );

  const shareRecipientHint = useCallback(
    async (streamId: bigint, reader: `0x${string}`) => {
      if (
        !publicClient ||
        !walletClient ||
        !address ||
        !OBSCURA_PAY_STREAM_V2_ADDRESS
      ) {
        throw new Error("Wallet or contract not configured");
      }
      const fees = await estimateCappedFees(publicClient);
      const hash = await writeContractAsync({
        address: OBSCURA_PAY_STREAM_V2_ADDRESS,
        abi: OBSCURA_PAY_STREAM_V2_ABI,
        functionName: "shareRecipientHint",
        args: [streamId, reader],
        account: address,
        chain: arbitrumSepolia,
        maxFeePerGas: fees.maxFeePerGas,
        maxPriorityFeePerGas: fees.maxPriorityFeePerGas,
        gas: 70_000n,
      });
      await publicClient.waitForTransactionReceipt({ hash });
      return hash;
    },
    [publicClient, walletClient, writeContractAsync, address]
  );

  const getStream = useCallback(
    async (streamId: bigint): Promise<StreamRow | null> => {
      if (!publicClient || !OBSCURA_PAY_STREAM_V2_ADDRESS) return null;
      try {
        const r = (await publicClient.readContract({
          address: OBSCURA_PAY_STREAM_V2_ADDRESS,
          abi: OBSCURA_PAY_STREAM_V2_ABI,
          functionName: "getStream",
          args: [streamId],
        })) as [
          `0x${string}`,
          bigint,
          bigint,
          bigint,
          bigint,
          number,
          bigint,
          boolean
        ];
        return {
          streamId,
          employer: r[0],
          periodSeconds: r[1],
          startTime: r[2],
          endTime: r[3],
          lastTickTime: r[4],
          jitterSeconds: r[5],
          cyclesPaid: r[6],
          paused: r[7],
        };
      } catch {
        return null;
      }
    },
    [publicClient]
  );

  return {
    isPending,
    error,
    createStream,
    tickStream,
    setPaused,
    cancelStream,
    updateJitter,
    shareRecipientHint,
    getStream,
  };
}
