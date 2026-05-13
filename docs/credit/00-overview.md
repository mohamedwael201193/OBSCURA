# 00 — Overview

## What

ObscuraCredit is the lending pillar of the Obscura suite. It lets users:

- **Supply** assets into curated **vaults** that fan liquidity into one or more isolated lending **markets**.
- **Borrow** against collateral with **encrypted** position sizes (no public leaderboard of debt).
- **Send borrowed funds to a stealth address** in the same transaction.
- **Auto-repay** debt from a recurring `ObscuraPayStream` cycle.
- **Auto-top collateral** from an `ObscuraInsuranceSubscription` payout.
- Earn a private **credit score** that improves your borrowing terms once attested.
- Bid on **sealed-bid liquidation auctions** when a borrower goes underwater.

## Why a 2-layer model

Following Morpho's separation-of-concerns:

- **Markets** are minimal, immutable, isolated. One market = one (collateral, loan) pair with fixed LLTV / liquidation bonus / oracle / IRM. A bad oracle in one market cannot contaminate another.
- **Vaults** are upgradeable, curated risk baskets that LPs deposit into. The vault picks which markets to touch and at what weight. Risk preferences are expressed by *which vault* you deposit into.

This keeps the trusted on-chain core small while letting the curator layer evolve.

## Why FHE

A traditional lending protocol publishes every borrower's debt size and liquidation price. That is a privacy-violating broadcast that real users (treasuries, payroll departments, individuals) cannot accept. ObscuraCredit keeps:

- **Private**: per-user collateral, debt, repay amounts, vault shares, bid amounts.
- **Public** (intentionally): aggregate market totals, utilization, oracle price, IRM curve, vault TVL mirror, governance-approved LLTV/liq-bonus/threshold sets.

The public mirrors are what make the protocol *governable* — see [02-fhe-privacy.md](02-fhe-privacy.md).

## Quick demo (30 seconds)

1. Open `/credit` while connected to Arbitrum Sepolia.
2. Vaults tab → deposit 10 cUSDC into **Conservative**.
3. Markets tab → pick **77% LLTV**, supply 10 cUSDC as collateral.
4. Borrow tab → borrow 5 cUSDC to a fresh stealth address.
5. Repay tab → repay 5 cUSDC. Done.

## Live deployment

See [WAVE4-CREDIT-PROGRESS.md](../../WAVE4-CREDIT-PROGRESS.md) for all 12 contract addresses on Arbitrum Sepolia.
