# 02 — FHE & Privacy

## Encryption boundary

| Data | Type | Where stored | Who can decrypt |
|------|------|--------------|------------------|
| Per-user collateral | `euint64` | `market.collateral[user]` | the user, the market, allowed routers |
| Per-user debt | `euint64` | `market.debt[user]` | same |
| Per-user vault shares | `euint64` | `vault.shares[user]` | the user, the vault |
| Repay / supply amount handles | `euint64` | call-scope only | tx sender |
| Sealed bids | `euint64` | `auction.bid[id][bidder]` | the bidder + the auction (after deadline) |
| Credit score | `euint64` | `score.scores[user]`, `market.score[user]` | the user, the market |
| Stealth borrow destination | `eaddress` | call-scope only | tx sender |

## What is intentionally public

- Aggregate `totalSupplyAssets`, `totalBorrowAssets`, `utilizationBps` per market
- Oracle prices, IRM curve scalars
- Vault `publicTotalDeposited` (mirror), `feeBps`, route list
- Approval sets (allowed LLTV/liqBonus/liqThreshold values)
- Auction *existence*, *deadline*, *winning settlement event*

The mirrors are necessary so the IRM can compute rates and so off-chain UI can render TVL — they leak only protocol-wide aggregates, never per-user info.

## ACL pattern

Every encrypted handle written to storage uses three ACL calls:

```solidity
FHE.allowThis(handle);                // contract can re-read next tx
FHE.allow(handle, user);              // user wallet can decrypt client-side
FHE.allow(handle, allowedRouter);     // hooks/auction if needed
```

For per-call computation handles we use `FHE.allowTransient` instead, which is cheaper and auto-expires at end of tx.

## Why euint64 (not euint128)

Reineira cUSDC ships only the InEuint64 inbound + uint256-handle outbound overloads. Mixing widths would force per-call casts that the SDK does not support cheaply. We therefore **cap all amounts at `2^64 - 1` micro-USDC** (~ $18.4 trillion), which is sufficient for any realistic deployment.

## InEuint64 signature binding

`InEuint64.signature` is bound to the immediate `msg.sender` at the time the user produced it client-side. This means:

- A user can pass an `InEuint64` to **one** contract (the one they signed for).
- A contract cannot forward a user's `InEuint64` to a downstream contract.

This is why hooks use a **two-step pull**: the user signs an InEuint64 *for the hook*, the hook unwraps it via cUSDC.confidentialTransferFrom, and then the hook calls a non-InEuint64 entrypoint on the market with the resulting euint64 handle.

## Liquidation auctions

The MVP plaintext-mirror max-bid model means that the **winning bid amount becomes public on settlement** (everyone needs to know how much the auction received). Bid *amounts before settlement* and the *bidder identities* remain encrypted.

A future wave can replace this with a fully-encrypted comparator + zero-knowledge proof of correctness; out of scope for Wave 4.
