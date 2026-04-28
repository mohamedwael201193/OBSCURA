/**
 * trackedBalance — single source of truth for the cUSDC sum we track in
 * localStorage (used as the dashboard balance display while the
 * confidentialBalanceOf decryption is in flight or unavailable).
 *
 * Why this lives in one place:
 * - Wave 2 had three different writers for `cusdc_tracked_${addr}` —
 *   useCUSDCBalance (wrap), useSweepStealth (sweep), CUSDCEscrowActions
 *   (redeem) — each with slightly different address-casing logic
 *   (`${address}` vs `${address.toLowerCase()}`). Mismatched casing made
 *   reads return wrong totals.
 * - Now: one normalized key, one read fn, one add fn, one set fn.
 */
import { formatUSDC } from "./usdc";

const KEY = "cusdc_tracked";

function k(address: `0x${string}` | string): string {
  return `${KEY}_${String(address).toLowerCase()}`;
}

export function getTrackedRaw(address: `0x${string}` | string | undefined | null): string {
  if (!address) return "0";
  try {
    return localStorage.getItem(k(address)) ?? "0";
  } catch {
    return "0";
  }
}

/** Tracked balance as a bigint (6-decimal base units).
 *  Auto-migrates legacy float-string values (e.g. "12.500000") on read. */
export function getTrackedUnits(address: `0x${string}` | string | undefined | null): bigint {
  const raw = getTrackedRaw(address);
  if (!raw || raw === "0") return 0n;
  // Legacy format: float string like "12.500000" written by Wave 2 useCUSDCBalance.
  if (raw.includes(".")) {
    try {
      const float = parseFloat(raw);
      if (!isFinite(float) || float < 0) return 0n;
      const units = BigInt(Math.round(float * 1_000_000));
      // Migrate forward so future reads use the bigint format.
      setTrackedUnits(address, units);
      return units;
    } catch {
      return 0n;
    }
  }
  try {
    return BigInt(raw);
  } catch {
    return 0n;
  }
}

/** Tracked balance formatted for display ("12.5"). */
export function getTrackedFormatted(address: `0x${string}` | string | undefined | null): string {
  return formatUSDC(getTrackedUnits(address));
}

/** Replace the tracked balance entirely. */
export function setTrackedUnits(
  address: `0x${string}` | string | undefined | null,
  amount: bigint
): void {
  if (!address) return;
  try {
    localStorage.setItem(k(address), amount.toString());
  } catch {
    /* silent */
  }
}

/** Add `delta` (positive or negative) to the tracked balance. Floors at 0. */
export function addTrackedUnits(
  address: `0x${string}` | string | undefined | null,
  delta: bigint
): bigint {
  if (!address) return 0n;
  const next = getTrackedUnits(address) + delta;
  const clamped = next < 0n ? 0n : next;
  setTrackedUnits(address, clamped);
  return clamped;
}
