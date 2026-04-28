/**
 * txGuard — simulate → submit → await receipt → throw on revert.
 *
 * Why this lives in one place:
 * - Wave 2 bug #150 was a fire-and-forget tx whose silent revert made the
 *   downstream UI think a payment succeeded when it actually didn't.
 * - Anti-regression rule: every contract write goes through
 *   `submitAndConfirm` so a reverted tx ALWAYS throws and the UI ALWAYS
 *   knows about it.
 *
 * Composition:
 *   1. estimateCappedFees (always — never trust caller-supplied fees)
 *   2. simulateContract pre-flight (catches reverts BEFORE MetaMask popup)
 *   3. writeContract via the supplied wallet client
 *   4. waitForTransactionReceipt
 *   5. throw on `status === "reverted"` with a clear message
 */
import type {
  Abi,
  ContractFunctionArgs,
  ContractFunctionName,
  PublicClient,
  TransactionReceipt,
  WalletClient,
} from "viem";
import { estimateCappedFees } from "./gas";

export interface SubmitOptions<TAbi extends Abi> {
  publicClient: PublicClient;
  walletClient: WalletClient;
  account: `0x${string}`;
  address: `0x${string}`;
  abi: TAbi;
  functionName: ContractFunctionName<TAbi, "nonpayable" | "payable">;
  args: ContractFunctionArgs<TAbi, "nonpayable" | "payable">;
  /** Optional human-readable label included in error messages. */
  label?: string;
  /** Optional gas override (otherwise simulate-derived). */
  gas?: bigint;
  /** Optional value (for payable functions). */
  value?: bigint;
  /** Skip simulation (only for known-fragile pre-flight, e.g. FHE writes
   *  whose calldata changes between simulate and submit). */
  skipSimulate?: boolean;
}

export interface SubmitResult {
  hash: `0x${string}`;
  receipt: TransactionReceipt;
}

/**
 * Submit a transaction with full safety: pre-flight simulate, EIP-1559
 * capped fees, await receipt, throw on revert.
 */
export async function submitAndConfirm<TAbi extends Abi>(
  opts: SubmitOptions<TAbi>
): Promise<SubmitResult> {
  const label = opts.label ?? String(opts.functionName);
  const fees = await estimateCappedFees(opts.publicClient);

  if (!opts.skipSimulate) {
    try {
      // viem's simulateContract throws on revert with a structured error,
      // surfacing the contract's revert reason BEFORE we open MetaMask.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await opts.publicClient.simulateContract({
        address: opts.address,
        abi: opts.abi,
        functionName: opts.functionName,
        args: opts.args,
        account: opts.account,
        value: opts.value,
      } as any);
    } catch (err) {
      const msg =
        (err as { shortMessage?: string; message?: string })?.shortMessage ??
        (err as { message?: string })?.message ??
        String(err);
      throw new Error(`${label} would revert: ${msg}`);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const hash = await opts.walletClient.writeContract({
    address: opts.address,
    abi: opts.abi,
    functionName: opts.functionName,
    args: opts.args,
    account: opts.account,
    chain: opts.walletClient.chain,
    gas: opts.gas,
    value: opts.value,
    ...fees,
  } as any);

  const receipt = await opts.publicClient.waitForTransactionReceipt({ hash });
  if (receipt.status === "reverted") {
    throw new Error(`${label} reverted on-chain (tx ${hash})`);
  }
  return { hash, receipt };
}
