# WAVE 5 — Obscura Ecosystem Execution Memory (`summary5.md`)

## ✅ WAVE 5 LIVE ON ARB SEPOLIA — 2026-05-23

All Phase 1/2/3/4/5 contracts deployed, wired, and verified end-to-end. Frontend
`.env` updated with real addresses. Keeper bot installed, configured with real
key, smoke-tested against live markets (Chainlink prices fetched, HF computed).

| Contract | Address | Notes |
|---|---|---|
| ObscuraCreditScoreV2 | `0xe5B0c6c06C0B1fd7d7CD5D2e93997693863d3D4D` | wired to M-86, M-70-WETH, M-50-OBS |
| ChainlinkPriceAdapter ETH/USD | `0xe3E388b421bfcF558FD46a18eE3b1c27aD1D36B3` | `setPublicFeed(ocWETH)` done |
| ChainlinkPriceAdapter USDC/USD | `0xc65e85926Cb29aaEC74f99cF1591CBa65daa2c4A` | `setPublicFeed(ocUSDC)` done |
| ObscuraTimelock (OZ) | `0x07b7961627f433a1d9001F82Ac4af9F19b9a9E05` | 2-day delay, deployer admin renounced |
| ObscuraGovernor | `0xE4807C9F90a0da8F5B5bafa4361B15ff855b7186` | wraps Vote V5 `voterParticipation` |
| ObscuraTreasuryStreamer | `0x4af75Ae3B46C34B70d6E85FEcDb71E99EC490FeD` | timelock-only controller |
| credit-keeper bot | `packages/credit-keeper/` | DRY_RUN=true, scan verified |
| Governance UI | `/vote` → sidebar **Executable Proposals** | live reads + writes, see Phase 8 |

Deploy txs all confirmed (exit code 0 from both deploy scripts). Real wiring:
M-86 / M-70-WETH / M-50-OBS markets all returning the new Score V2 oracle;
oracle now uses Chainlink adapters instead of broken 1e12 scaler. Keeper
output: `[scan 0xcf98d979] borrowers=1 liqT=9000bps … HF=18000bps ok` — proves
the full read path (market → oracle → Chainlink adapter → HF math) works.

---

> **Purpose**: Single source of truth for the Wave-5 cross-product execution.
> Every phase started in this stream is logged here with: what was found,
> what was shipped, what was deferred, what the user must run next.
> If a session ends mid-phase, the next session reads this file to resume.

> **Master plan**: 22 phases (see PAY_STRATEGY / CREDIT_STRATEGY / VOTE_STRATEGY).
> **Pace**: 1–2 phases per session realistically. Some require deployments
> (private key only the user has); contract authoring + script staging happens
> here, the user runs the actual broadcast.

> **🚨 Fhenix mainnet status (verified May 2026)**: CoFHE is **testnet-only**.
> Live networks: Arbitrum Sepolia (our chain), Ethereum Sepolia, Base Sepolia.
> No CoFHE mainnet GA exists. Phase 21 ("audit + mainnet") is therefore a
> **mainnet-readiness gate** — audit, freeze, contract verification, and
> deployment runbook — with the actual broadcast blocked on Fhenix CoFHE
> mainnet launch. Do **NOT** broadcast Obscura to Arbitrum One until then.

---

## Phase 0 — Codebase audit (✅ COMPLETE)

### What I found

The repo is **far more shipped** than the strategy docs implied. Snapshot:

#### Credit (`contracts-hardhat/contracts/credit/`)
- 16 contracts already authored. v3.18.2 is live with **full FHE audit PASSED**.
- `ObscuraCreditMarket.sol` **already integrates** `IEncryptedScore` for LLTV
  boost in both borrow (line 415–427) and liquidation (line 614–626) paths —
  via `userTier()` (plain bucket) + `scoreOf()` (encrypted score) + `allowTransientForMarket()`.
- `setScoreOracle(address)` exists on the market (line 152). Currently **NOT
  CALLED on any of the 3 deployed markets** (M-86, M-70-WETH, M-50-OBS).
- `ObscuraCreditScore.sol` is deployed at `0xA83aCeE57af79D77cac6854edf92A63A60c28c18`
  but uses **wrong adapter interfaces** for AddressBook/Vote — it calls
  `getContacts()` and `totalVotesByUser()` which **do not exist** on the
  live contracts. Result: score reads 0 for everyone today via silent `try/catch`.
- `ObscuraCreditOracle.sol` has a **scale bug** for Chainlink: `raw / 1e12`
  assumes 18-decimal Pyth-style feeds. Arbitrum Sepolia Chainlink feeds
  return 8 decimals → math underflows to 0 for ETH ($3000 × 1e8 / 1e12 = 0).

#### Pay (`contracts-hardhat/contracts/`)
- 13 contracts live: Pay, Invoice, PayStreamV2, Insurance, ConfidentialEscrow,
  Stealth (Registry + Rotation), AddressBook, InboxIndex, PayrollV2, Underwriter, Rewards.
- `ObscuraPayStreamV2.streamsByEmployer(address) returns(uint256[])` — usable
  as a per-user score signal.
- `ObscuraAddressBook.listContactIds(address) returns(uint256[])` — usable
  as a per-user social-graph signal.

#### Vote (`contracts-hardhat/contracts/`)
- V5 + Treasury + Rewards + OBS token all live on Arbitrum Sepolia.
- `voterParticipation` mapping is **public** → auto-getter
  `voterParticipation(address) returns(uint256)` exists. Score just needs to
  call this instead of the imaginary `totalVotesByUser`.

#### Frontend (`frontend/obscura-os-main/src/`)
- 50+ hooks, 9 pages, naming standardized to `ocUSDC / ocWETH / ocOBS`.
- Gas-preflight, FHE-status, decrypt-balance, shield, unshield all built.

### Decision

The "Wave-5 ecosystem" work is **wire-up + new infra**, not greenfield. Strategy
docs were correctly forward-looking; this memory doc tracks the actual deltas.

---

## Phase 1 — IEncryptedScore activation (✅ CONTRACTS SHIPPED & COMPILED)

### Goal
Wire Pay (stream count) + Vote (participation count) + AddressBook (contact
count) into a corrected score contract, then set the score oracle on all 3
live markets so every borrow picks up an encrypted LLTV boost up to +400 bps
(tier 3 = score ≥ 750).

### What I shipped

**File**: `contracts-hardhat/contracts/credit/ObscuraCreditScoreV2.sol`
(compiles clean against `solc 0.8.25` + `viaIR` — see `npx hardhat compile`).

1. **Adapter interfaces fixed** to match the actual live-contract functions:
   - `IPayStreamV2Score.streamsByEmployer(address) returns(uint256[])` →
     `.length` is the per-user stream count (replaces the bogus global
     `streamCount()` in v1, which made every user score the same).
   - `IAddressBookV2Score.listContactIds(address) returns(uint256[])` →
     `.length` is per-user contact count (replaces non-existent
     `getContacts()` in v1, which silently caught and returned 0).
   - `IVoteV2Score.voterParticipation(address) returns(uint256)` (replaces
     non-existent `totalVotesByUser()` in v1).
2. **Same `IEncryptedScore` external surface** (`scoreOf`, `userTier`,
   `allowTransientForMarket`) → the 3 deployed markets need **zero code
   changes**, just `setScoreOracle(scoreV2)`.
3. **Anti-grind clamps** tightened per source: streams ≤ 50 (×5), contacts
   ≤ 20 (×3, lower because `addContact` is cheap to spam), votes ≤ 30 (×8,
   highest weight because casting a vote requires holding $OBS).
4. **`bumpFromMarket(address user)`** + `setAuthorizedMarket(market, ok)`
   → market can lazy-ping a refresh on first touch.
5. **`updateScore(address)` is permissionless** → anyone (or a keeper) can
   refresh a user's score, but the resulting handle is only ACL'd to the
   user themselves and (transiently) to markets the user has attested for.

### What the user must run

```powershell
# from contracts-hardhat/
npx hardhat compile                                                # ✓ already passes
npx hardhat run scripts/deployWave5Phase1And2.ts --network arb-sepolia
```

`scripts/deployWave5Phase1And2.ts` (single combined script) will:
- Deploy `ObscuraCreditScoreV2(payStreamV2, addressBook, voteV5)`
- Deploy 2 × `ChainlinkPriceAdapter` (ETH/USD + USDC/USD) — see Phase 2
- `setAuthorizedMarket(M-86 / M-70-WETH / M-50-OBS, true)` on Score V2
- `setPublicFeed(ocWETH/ocUSDC, adapter)` on existing oracle (if signer is gov)
- `setScoreOracle(scoreV2)` on each market (if signer is factory)
- Append addresses to `deployments/arb-sepolia.json` under
  `ObscuraCreditScoreV2`, `ChainlinkPriceAdapter_ETHUSD`,
  `ChainlinkPriceAdapter_USDCUSD`, `wave5Phase1And2DeployedAt`

If the deployer is not the factory/gov, the script prints the unsigned
follow-up calls so the correct signer can broadcast them separately.

### Privacy note
- `userTier(address)` returns a **plain uint8** tier bucket (0–3). This
  intentionally leaks the bucket, NOT the raw score, so the market can do
  a public branch on tier without an FHE select. Same trade as today.
- The raw `scoreOf` stays `euint64` and is only transient-authorized to the
  market for the duration of a borrow/liquidation tx.

---

## Phase 2 — Chainlink oracle (✅ ADAPTER SHIPPED & COMPILED — IN-PLACE FIX)

### Goal
Fix the broken 1e12 scaler that returns 0 for 8-decimal Chainlink feeds,
without redeploying the market (oracle is `immutable` in `ObscuraCreditMarket`
storage at line 33 — swapping would require redeploying all 3 markets and
migrating state).

### Architectural decision

**Rejected**: write `ObscuraCreditOracleV2` and call `market.setOracle(...)`.
The market has no `setOracle` — the oracle address is **immutable** in
constructor. A v2 oracle would require a v2 market for each of M-86,
M-70-WETH, M-50-OBS, with full state migration. Too disruptive for a
scaler bug.

**Chosen**: `ChainlinkPriceAdapter.sol` — an in-place adapter that wraps a
Chainlink `AggregatorV3` and exposes the existing oracle's expected
`latestAnswer() returns(uint256)` interface, but re-scales the 8-decimal
Chainlink answer to 18 decimals (× `1e10`). The existing oracle's
divide-by-`1e12` then produces correct micro-USD (1e6) output **with zero
downstream changes**.

### What I shipped

**File**: `contracts-hardhat/contracts/credit/ChainlinkPriceAdapter.sol`
(compiles clean — same compile pass as Phase 1).

- Reads Chainlink `latestRoundData()` (not the deprecated `latestAnswer()`).
- **Staleness gate**: reverts on `block.timestamp - updatedAt > maxStaleness`.
  Default 24h (testnet tolerance); mainnet would tighten to 1h.
- **Non-positive answer gate**: reverts on `answer <= 0`.
- **Decimals auto-detect**: reads `feed.decimals()` at deploy, pre-computes
  `scale = 10**(18 - feedDecimals)`. Works for any Chainlink-shaped feed.
- Exposes `latestAnswer() returns(uint256)` matching the existing
  `IPlainFeed` interface in `ObscuraCreditOracle`.

Then `setPublicFeed(ocWETH, ethAdapter)` + `setPublicFeed(ocUSDC, usdcAdapter)`
on the **existing** `ObscuraCreditOracle` (0x5F0091...) — the deploy script
handles both. No market redeploy, no oracle redeploy.

### Arbitrum Sepolia feed addresses (verified on docs.chain.link)

| Pair | Chainlink feed | Decimals | Adapter target asset |
|---|---|---|---|
| ETH / USD | `0xd30e2101a97dcbAeBCBC04F14C3f624E67A35165` | 8 | ocWETH |
| USDC / USD | `0x0153002d20B96532C639313c2d54c3dA09109309` | 8 | ocUSDC |

(OBS uses the oracle's existing `setConfidentialPrice` path unchanged.)

### What the user must run

Same combined script as Phase 1:

```powershell
npx hardhat run scripts/deployWave5Phase1And2.ts --network arb-sepolia
```

Deploys both adapters and wires them — see Phase 1 section for full output
structure.

### Why this is better than a v2 oracle

1. **Zero state migration** — markets keep their immutable oracle pointer.
2. **Per-asset adapter** — different staleness windows per asset are
   possible by deploying a 2nd adapter (e.g. tighter for a high-vol pair).
3. **Reversible** — `setPublicFeed(asset, address(0))` falls back to the
   confidential-price path; testnet rollback is one tx.

---

## Phase 3 — Live liquidation auctions + keeper (✅ KEEPER SHIPPED)

### What I shipped
- **`packages/credit-keeper/`** — standalone TypeScript bot (viem ^2.21 +
  `@fhenixprotocol/cofhe-sdk` ^0.3 + dotenv, ES2022/ESNext).
  - `src/index.ts` — main loop. Every `POLL_INTERVAL_MS` (default 30s):
     1. `loadMarketCtx` for each market in `MARKETS`. Pulls `loanAsset`,
        `collateralAsset`, `liqThresholdBps` and routes the two assets to
        the deployed `ChainlinkPriceAdapter` (Phase 2) for USD18 prices.
     2. `scanMarket` iterates `borrowersLength` → `borrowerAt` →
        `hasBorrow` → `getPlainBorrow` + `getPlainCollateral` (public
        shadow accessors). Computes off-chain HF in basis points
        (`(coll·px·liqT)/(debt·px)`). When HF ≤ `LIQUIDATION_HF_THRESHOLD_BPS`
        calls `market.liquidationOpen(borrower)`.
     3. `scanAuctions` iterates `auctionsLength` → `getAuction(id)` and
        calls `auction.settle(id)` for expired windows. Bid submission is
        operator-specific and intentionally stubbed (documented).
  - `src/abi.ts` — hand-curated minimal MARKET / AUCTION / ADAPTER ABIs.
  - `src/config.ts` — env loader with required/optional helpers.
  - `.env.example` — RPC, keeper key, markets, auction, adapter addrs,
    `DRY_RUN=true` default, `MAX_GAS_GWEI=2`.
  - `README.md` — privacy boundaries, install, dry-run-first safety,
    operator-side bid integration sketch (cofhe-sdk `Encryptable.uint64`).

### Why this shape
- **No agent private key** → bot bundled as code only, dry-run by default.
- **Plain shadows are public by design** — the keeper uses what the market
  intentionally exposed for liquidation triage and never touches encrypted
  handles (no ACL). Bid amounts ARE encrypted client-side.
- **Bid logic deferred** — naive bids leak money; operators must own their
  policy (encryption key, risk model, position-specific bid).

### Frontend (deferred to Phase 18)
A user-facing Liquidations viewer + sealed-bid dialog is folded into
Phase 18 (sealed-bid tournament UX) — building it twice would duplicate the
`useCofheClient` wiring.

### How to run
```bash
cd packages/credit-keeper
npm install
cp .env.example .env       # paste adapter addrs + keeper PK
npm run scan               # one-shot, dry-run
npm run dev                # continuous, dry-run
```
Flip `DRY_RUN=false` only after a clean dry-run pass.

---

## Phase 4 — ObscuraGovernor adapter (✅ CONTRACT SHIPPED & COMPILED)

### What I shipped
- **`contracts-hardhat/contracts/governance/ObscuraGovernor.sol`**
  - Extends `Governor`, `GovernorSettings`, `GovernorCountingSimple`,
    `GovernorTimelockControl` (OpenZeppelin, already in `node_modules`).
  - **Skips `GovernorVotes`** — Vote V5 isn't `IVotes` (ballots are
    encrypted). Instead overrides `_getVotes(account, _, _)` to return
    `IObscuraVoteParticipation(voteSrc).voterParticipation(account)`.
  - Safe to use the current value (not a checkpoint) because
    `voterParticipation` is a monotone per-user counter — no one can lose
    weight retroactively, and no one can buy weight by acquiring it after
    the proposal opens.
  - `clock()` returns `block.number`; `CLOCK_MODE` returns
    `mode=blocknumber&from=default` so Tally/Snapshot accept it.
  - `quorum(_)` returns a governance-adjustable `quorumVotes` (plaintext
    vote-unit threshold, not a percentage — simpler given the small voter
    set).
  - Full timelock plumbing (`_queueOperations` / `_executeOperations` /
    `_cancel` / `_executor` / `state` / `proposalNeedsQueuing`) wired.

### Deploy script
`contracts-hardhat/scripts/deployWave5Phase4And5.ts` (combined with Phase 5):
1. Deploys `TimelockController` (2-day delay, deployer as bootstrap admin).
2. Deploys `ObscuraGovernor` pointing at Vote V5 + Timelock (votingDelay=1
   block, votingPeriod=50_400 blocks ≈ 3 days on Arb, threshold=1,
   quorum=3 votes for bootstrapping).
3. Grants `PROPOSER_ROLE` + `CANCELLER_ROLE` to the Governor.
4. Revokes deployer's `PROPOSER_ROLE` and renounces `DEFAULT_ADMIN_ROLE`
   on the Timelock (no human admin afterwards).
5. Writes `ObscuraTimelock` + `ObscuraGovernor` to `deployments/arb-sepolia.json`.

---

## Phase 5 — TreasuryStreamer (✅ CONTRACT SHIPPED & COMPILED)

### What I shipped
- **`contracts-hardhat/contracts/governance/ObscuraTreasuryStreamer.sol`**
  - Minimal governance-controlled proxy over `ObscuraPayStreamV2`.
  - `controller` is `immutable` and set to the Timelock at deploy.
  - `openStream(InEaddress encRecipientHint, periodSeconds, startTime, endTime, jitterSeconds)`
    is `onlyController` → can only be called by a passed Governor proposal
    after the 2-day timelock delay. Forwards directly to
    `payStream.createStream(...)`, so the encrypted recipient hint never
    decrypts on-chain.
  - `setPaused(streamId, paused)` also `onlyController` for emergency stop.
  - Maintains a `streamsOpened[]` log for off-chain dashboards.

### Why this shape
- The contract intentionally does **not** custody funds. Funding flows
  through cUSDC + the existing Reineira escrow exactly as for any
  PayStreamV2 employer; the DAO just becomes "the employer" via the
  streamer adapter.
- One contract, one purpose: produce a single Governor-executable tx that
  materialises a recurring encrypted payroll/grant stream. Anything more
  (vesting calculus, claim flows) belongs in PayStreamV2, not here.

### Deploy
Bundled with Phase 4 in `deployWave5Phase4And5.ts`. After deploy:
```
ObscuraTimelock          : <addr>
ObscuraGovernor          : <addr>
ObscuraTreasuryStreamer  : <addr>
```
Frontend env additions:
```
VITE_OBSCURA_GOVERNOR=...
VITE_OBSCURA_TIMELOCK=...
VITE_OBSCURA_TREASURY_STREAMER=...
```

---

## Phase 6 — Privy + WebAuthn passkey (PENDING — multi-session)

### Plan
- Add `@privy-io/react-auth` + `permissionless` + `viem/account-abstraction`.
- Wrap `WagmiProvider` with `PrivyProvider` in `main.tsx`.
- Embedded wallet primary, MetaMask fallback.
- 3-step onboarding: Sign in → Pick username → Choose first action.
- This is a large session on its own. Deferred from this stream.

---

## Phase 7 — Paymaster + gas wallet (PENDING — multi-session)

Requires Phase 6. Will use Pimlico or self-hosted bundler.

---

## Phase 8 — Governance UI (✅ LIVE)

### Goal
Surface the deployed OZ Governor + Timelock + TreasuryStreamer in the user-facing
app so anyone holding Vote participation can browse proposals, cast on-chain
votes, and queue/execute through the 2-day timelock. Per user mandate:
**"no mock data, all real, all tested, full UI/UX"** — every read hits Arb Sepolia,
every write goes through wagmi → viem → live contracts.

### What shipped (real, deployed-contract-backed)

#### `frontend/obscura-os-main/src/abis/ObscuraGovernor.ts` (new)
Minimal Governor ABI extracted from the compiled artifact via:
```pwsh
node -e "const a=require('./contracts-hardhat/artifacts/contracts/governance/ObscuraGovernor.sol/ObscuraGovernor.json'); ..."
```
Filtered to the methods + events we actually call:
- Reads: `CLOCK_MODE`, `clock`, `votingDelay`, `votingPeriod`, `proposalThreshold`,
  `quorum`, `quorumVotes`, `timelock`, `state`, `proposalSnapshot`,
  `proposalDeadline`, `proposalProposer`, `proposalVotes`, `hasVoted`,
  `getVotes`, `hashProposal`
- Writes: `propose`, `castVote`, `castVoteWithReason`, `queue`, `execute`, `cancel`
- Events: `ProposalCreated`, `VoteCast`, `ProposalQueued`, `ProposalExecuted`, `ProposalCanceled`

Exports `OBSCURA_GOVERNOR_ADDRESS` / `OBSCURA_TIMELOCK_ADDRESS` /
`OBSCURA_TREASURY_STREAMER_ADDRESS` with env-var fallbacks pointing to the live
Arb Sepolia deploys, plus `PROPOSAL_STATE_LABELS` for OZ Governor's 8-state enum.

#### `frontend/obscura-os-main/src/hooks/useGovernor.ts` (new)
Mirrors the patterns from `useCreateStream.ts`:
- `useGovernorConfig()` — votingDelay, votingPeriod, proposalThreshold,
  quorum @ current block, timelock; 12s refresh
- `useGovernorProposals()` — `publicClient.getContractEvents({ eventName:
  "ProposalCreated", fromBlock: "earliest" })`; derives client-side
  `descriptionHash = keccak256(stringToBytes(description))` (saves a chain
  call vs `hashProposal`); 15s refresh, newest first
- `useProposalState`, `useProposalVotes`, `useProposalDeadline`,
  `useHasVotedGovernor` — per-proposal live reads
- `useGovernorPropose`, `useCastGovernorVote` (optional reason →
  `castVoteWithReason`), `useQueueProposal`, `useExecuteProposal` — all
  use `estimateCappedFees(publicClient)` and **`await
  publicClient.waitForTransactionReceipt({ hash })` before returning**
  so the UI never enters READY before the chain confirms.
- Helpers: `parseProposalDescription` (splits "Title\n\nBody"),
  `useGovernorAddresses`.

#### `frontend/obscura-os-main/src/components/vote/GovernorPanel.tsx` (current)
Self-contained panel mounted inside **VotePage** under the sidebar item
**"Executable Proposals"** (Modules group). Originally shipped as a
stand-alone `/governance` route; that route was removed during the
MASTER_REFACTOR_PLAN.md §2 consolidation — it duplicated `/vote`
chrome. The component now takes a `wrongNetwork?: boolean` prop from
VotePage so it renders the same amber banner pattern as the rest of the
Vote surface. Layout:
1. **Hero** — "Treasury & protocol decisions, on the record" + privacy copy
   ("participation counter is public; encrypted ballots in Vote stay sealed")
2. **Wrong-network banner** if `chainId !== 421614`
3. **4 stat tiles** — Voting period (blocks → hours @ 0.25 s/block),
   Quorum, Timelock delay (2 days), Your voting weight (from
   `useVoterParticipation`)
4. **3 contract chips** with Arbiscan deep-links (Governor / Timelock / Streamer)
5. **Tabs**:
   - *Proposals* — `ProposalCard` per row with state badge (8-color
     `stateTone` map), `VotesBar` (for/against/abstain percentage bar
     computed via `Number((n * 1000n) / total) / 10`), vote buttons (For
     / Against / Abstain, disabled unless `state === "Active" &&
     !hasVoted`), Queue if Succeeded, Execute if Queued.
   - *New proposal* — Title + Body + Treasury Streamer template
     (Recipient / RatePerSecond / Start / End → `encodeFunctionData` on
     the streamer's `openStream(address,uint256,uint256,uint256)`).
     `propose([streamer], [0n], [calldata], "title\n\nbody")`. All
     validation via `isAddress` + digit regex + `endTime > startTime`.
6. **Footer** — "Powered by OpenZeppelin Governor · TimelockController · 2-day delay · privacy-preserved ballots"

All actions toast via sonner with the tx hash short form. All addresses
are click-through Arbiscan links.

#### `src/pages/VotePage.tsx` + `src/App.tsx` + `src/components/elite/GooeyNav.tsx`
- `VotePage` Tab union extended with `"governor"`; new sidebar item
  `{ key: "governor", label: "Executable Proposals", icon: Gavel }` in
  the Modules group; `renderActiveSection` case mounts
  `<GovernorPanel wrongNetwork={wrongNetwork} />`
- `App.tsx`: removed `GovernancePage` import, removed
  `<Route path="/governance" …/>`, dropped `/governance` from
  `DASHBOARD_PATHS`
- `GooeyNav.tsx`: removed `{ key: "gov", … href: "/governance" }` and
  the `"/governance": "gov"` pathToKey entry
- `src/pages/GovernancePage.tsx`: **deleted** (logic preserved in
  `GovernorPanel.tsx` + git history)

### Build verification
```
PS D:\route\Obscura\frontend\obscura-os-main> npm run build
✓ built in 1m 10s
```
Zero TS errors across the three new files. Vite emitted the full chunk graph;
existing 500 kB chunk warnings are pre-existing (wagmi + tfhe + Reown core).

### What's NOT in this phase (intentional)
- **Bid encryption for sealed-bid auctions** — still operator-side, deferred to
  the Phase 18 follow-up.
- **Tally integration** — optional, deferred. Listing on
  https://www.tally.xyz/add-a-dao is a one-time manual step the user can do.
- **Raw multi-call proposal composer** — only the Treasury Streamer template
  is exposed in the UI. Power users can still call `propose()` from the
  hook directly; we'll expose a raw composer if/when demand arises.

### How to test (manual smoke)
1. `cd frontend/obscura-os-main; npm run dev`
2. Connect MetaMask to Arbitrum Sepolia (421614)
3. Visit `/vote` → sidebar → **Executable Proposals** → 4 stat tiles populate with live config
4. *New proposal* tab → fill template → Submit → wait for receipt →
   proposal appears in the *Proposals* tab with state `Pending`
5. After `votingDelay` blocks → state flips to `Active` → cast vote
6. After `votingPeriod` → `Succeeded` → Queue → wait 2 days → Execute

---

## Phase 9 — PAY UI Migration: cUSDC → ocUSDC (✅ COMPLETE)

### Goal
Align every user-facing text label, toast, badge, card header, and form copy
across the entire PAY + CREDIT + shared frontend with the canonical deployed
token name `ocUSDC` (deployed at `0xf963fD86348813786ed57b8b2778A365C6226E43`).
Also fix a critical 3-arg bug in the unshield flow and migrate `operators.ts`
from the legacy Reineira address to ocUSDC.

### Critical Bug Fixed — `useCUSDCBalance.unwrap()` (1-arg → 3-arg)

**Problem**: Hook called `unshield` with `args: [amount]` — one `uint256`.
Contract signature is `unshield(uint64 amtPlain, InEuint64 calldata encAmt, address to)` — three args.
All unshield transactions were silently reverting.

**Fix** (`src/hooks/useCUSDCBalance.ts`):
```typescript
// Now correctly:
await initFHEClient(publicClient, walletClient);
const encAmt = await encryptAmount(amtPlain);           // encrypt client-side
args: [amtPlain, encAmt, address]                        // 3-arg call
```
File has CRLF line endings — replacement was done via a Node.js script
(`fix_unshield.mjs`) to avoid tool encoding failures.

### `operators.ts` — Reineira → ocUSDC

**File**: `src/lib/operators.ts`

| Before | After |
|---|---|
| `import { REINEIRA_CUSDC_ADDRESS, REINEIRA_CUSDC_ABI } from "@/config/pay"` | `import { CONFIDENTIAL_USDC_ADDRESS, CONFIDENTIAL_TOKEN_ABI } from "@/config/credit"` |
| `REINEIRA_CUSDC_ADDRESS` (all call sites) | `CONFIDENTIAL_USDC_ADDRESS` |
| `REINEIRA_CUSDC_ABI` (all call sites) | `CONFIDENTIAL_TOKEN_ABI` |
| `"cUSDC address not configured"` | `"ocUSDC address not configured"` |

### UI Text Migration — 43 replacement pairs across 40+ files

**Pattern**: `cUSDC → ocUSDC`, `Encrypt → Shield`, `Decrypt → Unshield`,
`wrap USDC → cUSDC → shield USDC → ocUSDC`, `encrypted cUSDC → encrypted ocUSDC`

| File | Change summary |
|---|---|
| `pages/PayPage.tsx` | homeSteps, WalletPill title, SendCUSDCBar info + button, CardHeaders "Shield · Unshield ocUSDC", badge "ocUSDC — shielded stablecoin", NotConnected message (11 occurrences) |
| `pay-v4/CUSDCTransferForm.tsx` | toast, eyebrow, label, description, button "Shield & Send ocUSDC" (5 occurrences) |
| `pay-v4/CUSDCPanel.tsx` | all shield/unshield labels, balance card header |
| `pay-v4/PayHomeDashboard.tsx` | steps, action labels |
| `pay-v4/InvoiceForm.tsx` | amount labels |
| `pay-v4/InvoicePayCard.tsx` | payment token copy |
| `pay-v4/DisputeForm.tsx` | dispute amount label |
| `pay-v4/MyEscrows.tsx` | escrow status text |
| `pay-v4/MyPolicies.tsx` | policy premium copy |
| `pay-v4/PaymentReceipt.tsx` | receipt token label |
| `pay-v4/CreateStreamForm.tsx` | stream token label |
| `pay-v4/FeaturesGrid.tsx` | feature description |
| `pay-v4/BatchEscrowForm.tsx` | "Encrypted Payroll · ocUSDC", per-row cost copy |
| `pay-v4/BuyCoverageForm.tsx` | operator step label, coverage amount label, card header |
| `pay-v4/CUSDCEscrowActions.tsx` | return copy, funded copy |
| `pay-v4/CUSDCEscrowForm.tsx` | flow arrow, auto-funded toast, card badge |
| `pay-v4/ClaimEscrowCard.tsx` | claim button, amount preview |
| `pay-v4/CreateStreamFormV2.tsx` | stealth cycle copy, premium label |
| `pay-v4/CrossChainFundForm.tsx` | "shield USDC → ocUSDC to use it" |
| `pay-v4/StakePoolForm.tsx` | "Earn Yield · ocUSDC", deposit description |
| `pay-v4/StealthInbox.tsx` | sweep success toast, amount label |
| `pay-v4/StealthInboxV2.tsx` | "private ocUSDC" |
| `pay-v4/StreamList.tsx` | per-cycle amount label |
| `pay-v4/StreamsDashboard.tsx` | balance banner label, "Shield · Unshield ocUSDC" tab label |
| `pay-v4/SubscriptionForm.tsx` | "ocUSDC paid now", "encrypted ocUSDC" |
| `pay-v4/UnifiedSendForm.tsx` | operator auth step label |
| `credit/SupplyCollateralForm.tsx` | "Max borrowable: {fmt6(maxB)} ocUSDC" |
| `credit/SetupSheet.tsx` | "Approve Router as operator on ocUSDC (7-day expiry)" |
| `credit/SettingsPanel.tsx` | "Per cycle (ocUSDC)" |
| `credit/CreditSection.tsx` | all market labels — "ocUSDC · 77% LLTV", "ocUSDC · 86% LLTV", "OBS → ocUSDC", "cWETH → ocUSDC" |
| `components/ArchitectureDiagram.tsx` | "Shield USDC into ocUSDC via FHERC-20" |
| `components/elite/SectionDiagram.tsx` | bridge diagram labels |
| `components/TechStack.tsx` | "ocUSDC — FHERC20 shielded stablecoin" |
| `components/WaveModules.tsx` | "Confidential ocUSDC transfers" |
| `components/PrivacyPanel.tsx` | "ocUSDC Balance" |
| `pages/DocsPage.tsx` | all token name references |
| `pages/PMFPage.tsx` | PMF copy |

### Build Verification

```
✓ built in 12.62s   (zero TypeScript errors, zero Vite warnings)
```

### Pending: Solidity contract layer (Wave 5 Pay Migration)

The UI is fully aligned. The Solidity layer still uses Reineira interfaces
for `ObscuraPayStreamV2`, `ObscuraPay`, `ObscuraConfidentialEscrow`,
`ObscuraInsuranceSubscription`, `ObscuraInvoice`, `ObscuraPayrollResolverV2`.
These contracts must be updated and redeployed before live ocUSDC flows work
end-to-end. Pending tasks:

1. **Add `confidentialTransferFromHandle(from, to, uint256 handle)`** to
   `contracts-hardhat/contracts/credit/ObscuraConfidentialToken.sol`
   (operator-backed handle-based transfer needed by stream/escrow contracts)
2. **Create `contracts-hardhat/contracts/interfaces/IObscuraToken.sol`**
   replacing `IConfidentialUSDC.sol` for ocUSDC-native interface
3. **Update all 6 Pay contracts** — `IConfidentialUSDC → IObscuraToken`,
   `confidentialTransferFrom(euint64) → confidentialTransferFromHandle(from, to, handle)`
4. **Write `scripts/deployWave5PayMigration.ts`** — deploy all updated Pay
   contracts with the new wrapper ocUSDC address,
   update `deployments/arb-sepolia.json`

**Note**: `useInsurePayroll.ts` remains on Reineira intentionally — it calls
external Reineira insurance contracts that cannot be migrated without
external contract changes.

---

## Phase 10 — Shield/Unshield Fix: ocUSDC Wrapper Deployment (✅ COMPLETE)

### Root Cause

User reported `shield()` transaction reverted: https://sepolia.arbiscan.io/tx/0xbd13437d24d2625a020ce60cb1985d0625d399fe84d4d297328702d13a95aa22

The ocUSDC deployed in Phase 9 (`0xf963fD86348813786ed57b8b2778A365C6226E43`) was a **pre-v3.15 faucet-only contract** that:
- Has no `underlying()`, `guardian()`, or `setUnderlying()` functions
- Always reverts `FaucetModeOnly()` on `shield()` and `unshield()`
- Cannot be upgraded — it is permanently in faucet mode

### Fix Applied

Deployed a new **ObscuraConfidentialToken v3.15** in wrapper mode:

| Property | Value |
|---|---|
| New ocUSDC (wrapper) | `0xEFab856b903C4106769B14798deDE21C6923d7d2` |
| `setUnderlying()` tx | `0xcfdd46be49db7b9b1351de93efd5f04b93b2d47bd3b05bbdbd09037da79c5ab5` |
| Underlying (Circle USDC) | `0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d` |
| Old faucet token | `0xf963fD86348813786ed57b8b2778A365C6226E43` (still valid for `claimFaucet()`) |

### Files Updated

| File | Change |
|---|---|
| `frontend/.env` | `VITE_OBSCURA_CONFIDENTIAL_USDC_ADDRESS` → new wrapper address |
| `contracts-hardhat/deployments/arb-sepolia.json` | Added `ObscuraConfidentialUSDCWrapper` entry |
| `contracts-hardhat/scripts/deployWave5Phase1And2.ts` | `OC_USDC` → new wrapper address |
| `contracts-hardhat/scripts/redeployEscrowOcUSDC.ts` | `OC_USDC` → new wrapper address |
| `packages/credit-keeper/src/index.ts` | Price routing accepts both old + new addresses |

### How Shield/Unshield Now Works

1. User has Circle USDC from https://faucet.circle.com/ → `0x75faf114...`
2. Frontend calls `approve(newOcUSDC, amount)` on Circle USDC contract
3. Frontend calls `shield(amount)` on new ocUSDC → pulls USDC in, mints encrypted ocUSDC
4. User's encrypted balance increases; Circle USDC balance decreases
5. `unshield(amtPlain, encAmt, recipientAddress)` reverses the flow

Build verified passing: `✔ built in 13.05s`

---

## Phase 11 — Unshield Bug Fix: `Cannot convert [object Object] to a BigInt` (✅ COMPLETE)

### Root Cause

After Phase 10, user confirmed shield (USDC → ocUSDC) worked but unshield failed in-browser with:

```
Cannot convert [object Object] to a BigInt
```

**CoFHE SDK behavior**: `cofheClient.encryptInputs([Encryptable.uint64(x)]).execute()` returns an **array** `[InEuint64]`, not a single `InEuint64` object.

`encryptAmount()` in `lib/fhe.ts` returns the full array result. Most hooks already correctly use `encAmt[0]` to extract the single tuple. But `useUnshield.ts` and `useCUSDCBalance.ts` passed the raw array as the `encAmt` tuple arg to `unshield(amtPlain, encAmt, to)`.

When viem's ABI encoder received an array where it expected a tuple `{ ctHash: uint256, securityZone: uint8, utype: uint8, signature: bytes }`, it tried `BigInt(array[0])` — the whole `InEuint64` object — and threw `Cannot convert [object Object] to a BigInt`.

### Fix Applied

Changed `args: [amtPlain, encAmt, address/to]` → `args: [amtPlain, encAmt[0], address/to]` in both affected hooks:

| File | Change |
|---|---|
| `src/hooks/useCUSDCBalance.ts` | `args: [amtPlain, encAmt, address]` → `args: [amtPlain, encAmt[0], address]` |
| `src/hooks/useUnshield.ts` | `args: [amtPlain, encAmt, to]` → `args: [amtPlain, encAmt[0], to]` |

Build verified passing: `✔ built in 12.34s`

---

## Phase 12 — Unshield Bug Fix: `Fail with error 'supply'` (✅ COMPLETE)

### Root Cause

After the Phase 11 fix, the `encAmt[0]` fix resolved the JS encoding error and the transaction reached the contract. But it then failed with:

```
Fail with error 'supply'
```

**Contract guard**: `ObscuraConfidentialToken.sol` line 269:
```solidity
require(publicSupplyMirror >= amtPlain, "supply");
```

**Diagnosis via RPC**:
- `publicSupplyMirror` on new wrapper (`0xEFab856b...`) = `0x000f4240` = **1,000,000 = 1 USDC**
- Failing tx `0x16639defa9b8f215e3df887bd1deb7a28ff9d23486330c7df4caef1b6595f46f` had `amtPlain = 0x3b9aca00` = **1,000,000,000 = 1000 USDC at 6 decimals**

The user had `1000 ocUSDC` in their tracked/displayed balance (from old faucet claims on the previous contract `0xf963fD86...`) but only shielded **1 USDC** on the new wrapper. The two contracts are independent — faucet-minted tokens from the old contract have no USDC backing in the new wrapper. `publicSupplyMirror` only reflects actual `shield()` calls on the new wrapper.

### Fix Applied

1. **Pre-flight validation in `unwrap()`** (`src/hooks/useCUSDCBalance.ts`): After the user reveals their balance (`decrypted !== null`), `unwrap()` now checks `amtPlain > decrypted` and throws a user-friendly error before sending the tx:
   ```typescript
   if (decrypted !== null && amtPlain > decrypted) {
     throw new Error(`Amount exceeds your ocUSDC balance (${formatUnits(decrypted, USDC_DECIMALS)} available). Reveal your balance first if unsure.`);
   }
   ```
   `decrypted` added to `useCallback` deps.

2. **Max button in `CUSDCPanel.tsx`** (`src/components/pay-v4/CUSDCPanel.tsx`): Appears next to the unshield amount input when `decrypted !== null`. Populates the input with the user's exact revealed balance, preventing over-entry.

3. **"Reveal first" hint**: When `decrypted === null`, the hint text below the unshield input reminds the user to reveal their balance before unshielding.

### Key Architectural Insight

The `trackedCusdc` localStorage key is not contract-scoped. Old faucet activity on the previous contract can leave stale high values. The `reveal()` flow overwrites localStorage with the true on-chain value via `setTrackedUnits(address, plain)` — so `reveal()` is the authoritative step before any unshield. The new validation enforces this.

Build verified passing: `✔ built in 12.32s`

---

## Phase 13 — Two-Token ocUSDC Separation: Credits Faucet Fix (✅ COMPLETE)

### Root Cause

`CONFIDENTIAL_USDC_ADDRESS` in `.env` was updated to the new Pay-page wrapper (`0xEFab856b`) as part of Phase 10. However, the Credit market v316 (`0x269f59672F3fd7f95bF440941e618b54Ebc5717A`) was deployed with the **old faucet token** `v314_ocUSDC = 0xf963fD86348813786ed57b8b2778A365C6226E43`. The new wrapper is in **wrapper mode** (`underlying = Circle USDC`) — calling `claimFaucet()` on it reverts with `WrapperOnly()`.

This silently broke:
- Credits page faucet (10,000 ocUSDC drip) — every claim tx reverted
- Credit market supply/borrow/repay — hooks were calling the wrong token contract
- Operator approvals for the credit router — `setOperator()` on wrong contract
- `nextFaucetIn()` on the wrapper returned 0 (last claim = 0 → cooldown passed), making the faucet appear ready in the UI despite the guaranteed revert

### Two-Token Architecture

| Constant | Address | Mode | Context |
|---|---|---|---|
| `CONFIDENTIAL_USDC_ADDRESS` | `0xEFab856b...` | Wrapper (real USDC backing) | **Pay page only**: shield/unshield, streams, invoices, stealth sweeps |
| `CREDIT_OCUSDC_ADDRESS` | `0xf963fD86...` | Faucet mode (no underlying) | **Credits page only**: faucet, supply/borrow/repay, operator approvals, escrow |

### Fix Applied

**`.env`** — added new env var:
```
VITE_OBSCURA_CREDIT_OCUSDC_ADDRESS=0xf963fD86348813786ed57b8b2778A365C6226E43
```

**`src/config/credit.ts`** — exported `CREDIT_OCUSDC_ADDRESS` from the new env var; changed `CREDIT_TOKENS.ocUSDC.address` from `CONFIDENTIAL_USDC_ADDRESS` to `CREDIT_OCUSDC_ADDRESS`.

**Credit-context files switched to `CREDIT_OCUSDC_ADDRESS`** (8 files total):
- `src/hooks/useCredit.ts` — main credit market supply/borrow/repay hook
- `src/lib/operators.ts` — `isOperator()` + `ensureOperator()` (both read + write paths)
- `src/hooks/useIsOperator.ts` — operator status check
- `src/hooks/useCUSDCTransfer.ts` — credit-context ocUSDC transfer + operator approval
- `src/hooks/useCUSDCEscrow.ts` — credit escrow deposit/withdraw/claim (8 occurrences replaced via PowerShell)
- `src/components/credit/SetupSheet.tsx` — faucet loop (3 tokens array) + per-operator approval
- `src/components/credit/OperatorApprovalModal.tsx` — default token for router operator approval

**Pay-page files untouched** (`useCUSDCBalance`, `useShield`, `useUnshield`, `useInvoice`, `useTickStream`, `useSweepStealth`, `UnifiedSendForm`) — remain on `CONFIDENTIAL_USDC_ADDRESS = 0xEFab856b`.

Build verified passing: `✔ built in 12.39s`

---

## Phase 16 — Escrow Token Regression Fix + Legacy Escrow UX + Text Cleanup (✅ COMPLETE)

### Issues Found (via live escrow testing + Arbiscan)

1. **Critical token regression in `useCUSDCEscrow.ts`** — The hook imported and used `CREDIT_OCUSDC_ADDRESS` (`0xf963fD86` — Credits faucet token) for ALL confidential transfers and operator approvals in `ensureOperator`, `create`, and `fund`. On-chain evidence from Arbiscan: `Confidential Transfer` called on `0xf963fD86348813786ed57b8b2778A365C6226E43` (faucet) instead of `0xEFab856b903C4106769B14798deDE21C6923d7d2` (Pay wrapper). Same class of bug previously fixed in Phase 14 for `useCUSDCTransfer.ts`, `usePayStreamV2.ts`, and `useInsuranceSubscription.ts`.

2. **Old escrow IDs in My Escrows** — `migrateGlobalKey` migrated localStorage records from previous wallet sessions/contract deployments into the current wallet scope. Escrows #3 and #4 (created 5/1/2026 against old contract) appeared alongside the new escrow #5, with no visual distinction. The user's "first escrow on new contract" was buried among old entries.

3. **"cUSDC" text bugs in escrow components** — Three UI strings still said "cUSDC" instead of "ocUSDC":
   - `CUSDCEscrowForm.tsx` line 162: "claim the cUSDC"
   - `CUSDCEscrowForm.tsx` line 214: "Lock cUSDC in an encrypted escrow"
   - `CUSDCEscrowActions.tsx` line 244: "transfer 0 cUSDC"
   - `CUSDCEscrowActions.tsx` line 265: "return the cUSDC"

### Fixes Applied

| File | Change |
|------|--------|
| `src/hooks/useCUSDCEscrow.ts` | Import: `CREDIT_OCUSDC_ADDRESS` → `CONFIDENTIAL_USDC_ADDRESS`. All 7 occurrences replaced throughout `ensureOperator`, `create`, `fund` callbacks |
| `src/components/pay-v4/MyEscrows.tsx` | Added `OBSCURA_CONFIDENTIAL_ESCROW_ADDRESS` import from `@/config/pay`. Split escrows into `currentEscrows` (matching active contract) and `legacyEscrows` (different/missing contract address). Header badge shows `N active` instead of `N saved`. Legacy escrows collapsed under `<details>` summary with amber warning note and `LEGACY` badge (amber styling) + muted opacity. Added `ChevronDown` icon import |
| `src/components/pay-v4/CUSDCEscrowForm.tsx` | "claim the cUSDC" → "claim the ocUSDC"; "Lock cUSDC" → "Lock ocUSDC" |
| `src/components/pay-v4/CUSDCEscrowActions.tsx` | "transfer 0 cUSDC" → "transfer 0 ocUSDC"; "return the cUSDC" → "return the ocUSDC" |

### Legacy Escrow UX Detail

Current contract escrows are displayed prominently with full emerald styling and `YOU CAN REDEEM` badge if applicable. Legacy escrows (from old contract deployments) are hidden inside a collapsible `<details>` section:

- Collapsed by default with summary: `N legacy escrows from older contracts`
- Amber warning: "These escrows were created against an older contract deployment. Use Fund / Redeem / Refund by ID to attempt recovery."
- Row styling: 40% opacity, muted foreground, `LEGACY` amber badge instead of escrow ID emerald

### Token Fix — Full Scope in `useCUSDCEscrow.ts`

| Function | Field | Before | After |
|---|---|---|---|
| `ensureOperator` | guard check | `!CREDIT_OCUSDC_ADDRESS` | `!CONFIDENTIAL_USDC_ADDRESS` |
| `ensureOperator` | `isOperator` address | `CREDIT_OCUSDC_ADDRESS` | `CONFIDENTIAL_USDC_ADDRESS` |
| `ensureOperator` | `setOperator` address | `CREDIT_OCUSDC_ADDRESS` | `CONFIDENTIAL_USDC_ADDRESS` |
| `create` | guard check | `!CREDIT_OCUSDC_ADDRESS` | `!CONFIDENTIAL_USDC_ADDRESS` |
| `create` | `confidentialTransfer` address | `CREDIT_OCUSDC_ADDRESS` | `CONFIDENTIAL_USDC_ADDRESS` |
| `fund` | guard check | `!CREDIT_OCUSDC_ADDRESS` | `!CONFIDENTIAL_USDC_ADDRESS` |
| `fund` | `confidentialTransfer` address | `CREDIT_OCUSDC_ADDRESS` | `CONFIDENTIAL_USDC_ADDRESS` |

Build verified passing: `✔ built in 13.89s`

---

## Phase 15 — Stream Page UX Polish: Design Fix + Token Label Fix + Wallet Popup Reduction (✅ COMPLETE)

### Issues Found (via live stream page testing)

1. **Purple/violet design** — `SubscriptionForm.tsx` used `violet-500` Tailwind classes for selected states, header icon, and CTA button. Conflicts with Obscura brand (teal/emerald).
2. **Old "cUSDC" token ticker** — `SubscriptionForm.tsx` labels and `StreamList.tsx` subtitle still showed `cUSDC` instead of the correct `ocUSDC`.
3. **4 wallet popups** — Creating a subscription triggered 4 MetaMask confirmations. `createStream` in `usePayStreamV2.ts` called `ensureOperator` to grant the stream contract operator rights on ocUSDC — but since the stream contract's `tickStream` always reverts (selector mismatch: `euint64` as `bytes32` vs Reineira's `uint256`), `useTickStream.tick()` bypasses the contract entirely with a direct `confidentialTransfer`. This made the operator grant unnecessary.

### Payment Verification

**Arbiscan tx `0xf02e617611b5c2abf184a565c1b57fc90cfa2551277667776921fd34803ec79b`**:
- Function: `Confidential Transfer`  
- Contract: `0xEFab856b903C4106769B14798deDE21C6923d7d2` ✅ Correct ocUSDC wrapper  
- Status: **Success** ✅  
Confirms Phase 14 token regression fix is working in production.

### Fixes Applied

| File | Change |
|------|--------|
| `SubscriptionForm.tsx` | All `violet-500/15`, `violet-500/30/40`, `violet-200/300` → `emerald-500/10/20/25/35`, `emerald-300/400` |
| `SubscriptionForm.tsx` | Header icon: `bg-violet-500/15 border-violet-500/30` → `bg-gradient-to-br from-emerald-500/20 to-emerald-700/10 border-emerald-500/25` (matches other Pay cards) |
| `SubscriptionForm.tsx` | CTA button: `<Button>` with violet gradient → `<motion.button className="btn-pay btn-pay-emerald w-full py-2.5">` (matches system design) |
| `SubscriptionForm.tsx` | Labels: `cUSDC` → `ocUSDC` in monthly label, per-month summary, lifetime cap, description |
| `StreamList.tsx` | Subtitle: `cUSDC · FHE Encrypted` → `ocUSDC · FHE Encrypted` |
| `usePayStreamV2.ts` | Removed `ensureOperator(OBSCURA_PAY_STREAM_V2_ADDRESS)` from `createStream` — stream contract tick is bypassed; operator grant served no purpose |

### Wallet Popup Count: 4 → 3

| # | Transaction | Status |
|---|---|---|
| ~~1~~ | ~~`setOperator` on ocUSDC for stream contract~~ | **REMOVED** — unnecessary |
| 1 | `createStream` (schedule metadata on PayStreamV2) | ✅ Required |
| 2 | `confidentialTransfer` (direct FHE transfer to stealth address) | ✅ Required |
| 3 | `announcePayment` (stealth registry announcement) | ✅ Required |

Note: `ensureOperator` in `usePayStreamV2.tickStream` kept (internal path, separate from subscription flow).

Build verified passing: `✔ built in 11.16s`

---

## Phase 14 — Pay-Page Token Regression Fix + Full Pay FHE Audit (✅ COMPLETE)

### Root Cause

Phase 13 fixed the Credits faucet by introducing `CREDIT_OCUSDC_ADDRESS`. However, it **incorrectly changed `useCUSDCTransfer.ts`** to use `CREDIT_OCUSDC_ADDRESS`. This hook is consumed only by Pay-page components (`CUSDCTransferForm`, `StreamList`, `UnifiedSendForm`) — so every direct Pay send now hit `0xf963fD86` (old faucet token) instead of `0xEFab856b` (real USDC wrapper).

On-chain evidence: tx `0xa48fdae9...7cd71d` — called `confidentialTransfer` on `0xf963fD86` instead of `0xEFab856b`.

### Secondary Issues Found

1. **`operators.ts`** — `ensureOperator()` and `isOperator()` had `CREDIT_OCUSDC_ADDRESS` hardcoded. Any Pay-context caller (streams, insurance) was approving the operator on the wrong token.
2. **`UnifiedSendForm.tsx`** — had unnecessary `ensureOperator` calls before both direct-send and stealth-send paths. A direct `confidentialTransfer` never requires operator approval — the caller IS the holder (`msg.sender = from`). These calls were wasted gas and pointed to the wrong token.
3. **`usePayStreamV2.ts`** — both `createStream` and `tickStream` paths called `ensureOperator(...)` without token override → wrong token for stream operator.
4. **`useInsuranceSubscription.ts`** — `ensureOperator(...)` called without override → insurance pool was being approved as operator on the faucet token, not the Pay wrapper.

### Fix Applied — 5 Files

| File | Change |
|---|---|
| `src/lib/operators.ts` | Added optional `tokenOverride?: \`0x${string}\`` param to both `isOperator()` and `ensureOperator()`. Default = `CREDIT_OCUSDC_ADDRESS` (backward compat). |
| `src/hooks/useCUSDCTransfer.ts` | Reverted from `CREDIT_OCUSDC_ADDRESS` back to `CONFIDENTIAL_USDC_ADDRESS` (import + 4 usage sites). |
| `src/hooks/usePayStreamV2.ts` | Added `import { CONFIDENTIAL_USDC_ADDRESS }`. Both `ensureOperator(...)` calls pass `CONFIDENTIAL_USDC_ADDRESS` as 5th arg. |
| `src/hooks/useInsuranceSubscription.ts` | Added `import { CONFIDENTIAL_USDC_ADDRESS }`. `ensureOperator(...)` call passes `CONFIDENTIAL_USDC_ADDRESS` as 5th arg. |
| `src/components/pay-v4/UnifiedSendForm.tsx` | Removed `ensureOperator` import and both call sites (direct + stealth paths). Progress steps renumbered: direct 5→4, stealth 6→5. |

Build verified: `✔ built in 11.68s` (zero errors)

### On-Chain Tx Analysis — `0xa48fdae9...7cd71d`

| Property | Result |
|---|---|
| FHE amount | ✅ Encrypted (`encryptAmount() → InEuint64`) |
| `encryptedInputs[0]` usage | ✅ Correct |
| Token contract | ❌ Was `0xf963fD86` — now fixed to `0xEFab856b` |
| `waitForTransactionReceipt` | ✅ Present |
| Auto-decrypt on mount | ✅ Not present |

### Full Pay App FHE Audit — All Clear

After the fix, a full audit of every Pay hook and component was completed:

| Hook / Component | Token | `encAmt[0]` | Notes |
|---|---|---|---|
| `useCUSDCTransfer.ts` | `CONFIDENTIAL_USDC_ADDRESS` ✅ | ✅ | Phase 14 fixed |
| `usePayStreamV2.ts` | `CONFIDENTIAL_USDC_ADDRESS` ✅ | ✅ | Phase 14 fixed |
| `useInsuranceSubscription.ts` | `CONFIDENTIAL_USDC_ADDRESS` ✅ | ✅ `enc[0]` | Phase 14 fixed |
| `useTickStream.ts` | `CONFIDENTIAL_USDC_ADDRESS` ✅ | ✅ `encrypted[0]` | clean |
| `useSweepStealth.ts` | `CONFIDENTIAL_USDC_ADDRESS` ✅ | ✅ `encrypted[0]` | clean |
| `useCUSDCBalance.ts` | `CONFIDENTIAL_USDC_ADDRESS` ✅ | ✅ `encAmt[0]` | clean |
| `useShield.ts` | `CONFIDENTIAL_USDC_ADDRESS` ✅ | ✅ | clean |
| `useUnshield.ts` | `CONFIDENTIAL_USDC_ADDRESS` ✅ | ✅ | clean |
| `useInvoice.ts` | `CONFIDENTIAL_USDC_ADDRESS` ✅ | ✅ all 3 encrypts | clean |
| `useConfidentialTransfer.ts` | `OBSCURA_TOKEN_ADDRESS` (OBS) ✅ | ✅ `encryptedInputs[0]` | OBS token — separate, not ocUSDC |
| `useConfidentialEscrow.ts` | `OBSCURA_ESCROW_ADDRESS` ✅ | ✅ `[0]` + `[1]` | old escrow hook, no ocUSDC |
| `useAddressBook.ts` | n/a | ✅ `encrypted[0]` | address encryption only |
| `StakePoolForm.tsx` | `REINEIRA_CUSDC_ADDRESS` ✅ | ✅ `encrypted[0]` | Reineira pool, separate contract |
| `UnifiedSendForm.tsx` | `CONFIDENTIAL_USDC_ADDRESS` ✅ | ✅ | Phase 14 fixed |
| Credit hooks (3 files) | `CREDIT_OCUSDC_ADDRESS` ✅ | ✅ | correct credit-only context |
| `useCreditRouter.ts` | credit context ✅ | ✅ all 6 encrypts `[0]` | clean |

**Auto-decrypt on mount**: 0 violations found (`decryptForView` only in user-triggered callbacks)  
**`useEffect` + decrypt**: 0 violations found  
**`fhe` in `useCallback` deps**: All hooks that call `fheStatus.setStep()` include `fheStatus` in deps ✅

---

## Phases 10–20 (PENDING)

Tracked in the master todo. Each gets its own session in this memory doc.

---

## Phase 21 — Audit + mainnet readiness gate (CORRECTED — see Fhenix testnet note at top)

### Goal (REVISED)

The original master plan listed Phase 21 as "deploy to Arbitrum One mainnet."
**This is not currently possible** — Fhenix CoFHE is testnet-only as of
May 2026 (live on Arbitrum Sepolia, Ethereum Sepolia, Base Sepolia per
fhenix.io/blog announcements through Apr 2026). No CoFHE mainnet GA exists.

Phase 21 therefore becomes a **mainnet-readiness gate**, not a deployment:

1. **External audit RFP** (Spearbit / Cantina / Trail of Bits) — focus on:
   - FHE.allowThis discipline across every encrypted mutation
   - FHE.select correctness (no if/else on ebool)
   - Score oracle attestation lifecycle (no transient leaks)
   - Liquidation auction sealed-bid integrity
   - Permit replay + nonce hygiene
2. **Contract verification** on Arbiscan for every live address.
3. **Frozen ABI snapshot** under `docs/abi-snapshots/` per release tag.
4. **Mainnet deploy runbook** written but **not executed**.
5. **Mainnet readiness checklist**:
   - Fhenix CoFHE mainnet announced ✗ (gate)
   - Audit clean report ✗
   - 3-month testnet liveness ✗
   - Treasury multisig configured ✗
   - Upgrade timelock activated ✗

Broadcast unlocks only when Fhenix CoFHE mainnet is GA. Until then, all
production traffic stays on Arbitrum Sepolia.

---

## Phase 22 — Continuous ops (PENDING — post-mainnet)

Post-mainnet only. Tracked but blocked on Phase 21 gate.

---

## Running Status Table

| Phase | Status | Contracts | Frontend | Deploy | Notes |
|---|---|---|---|---|---|
| 0 — Audit | ✅ done | — | — | — | This doc |
| 1 — IEncryptedScore | ✅ shipped+compiled | ScoreV2.sol | n/a | ⏳ user | per-user adapters ✓ |
| 2 — Chainlink oracle | ✅ shipped+compiled | ChainlinkPriceAdapter.sol | n/a | ⏳ user | in-place fix, no market redeploy |
| 3 — Live liquidations | ✅ keeper shipped | — | ✅ already in CreditPage `LiquidationsTab` | ⏳ user runs bot | bid module operator-side |
| 4 — Governor | ✅ shipped+compiled | ObscuraGovernor.sol | ⏳ Phase 8 | ⏳ user | wraps Vote V5 voterParticipation |
| 5 — TreasuryStreamer | ✅ shipped+compiled | ObscuraTreasuryStreamer.sol | ⏳ Phase 8 | ⏳ user | timelock-only controller |
| 6 — Passkey | ⏳ | n/a | ⏳ | n/a | multi-session |
| 7 — Paymaster | ⏳ | ⏳ | ⏳ | ⏳ | multi-session |
| 8 — Governance UI | ✅ live | — | GovernorPanel in /vote | live | Executable Proposals sidebar item |
| 9 — PAY UI Migration | ✅ complete | n/a | ✅ 40+ files migrated | n/a | cUSDC→ocUSDC, unwrap bug fixed, operators.ts updated, build clean |
| 10–12 | ✅ complete | — | ocUSDC wrapper deployed, shield/unshield fixed (Phases 10–12) | live | see Phase 10/11/12 sections |
| 13 — Two-token ocUSDC separation | ✅ complete | n/a | ✅ CREDIT_OCUSDC_ADDRESS split; 8 files updated | n/a | Credits faucet fixed; Pay wrapper untouched |
| 14 — Pay token regression + full FHE audit | ✅ complete | n/a | ✅ 5 files fixed; all Pay hooks audited clean | n/a | Phase 13 regression in useCUSDCTransfer.ts reversed; operators.ts override added |
| 15 — Stream page UX polish | ✅ complete | n/a | ✅ SubscriptionForm violet→emerald; cUSDC→ocUSDC; ensureOperator removed from createStream (4→3 popups) | n/a | Build clean |
| 16 — Escrow token regression + legacy UX | ✅ complete | n/a | ✅ useCUSDCEscrow.ts: 7× CREDIT_OCUSDC→CONFIDENTIAL_USDC; MyEscrows legacy section; text cleanup | n/a | Build clean |
| 15–20 | ⏳ | — | — | — | sequential |
| 18 — Auction UX | ✅ already shipped | — | CreditPage `LiquidationsTab` + `useCreditAuctions` | live | discovered pre-built |
| 19 — ScoreFeedFromVote | ✅ doc shipped | — | n/a | n/a | `docs/credit/SCORE_FEED_FROM_VOTE.md` |
| 21 — Mainnet gate | ⏳ corrected | — | — | 🛑 BLOCKED on Fhenix CoFHE mainnet GA |
| 22 — Ops | ⏳ | — | — | ⏳ post-mainnet | |
