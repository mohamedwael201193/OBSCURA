# 01 — Architecture

```
                         ┌──────────────────┐
                         │ ObscuraTreasury  │  (existing, Wave 2)
                         └────────┬─────────┘
                                  │ owns
                                  ▼
                  ┌─────────────────────────────────┐
                  │ ObscuraCreditGovernanceProxy    │
                  └────────┬────────────────────────┘
                           │ governor
                           ▼
                  ┌─────────────────────────────────┐
                  │ ObscuraCreditFactory (CREATE2)  │
                  │  - approval sets (LLTV / Liq)   │
                  │  - setMarketAuctionEngine       │
                  │  - setMarketRepayRouter         │
                  └────┬─────────┬─────────┬────────┘
                       │ creates │ creates │ creates
                       ▼         ▼         ▼
            ┌───────────────┐ ┌─────────────┐ ┌──────────────┐
            │ Market 77%    │ │ Market 86%  │ │ Market …     │
            │ (cUSDC/cUSDC) │ │ (cUSDC/…)   │ │              │
            └──┬─────────┬──┘ └──────┬──────┘ └──────────────┘
               │  reads  │ uses             ▲             ▲
               │ Oracle  │ IRM              │             │
               ▼         ▼                  │             │
       ┌─────────────┐ ┌──────────┐  ┌─────┴───────┐ ┌────┴───────────┐
       │ CreditOracle│ │ CreditIRM│  │ StreamHook  │ │ InsuranceHook  │
       │ ↳ feed      │ │ kink     │  │ (PayStream) │ │ (Subscription) │
       └─────────────┘ └──────────┘  └─────────────┘ └────────────────┘

                  ┌──────────────────┐         ┌──────────────────┐
                  │ Vault Conservative│        │ Vault Aggressive │
                  │  → Market 77%     │        │  → both markets  │
                  └──────────────────┘         └──────────────────┘

                  ┌──────────────────┐         ┌──────────────────┐
                  │ CreditAuction    │         │ CreditScore      │
                  │ (sealed bid)     │         │ (Pay+Vote+AB)    │
                  └──────────────────┘         └──────────────────┘
```

## Layer responsibilities

### Market (immutable)
- One (collateral, loan, oracle, IRM, LLTV, liqBonus) tuple
- Storage: encrypted per-user `collateral` / `debt` (`euint64`); plaintext `totalSupplyAssets` / `totalBorrowAssets` for the IRM
- Public functions: `supply`, `withdraw`, `supplyCollateral`, `withdrawCollateral`, `borrow`, `repay`, `accrueInterest`, `liquidate`
- Hook-only functions (gated by `isRepayRouter`): `repayFromHook`, `supplyCollateralFromHook`

### Vault (curator-managed)
- 1:1 share/asset MVP — full ERC4626-style accounting deferred to a later wave
- Curator route list + per-route weight bps
- `feeBps ≤ 2500` (25%) hard cap

### Auction
- Borrower's collateral is consigned to the auction engine when liquidated
- Bidders submit **encrypted bids**; deadline is plaintext
- After deadline, anyone can call `settle(auctionId)` which decrypts the max bid and pays it to the market

### Score
- Pure read aggregator that wraps existing protocol contracts in try/catch:
  - PayStream → on-time-cycle ratio
  - Vote → governance participation
  - AddressBook → contact graph density
- `attestToMarket(market)` writes a single euint64 score into the market for that user

### Hooks
Both hooks share the same shape:
1. They have an operator approval from the user against cUSDC.
2. They pull cUSDC from the user (signature binds to *hook*).
3. They call `repayFromHook`/`supplyCollateralFromHook` on the market with a plaintext amount + a freshly-loaded euint64 handle.
4. The market verifies the caller is in `isRepayRouter` before applying the change.

This two-step pull is the core trick that makes generic delegated repays work despite InEuint64's signature binding to the immediate caller.

### Governance proxy
- `proxy.owner = ObscuraTreasury`
- `factory.governor = proxy.address`
- All factory mutations go: Treasury proposal → Treasury timelock → proxy.executeXxx → factory.xxx
