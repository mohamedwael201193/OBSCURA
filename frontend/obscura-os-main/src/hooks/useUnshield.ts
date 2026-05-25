/**
 * useUnshield — Wave 4 v3.17
 *
 * Calls ObscuraConfidentialToken.unshield(amtPlain, encAmt, to):
 *   • `amtPlain`  — plaintext check value (uint64, same units as encAmt)
 *   • `encAmt`    — FHE-encrypted amount (InEuint64, proof bound to signer)
 *   • `to`        — recipient for the unwrapped underlying ERC-20
 *
 * The contract uses a v3.13 FHE.eq guard: if encAmt ≠ amtPlain the transfer
 * silently burns, so the encrypted value MUST match the plaintext.
 *
 * Flow: IDLE → ENCRYPTING → SENDING → SETTLING → READY (auto-reset 4s)
 *
 * Privacy contract:
 *   - Never called on mount
 *   - `fhe` is in every useCallback dep array
 *   - encrypt step happens client-side; amount is sealed before the tx leaves
 */
import { useCallback } from "react";
import { usePublicClient, useWalletClient, useWriteContract } from "wagmi";
import { CONFIDENTIAL_TOKEN_ABI } from "@/config/credit";
import { OBSCURA_PAY_OCUSDC_ADDRESS } from "@/config/payV3";
import { useFHEStatus } from "./useFHEStatus";
import { FHEStepStatus } from "@/lib/constants";
import { initFHEClient, encryptAmount } from "@/lib/fhe";
import { estimateCappedFees } from "@/lib/gas";
import { withRateLimitRetry } from "@/lib/rateLimit";

export function useUnshield(tokenAddress?: `0x${string}`) {
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const { writeContractAsync } = useWriteContract();
  const fhe = useFHEStatus();

  const address = tokenAddress ?? OBSCURA_PAY_OCUSDC_ADDRESS;

  /**
   * Unwrap `amtPlain` encrypted ocToken units back to the underlying ERC-20.
   *
   * @param amtPlain  Raw uint64 amount (same decimals as the token).
   * @param to        Recipient address for the unwrapped underlying.
   */
  const unshield = useCallback(
    async (amtPlain: bigint, to: `0x${string}`) => {
      if (!publicClient || !walletClient || !address) throw new Error("unshield not ready");
      if (amtPlain === 0n) throw new Error("ZeroAmount");

      // Step 1: Encrypt the amount client-side so it is sealed before the tx.
      fhe.setStep(FHEStepStatus.ENCRYPTING);
      await initFHEClient(publicClient, walletClient);
      const encAmt = await encryptAmount(amtPlain);

      // Step 2: Submit the unshield transaction.
      fhe.setStep(FHEStepStatus.SENDING);
      const fees = await withRateLimitRetry(() => estimateCappedFees(publicClient));
      const hash = await writeContractAsync({
        address,
        abi: CONFIDENTIAL_TOKEN_ABI,
        functionName: "unshield",
        // uint64 amtPlain, InEuint64 encAmt, address to
        args: [amtPlain, encAmt[0], to],
        ...fees,
      });

      fhe.setStep(FHEStepStatus.SETTLING);
      await publicClient.waitForTransactionReceipt({ hash });
      fhe.setStep(FHEStepStatus.READY);
      return hash;
    },
    [publicClient, walletClient, address, writeContractAsync, fhe],
  );

  return { unshield, fheState: fhe.state };
}
