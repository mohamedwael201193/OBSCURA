/**
 * ERC-5564-style stealth address derivation (secp256k1, view-tag scheme 1).
 *
 * Why we have it: every payroll cycle in ObscuraPayStream goes to a fresh
 * one-time recipient address — the recipient publishes a single (spending,
 * viewing) pubkey pair to ObscuraStealthRegistry, and the sender derives a
 * unique stealth address per payment. Observers cannot link cycles to the
 * recipient.
 *
 * Algorithm (matches ERC-5564 + Umbra):
 *   ephemeral key e (random 32 bytes), R = e * G  (sender ephemeral pubkey)
 *   shared = sha256(e * V)                         (V = recipient viewing key)
 *   viewTag = first byte of shared
 *   stealthPubKey = S + shared * G                 (S = recipient spending key)
 *   stealthAddress = keccak256(stealthPubKey)[12:]
 *
 * Recipient scan side: given (R, viewTag), compute shared' = sha256(v*R) and
 * match its first byte against viewTag (cheap), then recompute stealthAddress.
 */
import { secp256k1 } from "@noble/curves/secp256k1";
import { sha256 } from "@noble/hashes/sha256";
import { keccak_256 } from "@noble/hashes/sha3";
import { bytesToHex, hexToBytes, getAddress } from "viem";

export interface MetaAddress {
  spendingPubKey: `0x${string}`; // 33-byte compressed
  viewingPubKey: `0x${string}`;  // 33-byte compressed
}

export interface MetaAddressKeys {
  spendingPrivateKey: `0x${string}`; // 32 bytes
  viewingPrivateKey: `0x${string}`;  // 32 bytes
  meta: MetaAddress;
}

export interface StealthPayment {
  stealthAddress: `0x${string}`;
  ephemeralPubKey: `0x${string}`; // 33-byte compressed
  viewTag: `0x${string}`;          // 0x + 1 byte
}

/** Generate a brand-new meta-address keypair. */
export function generateMetaKeys(): MetaAddressKeys {
  const sk = secp256k1.utils.randomPrivateKey();
  const vk = secp256k1.utils.randomPrivateKey();
  return {
    spendingPrivateKey: bytesToHex(sk) as `0x${string}`,
    viewingPrivateKey: bytesToHex(vk) as `0x${string}`,
    meta: {
      spendingPubKey: bytesToHex(secp256k1.getPublicKey(sk, true)) as `0x${string}`,
      viewingPubKey: bytesToHex(secp256k1.getPublicKey(vk, true)) as `0x${string}`,
    },
  };
}

/** Sender side: derive a one-time stealth payment for a given recipient meta. */
export function deriveStealthPayment(meta: MetaAddress): StealthPayment {
  const ephSk = secp256k1.utils.randomPrivateKey();
  const ephPk = secp256k1.getPublicKey(ephSk, true);

  const viewingPk = hexToBytes(meta.viewingPubKey);
  const sharedPoint = secp256k1.getSharedSecret(ephSk, viewingPk, true); // 33 bytes (with prefix)
  const sharedHash = sha256(sharedPoint.slice(1)); // drop the parity byte before hashing
  const viewTag = sharedHash[0];

  // stealthPubKey = spending + sharedHash * G
  const spendingPoint = secp256k1.ProjectivePoint.fromHex(meta.spendingPubKey.slice(2));
  const sharedG = secp256k1.ProjectivePoint.BASE.multiply(
    bytesToBigInt(sharedHash) % secp256k1.CURVE.n
  );
  const stealthPoint = spendingPoint.add(sharedG);
  const uncompressed = stealthPoint.toRawBytes(false); // 65 bytes, leading 0x04
  const hash = keccak_256(uncompressed.slice(1));
  const addr = getAddress("0x" + bytesToHex(hash.slice(12)));

  return {
    stealthAddress: addr,
    ephemeralPubKey: bytesToHex(ephPk) as `0x${string}`,
    viewTag: ("0x" + viewTag.toString(16).padStart(2, "0")) as `0x${string}`,
  };
}

/**
 * Recipient side: given an Announcement (R, viewTag), check whether it's ours.
 * Returns the derived stealth address if the viewTag matches, else null.
 */
export function scanAnnouncement(
  ephemeralPubKey: `0x${string}`,
  viewTag: `0x${string}`,
  viewingPrivateKey: `0x${string}`,
  spendingPubKey: `0x${string}`
): `0x${string}` | null {
  const v = hexToBytes(viewingPrivateKey);
  const R = hexToBytes(ephemeralPubKey);
  const sharedPoint = secp256k1.getSharedSecret(v, R, true);
  const sharedHash = sha256(sharedPoint.slice(1));
  const expectedTag = sharedHash[0];
  const givenTag = parseInt(viewTag.slice(2), 16);
  if (expectedTag !== givenTag) return null;

  const spendingPoint = secp256k1.ProjectivePoint.fromHex(spendingPubKey.slice(2));
  const sharedG = secp256k1.ProjectivePoint.BASE.multiply(
    bytesToBigInt(sharedHash) % secp256k1.CURVE.n
  );
  const stealthPoint = spendingPoint.add(sharedG);
  const hash = keccak_256(stealthPoint.toRawBytes(false).slice(1));
  return getAddress("0x" + bytesToHex(hash.slice(12)));
}

/**
 * Recipient side: derive the private key for a stealth address they own.
 * Used when the recipient wants to sweep funds to their main wallet.
 */
export function stealthPrivateKey(
  ephemeralPubKey: `0x${string}`,
  viewingPrivateKey: `0x${string}`,
  spendingPrivateKey: `0x${string}`
): `0x${string}` {
  const v = hexToBytes(viewingPrivateKey);
  const R = hexToBytes(ephemeralPubKey);
  const sharedPoint = secp256k1.getSharedSecret(v, R, true);
  const sharedHash = sha256(sharedPoint.slice(1));
  const s = bytesToBigInt(hexToBytes(spendingPrivateKey));
  const sk = (s + bytesToBigInt(sharedHash)) % secp256k1.CURVE.n;
  return ("0x" + sk.toString(16).padStart(64, "0")) as `0x${string}`;
}

function bytesToBigInt(b: Uint8Array): bigint {
  let x = 0n;
  for (const byte of b) x = (x << 8n) | BigInt(byte);
  return x;
}

const STORAGE_KEY = "obscura.stealth.keys.v1";

export function loadStoredKeys(account: string | undefined): MetaAddressKeys | null {
  if (!account) return null;
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY}:${account.toLowerCase()}`);
    return raw ? (JSON.parse(raw) as MetaAddressKeys) : null;
  } catch {
    return null;
  }
}

export function persistKeys(account: string, keys: MetaAddressKeys) {
  localStorage.setItem(`${STORAGE_KEY}:${account.toLowerCase()}`, JSON.stringify(keys));
}
