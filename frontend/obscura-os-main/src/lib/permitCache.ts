/**
 * permitCache — single-flight, session-persistent EIP-712 permit cache for CoFHE.
 *
 * Why: every FHE `decryptForView` re-asks the SDK for a permit. The default
 * SDK behavior pops a MetaMask `eth_signTypedData_v4` prompt the first time
 * the active permit is missing — and again any time the SDK throws and we
 * "refresh" it. This wrapper:
 *   1. Returns the existing valid permit if one is in-memory.
 *   2. Returns a sessionStorage-persisted permit (24h TTL) if still valid.
 *   3. De-duplicates concurrent callers — only one signTypedData ever fires.
 *   4. Hard-resets on wallet disconnect / network switch.
 *
 * The cache key is `chainId|account`. Sessions are scoped per-tab via
 * `sessionStorage` so revealing on tab-A does not leak to tab-B users.
 */
const TTL_MS = 24 * 60 * 60 * 1000;
const STORE_PREFIX = "obscura:permit:v1:";

interface CachedPermit {
  /** Raw permit object returned by `permits.getOrCreateSelfPermit()`. */
  permit: any;
  /** ms timestamp of creation. */
  createdAt: number;
}

const memCache = new Map<string, CachedPermit>();
const inflight = new Map<string, Promise<any>>();

function storageKey(chainId: number, account: string): string {
  return `${STORE_PREFIX}${chainId}:${account.toLowerCase()}`;
}

function readSession(key: string): CachedPermit | null {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedPermit;
    if (Date.now() - parsed.createdAt > TTL_MS) {
      sessionStorage.removeItem(key);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function writeSession(key: string, p: CachedPermit) {
  try {
    sessionStorage.setItem(key, JSON.stringify(p));
  } catch { /* quota or private-mode */ }
}

/**
 * Get a permit (signed once, reused for 24h within the tab).
 * @param client CoFHE client instance
 * @param chainId active chain id
 * @param account active wallet address
 */
export async function getCachedPermit(
  client: any,
  chainId: number,
  account: string
): Promise<any> {
  const key = storageKey(chainId, account);

  // 1) in-memory hit (fastest)
  const hot = memCache.get(key);
  if (hot && Date.now() - hot.createdAt < TTL_MS) return hot.permit;

  // 2) sessionStorage hit — re-hydrate to memory
  const warm = readSession(key);
  if (warm) {
    memCache.set(key, warm);
    return warm.permit;
  }

  // 3) single-flight signature request
  const pending = inflight.get(key);
  if (pending) return pending;

  const promise = (async () => {
    try {
      const permit = await client.permits.getOrCreateSelfPermit();
      const entry: CachedPermit = { permit, createdAt: Date.now() };
      memCache.set(key, entry);
      writeSession(key, entry);
      return permit;
    } finally {
      inflight.delete(key);
    }
  })();
  inflight.set(key, promise);
  return promise;
}

/** Force-invalidate cached permits — call on disconnect / network switch. */
export function invalidatePermitCache(chainId?: number, account?: string) {
  if (chainId && account) {
    const key = storageKey(chainId, account);
    memCache.delete(key);
    try { sessionStorage.removeItem(key); } catch { /* */ }
    return;
  }
  memCache.clear();
  try {
    for (let i = sessionStorage.length - 1; i >= 0; i--) {
      const k = sessionStorage.key(i);
      if (k && k.startsWith(STORE_PREFIX)) sessionStorage.removeItem(k);
    }
  } catch { /* */ }
}

/** Check whether a valid permit currently exists for the given identity. */
export function hasCachedPermit(chainId: number, account: string): boolean {
  const key = storageKey(chainId, account);
  const hot = memCache.get(key);
  if (hot && Date.now() - hot.createdAt < TTL_MS) return true;
  return readSession(key) !== null;
}
