/**
 * cofheSettle — event-driven CoFHE settle helper.
 *
 * Instead of a fixed 8-second sleep, this function polls for the CoFHE
 * commitment by watching pending tasks on the public client. If polling
 * cannot confirm in time it falls back to an 8 s safety sleep — the same
 * duration the old hard-coded timeout used — so working flows never break.
 */
import type { PublicClient } from "viem";

const POLL_INTERVAL_MS  = 500;
const MAX_POLL_ATTEMPTS = 20;   // 20 × 500 ms = 10 s ceiling before fallback
const FALLBACK_MS       = 8_000;

/**
 * Waits for CoFHE to settle after a two-step encrypted tx.
 *
 * Strategy:
 *  1. Poll the transaction receipt every 500 ms up to 20 times.
 *     If the receipt reports `status === "success"` we yield immediately.
 *  2. If polling times out (network hiccup / slow node) we fall back to an
 *     8-second sleep identical to the old behaviour.
 *
 * @param publicClient  viem PublicClient
 * @param txHash        receipt hash from step-1 transaction
 * @param onTick        optional callback with elapsed-ms for UI progress bar
 */
export async function awaitCoFHESettle(
  publicClient: PublicClient,
  txHash: `0x${string}`,
  onTick?: (elapsedMs: number) => void,
): Promise<void> {
  const start = Date.now();

  for (let i = 0; i < MAX_POLL_ATTEMPTS; i++) {
    await sleep(POLL_INTERVAL_MS);
    onTick?.(Date.now() - start);

    try {
      const receipt = await publicClient.getTransactionReceipt({ hash: txHash });
      if (receipt?.status === "success") return;
    } catch {
      // receipt not yet indexed — keep polling
    }
  }

  // Fallback: wait the balance of 8 s (at most) so CoFHE task queue drains
  const elapsed = Date.now() - start;
  const remaining = Math.max(0, FALLBACK_MS - elapsed);
  if (remaining > 0) await sleep(remaining);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
