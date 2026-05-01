/**
 * @obscura/pay-402 — HTTP 402 Payment Required middleware powered by
 * confidential cUSDC invoices.
 *
 * Flow:
 *   1. Server receives a request without `X-Payment-Invoice` header.
 *   2. Middleware creates (or reuses) an ObscuraInvoice for the
 *      configured price and returns HTTP 402 with the invoice metadata
 *      in JSON: `{ price, invoiceContract, invoiceId, claimUrl }`.
 *   3. Client pays the invoice via Obscura (or any cUSDC wallet calling
 *      cUSDC.confidentialTransfer + invoice.recordPayment).
 *   4. Client retries the request with `X-Payment-Invoice: <id>`.
 *   5. Middleware reads the encrypted `isPaid` flag from chain. Because
 *      the merchant address granted the auditor permission to itself at
 *      invoice creation, the merchant can decrypt the flag server-side.
 *      If isPaid → request is forwarded to the protected handler.
 *
 * This file is the HOT PATH only. The actual decryption requires a
 * cofhejs server runtime that holds the merchant's private key — the
 * package exposes hook points so each deployment can plug its preferred
 * decrypt strategy (cofhe-node, hosted decryptor, etc.).
 *
 * Designed for Node (Express-style middlewares) and Web (Hono / Bun /
 * Cloudflare Workers compatible) — the contract surface is a single
 * function `paymentRequired(opts) → handler(req, res)` plus standalone
 * `verifyInvoiceHandle()` for non-middleware usage.
 */

import { createPublicClient, http, type Address, type PublicClient } from "viem";
import { arbitrumSepolia } from "viem/chains";

/** Minimal ABI for the ObscuraInvoice contract — only what the middleware
 *  needs to (a) read invoice creator, (b) check isPaid handle, and
 *  (c) detect cancellation/expiry. */
export const OBSCURA_INVOICE_MIN_ABI = [
  { type: "function", name: "exists", stateMutability: "view",
    inputs: [{ name: "id", type: "uint256" }], outputs: [{ type: "bool" }] },
  { type: "function", name: "getCreator", stateMutability: "view",
    inputs: [{ name: "id", type: "uint256" }], outputs: [{ type: "address" }] },
  { type: "function", name: "isCancelled", stateMutability: "view",
    inputs: [{ name: "id", type: "uint256" }], outputs: [{ type: "bool" }] },
  { type: "function", name: "getExpiryBlock", stateMutability: "view",
    inputs: [{ name: "id", type: "uint256" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "getIsPaid", stateMutability: "view",
    inputs: [{ name: "id", type: "uint256" }], outputs: [{ type: "uint256" }] },
] as const;

export interface Pay402Options {
  /** Address of the deployed ObscuraInvoice contract. */
  invoiceContract: Address;
  /** Address that owns the invoices (the merchant). */
  merchantAddress: Address;
  /** Price in cUSDC base units (6 decimals). */
  priceMicroUsdc: bigint;
  /** Public-facing URL where users can pay invoices.
   *  Must accept `?invoice=<id>&contract=<addr>` query string. */
  payUrlBase: string;
  /** Strategy for decrypting an `isPaid` handle.
   *  Return true iff the on-chain encrypted bool decrypts to true.
   *  Implementations typically use cofhejs server runtime. */
  isPaidDecryptor: (handle: bigint, ctx: { invoiceId: bigint; contract: Address }) => Promise<boolean>;
  /** Strategy for minting a fresh invoice when a request arrives without
   *  one. Should return the new on-chain invoiceId.
   *  Servers usually pre-mint a pool to avoid blocking on a tx per
   *  request — pass a function that pops from that pool. */
  mintInvoice: () => Promise<bigint>;
  /** Optional viem PublicClient. Defaults to a new arbitrum-sepolia client. */
  publicClient?: PublicClient;
  /** Optional RPC endpoint (used only when publicClient is not supplied). */
  rpcUrl?: string;
}

export interface Pay402Challenge {
  status: 402;
  body: {
    code: "PAYMENT_REQUIRED";
    price: { amountMicroUsdc: string; symbol: "cUSDC" };
    invoice: { contract: Address; id: string };
    claimUrl: string;
    instructions: string;
  };
  headers: Record<string, string>;
}

export interface Pay402Verified {
  status: "ok";
  invoiceId: bigint;
}

export type Pay402Result = Pay402Challenge | Pay402Verified;

const DEFAULT_INSTRUCTIONS =
  "Open the claimUrl in any wallet, pay with confidential cUSDC, then retry the original request with header `X-Payment-Invoice: <id>`.";

/**
 * Core verification function — framework-agnostic.
 *
 * Pass it the incoming `X-Payment-Invoice` header value (string or null).
 * Returns either:
 *   - { status: "ok", invoiceId } — request may proceed
 *   - a 402 challenge — caller must serialize and respond
 */
export async function verifyOrChallenge(
  invoiceIdHeader: string | null,
  opts: Pay402Options
): Promise<Pay402Result> {
  const client =
    opts.publicClient ??
    createPublicClient({
      chain: arbitrumSepolia,
      transport: http(opts.rpcUrl),
    });

  // No invoice presented → mint a new one and challenge.
  if (!invoiceIdHeader || !/^\d+$/.test(invoiceIdHeader)) {
    const newId = await opts.mintInvoice();
    return buildChallenge(newId, opts);
  }

  const invoiceId = BigInt(invoiceIdHeader);

  // Validate the invoice exists, isn't cancelled or expired.
  const [exists, creator, cancelled, expiry] = await Promise.all([
    client.readContract({
      address: opts.invoiceContract,
      abi: OBSCURA_INVOICE_MIN_ABI,
      functionName: "exists",
      args: [invoiceId],
    }),
    client.readContract({
      address: opts.invoiceContract,
      abi: OBSCURA_INVOICE_MIN_ABI,
      functionName: "getCreator",
      args: [invoiceId],
    }),
    client.readContract({
      address: opts.invoiceContract,
      abi: OBSCURA_INVOICE_MIN_ABI,
      functionName: "isCancelled",
      args: [invoiceId],
    }),
    client.readContract({
      address: opts.invoiceContract,
      abi: OBSCURA_INVOICE_MIN_ABI,
      functionName: "getExpiryBlock",
      args: [invoiceId],
    }),
  ]);

  if (!exists || cancelled) {
    return buildChallenge(await opts.mintInvoice(), opts);
  }
  if (creator.toLowerCase() !== opts.merchantAddress.toLowerCase()) {
    return buildChallenge(await opts.mintInvoice(), opts);
  }
  if (expiry > 0n) {
    const head = await client.getBlockNumber();
    if (head >= expiry) {
      return buildChallenge(await opts.mintInvoice(), opts);
    }
  }

  // Read the encrypted isPaid handle and decrypt via injected strategy.
  const isPaidHandle = (await client.readContract({
    address: opts.invoiceContract,
    abi: OBSCURA_INVOICE_MIN_ABI,
    functionName: "getIsPaid",
    args: [invoiceId],
  })) as bigint;

  const paid = await opts.isPaidDecryptor(isPaidHandle, {
    invoiceId,
    contract: opts.invoiceContract,
  });

  if (!paid) {
    // Re-issue the same invoice — caller hasn't paid yet.
    return buildChallenge(invoiceId, opts);
  }

  return { status: "ok", invoiceId };
}

function buildChallenge(invoiceId: bigint, opts: Pay402Options): Pay402Challenge {
  const claimUrl = `${opts.payUrlBase}?invoice=${invoiceId.toString()}&contract=${opts.invoiceContract}`;
  return {
    status: 402,
    headers: {
      "X-Payment-Invoice": invoiceId.toString(),
      "X-Payment-Contract": opts.invoiceContract,
      "X-Payment-Currency": "cUSDC",
      "X-Payment-Amount-Micro": opts.priceMicroUsdc.toString(),
      "X-Payment-Claim-Url": claimUrl,
    },
    body: {
      code: "PAYMENT_REQUIRED",
      price: { amountMicroUsdc: opts.priceMicroUsdc.toString(), symbol: "cUSDC" },
      invoice: { contract: opts.invoiceContract, id: invoiceId.toString() },
      claimUrl,
      instructions: DEFAULT_INSTRUCTIONS,
    },
  };
}

// ─── Express adapter ────────────────────────────────────────────────────

/** Express middleware factory.
 *
 * @example
 *   app.get("/api/premium", paymentRequired(opts), (req, res) => {
 *     res.json({ secret: "thanks for paying!" });
 *   });
 */
export function paymentRequired(opts: Pay402Options) {
  return async function pay402Middleware(req: any, res: any, next: any) {
    try {
      const header = (req.headers["x-payment-invoice"] ?? null) as string | null;
      const result = await verifyOrChallenge(header, opts);
      if (result.status === "ok") {
        (req as any).pay402 = { invoiceId: result.invoiceId };
        return next();
      }
      for (const [k, v] of Object.entries(result.headers)) res.setHeader(k, v);
      res.status(402).json(result.body);
    } catch (err) {
      next(err);
    }
  };
}

// ─── Web/Fetch adapter (Hono, Bun, CF Workers) ──────────────────────────

/** Fetch-style middleware wrapper.
 *
 * @example
 *   const handler = withPaymentRequired(opts, async (req) => {
 *     return new Response(JSON.stringify({ secret: "ok" }), { status: 200 });
 *   });
 */
export function withPaymentRequired(
  opts: Pay402Options,
  handler: (req: Request) => Promise<Response> | Response
) {
  return async function pay402Handler(req: Request): Promise<Response> {
    const header = req.headers.get("x-payment-invoice");
    const result = await verifyOrChallenge(header, opts);
    if (result.status === "ok") return handler(req);
    return new Response(JSON.stringify(result.body), {
      status: 402,
      headers: { "Content-Type": "application/json", ...result.headers },
    });
  };
}
