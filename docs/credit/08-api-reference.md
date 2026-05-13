# 08 — API Reference

## React hooks

All exported from `frontend/obscura-os-main/src/hooks/useCredit.ts`. Every hook is a thin wrapper around viem + wagmi + the FHE client.

| Hook | Returns | Notes |
|---|---|---|
| `useCreditMarkets()` | `{ markets, refresh }` | Per-market snapshot: total supply, total borrow, utilization bps, borrowers length |
| `useCreditVaults()` | `{ vaults, refresh }` | Per-vault snapshot: TVL mirror, fee bps |
| `useEnsureOperator(target)` | `(untilSeconds?) => Promise<boolean>` | Idempotent cUSDC `setOperator` — no-op if already set |
| `useCreditMarket(market)` | `{ supply, withdraw, supplyCollateral, withdrawCollateral, borrow, repay, accrueInterest, liquidate }` | All write fns are async, throw on user-reject |
| `useCreditVault(vault)` | `{ deposit, withdraw }` | Encrypted amounts; share accounting hidden |
| `useCreditAuctions()` | `{ auctions, refresh, bid, settle }` | Auctions list with deadlines + actions |
| `useCreditScore()` | `{ score, recompute, attestToMarket }` | Reads euint64; `score` is null until decrypted client-side |
| `useCreditStreamHook()` | `{ enable, disable, status }` | Auto-repay management |
| `useCreditInsuranceHook()` | `{ subscribe, unsubscribe, status }` | Auto-collateral management |
| `useApprovedSets()` | `{ lltvs, liqBonuses, liqThresholds, refresh }` | Reads factory approval state |
| `useGovernanceProxy()` | `{ approveLLTV, revokeLLTV, ... }` | Treasury-only writes |
| `useUtilizationApr(market)` | `{ supplyApr, borrowApr }` | Derived from IRM scalars |
| `useHealthFactor(collateralUsd, debtUsd, lltv)` | `number` | Pure client-side calc |
| `useCreditEvents(markets, fromBlock?)` | `{ events, refresh }` | Logs across all credit markets |
| `useFHEStatus()` | `{ status, setStep }` | Re-exported convenience |

## Solidity public functions (per contract)

### ObscuraCreditMarket
```solidity
function supply(uint256 amtPlain, InEuint64 calldata enc) external;
function withdraw(uint256 amtPlain, InEuint64 calldata enc) external;
function supplyCollateral(uint256 amtPlain, InEuint64 calldata enc) external;
function withdrawCollateral(uint256 amtPlain, InEuint64 calldata enc) external;
function borrow(uint256 amtPlain, InEuint64 calldata enc, eaddress destEnc) external;
function repay(uint256 amtPlain, InEuint64 calldata enc) external;
function accrueInterest() external;
function liquidate(address borrower, InEuint64 calldata seizeEnc) external;
// router-only
function repayFromHook(address borrower, uint256 amtPlain, euint64 handle) external;
function supplyCollateralFromHook(address borrower, uint256 amtPlain) external;
// reads
function totalSupplyAssets() external view returns (uint256);
function totalBorrowAssets() external view returns (uint256);
function utilizationBps() external view returns (uint256);
function getPosition(address user) external view returns (euint64 collat, euint64 debt);
```

### ObscuraCreditVault
```solidity
function deposit(uint256 amtPlain, InEuint64 calldata enc) external;
function withdraw(uint256 amtPlain, InEuint64 calldata enc) external;
function publicTotalDeposited() external view returns (uint256);
function feeBps() external view returns (uint64);
function routes(uint256 i) external view returns (address market, uint256 weightBps);
```

### ObscuraCreditAuction
```solidity
function createAuction(address borrower, address market, uint64 deadline) external returns (uint256);
function bid(uint256 auctionId, InEuint64 calldata enc) external;
function settle(uint256 auctionId) external;
function getAuction(uint256 i) external view returns (...);
function auctionsLength() external view returns (uint256);
```

### ObscuraCreditScore
```solidity
function computeScore(address user) external returns (euint64);
function attestToMarket(address market) external;
function scores(address user) external view returns (euint64);
```

### ObscuraCreditFactory
```solidity
function createMarket(...) external returns (address market);
function isApprovedLLTV(uint256 lltv) external view returns (bool);
function isApprovedLiqBonus(uint256 b) external view returns (bool);
function isApprovedLiqThreshold(uint256 t) external view returns (bool);
function setMarketAuctionEngine(address market, address engine) external; // governor
function setMarketRepayRouter(address market, address router, bool ok) external; // governor
```

### ObscuraCreditGovernanceProxy
Mirrors every governor-only function on the factory with an `execute*` prefix and an owner check. Owner is set to the `ObscuraTreasury`.

## Events

| Contract | Event | Indexed |
|---|---|---|
| Market | `Supplied(user, amount)` | user |
| Market | `Withdrawn(user, amount)` | user |
| Market | `SuppliedCollateral(user, amount)` | user |
| Market | `WithdrawnCollateral(user, amount)` | user |
| Market | `Borrowed(user, amount, dest)` | user |
| Market | `Repaid(user, amount)` | user |
| Market | `Liquidated(borrower, liquidator, seized)` | borrower |
| Vault | `Deposited(user, amount)` | user |
| Vault | `Withdrawn(user, amount)` | user |
| Auction | `AuctionCreated(id, borrower, market, deadline)` | id |
| Auction | `Bid(id, bidder)` | id, bidder |
| Auction | `Settled(id, winner, amount)` | id |

`amount` fields on encrypted writes emit the *plaintext mirror*, not the encrypted handle, so off-chain analytics see aggregates only when explicitly opted into via the public mirror parameters.

## Gas caps

Defined in `frontend/obscura-os-main/src/config/credit.ts → CREDIT_GAS_CAPS`:

```ts
export const CREDIT_GAS_CAPS = {
  supply:           1_500_000n,
  withdraw:         1_500_000n,
  supplyCollateral: 1_500_000n,
  withdrawCollateral: 1_500_000n,
  borrow:           2_500_000n,  // includes stealth eaddress encryption
  repay:            1_500_000n,
  accrueInterest:     800_000n,
  liquidate:        2_000_000n,
  vaultDeposit:     1_500_000n,
  vaultWithdraw:    1_500_000n,
  bid:              1_200_000n,
  settle:           1_500_000n,
  attestScore:      1_000_000n,
  hookEnable:         800_000n,
};
```

EIP-1559 fees are estimated then capped at 2× current basefee via `estimateCappedFees(publicClient)` to prevent runaway tip pricing on Arbitrum Sepolia spikes.
