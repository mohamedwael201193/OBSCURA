/**
 * useUnifiedWrite.ts — Route contract writes through EOA or Smart Account based on user mode.
 *
 * In EOA mode (default): standard wagmi writeContract flow
 * In AA mode: wrap call in execute() UserOp + passkey signature
 *
 * Usage:
 *   const { write, isPending, hash } = useUnifiedWrite({ abi, address, functionName, args });
 */

import { useState, useCallback } from "react";
import { useWriteContract, usePublicClient, useAccount } from "wagmi";
import { encodeFunctionData, type Abi, type Address, type Hex } from "viem";
import { arbitrumSepolia } from "viem/chains";
import { useSmartAccount } from "./useSmartAccount";

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
}

export function useUnifiedWrite(opts: UnifiedWriteOptions): UnifiedWriteReturn {
  const { address: eoaAddress } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const { accountAddress, isDeployed, sendUserOp, status: aaStatus } = useSmartAccount();

  const mode: WriteMode =
    opts.mode === "smart-account" && isDeployed && !!accountAddress
      ? "smart-account"
      : "eoa";

  const [hash, setHash] = useState<Hex | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isPending =
    mode === "smart-account"
      ? aaStatus === "signing" || aaStatus === "submitting"
      : false;

  const write = useCallback(async (): Promise<Hex> => {
    setError(null);
    try {
      if (mode === "smart-account" && accountAddress) {
        // Encode the target call
        const callData = encodeFunctionData({
          abi: opts.abi,
          functionName: opts.functionName,
          args: opts.args ?? [],
        }) as Hex;

        const userOpHash = await sendUserOp(opts.address, callData, opts.value ?? 0n);
        setHash(userOpHash);
        return userOpHash;
      } else {
        // Standard EOA write
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
        setHash(txHash);
        return txHash;
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      throw e;
    }
  }, [
    mode,
    accountAddress,
    eoaAddress,
    opts.abi,
    opts.address,
    opts.functionName,
    opts.args,
    opts.value,
    opts.gas,
    sendUserOp,
    writeContractAsync,
  ]);

  return { write, isPending, hash, mode, error };
}
