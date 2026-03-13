<p align="center">
  <img src="frontend/obscura-os-main/public/favicon.svg" width="80" alt="OBSCURA" />
</p>

<h1 align="center">OBSCURA</h1>
<p align="center"><strong>The Dark Operating System for Onchain Privacy</strong></p>
<p align="center"><em>"See Only What You're Meant To."</em></p>

<p align="center">
  Five encrypted modules — Payments · Governance · DeFi Vaults · Compliance · AI Inference<br/>
  All powered by Fully Homomorphic Encryption on Arbitrum
</p>

<p align="center">
  <a href="#wave-1--obscurapay-live">Wave 1</a> ·
  <a href="#wave-2--obscurapay-v4-live">Wave 2 Pay</a> ·
  <a href="#wave-2--obscuravote-live">Wave 2 Vote</a> ·
  <a href="#deployed-contracts">15 Contracts</a> ·
  <a href="#fhe-architecture">FHE</a> ·
  <a href="#roadmap">Roadmap</a>
</p>

---

## Vision

Public blockchains are fully transparent. Every balance, transfer, vote, and interaction is visible to anyone. Enterprises cannot run payroll, manage treasuries, or execute trades on transparent rails — not "won't," **can't**.

OBSCURA reverses that assumption: **every on-chain value is an FHE ciphertext**. Computation happens directly on encrypted data via the Fhenix CoFHE coprocessor. Decryption requires an explicit EIP-712 cryptographic permit signed by the authorized party. Arbiscan shows zero plaintext values. Not by obfuscation or mixing — by mathematics.

OBSCURA is not a single privacy tool — it's an **operating system** of five composable encrypted modules covering the full spectrum of organizational activity: payroll, governance, DeFi, compliance, and AI inference.

---

## Team

**OBSCURA** is built by a collaborative team formed during the Fhenix Buildathon:

- **Core contributor** — Full-stack architect. All 10 Solidity contracts, 5 interfaces, 14+ React hooks, complete 8-tab payment frontend, stealth payments, payroll insurance, cross-chain USDC bridge, cUSDC FHERC-20 integration. 142 tracked Pay tasks + full landing page, docs, and PMF page shipped.
- **[DiablooDEVs](https://app.akindo.io/users/DiablooDEVs)** — ObscuraVote architect. Full governance contract (V4, 4 iterations), multi-option encrypted voting, coercion-resistant revoting, 7 frontend components, 5-tab VotePage. Merged into OBSCURA to combine complementary skills — payments + governance — into one stronger team, as encouraged by the Fhenix Buildathon organizers.

Two builders. Two live modules. One unified privacy operating system.

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                       OBSCURA DASHBOARD                          │
│     Premium Dark UI · "What's Private?" Panel · FHE Stepper      │
├──────────┬───────────┬───────────┬───────────┬───────────────────┤
│  Wave 1  │  Wave 2   │  Wave 3   │  Wave 4   │     Wave 5        │
│  ✅ LIVE │  ✅ LIVE  │  PLANNED  │  PLANNED  │    PLANNED        │
│ Obscura  │ Obscura   │ Obscura   │ Obscura   │  Obscura          │
│ Pay      │ Pay v4    │ Vault     │ Trust     │  Mind             │
│  (Core)  │ + Vote    │  (DeFi)   │(Compliance)│  (AI)            │
├──────────┴───────────┴───────────┴───────────┴───────────────────┤
│   cUSDC FHERC20 · $OBS Token · ObscuraPermissions · ACL Layer    │
│   CoFHE / FHE.sol / @cofhe/sdk / EIP-712 Permits                │
├──────────────────────────────────────────────────────────────────┤
│              Arbitrum Sepolia (Chain ID 421614)                   │
├──────────────────────────────────────────────────────────────────┤
│           Fhenix CoFHE Threshold Network (Coprocessor)           │
└──────────────────────────────────────────────────────────────────┘
```

### FHE Ciphertext Lifecycle

```
┌─────────────┐    ┌──────────────┐    ┌─────────────────┐    ┌───────────────┐    ┌──────────────────┐
│ 01. CLIENT   │    │ 02. CONTRACT  │    │ 03. COMPUTATION  │    │ 04. ACL        │    │ 05. DECRYPTION    │
│ ENCRYPTS     │───▶│ RECEIVES      │───▶│ ON CIPHERTEXT   │───▶│ PERMISSION     │───▶│ WITH PERMIT       │
│              │    │               │    │                 │    │                │    │                  │
│ @cofhe/sdk   │    │ InEuint64 →   │    │ FHE.add()       │    │ FHE.allow()    │    │ Threshold Network │
│ encryptInputs│    │ euint64 handle│    │ FHE.select()    │    │ FHE.allowThis()│    │ EIP-712 permit    │
│ in browser   │    │ (bytes32)     │    │ FHE.eq()        │    │ FHE.allowPublic│    │ → plaintext       │
└─────────────┘    └──────────────┘    └─────────────────┘    └───────────────┘    └──────────────────┘
```

---

## Wave 1 — ObscuraPay (LIVE)

**Core encrypted payment infrastructure. Four Solidity contracts deployed, all processing real encrypted transactions.**

Plus `ObscuraPermissions.sol` — shared role-based ACL helper reused across all waves.

### Smart Contracts (4)

| Contract | Purpose |
|----------|---------|
| **ObscuraToken.sol** | `$OBS` FHERC-20. All balances are `euint64` ciphertexts. Daily faucet 100 $OBS/24h. Confidential P2P transfers. Operator model with time-scoped expiry (`setOperator + expiry`). |
| **ObscuraPay.sol** | Open-access encrypted payroll. Any wallet is employer. `FHE.add()` accumulates salaries on-chain without ever seeing the values. `batchPay()` up to 50 employees. Role ACL: ADMIN / EMPLOYEE / AUDITOR. Auditors see aggregate totals only — zero individual salary exposure. |
| **ObscuraEscrow.sol** | Recipient identity stored as `eaddress` ciphertext. Amount stored as `euint64` ciphertext. **Silent failure pattern:** unauthorized redemptions return zero via `FHE.select()` — no revert, indistinguishable from success. Zero information leakage. Pluggable resolver hooks. |
| **ObscuraConditionResolver.sol** | Pluggable escrow release logic. TIME_LOCK (release after deadline) and APPROVAL (designated approver) conditions. Queried before every redemption attempt. |

### Wave 1 Key Features

- **Encrypted Payroll** — `FHE.add()` salary accumulation, `batchPay()` up to 50, role-based ACL (Admin/Employee/Auditor)
- **Encrypted Escrow** — `eaddress` owner + `euint64` amount, silent failure pattern via `FHE.select()`
- **Conditional Release** — TIME_LOCK and APPROVAL modes, queried before every redemption
- **$OBS FHERC-20** — Encrypted balances, daily faucet, confidential transfers, time-scoped operator model

---

## Wave 2 — ObscuraPay v4 (LIVE)

**Massive expansion of ObscuraPay. From 4 → 15 deployed contracts. 142 tracked implementation tasks shipped. 14+ React hooks. 15 payment components. Full 8-tab frontend rebuild on encrypted cUSDC stablecoin.**

Wave 2 Pay v4 integrates with the ReineiraOS protocol for FHERC-20 stablecoin (cUSDC), encrypted escrows, and insurance infrastructure. All payment features now run exclusively on encrypted cUSDC — no plaintext stablecoins touch the system.

### New OBSCURA Contracts (4)

| Contract | Purpose |
|----------|---------|
| **ObscuraPayStream.sol** | Recurring encrypted payroll streams — cUSDC salary to stealth addresses, per-cycle encrypted payments, pause/resume/cancel |
| **ObscuraStealthRegistry.sol** | ERC-5564 stealth address registry — recipients register ECDH meta-addresses, senders generate one-time stealth addresses, view-tag scanning |
| **ObscuraPayrollResolver.sol** | Cycle-based escrow release conditions — `getCycle`, `isConditionMet`, `approve`, `cancel` per escrow ID |
| **ObscuraPayrollUnderwriter.sol** | Payroll insurance underwriting — encrypted coverage terms, premium calculation, dispute resolution |

### ReineiraOS Protocol Integration (6 contracts)

| Contract | Purpose |
|----------|---------|
| **cUSDC (ConfidentialUSDC)** | FHERC-20 encrypted stablecoin — wrap/unwrap from plaintext USDC, all balances as `euint64`, confidential transfers, operator model |
| **ConfidentialEscrow** | cUSDC-native encrypted escrow — owner as `eaddress`, amount as `euint64`, create/fund/redeem with FHE |
| **CoverageManager** | Insurance coverage management — purchase encrypted coverage for escrows, dispute filing, claim adjudication |
| **InsurancePool** | Staked liquidity pool — stakers deposit cUSDC, earn premiums, provide coverage backing |
| **PoolFactory** | Creates and manages insurance pool instances |
| **PolicyRegistry** | On-chain registry of active insurance policies |

### Interfaces Written (5)

`IConditionResolver` · `IConfidentialUSDC` · `IERC165` · `IReineiraEscrow` · `IUnderwriterPolicy`

### Frontend — 8-Tab PayPage

| Tab | Features |
|-----|----------|
| **Dashboard** | cUSDC balance (encrypted handle + decrypted), wrap/unwrap USDC↔cUSDC, operator authorization, 6-step how-it-works guide |
| **Send** | FHE-encrypted P2P cUSDC transfers with 3-step progress (Encrypting → Sending → Confirmed) |
| **Receive** | 4-step recipient onboarding, stealth registration, incoming stream detection, cUSDC balance reveal |
| **Escrows** | Create encrypted escrow (owner `eaddress` + amount `euint64`), auto-fund after create, redeem, resolver conditions, My Escrows list |
| **Streams** | Create recurring payroll streams to stealth addresses, tick payments, pause/resume/cancel, live countdown timers, stealth-ready badges |
| **Cross-Chain** | Bridge USDC from Ethereum Sepolia via Circle CCTP V1 — `depositForBurn` → attestation polling → `receiveMessage` auto-claim, 6-step progress, state persistence, burn tx recovery |
| **Insurance** | Buy coverage for escrows, file disputes with encrypted evidence, stake cUSDC into insurance pools as LP, My Policies panel |
| **Stealth** | Register ECDH meta-address, scan inbox for incoming stealth payments, reveal claim key derivation |

### Key Hooks (14+)

| Hook | Purpose |
|------|---------|
| `useCUSDCBalance` | Balance read, wrap/unwrap, decrypt, `setOperator`, rate-limit retry (3x exponential backoff) |
| `useCUSDCTransfer` | FHE encrypt + `confidentialTransfer(InEuint64)` with rate-limit retry |
| `useCUSDCEscrow` | Create/fund/redeem encrypted escrows, `ensureOperator` pre-check, `parseUnits(amount,6)` |
| `useCreateStream` | Create recurring payroll streams to stealth recipients |
| `useTickStream` | Direct `cUSDC.confidentialTransfer(stealthAddr, InEuint64)` — bypasses PayStream euint64 selector mismatch |
| `useStreamList` | Fetch active streams, instant refresh on creation, countdown timers |
| `useStealthMetaAddress` | Register/fetch stealth meta-addresses from StealthRegistry |
| `useStealthScan` | ECDH scan for incoming stealth payments, view-tag filtering |
| `useCrossChainFund` | CCTP V1 burn on Eth Sepolia → attestation poll → claim on Arb Sepolia, localStorage persistence |
| `useInsurePayroll` | Purchase coverage with `ensureOperator` pre-check, 3-step progress, coverage ID capture from tx logs |
| `useIsOperator` | Pre-check `cUSDC.isOperator(holder, spender)` to skip redundant `setOperator` transactions |
| `useRecipientStealthCheck` | Live stealth registration status badge for recipients |

### Critical Bug Fixes Shipped

- **euint64 selector mismatch** — Our SDK uses bytes32, Reineira uses uint256. All PayStream↔cUSDC calls used wrong selector. **Fix:** bypass PayStream, call `cUSDC.confidentialTransfer()` directly.
- **FHERC-20 approve vs setOperator** — Standard `approve()` reverts on Reineira cUSDC. **Fix:** use `setOperator(spender, expiry)` everywhere.
- **Rate limit 429** — Arbitrum Sepolia RPC throttles rapid sequential txs. **Fix:** `withRateLimitRetry<T>` helper with 3-retry exponential backoff.
- **Escrow auto-fund** — `create()` only registers the escrow record; `fund()` is required to lock cUSDC. **Fix:** `create()` auto-calls `fund()` after.
- **MetaMask "Network fee: Unavailable"** — RPC cannot simulate CoFHE coprocessor calls. **Fix:** explicit `gas: bigint` on every `writeContractAsync` call.
- **Double 0x prefix** — `bytesToHex()` already returns `0x`-prefixed. **Fix:** removed redundant concat in stealth lib.
- **Stealth registration gas** — 200k insufficient for Arbitrum L1 data costs on `bytes` storage. **Fix:** increased to 500k.
- **BigInt(0) falsy in JS** — `!proposalId` is true when `proposalId === 0n`. Cast vote did nothing for proposal #0. **Fix:** check `=== undefined`.
- **CCTP V2→V1 downgrade** — CCTP V2 not deployed on Sepolia testnet. **Fix:** switched to `depositForBurn` (V1).

### FHE Feature Coverage Audit

**Every function in every deployed ABI is wired to a UI entry point. 0 unused capabilities.** Full audit across 24 contract functions covering `wrap`, `unwrap`, `confidentialTransfer`, `setOperator`, `isOperator`, `confidentialBalanceOf`, `create`, `fund`, `redeem`, `exists`, `setPaused`, `cancelStream`, `createStream`, `getStream`, `approve`, `cancel`, `getCycle`, `isConditionMet`, `registerMetaAddress`, `getMetaAddress`, `announce`, `purchaseCoverage`, `dispute`, `stake`.

---

## Wave 2 — ObscuraVote (LIVE)

**Coercion-resistant encrypted governance. No one — including the contract — knows individual vote choices.**

Built by [DiablooDEVs](https://app.akindo.io/users/DiablooDEVs). ObscuraVote V4 deployed after 4 contract iterations. 7 frontend components. Full 5-tab VotePage.

### Smart Contract — ObscuraVote.sol (V4)

**4 iterations shipped:**
- **V1** — Yes/No voting with `euint64 yesVotes/noVotes`, admin-gated creation
- **V2** — Multi-option (2–10 options), categories, description, quorum, voter participation tracking, "Verify My Vote"
- **V3** — Token-gated creation (any $OBS holder), creator can cancel/extend (not admin-only)
- **V4** — Fixed stuck proposals (cancel allowed when deadline passed + quorum not met), BigInt(0) fix, FHE pre-init

### Contract Features

| Feature | Details |
|---------|---------|
| **Multi-option polls** | 2–10 options per proposal, each with independent encrypted tally counter |
| **6 Categories** | General, Treasury, Protocol, Grants, Social, Technical |
| **FHE-encrypted ballots** | Option index encrypted client-side via `@cofhe/sdk`, accumulated via `FHE.add()` |
| **Coercion-resistant revoting** | `FHE.sub(tally[old], 1)` + `FHE.add(tally[new], 1)` — externally indistinguishable from first vote |
| **Time-locked results** | `FHE.allowPublic()` on each tally only after deadline + finalization. No one sees results during voting |
| **Token-gated creation** | Any wallet that has claimed $OBS at least once can create proposals |
| **Quorum enforcement** | Configurable minimum votes. Finalization blocked if quorum not met. Cancel allowed if expired + no quorum |
| **Verify My Vote** | `FHE.allow(newVote, msg.sender)` — voter self-decrypts their ballot to confirm correct recording |
| **Cancel / Extend** | Creator or admin can cancel (if no votes or expired+no quorum) or extend deadline (forward-only) |

### FHE Operations Per Vote

```
For each option (0..N-1):
  FHE.eq(encryptedVote, optionIndex)     → ebool: is this the chosen option?
  FHE.select(isChosen, one, zero)        → euint64: 1 if chosen, 0 if not
  FHE.add(tally[option], selectedValue)  → euint64: increment tally

On revote:
  FHE.sub(tally[oldOption], ...) + FHE.add(tally[newOption], ...)

On finalize:
  FHE.allowPublic(tally[i]) for each option  → anyone can decrypt aggregate
```

Gas per vote: **N × 7 FHE ops** (eq + select + add/sub per option). Gas limit: **3,000,000**.

### Frontend — 5-Tab VotePage

| Tab | Features |
|-----|----------|
| **Dashboard** | Stats (total proposals, your votes cast, wallet info), Privacy Model cards, FHE Operations grid, $OBS faucet |
| **Proposals** | Search by title, status filters (All/Active/Ended/Finalized/Cancelled), live countdown timers, category badges |
| **Cast Vote** | Multi-option radio selection, $OBS token check, revote warning, proposal info display, eager FHE pre-init |
| **Results** | Multi-option colored bars, winner highlight (★), quorum indicator, CSV export, finalize button |
| **Create** | Templates (Yes/No, Approve/Reject/Abstain, Custom), dynamic options (2–10), description, category, duration presets, quorum |

### Vote Components (7)

| Component | Features |
|-----------|----------|
| `CreateProposalForm` | Templates, dynamic option management, category dropdown, duration presets, quorum slider |
| `CastVoteForm` | Multi-option radio, OBS check, revote warning, eager FHE pre-init |
| `ProposalList` | Search, status filters, countdown, category badges |
| `TallyReveal` | Colored bars, winner highlight, quorum check, CSV export, finalize action |
| `VoteDashboard` | Stats cards, privacy model explanation, FHE ops grid |
| `VotingHistory` | Per-proposal vote status, "Verify My Vote" (FHE self-decrypt), cancelled handling |
| `AdminControls` | Per-proposal cancel + extend deadline (creator/admin enforced on-chain) |

---

## Deployed Contracts

**Network:** Arbitrum Sepolia (Chain ID 421614) | **Deployer:** `0xD208aC8327e6479967693Af2F2216e1612D0171A`

### Wave 1 — Core (4 contracts)

| Contract | Address |
|----------|---------|
| ObscuraToken ($OBS) | `0xf4A1219b0aaB83f772B240Ed508e3A37d7F55ED2` |
| ObscuraPay | `0x13e2e3069bF9729C8Cd239F9A5fAAb087c77C33f` |
| ObscuraEscrow | `0x77d6f4B3250Ef6C88EC409d49dcF4e5a4DdF2187` |
| ObscuraConditionResolver | `0x8176549dfbE797b1C77316BFac18DAFCe42bEb8c` |

### Wave 2 — Pay v4 New OBSCURA Contracts (4)

| Contract | Address |
|----------|---------|
| ObscuraPayStream | `0x15d28Cbad36d3aC2d898DFB28644033000F16162` |
| ObscuraStealthRegistry | `0xa36e791a611D36e2C817a7DA0f41547D30D4917d` |
| ObscuraPayrollResolver | `0xC567249c8bE2C59783CD1d1F3081Eb7B03e89761` |
| ObscuraPayrollUnderwriter | `0x8fA403DDBE7CD30C8b26348E1a41E86ABDD6088c` |

### Wave 2 — ReineiraOS Protocol Integration (6)

| Contract | Address |
|----------|---------|
| cUSDC (ConfidentialUSDC) | `0x6b6e6479b8b3237933c3ab9d8be969862d4ed89f` |
| ConfidentialEscrow | `0xC4333F84F5034D8691CB95f068def2e3B6DC60Fa` |
| CoverageManager | `0x766e9508BD41BCE0e788F16Da86B3615386Ff6f6` |
| InsurancePool | `0x5AC95Fa097CAC0a6d98157596Aff386b30b67069` |
| PoolFactory | `0x03bAc36d45fA6f5aD8661b95D73452b3BedcaBFD` |
| PolicyRegistry | `0xf421363B642315BD3555dE2d9BD566b7f9213c8E` |

### Wave 2 — ObscuraVote (1)

| Contract | Address |
|----------|---------|
| ObscuraVote (V4) | `0x5d91B5ccb581F543f7399eea1c65Dfa88b3f9B7a` |

**Total: 15 deployed contracts on Arbitrum Sepolia.**

---

## FHE Architecture

### All FHE Operations Used

| Operation | Description | Status |
|-----------|-------------|--------|
| `FHE.asEuint64()` | Convert encrypted client input to euint64 handle | Active |
| `FHE.asEaddress()` | Convert encrypted address from client | Active |
| `FHE.asEbool()` | Create encrypted boolean | Active |
| `FHE.add()` | Accumulate salary, tally votes, fund escrow | Active |
| `FHE.sub()` | Subtract on revote, deduct from balance | Active |
| `FHE.eq()` | Encrypted equality (escrow owner, vote option match) | Active |
| `FHE.gte()` | Encrypted >= comparison (sufficient funds check) | Active |
| `FHE.select()` | Encrypted conditional — silent failure returns 0 | Active |
| `FHE.and()` | Combine encrypted booleans for multi-condition checks | Active |
| `FHE.not()` | Negate encrypted boolean | Active |
| `FHE.allow()` | Grant specific address decrypt access to a handle | Active |
| `FHE.allowThis()` | Contract retains handle access for next transaction | Active |
| `FHE.allowPublic()` | Make handle publicly decryptable (vote finalization) | Active |
| `FHE.isInitialized()` | Check if handle exists before operating | Active |
| `FHE.gt()` | Greater-than comparison | Planned (Wave 3) |
| `FHE.mul()` | Multiply on ciphertext | Planned (Wave 5) |
| `FHE.div()` | Divide on ciphertext | Planned (Wave 5) |
| `FHE.max()` / `FHE.min()` | Encrypted min/max | Planned (Wave 3) |

### Key Technical Innovations

**1. Silent Failure Pattern (ObscuraEscrow)**
```solidity
eaddress eCaller = FHE.asEaddress(msg.sender);
ebool isOwner    = FHE.eq(eCaller, esc.owner);
ebool isPaid     = FHE.gte(esc.paidAmount, esc.amount);
ebool valid      = FHE.and(isOwner, FHE.and(isPaid, FHE.not(esc.isRedeemed)));
// Unauthorized caller receives 0 tokens silently — no revert, no info leak
euint64 amount   = FHE.select(valid, esc.paidAmount, FHE.asEuint64(0));
```

**2. Coercion-Resistant Voting (ObscuraVote)**
```solidity
// Revote: subtract old vote, add new — externally indistinguishable
for (uint i = 0; i < numOptions; i++) {
    ebool wasOld = FHE.eq(oldVote, FHE.asEuint64(i));
    tally[i] = FHE.sub(tally[i], FHE.select(wasOld, one, zero));
    ebool isNew = FHE.eq(newVote, FHE.asEuint64(i));
    tally[i] = FHE.add(tally[i], FHE.select(isNew, one, zero));
}
```

**3. EIP-712 Permit-Gated Decryption**
```typescript
// Client-side: user signs permit, Threshold Network decrypts
const result = await decryptForView(ctHash, FheTypes.Uint64)
  .withPermit()
  .execute();
// Only the authorized address can trigger decryption
```

**4. Composable Module Architecture**
- Pay streams fund escrows → Insurance protects payroll → Stealth hides recipients
- $OBS token gates governance → Vote results inform treasury
- Each module shares the FHE ACL layer, cUSDC stablecoin, and EIP-712 permit infrastructure

---

## Roadmap

| Wave | Module | Status | Description |
|------|--------|--------|-------------|
| **1** | **ObscuraPay** | ✅ Live | 4 contracts — encrypted payroll, escrows, conditions, $OBS FHERC-20 token |
| **2** | **ObscuraPay v4 + ObscuraVote** | ✅ Live | 11 new contracts — stealth payments, recurring streams, cUSDC, insurance, cross-chain bridge, encrypted governance |
| **3** | ObscuraVault | 🔒 Planned | MEV-protected sealed-bid auctions, encrypted yield vaults, private liquidity pools |
| **4** | ObscuraTrust | 🔒 Planned | Selective disclosure, time-scoped auditor permits, ZK+FHE compliance attestations |
| **5** | ObscuraMind | 🔒 Planned | Privacy-preserving AI inference, ML on encrypted data, cross-module credit scoring |

---

## Project Structure

```
obscura/
├── contracts-hardhat/
│   ├── contracts/
│   │   ├── ObscuraPermissions.sol       # Shared ACL helper (all waves)
│   │   ├── ObscuraToken.sol             # $OBS FHERC20 token [Wave 1]
│   │   ├── ObscuraPay.sol               # Encrypted payroll engine [Wave 1]
│   │   ├── ObscuraEscrow.sol            # Encrypted escrow + silent failure [Wave 1]
│   │   ├── ObscuraConditionResolver.sol # Time-lock + approval conditions [Wave 1]
│   │   ├── ObscuraPayStream.sol         # Recurring cUSDC payroll streams [Wave 2]
│   │   ├── ObscuraStealthRegistry.sol   # ERC-5564 stealth address registry [Wave 2]
│   │   ├── ObscuraPayrollResolver.sol   # Cycle-based escrow resolver [Wave 2]
│   │   ├── ObscuraPayrollUnderwriter.sol# Payroll insurance underwriting [Wave 2]
│   │   ├── ObscuraVote.sol              # Encrypted governance V4 [Wave 2]
│   │   └── interfaces/
│   │       ├── IConditionResolver.sol
│   │       ├── IConfidentialUSDC.sol
│   │       ├── IReineiraEscrow.sol
│   │       ├── IUnderwriterPolicy.sol
│   │       └── IERC165.sol
│   ├── scripts/
│   │   ├── deployWave2Pay.ts
│   │   └── deploy-vote.js
│   ├── tasks/
│   │   ├── deploy.ts
│   │   └── create-proposal.ts
│   ├── test/                            # 8/8 passing (resolver + registry)
│   └── deployments/arb-sepolia.json
│
├── frontend/obscura-os-main/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Index.tsx                # Landing page (5-module vision)
│   │   │   ├── PayPage.tsx              # 8-tab ObscuraPay dashboard [Wave 2]
│   │   │   ├── VotePage.tsx             # 5-tab ObscuraVote dashboard [Wave 2]
│   │   │   ├── DocsPage.tsx             # Documentation
│   │   │   └── PMFPage.tsx              # Product-market fit analysis
│   │   ├── components/
│   │   │   ├── pay-v4/                  # 15 payment components [Wave 2]
│   │   │   ├── vote/                    # 7 governance components [Wave 2]
│   │   │   └── (landing page components)
│   │   ├── hooks/                       # 14+ custom React hooks
│   │   ├── config/
│   │   │   ├── contracts.ts             # Vote ABI + addresses
│   │   │   ├── wave2.ts                 # Pay v4 ABIs + all addresses
│   │   │   └── wagmi.ts                 # Chain config
│   │   └── lib/
│   │       ├── fhe.ts                   # @cofhe/sdk wrappers + permit caching
│   │       └── stealth.ts              # ECDH stealth address library
│   └── .env
│
├── wave2-vote/WAVE2-PROGRESS.md         # Vote implementation log
├── WAVE2_PAY_PROGRESS.md                # Pay implementation log (142 tasks)
├── implementation_plan.md               # Full 5-wave architecture plan
└── README.md
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Blockchain** | Arbitrum Sepolia (Chain ID 421614) |
| **FHE Protocol** | Fhenix CoFHE Threshold Network · @fhenixprotocol/cofhe-contracts |
| **Contracts** | Solidity 0.8.25 · FHE.sol · 10 contract files + 5 interfaces |
| **Tokens** | cUSDC (FHERC-20 encrypted stablecoin) · $OBS (FHERC-20 governance token) |
| **Frontend** | React 18 · Vite 5 · TypeScript 5.8 · Tailwind 3.4 · Framer Motion |
| **Web3** | wagmi 3.6 · viem 2.47 · @cofhe/sdk 0.4 |
| **Design** | Space Grotesk + DM Sans · Dark luxury cyberpunk aesthetic |
| **Bridge** | Circle CCTP V1 (Ethereum Sepolia → Arbitrum Sepolia) |
| **Stealth** | ERC-5564 · ECDH key derivation · View-tag scanning |

---

## Getting Started

```bash
# Frontend
cd frontend/obscura-os-main
bun install
bun run dev

# Contracts (requires Hardhat + Fhenix CoFHE plugin)
cd contracts-hardhat
npx hardhat compile
npx hardhat test
```

1. Connect MetaMask to **Arbitrum Sepolia** (Chain ID 421614)
2. Claim free **$OBS** tokens from the faucet on the Vote page
3. Wrap USDC into **cUSDC** on the Pay Dashboard tab
4. All FHE transactions require explicit gas limits due to CoFHE coprocessor simulation limitations

---

## What OBSCURA Proves

- **FHE on EVM is production-ready.** 15 smart contracts deployed, processing real encrypted transactions with zero plaintext leakage across payments and governance.
- **Complex business logic works on ciphertext.** Payroll accumulation, conditional escrows, stealth payments, coercion-resistant voting, insurance underwriting — all on encrypted data.
- **UX can abstract FHE complexity.** 8-tab PayPage + 5-tab VotePage with async stepper, permit-gated decryption, and "What's Private?" panels. Zero user exposure to ciphertext internals.
- **Composable encrypted modules scale.** Five modules sharing one FHE infrastructure, one ACL layer, one stablecoin. Each module reinforces the next.

---

## License

MIT

---

<p align="center"><em>OBSCURA — See only what you're meant to.</em></p>
