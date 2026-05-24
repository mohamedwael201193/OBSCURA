/**
 * envHealth — startup check that all expected VITE_* contract addresses
 * are configured. Logs a warning for each missing key and (in dev mode)
 * exposes a simple list for an in-app banner.
 *
 * Why: Wave 2 had several "tx silently submitted to address(0)" or
 * "contract not configured" errors that took minutes to diagnose because
 * nothing surfaced the missing env at startup.
 */

const REQUIRED_KEYS = [
  // Wave 1 (kept for vote / docs / pmf)
  "VITE_OBSCURA_PAY_ADDRESS",
  "VITE_OBSCURA_TOKEN_ADDRESS",
  "VITE_OBSCURA_VOTE_ADDRESS",
  // Wave 2 — Pay
  "VITE_OBSCURA_STEALTH_REGISTRY_ADDRESS",
  // Wave 3 — Pay (privacy-hardened redeploys + new contracts)
  "VITE_OBSCURA_PAYROLL_RESOLVER_V2_ADDRESS",
  "VITE_OBSCURA_PAY_STREAM_V2_ADDRESS",
  "VITE_OBSCURA_ADDRESS_BOOK_ADDRESS",
  "VITE_OBSCURA_INBOX_INDEX_ADDRESS",
  "VITE_OBSCURA_INSURANCE_SUBSCRIPTION_ADDRESS",
  "VITE_OBSCURA_SOCIAL_RESOLVER_ADDRESS",
  "VITE_OBSCURA_STEALTH_ROTATION_ADDRESS",
  // Obscura's own confidential cUSDC escrow (replaces broken Reineira proxy)
  "VITE_OBSCURA_CONFIDENTIAL_ESCROW_ADDRESS",
  // Wave 5 — V3 active contracts
  "VITE_OBSCURA_PAY_STREAM_V3_ADDRESS",
  "VITE_OBSCURA_INSURANCE_SUBSCRIPTION_V2_ADDRESS",
] as const;

export interface EnvHealthReport {
  missing: string[];
  ok: boolean;
}

export function checkEnvHealth(): EnvHealthReport {
  const env = (import.meta.env ?? {}) as Record<string, string | undefined>;
  const missing: string[] = [];
  for (const key of REQUIRED_KEYS) {
    const value = env[key];
    if (!value || !/^0x[0-9a-fA-F]{40}$/.test(value)) {
      missing.push(key);
    }
  }
  return { missing, ok: missing.length === 0 };
}

let _logged = false;
/** Idempotent dev-mode log. Safe to call from app entry points. */
export function logEnvHealthOnce(): EnvHealthReport {
  const report = checkEnvHealth();
  if (_logged) return report;
  _logged = true;
  if (!report.ok && import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.warn(
      `[envHealth] ${report.missing.length} contract address env(s) missing or malformed:\n  - ` +
        report.missing.join("\n  - ")
    );
  }
  return report;
}
