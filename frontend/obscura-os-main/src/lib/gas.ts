/**
 * Shared EIP-1559 fee estimation for Arbitrum Sepolia.
 *
 * Why this lives in one place:
 * - Arb Sepolia base fees are extremely low (~0.024 gwei). Any fixed-value
 *   priority-fee fallback will exceed the fee cap and produce TipAboveFeeCap.
 * - Every Wave 2 gas-error bug (#51, #52, #153, #154, #155, #156) had the
 *   same root cause: inline fee math that forgot to clamp tip ≤ cap, OR
 *   forgot to pass priority entirely.
 * - Anti-regression rule: NO inline `maxFeePerGas` / `maxPriorityFeePerGas`
 *   computation anywhere in the codebase. Every tx uses estimateCappedFees.
 */

export interface CappedFees {
  maxFeePerGas: bigint;
  maxPriorityFeePerGas: bigint;
}

/** Minimal interface satisfied by viem PublicClient.estimateFeesPerGas. */
export interface FeeEstimator {
  estimateFeesPerGas: () => Promise<{
    maxFeePerGas: bigint | null;
    maxPriorityFeePerGas: bigint | null;
  }>;
}

/** Safe Arb Sepolia fallback when the RPC is unreachable / rate-limited. */
const FALLBACK_FEE = 300_000_000n; // 0.3 gwei

/**
 * Estimate EIP-1559 fees and apply a 1.5× safety buffer.
 * Always clamps `maxPriorityFeePerGas <= maxFeePerGas` (EIP-1559 invariant).
 *
 * Used by EVERY transaction that goes through `txGuard.submitAndConfirm`.
 */
export async function estimateCappedFees(client: FeeEstimator): Promise<CappedFees> {
  try {
    const feeData = await client.estimateFeesPerGas();
    const maxFeePerGas = feeData.maxFeePerGas
      ? (feeData.maxFeePerGas * 150n) / 100n
      : FALLBACK_FEE;
    const rawPriority = feeData.maxPriorityFeePerGas
      ? (feeData.maxPriorityFeePerGas * 150n) / 100n
      : undefined;
    const maxPriorityFeePerGas =
      rawPriority === undefined || rawPriority > maxFeePerGas
        ? maxFeePerGas
        : rawPriority;
    return { maxFeePerGas, maxPriorityFeePerGas };
  } catch {
    return { maxFeePerGas: FALLBACK_FEE, maxPriorityFeePerGas: FALLBACK_FEE };
  }
}
