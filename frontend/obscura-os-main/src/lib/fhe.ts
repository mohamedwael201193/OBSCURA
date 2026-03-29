import { type PublicClient, type WalletClient } from 'viem';
import { Encryptable, FheTypes } from '@cofhe/sdk';

let cofheClient: any = null;
let isInitializing = false;

export type StepCallback = (step: string, context?: any) => void;

/**
 * Initialize the CoFHE client singleton.
 * Must be called after wallet connection.
 */
export async function initFHEClient(
  publicClient: PublicClient,
  walletClient: WalletClient
): Promise<any> {
  if (cofheClient) return cofheClient;
  if (isInitializing) {
    // Wait for existing init
    while (isInitializing) {
      await new Promise((r) => setTimeout(r, 100));
    }
    return cofheClient;
  }

  isInitializing = true;
  try {
    const { createCofheClient, createCofheConfig } = await import('@cofhe/sdk/web');
    const { arbSepolia } = await import('@cofhe/sdk/chains');

    const config = createCofheConfig({
      supportedChains: [arbSepolia],
    });

    cofheClient = createCofheClient(config);
    await cofheClient.connect(publicClient, walletClient);
    return cofheClient;
  } finally {
    isInitializing = false;
  }
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
 * Decrypt a ciphertext handle for UI display.
 */
export async function decryptBalance(
  ctHash: bigint | string,
  onStep?: StepCallback
): Promise<bigint> {
  if (!cofheClient) throw new Error('FHE client not initialized');

  const result = await cofheClient
    .decryptForView(ctHash, FheTypes.Uint64)
    .withPermit()
    .execute();

  return result;
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
