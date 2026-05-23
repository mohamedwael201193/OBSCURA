/**
 * useShield — Wave 4 v3.17
 *
 * Provides claimFaucet() and shield(amount) for ObscuraConfidentialToken.
 *
 * claimFaucet: mints from the built-in 24h faucet (no underlying needed).
 * shield(amount): wraps plain ERC-20 → encrypted ocToken.
 *                 Caller must first approve the token contract for `amount`
 *                 on the underlying ERC-20.
 *
 * Both paths follow the FHEStepStatus flow:
 *   IDLE → SENDING → SETTLING → READY (auto-reset 4s)
 * (No ENCRYPTING step needed — shield/claimFaucet take plain amounts.)
 *
 * Privacy contract:
 *   - No auto-decrypt on mount
 *   - No InEuint64 needed (shield encodes internally in the contract)
 */
import { useCallback } from "react";
import { usePublicClient, useWalletClient, useWriteContract } from "wagmi";
import { CONFIDENTIAL_TOKEN_ABI, CONFIDENTIAL_USDC_ADDRESS } from "@/config/credit";
import { useFHEStatus } from "./useFHEStatus";
import { FHEStepStatus } from "@/lib/constants";
import { estimateCappedFees } from "@/lib/gas";
import { withRateLimitRetry } from "@/lib/rateLimit";

export function useShield(tokenAddress?: `0x${string}`) {
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const { writeContractAsync } = useWriteContract();
  const fhe = useFHEStatus();

  // Fall back to the default cUSDC if no specific token is passed.
  const address = tokenAddress ?? CONFIDENTIAL_USDC_ADDRESS;

  /**
   * Claim the 24h faucet drip. No prior ERC-20 approval needed.
   * Will revert on-chain if called within the 24h cooldown.
   */
  const claimFaucet = useCallback(async () => {
    if (!publicClient || !walletClient || !address) throw new Error("shield not ready");

    fhe.setStep(FHEStepStatus.SENDING);
    const fees = await withRateLimitRetry(() => estimateCappedFees(publicClient));
    const hash = await writeContractAsync({
      address,
      abi: CONFIDENTIAL_TOKEN_ABI,
      functionName: "claimFaucet",
      ...fees,
    });

    fhe.setStep(FHEStepStatus.SETTLING);
    await publicClient.waitForTransactionReceipt({ hash });
    fhe.setStep(FHEStepStatus.READY);
    return hash;
  }, [publicClient, walletClient, address, writeContractAsync, fhe]);

  /**
   * Wrap `amount` raw token units into encrypted ocToken.
   * Caller MUST pre-approve `address` on the underlying ERC-20 for `amount`.
   *
   * @param amount  Raw uint256 amount in underlying decimals.
   */
  const shield = useCallback(
    async (amount: bigint) => {
      if (!publicClient || !walletClient || !address) throw new Error("shield not ready");
      if (amount === 0n) throw new Error("ZeroAmount");

      fhe.setStep(FHEStepStatus.SENDING);
      const fees = await withRateLimitRetry(() => estimateCappedFees(publicClient));
      const hash = await writeContractAsync({
        address,
        abi: CONFIDENTIAL_TOKEN_ABI,
        functionName: "shield",
        args: [amount],
        ...fees,
      });

      fhe.setStep(FHEStepStatus.SETTLING);
      await publicClient.waitForTransactionReceipt({ hash });
      fhe.setStep(FHEStepStatus.READY);
      return hash;
    },
    [publicClient, walletClient, address, writeContractAsync, fhe],
  );

  return { claimFaucet, shield, fheState: fhe.state };
}
