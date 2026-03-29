import type { WalletClient } from 'viem';
import { BrowserProvider, JsonRpcSigner } from 'ethers';

let reineiraSDK: any = null;

/** Convert a viem WalletClient to an ethers Signer */
async function walletClientToSigner(walletClient: WalletClient): Promise<JsonRpcSigner> {
  const { account, chain, transport } = walletClient;
  if (!account || !chain) throw new Error('WalletClient must have account and chain');
  const provider = new BrowserProvider(transport as any, { chainId: chain.id, name: chain.name });
  return provider.getSigner(account.address);
}

/**
 * Initialize the Reineira/Privara SDK with a wagmi wallet client.
 */
export async function initReineira(walletClient: WalletClient): Promise<any> {
  if (reineiraSDK) return reineiraSDK;

  try {
    const { ReineiraSDK } = await import('@reineira-os/sdk');
    const signer = await walletClientToSigner(walletClient);

    reineiraSDK = ReineiraSDK.create({
      network: 'testnet',
      signer,
    });

    await reineiraSDK.initialize();
    return reineiraSDK;
  } catch (error) {
    console.warn('Reineira SDK initialization failed:', error);
    return null;
  }
}

/**
 * Create an escrow for payroll payment via Privara.
 */
export async function createPayrollEscrow(
  walletClient: WalletClient,
  recipientAddress: string,
  amount: bigint
): Promise<any> {
  const sdk = await initReineira(walletClient);
  if (!sdk) throw new Error('Reineira SDK not available');

  const escrow = await sdk.escrow.create({
    owner: recipientAddress,
    amount,
  });

  return escrow;
}

/**
 * Fund an existing escrow.
 */
export async function fundEscrow(
  walletClient: WalletClient,
  escrowId: bigint,
  amount: bigint
): Promise<any> {
  const sdk = await initReineira(walletClient);
  if (!sdk) throw new Error('Reineira SDK not available');

  const escrow = sdk.escrow.get(escrowId);
  return escrow.fund(amount, { autoApprove: true });
}

/**
 * Redeem an escrow.
 */
export async function redeemEscrow(
  walletClient: WalletClient,
  escrowId: bigint
): Promise<any> {
  const sdk = await initReineira(walletClient);
  if (!sdk) throw new Error('Reineira SDK not available');

  const escrow = sdk.escrow.get(escrowId);
  return escrow.redeem();
}

/**
 * Get Reineira SDK instance (must init first).
 */
export function getReineiraSDK() {
  return reineiraSDK;
}
