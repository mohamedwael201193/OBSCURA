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
  const padded = b64.replace(/-/g, "+").replace(/_/g, "/") + "==".slice((b64.length + 3) & 3);
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

// ─── Parse COSE P-256 public key → (x, y) coordinates ───────────────────────
/**
 * WebAuthn returns the public key as a COSE-encoded CBOR map.
 * For P-256 (kty=2, alg=-7): x is key -2, y is key -3.
 * We parse the raw CBOR manually (only the fields we need).
 */
function parseCOSEPublicKey(coseBytes: ArrayBuffer): { x: bigint; y: bigint } {
  // Minimal CBOR parser for the COSE key map
  const data = new Uint8Array(coseBytes);
  let offset = 0;

  function readByte(): number { return data[offset++]; }
  function readUint(n: number): number {
    let val = 0;
    for (let i = 0; i < n; i++) val = (val << 8) | readByte();
    return val;
  }

  function readCBORValue(): unknown {
    const byte = readByte();
    const major = byte >> 5;
    const info  = byte & 0x1f;
    let len = info < 24 ? info : info === 24 ? readUint(1) : info === 25 ? readUint(2) : readUint(4);

    if (major === 0) return len;              // positive int
    if (major === 1) return -1 - len;         // negative int
    if (major === 2) {                        // byte string
      const bytes = data.slice(offset, offset + len);
      offset += len;
      return bytes;
    }
    if (major === 3) {                        // text string
      const text = new TextDecoder().decode(data.slice(offset, offset + len));
      offset += len;
      return text;
    }
    if (major === 5) {                        // map
      const map: Record<number | string, unknown> = {};
      for (let i = 0; i < len; i++) {
        const k = readCBORValue();
        const v = readCBORValue();
        map[k as number | string] = v;
      }
      return map;
    }
    throw new Error(`Unsupported CBOR major type ${major}`);
  }

  const map = readCBORValue() as Record<number, Uint8Array>;
  const xBytes = map[-2];
  const yBytes = map[-3];
  if (!xBytes || !yBytes || xBytes.length !== 32 || yBytes.length !== 32) {
    throw new Error("Invalid P-256 public key — expected 32-byte x/y coordinates");
  }

  return {
    x: BigInt(bytesToHex(xBytes)),
    y: BigInt(bytesToHex(yBytes)),
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
  const { x, y } = parseCOSEPublicKey(response.getPublicKey()!);

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

  const hashBytes = base64urlToBytes(
    bytesToBase64url(Uint8Array.from(hash.slice(2).match(/.{2}/g)!.map((b) => parseInt(b, 16))))
  );

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
