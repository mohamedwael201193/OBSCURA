# Credit Wave 5 - P0 Canonical Asset Migration

## Completed

- Deployed canonical Pay-backed Credit market on Arbitrum Sepolia: `0x1Ec113297c7F9516A6604aa3b18C180559a6f551`.
- Canonical market uses Pay `ocUSDC_Pay` as both loan asset and collateral asset: `0xEd46020Df8abe7BB1E096f27d089F4326D223a53`.
- Risk params: `lltvBps=8600`, `liqBonusBps=500`, `liqThresholdBps=9000`.
- Wired market to Credit Router `0x46275A34e26C9dBb46fB1716852a5D221564a43F`, Auction `0x205FfC0A3b8207B645c1a6B1b4805eb3FfC828F0`, Score V2 `0xe5B0c6c06C0B1fd7d7CD5D2e93997693863d3D4D`.
- Set oracle public feed for Pay `ocUSDC_Pay` to USDC adapter `0xc65e85926Cb29aaEC74f99cF1591CBa65daa2c4A`.
- Authorized canonical market in Score V2.
- Persisted deployment keys in `contracts-hardhat/deployments/arb-sepolia.json`:
	- `CreditCanonicalPayOcUSDCMarket`
	- `v5_CanonicalPayOcUSDCMarket`
	- `wave5CreditCanonicalAsset`

## Frontend

- Added canonical Credit envs:
	- `VITE_OBSCURA_CREDIT_MARKET_CANONICAL_ADDRESS=0x1Ec113297c7F9516A6604aa3b18C180559a6f551`
	- `VITE_OBSCURA_CREDIT_CANONICAL_OCUSDC_ADDRESS=0xEd46020Df8abe7BB1E096f27d089F4326D223a53`
- `src/config/credit.ts` now makes `Private USDC Credit Line` the first/default configured market and marks old faucet markets as legacy/testnet.
- Credit hooks now resolve `loanAsset` and `collateralAsset` from the selected market instead of using global faucet `ocUSDC`.
- Removed credit score auto-decrypt on mount; score reveal is now user-triggered.
- Sealed auction bid flow now waits for transaction receipt before setting READY.
- Setup UX now points canonical users to Pay shielding instead of faucet-first onboarding.
- Legacy faucet/hook settings remain available but are demoted and labeled testnet/legacy.

## Worker / API / Supabase

- Reused existing Supabase tables; no duplicate tables or new infrastructure added.
- Worker indexer now watches Credit market, vault, auction, and score events through the existing `obscura_activity` path.
- Indexed Credit events are amount-free where contract events are amount-free; vault events with public plaintext amount fields are intentionally not indexed.
- Worker reputation derivation now inserts `source_app='credit'` signals for Credit supply, borrow, repay, collateral, liquidation, vault, auction, and score events.
- API reputation summary now aggregates both Pay and Credit reputation events.
- Worker/API notifications route Credit activity to `/credit`; notification bodies remain generic and amount-free.
- Keeper USDC pricing recognizes Pay `ocUSDC_Pay` for canonical market health checks.

## Env / Deployment Config

- `backend/obscura-worker/.env`, `.env.example`, and `render.yaml` include canonical market first in `KEEPER_MARKETS`.
- Added `CREDIT_INDEXER_MARKETS`, `CREDIT_INDEXER_VAULTS`, `CREDIT_INDEXER_AUCTIONS`, and `CREDIT_INDEXER_SCORES` to worker envs/render config.
- `KEEPER_ENABLED` remains `false`; keeper remains opt-in/dry-run unless intentionally enabled.
- Vercel production must receive the new frontend `VITE_OBSCURA_CREDIT_*` env values before production deploy if not sourced from the committed env file.

## Verification

- `npm run compile` in `contracts-hardhat`: passed.
- `npx hardhat run scripts/deployCreditCanonicalPayOcUSDC.ts --network arb-sepolia`: deployed and wired canonical market successfully.
- `npx hardhat test test/ObscuraCredit.test.ts`: passed, 19 passing.
- `npm run build` in `frontend/obscura-os-main`: passed.
- `npm run build` in `backend/obscura-worker`: passed.
- `npm run build` in `backend/obscura-api`: passed.
- VS Code diagnostics on edited frontend/worker/API files: no errors.

## Notes / Remaining Manual Checks

- Manual wallet flow still needed on deployed frontend: shield USDC in Pay, approve Credit Router on Pay `ocUSDC_Pay`, supply, add collateral, borrow, repay.
- Confirm Render worker deploy picks up `render.yaml` env changes and indexes the canonical market.
- Confirm Vercel has the canonical market/token envs before production frontend deploy.
- Existing old markets remain available for repay/withdraw/testnet flows; do not remove until legacy close-out is complete.

---

# Credit Wave 5 - C2/C3/C4 Execution

## Completed

- C2 confirmed complete from existing deployment/config; no new contracts were deployed.
- Canonical Pay-backed Credit market remains `0x1Ec113297c7F9516A6604aa3b18C180559a6f551` and uses Pay `ocUSDC_Pay` `0xEd46020Df8abe7BB1E096f27d089F4326D223a53` as both loan and collateral asset.
- C3 frontend now defaults the main Credit workspace to the canonical Pay-backed private USDC market only.
- Legacy/testnet markets remain accessible behind an Advanced/Testnet toggle in Markets and Settings.
- Credit overview now embeds the shared `ActivityFeed` with a Credit-first filter instead of a separate Credit-only feed system.
- Credit settings now expose shared push notification controls and save Credit-specific event aliases through existing notification prefs.
- Local Credit health browser notification copy is generic and amount-free; it no longer includes exact HF or market labels.

## Shared Activity / Notifications

- `useActivityFeed` now supports a `credit` filter and enumerates Credit market, vault, auction, and score event names.
- Harmony `ActivityFeed` now includes a Credit tab/icon/labels and can be configured with default/allowed filters and custom copy.
- Worker built-in Credit market defaults now include canonical market first, matching `render.yaml` and worker env ordering.
- API and worker notification dispatch now accept aliases like `credit.*`, `credit.borrowed`, `credit.repaid`, `credit.liquidation_opened`, `credit.auction_settled`, and `credit.score_tier_changed` while still matching exact event names and `*`.
- Notification payload bodies remain generic and amount-free; Credit activity links route to `/credit`.
- Reputation summary frontend type now accepts the aggregate `sourceApp='all'` API shape and `sources` map.

## Env / Deployment / Supabase Checks

- Verified deployment JSON contains canonical market keys and Pay `ocUSDC_Pay`; canonical market loan/collateral assets both point to Pay `ocUSDC_Pay`.
- Verified frontend env variable names/values for canonical Credit market, canonical `ocUSDC`, and Supabase project alignment.
- Verified `render.yaml` has canonical Credit market first in worker Credit market lists.
- Verified worker local env has canonical market first in `KEEPER_MARKETS` and `CREDIT_INDEXER_MARKETS`.
- Verified Supabase migrations reuse existing `obscura_activity`, `obscura_notification_prefs`, and `obscura_reputation_events`; no new tables were added.
- Live smoke check passed for deployed API, worker, Vercel frontend, service worker, Supabase tables, notification prefs, and reputation endpoint.
- Live Supabase query returned no current Credit activity rows, which indicates no recent indexed Credit activity rather than missing table/realtime infrastructure.

## Verification

- VS Code diagnostics on edited frontend/API/worker/test files: no errors.
- `npm run test -- src/test/pay-final-p0.test.ts` in `frontend/obscura-os-main`: passed, 19 tests.
- `npm run test` in `frontend/obscura-os-main`: passed, 20 tests.
- `npm run build` in `frontend/obscura-os-main`: passed, with existing bundle/browserlist warnings only.
- `npm run build` in `backend/obscura-worker`: passed.
- `npm run build` in `backend/obscura-api`: passed.
- `npm run compile` in `contracts-hardhat`: passed, nothing to compile.
- `npx hardhat test test/ObscuraCredit.test.ts` in `contracts-hardhat`: passed, 19 tests.
- `scripts/test-e2e.ps1`: passed, 12 PASS / 0 WARN / 0 FAIL after updating the local ignored smoke script expectation to `sourceApp='all'`.

## Remaining Manual Checks

- Redeploy frontend/API/worker to publish these local code changes; no deploy was performed in this session.
- After redeploy, perform live wallet flow: shield Pay `ocUSDC`, approve Credit Router/operator flow, supply, add collateral, borrow, repay, and confirm Credit activity rows appear in shared feed.
- Trigger a safe Credit test event after worker redeploy and confirm `credit.*`/specific aliases send generic push payloads without amounts or exact health factor values.

---

# Credit Wave 5 - C3/C4/C5 Production-Readiness Execution

## Completed

- C3 rebuilt the active Credit workspace around Overview, Borrow, Position, Earn, Liquidations, and Risk without adding a duplicate product shell.
- Borrow and Earn now lead with the canonical Pay-backed private USDC path; legacy/testnet markets stay available but are demoted under advanced/testnet affordances.
- Overview now uses live public market data for liquidity, utilization, borrow APY, and supply APY, while private wallet state remains masked/reveal-on-demand.
- Risk and Settings now use shared notifications, shared activity, and aggregate reputation instead of stale direct explorer flows.
- Added `CreditReputationPanel` to show combined Pay, Credit, and Governance reputation signals in Credit surfaces.
- Restyled Borrow, onboarding, score reveal, and alert drawer components to match the Harmony app system while preserving FHE transaction/reveal behavior.
- Mobile Credit navigation now uses short labels: Home, Borrow, Pos, Earn, Liq, Risk.

## Shared Activity / Realtime / Notifications

- `useActivityFeed` now exposes realtime status, last event time, and last refresh time while preserving participant-scoped Supabase filtering.
- Shared `ActivityFeed` renders realtime/polling/connecting/idle state and last sync copy.
- Credit surfaces continue to use the existing `obscura_activity`, notification prefs, and push subscription infrastructure; no new tables or services were introduced.
- API CORS defaults now include local Vite origins plus production, merged with env-provided origins.

## Reputation / Vote Integration

- Worker indexer now watches live `ObscuraVote` and `ObscuraGovernor` contracts through the existing activity pipeline.
- Governor event args are sanitized before insertion so large proposal/vote payloads do not pollute activity rows.
- Worker reputation derivation now emits `source_app='vote'` signals for vote/governance activity.
- API reputation summary now aggregates Pay, Credit, and Vote sources through the existing `/reputation/:wallet` endpoint.

## Verification

- VS Code diagnostics on edited files: no errors.
- `npm run test -- src/test/pay-final-p0.test.ts` in `frontend/obscura-os-main`: passed, 19 tests.
- `npm run build` in `frontend/obscura-os-main`: passed, with existing Rollup/bundle-size warnings only.
- `npm run build` in `backend/obscura-api`: passed.
- `npm run build` in `backend/obscura-worker`: passed.
- `npm run compile` in `contracts-hardhat`: passed, nothing to compile.
- `scripts/test-e2e.ps1`: passed, 12 PASS / 0 WARN / 0 FAIL.
- Existing Chrome CDP verification used only `chromium.connectOverCDP("http://127.0.0.1:9222")`.
- Local integrated browser check verified Borrow, Earn, Risk, aggregate reputation, realtime status, mobile labels, `/reputation` 200, `/prefs` 200, Supabase activity 200, and no console errors or failed requests.

## Deployment Status

- No live deploy was completed in this session.
- Direct Vercel deploy was blocked because `npx vercel whoami` required account authentication.
- Render services have `autoDeploy: true` in `render.yaml`; Vercel/Render should publish after an authenticated commit/push or dashboard-triggered deploy.
- After deployment, verify live worker health reflects the expanded indexed contract set and run a live Credit activity/reputation smoke event.

---

# Credit Live E2E QA - 2026-05-28

## QA Run Constraints

- Browser constraint: use only the existing Chrome CDP session at `http://127.0.0.1:9222`.
- Target live routes: `https://obscura-os-nine.vercel.app/credit` and `https://obscura-os-nine.vercel.app/pay`.
- Wallet expectation: existing MetaMask profile, test wallet connected, Arbitrum Sepolia, test ETH/USDC/ocUSDC available.
- Documentation rule: append every test, transaction, failure, fix, realtime check, notification check, and privacy check here during the run.

## Live QA Log

- Started live QA context read. Confirmed canonical Pay-backed Credit market is `0x1Ec113297c7F9516A6604aa3b18C180559a6f551`, canonical Pay `ocUSDC` is `0xEd46020Df8abe7BB1E096f27d089F4326D223a53`, Credit Router is `0x46275A34e26C9dBb46fB1716852a5D221564a43F`, Credit Auction is `0x205FfC0A3b8207B645c1a6B1b4805eb3FfC828F0`, and Credit Score V2 is `0xe5B0c6c06C0B1fd7d7CD5D2e93997693863d3D4D`.
- Baseline live Credit browser test via existing Chrome CDP only: wallet already connected as `0xf76e6b0920e9332ff4410f6dd53f01722abc71a3`; `eth_chainId` returned `0x66eee` (Arbitrum Sepolia); no wrong-network state; no wallet reconnect prompt needed; service worker active; notification permission was `default`.
- Baseline live Credit UI test: deployed `/credit` showed Overview/Borrow/Position/Earn/Liquidations/Risk, canonical private USDC copy, shared feed, realtime status, mobile labels, and aggregate private reputation. No canonical addresses were printed in visible body copy, which is privacy/product-clean.
- Baseline live infra test: Supabase `obscura_activity` query returned 200 and API `/reputation/0xf76e6b0920e9332ff4410f6dd53f01722abc71a3` returned 200. No failed requests. Browser console only showed MetaMask/ObjectMultiplex warnings and a Supabase multiple-client warning; no app-blocking console errors.
- Wallet reconnect/refresh test: refresh persistence passed; the connected wallet stayed synced as `0xf76e6b0920e9332ff4410f6dd53f01722abc71a3` on Arbitrum Sepolia with no wrong-network UI and no failed requests after reload.
- Wallet disconnect issue discovered: clicking the visible account chip/`✕` affordance on live `/credit` did not disconnect, did not reveal a reconnect state, and did not change body state. Retested by clicking the far-right close affordance inside the account button; result was unchanged. Root-cause investigation required in shared shell/account button wiring.
- Wallet disconnect root cause found and patched locally: `WalletConnect.tsx` rendered a `span` disconnect affordance inside a non-action account `button`, creating invalid nested/interleaved interactive markup that was unreliable in live click testing. Minimal fix changed the connected wallet chip to a non-button container and made `✕` a real `button` with `aria-label="Disconnect wallet"`. File changed: `frontend/obscura-os-main/src/components/wallet/WalletConnect.tsx`.
- Wallet disconnect fix retest: local patched `/credit` at `http://127.0.0.1:5175/credit` was opened through the same Chrome CDP session; connected via MetaMask; clicked the new `Disconnect wallet` button; UI returned to `Connect Wallet`; connected account disappeared from UI; `eth_accounts` for the local origin returned `[]`; chain stayed `0x66eee`. Fix verified locally. Live deployment still required for `https://obscura-os-nine.vercel.app`.
- Wrong-network live test: switched MetaMask from Arbitrum Sepolia `0x66eee` to Ethereum Mainnet `0x1` through the existing Chrome session. Provider chain changed successfully, but live `/credit` header still displayed `ARB SEPOLIA`, still showed the connected wallet, and did not render a `Switch to Arb Sepolia`/wrong-network affordance. Root cause investigation required in wallet/network state detection. Wallet was restored to Arbitrum Sepolia `0x66eee` immediately after the test.
- Wrong-network root cause found and patched locally: `WalletConnect.tsx` depended only on wagmi `useChainId()`, which can remain on the configured chain when MetaMask switches to an unsupported chain such as Ethereum Mainnet. Minimal fix tracks injected-provider `eth_chainId`, subscribes to `chainChanged`, uses that actual wallet chain for the wrong-network branch, and switches back through `wallet_switchEthereumChain` when available.
- Wrong-network fix retest: local patched `/credit` connected through MetaMask, then switched provider to Ethereum Mainnet `0x1`. UI correctly replaced the connected chip with `Switch to Arb Sepolia` and did not falsely display the wallet as ready. Clicking `Switch to Arb Sepolia` restored provider chain to `0x66eee`; connected wallet UI returned; no wrong-network state remained. Fix verified locally; live deploy still required.
- Pay baseline live test: `/pay` loaded with wallet `0xf76e6b0920e9332ff4410f6dd53f01722abc71a3` on `0x66eee`; private balance rendered masked as `•••••• ocUSDC`; visible public balance showed `$2.00 public`; no old Credit token address or canonical Pay `ocUSDC` address leaked in visible copy; no failed requests. Pay route showed explicit `Shield USDC → ocUSDC` entry and private/wallet-executed copy.
- Pay reveal live test: clicked the real `Reveal` button on `/pay`; no new MetaMask prompt appeared because the session/permit was already available; private Pay balance revealed only after the click as `21.90 ocUSDC`; no failed requests; no plaintext address leak. This confirms Pay balance reveal works on demand in the prepared browser session.
- Pay shield navigation test: clicked the Pay `Shield USDC → ocUSDC` entry. Route moved to `/pay?tab=pay&sub=send`, private mode remained active, ocUSDC balance was visible from the prior explicit reveal as `21.9 ocUSDC`, and copy reported `Plain USDC available to shield: 2`. The first click opened the Pay workspace but did not yet open the amount-entry shield form; next test clicks the inner `Shield USDC →` action.
- Pay shield live transaction: opened `/pay?tab=pay&sub=convert`, entered `0.01` in the Make USDC private amount field, clicked `Make private`, and approved two MetaMask confirmations. Approval tx `0x8f6093fdf22d47b7b646efe63a0ef85ea94f73a4f28a330f0c06fd3abf9c8bef` to USDC `0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d` succeeded (`status=0x1`, block `0x10300677`). Shield tx `0xad05a0655b3be457825c4c8d0e2198b0d8d42cdf5ce63a7e444d98ab8787abb7` to canonical Pay `ocUSDC` `0xEd46020Df8abe7BB1E096f27d089F4326D223a53` succeeded (`status=0x1`, block `0x103006cf`). UI updated from `2` public / `21.9` private to `1.99` public / `21.91` private. No failed requests or console errors during completion.
- Credit canonical handoff test: opened live `/credit` Borrow workspace after Pay shielding. UI led with `Private USDC Credit Line`, explicit Pay-backed private USDC copy, `Open Pay`, router approval explanation, and Advanced/Testnet demotion. No old Credit token addresses or canonical market addresses were exposed in visible copy. Supabase activity and reputation responses returned 200. Current canonical market public pool showed `$0` supplied / `$0` available, so borrow is correctly blocked until liquidity/collateral is supplied.
- Credit supply live attempt: opened Earn, entered `0.01` ocUSDC, clicked `Supply to market`, and approved one MetaMask confirmation. First-step tx `0x3a804b192ce67c99623f704a423608983392a54c72b828c202797e097480b76d` called canonical Pay `ocUSDC` `0xEd46020Df8abe7BB1E096f27d089F4326D223a53` with selector `0xa794ee95` (`confidentialTransfer(address, InEuint64)`); receipt succeeded (`status=0x1`, block `0x10300894`, gas `0x3a7a7`, 2 logs). UI then remained in a submit/awaiting-wallet-signature state and pool supplied stayed `$0`, meaning only the token transfer landed so far; the required market `supply(amtPlain, encAmt2)` accounting/indexed Credit event has not been observed yet.
- Credit supply follow-up: the page later showed `Supplied 0.01 ocUSDC to market.`, and wallet nonce advanced from first-step nonce `0x82` to latest `0x84`, proving a second wallet transaction was mined. The page tx logger missed the second hash, and bounded block scanning was too slow to recover it during this pass.
- Credit supply on-chain state verification: direct public reads from canonical market `0x1Ec113297c7F9516A6604aa3b18C180559a6f551` returned `totalSupplyAssets=10000`, `totalBorrowAssets=0`, `utilizationBps=0`, `borrowersLength=0`. With 6 decimals, `10000` is `0.01` ocUSDC, confirming the market accounting step succeeded. The UI still displayed `POOL SUPPLIED $0` because the tiny QA amount rounds down in dollar formatting, not because accounting failed.
- Credit realtime/indexing blocker discovered: direct Supabase `obscura_activity` query for wallet `0xf76e6b0920e9332ff4410f6dd53f01722abc71a3` returned only older Pay/stealth rows and no Credit supply row after the live supply. Live worker `/health` showed the expanded contract set (`CreditMarket`, `ObscuraVote`, `ObscuraGovernor`, etc.) but `lastSuccessAt=null`, `lastError="HTTP request failed."`, and `consecutiveFailures=1258`; root cause is the worker indexer using a single unhealthy `RPC_URL`/endpoint with no fallback.
- Worker indexer RPC fix patched locally: `backend/obscura-worker/src/indexer/index.ts` now builds a resilient Arbitrum Sepolia fallback transport using env `RPC_URL` first, then publicnode, drpc, omniatech, official Arbitrum, and Tenderly. This should allow live polling/backfill to recover Credit/Pay/Vote indexing after deploy even when the primary Render `RPC_URL` fails.
- Validation after local patches: `npm run build` passed in `backend/obscura-worker`; `npm run build` passed in `frontend/obscura-os-main`; VS Code diagnostics reported no errors for `backend/obscura-worker/src/indexer/index.ts` or `frontend/obscura-os-main/src/components/wallet/WalletConnect.tsx`. Frontend build emitted only existing dependency/chunk-size warnings.
- Live Credit setup+borrow bug discovered: on live `/credit`, opened Set up Credit, continued with Pay-backed ocUSDC, reached the borrow step, filled collateral `0.006` and borrow `0.003`, then clicked `Borrow now`. The sheet failed before MetaMask with `Cannot read properties of undefined (reading 'account')`. Root cause in local code: `SetupSheet.tsx` calls `initFHEClient()` with no `publicClient`/`walletClient` and calls `encryptAmount(fheClient, amount)` despite current `lib/fhe.ts` requiring `encryptAmount(amount)` after initialization. This blocks the integrated new-user router setup flow on the deployed frontend until patched and deployed.
- SetupSheet fix patched locally: `frontend/obscura-os-main/src/components/credit/SetupSheet.tsx` now uses `useWalletClient`, calls `initFHEClient(publicClient, walletClient)`, calls `encryptAmount(amount)`, passes encrypted structs as `enc[0]`, and includes `account` + `chain: arbitrumSepolia` on router/operator writes. `npm run build` passed after this patch; diagnostics for the file are clean. Live site still needs deployment before the failing setup+borrow flow can pass on Vercel.
- Router approval state check: after the failed live setup attempt, direct `isOperator(owner=0xf76e..., operator=CreditRouter 0x46275A...)` on canonical ocUSDC returned `true`, so the operator approval transaction did succeed; only the subsequent setup+borrow FHE initialization/router call was blocked by the frontend bug.
- Local patched setup+borrow retest: on local `http://127.0.0.1:5175/credit`, skipped already-approved router, filled collateral `0.006` and borrow `0.003`, and submitted a real router tx `0x302c8d520896953cc74d396c0d597347816e944a6c63205755c2abaf96172607` to CreditRouter `0x46275A...`. Receipt was `status=reverted` (block `271587381`, gas `81990`, `logs=0`); market mirrors stayed `totalSupplyAssets=10000`, `totalBorrowAssets=0`, `plainCollateral=0`, `plainBorrow=0`, `borrowersLength=0`. Direct checks show `isOnBehalfRouter(router)=true` and `isOperator(user, router)=true`, so the router revert is not due to missing UI approval or missing market whitelist. eth_call replay produced only `Execution reverted for an unknown reason`.
- Receipt-handling bug patched locally: `frontend/obscura-os-main/src/lib/cofheSettle.ts` now throws on reverted receipts, and `SetupSheet.tsx` now explicitly waits for the setup tx receipt and throws `Setup transaction reverted` unless `status === success`. This prevents the UI from falsely navigating to Position after a reverted router tx. Build and diagnostics passed after this patch.
- Direct Credit market flow verification (local patched UI, real Arbitrum Sepolia txs): Position → Add collateral → supplied `0.006` ocUSDC via two-step direct flow. Step 1 token transfer tx `0xffc9f8d85f03e26126b2f2e71342d9fd56bf4a8b7706fd8cb63d0c31c4b8dee4` succeeded (block `271588489`, gas `249857`, 3 logs). Step 2 market collateral tx `0xafd50585b8d93e2cbda806830afa37a38c04b42226ecc16bc62f35f59fcfeacc` succeeded (block `271588629`, gas `251443`, 2 logs). Market mirrors after collateral: `plainCollateral=6000`, `plainBorrow=0`, `maxBorrowable=5160`.
- Direct borrow verification (local patched UI, real tx): Position → Borrow more → borrowed `0.003` ocUSDC. Tx `0x6535d1923aa286204bf5fcc345a5ff89d72d7412bcd13991e52ca2d690ae2af0` succeeded (block `271588875`, gas `564012`, 8 logs). Market mirrors after borrow: `totalSupplyAssets=10000`, `totalBorrowAssets=3000`, `utilizationBps=3000` (30%), `borrowersLength=1`, `plainCollateral=6000`, `plainBorrow=3000`, `maxBorrowable=2160`. UI showed health factor `1.72` and success `Borrowed 0.003 ocUSDC.` This proves the canonical market works through direct flows; the remaining setup failure is isolated to the router path.
- SetupSheet canonical route changed locally: for the canonical Pay-backed market, `SetupSheet.tsx` now skips the router approval step and uses existing `useCreditMarket` direct hooks (`supplyCollateral` then `borrow`) with the direct hook FHE stepper state. This avoids the deployed router path that reverts while still using the same canonical market and Pay-backed ocUSDC balance. Legacy/testnet markets keep the router path.
- SetupSheet direct-flow retest: with collateral `0.002` and borrow `0.001`, setup sheet submitted collateral step 1 tx `0xd3bdaeb88f935f9fd9f1c20a842765606d33dd4ef24fa5b61f9998f171e9fa8a` and collateral step 2 tx `0x4b1408853f162ca8ccbdc1554af8706f6b009958aaf510372502c233a760b9d3`, both successful. The borrow leg then hit MetaMask/RPC `Request is being rate limited` before a tx hash. Market mirrors after those collateral substeps: `plainCollateral=8000`, `plainBorrow=3000`, `maxBorrowable=3880`; no extra borrow landed. Patched after this: setup sheet now waits 10s after direct collateral before borrow, and `useCreditMarket.borrow` wraps fee estimation + `writeContractAsync` in `withRateLimitRetry`. Build and diagnostics passed.
- Direct repay verification (local patched UI, real tx): Position → Repay → repaid `0.001` ocUSDC. MetaMask confirmed two prompts and UI showed `Repaid 0.001 ocUSDC.` The temporary tx logger missed the hash because it was installed before a page navigation; recovered tx from the market `Repaid(address)` event: `0x48e7b04e7361e93c089e26dbb613b74f56fd6eaa9dd71a4f48d64b288d0fc48e`, receipt success at block `271591270`, gas `234642`, 5 logs. Market mirrors after repay: `totalSupplyAssets=10000`, `totalBorrowAssets=2000`, `utilizationBps=2000`, `borrowersLength=1`, `plainCollateral=8000`, `plainBorrow=2000`, `maxBorrowable=4880`. Patched disposable `direct-credit-qa.cjs` so repay navigation reinstalls tx logging before submission.
- Direct collateral withdrawal verification (local patched UI, real tx): Position → Add collateral → Withdraw → withdrew `0.001` ocUSDC collateral. MetaMask confirmed one prompt; tx logger captured `0x09e0961e7bc0a64ee0892a0d5de0ddaa8f601dfa08dca4e83a7f703a021b329a`, receipt success at block `271591776`, gas `473326`, 9 logs. Market mirrors after withdrawal: `totalSupplyAssets=10000`, `totalBorrowAssets=2000`, `utilizationBps=2000`, `borrowersLength=1`, `plainCollateral=7000`, `plainBorrow=2000`, `maxBorrowable=4020`. UI success: `Withdrew 0.001 ocUSDC collateral.` Patched disposable `direct-credit-qa.cjs` withdraw branch selector from lowercase `withdraw` to visible `Withdraw`.
- Position reveal verification: Position → Reveal all required an explicit MetaMask signature on the first reveal and did not auto-decrypt on page load. Initial revealed tile formatting rounded tiny 6-decimal positions incorrectly (`0.002` displayed as `0`, `0.007` as `0.01`) because `CreditPage.tsx` used `maximumFractionDigits: 2`. Patched position tile formatter to `maximumFractionDigits: 6`, rebuilt successfully, and retested reveal. Final revealed values matched market mirrors: supplied `0.01` ocUSDC, borrowed `0.002` ocUSDC, collateral `0.007` ocUSDC, health factor `3.15`.
- Earn/direct lender withdrawal verification (local patched UI, real tx): Earn → default Supply private USDC → Withdraw → withdrew `0.001` ocUSDC from canonical market. MetaMask confirmed one prompt; tx logger captured `0x1b1a51f6f45ba1ea79347b5c41dac7ae450d9d23beceecce35f0965ff82c07e8`, receipt success at block `271593164`, gas `470839`, 9 logs. Market mirrors after withdrawal: `totalSupplyAssets=9000`, `totalBorrowAssets=2000`, `utilizationBps=2222`, `borrowersLength=1`, `plainCollateral=7000`, `plainBorrow=2000`, `maxBorrowable=4020`. UI showed `Withdrew 0.001 ocUSDC from market.` Also patched disposable `direct-credit-qa.cjs` to accept CLI args and an `earnWithdraw` action because PowerShell env assignment occasionally got prefixed by a stray character.
- Advanced/testnet vault round trip verification (local patched UI, real txs): Earn → Curated vaults → Conservative vault → deposited `0.001` legacy/testnet ocUSDC. Two MetaMask confirmations: loan-asset transfer tx `0xee25a7d4b79ae73b7b40478e1d45d1020028274fac6da952828c0107b03eee3c` (success, block `271593626`, gas `247183`, 3 logs) and vault deposit tx `0x32299ae8fc0bab3bcdcfe1d4c9b738ac7060796ff25db732c30af42c2857157e` (success, block `271593714`, gas `261775`, 2 logs). Vault mirror after deposit: `publicTotalDeposited=1000`, `feeBps=1000`, `loanAsset=0xf963fD86348813786ed57b8b2778A365C6226E43` (legacy credit-only ocUSDC). Then withdrew same `0.001` via tx `0x97305cbe9a600a7ce99a2c685f455799126446ef86c886cfbbebeb9e376300a4` (success, block `271593821`, gas `365525`, 6 logs). Vault mirror after withdrawal: `publicTotalDeposited=0`; user encrypted shares handle rotated but is now effectively zero. UI showed `Deposited 0.001 ocUSDC` then `Withdrew 0.001 ocUSDC`.
- Liquidations/sealed auctions verification: Liquidations tab loads `No active auctions` empty state with sealed-bid copy and refresh CTA. Direct auction contract read confirmed `auctionsLength=0` on `0x205FfC0A3b8207B645c1a6B1b4805eb3FfC828F0`, matching UI. Current QA wallet position is healthy (`plainCollateral=7000`, `plainBorrow=2000`), so no liquidation opening/bidding path was naturally available without intentionally creating an unsafe position.
- Risk/reputation verification: Risk tab loaded public risk stats (`LLTV=86%`, `utilization=22.2%`) and shared notification controls, but local browser showed `Failed to fetch` in the reputation panel. Terminal fetch to live API `/reputation/0xf76e...71a3` returned 200 with `totalCappedWeight=5`, tier `active`, Pay signals only; browser fetch from `http://127.0.0.1:5175` failed with `TypeError: Failed to fetch`, isolating the issue to CORS. Root cause: `backend/obscura-api/src/index.ts` allowed Vite `5173/5174` but not fallback port `5175`. Patched API CORS to allow any loopback dev origin (`localhost`/`127.0.0.1` with any port) while preserving explicit production allowlist. API build passed. Local patched API on port `3001` verified CORS: request with `Origin: http://127.0.0.1:5175` returned 200 and `Access-Control-Allow-Origin: http://127.0.0.1:5175`. Live Render API still needs deployment before the live/local frontend can consume this fix.
- Supabase/realtime/indexing verification after real Credit txs: queried Supabase with service role (no credentials printed). `obscura_activity` has one wallet row from Pay stream history and zero `event_name ilike '%Credit%'` rows despite real Credit txs in this QA pass. `obscura_reputation_events` has 5 Pay-only rows for the QA wallet, no Credit discipline signals yet. Notification prefs/subscription exist for the QA wallet (`push_enabled=true`, events `['*']`, one subscription row), so the notification data model is present. Live worker health still shows indexer failing: `lastSuccessAt=null`, `lastError='HTTP request failed.'`, `consecutiveFailures=2839`; this confirms Credit activity/realtime/notification indexing remains blocked until the local worker RPC fallback patch is deployed.
- Mobile Credit QA/polish: 390x844 viewport Risk screenshot showed header crowding: wallet chip consumed the right side, network/balance text pressed into the logo/search area, and the nested disconnect button was globally styled as a full pill by `.app-wallet-slot button`. Patched shared mobile header/wallet presentation: hide search input and network/balance stack below `sm`, make the header left section flex, keep the wallet chip shrink-safe with a truncated address, and add a scoped CSS override so only `button[aria-label="Disconnect wallet"]` renders as a compact icon. Frontend diagnostics clean and `npm run build` passed with existing Vite warnings only. Retest screenshot `credit-mobile-risk-fixed.png` at 390x844 showed no horizontal overflow and a clean `0xf76e...71a3` chip with icon-scale disconnect.
- SetupSheet canonical direct-flow final retest after cooldown/rate-limit patches: used local patched `/credit` and existing Chrome CDP/MetaMask only with tiny amounts (`0.001` collateral, `0.0005` borrow). Three MetaMask confirmations landed successfully: ocUSDC transfer tx `0x4f11e713fbd8de06fe857d53083603f9ed960a8493a57e8eee0d4016d0b3b825` (success, block `271596090`, gas `247907`, 3 logs), market collateral tx `0x2b228cfede390736479f106099c38f43955b23f92e92feafe2e37e0a33702b14` (success, block `271596211`, gas `175552`, 3 logs), and borrow tx `0x9154642632da8d2a4a84938d7a5738a67f71aa5724a1ed6921bb50f147880b82` (success, block `271596321`, gas `485254`, 9 logs). Sheet closed to Position with health factor `2.88`. Direct market mirrors after retest: `totalSupplyAssets=9000`, `totalBorrowAssets=2500`, `utilizationBps=2777`, `borrowersLength=1`, `plainCollateral=8000`, `plainBorrow=2500`, `maxBorrowable=4380`. Also patched Borrow-path copy to say `Commit encrypted collateral` instead of stale router approval language for the canonical path. Frontend diagnostics clean and build passed with existing Vite warnings.
- Final indexing sweep after setup retest: Supabase still returned `creditActivity.count=0`; reputation rows remained 5 Pay-only signals. Live worker health remained blocked with `lastSuccessAt=null`, `lastError='HTTP request failed.'`, and `consecutiveFailures=3179`. Conclusion unchanged: frontend/direct market flows are proven, but live shared activity/reputation/push for Credit cannot pass until the worker RPC fallback patch is deployed. Removed disposable local QA scripts and generated mobile screenshots from the working tree after logging the evidence.

## Production Redeploy Validation - 2026-05-28

- Deploy health retest after Vercel/Render redeploy: live worker recovered. `/health` now shows `lastChunkAt=2026-05-28T00:37:07.223Z`, `lastSuccessAt=2026-05-28T00:37:07.223Z`, `lastError=null`, `consecutiveFailures=0`; this confirms the deployed worker RPC fallback/indexer fix is active. Live API `/health` returns 200. Production CORS on `/reputation/0xf76e...71a3` returns `Access-Control-Allow-Origin: https://obscura-os-nine.vercel.app`.
- Supabase/reputation retest after redeploy: `obscura_activity` now has Credit rows for prior QA txs: `CreditMarket.Borrowed` (`0x9154642632da8d2a4a84938d7a5738a67f71aa5724a1ed6921bb50f147880b82`), `CreditMarket.CollateralSupplied` (`0x2b228cfede390736479f106099c38f43955b23f92e92feafe2e37e0a33702b14`), `CreditVault.Withdrew` (`0x97305cbe9a600a7ce99a2c685f455799126446ef86c886cfbbebeb9e376300a4`), `CreditVault.Deposited` (`0x32299ae8fc0bab3bcdcfe1d4c9b738ac7060796ff25db732c30af42c2857157e`), and `CreditMarket.Withdrew` (`0x1b1a51f6f45ba1ea79347b5c41dac7ae450d9d23beceecce35f0965ff82c07e8`). Reputation now aggregates `sources.credit=5` and `sources.pay=5`, `totalCappedWeight=10`, tier `active`. Notification prefs/subscription still exist (`push_enabled=true`, events `['*']`, one subscription row). This clears the previous live realtime/indexing/reputation blocker.
- Production browser surface audit via existing Chrome CDP: live `/credit` loaded on wallet `0xf76e...71a3`, chain `0x66eee`. Browser-side fetch to `/reputation` succeeded with `totalCappedWeight=10`, `sources={credit:5,pay:5}`. Overview activity feed now renders indexed Credit rows (`Credit borrow opened`, `Credit collateral supplied`, vault deposit/withdraw, supply withdrawn) with realtime on and no failed requests. Risk notification Test succeeded: browser `showNotification` captured `Obscura Push Test`, UI reported `Browser displayed. Server sent 1/1`, permission `granted`, service worker `ready`. Mobile 390x844 Risk viewport had no horizontal overflow. Remaining UX polish found: Overview still says `•••••• USDC` and still tells the user to `approve the router`/`single encrypted borrow flow`, while Borrow correctly says `Commit encrypted collateral`; this stale Overview copy needs patching to match the canonical direct market path. Non-blocking warnings observed: repeated QA session triggered `MaxListenersExceededWarning`, and Supabase still warns about multiple GoTrueClient instances in the same browser context; no failed network requests or app-blocking console errors.
- Production disconnect/reconnect retest via existing Chrome CDP: before state `eth_accounts=[0xf76e...71a3]`, chain `0x66eee`, connected chip visible. Clicking the real `Disconnect wallet` button cleared provider accounts to `[]`, kept chain `0x66eee`, removed the chip, and showed `Connect Wallet`. Reconnect via `Connect Wallet -> MetaMask -> Connect` used the existing MetaMask notification target and restored `eth_accounts=[0xf76e...71a3]` plus the connected chip. No failed requests. Same non-blocking console warnings remained (`MaxListenersExceededWarning`, multiple Supabase GoTrue clients).
- Production wrong-network retest via existing Chrome CDP: initial wallet state `eth_accounts=[0xf76e...71a3]`, chain `0x66eee`. Switching provider to Ethereum Mainnet succeeded immediately (`wallet_switchEthereumChain` result ok, `eth_chainId=0x1`), and live `/credit` correctly replaced the connected wallet state with `Switch to Arb Sepolia`. Clicking the app switch-back path restored `eth_chainId=0x66eee`, restored the `0xf76e...71a3` chip, and removed the wrong-network affordance. No failed requests. Non-blocking warnings unchanged (`MaxListenersExceededWarning`, multiple Supabase GoTrue clients). A separate restore helper confirmed the wallet was already back on `0x66eee` and no wrong-network UI remained.
- Credit overview polish patch: `CreditHarmonyOverview.tsx` now uses `ocUSDC` for the masked private-position KPI instead of bare `USDC`, renames `Pool liquidity` to `Borrowable liquidity`, formats sub-dollar public metrics with up to 6 decimals so tiny QA pool values no longer read as false `$0`, and replaces stale `approve the router` / `single encrypted borrow flow` Overview guidance with canonical direct-market copy: use Pay-backed ocUSDC, commit encrypted collateral directly to the market, then borrow after settlement. Position preview helper text now consistently says `ocUSDC · encrypted/reveal/hidden`. Borrow market and vault hints were softened to make public-vs-private and advanced/lab scope clearer.
- Verification after overview polish: VS Code diagnostics for `CreditHarmonyOverview.tsx` reported no errors. `npm run build` in `frontend/obscura-os-main` passed; warnings were the same existing Vite/Rollup/Browserslist/chunk-size warnings. Follow-up grep found no remaining `approve the router`, `single encrypted borrow`, `Pool liquidity`, `Next best step`, or `•••••• USDC` text in active Credit overview/source surfaces; the only remaining `pool liquidity` string is the valid BorrowForm insufficient-liquidity error.
