# 06 — Governance

## Trust model

```
              ┌──────────────────────────┐
              │ ObscuraToken (vote power)│
              └────────────┬─────────────┘
                           │
              ┌────────────▼─────────────┐
              │ ObscuraVote (proposals)  │
              └────────────┬─────────────┘
                           │ executes
              ┌────────────▼─────────────┐
              │ ObscuraTreasury (timelock│
              └────────────┬─────────────┘
                           │ owns
                           ▼
              ┌──────────────────────────────────┐
              │ ObscuraCreditGovernanceProxy     │
              └────────────┬─────────────────────┘
                           │ governor
                           ▼
              ┌──────────────────────────────────┐
              │ ObscuraCreditFactory             │
              └──────────────────────────────────┘
```

There is **no admin EOA** in the production path. The deployer is governor for ~5 minutes during deploy, then `factory.transferGovernor(proxy)` is called and the deployer is permanently removed.

## What governance can do

Through `ObscuraCreditGovernanceProxy.execute*()`:

1. **Add/remove approved LLTVs** (`approveLLTV`, `revokeLLTV`).
2. **Add/remove approved liquidation bonuses** (`approveLiqBonus`, `revokeLiqBonus`).
3. **Add/remove approved liquidation thresholds** (`approveLiqThreshold`, `revokeLiqThreshold`).
4. **Wire a market's auction engine** (`setMarketAuctionEngine`).
5. **Register/deregister hook routers per market** (`setMarketRepayRouter`).
6. **Replace the IRM/oracle on a market** is **NOT** allowed — markets are immutable post-creation. Governance must `createMarket` a new one and let LPs migrate.

## What governance cannot do

- ❌ Read or seize per-user encrypted positions.
- ❌ Change a deployed market's LLTV/liqBonus/oracle/IRM.
- ❌ Pause user repays/withdrawals (no pause hooks exist).
- ❌ Mint/burn vault shares.

## On-chain workflow

1. Token holder drafts a proposal in **Vote** that calls `proxy.executeApproveLLTV(8000)` (for example).
2. Vote opens; reaches quorum; passes.
3. Treasury timelock (24h MVP) elapses.
4. Anyone calls `treasury.executeProposal(id)` which forwards to `proxy.executeApproveLLTV(8000)` which calls `factory.approveLLTV(8000)`.

## Frontend surface

The **Settings → Governance** card on the Credit page shows the current approval sets and lets the connected Treasury (only) toggle them in real time. Non-treasury wallets see the grid in read-only mode.

## Emergency model

Because there is no pause, the only emergency lever is **governance creating a *new* market with safer parameters** and letting LPs voluntarily migrate. This is intentional — a pause that can freeze user funds would defeat the FHE privacy guarantees (a pauser could observe and front-run decryption).
