/**
 * Wallet-signature-derived AES-GCM keystore for client-side secrets.
 *
 * Pattern (matches MetaMask vault):
 *   1. Ask the user's wallet to sign a deterministic, app-specific message.
 *   2. keccak256(signature) → 32-byte AES-GCM key.
 *   3. Encrypt secrets with a fresh 12-byte IV per write.
 *   4. Store {iv, ciphertext} (both base64) in localStorage.
 *
 * The signature is never stored. Decryption re-prompts the user on cold start
 * (or on a configurable session expiry). The unlocked AES key is cached in
 * module memory only — tab close / reload requires a new signature.
 *
 * Phase 0.5.2 (Wave 3) — replaces the Wave 2 plaintext stealth keystore.
 */
import { keccak256, hexToBytes, type WalletClient } from "viem";

/** App-wide unlock message (versioned). Signing it reveals nothing about the user. */
export const KEYSTORE_UNLOCK_MESSAGE = "Obscura stealth keystore unlock v1";

/** In-memory cache so we don't re-prompt for every read in the same tab. */
const unlockedKeyCache = new Map<string, CryptoKey>();

function bytesToBase64(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}

function base64ToBytes(b64: string): Uint8Array {
  const s = atob(b64);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

/** Derive (and cache) the AES-GCM unlock key for the given account.
 *  Triggers a single MetaMask `personal_sign` prompt the first time it's
 *  needed in a tab session. */
export async function getUnlockKey(
  walletClient: WalletClient,
  account: `0x${string}`
): Promise<CryptoKey> {
  const cacheKey = account.toLowerCase();
  const cached = unlockedKeyCache.get(cacheKey);
  if (cached) return cached;

  const signature = await walletClient.signMessage({
    account,
    message: KEYSTORE_UNLOCK_MESSAGE,
  });
  // keccak256(signature) → 32 raw bytes for AES-256.
  const sigBytes = hexToBytes(signature);
  const digestHex = keccak256(sigBytes);
  const keyBytes = hexToBytes(digestHex);
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyBytes as BufferSource,
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"]
  );
  unlockedKeyCache.set(cacheKey, cryptoKey);
  return cryptoKey;
}

/** Clear the in-memory unlock key (e.g. on logout / account switch). */
export function lockKeystore(account?: `0x${string}` | string) {
  if (account) {
    unlockedKeyCache.delete(account.toLowerCase());
  } else {
    unlockedKeyCache.clear();
  }
}

export interface EncryptedBlob {
  iv: string; // base64 12-byte
  ciphertext: string; // base64
}

/** Encrypt a JSON-serializable value with the given AES-GCM key. */
export async function encryptJSON(
  key: CryptoKey,
  value: unknown
): Promise<EncryptedBlob> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plaintext = new TextEncoder().encode(JSON.stringify(value));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv as BufferSource },
    key,
    plaintext as BufferSource
  );
  return {
    iv: bytesToBase64(iv),
    ciphertext: bytesToBase64(new Uint8Array(ciphertext)),
  };
}

/** Decrypt and JSON-parse a blob with the given AES-GCM key. */
export async function decryptJSON<T>(
  key: CryptoKey,
  blob: EncryptedBlob
): Promise<T> {
  const iv = base64ToBytes(blob.iv);
  const ciphertext = base64ToBytes(blob.ciphertext);
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: iv as BufferSource },
    key,
    ciphertext as BufferSource
  );
  return JSON.parse(new TextDecoder().decode(plaintext)) as T;
}
