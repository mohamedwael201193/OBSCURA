import { type PublicClient, type WalletClient } from 'viem';
import { Encryptable, FheTypes } from '@cofhe/sdk';

let cofheClient: any = null;
let isInitializing = false;
let lastConnectedAccount: string | null = null;

export type StepCallback = (step: string, context?: any) => void;

/**
 * Initialize the CoFHE client singleton.
 * Must be called after wallet connection.
 */
export async function initFHEClient(
  publicClient: PublicClient,
  walletClient: WalletClient
): Promise<any> {
  if (isInitializing) {
    // Wait for concurrent init to finish
    while (isInitializing) {
      await new Promise((r) => setTimeout(r, 100));
    }
    return cofheClient;
  }

  if (!cofheClient) {
    isInitializing = true;
    try {
      const { createCofheClient, createCofheConfig } = await import('@cofhe/sdk/web');
      const { arbSepolia } = await import('@cofhe/sdk/chains');
      const config = createCofheConfig({ supportedChains: [arbSepolia] });
      cofheClient = createCofheClient(config);
    } finally {
      isInitializing = false;
    }
  }

  // Only reconnect if wallet changed — avoids slow redundant connect() calls
  const currentAccount = walletClient.account?.address ?? null;
  if (currentAccount !== lastConnectedAccount) {
    await cofheClient.connect(publicClient, walletClient);
    lastConnectedAccount = currentAccount;
  }
  return cofheClient;
}

/**
 * Get the existing CoFHE client (must init first).
 */
export function getFHEClient() {
  return cofheClient;
}

/**
 * Encrypt an amount client-side for contract submission.
 * Returns the encrypted input struct ready for contract call.
 */
export async function encryptAmount(
  amount: bigint,
  onStep?: StepCallback
): Promise<any> {
  if (!cofheClient) throw new Error('FHE client not initialized');

  const result = await cofheClient
    .encryptInputs([Encryptable.uint64(amount)])
    .onStep((step: string, ctx: any) => {
      onStep?.(step, ctx);
    })
    .execute();

  return result;
}

/**
 * Encrypt an address client-side for escrow owner field.
 * Returns the encrypted address input struct.
 */
export async function encryptAddress(
  address: string,
  onStep?: StepCallback
): Promise<any> {
  if (!cofheClient) throw new Error('FHE client not initialized');

  const result = await cofheClient
    .encryptInputs([Encryptable.address(address)])
    .onStep((step: string, ctx: any) => {
      onStep?.(step, ctx);
    })
    .execute();

  return result;
}

/**
 * Encrypt multiple inputs (address + amount) in a single batch.
 * Returns array of encrypted input structs.
 */
export async function encryptAddressAndAmount(
  address: string,
  amount: bigint,
  onStep?: StepCallback
): Promise<any> {
  if (!cofheClient) throw new Error('FHE client not initialized');

  const result = await cofheClient
    .encryptInputs([Encryptable.address(address), Encryptable.uint64(amount)])
    .onStep((step: string, ctx: any) => {
      onStep?.(step, ctx);
    })
    .execute();

  return result;
}

/**
 * Decrypt a ciphertext handle for UI display.
 */
export async function decryptBalance(
  ctHash: bigint | string,
  onStep?: StepCallback
): Promise<bigint> {
  if (!cofheClient) throw new Error('FHE client not initialized');

  const handle = typeof ctHash === 'string' ? BigInt(ctHash) : ctHash;

  // Attempt 1: use existing permit
  onStep?.('Decrypting');
  try {
    const result = (await cofheClient
      .decryptForView(handle, FheTypes.Uint64)
      .execute()) as bigint;
    return result;
  } catch (err: any) {
    console.error('[fhe] sealOutput attempt 1 failed:', err?.message);
  }

  // Attempt 2: remove stale permit, create fresh one, retry
  onStep?.('Refreshing permit');
  try {
    const chainId = cofheClient.chainId ?? 421614;
    const acc = lastConnectedAccount;
    if (acc) {
      await cofheClient.permits.removeActivePermit(chainId, acc);
    }
    await cofheClient.permits.getOrCreateSelfPermit();
    onStep?.('Decrypting (retry)');
    const result = (await cofheClient
      .decryptForView(handle, FheTypes.Uint64)
      .execute()) as bigint;
    return result;
  } catch (retryErr: any) {
    console.error('[fhe] sealOutput attempt 2 failed:', retryErr?.message);
    throw retryErr;
  }
}

/**
 * Reset the account tracking so the FHE client reconnects on next initFHEClient call.
 * Call this after using a temporary stealth walletClient to restore the main wallet.
 */
export function resetFHEAccount(): void {
  lastConnectedAccount = null;
}

/**
 * Get or create a self-permit (EIP-712 signature).
 */
export async function getOrCreatePermit(): Promise<any> {
  if (!cofheClient) throw new Error('FHE client not initialized');
  return cofheClient.permits.getOrCreateSelfPermit();
}

/**
 * Get all active permits.
 */
export async function getPermits(): Promise<any> {
  if (!cofheClient) throw new Error('FHE client not initialized');
  try {
    return cofheClient.permits.getPermits?.() ?? {};
  } catch {
    return {};
  }
}

/**
 * Remove/revoke a permit.
 */
export async function removePermit(permitHash: string): Promise<void> {
  if (!cofheClient) throw new Error('FHE client not initialized');
  cofheClient.permits.removePermit?.(permitHash);
}
