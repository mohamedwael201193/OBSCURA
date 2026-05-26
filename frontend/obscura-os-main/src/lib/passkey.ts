/**
 * passkey.ts — WebAuthn registration + P-256 key derivation + IndexedDB storage
 *
 * Signing flow:
 *   register()   → generates WebAuthn credential, stores in IndexedDB
 *   getKey()     → retrieves stored key info (public key x/y coords)
 *   sign(hash)   → WebAuthn authentication assertion, returns P-256 sig bytes
 *
 * Contract signature format for P-256:
 *   [0x01, r(32 bytes), s(32 bytes)] = 65 bytes
 *   prehash: false — the raw UserOpHash is signed directly
 */

// ─── IndexedDB key ────────────────────────────────────────────────────────────
const DB_NAME    = "obscura-passkeys";
const DB_VERSION = 1;
const STORE_NAME = "credentials";

export interface StoredPasskey {
  credentialId: string;     // base64url-encoded credential ID
  publicKeyX: bigint;       // P-256 x coordinate (32 bytes)
  publicKeyY: bigint;       // P-256 y coordinate (32 bytes)
  userHandle: string;       // owner address (used as rpId user handle)
}

// ─── DB helpers ───────────────────────────────────────────────────────────────
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE_NAME, { keyPath: "credentialId" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

function base64urlToBytes(b64: string): Uint8Array {
  const base64 = b64.replace(/-/g, "+").replace(/_/g, "/");
  // Add the correct number of "=" padding chars so length is a multiple of 4.
  // Formula: (4 - len%4) % 4  →  0→0, 2→2, 3→1 padding chars.
  const padded = base64 + "===".slice(0, (4 - base64.length % 4) % 4);
  const bin = atob(padded);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

function bytesToBase64url(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

function bytesToHex(buf: Uint8Array): `0x${string}` {
  return ("0x" + Array.from(buf).map((b) => b.toString(16).padStart(2, "0")).join("")) as `0x${string}`;
}

// ─── Extract P-256 (x, y) from SPKI/DER bytes ────────────────────────────────
/**
 * `AuthenticatorAttestationResponse.getPublicKey()` returns the key in
 * SubjectPublicKeyInfo (SPKI / DER) format — NOT COSE CBOR.
 *
 * We use the Web Crypto API to import the SPKI key and then export it as a
 * raw uncompressed EC point: 0x04 || x(32 bytes) || y(32 bytes).
 * This is the most reliable method and works across all modern browsers.
 */
async function extractP256XY(spkiBytes: ArrayBuffer): Promise<{ x: bigint; y: bigint }> {
  const cryptoKey = await crypto.subtle.importKey(
    "spki",
    spkiBytes,
    { name: "ECDSA", namedCurve: "P-256" },
    true,       // must be extractable to export as raw
    ["verify"],
  );
  // raw export = 0x04 (uncompressed prefix) || x(32) || y(32) — always 65 bytes
  const raw = new Uint8Array(await crypto.subtle.exportKey("raw", cryptoKey));
  if (raw.length !== 65 || raw[0] !== 0x04) {
    throw new Error("Unexpected EC point format — expected 65-byte uncompressed P-256 point");
  }
  return {
    x: BigInt(bytesToHex(raw.slice(1, 33))),
    y: BigInt(bytesToHex(raw.slice(33, 65))),
  };
}

// ─── Parse DER-encoded P-256 signature → (r, s) ──────────────────────────────
function parseDERSignature(der: ArrayBuffer): { r: bigint; s: bigint } {
  const bytes = new Uint8Array(der);
  if (bytes[0] !== 0x30) throw new Error("Invalid DER sequence");
  let offset = 2;
  if (bytes[1] & 0x80) offset += (bytes[1] & 0x7f); // long form length
  if (bytes[offset] !== 0x02) throw new Error("Invalid DER integer (r)");
  const rLen = bytes[offset + 1];
  const rBytes = bytes.slice(offset + 2, offset + 2 + rLen);
  offset += 2 + rLen;
  if (bytes[offset] !== 0x02) throw new Error("Invalid DER integer (s)");
  const sLen = bytes[offset + 1];
  const sBytes = bytes.slice(offset + 2, offset + 2 + sLen);

  // Strip leading 0x00 padding byte (DER adds it for sign bit)
  const r = BigInt(bytesToHex(rBytes[0] === 0 ? rBytes.slice(1) : rBytes));
  const s = BigInt(bytesToHex(sBytes[0] === 0 ? sBytes.slice(1) : sBytes));

  // Normalize s to low-S form for EVM compatibility
  const P256_N = 0xffffffff00000000ffffffffffffffffbce6faada7179e84f3b9cac2fc632551n;
  return { r, s: s > P256_N / 2n ? P256_N - s : s };
}

function bigintTo32Bytes(n: bigint): Uint8Array {
  const hex = n.toString(16).padStart(64, "0");
  return Uint8Array.from(hex.match(/.{2}/g)!.map((b) => parseInt(b, 16)));
}

// ─── RP ID ────────────────────────────────────────────────────────────────────
const RP_ID = typeof window !== "undefined" ? window.location.hostname : "obscura.finance";

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Register a new WebAuthn passkey for an EOA address.
 * Stores the credential in IndexedDB and returns the P-256 public key coords.
 */
export async function registerPasskey(ownerAddress: string): Promise<StoredPasskey> {
  const challenge = crypto.getRandomValues(new Uint8Array(32));

  const credential = await navigator.credentials.create({
    publicKey: {
      challenge,
      rp: { id: RP_ID, name: "Obscura Finance" },
      user: {
        id: new TextEncoder().encode(ownerAddress),
        name: ownerAddress,
        displayName: `Obscura (${ownerAddress.slice(0, 6)}…)`,
      },
      pubKeyCredParams: [{ type: "public-key", alg: -7 }], // ES256 (P-256)
      authenticatorSelection: {
        authenticatorAttachment: "platform",
        residentKey: "preferred",
        userVerification: "preferred",
      },
      timeout: 60_000,
    },
  }) as PublicKeyCredential | null;

  if (!credential) throw new Error("Passkey registration cancelled");

  const response = credential.response as AuthenticatorAttestationResponse;
  const credId   = bytesToBase64url(new Uint8Array(credential.rawId));

  const pkBytes = response.getPublicKey();
  if (!pkBytes) throw new Error("Browser did not return the public key. Try Chrome, Safari or Edge with biometrics.");
  const { x, y } = await extractP256XY(pkBytes);

  const entry: StoredPasskey = {
    credentialId: credId,
    publicKeyX: x,
    publicKeyY: y,
    userHandle: ownerAddress,
  };

  // Persist to IndexedDB
  const db = await openDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const req = tx.objectStore(STORE_NAME).put({ ...entry, publicKeyX: x.toString(), publicKeyY: y.toString() });
    req.onsuccess = () => resolve();
    req.onerror   = () => reject(req.error);
  });

  return entry;
}

/**
 * Retrieve a stored passkey for the given owner address.
 * Returns null if no credential was previously registered.
 */
export async function getPasskey(ownerAddress: string): Promise<StoredPasskey | null> {
  const db = await openDB();
  const all = await new Promise<StoredPasskey[]>((resolve, reject) => {
    const tx  = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).getAll();
    req.onsuccess = () => resolve(req.result as StoredPasskey[]);
    req.onerror   = () => reject(req.error);
  });

  const match = all.find((p) => p.userHandle === ownerAddress);
  if (!match) return null;

  // Re-hydrate bigints from strings (IndexedDB serialises them as strings)
  return {
    ...match,
    publicKeyX: BigInt(match.publicKeyX as unknown as string),
    publicKeyY: BigInt(match.publicKeyY as unknown as string),
  };
}

/**
 * Sign a 32-byte hash with the stored passkey.
 * Returns a 65-byte signature: [0x01, r(32), s(32)]
 * for the contract's P-256 validation path.
 *
 * prehash: false — the hash is signed directly (not double-hashed).
 */
export async function signWithPasskey(
  ownerAddress: string,
  hash: `0x${string}`,
): Promise<`0x${string}`> {
  const stored = await getPasskey(ownerAddress);
  if (!stored) throw new Error("No passkey registered for this address. Please enroll first.");

  // Decode the hex UserOpHash directly to bytes — no base64 round-trip needed.
  const hashBytes = Uint8Array.from(hash.slice(2).match(/.{2}/g)!.map((b) => parseInt(b, 16)));

  const assertion = await navigator.credentials.get({
    publicKey: {
      challenge: hashBytes,                         // raw hash as challenge — prehash: false
      allowCredentials: [{
        type: "public-key",
        id: base64urlToBytes(stored.credentialId),
      }],
      userVerification: "preferred",
      rpId: RP_ID,
      timeout: 60_000,
    },
  }) as PublicKeyCredential | null;

  if (!assertion) throw new Error("Passkey authentication cancelled");

  const authResponse = assertion.response as AuthenticatorAssertionResponse;
  const { r, s } = parseDERSignature(authResponse.signature);

  // Build 65-byte sig: type byte 0x01 + r (32 bytes) + s (32 bytes)
  const sig = new Uint8Array(65);
  sig[0] = 0x01;
  sig.set(bigintTo32Bytes(r), 1);
  sig.set(bigintTo32Bytes(s), 33);

  return bytesToHex(sig);
}

/** True if the browser supports WebAuthn platform authenticators */
export async function isPasskeySupported(): Promise<boolean> {
  if (!window.PublicKeyCredential) return false;
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}
