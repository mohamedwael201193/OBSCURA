# @obscura/credit-keeper

Open-source liquidation keeper for Obscura Credit on Arbitrum Sepolia.

## What it does

1. **Scan** — every `POLL_INTERVAL_MS`, iterates borrowers in each market
   (M-86 / M-70-WETH / M-50-OBS), reads `getPlainBorrow` + `getPlainCollateral`
   shadows, fetches USD prices from the Chainlink adapters deployed in Wave 5
   Phase 2, and computes health-factor off-chain. When HF ≤ `liqThresholdBps`
   it calls `market.liquidationOpen(borrower)`.
2. **Settle** — when an `AuctionOpened` window expires, calls `auction.settle(id)`
   so the market can apply liquidation accounting.
3. **Bid** — *operator-specific*. See "Bid integration" below.

The default `DRY_RUN=true` makes it safe to leave running in a screen / pm2:
it only **logs** what it would do, never broadcasts.

## Privacy boundaries

| Read by keeper | Source | Privacy |
|---|---|---|
| Plain debt / collateral shadows | `getPlainBorrow` / `getPlainCollateral` | **Public** by design — these exist as plaintext revert-guard mirrors so liquidation triage works without coprocessor calls. |
| USD prices | Chainlink adapters | **Public**. |
| Encrypted positions | `getPosition()` | **Not read** — keeper has no ACL. |

The keeper's own bid amount is encrypted client-side via `@fhenixprotocol/cofhe-sdk`
before being submitted; only the keeper and the auction contract can ever read it.

## Install

```bash
cd packages/credit-keeper
npm install
cp .env.example .env
# Edit .env: set KEEPER_PRIVATE_KEY, adapter addresses, DRY_RUN=false to go live
```

## Run

```bash
# One-shot scan (does not broadcast in dry-run)
npm run scan

# Continuous loop
npm run dev
```

## Going live

1. Run `scripts/deployWave5Phase1And2.ts` on `contracts-hardhat/` first — it
   produces the `ChainlinkPriceAdapter` addresses.
2. Paste them into `.env` under `CHAINLINK_ETHUSD_ADAPTER` and
   `CHAINLINK_USDCUSD_ADAPTER`.
3. Fund a fresh keeper wallet with ~0.05 ETH on Arbitrum Sepolia.
4. Set `DRY_RUN=false` only after a clean dry-run pass.

## Bid integration

Sealed-bid submission is intentionally **not** wired in this skeleton because:

- Encrypting via `cofhe-sdk` requires either a permit or a server-mode keypair
  that's specific to your risk policy.
- A naive bid (e.g. always bid `seizedColl * 0.98`) loses money on bad debt; a
  smart bid needs to model debt position + market spread.

To add bidding, in `src/index.ts` extend the `scanAuctions` `OPEN` branch to:

```ts
import { createCofheClient, Encryptable } from "@fhenixprotocol/cofhe-sdk";

// per-process client init (once)
const fhe = await createCofheClient({ chainId: 421614, signer: /* viem wallet adapter */ });

// in the open-auction branch:
const bidPlain = computeBidPolicy(/* borrower position */);
const enc = await fhe.encrypt([Encryptable.uint64(BigInt(bidPlain))]);
await wallet.writeContract({
    address: cfg.auction, abi: AUCTION_ABI,
    functionName: "submitBid",
    args: [id, bidPlain, enc[0]],
});
```

The `computeBidPolicy` function is operator-defined.

## Safety

- The keeper uses `MAX_GAS_GWEI` as a cap. Tick is skipped when base fee
  exceeds it.
- `DRY_RUN` defaults to `true`. Even with a funded key, nothing broadcasts
  unless you explicitly flip it.
- The keeper never approaches encrypted handles — there is no risk of leaking
  position privacy from operating it.
