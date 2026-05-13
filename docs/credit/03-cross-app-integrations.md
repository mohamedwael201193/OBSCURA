# 03 — Cross-App Integrations

ObscuraCredit is designed to **consume** the rest of the Obscura suite. Every integration is opt-in by the user and gracefully degrades if the upstream contract is missing.

## ObscuraPayStream → Auto-repay

Flow:
1. User opens **Settings → Auto-repay** in the Credit page.
2. User picks a market, a `perCycle` amount and a `periodDays` cadence.
3. Credit page calls `ObscuraCreditStreamHook.enable(market, perCycle, periodDays)`.
4. The hook registers itself as a stream cycle handler in `ObscuraPayStream`.
5. On every cycle tick, anyone can call `ObscuraPayStream.tick(streamId)`. The stream calls back into the hook's `onCycle` which:
   - Pulls `perCycle` cUSDC from the user (operator approval required).
   - Calls `market.repayFromHook(user, perCycle, handle)`.

Failure modes:
- If the user revokes the cUSDC operator → the pull reverts → cycle is skipped (no penalty).
- If `perCycle > user debt` → market clamps to current debt encryptedly.

## ObscuraInsuranceSubscription → Auto-top collateral

Same shape as auto-repay. Subscribe to an insurance product; on payout, the hook calls `market.supplyCollateralFromHook` instead of the user's wallet, restoring the position before liquidation triggers.

## ObscuraPay + ObscuraVote + ObscuraAddressBook → Credit Score

`ObscuraCreditScore.computeScore(user)` reads:

```solidity
try IObscuraPayStream(payStream).onTimeRatio(user) returns (uint256 r) { ... }
catch { /* skip */ }
try IObscuraVote(vote).participationBps(user) returns (uint256 p) { ... }
catch { /* skip */ }
try IObscuraAddressBook(book).contactCount(user) returns (uint256 c) { ... }
catch { /* skip */ }
```

Each missing source costs the user some points but never reverts. The result is one `euint64` in `[0, 1000]` with the user as the sole authorized decryptor, plus an `attestToMarket(market)` entrypoint that publishes the score *into* a market for collateral-factor uplifts.

## ObscuraTreasury → Governance Proxy → Factory

All factory mutations (LLTV approval sets, market auction engine wiring, hook registration) flow through `ObscuraCreditGovernanceProxy`, whose `owner` is the existing `ObscuraTreasury`. This lets the same Vote/Treasury process that governs Pay/Vote also govern Credit, with no new admin keys.

## Stealth payouts (Wave 1 ObscuraStealthRegistry)

The borrow form encrypts the destination address as `eaddress`. The recipient does **not** need to be the borrower — typical use:

- DAO treasury borrows against its vault deposit and routes funds straight to a contributor's stealth address.
- The contributor's identity is hidden from on-chain analytics; the borrow size is hidden from everyone.
