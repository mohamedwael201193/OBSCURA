# @obscura/pay-402

> HTTP 402 "Payment Required" middleware powered by **confidential cUSDC** invoices on Arbitrum, encrypted end-to-end via Phenix CoFHE.

The legacy [HTTP 402](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/402) status code was reserved for a future digital-payments protocol that never shipped. With confidential stablecoins on Arbitrum and Obscura's `ObscuraInvoice` contract, it finally has a useful implementation: a server can demand encrypted, on-chain payment for a single API call without leaking the price, the payer, or the cumulative revenue to any observer.

## Install

```bash
npm i @obscura/pay-402 viem
```

## Quickstart (Express)

```ts
import express from "express";
import { paymentRequired } from "@obscura/pay-402";
import { yourMintInvoice, yourIsPaidDecryptor } from "./obscura-runtime";

const app = express();

app.get(
  "/api/premium",
  paymentRequired({
    invoiceContract: "0x62a86C8d68fF32ea41Faf349db6EF7EF496620b7",
    merchantAddress: "0xYourMerchantAddress",
    priceMicroUsdc: 50_000n, // $0.05 USDC
    payUrlBase: "https://obscura-os.vercel.app/pay",
    mintInvoice:    yourMintInvoice,
    isPaidDecryptor: yourIsPaidDecryptor,
  }),
  (req, res) => {
    res.json({ data: "secret thank-you payload" });
  },
);

app.listen(3000);
```

## How it works

1. Request arrives without `X-Payment-Invoice` header.
2. Middleware mints (or reuses) a fresh confidential invoice and responds **`402 Payment Required`** with the invoice id and a `claimUrl`.
3. Client opens the claimUrl in a wallet (Obscura's `/pay?invoice=...&contract=...` route handles this), pays the encrypted price.
4. Client re-issues the original request with `X-Payment-Invoice: <id>`.
5. Middleware reads the encrypted `isPaid` flag, decrypts it server-side via the injected `isPaidDecryptor`, and forwards the request when true.

Everything stays encrypted on-chain: outside observers see only that *some* address paid *some* invoice on `ObscuraInvoice` — no amount, no merchant revenue, no payer history.

## Hook points

- **`mintInvoice: () => Promise<bigint>`** — your runtime decides how invoices are pre-minted. Production deployments typically pre-mint a pool of 100 invoices off-thread and pop one per challenge.
- **`isPaidDecryptor: (handle, ctx) => Promise<boolean>`** — your server holds the merchant's CoFHE keypair and decrypts the `isPaid` handle via [`cofhejs`](https://www.npmjs.com/package/cofhejs).

A reference implementation of both hooks using cofhejs in Node is shipped in the Obscura main repo under [`scripts/pay402-reference-runtime.ts`](../../scripts/pay402-reference-runtime.ts).

## Web Fetch adapter (Bun, Cloudflare Workers, Hono)

```ts
import { withPaymentRequired } from "@obscura/pay-402";

export default {
  fetch: withPaymentRequired(opts, async (req) => {
    return new Response(JSON.stringify({ data: "ok" }));
  }),
};
```

## Status

**Wave 3 / phase C1.** The middleware itself is stable. The reference decryptor (cofhejs in Node) currently runs on Arbitrum Sepolia — production-grade key management for the merchant keypair is the responsibility of the deploying server.

## License

MIT
