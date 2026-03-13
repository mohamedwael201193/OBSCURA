/**
 * usePayrollResolverV2 — wraps the V2 resolver that gates each cycle's
 * release. The privacy upgrade in V2: employer / approver are stored as
 * `eaddress` (encrypted) plus a salted commitment. To call cancel/approve,
 * the caller must reveal the salt that hashes to the on-chain commitment.
 *
 * Salts are produced and persisted by `usePayStreamV2.tickStream` under
 * `obscura.stream.salts.v1:<addr>:<streamId>`. We index by `(streamId, cycleIndex)`.
 */
import { useCallback, useState } from "react";
import {
  useAccount,
  usePublicClient,
  useWalletClient,
  useWriteContract,
} from "wagmi";
import { arbitrumSepolia } from "viem/chains";
import {
  OBSCURA_PAYROLL_RESOLVER_V2_ABI,
  OBSCURA_PAYROLL_RESOLVER_V2_ADDRESS,
} from "@/config/payV2";
import { estimateCappedFees } from "@/lib/gas";
import { getJSON } from "@/lib/scopedStorage";

const SALT_KEY = "obscura.stream.salts.v1";
type SaltMap = Record<string, string[]>;

/** Look up the salt that was generated when tickStream() was sent. */
export function getSaltForCycle(
  account: `0x${string}` | undefined,
  streamId: bigint,
  cycleIndex: number
): `0x${string}` | null {
  if (!account) return null;
  const map = getJSON<SaltMap>(SALT_KEY, account) ?? {};
  const arr = map[streamId.toString()];
  return (arr?.[cycleIndex] as `0x${string}` | undefined) ?? null;
}

export interface CycleRow {
  escrowId: bigint;
  releaseTime: bigint;
  cancelled: boolean;
  approved: boolean;
  employerCommit: `0x${string}`;
  approverCommit: `0x${string}`;
}

export function usePayrollResolverV2() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const { writeContractAsync } = useWriteContract();

  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cancel = useCallback(
    async (escrowId: bigint, salt: `0x${string}`) => {
      if (
        !publicClient ||
        !walletClient ||
        !address ||
        !OBSCURA_PAYROLL_RESOLVER_V2_ADDRESS
      ) {
        throw new Error("Wallet or contract not configured");
      }
      setIsPending(true);
      setError(null);
      try {
        const fees = await estimateCappedFees(publicClient);
        const hash = await writeContractAsync({
          address: OBSCURA_PAYROLL_RESOLVER_V2_ADDRESS,
          abi: OBSCURA_PAYROLL_RESOLVER_V2_ABI,
          functionName: "cancel",
          args: [escrowId, salt],
          account: address,
          chain: arbitrumSepolia,
          maxFeePerGas: fees.maxFeePerGas,
          maxPriorityFeePerGas: fees.maxPriorityFeePerGas,
          gas: 200_000n,
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

  const approve = useCallback(
    async (escrowId: bigint, salt: `0x${string}`) => {
      if (
        !publicClient ||
        !walletClient ||
        !address ||
        !OBSCURA_PAYROLL_RESOLVER_V2_ADDRESS
      ) {
        throw new Error("Wallet or contract not configured");
      }
      setIsPending(true);
      setError(null);
      try {
        const fees = await estimateCappedFees(publicClient);
        const hash = await writeContractAsync({
          address: OBSCURA_PAYROLL_RESOLVER_V2_ADDRESS,
          abi: OBSCURA_PAYROLL_RESOLVER_V2_ABI,
          functionName: "approve",
          args: [escrowId, salt],
          account: address,
          chain: arbitrumSepolia,
          maxFeePerGas: fees.maxFeePerGas,
          maxPriorityFeePerGas: fees.maxPriorityFeePerGas,
          gas: 200_000n,
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

  const shareEmployer = useCallback(
    async (escrowId: bigint, reader: `0x${string}`, salt: `0x${string}`) => {
      if (
        !publicClient ||
        !walletClient ||
        !address ||
        !OBSCURA_PAYROLL_RESOLVER_V2_ADDRESS
      ) {
        throw new Error("Wallet or contract not configured");
      }
      const fees = await estimateCappedFees(publicClient);
      const hash = await writeContractAsync({
        address: OBSCURA_PAYROLL_RESOLVER_V2_ADDRESS,
        abi: OBSCURA_PAYROLL_RESOLVER_V2_ABI,
        functionName: "shareEmployer",
        args: [escrowId, reader, salt],
        account: address,
        chain: arbitrumSepolia,
        maxFeePerGas: fees.maxFeePerGas,
        maxPriorityFeePerGas: fees.maxPriorityFeePerGas,
        gas: 90_000n,
      });
      await publicClient.waitForTransactionReceipt({ hash });
      return hash;
    },
    [publicClient, walletClient, writeContractAsync, address]
  );

  const getCycle = useCallback(
    async (escrowId: bigint): Promise<CycleRow | null> => {
      if (!publicClient || !OBSCURA_PAYROLL_RESOLVER_V2_ADDRESS) return null;
      try {
        const r = (await publicClient.readContract({
          address: OBSCURA_PAYROLL_RESOLVER_V2_ADDRESS,
          abi: OBSCURA_PAYROLL_RESOLVER_V2_ABI,
          functionName: "getCycle",
          args: [escrowId],
        })) as [bigint, boolean, boolean, `0x${string}`, `0x${string}`];
        return {
          escrowId,
          releaseTime: r[0],
          cancelled: r[1],
          approved: r[2],
          employerCommit: r[3],
          approverCommit: r[4],
        };
      } catch {
        return null;
      }
    },
    [publicClient]
  );

  return { isPending, error, cancel, approve, shareEmployer, getCycle };
}
