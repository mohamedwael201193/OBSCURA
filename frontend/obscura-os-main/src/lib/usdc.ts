/**
 * USDC / cUSDC amount helpers — always 6 decimals.
 *
 * Why this lives in one place:
 * - Wave 2 bugs #112, #113, #131 were all "amount sent as 100 instead of
 *   100_000_000" (forgot to apply 6 decimals) or vice versa.
 * - Anti-regression rule: NO inline `parseUnits(x, 6)` / `formatUnits(x, 6)`
 *   anywhere in the codebase. Every input/display goes through these.
 */
import { parseUnits, formatUnits } from "viem";

export const USDC_DECIMALS = 6;

/**
 * Parse a human-typed amount ("12.5") into 6-decimal base units (12_500_000n).
 * Throws on empty / NaN / negative — caller decides how to surface the error.
 */
export function parseUSDC(input: string | number | undefined | null): bigint {
  if (input === undefined || input === null) throw new Error("Amount required");
  const trimmed = String(input).trim();
  if (!trimmed) throw new Error("Amount required");
  // Reject scientific notation, signs, multiple dots — viem parseUnits is
  // strict but we layer our own guard so error messages are user-friendly.
  if (!/^\d+(\.\d{1,6})?$/.test(trimmed)) {
    throw new Error("Enter a positive amount with up to 6 decimals");
  }
  const value = parseUnits(trimmed, USDC_DECIMALS);
  if (value === 0n) throw new Error("Amount must be greater than zero");
  return value;
}

/** Format a 6-decimal base-unit bigint for display ("12.500000"). */
export function formatUSDC(value: bigint | undefined | null): string {
  if (value === undefined || value === null) return "0";
  return formatUnits(value, USDC_DECIMALS);
}

/** Same as formatUSDC but trims trailing zeros and the dot ("12.5"). */
export function formatUSDCShort(value: bigint | undefined | null): string {
  const full = formatUSDC(value);
  if (!full.includes(".")) return full;
  return full.replace(/\.?0+$/, "") || "0";
}
