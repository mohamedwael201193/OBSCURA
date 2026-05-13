# 07 — Security

## Threat model

| Actor | Capability | Mitigation |
|---|---|---|
| Random observer | Read aggregate market totals only | Per-user data is `euint64` with strict ACLs |
| Other borrower | Cannot see your debt or collateral | ACLs restrict decryption to `(user, market, allowed routers)` |
| Curator of vault A | Cannot touch vault B funds | Vaults are isolated contracts with separate balances |
| Market oracle (compromised) | Can liquidate borrowers in *that* market only | Markets are isolated; one bad oracle ≠ contagion |
| Hook (StreamHook / InsuranceHook) | Can repay/top-collateral *only* on registered markets, *only* on behalf of users who explicitly approved | `mapping(address ⇒ bool) isRepayRouter` + cUSDC operator approval |
| Auctioneer | Cannot front-run sealed bids; only after deadline | Bids are encrypted until `settle()` decrypts the max |
| Governance (Treasury) | Cannot read user data; cannot change deployed market params | Markets are immutable; ACLs do not grant Treasury |
| Deployer EOA | Removed at end of deploy | `factory.transferGovernor(proxy)` |

## Known limitations (MVP)

1. **Liquidation auction reveals winning bid amount on settlement.** This is necessary so the market knows how much it received. Bidder identity & losing bid amounts remain encrypted. A future wave can use a fully-encrypted comparator.
2. **Vault is 1:1 share/asset.** No interest accrual into shares, no dynamic NAV. LPs receive yield only via the curator-set fee distribution. Full ERC4626-style accounting is deferred.
3. **MockChainlinkFeed used on testnet.** Production deploys must wire real Chainlink feeds.
4. **No pause / circuit breaker.** Intentional — see [06-governance.md](06-governance.md#emergency-model).
5. **Plaintext `totalSupplyAssets` / `totalBorrowAssets` mirrors.** Required by the IRM. They reveal *aggregate* protocol state, not per-user state.
6. **Health factor is computed client-side from user-supplied USD values.** The chain enforces collateral-vs-debt math in `borrow`/`withdrawCollateral` using the encrypted truth; the UI badge is informational only.

## Audit checklist (recommended before mainnet)

- [ ] Re-derive every market's LLTV/liqThreshold relationship: `liqThreshold > LLTV` strictly.
- [ ] Fuzz the IRM `getRates` near `kinkBpsP` and at `utilization == 0` and `== 1.0`.
- [ ] Verify `repayFromHook` cannot be called by any address not in `isRepayRouter`.
- [ ] Verify the two-step pull cannot be replayed (cUSDC operator approval has expiry).
- [ ] Confirm CREATE2 salt uniqueness across markets.
- [ ] Check `FHE.allow` is not called with attacker-controlled `user` parameter anywhere.
- [ ] Re-run `npx hardhat test` — all 15 tests must pass.

## Test coverage

15/15 tests in `contracts-hardhat/test/ObscuraCredit*.test.ts`:

- Oracle price round-trip (encrypted + plaintext)
- IRM kink boundary
- Factory approval set add/remove
- Market supply/withdraw/borrow/repay (encrypted)
- Market collateral supply/withdraw
- Market liquidation flow
- Vault deposit/withdraw + fee math
- Auction create/bid/settle
- Score compute with all sources missing → returns 0
- Score compute with all sources present → returns weighted sum
- StreamHook two-step pull integration
- InsuranceHook two-step pull integration
- GovernanceProxy ownership round-trip
- ACL — non-router cannot call repayFromHook
- Approval set — cannot use unapproved LLTV
