/**
 * useUnifiedWrite.ts — Route any contract write through EOA or Smart Account
 * based on the current PaymentModeContext.
 *
 * Returns a single `write(opts)` callable. When Smart Mode is active and the
 * smart account is deployed, calls are routed through `sendUserOp` (passkey
 * signed, no MetaMask). Otherwise falls back to standard `writeContractAsync`.
 *
 * Usage:
 *   const { write } = useUnifiedWrite();
 *   const hash = await write({ abi, address, functionName, args, gas });
 */

import { useCallback } from "react";
import { useWriteContract, useAccount } from "wagmi";
import { encodeFunctionData, type Abi, type Address, type Hex } from "viem";
import { arbitrumSepolia } from "viem/chains";
import { useSmartAccount } from "./useSmartAccount";
import { usePaymentMode } from "@/contexts/PaymentModeContext";

export type WriteMode = "eoa" | "smart-account";

export interface UnifiedWriteOpts {
  abi: Abi;
  address: Address;
  functionName: string;
  args?: readonly unknown[];
  value?: bigint;
  /** Gas override for EOA mode (ignored in smart account mode). */
  gas?: bigint;
  /**
   * Override the global mode for this specific call.
   * "eoa" → always use MetaMask/wallet
   * "smart-account" → always use passkey UserOp (falls back to EOA if unavailable)
   */
  mode?: WriteMode;
}

/**
 * Route a contract write through EOA or smart account depending on the current
 * payment mode. Returns an async `write(opts)` function.
 *
 * Smart account is used when:
 *   - opts.mode === "smart-account", OR contextMode === "smart"
 *   - AND the smart account is deployed + passkey enrolled
 *
 * Falls back silently to EOA if the smart account is unavailable.
 */
export function useUnifiedWrite() {
  const { address: eoaAddress } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const { accountAddress, isDeployed, sendUserOp } = useSmartAccount();
  const { mode: contextMode } = usePaymentMode();

  const write = useCallback(
    async (opts: UnifiedWriteOpts): Promise<Hex> => {
      const preferSmart =
        opts.mode !== undefined
          ? opts.mode === "smart-account"
          : contextMode === "smart";

      const isSmartReady = preferSmart && isDeployed && !!accountAddress;

      if (isSmartReady) {
        // ── Smart Account path — passkey UserOp, no MetaMask ──
        const callData = encodeFunctionData({
          abi: opts.abi,
          functionName: opts.functionName,
          args: opts.args ?? [],
        }) as Hex;
        return await sendUserOp(opts.address, callData, opts.value ?? 0n);
      } else {
        // ── EOA path — standard wallet confirmation ──
        if (!eoaAddress) throw new Error("Wallet not connected");
        return await writeContractAsync({
          abi: opts.abi,
          address: opts.address,
          functionName: opts.functionName,
          args: opts.args,
          value: opts.value,
          account: eoaAddress,
          chain: arbitrumSepolia,
          gas: opts.gas,
        });
      }
    },
    [eoaAddress, writeContractAsync, accountAddress, isDeployed, sendUserOp, contextMode]
  );

  /** Whether the smart account is ready and global mode is "smart". */
  const isSmartActive = contextMode === "smart" && isDeployed && !!accountAddress;

  return { write, isSmartActive };
}
