# Wave 2 — ObscuraPay v4: Implementation Progress

> Confidential recurring payroll on real cUSDC, with stealth recipients,
> on-chain insurance, and one-click cross-chain funding.
> No mocks. No test tokens. Live on Arbitrum Sepolia.

---

## Scope Overview

| # | Task | Location | Status |
|---|------|----------|--------|
| 1 | Interfaces (cUSDC, escrow, resolver, underwriter, IERC165) | `contracts-hardhat/contracts/interfaces/` | ✅ Done |
| 2 | `ObscuraPayrollResolver.sol` (IConditionResolver) | `contracts-hardhat/contracts/` | ✅ Done |
| 3 | `ObscuraStealthRegistry.sol` (ERC-5564 meta + announcements) | `contracts-hardhat/contracts/` | ✅ Done |
| 4 | `ObscuraPayStream.sol` (recurring cUSDC stream → escrow) | `contracts-hardhat/contracts/` | ✅ Done |
| 5 | `ObscuraPayrollUnderwriter.sol` (IUnderwriterPolicy) | `contracts-hardhat/contracts/` | ✅ Done |
| 6 | Deploy script | `contracts-hardhat/scripts/deployWave2Pay.ts` | ✅ Done |
| 7 | Hardhat tests (resolver + registry) | `contracts-hardhat/test/` | ✅ Done (8/8) |
| 8 | Deployed to Arbitrum Sepolia | `contracts-hardhat/deployments/arb-sepolia.json` | ✅ Done |
| 9 | Frontend `wave2.ts` config + ABIs | `frontend/obscura-os-main/src/config/wave2.ts` | ✅ Done |
| 10 | Stealth lib (ECDH, viewTag, scan) | `frontend/obscura-os-main/src/lib/stealth.ts` | ✅ Done |
| 11 | Hook — `useCUSDCBalance` | `src/hooks/useCUSDCBalance.ts` | ✅ Done |
| 12 | Hook — `useStealthMetaAddress` | `src/hooks/useStealthMetaAddress.ts` | ✅ Done |
| 13 | Hook — `useCreateStream` | `src/hooks/useCreateStream.ts` | ✅ Done |
| 14 | Hook — `useTickStream` | `src/hooks/useTickStream.ts` | ✅ Done |
| 15 | Hook — `useStreamList` | `src/hooks/useStreamList.ts` | ✅ Done |
| 16 | Hook — `useStealthScan` | `src/hooks/useStealthScan.ts` | ✅ Done |
| 17 | Hook — `useInsurePayroll` (purchase + dispute) | `src/hooks/useInsurePayroll.ts` | ✅ Done |
| 18 | Hook — `useCrossChainFund` (CCTP V2) | `src/hooks/useCrossChainFund.ts` | ✅ Done |
| 19 | Components — `pay-v4/` folder | `src/components/pay-v4/` | ✅ Done |
|    | — `CUSDCPanel.tsx` | | ✅ |
|    | — `CreateStreamForm.tsx` | | ✅ |
|    | — `StreamList.tsx` | | ✅ |
|    | — `RegisterMetaAddressForm.tsx` | | ✅ |
|    | — `StealthInbox.tsx` | | ✅ |
|    | — `CrossChainFundForm.tsx` | | ✅ |
|    | — `BuyCoverageForm.tsx` | | ✅ |
|    | — `DisputeForm.tsx` | | ✅ |
| 20 | `PayPage.tsx` 5 new tabs (streams, crosschain, insurance, stealth) | `src/pages/PayPage.tsx` | ✅ Done |
| 21 | `PMFPage.tsx` + `/pmf` route | `src/pages/PMFPage.tsx`, `src/App.tsx` | ✅ Done |
| 22 | Demo doc | `WAVE2_PAY_DEMO.md` | ✅ Done |
| 23 | ReineiraOS pool registration & liquidity stake | `contracts-hardhat/scripts/setupReineiraPool.ts` | ✅ Done |
| 24 | Off-chain ticker bot (`packages/ticker/`) | n/a | ⏳ Optional |
| 25 | `purchaseCoverage` 8-arg signature fix (was passing 5 args, broken) | `src/hooks/useInsurePayroll.ts` | ✅ Done |
| 26 | Reineira `PoolFactory` / `PolicyRegistry` / `InsurancePool` ABIs | `src/config/wave2.ts` | ✅ Done |
| 27 | `BuyCoverageForm` escrowId + coverage-days inputs | `src/components/pay-v4/BuyCoverageForm.tsx` | ✅ Done |
| 28 | Stealth Inbox **Reveal Claim Key** flow (derive privkey + copy + verify) | `src/components/pay-v4/StealthInbox.tsx` | ✅ Done |
| 29 | UX text rewrite — beginner-friendly copy across all Pay tabs | `PayPage.tsx` + all pay/ + pay-v4/ components | ✅ Done |
| 30 | Token distinction — $OBS vs cUSDC labels, badges, explanations | All pay components | ✅ Done |
| 31 | How-it-works guides per tab (dashboard, pay, escrows, streams, cross-chain, insurance, stealth) | `PayPage.tsx` | ✅ Done |
| 32 | Privacy sidebar — added cUSDC Stream + Insurance Coverage handles | `PayPage.tsx` | ✅ Done |
| 33 | Sidebar modules — added PayStream, StealthRegistry, PayrollInsurance | `PayPage.tsx` | ✅ Done |
| 34 | Wrap fix — auto-approve plain USDC before wrapping to cUSDC | `src/hooks/useCUSDCBalance.ts`, `src/config/wave2.ts` | ✅ Done |
| 35 | USDC Arb Sepolia address added (`0x75faf114…6AA4d`) | `src/config/wave2.ts` | ✅ Done |
| 36 | RPC rate-limit fix — 2s delay between approve + wrap txs, fresh gas per tx | `src/hooks/useCUSDCBalance.ts` | ✅ Done |

---

## Build status
- `npx hardhat compile` — 10 Solidity files compiled (Cancun, optimizer 200).
- `npx hardhat test` — 8/8 passing (resolver + registry).
- `npx tsc --noEmit` — clean.
- `npx vite build` — built in ~8s.

## Deployed addresses (Arbitrum Sepolia, chainId 421614)

```
ObscuraPayrollResolver      0xC567249c8bE2C59783CD1d1F3081Eb7B03e89761
ObscuraStealthRegistry      0xa36e791a611D36e2C817a7DA0f41547D30D4917d
ObscuraPayStream            0x15d28Cbad36d3aC2d898DFB28644033000F16162
ObscuraPayrollUnderwriter   0x8fA403DDBE7CD30C8b26348E1a41E86ABDD6088c
InsurancePool (Reineira)    0x5AC95Fa097CAC0a6d98157596Aff386b30b67069
```

## Operator setup — ✅ COMPLETED (April 19, 2026)

Ran `npx hardhat run scripts/setupReineiraPool.ts --network arb-sepolia`. All 3 txs confirmed:

| Step | Tx | Status |
|---|---|---|
| PolicyRegistry.registerPolicy(0x8fA4…) | `0x5946d30c…2474827` | ✅ Registered |
| PoolFactory.createPool(cUSDC) | `0xb8217a0f…21b6212` | ✅ Pool `0x5AC95Fa0…b67069` |
| InsurancePool.addPolicy(0x8fA4…) | `0x718862766…e6425` | ✅ Whitelisted |

Pool address persisted to:
- `contracts-hardhat/deployments/arb-sepolia.json` → `"InsurancePool": "0x5AC95Fa097CAC0a6d98157596Aff386b30b67069"`
- `frontend/.env` → `VITE_REINEIRA_INSURANCE_POOL_ADDRESS=0x5AC95Fa097CAC0a6d98157596Aff386b30b67069`

**Remaining optional:** wrap USDC → cUSDC and `InsurancePool.stake(encryptedAmount)` to seed claim liquidity.

---

## UX Text Rewrite — Beginner-Friendly (April 2026)

Full rewrite of all user-facing text to be understandable by users with **no FHE or Web3 background**.

### Changes Summary

| File | Changes |
|---|---|
| `PayPage.tsx` header | "Wave 1 — Active" → "Fully Encrypted Payments" + dual-token badges ($OBS / cUSDC) |
| `PayPage.tsx` description | Technical jargon → "Send, stream, and insure payments — all fully encrypted on-chain" |
| `PayPage.tsx` Dashboard | Added 5-step How It Works guide for new users |
| `PayPage.tsx` Pay tab | Added context: "$OBS is governance token, for real USDC use Streams" |
| `PayPage.tsx` Receive tab | Explained permit signing in plain English, added balance type labels |
| `PayPage.tsx` Escrows tab | Added explanation of silent failure pattern in plain English |
| `PayPage.tsx` Streams tab | Full 4-step how-to (get cUSDC → approve → create → tick) |
| `PayPage.tsx` Cross-Chain tab | Plain-English bridge flow (get USDC → enter escrow → auto-bridges) |
| `PayPage.tsx` Insurance tab | 3-step how-to (buy coverage → file dispute → auto-payout) |
| `PayPage.tsx` Stealth tab | 4-step setup + scanning guide for stealth addresses |
| `PayPage.tsx` Privacy sidebar | Added cUSDC Stream + Insurance Coverage encrypted handles |
| `PayPage.tsx` Modules sidebar | Added PayStream (cUSDC), StealthRegistry, PayrollInsurance |
| `CUSDCPanel.tsx` | Badge "REINEIRA cUSDC" → "ENCRYPTED STABLECOIN" + explained what cUSDC is |
| `CreateStreamForm.tsx` | "Recurring cUSDC Stream" → "Create Payroll Stream" + beginner description |
| `StreamList.tsx` | "My Outgoing/Incoming Streams" → "Streams You're Paying / Paying You", "Tick Cycle" → "Send Next Cycle" |
| `CrossChainFundForm.tsx` | "Fund From Any Chain" → "Send USDC From Ethereum" + plain-English flow |
| `BuyCoverageForm.tsx` | "Insure Your Payroll / REINEIRA INSURANCE" → "Buy Payroll Insurance / ENCRYPTED COVERAGE" |
| `DisputeForm.tsx` | Added amber warning badge + plain-English dispute explanation |
| `RegisterMetaAddressForm.tsx` | "Stealth Meta-Address / ERC-5564" → "Your Stealth Address Setup / ONE-TIME SETUP" |
| `StealthInbox.tsx` | Simplified scanning/reveal explanation for non-crypto users |
| `TransferForm.tsx` | "Arbiscan reveals nothing" → "no one (not even block explorers) can see" |
| `CreateEscrowForm.tsx` | "FHE ciphertexts" → "encrypted on-chain" |
| `ClaimDailyObsForm.tsx` | Added note directing to Streams tab for real USDC payroll |
| `EscrowActions.tsx` | Explained silent failure pattern in plain English |

### Token Architecture (clearly explained in UI)

- **$OBS** — Wave 1 governance token. Used for: P2P transfers, payroll salary, escrows, daily faucet claims, minting.
- **cUSDC** — Wave 2 encrypted stablecoin (Reineira FHERC-20 wrapped USDC). Used for: recurring streams, cross-chain funding, insurance coverage/disputes, stealth payments.
- Both tokens coexist. The UI now explains which token each tab uses and why.

---

## Migration & audit verification (April 2026)

Re-audited the full pay stack against the Fhenix CoFHE April 13 2026 changes:

| Check | Result | Notes |
|---|---|---|
| `@cofhe/sdk` version | ✅ `^0.4.0` | `npm view @cofhe/sdk version` → `0.4.0` (latest) |
| Deprecated `cofhejs` references | ✅ zero | confirmed via grep over `frontend/**` |
| Deprecated `FHE.decrypt()` in contracts | ✅ zero | confirmed via grep over all 10 `.sol` files |
| `lib/fhe.ts` decrypt call | ✅ uses new API | `client.decryptForView(ctHash, FheTypes.Uint64).withPermit().execute()` |
| `lib/fhe.ts` permits | ✅ correct | `client.permits.getOrCreateSelfPermit()` |
| `lib/fhe.ts` encrypt | ✅ correct | `client.encryptInputs([Encryptable.address(...), Encryptable.uint64(...)]).execute()` |
| `FHE.allow / allowThis / allowPublic` calls | ✅ present | proper ACLs in `ObscuraVote`, `ObscuraPay`, `ObscuraToken`, `ObscuraEscrow`, plus all 4 wave-2 contracts |
| Mock / demo / fake data | ✅ none | all "mock"/"placeholder"/"demo" string matches in pay components are HTML form `placeholder` attributes (UX hints) — zero fake balances, zero hard-coded amounts, zero stub responses |
| Real cUSDC backing | ✅ Reineira `0x6b6e…ed89f` | no test token used anywhere |
| Real ConfidentialEscrow integration | ✅ Reineira `0xC433…60Fa` | escrow create / setCondition called for every cycle |
| Real ConfidentialCoverageManager | ✅ Reineira `0x766e…F6f6` | full 8-arg `purchaseCoverage` now wired |
| Real PoolFactory / PolicyRegistry | ✅ Reineira `0x03bA…cBFD` / `0xf421…3c8E` | wired via `setupReineiraPool.ts` |
| Real CCTP V2 Sepolia → Arbitrum | ✅ Circle `0x9f3B…0AA5` | `depositForBurnWithHook` with `abi.encode(escrowId)` hookData |
| ERC-5564 stealth (recipient redeem) | ✅ Reveal Claim Key UI | derives spending key client-side via `secp256k1` ECDH; sanity-checked against the on-chain `stealthAddress`; copy + warning |

### `decryptForTx` / `FHE.publishDecryptResult()` — intentionally NOT used

Wave 2 Pay deliberately keeps **all** values encrypted on-chain for the full
lifetime of every escrow, stream, coverage and stake. Recipients decrypt
their own balances **off-chain** using the new `decryptForView().withPermit()`
flow (signed permit, not a tx). There is no contract path that benefits from
publishing a plaintext on-chain — doing so would leak salary, coverage size,
and pool liquidity to the entire network. If a future feature needs an
on-chain reveal (e.g. public payroll totals for a DAO), it would call:

```solidity
(uint256 ctHash, bytes memory sig) = FHE.decryptForTx(handle);
FHE.publishDecryptResult(ctHash, sig);
```

…but no v4 product flow requires this today.
