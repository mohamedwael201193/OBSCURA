/**
 * useUnifiedWrite.ts — Route contract writes through EOA or Smart Account based on user mode.
 *
 * In EOA mode (default): standard wagmi writeContract flow
 * In AA mode: wrap call in execute() UserOp + passkey signature
 *
 * Mode resolution order:
 *   1. opts.mode if explicitly set
 *   2. PaymentModeContext global mode
 *   3. Falls back to "eoa" if smart account not available
 *
 * Automatic fallback: if smart account write fails, retries as EOA and
 * sets `usedFallback: true` on the returned object.
 *
 * Usage:
 *   const { write, isPending, hash } = useUnifiedWrite({ abi, address, functionName, args });
 */

import { useState, useCallback } from "react";
import { useWriteContract, usePublicClient, useAccount } from "wagmi";
import { encodeFunctionData, type Abi, type Address, type Hex } from "viem";
import { arbitrumSepolia } from "viem/chains";
import { useSmartAccount } from "./useSmartAccount";
import { usePaymentMode } from "@/contexts/PaymentModeContext";

export type WriteMode = "eoa" | "smart-account";

export interface UnifiedWriteOptions {
  abi: Abi;
  address: Address;
  functionName: string;
  args?: readonly unknown[];
  value?: bigint;
  /** Force a specific mode. Defaults to "eoa". */
  mode?: WriteMode;
  /** Gas override for EOA mode */
  gas?: bigint;
}

export interface UnifiedWriteReturn {
  write: () => Promise<Hex>;
  isPending: boolean;
  hash: Hex | null;
  mode: WriteMode;
  error: string | null;
  /** True if smart account write failed and the call was retried as EOA */
  usedFallback: boolean;
}

export function useUnifiedWrite(opts: UnifiedWriteOptions): UnifiedWriteReturn {
  const { address: eoaAddress } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const { accountAddress, isDeployed, sendUserOp, status: aaStatus } = useSmartAccount();
  const { mode: contextMode } = usePaymentMode();

  // Resolve effective write mode:
  // explicit opts.mode > PaymentModeContext > "eoa"
  const resolvedMode: WriteMode = (() => {
    const preferred =
      opts.mode ??
      (contextMode === "smart" ? "smart-account" : "eoa");
    // Only use smart-account if the account is actually ready
    return preferred === "smart-account" && isDeployed && !!accountAddress
      ? "smart-account"
      : "eoa";
  })();

  const [hash, setHash] = useState<Hex | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [usedFallback, setUsedFallback] = useState(false);

  const isPending =
    resolvedMode === "smart-account"
      ? aaStatus === "signing" || aaStatus === "submitting"
      : false;

  const writeAsEoa = useCallback(async (): Promise<Hex> => {
    if (!eoaAddress) throw new Error("Wallet not connected");
    const txHash = await writeContractAsync({
      abi: opts.abi,
      address: opts.address,
      functionName: opts.functionName,
      args: opts.args,
      value: opts.value,
      account: eoaAddress,
      chain: arbitrumSepolia,
      gas: opts.gas,
    });
    return txHash;
  }, [eoaAddress, opts.abi, opts.address, opts.functionName, opts.args, opts.value, opts.gas, writeContractAsync]);

  const write = useCallback(async (): Promise<Hex> => {
    setError(null);
    setUsedFallback(false);

    try {
      if (resolvedMode === "smart-account" && accountAddress) {
        // Attempt smart account write
        try {
          const callData = encodeFunctionData({
            abi: opts.abi,
            functionName: opts.functionName,
            args: opts.args ?? [],
          }) as Hex;

          const userOpHash = await sendUserOp(opts.address, callData, opts.value ?? 0n);
          setHash(userOpHash);
          return userOpHash;
        } catch (aaErr) {
          // Auto-fallback to EOA on smart account failure
          console.warn("[useUnifiedWrite] Smart account write failed, falling back to EOA:", aaErr);
          setUsedFallback(true);
          const txHash = await writeAsEoa();
          setHash(txHash);
          return txHash;
        }
      } else {
        // Standard EOA write
        const txHash = await writeAsEoa();
        setHash(txHash);
        return txHash;
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      throw e;
    }
  }, [
    resolvedMode,
    accountAddress,
    opts.abi,
    opts.address,
    opts.functionName,
    opts.args,
    opts.value,
    sendUserOp,
    writeAsEoa,
  ]);

  // Suppress unused import warning — publicClient may be used in future gas estimation
  void publicClient;

  return { write, isPending, hash, mode: resolvedMode, error, usedFallback };
}
