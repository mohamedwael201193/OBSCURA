# Obscura Credit Final Execution Plan

Version: final-focused, 2026-05-26
Scope: simplify and finish Credit as the core remaining app, then integrate it with Pay and Vote through shared reputation and infrastructure.

Credit is the most important remaining app. It is also the easiest app to accidentally overbuild. The final product should feel like a private credit line powered by private payment reputation, not like a clone of Aave with encrypted decorations.

## 1. Product Decision

Credit's job is to turn private financial behavior into private creditworthiness.

The product thesis stays:

```text
Private Payments -> Private Reputation -> Private Creditworthiness -> Governance Weight
```

Credit owns:

- private borrow positions;
- private collateral positions;
- private repayment flows;
- risk presentation;
- market and vault policy;
- score consumption;
- liquidation assumptions;
- keeper and auction rules.

Credit should not own:

- payment primitives;
- passkey smart-account infrastructure for encrypted flows;
- a separate notification system;
- a separate indexer/database;
- a separate stable-token universe long-term;
- governance expansion.

## 2. Current Live State

### Stable and Preserve

The current Credit protocol has real working pieces:

- `ObscuraCreditMarket` with encrypted supply shares, borrow shares, collateral, and future `eaddress` slot.
- `ObscuraCreditRouter` solving CoFHE proof-forwarding limits through handle-based transfer patterns.
- `ObscuraCreditVault` for curated supply strategies.
- `ObscuraCreditAuction` for sealed-bid liquidations.
- `ObscuraCreditOracle` plus `ChainlinkPriceAdapter` for in-place oracle repair.
- `ObscuraCreditScoreV2` wired through `IEncryptedScore` and market `scoreOracle`.
- Three live markets on Arbitrum Sepolia.
- Two live vaults.
- Credit keeper code path with dry-run health-factor scanning.
- Harmony-based Credit UI with overview, markets, position, vaults, and liquidations.
- Reveal-on-demand encrypted position tiles.
- Public market metrics auto-load without wallet decrypts.
- No auto-decrypt on mount.

### Live Markets Today

| Market | Status | Keep? | Final role |
|---|---|---:|---|
| M-86 `ocUSDC/ocUSDC` | Working | Yes | Testnet continuity; template for production stable market |
| M-70 `ocWETH -> ocUSDC` | Working after v3.19 token redeploy | Limited | Advanced/testnet only until real-backed collateral exists |
| M-50 `ocOBS -> ocUSDC` | Working after v3.19 token redeploy | Limited | Internal/risk lab only; not production default |

The three-market setup proves the protocol. It is not the right default product shape.

### Current Token Reality

| Token | Address role | Problem |
|---|---|---|
| Pay `ocUSDC` wrapper | Real USDC-backed, used by Pay | Correct canonical private stable asset |
| Credit `ocUSDC` faucet | Used by current Credit markets | Useful for testnet, not production canonical |
| Credit `ocWETH` faucet | Used by M-70 | Mock/faucet asset, not production collateral |
| Credit `ocOBS` faucet | Used by M-50 | Mock/faucet, reflexive/risky collateral |
| Old v3.15/confidential USDC | Historical/fallback | Must not be used as Pay primary or Credit final primary |

The most important simplification is to converge Credit toward the Pay-backed private stable asset.

### Known Implementation Gaps Found

These should be handled before adding any new Credit surface:

- The frontend config still exposes multiple historical market env vars. The primary UI should stop surfacing old markets once the canonical stable market exists.
- Credit notifications are currently local-only through `useCreditAlerts`; they do not use the shared Supabase/Web Push system.
- Credit events are not yet indexed by `obscura-worker`, so repayment, borrow, liquidation, and score activity are invisible to the shared activity feed.
- `useCreditAuctions.submitBid` should wait for transaction receipt before moving FHE status to ready. The plan should apply the same receipt discipline across all Credit writes.
- Current Cross-asset markets use faucet/mock assets. They are useful for proving protocol mechanics, but not final production defaults.

## 3. Canonical Credit Market Structure

### Final Default Market

Credit should have one default market in the primary UI:

```text
Private USDC Credit Line
Loan asset: canonical Pay-backed ocUSDC
Primary collateral: canonical Pay-backed ocUSDC at launch
LLTV: conservative, approximately current M-86 behavior
Reputation boost: capped, small, tier-based, never raw-history based
Liquidation: production-safe but rare for same-stable collateral
```

Why this is the right default:

- It aligns Credit with Pay instead of asking users to learn two private stable assets.
- It removes the confusing faucet-vs-wrapper split from production UX.
- It keeps all debt denominated in the same private stable asset users already hold.
- It lets Pay activity become Credit reputation without bridge theater.
- It keeps risk simple for testnet and first production readiness.

This market may require a new market deployment because `loanAsset`, `collateralAsset`, LLTV, IRM, and oracle are immutable in `ObscuraCreditMarket`. That is a justified production-critical contract deployment, not feature expansion.

No new market code is required at first. Reuse the existing `ObscuraCreditMarket` implementation and factory unless a real bug blocks wrapper-mode `ocUSDC` use.

### Secondary Markets

Secondary markets should not be primary UI until they use real-backed assets and audited oracle assumptions.

| Candidate | Decision |
|---|---|
| Real WETH-backed `ocWETH -> ocUSDC` | Defer until a real wrapper exists, oracle is audited, and primary market is stable |
| `ocOBS -> ocUSDC` | Remove from production default; keep as governance/risk lab only |
| More isolated markets | No, capital fragmentation and UX complexity |
| Under-collateralized credit | No, not before repayment and reputation data are stable |
| Invoice/receivable collateral | Defer; useful later but not needed for production readiness |

### Vaults

Vaults should follow market simplification:

- Keep Conservative Vault as the primary supply entry.
- Balanced Vault is read-only or advanced until the underlying secondary market is production-grade.
- Do not add new vault strategies until the canonical stable market has real usage.

## 4. Token Reasoning

### Canonical Stable Asset Strategy

The canonical private stable asset across Obscura should be:

```text
Circle USDC -> Pay ocUSDC wrapper -> shared private stable balance
```

Credit should consume that same wrapper where possible.

Current Credit faucet `ocUSDC` should be labeled as:

```text
Credit testnet ocUSDC
```

It should not be presented as the same balance as Pay `ocUSDC`.

### Why Not Keep Two `ocUSDC`s Forever

The two-token split causes:

- users see Pay private balance but Credit balance is zero;
- score and repayment loops feel disconnected;
- docs repeatedly need exceptions;
- migration to production real USDC is unclear;
- every integration has to ask which `ocUSDC` is meant.

The split is acceptable for testnet continuity. It should not be the final architecture.

### Migration Rule

Do not break existing faucet markets.

Migration should be:

1. Deploy the canonical Pay-backed stable market if wrapper compatibility is confirmed.
2. Make it the only default market in Credit UI.
3. Keep old faucet markets under an Advanced/Testnet/Legacy view.
4. Disable new user onboarding into legacy markets once the canonical market is liquid.
5. Let users repay, withdraw, and close legacy positions normally.

## 5. Privacy Reasoning

Credit's privacy contract is stricter than Pay's because positions imply solvency.

### Public by Design

- Market addresses.
- Market configuration.
- Total supplied assets.
- Total borrowed assets.
- Utilization.
- APR/IRM output.
- Borrower count.
- Plain aggregate/liquidation guard data needed by the keeper.
- Public score tier bucket if used for LLTV boost.

### Private by Design

- Per-user supply shares.
- Per-user borrow shares.
- Per-user collateral.
- Raw credit score.
- Payment history raw details.
- Payroll amount, subscription amount, invoice amount.
- Counterparty labels and local notes.

### Reputation Privacy

Credit may use reputation, but only in privacy-preserving form:

- raw activity stays in Pay/Credit/Vote events and local receipts;
- shared infra derives capped signal counts;
- Credit displays categories and tiers, not raw counterparties or amounts;
- on-chain markets consume only encrypted score and public tier bucket;
- public tier must be broad enough that it does not reveal exact financial behavior.

## 6. Contract Reasoning

### Preserve Current FHE Patterns

Do not alter these patterns unless a test proves a bug:

- `FHE.allowThis` after every encrypted state mutation.
- `FHE.allowTransient` before cross-contract token calls.
- `FHE.select` for encrypted conditionals.
- `FHE.eq` guard between plaintext `amtPlain` and encrypted input.
- Pre-computed FHE constants in market constructor.
- Private plaintext shadows only for revert guards and keeper/risk checks.
- No plaintext amount events for user-level amounts.
- Public aggregate scalars for IRM and risk.

### Minimal New Contracts Allowed

Only these new deployments are justified:

1. A canonical Pay-backed `ocUSDC` credit market using the existing market implementation.
2. A corresponding vault only after the market has liquidity and the current Conservative Vault cannot route to it.
3. A score oracle upgrade through the existing mutable `scoreOracle` seam, but only after shared reputation data is stable.

Not justified now:

- new collateral token family;
- new under-collateralized lending contracts;
- receivable collateral contracts;
- proof/disclosure registries;
- enterprise account roles;
- broad UUPS refactors.

### Score Oracle Path

Current canonical on-chain score: `ObscuraCreditScoreV2`.

Keep Score V2 initially because it is live and wired. It reads:

- Pay stream count;
- AddressBook contact count;
- Vote participation.

Next step is not automatically a new contract. First build the shared reputation data layer off-chain. Once stable, decide whether the on-chain market actually needs more signals for LLTV.

If on-chain terms must use repayment/payroll/subscription history, deploy a minimal Score V3 through the existing `scoreOracle` seam.

Score V3 constraints:

- output remains `IEncryptedScore` compatible;
- raw score remains encrypted;
- tier remains public and coarse;
- source counters are capped;
- no raw amounts or counterparties on-chain;
- updater/governance permissions are explicit and timelocked;
- markets can fall back to base LLTV if oracle is down.

## 7. Reputation-Powered Credit

### Shared Reputation Inputs

Credit should use three categories of signals.

Pay signals:

- private payments sent/received;
- stream creation;
- stream cycle settlement;
- payroll participation;
- subscription consumption;
- invoice paid;
- escrow redeemed.

Credit signals:

- supply activity;
- collateral supplied;
- borrow opened;
- repay completed;
- position closed without liquidation;
- liquidation avoided after warning;
- liquidation occurred.

Vote signals:

- encrypted vote participation;
- delegation participation;
- proposal finalization participation;
- executable governance participation only as a low-weight signal.

### How Payroll and Streams Affect Borrowing Power

They should not create direct, automatic under-collateralized credit.

They should affect borrowing power in this order:

1. UI reputation explanation: user sees that regular private activity is building a credit tier.
2. Off-chain shared tier: capped signal counts improve a visible reputation tier.
3. On-chain LLTV boost: only after Score V3 is deployed and audited, capped tiers may raise LLTV by a small amount, similar to the existing +400 bps model.
4. Future payroll-backed repay hooks: only after repayment automation and failure handling are proven.

This avoids turning private payroll into a public income oracle.

## 8. UX Plan

### Simplified IA

Keep the Harmony architecture. Do not redesign the shell.

Default Credit tabs should be:

| Tab | Purpose |
|---|---|
| Overview | one primary next step, reputation tier, current risk summary |
| Borrow | single default canonical market path |
| Position | reveal-on-demand balances, health, repay/add collateral |
| Earn | supply/vault entry into the canonical stable market |
| Liquidations | advanced, sealed-bid opportunities |
| Settings | operator approvals, legacy/testnet markets, notification preferences |

The current multi-market selection should move behind an Advanced/Testnet switch once the canonical market exists.

### Borrowing UX

Borrowing should become a guided flow:

1. Connect wallet.
2. Confirm network.
3. Ensure gas.
4. Ensure canonical `ocUSDC` balance or link to Pay shield flow.
5. Approve router/operator if needed.
6. Supply collateral.
7. Borrow.
8. Set notification threshold.

The user should never need to understand market contract versions.

### Repayment UX

Repayment is currently easy to misunderstand because it can involve token transfer plus market accounting.

Final UX must show:

- amount to repay;
- whether the token transfer step is complete;
- whether market accounting step is complete;
- health factor after repayment;
- transaction receipt and indexed activity status.

Repayment notifications should never include exact debt amount.

### Liquidation UX

Production-safe assumptions:

- keeper remains opt-in until operator is funded and monitored;
- liquidation warnings should be user-facing before keeper execution;
- sealed bids stay encrypted;
- best-bid metadata must not reveal bid amount before settlement;
- liquidation notification copy uses risk level, not raw position value.

## 9. Shared Infrastructure Plan

Credit must reuse Pay's backend stack.

### Activity Indexer

Extend `obscura-worker` to index Credit events into `obscura_activity`.

Initial Credit events:

- `Supplied`
- `Withdrew`
- `CollateralSupplied`
- `CollateralWithdrawn`
- `Borrowed`
- `Repaid`
- `LiquidationOpened`
- auction opened, bid submitted, settled if emitted by auction contract
- vault deposit/withdraw/reallocation events
- score updated and attested events

Rules:

- store event names and participants;
- do not store decrypted amounts;
- store ctHash handles only if emitted and useful;
- use the same unique key strategy: `tx_hash + log_index`;
- keep chunking and retries shared with Pay.

### Notifications

Credit notifications should reuse `obscura_notification_prefs`.

New notification types:

- `credit.borrowed`
- `credit.repaid`
- `credit.health_warning`
- `credit.liquidation_opened`
- `credit.auction_settled`
- `credit.score_tier_changed`

Bodies must stay generic:

- good: `Your M-86 position needs attention.`
- bad: `Your debt is 1,250 ocUSDC.`

### Reputation Events

Credit writes derived signals into `obscura_reputation_events`.

Example Credit signals:

| Signal | Weight policy |
|---|---|
| `repay_completed` | positive, capped monthly |
| `position_closed` | positive, capped |
| `liquidation_opened` | negative, capped |
| `score_attested` | neutral/positive onboarding signal |
| `borrow_opened` | neutral activity signal |

## 10. Smart Account Compatibility

Credit encrypted writes remain wallet/EOA execution.

Do not route these through ERC-4337 smart accounts:

- supply;
- supply collateral;
- borrow;
- repay;
- withdraw encrypted shares;
- submit encrypted liquidation bid;
- score update/attestation if it consumes encrypted inputs.

Public Mode smart accounts may help with visible USDC setup or future non-FHE actions, but Credit's core private flows must stay wallet-executed until CoFHE supports the relevant signer path.

## 11. Execution Phases

Implementation order remains global:

1. Finish and stabilize Pay.
2. Build and finish Credit.
3. Integrate Pay with Credit.
4. Build lightweight Vote improvements.
5. Integrate Vote with shared reputation.
6. Harden production across all apps.

### C0: Audit and Freeze the Current Credit Surface

Tasks:

- Verify all current active addresses in frontend env, deployments, and docs.
- Mark deprecated markets and tokens in config comments and UI labels.
- Ensure Credit uses Score V2, not Score V1.
- Verify M-70 and M-50 still point to v3.19 token addresses.
- Confirm keeper remains `KEEPER_ENABLED=false` unless intentionally enabled.
- Confirm no Credit flow uses Pay `ocUSDC` accidentally before canonical market migration.

Success criteria:

- Current Credit build passes.
- Current positions remain usable.
- Old markets are not removed abruptly.

### C1: Canonical Market Design and Deployment Prep

Tasks:

- Prove Pay `ocUSDC` wrapper supports market-required flows:
  - direct `confidentialTransfer`;
  - handle outbound transfer;
  - router/market operator approvals;
  - `confidentialTransferFromHandle` if needed.
- Dry-run a local/hardhat market using Pay `ocUSDC` as loan and collateral.
- Validate oracle behavior for same-stable market.
- Decide LLTV and liquidation threshold conservatively.
- Stage deploy script and migration notes.

Success criteria:

- No new token contract required.
- Existing `ObscuraCreditMarket` code can support the wrapper token.
- A new market deployment is the only needed contract deployment.

### C2: Deploy Canonical Stable Credit Market

Requires explicit operator approval because it broadcasts contracts.

Tasks:

- Deploy market with canonical Pay-backed `ocUSDC`.
- Wire auction engine.
- Wire score oracle.
- Wire router.
- Add market address to deployments and frontend env.
- Add optional Conservative vault only if direct market supply UX is insufficient.

Success criteria:

- User can supply canonical `ocUSDC`.
- User can supply collateral.
- User can borrow canonical `ocUSDC`.
- User can repay and withdraw.
- Position reveal works.

### C3: Simplify Credit UX Around the Canonical Market

Tasks:

- Default Borrow and Earn to the canonical stable market.
- Move legacy faucet markets behind Advanced/Testnet.
- Make Pay balance handoff explicit: `Need private USDC? Go to Pay to shield USDC.`
- Show one borrow path, one repay path, one health explanation.
- Keep Markets tab for public data, but do not make it the starting point.

Success criteria:

- A new user can borrow without understanding three markets.
- Pay `ocUSDC` and Credit `ocUSDC` ambiguity is removed from the main path.

### C4: Shared Credit Indexing and Notifications

Tasks:

- Add Credit events to the worker indexer.
- Add Credit event filters to `useActivityFeed`.
- Add Credit notification types to preferences.
- Add health/risk notifications using public/derived risk states only.
- Add a Credit activity view using the shared ActivityFeed component or shared hook.

Success criteria:

- Borrow, repay, collateral, and liquidation events appear in shared activity.
- Push notifications dispatch for subscribed wallets.
- No notification includes decrypted or exact private amounts.

### C5: Reputation Integration

Tasks:

- Backfill Pay, Credit, and Vote signals into `obscura_reputation_events`.
- Add a user-facing Credit reputation panel with categories, not raw history.
- Keep on-chain Score V2 terms until data proves Score V3 is necessary.
- If Score V3 is needed, write the minimal `IEncryptedScore`-compatible replacement and switch only through `setScoreOracle`.

Success criteria:

- User can see why their tier changed without leaking counterparties or amounts.
- Market LLTV behavior remains conservative if reputation data is unavailable.

### C6: Keeper and Liquidation Production Gate

Tasks:

- Keep dry-run as default.
- Run keeper on separate RPC budget before enabling live execution.
- Add alerts for keeper scan failures.
- Confirm auction settlement flow on test positions.
- Document funding and emergency stop procedures.

Success criteria:

- Keeper can identify risky positions.
- Keeper can open liquidation only when explicitly enabled.
- Failed keeper or RPC issues do not starve Pay indexing.

### C7: Production Audit and Mainnet Readiness

Tasks:

- Publish `docs/credit/PRIVACY_MATRIX.md`.
- Audit Score V2/V3, market, router, token, auction, vault, keeper, and UI.
- Verify all contracts on Arbiscan.
- Confirm admin/governance ownership and timelock paths.
- Block mainnet broadcast until Fhenix CoFHE mainnet GA and external audit.

## 12. What Should Be Removed or Demoted

Remove from primary UX:

- faucet-token mental model;
- `ocWETH` and `ocOBS` markets as default choices;
- old v3.16 single-market references;
- Score V1 references;
- mock price feed references;
- any copy implying Pay and Credit `ocUSDC` are the same before migration.

Keep available for legacy/testnet:

- existing faucet markets;
- repayment and withdrawal for existing positions;
- old vault position viewing;
- auction history.

Do not add:

- new collateral types;
- new vault strategies;
- receivable collateral;
- under-collateralized lending;
- enterprise roles;
- DAO-managed credit products;
- extra token wrappers.

## 13. Production Blockers

Credit is not production-ready until:

- canonical stable market decision is implemented or explicitly deferred;
- Pay/Credit `ocUSDC` ambiguity is removed from main UX;
- repayment flow is clear and indexed;
- keeper has a monitored live-mode runbook;
- liquidation UX and notifications are tested;
- shared activity covers Credit events;
- reputation panel exists without raw history leakage;
- Score V2 or Score V3 behavior is audited;
- mobile borrow/repay paths are usable;
- docs clearly mark testnet-only assets and mainnet blockers.

## 14. Testing Strategy

Contract tests:

- canonical market supply/borrow/repay/withdraw;
- score oracle base and boosted LLTV;
- auction open and settle;
- wrapper-mode token compatibility;
- router operator approvals;
- liquidation edge cases.

Frontend tests:

- setup sheet;
- default borrow path;
- repay path;
- reveal-on-demand and auto-hide;
- legacy market switch;
- activity and notification filters;
- mobile viewport.

Infra tests:

- worker indexes Credit events idempotently;
- notification dispatch skips or sends correctly;
- reputation event derivation is idempotent;
- keeper dry-run does not share RPC budget with indexing unless enabled.

Manual E2E:

- two-wallet liquidity supply and borrow;
- repay partial and full;
- add collateral and withdraw collateral;
- health warning threshold;
- liquidation test account;
- activity feed and push notification.

## 15. Final Credit North Star

Credit is done when a user can:

1. bring Pay `ocUSDC` into Credit without learning a second private dollar;
2. open a private credit line through one guided flow;
3. reveal position data only when they choose;
4. repay clearly;
5. understand health and liquidation risk without raw leaks;
6. build a reputation tier from private Pay and Credit behavior;
7. let that tier improve terms only through capped, audited, privacy-preserving logic.

Everything else is secondary.
