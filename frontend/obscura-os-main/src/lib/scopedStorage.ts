/**
 * scopedStorage — wallet-address-scoped localStorage helpers.
 *
 * Why this lives in one place (Phase 0.5 audit fix):
 * - Wave 2 keys `obscura_cusdc_escrows`, `obscura_insurance_policies`,
 *   `obscura_bridge_state` were GLOBAL — switching MetaMask accounts on the
 *   same browser exposed the previous account's escrow IDs / policy IDs /
 *   bridge state.
 * - Anti-regression rule: every persisted feature value goes through
 *   `getJSON(key, address)` / `setJSON(key, address, value)` which
 *   transparently appends `:${address.toLowerCase()}`.
 *
 * Migration: `migrateGlobalKey(legacyKey, address)` copies a Wave 2-era
 * global value to the current address's scope and deletes the legacy key.
 */

const SEP = ":";

function scopedKey(key: string, address: `0x${string}` | string | undefined | null): string {
  if (!address) return key; // pre-connect reads/writes go to a shared bucket
  return `${key}${SEP}${String(address).toLowerCase()}`;
}

export function getString(
  key: string,
  address: `0x${string}` | string | undefined | null
): string | null {
  try {
    return localStorage.getItem(scopedKey(key, address));
  } catch {
    return null;
  }
}

export function setString(
  key: string,
  address: `0x${string}` | string | undefined | null,
  value: string
): void {
  try {
    localStorage.setItem(scopedKey(key, address), value);
  } catch {
    /* quota / disabled — silent */
  }
}

export function removeKey(
  key: string,
  address: `0x${string}` | string | undefined | null
): void {
  try {
    localStorage.removeItem(scopedKey(key, address));
  } catch {
    /* silent */
  }
}

export function getJSON<T>(
  key: string,
  address: `0x${string}` | string | undefined | null,
  fallback: T
): T {
  const raw = getString(key, address);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function setJSON<T>(
  key: string,
  address: `0x${string}` | string | undefined | null,
  value: T
): void {
  setString(key, address, JSON.stringify(value));
}

/**
 * One-time migration helper: if a legacy Wave 2 GLOBAL key exists, copy
 * its value into the current address's scope, then delete the legacy key.
 * No-op if address is missing or the legacy key is empty.
 */
export function migrateGlobalKey(
  legacyKey: string,
  address: `0x${string}` | string | undefined | null
): void {
  if (!address) return;
  try {
    const legacy = localStorage.getItem(legacyKey);
    if (!legacy) return;
    const scopedTarget = scopedKey(legacyKey, address);
    // Only migrate if the scoped key is empty — don't overwrite existing data.
    if (localStorage.getItem(scopedTarget) === null) {
      localStorage.setItem(scopedTarget, legacy);
    }
    localStorage.removeItem(legacyKey);
  } catch {
    /* silent */
  }
}
