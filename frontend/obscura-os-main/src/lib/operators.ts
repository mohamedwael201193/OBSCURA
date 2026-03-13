/**
 * cUSDC operator pre-check + ensure helpers.
 *
 * Why this lives in one place:
 * - Wave 2 bugs #94, #95, #110 were all "forgot to setOperator before
 *   purchaseCoverage / fund / etc." → contract revert.
 * - FHERC-20 (Reineira cUSDC) uses setOperator(spender, expiry), NOT
 *   approve(spender, amount). Calling approve reverts.
 * - Anti-regression rule: any contract call that needs operator authority
 *   wraps the call in `ensureOperator(spender)` first.
 *
 * Note: the React hook `useIsOperator` provides a cached read for UI hints.
 * This module is the imperative version used by tx-submission code paths.
 */
import type { PublicClient, WalletClient } from "viem";
import { REINEIRA_CUSDC_ADDRESS, REINEIRA_CUSDC_ABI } from "@/config/pay";
import { estimateCappedFees } from "./gas";

/** A long-lived operator authorization (approx. 30 days). */
const OPERATOR_EXPIRY_SECONDS = 30n * 24n * 60n * 60n;

export async function isOperator(
  client: PublicClient,
  holder: `0x${string}`,
  spender: `0x${string}`
): Promise<boolean> {
  if (!REINEIRA_CUSDC_ADDRESS) return false;
  try {
    const result = await client.readContract({
      address: REINEIRA_CUSDC_ADDRESS,
      abi: REINEIRA_CUSDC_ABI,
      functionName: "isOperator",
      args: [holder, spender],
    });
    return Boolean(result);
  } catch {
    return false;
  }
}

/**
 * Idempotently ensure that `spender` is an authorized cUSDC operator for
 * the connected wallet. No-op if already authorized. Otherwise sends a
 * `setOperator(spender, now+30days)` tx and waits for the receipt.
 *
 * Returns true if a tx was sent (caller may want to refresh UI), false
 * if the operator was already authorized.
 */
export async function ensureOperator(
  publicClient: PublicClient,
  walletClient: WalletClient,
  holder: `0x${string}`,
  spender: `0x${string}`
): Promise<boolean> {
  if (!REINEIRA_CUSDC_ADDRESS) {
    throw new Error("cUSDC address not configured");
  }
  if (await isOperator(publicClient, holder, spender)) return false;

  const expiry = BigInt(Math.floor(Date.now() / 1000)) + OPERATOR_EXPIRY_SECONDS;
  const fees = await estimateCappedFees(publicClient);
  const hash = await walletClient.writeContract({
    address: REINEIRA_CUSDC_ADDRESS,
    abi: REINEIRA_CUSDC_ABI,
    functionName: "setOperator",
    args: [spender, expiry],
    account: holder,
    chain: walletClient.chain,
    ...fees,
  });
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (receipt.status === "reverted") {
    throw new Error("setOperator tx reverted");
  }
  return true;
}
