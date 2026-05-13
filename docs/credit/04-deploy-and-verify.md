# 04 — Deploy & Verify

## One-shot deploy

```powershell
cd contracts-hardhat
# Requires PRIVATE_KEY (with 0x prefix) + ARB_SEPOLIA_RPC + ARBISCAN_API_KEY in .env
npx hardhat run scripts/deployWave4Credit.ts --network arb-sepolia
```

The script:
1. Deploys MockChainlinkFeed (cUSDC/USD = $1).
2. Deploys CreditOracle, CreditIRM (kink IRM).
3. Deploys CreditFactory with deployer as initial governor.
4. Adds approval sets: LLTV [6250, 7700, 8600, 9150]; LiqBonus [500, 750]; LiqThreshold [8000, 8500, 9000].
5. Creates 2 markets via `factory.createMarket` (CREATE2): cUSDC-cUSDC at 77% and 86% LLTV.
6. Deploys 2 vaults: Conservative (only Market_77) and Aggressive (both markets).
7. Deploys CreditAuction, CreditScore, StreamHook, InsuranceHook.
8. Wires every market: `setAuctionEngine(auction)`, `setRepayRouter(streamHook, true)`, `setRepayRouter(insuranceHook, true)`.
9. Deploys CreditGovernanceProxy with Treasury as owner; transfers `factory.governor` → proxy.
10. Appends all 12 addresses to `frontend/obscura-os-main/.env` (idempotent — checks for existing keys first).
11. Writes the same addresses to `contracts-hardhat/deployments/arb-sepolia.json`.

## Verify on Arbiscan

A helper script lives at `contracts-hardhat/scripts/verifyWave4Credit.ts` and re-uses the deploy artifact for constructor args:

```powershell
cd contracts-hardhat
npx hardhat run scripts/verifyWave4Credit.ts --network arb-sepolia
```

Or one at a time:

```powershell
# MockChainlinkFeed(decimals=8, initialPrice=1e8)
npx hardhat verify --network arb-sepolia 0x9ad3fB91f545A3876543515E799D798cAAcA17BF 8 100000000

# CreditOracle(governor)
npx hardhat verify --network arb-sepolia 0x02E085502311732DB9aD13889CC36A6C2D807189 <deployer>

# CreditIRM(governor, baseBpsP, slope1BpsP, slope2BpsP, kinkBpsP)
npx hardhat verify --network arb-sepolia 0x29A43Ec8379200286f5A05d8ef24d46e088903a7 <deployer> 0 400 8000 8000

# CreditFactory(governor)
npx hardhat verify --network arb-sepolia 0x52eBaBfF7c73037C967678bBCd2BC6B30b6a327b <deployer>

# Markets — created via CREATE2 from factory; verify with their constructor encoded args
# (the factory's init code is baked in; supply the same params used in deployWave4Credit.ts)
```

## Frontend rebuild

```powershell
cd frontend/obscura-os-main
npx vite build      # confirms the new env keys are picked up
```

The build emits a `dist/` ready for Vercel; `vercel.json` is already configured.

## Sanity check (post-deploy)

```powershell
cd contracts-hardhat
# round-trip a vault deposit + a market borrow on the deployer wallet
npx hardhat run scripts/uatWave4Credit.ts --network arb-sepolia
```
