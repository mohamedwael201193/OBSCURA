/**
 * Exponential-backoff retry for RPC rate-limit errors.
 *
 * Why this lives in one place:
 * - Wave 2 bug #142 (and the duplicated logic in useCUSDCBalance,
 *   useCUSDCEscrow, useCUSDCTransfer) all worked around testnet RPC
 *   rate limits with hand-rolled retry loops.
 * - Anti-regression rule: any RPC read/write that has hit rate limits
 *   in testing wraps its call in withRateLimitRetry.
 */

const RATE_LIMIT_PATTERNS = [
  "rate limit",
  "rate-limit",
  "ratelimit",
  "429",
  "too many requests",
  "exceeded",
];

function isRateLimitError(err: unknown): boolean {
  const msg = (err as { message?: string; shortMessage?: string })?.message
    ?? (err as { shortMessage?: string })?.shortMessage
    ?? String(err);
  const lower = msg.toLowerCase();
  return RATE_LIMIT_PATTERNS.some((p) => lower.includes(p));
}

export interface RetryOptions {
  retries?: number;
  baseDelayMs?: number;
}

/**
 * Run `fn`, retrying on rate-limit errors with exponential backoff.
 * Non-rate-limit errors throw immediately.
 *
 * Defaults: 3 retries, baseDelay 4s → 4s, 8s, 16s.
 */
export async function withRateLimitRetry<T>(
  fn: () => Promise<T>,
  opts: RetryOptions = {}
): Promise<T> {
  const retries = opts.retries ?? 3;
  const baseDelay = opts.baseDelayMs ?? 4000;
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (!isRateLimitError(err) || attempt === retries) throw err;
      const delay = baseDelay * Math.pow(2, attempt);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastErr;
}
