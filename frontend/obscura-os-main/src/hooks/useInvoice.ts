/**
 * useInvoice — confidential invoice creation + payment + listing.
 *
 * Three operations:
 *  1. createInvoice(amount, memo, expiryBlock) — creator publishes an
 *     encrypted billed amount + optional plaintext memo (hashed on-chain).
 *  2. payInvoice(invoiceId, amount) — payer asserts a payment amount.
 *     Performs TWO transactions in sequence:
 *       a. cUSDC.confidentialTransfer(creator, encAmount)
 *       b. invoice.recordPayment(invoiceId, encAmount)
 *  3. cancelInvoice(invoiceId) — creator marks cancelled.
 *
 * Local storage caches:
 *  - obscura.invoices.created.v1:<addr> — invoices THIS wallet created
 *  - obscura.invoices.paid.v1:<addr>    — invoices THIS wallet paid
 */
import { useCallback, useEffect, useState } from "react";
import { useAccount, usePublicClient, useWalletClient, useWriteContract } from "wagmi";
import { arbitrumSepolia } from "viem/chains";
import { keccak256, toBytes } from "viem";
import {
  OBSCURA_INVOICE_ADDRESS,
  OBSCURA_INVOICE_ABI,
  REINEIRA_CUSDC_ADDRESS,
  REINEIRA_CUSDC_ABI,
} from "@/config/pay";
import { initFHEClient, encryptAmount } from "@/lib/fhe";
import { withRateLimitRetry } from "@/lib/rateLimit";
import { estimateCappedFees } from "@/lib/gas";
import { getJSON, setJSON } from "@/lib/scopedStorage";

const CREATED_KEY = "obscura.invoices.created.v1";
const PAID_KEY = "obscura.invoices.paid.v1";

export interface SavedInvoice {
  invoiceId: string;
  amount: string;          // base units, plaintext (only stored locally on creator's machine)
  memo: string;            // plaintext memo (local only)
  memoHash: `0x${string}`; // keccak256 of memo
  expiryBlock: string;     // "0" if no expiry
  txHash: `0x${string}`;
  contract: `0x${string}`;
  createdAt: number;
}

export interface PaidInvoiceRecord {
  invoiceId: string;
  amount: string;
  payer: `0x${string}`;
  creator: `0x${string}`;
  txHash: `0x${string}`;
  contract: `0x${string}`;
  paidAt: number;
}

function loadCreated(addr?: `0x${string}`): SavedInvoice[] {
  return getJSON<SavedInvoice[]>(CREATED_KEY, addr, []);
}
function pushCreated(addr: `0x${string}` | undefined, inv: SavedInvoice) {
  const list = loadCreated(addr);
  list.unshift(inv);
  setJSON(CREATED_KEY, addr, list);
}
function loadPaid(addr?: `0x${string}`): PaidInvoiceRecord[] {
  return getJSON<PaidInvoiceRecord[]>(PAID_KEY, addr, []);
}
function pushPaid(addr: `0x${string}` | undefined, rec: PaidInvoiceRecord) {
  const list = loadPaid(addr);
  list.unshift(rec);
  setJSON(PAID_KEY, addr, list);
}

export function useInvoice() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const { writeContractAsync } = useWriteContract();

  const [created, setCreated] = useState<SavedInvoice[]>(() => loadCreated());
  const [paid, setPaid] = useState<PaidInvoiceRecord[]>(() => loadPaid());

  useEffect(() => {
    setCreated(loadCreated(address));
    setPaid(loadPaid(address));
  }, [address]);

  const createInvoice = useCallback(
    async (amount: bigint, memo: string, expiryBlock: bigint = 0n) => {
      if (!publicClient || !walletClient || !address || !OBSCURA_INVOICE_ADDRESS) {
        throw new Error("Wallet not connected or invoice contract not configured");
      }
      await initFHEClient(publicClient, walletClient);
      const enc = await encryptAmount(amount, (s) => { if (import.meta.env.DEV) console.log("[Invoice encrypt]", s); });
      const memoHash: `0x${string}` = memo
        ? keccak256(toBytes(memo))
        : ("0x" + "00".repeat(32)) as `0x${string}`;

      const fees = await withRateLimitRetry(() => estimateCappedFees(publicClient));
      const hash = await withRateLimitRetry(() => writeContractAsync({
        address: OBSCURA_INVOICE_ADDRESS,
        abi: OBSCURA_INVOICE_ABI,
        functionName: "create",
        args: [enc[0], memoHash, expiryBlock],
        account: address,
        chain: arbitrumSepolia,
        maxFeePerGas: fees.maxFeePerGas,
        maxPriorityFeePerGas: fees.maxPriorityFeePerGas,
        gas: 800_000n,
      }));
      const receipt = await withRateLimitRetry(() =>
        publicClient.waitForTransactionReceipt({ hash })
      );
      // Parse InvoiceCreated event for the new invoice id (topics[1]).
      let invoiceId = "?";
      for (const log of receipt.logs) {
        if (
          log.address.toLowerCase() === OBSCURA_INVOICE_ADDRESS.toLowerCase() &&
          log.topics.length >= 2 &&
          log.topics[1]
        ) {
          invoiceId = BigInt(log.topics[1]).toString();
          break;
        }
      }
      const saved: SavedInvoice = {
        invoiceId,
        amount: amount.toString(),
        memo,
        memoHash,
        expiryBlock: expiryBlock.toString(),
        txHash: hash,
        contract: OBSCURA_INVOICE_ADDRESS,
        createdAt: Date.now(),
      };
      pushCreated(address, saved);
      setCreated(loadCreated(address));
      return { invoiceId, hash };
    },
    [publicClient, walletClient, address, writeContractAsync]
  );

  const payInvoice = useCallback(
    async (invoiceId: bigint, amount: bigint) => {
      if (!publicClient || !walletClient || !address || !OBSCURA_INVOICE_ADDRESS || !REINEIRA_CUSDC_ADDRESS) {
        throw new Error("Wallet not connected or contracts not configured");
      }
      await initFHEClient(publicClient, walletClient);

      // Look up the invoice creator address (plaintext on-chain).
      const creator = (await publicClient.readContract({
        address: OBSCURA_INVOICE_ADDRESS,
        abi: OBSCURA_INVOICE_ABI,
        functionName: "getCreator",
        args: [invoiceId],
      })) as `0x${string}`;
      if (!creator || creator === "0x0000000000000000000000000000000000000000") {
        throw new Error("Invoice not found");
      }

      // ── Tx 1: cUSDC.confidentialTransfer(creator, encAmount) ──
      const transferEnc = await encryptAmount(amount, (s) => { if (import.meta.env.DEV) console.log("[Invoice pay encrypt #1 cUSDC]", s); });
      const tFees = await withRateLimitRetry(() => estimateCappedFees(publicClient));
      const transferHash = await withRateLimitRetry(() => writeContractAsync({
        address: REINEIRA_CUSDC_ADDRESS,
        abi: REINEIRA_CUSDC_ABI,
        functionName: "confidentialTransfer",
        args: [creator, transferEnc[0]],
        account: address,
        chain: arbitrumSepolia,
        maxFeePerGas: tFees.maxFeePerGas,
        maxPriorityFeePerGas: tFees.maxPriorityFeePerGas,
        gas: 600_000n,
      }));
      const transferReceipt = await withRateLimitRetry(() =>
        publicClient.waitForTransactionReceipt({ hash: transferHash })
      );
      if (transferReceipt.status !== "success") {
        throw new Error(`cUSDC transfer to invoice creator reverted (tx: ${transferHash})`);
      }

      // Brief pause so CoFHE proof commit window settles.
      await new Promise((r) => setTimeout(r, 8000));

      // ── Tx 2: invoice.recordPayment(invoiceId, encAmount) ──
      const recEnc = await encryptAmount(amount, (s) => { if (import.meta.env.DEV) console.log("[Invoice pay encrypt #2 record]", s); });
      const rFees = await withRateLimitRetry(() => estimateCappedFees(publicClient));
      const recordHash = await withRateLimitRetry(() => writeContractAsync({
        address: OBSCURA_INVOICE_ADDRESS,
        abi: OBSCURA_INVOICE_ABI,
        functionName: "recordPayment",
        args: [invoiceId, recEnc[0]],
        account: address,
        chain: arbitrumSepolia,
        maxFeePerGas: rFees.maxFeePerGas,
        maxPriorityFeePerGas: rFees.maxPriorityFeePerGas,
        gas: 800_000n,
      }));
      const recordReceipt = await withRateLimitRetry(() =>
        publicClient.waitForTransactionReceipt({ hash: recordHash })
      );
      if (recordReceipt.status !== "success") {
        throw new Error(`recordPayment reverted (tx: ${recordHash})`);
      }

      // Cache the paid record locally for the payer's history.
      pushPaid(address, {
        invoiceId: invoiceId.toString(),
        amount: amount.toString(),
        payer: address,
        creator,
        txHash: recordHash,
        contract: OBSCURA_INVOICE_ADDRESS,
        paidAt: Date.now(),
      });
      setPaid(loadPaid(address));

      return { transferHash, recordHash };
    },
    [publicClient, walletClient, address, writeContractAsync]
  );

  const cancelInvoice = useCallback(
    async (invoiceId: bigint) => {
      if (!publicClient || !address || !OBSCURA_INVOICE_ADDRESS) {
        throw new Error("Wallet not connected");
      }
      const fees = await withRateLimitRetry(() => estimateCappedFees(publicClient));
      const hash = await writeContractAsync({
        address: OBSCURA_INVOICE_ADDRESS,
        abi: OBSCURA_INVOICE_ABI,
        functionName: "cancel",
        args: [invoiceId],
        account: address,
        chain: arbitrumSepolia,
        maxFeePerGas: fees.maxFeePerGas,
        maxPriorityFeePerGas: fees.maxPriorityFeePerGas,
        gas: 200_000n,
      });
      await publicClient.waitForTransactionReceipt({ hash });
      return hash;
    },
    [publicClient, address, writeContractAsync]
  );

  const probeInvoice = useCallback(
    async (invoiceId: bigint) => {
      if (!publicClient || !OBSCURA_INVOICE_ADDRESS) return null;
      try {
        const [exists, creator, cancelled, expiryBlock, memoHash] = await Promise.all([
          publicClient.readContract({
            address: OBSCURA_INVOICE_ADDRESS,
            abi: OBSCURA_INVOICE_ABI,
            functionName: "exists",
            args: [invoiceId],
          }),
          publicClient.readContract({
            address: OBSCURA_INVOICE_ADDRESS,
            abi: OBSCURA_INVOICE_ABI,
            functionName: "getCreator",
            args: [invoiceId],
          }),
          publicClient.readContract({
            address: OBSCURA_INVOICE_ADDRESS,
            abi: OBSCURA_INVOICE_ABI,
            functionName: "isCancelled",
            args: [invoiceId],
          }),
          publicClient.readContract({
            address: OBSCURA_INVOICE_ADDRESS,
            abi: OBSCURA_INVOICE_ABI,
            functionName: "getExpiryBlock",
            args: [invoiceId],
          }),
          publicClient.readContract({
            address: OBSCURA_INVOICE_ADDRESS,
            abi: OBSCURA_INVOICE_ABI,
            functionName: "getMemoHash",
            args: [invoiceId],
          }),
        ]);
        return {
          exists: exists as boolean,
          creator: creator as `0x${string}`,
          cancelled: cancelled as boolean,
          expiryBlock: expiryBlock as bigint,
          memoHash: memoHash as `0x${string}`,
        };
      } catch {
        return null;
      }
    },
    [publicClient]
  );

  return {
    created,
    paid,
    createInvoice,
    payInvoice,
    cancelInvoice,
    probeInvoice,
  };
}
