# memory_pay_5.md — Obscura Pay Wave 5 AI Memory

This file captures completed tasks, architectural decisions, and key patterns
from PAY_MASTER_EXECUTION_PLAN.md phases. Updated after each phase completes.

---

## W5-BUG-SESSION — Rate-Limit Fixes + Full Infra Map ✅

**Completed**: 2026-05-26 — commits `321f3ba`, `7aa212b`, `b33f415`

### Two rate-limit types (critical distinction)

| Error | Source | Fix pattern |
|---|---|---|
| `"Request is being rate limited"` | **FHE coprocessor** — per-wallet CoFHE op quota | Friendly message + countdown UX; wait ~30 s |
| `"RPC submit: Request is being rate limited"` | **Alchemy RPC 429** — receipt polling drains budget | `sleep(2500)` between receipt + announce; show Retry button |

`writeContractAsync` **cannot** be auto-retried (MetaMask re-prompts per attempt).
Only pure read calls (e.g. `estimateCappedFees`) can use `withRateLimitRetry`.

### Files changed

| File | Commit | Change |
|---|---|---|
| `src/hooks/useOcUSDCBalance.ts` | `321f3ba` | Switch `OCUSDC_ADDRESS` from `CONFIDENTIAL_USDC_ADDRESS` (v3.15) to `OBSCURA_PAY_OCUSDC_ADDRESS` (Wave 5) |
| `src/components/harmony/PayHarmonyHome.tsx` | `321f3ba` | Wire `reveal()` on toggle — was flipping local bool only |
| `src/components/pay-v4/OcUSDCPanel.tsx` | `7aa212b` | `isRateLimited()` helper, friendly error copy, 35 s countdown on shield button |
| `src/components/pay-v4/UnifiedSendForm.tsx` | `b33f415` | Correct ocUSDC contract, `sleep(2500)` before announce, retryable `pendingAnnounce` state + Retry button |

### Correct contract addresses for Pay operations

```
OBSCURA_PAY_OCUSDC_ADDRESS = 0xEd46020Df8abe7BB1E096f27d089F4326D223a53  ← Wave 5 PAY wrapper ✅
CONFIDENTIAL_USDC_ADDRESS  = 0xEFab856b903C4106769B14798deDE21C6923d7d2  ← old v3.15 credit ❌ (do NOT use in Pay hooks)
```

### Key patterns added

```typescript
// isRateLimited — detect both FHE + RPC variants
function isRateLimited(e: unknown): boolean {
  const msg = ((e as { message?: string })?.message ?? String(e)).toLowerCase();
  return msg.includes("rate limit") || msg.includes("rate-limit");
}

// sleep — RPC cooldown between heavy receipt poll and next tx
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

// pendingAnnounce state pattern — store announce params for independent retry
const [pendingAnnounce, setPendingAnnounce] = useState<{
  stealthAddress: `0x${string}`;
  ephemeralPubKey: `0x${string}`;
  viewTag: `0x${string}`;
  metadata: `0x${string}`;
} | null>(null);
```

### Stealth send flow (corrected — 4 steps)

1. **Derive stealth keys** — `deriveStealthPayment(spendKey, viewKey)` (offline)
2. **FHE encrypt** — `encryptAmount(amount)` → `InEuint64`
3. **`confidentialTransfer`** → `OBSCURA_PAY_OCUSDC_ADDRESS` (Wave 5) → receipt
4. **`await sleep(2500)`** — let Alchemy rate-limit window reset
5. **`announce()`** → wrapped in try/catch; on rate-limit sets `pendingAnnounce` state instead of throwing

### Infrastructure — deployed services

| Service | URL | Notes |
|---|---|---|
| Frontend | `https://obscura-os-nine.vercel.app` | Vercel, auto-deploy on `main` push |
| API | `https://obscura-api-n62v.onrender.com` | Render free (cold-start ~30 s after idle) |
| Worker | `https://obscura-worker-0ppj.onrender.com` | Render free |
| GitHub | `https://github.com/mohamedwael201193/OBSCURA` | `main` branch |

#### Vercel setup
- Root dir: `frontend/obscura-os-main`
- Build: `npm run build` → `dist/`
- Env vars: all `VITE_*` set manually in Vercel dashboard (NOT auto-synced from `.env`)
- Auto-deploy: every push to `main`

#### Render setup
- Config: `render.yaml` at repo root (secrets NOT stored there — in Render dashboard)
- API service: `packages/pay-402/`
- Worker: background job processor

#### Supabase
- RLS on receipts table — users read only own rows
- Frontend: `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` (safe to expose)
- API writes: `SUPABASE_SERVICE_KEY` (server-only, in Render env)

#### Chain + RPC
- Network: Arbitrum Sepolia (chainId `421614`)
- Read RPC pool (`src/config/wagmi.ts`): publicnode → drpc → omniatech → arb-official → tenderly
- Write RPC: MetaMask (its own — not wagmi transport)
- Explorer: `https://sepolia.arbiscan.io`

---

## W5P1 — Harmony Design System Migration ✅

**Completed**: Session 2 (continuation after session 1 hit token limit)

### Files modified
| File | Change |
|------|--------|
| `src/components/harmony/harmony-ui.tsx` | +5 primitives: HarmonySelect, HarmonyStatusBanner, HarmonyFreshnessStrip, HarmonyRevealChip, HarmonySuccessChip |
| `src/pages/PayPage.tsx` | PrettySelect→HarmonySelect; tab insurance→receivables; ReceivablesHub routing |
| `src/components/harmony/PayHarmonyTabShell.tsx` | +receivables type + metadata |
| `src/components/harmony/PayHarmonyHome.tsx` | Full rewrite: network banner, degradation banner, freshness strip, time-aware greeting, fixed quick-send card |
| `src/components/pay-v4/PayHomeDashboard.tsx` | Full rewrite: 3-step checklist, 7-day auto-hide, Harmony styles |
| `src/components/pay-v4/StreamsDashboard.tsx` | Removed neon glow shadow from active tab |
| `src/components/harmony/HarmonyEncryptedValue.tsx` | +5-min reveal session timer with HarmonyRevealChip countdown |
| `src/components/pay-v4/MyPolicies.tsx` | Dark glass patterns fixed |
| `src/components/pay-v4/SubscriptionForm.tsx` | Plain-language copy |

### Design system rules (Harmony)
- Background: `#F9F7F4` or `bg-card` — never dark
- Accent: `#2D6A4F` deep green (`hsl(var(--accent))`)
- Borders: `hairline` class (thin neutral border)
- Cards: `rounded-2xl hairline bg-card`
- Icon containers: `bg-muted hairline` — never inverted
- Muted surfaces: `bg-muted/40` or `bg-muted/50`
- Active/success tint: `bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]`
- No: `bg-[#0a0d12]`, `bg-white/[0.02]`, neon glow shadows, neon borders

### Copy rules (Privacy UI)
- Never show: "euint", "ctHash", "ACL", "permit", "CoFHE", "coprocessor", "ciphertext", "ZKPoK"
- Say: "encrypted" not "CoFHE-encrypted"
- Say: "Recurring payment" not "Confidential subscription"
- Lifecycle steps: Encrypt / Submit / Compute / Settled (not ZKPoK/TaskManager/FHE.transfer/Threshold)

---

## W5P2 — Receivables Hub ✅

**Completed**: Session 2 (same session as W5P1)

### File created
`src/components/pay-v4/ReceivablesHub.tsx` — was the **critical build blocker**
(imported in PayPage.tsx but missing from disk).

### Architecture
- Props: `{ onNavigate: (tab: string) => void }`
- Internal state: `open: Section | null` — one section open at a time (accordion)
- Sections: `"subscriptions" | "new-subscription" | "coverage" | "dispute"`
- `SectionCard` sub-component: icon, title, description, chevron toggle, children

### Data sources
- Subscriptions list: `useInsuranceSubscription()` → `.subscriptions[]`, `.isLoading`, `.refresh()`
- `SubscriptionRow` type: `{ subId, subscriber, streamId, maxCycles, cyclesConsumed, periodSeconds, lastConsumedAt, active }`
- Default open section: `"subscriptions"`

### Sub-components composed
- `SubscriptionForm` — new recurring payment form
- `BuyCoverageForm` — coverage purchase form (no props)
- `MyPolicies` — active policies list (no props)
- `DisputeForm` — dispute filing form (no props)
- `StakePoolForm` — LP staking form (no props)

---

## W5P1.5 — IA + Guided UX Refactor ✅

**Completed**: Session 4

### Problem solved
9 protocol-oriented tabs → 6 user-intent tabs. Users were lost in a crypto-native IA ("streams", "escrow", "receivables"). New navigation matches mental model: what do you want to do?

### New navigation structure
| Tab key | Label | Was |
|---------|-------|-----|
| `home` | Overview | home |
| `pay` | Pay | send |
| `getpaid` | Get Paid | receive |
| `automations` | Automations | streams + escrow + receivables |
| `activity` | Activity | (part of receive) |
| `settings` | Settings | settings + contacts + advanced |

### New file created
`src/hooks/useOnboardingState.ts`
- Returns: `{ stage, ethBalance, ethChecked, hasUsdc, hasPrivateUsdc, isStealthRegistered, hasActivity, unread }`
- Stages (in order): `not-connected` → `new` → `has-eth` → `has-usdc` → `shielded` → `registered` → `active`
- Stage derivation: ETH balance threshold 0.0001, USDC from `useUSDCBalance()`, private from `getTrackedUnits()`, stealth from `useReadContract(OBSCURA_STEALTH_REGISTRY)`, activity from `useReceipts()`

### Files modified
| File | Change |
|------|--------|
| `src/pages/PayPage.tsx` | Tab type + basePayNav → 6 entries; full renderActiveSection restructure; URL param routing preserved; legacy toggle in settings |
| `src/components/harmony/PayHarmonyTabShell.tsx` | `PayHarmonyTabKey` extended with `pay / getpaid / automations / activity`; TAB_META entries added |
| `src/components/harmony/PayHarmonyHome.tsx` | `PayTab` type → 6 keys; `useOnboardingState` imported; 5 smart onboarding banners added; all `onNavigate("send"/"receive")` → `("pay"/"getpaid")` |
| `src/components/pay-v4/PayHomeDashboard.tsx` | `onNavigate` calls: `"send"`→`"pay"`, `"receive"`→`"getpaid"` |
| `src/components/harmony/HarmonyAppShell.tsx` | Mobile bottom nav added (`md:hidden fixed bottom-0`) showing first 5 sidebar items |
| `src/components/pay-v4/OcUSDCPanel.tsx` | "Shield USDC"→"Make USDC private", "Shield"→"Make private", "Unshield"→"Convert to USDC", toast copy updated |
| `src/components/pay-v4/RegisterMetaAddressForm.tsx` | "Your Stealth Address Setup"→"Private Receive Setup", badge "STEALTH"→"PRIVATE", body copy plain-language |
| `src/components/pay-v4/StealthInboxV2.tsx` | "Stealth inbox"→"Private inbox" |

### Smart banner logic (PayHarmonyHome — priority order)
Only one banner shown at a time:
1. `showEthBanner` — ETH < 0.0001 → "Get Arbitrum ETH" faucet link
2. `showUsdcBanner` — no ETH issue + no USDC → "Get testnet USDC" Circle faucet link
3. `showShieldBanner` — has USDC but no ocUSDC → "Make USDC private" → `onNavigate("pay")`
4. `showStealthBanner` — has ocUSDC but not registered → "Set up private receiving" → `onNavigate("getpaid")`
5. `showInboxBanner` — `unread > 0` → "N private payments waiting" → `onNavigate("getpaid")`

### URL param routing (preserved for deep links)
| Param | Routes to |
|-------|-----------|
| `?claim` | `getpaid` |
| `?invoice` | `getpaid` |
| `?tab=send` | `pay` |
| `?tab=receive` | `getpaid` |
| `?tab=escrow` \| `streams` \| `receivables` \| `insurance` | `automations` |
| `?tab=contacts` \| `advanced` | `settings` |

### Build result (Session 4)
`✓ built in 18.47s` — 9074 modules, zero TypeScript errors

---

## W5P1.8 — UX Rearchitecture & Workflow Simplification ✅

**Completed**: Session 4 (continuation)

### Problem solved
W5P1.5 reduced the sidebar to 6 tabs, but each tab still rendered a vertical
stack of every workflow's card (e.g. `automations` showed 5 forms at once).
W5P1.8 introduces **nested sub-navigation** so only ONE workspace panel is
visible per tab. Mirrors Stripe/Mercury/Linear dashboard patterns.

### Anti-stacking rule (codified)
A top tab may render at most:
- 1 sub-navigation strip
- 1 active workspace panel (the chosen sub-tab)
- 0 or 1 contextual banner above the workspace

### New primitive — `HarmonySubNav<T>`
File: `src/components/harmony/harmony-ui.tsx`
- Chip-style segmented control (rounded-full hairline pills)
- Active state: `bg-foreground text-background`
- Generic over sub-tab key type
- Supports optional icon + badge per item
- Horizontal-scrollable on mobile (no wrap)

### Per-tab sub-navigation
| Top tab | Sub-tabs (default first) |
|---------|--------------------------|
| `home` | flat — PayHarmonyHome dashboard only |
| `pay` | **Send** · Make private · Bridge |
| `getpaid` | **Inbox** (registered) / **Setup** (not registered) · Request · Inbound streams |
| `automations` | **Streams** · Escrows · Subscriptions · Payroll |
| `activity` | flat — receipt list only |
| `settings` | **Preferences** · Privacy · Contacts · Data · Legacy |

### Smart default sub-tab logic
- `getpaid` opens on `inbox` when `onboarding.isStealthRegistered === true`, else `setup`
- `?claim=<id>` or `?invoice=<id>` forces `getpaid` + `inbox`
- All other tabs use first sub-tab as default

### Deep-link support
URL pattern: `/pay?tab=<top>&sub=<sub>`
- Initial state parsed from URL on mount
- Sub-tab changes call `writeUrl()` → `history.replaceState()` (no page reload)
- Legacy `?tab=` values mapped to new IA + sensible default sub:
  - `?tab=send` → `pay/send`
  - `?tab=receive` → `getpaid/inbox`
  - `?tab=escrow` → `automations/escrows`
  - `?tab=streams` → `automations/streams`
  - `?tab=receivables|insurance` → `automations/subscriptions`
  - `?tab=contacts` → `settings/contacts`
  - `?tab=advanced` → `settings/legacy`

### Files modified
| File | Change |
|------|--------|
| `src/components/harmony/harmony-ui.tsx` | **NEW** `HarmonySubNav<T>` primitive |
| `src/pages/PayPage.tsx` | Sub-tab state per top tab; `renderActiveSection` rewritten so each tab renders ONE workspace; deep-link via `?sub=`; `SettingsCards` split into `SettingsPrefsCard` + `SettingsPrivacyCard` + `SettingsDataCard` |

### Settings restructure
Old `SettingsCards` (5 cards stacked) split by domain:
- `SettingsPrefsCard` — UI mode / send mode / gas mode / replay onboarding
- `SettingsPrivacyCard` — meta-address rotation + inbox filter
- `SettingsDataCard` — local receipt export/clear
- `ContactsSection` — moved into `contacts` sub-tab (was rendered alongside)
- Legacy tools — moved into `legacy` sub-tab (was rendered alongside)

### What was NOT changed
- All contract addresses unchanged
- All hooks/SDK calls unchanged
- All existing component logic preserved
- No FHE flow modifications
- Pay ↔ Credit ↔ Vote compatibility intact

### Build result (Session 4 W5P1.8)
`✓ built in 16.47s` — zero TypeScript errors

---

## W5P1.9 — Premium Fintech UX Refinement ✅

Goal: Stripe / Mercury / Linear-grade polish. No new features, no contract
changes. Focus on hierarchy, density, onboarding, workspace UX.

### What shipped
1. **New Harmony primitives** in `src/components/harmony/harmony-ui.tsx`:
   - `HarmonyDrawer` — right-side slide-in panel (Esc + backdrop close, body scroll lock, focus-trap-via-modal-flag). Widths sm/md/lg. Replaces inline create-forms.
   - `HarmonyActionTile` — compact icon+label+sublabel tile for Mission Control quick-actions row.
   - `HarmonyMissionHero` — state-driven hero card with eyebrow + headline + description + ONE primary CTA + tiny progress dots. Replaces 12-col balance hero and 5-banner stack.
   - `HarmonyMetricRow` — compact horizontal stat strip (workspace summaries).
   - `HarmonyActivityRow` — single-line dense activity row (icon · title · meta · value · time). No badges, no chips.
   - `HarmonyWorkspaceHeader` — title + description + primary CTA, used at the top of each automations sub-tab.
2. **PayHarmonyHome rebuilt as Mission Control** (`src/components/harmony/PayHarmonyHome.tsx`):
   - Single state engine maps `useOnboardingState()` → ONE primary CTA:
     - not-connected → Connect wallet
     - new (no ETH) → Get Arbitrum ETH (faucet)
     - has-eth (no USDC) → Get testnet USDC (Circle faucet)
     - has-usdc → Make USDC private (→ `pay`)
     - shielded → Set up private receiving (→ `getpaid`)
     - registered (no activity) → Send your first private payment (→ `pay`)
     - active + unread → View inbox / send
     - active + no unread → Send a payment / open activity
   - Sections (in attention order): MissionHero · QuickActions 4-tile · MetricRow · ActivityList (5 rows max) · `<details>` Learn how privacy works (collapsed).
   - Removed: giant 12-col balance hero, 4-card "How it works" inline, 5-banner stack, separate Setup panel, motion.div on hero, `PayHomeDashboard` import.
3. **Automations workspace refactor** (`src/pages/PayPage.tsx`):
   - Each sub-tab now: WorkspaceHeader (title + "+ New" CTA) → list-of-items → drawer-on-create.
   - New state `autoDrawer: AutoSub | null` controls drawer visibility.
   - Streams: existing dashboard + drawer with `CreateStreamFormV2`.
   - Escrows: `MyEscrows` list only + drawer with `OcUSDCEscrowForm`.
   - Subscriptions: `ReceivablesHub` only + drawer with `SubscriptionForm`.
   - Payroll: WorkspaceHeader + metric row + collapsed `<details>` for `ResolverManager` + drawer (width=lg) with `BatchEscrowForm`.
   - Removed: all inline `PayHarmonyPanelCard` wrappings of create-forms in automations; `PayHarmonyDetails` block on payroll.
4. **CSS density + ivory pass** (`src/index.css`):
   - `.pay-input` / `.pay-select`: ivory bg-card + hairline border, 0.5/0.7 rem padding, neutral focus ring (no neon emerald glow). Calendar picker icon = neutral.
   - `.btn-pay`: 36 px height, no uppercase, no letter-spacing, rounded-full.
   - New canonical `.btn-pay-primary` (foreground bg + background text).
   - Legacy `.btn-pay-emerald/cyan/violet` neutralized to foreground+background (no neon glow, no gradient). `.btn-pay-amber` → hairline ghost. `.btn-pay-ghost` → transparent hairline.

### State → CTA matrix (Mission Control)
| Stage | Headline | Primary CTA |
|---|---|---|
| not-connected | Connect a wallet to begin. | Connect wallet |
| new (no ETH) | Add a small amount of test ETH. | Get Arbitrum ETH |
| has-eth | Add testnet USDC… | Get testnet USDC |
| has-usdc | Convert USDC into private USDC. | Make USDC private |
| shielded | Enable private receiving. | Set up private receiving |
| registered (no activity) | Send your first private payment. | Send a payment |
| active (unread > 0) | You have N new private payment(s). | View inbox (+ Send secondary) |
| active | Everything is set. What would you like to do? | Send a payment (+ Activity secondary) |

### Files changed
- `frontend/obscura-os-main/src/components/harmony/harmony-ui.tsx` (+ 6 primitives, +useEffect import)
- `frontend/obscura-os-main/src/components/harmony/PayHarmonyHome.tsx` (full rewrite — 429 → 318 LOC)
- `frontend/obscura-os-main/src/pages/PayPage.tsx` (automations case + drawer state + new imports)
- `frontend/obscura-os-main/src/index.css` (inputs, selects, btn-pay system)
- `PAY_MASTER_EXECUTION_PLAN.md` (new § Phase W5P1.9)

### What was NOT changed
- Contracts, hooks, FHE flows, SDK calls — all untouched
- `useOnboardingState`, `useReceipts`, `useStealthInbox`, `useOcUSDCBalance` API surfaces preserved
- All deep-links preserved (`?tab`, `?sub`, `?claim`, `?invoice`, legacy aliases)
- `PayTab` type unchanged
- No new features, no new routes, no new dependencies

### Build result (Session 4 W5P1.9)
`✓ built in 12.84s` — zero TypeScript errors

---

## Build status

`npm run build` in `frontend/obscura-os-main`:
- **Session 2 result**: `✔ built in 56.27s` — zero errors
- **Session 4 W5P1.5**: `✓ built in 18.47s` — zero errors
- **Session 4 W5P1.8**: `✓ built in 16.47s` — zero errors
- **Session 4 W5P1.9**: `✓ built in 12.84s` — zero errors
- Only advisory: chunk size warnings on large vendor bundles (expected, not an error)

---

## W5P1.9.2 — Privacy Mission Control Overview Redesign ✅

**Completed**: Session 5

### File rewritten
`src/components/harmony/PayHarmonyHome.tsx` — complete redesign of the Overview/Home tab.

### Changes
| Element | Before | After |
|---|---|---|
| Hero | `HarmonyMissionHero` card (no balance) | Inline `<section>` with privacy posture chip strip + embedded `CipherBalanceDisplay` |
| Balance | Separate `HarmonyMetricRow` + shimmer | Large `••••••` cipher-shimmer with AnimatePresence reveal toggle, inside hero |
| Privacy posture | Separate `HarmonyPrivacyPosture` strip below metrics | Chip strip at TOP of hero card ("Balance hidden · Receiving private · Inbox sealed") |
| Onboarding | State-driven hero copy only | Separate compact onboarding rail card with 5 step rows (check icons, active step CTA) |
| Progress | 4-step progress bar in hero | 5-pip progress track inside hero + fill bar in onboarding rail header |
| "How it works" | Collapsible `<details>` section | Removed (privacy story in posture chips + onboarding rail copy) |
| Section gap | `space-y-6` | `space-y-4` (tighter density) |
| Motion | None | `AnimatePresence` balance reveal (opacity + y slide) |

### New inline primitives (co-located in PayHarmonyHome.tsx)
- `PostureChip` — small rounded chip with icon + label
- `CipherBalanceDisplay` — AnimatePresence cipher-shimmer ↔ revealed value with toggle button
- `OnboardingStepRow` — step indicator + title + detail + conditional action CTA

### Design rules enforced
- NO auto-decrypt on mount — balance state is purely local `useState(false)` reveal toggle
- NO w-full buttons anywhere
- NO dark/neon/gradient tokens
- Privacy copy: "Balance hidden · Receiving private · Inbox sealed" (never FHE internals)
- Build: `✓ built in 13.16s` — zero TS errors

---

## Key active contract addresses (never change these)

| Name | Address |
|------|---------|
| ObscuraPay | `0x13e2e3069bF9729C8Cd239F9A5fAAb087c77C33f` |
| PAY ocUSDC | `0xEd46020Df8abe7BB1E096f27d089F4326D223a53` |
| ConfidentialEscrow V2 | `0x293810A2081114CcE0c98A709a0c31aE07c01D75` |
| PayStream V3 | `0xE4328F139F03138D63f7fdF90A8Ef240e04653fA` |
| PayrollResolver V3 | `0xB077c231448EF2252060E4B4dD404078DBD94180` |
| InsuranceSubscription V2 | `0xEA9Fc5800F41d090dFB90f9735F4CF3824d6743D` |
| StealthRegistry | `0xa36e791a611D36e2C817a7DA0f41547D30D4917d` |
| AddressBook | `0x4095065ee7cc4C9f5210A328EC08e29B4Ac74Eef` |
| InboxIndex | `0xDF195fcfa6806F07740A5e3Bf664eE765eC98131` |
| Credit ocUSDC | `0xf963fD86348813786ed57b8b2778A365C6226E43` |

---

## Forbidden (hard rules — never violate)

- KURA, CovertMRV — never add to any file
- `about.md`, `README.md`, `wave4.md` — never modify
- Auto-decrypt on mount — MetaMask spam, reject pattern
- Old cUSDC V1 naming / V1 InsuranceSub address
- Dark patterns: `bg-[#0a0d12]`, `bg-white/[0.025]`, neon glow shadows
- Deprecated contracts: PayStreamV2, InsuranceSubV1

---

## W5P3 — Smart Account + Passkey + ERC-4337 Paymaster ✅

**Completed**: Production session (prior + this session)

### Deployed contracts (Arbitrum Sepolia, chain 421614)

| Contract | Address |
|----------|---------|
| `ObscuraSmartAccountFactory` | `0xFaC683D8AB872cCf5eBfaE1659a9CD44C6FB4feB` |
| `ObscuraSmartAccount` (impl) | `0x0415945e442C4C5533367Fbb6f0D40528e0D7809` |
| `ObscuraPaymaster` | `0x9B1F61A65467F11339A8d0834349Be32EB2CF878` |
| ERC-4337 EntryPoint v0.7 | `0x0000000071727De22E5E9d8BAf0edAc6f37da032` |

Paymaster funded: 0.5 ETH via EntryPoint deposit.
All 10 Obscura Pay contracts whitelisted.
Tests: 40/40 passing.
Old raw-UserOpHash factory archived: `0xbe8dC1d4Dcc368e0dBb6c7A5BDFfac2Fe72AFd05`.

### Frontend files (no TS errors)

| File | Purpose |
|------|---------|
| `src/config/smartAccount.ts` | Factory/paymaster addresses + chain config |
| `src/lib/passkey.ts` | P-256 WebAuthn create/get, full assertion payload signing |
| `src/lib/userop.ts` | Build + sign + submit PackedUserOperation v0.7 |
| `src/hooks/useSmartAccount.ts` | Account address derivation + passkey enrollment state |
| `src/hooks/useUnifiedWrite.ts` | Route to EOA or SmartAccount based on enrollment |
| `src/components/harmony/PasskeyEnrollModal.tsx` | Enrollment UX — no auto-decrypt on mount |

### Critical constants
- Browser passkeys sign `authenticatorData || sha256(clientDataJSON)`, NOT raw `userOpHash`
- Contract verifies `clientDataJSON.challenge == base64url(userOpHash)` before RIP-7212
- ERC-4337 v0.7 uses `PackedUserOperation` (not v0.6 struct)
- Factory function must NOT be named `getAddress` (Solidity reserved)
- `VITE_SMART_ACCOUNT_FACTORY_ADDRESS=0xFaC683D8AB872cCf5eBfaE1659a9CD44C6FB4feB`
- `VITE_PAYMASTER_ADDRESS=0x9B1F61A65467F11339A8d0834349Be32EB2CF878`

---

## W5P4 — Indexer + Notifications + Activity Feed ✅

**Completed**: Production session (this session)

### Backend services deployed to Render

| Service | Type | URL (production) |
|---------|------|-----------------|
| `obscura-pay-relay` | web (port 3701) | `https://obscura-pay-relay.onrender.com` |
| `obscura-pay-indexer` | worker | (no public URL) |
| `obscura-pay-notifications` | web (port 3702) | `https://obscura-pay-notifications.onrender.com` |

Defined in `render.yaml` at repo root.

### Supabase (project: veil-strike)

- Project ID: `woqfefgrkpleedsuxavd`
- URL: `https://woqfefgrkpleedsuxavd.supabase.co`
- Anon key: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndvcWZlZmdya3BsZWVkc3V4YXZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUzNDE5NDEsImV4cCI6MjA5MDkxNzk0MX0.6W7_42r_8InD3pM97BM6rYqTt-bVwV3cfDc4Nfb1EjU`

### Migrations applied ✅

1. `create_obscura_activity` — `obscura_activity` table + GIN index + RLS + Realtime publication
2. `create_notification_tables` — `obscura_push_subscriptions` + `obscura_notification_prefs` + RLS

### Indexer (packages/pay-indexer)

Watches: ObscuraPay, PayStreamV3 (active), InvoiceV2, ConfidentialEscrowV2, InsuranceSubscriptionV2 (active), StealthRegistry
Legacy backfill: PayStreamV2, InsuranceSubscriptionV1

Events.ts: correct signatures matching deployed contracts (CycleSettled not StreamWithdrawn, Subscribed with subId/subscriber/streamId/maxCycles/periodSeconds).

### Frontend files (no TS errors)

| File | Purpose |
|------|---------|
| `src/hooks/useActivityFeed.ts` | Supabase Realtime subscription for wallet activity |
| `src/hooks/useNotificationPrefs.ts` | Push notification subscription + prefs management |
| `src/components/harmony/ActivityFeed.tsx` | Activity feed component (Harmony design) |
| `src/pages/PayPage.tsx` | ActivityFeed integrated into activity tab |

### Credentials that MUST be set manually in Render dashboard

| Env Var | Where | Notes |
|---------|-------|-------|
| `BUNDLER_URL` | pay-relay | Alchemy: `https://arb-sepolia.g.alchemy.com/v2/<KEY>/rpc` OR Pimlico: `https://api.pimlico.io/v2/421614/rpc?apikey=<KEY>` |
| `SUPABASE_SERVICE_ROLE_KEY` | pay-indexer, pay-notifications | Supabase Dashboard → Settings → API → service_role |
| `VAPID_PUBLIC_KEY` + `VAPID_PRIVATE_KEY` | pay-notifications | Run `node dist/generate-vapid.js` and copy output |
| `RESEND_API_KEY` | pay-notifications | https://resend.com/api-keys |

### Build result (this session)
`✓ built in 14.56s` — zero TypeScript errors, `@supabase/supabase-js` installed

---

## W5P5 — UI Bug Fixes: CONFIDENTIAL_USDC_ADDRESS + Label Corrections ✅

**Completed**: commit `82568aa`

### Problem
Three UI components crashed or used the wrong contract address because they
still referenced `CONFIDENTIAL_USDC_ADDRESS` (old v3.15 credit contract,
**not exported** in `@/config/payV3`), or showed `cUSDC` instead of `ocUSDC`.

### Files fixed

| File | Change |
|------|--------|
| `src/components/pay-v4/UnifiedSendForm.tsx` | Replaced `CONFIDENTIAL_USDC_ADDRESS` stealth guard with `OBSCURA_PAY_OCUSDC_ADDRESS` import; label `Amount (cUSDC)` → `Amount (ocUSDC)` |
| `src/components/pay-v4/StakePoolForm.tsx` | Replaced import + 2 usages of `CONFIDENTIAL_USDC_ADDRESS` with `OBSCURA_PAY_OCUSDC_ADDRESS` from `@/config/payV3` |
| `src/components/pay-v4/BuyCoverageForm.tsx` | Label `Coverage Amount (cUSDC)` → `Coverage Amount (ocUSDC)` |

### Root cause
`CONFIDENTIAL_USDC_ADDRESS` was the old v3.15 credit contract address. All Pay
UI components must use `OBSCURA_PAY_OCUSDC_ADDRESS = 0xEd46020Df8abe7BB1E096f27d089F4326D223a53`.

---

## W5P6 — Auto-Stealth Setup: Embedded Key Generation in Get Paid ✅

**Completed**: current session (follows 82568aa)

### Problem
New users visiting Get Paid → Inbox saw a static "No meta-address yet" card
with no action button. They had to navigate to the Setup sub-tab manually.
Users with keys on a different device saw confusing "—" display with no guidance.

### Solution: Embedded setup flow in StealthInboxV2

`StealthInboxV2.tsx` now embeds the full stealth key setup inside the inbox:
- When `!meta.keysMeta`: renders a hero card with 3-step explainer + "Enable private receiving" button
- Single click triggers `meta.generateAndPublish()` (2 MetaMask interactions: sign to encrypt + on-chain tx)
- `useRef` + `useEffect` auto-triggers `inbox.refresh()` as soon as keys appear
- `toast.success(...)` on completion
- Graceful error display below the button

### RegisterMetaAddressForm redesign (4 states)

| State | Condition | UX |
|-------|-----------|-----|
| A | No local keys, not registered | "Enable private receiving" hero + 3-step explainer + CTA |
| B | No local keys, on-chain meta exists | "Keys missing from this browser" amber warning + on-chain pubkeys + "Generate new keys" |
| C | Local keys, not published | Blue note "Not yet on-chain" + "Publish to chain" CTA |
| D | Both local + on-chain | Green "Active" confirmation + key display + collapsible "Rotate keys" flow |

### PayPage.tsx auto-navigate after registration

Added `useRef` + `useEffect` to `PayPage.tsx`:
- Watches `onboarding.isStealthRegistered` transition from `false → true`
- On first registration: automatically switches `getPaidSub` from `"setup"` to `"inbox"`
- Only fires on the `false → true` transition (not on every re-render)

### Files changed

| File | Change |
|------|--------|
| `src/components/pay-v4/StealthInboxV2.tsx` | Embedded setup flow; `useState`, `useRef`, `useEffect`, `motion`, `KeyRound`, `Sparkles`, `toast` added; `cUSDC` → `ocUSDC` in amount display |
| `src/components/pay-v4/RegisterMetaAddressForm.tsx` | Complete redesign — 4-state component replacing single-form |
| `src/pages/PayPage.tsx` | `useState` → `useState, useRef, useEffect`; auto-navigate effect after registration |

### UX flow after these changes

1. User connects wallet → visits **Get Paid**
2. Inbox shows "Enable private receiving" with 3 steps explained
3. Click "Enable" → MetaMask: sign message (AES key) → MetaMask: send tx (setMetaAddress)
4. Keys stored encrypted in localStorage; on-chain meta published
5. Auto-scan fires immediately (refresh called when `keysMeta` becomes non-null)
6. PayPage auto-navigates to inbox; user sees any incoming payments
7. **Setup tab** now shows "Active" state with key display + optional rotate

### Key technical detail
`useStealthScan` requires local private viewing key to decrypt announcements.
If user had on-chain meta from another device but cleared localStorage, they
CANNOT claim old stealth payments. The inbox correctly shows this as State B
and warns: "payments sent to old address need original private keys to claim."

### Build result
No TypeScript errors in all 3 changed files.

---

## W5P7 — Privacy UI Audit + Activity Amount Masking ✅

**Completed**: current session (follows 3d7ea13)

### Problem
1. **"2 USDC" bug**: Overview "Recent Activity" showed `${r.amount} USDC` — wrong token label for private receipts.
2. **No amount masking**: Activity amounts (local receipts) were shown in plaintext with no option to hide.
3. **Wrong `encrypted` flag**: Only receipts WITHOUT an amount were marked `encrypted: true` — receipts WITH amounts were shown in normal text color as if public.

### Research finding (ERC-5564 UX patterns)
Reviewed Umbra.cash, nerolation.github.io, ERC-5564 spec.
**Key insight** (nerolation.github.io): Deterministic stealth key derivation via signed constant message → keys are derived every time, no storage needed. This is exactly what Obscura already implements. No change needed to key gen flow — the current StealthInboxV2 embedded setup is the correct approach.

Top apps (Umbra): `sign message → derive keys → publish on-chain` — same as Obscura's current flow. Auto-generation on wallet connect is the right UX and Obscura already does this in the inbox embedded setup. No further changes needed.

### Files fixed

| File | Change |
|------|--------|
| `src/components/harmony/PayHarmonyHome.tsx` | `"USDC"` → `"ocUSDC"` in activity label; `encrypted: true` for all activity items (not just those without amounts); `value: r.amount ? \`${r.amount} ocUSDC\` : null`; `showActivityAmounts` state (default: `false`); Eye/EyeOff reveal toggle in activity section header; activity row always shows `"••••• ocUSDC"` unless `showActivityAmounts` is true |
| `src/components/pay-v4/PaymentReceipt.tsx` | Added `useState` + `Eye`/`EyeOff`/`Lock` imports; `showAmount?: boolean` prop on `ReceiptRow`; Lock icon + `"••••• ocUSDC"` when hidden; `showAmounts` state (default: `false`) in `ReceiptList`; reveal/hide toggle button in receipt list header |

### Privacy posture after these changes

| Context | Before | After |
|---------|--------|-------|
| Recent Activity amount | `2 USDC` (plaintext, wrong label) | `••••• ocUSDC` by default, `2 ocUSDC` on reveal |
| Receipt list amount | `2 ocUSDC` (always plaintext) | `••••• ocUSDC` by default, `2 ocUSDC` on reveal |
| Balance (hero) | `• • • • • •` with Reveal ✅ | unchanged ✅ |
| Activity on-chain feed | no amounts shown ✅ | unchanged ✅ |
| PayHarmonySendBar ocUSDC | `reveal` button, no auto-decrypt ✅ | unchanged ✅ |

### Full privacy audit result
All remaining `USDC` occurrences in pay pages are correct — they refer to the PUBLIC Circle USDC token (bridge form, escrow form, plain balance display). No other privacy gaps found.

### Design pattern (session-level reveal toggle)
```tsx
const [showAmounts, setShowAmounts] = useState(false);
// In header:
<button onClick={() => setShowAmounts(v => !v)}>
  {showAmounts ? <EyeOff /> : <Eye />}
</button>
// In row:
{showAmounts && r.value ? r.value : "••••• ocUSDC"}
```
- `showAmounts` is session-only (not persisted) — resets on page refresh for maximum privacy
- Default is `false` (amounts hidden) — privacy-first default

### TypeScript errors
Zero errors in both changed files (`get_errors` confirmed clean).

---

## W5P8 — Settings Tabs Fix + E2E Test Suite ✅

**Completed**: commit `a684324`

### Bug fixed: PasskeyEnrollModal blank Smart Account tab

**Root cause**: `PasskeyEnrollModal` renders unconditionally when mounted — it has no internal `open` prop.
The old code was:
```tsx
<PasskeyEnrollModal open={enrollOpen} onOpenChange={setEnrollOpen} />
```
Both props are wrong: `open` is ignored, `onOpenChange` does not exist (`onClose` is the correct prop).
Since the component renders immediately, it covered the entire Settings page, making the tab appear blank.

**Fix**:
```tsx
{enrollOpen && <PasskeyEnrollModal onClose={() => setEnrollOpen(false)} />}
```
Wrap in a condition so the component is only mounted when the enroll button is clicked.

**PasskeyEnrollModal correct interface** (confirmed from source):
```tsx
interface Props { onClose: () => void; onSuccess?: () => void }
// NO `open` prop, NO `onOpenChange`
// Renders unconditionally — ALWAYS wrap in {condition && <PasskeyEnrollModal />}
```

### New Settings sub-tabs added

| Sub-tab key | Component | Hook |
|-------------|-----------|------|
| `notifications` | `SettingsNotificationsCard` | `useNotificationPrefs()` |
| `account` | `SettingsSmartAccountCard` | `useSmartAccount()` |

`HarmonySubNav` updated with:
- "Notifications" (Mail icon) at `notifications` key
- "Smart Account" (KeyRound icon) at `account` key

`SettingsSub` type extended: `"prefs" | "privacy" | "contacts" | "notifications" | "account" | "data" | "legacy"`

### New Supabase project (ACTIVE)

The backend was migrated to a NEW Supabase project (confirmed working via test suite):

| Field | Value |
|-------|-------|
| Project ID | `quoovjkjwgtdqwdofubh` |
| URL | `https://quoovjkjwgtdqwdofubh.supabase.co` |
| Anon key | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF1b292amtqd2d0ZHF3ZG9mdWJoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3MzA5NDQsImV4cCI6MjA5NTMwNjk0NH0.P_BJou89rzDWK-eIgUH3sd2TeV0GZB1WHBD35lSnWNg` |
| Tables | `obscura_activity`, `obscura_push_subscriptions`, `obscura_notification_prefs` — all HTTP 200 |
| Realtime | Publication configured (tables already in `supabase_realtime`) |

Previous project (`woqfefgrkpleedsuxavd` "veil-strike") is deprecated — use the new project.

### New backend URLs (production)

| Service | URL |
|---------|-----|
| API (relay + notifications) | `https://obscura-api-n62v.onrender.com` |
| Worker (indexer) | `https://obscura-worker-0ppj.onrender.com` |

Old `render.yaml` service names (`obscura-pay-relay`, `obscura-pay-notifications`, `obscura-pay-indexer`) are replaced
by `obscura-api` and `obscura-worker`.

### Service worker

- `frontend/obscura-os-main/public/sw.js` — created/confirmed. Handles: `push`, `notificationclick`, `install` (skipWaiting), `activate` (clients.claim)
- `src/main.tsx` — registers `/sw.js` on `window.load`
- Served at `https://obscura-os-nine.vercel.app/sw.js` — 2034 bytes, HTTP 200 (confirmed)

### E2E test suite

File: `scripts/test-e2e.ps1`
Run: `powershell -ExecutionPolicy Bypass -File .\scripts\test-e2e.ps1`

**Full results (this session)**:
```
[PASS] API /health  entryPoint=0x0000000071727De22E5E9d8BAf0edAc6f37da032
[PASS] Worker /health
[PASS] VAPID key present
[PASS] Table obscura_activity HTTP 200
[PASS] Table obscura_push_subscriptions HTTP 200
[PASS] Table obscura_notification_prefs HTTP 200
[WARN] obscura_activity empty (no on-chain events indexed yet)
[PASS] /prefs/0x000...001 404 (expected for unknown wallet)
[PASS] Frontend HTTP 200
[PASS] /sw.js 2034 bytes HTTP 200
PASS=9  WARN=1  FAIL=0
```

The single WARN (empty activity table) is expected — the worker needs `RPC_URL` + `SUPABASE_SERVICE_ROLE_KEY`
set in Render dashboard, and at least one on-chain transaction to index.

### Render secrets (set in dashboard, NOT render.yaml)

| Var | Service | Notes |
|-----|---------|-------|
| `RPC_URL` | obscura-worker | Arbitrum Sepolia RPC (Alchemy/Infura) |
| `SUPABASE_SERVICE_ROLE_KEY` | obscura-worker, obscura-api | Supabase Settings > API > service_role |
| `VAPID_PRIVATE_KEY` | obscura-api | Must match the public key `BIgVcwUhCL93WVMnDdRT...` |
| `BUNDLER_URL` | obscura-api | ERC-4337 bundler endpoint |
| `RESEND_API_KEY` | obscura-api | Email notifications (optional) |

### Vercel env vars (set in Vercel dashboard)

| Var | Value |
|-----|-------|
| `VITE_SUPABASE_URL` | `https://quoovjkjwgtdqwdofubh.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF1b292amtqd2d0ZHF3ZG9mdWJoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3MzA5NDQsImV4cCI6MjA5NTMwNjk0NH0.P_BJou89rzDWK-eIgUH3sd2TeV0GZB1WHBD35lSnWNg` |
| `VITE_RELAY_URL` | `https://obscura-api-n62v.onrender.com` |
| `VITE_NOTIFICATIONS_URL` | `https://obscura-api-n62v.onrender.com` |
| `VITE_SMART_ACCOUNT_FACTORY_ADDRESS` | `0xbe8dC1d4Dcc368e0dBb6c7A5BDFfac2Fe72AFd05` |
| `VITE_PAYMASTER_ADDRESS` | `0x9B1F61A65467F11339A8d0834349Be32EB2CF878` |

### Commits this session

| Commit | Change |
|--------|--------|
| `a684324` | Fix PasskeyEnrollModal blank tab bug + add Notifications/Smart Account settings tabs |

---

## W5P9 — Passkey P-256 Bug Fix + Modal Polish ✅

**Completed**: commits `eab0822` (modal redesign), `5c2b5d1` (key fix + backdrop)

### Root cause of passkey enrollment loop

**Symptom**: Browser shows "Passkey saved" ✓ but app immediately throws:
```
Invalid P-256 public key — expected 32-byte x/y coordinates
```
→ user stuck in loop; passkey exists in browser's password manager but not in our IndexedDB.

**Root cause**: `AuthenticatorAttestationResponse.getPublicKey()` returns the public key in
**SubjectPublicKeyInfo (SPKI/DER) format**, NOT COSE/CBOR. The old `parseCOSEPublicKey` was a
manual CBOR parser — it tried to read SPKI bytes as CBOR and failed because they have completely
different structure.

### Fix: Web Crypto SPKI extraction

Replaced the CBOR parser with a WebCrypto-native approach:

```typescript
async function extractP256XY(spkiBytes: ArrayBuffer): Promise<{ x: bigint; y: bigint }> {
  // Import the SPKI key using the Web Crypto API
  const cryptoKey = await crypto.subtle.importKey(
    "spki", spkiBytes,
    { name: "ECDSA", namedCurve: "P-256" },
    true,   // extractable
    ["verify"],
  );
  // Export as raw uncompressed point: 0x04 || x(32) || y(32) = 65 bytes
  const raw = new Uint8Array(await crypto.subtle.exportKey("raw", cryptoKey));
  return {
    x: BigInt(bytesToHex(raw.slice(1, 33))),
    y: BigInt(bytesToHex(raw.slice(33, 65))),
  };
}
```

Updated `registerPasskey` to call `await extractP256XY(pkBytes)` instead.

**Key insight**: `getPublicKey()` is WebAuthn Level 2 API that returns SPKI/DER (not COSE).
Never manually parse CBOR from `getPublicKey()` — use `importKey("spki")` + `exportKey("raw")`.

### Modal backdrop improved

Changed from heavy dark overlay `bg-black/40 backdrop-blur-sm` (takes full screen, looks bad)
to light tint `bg-foreground/10` (no blur). The modal itself is unchanged — just the backdrop
opacity/blur was reduced to let the underlying page show through clearly.

### Files changed

| File | Change |
|------|--------|
| `src/lib/passkey.ts` | Replaced `parseCOSEPublicKey` (CBOR) with `extractP256XY` (WebCrypto SPKI) |
| `src/components/harmony/PasskeyEnrollModal.tsx` | Backdrop: `bg-black/40 backdrop-blur-sm` → `bg-foreground/10` |

### Commits

| Commit | Change |
|--------|--------|
| `eab0822` | PasskeyEnrollModal redesign (bottom-sheet → centered dialog) |
| `5c2b5d1` | P-256 key extraction fix + lighter modal backdrop |

---

## W5P9.2 — Bundler 400 "callGasLimit undefined" fix ✅

**Completed**: commit `b4b667c`

### Bug

**Symptom**: Smart mode send → passkey signs → relay returns 400:
```
Bundler error: Validation error: Invalid input: expected string, received undefined at "params[0].userOp.callGasLimit"
```

### Root cause (two issues)

**Issue 1 — Relay forwarded packed on-chain struct to bundler's JSON-RPC endpoint**

The on-chain ERC-4337 v0.7 struct uses packed fields:
- `accountGasLimits` (bytes32): `verificationGasLimit(128-bit) | callGasLimit(128-bit)`
- `gasFees` (bytes32): `maxPriorityFeePerGas(128-bit) | maxFeePerGas(128-bit)`

But the bundler's `eth_sendUserOperation` JSON-RPC API expects the **unpacked** v0.7 format:
- `callGasLimit`, `verificationGasLimit`, `maxFeePerGas`, `maxPriorityFeePerGas` — as individual hex strings
- `factory` + `factoryData` instead of `initCode`
- `paymaster` + `paymasterVerificationGasLimit` + `paymasterPostOpGasLimit` + `paymasterData` instead of `paymasterAndData`

The relay was forwarding `op` (packed) directly → bundler couldn't find `callGasLimit` → 400.

**Fix** — added `unpackForBundler(op)` in `backend/obscura-api/src/relay.ts`:
```typescript
const gasLimits = BigInt(op.accountGasLimits);
const verificationGasLimit = toHex(gasLimits >> 128n);
const callGasLimit         = toHex(gasLimits & ((1n << 128n) - 1n));

const gasFeesVal = BigInt(op.gasFees);
const maxPriorityFeePerGas = toHex(gasFeesVal >> 128n);
const maxFeePerGas         = toHex(gasFeesVal & ((1n << 128n) - 1n));
// + initCode → factory/factoryData split
// + paymasterAndData → paymaster/paymasterVerificationGasLimit/paymasterPostOpGasLimit/paymasterData split
```

**Issue 2 — `paymasterAndData` byte order was reversed in frontend**

ERC-4337 v0.7 spec: `paymaster(20) + paymasterVerificationGasLimit(16) + paymasterPostOpGasLimit(16)`

Frontend was building: `paymaster(20) + postOpGasLimit(16) + verificationGasLimit(16)` (SWAPPED).

**Fix** in `frontend/obscura-os-main/src/lib/userop.ts`:
```typescript
// Before (wrong):
paymasterAndData = concat([PAYMASTER_ADDRESS, postOpGasBytes, verificationGasBytes]);
// After (correct):
paymasterAndData = concat([PAYMASTER_ADDRESS, verificationGasBytes, postOpGasBytes]);
```

### Files changed

| File | Change |
|------|--------|
| `backend/obscura-api/src/relay.ts` | Added `unpackForBundler()`, `BundlerUserOp` interface; `toHex` import; `sendToBundler` now uses unpacked format |
| `frontend/obscura-os-main/src/lib/userop.ts` | Fixed `paymasterAndData` byte order: verification before postOp |


---

## W5P9.1 — `atob` crash fix in signWithPasskey ✅

**Completed**: commit `00d0c23`

### Bug

**Symptom**: User selects Smart Mode → sends ocUSDC → MetaMask popup appears (expected: one-time operator approval) → user confirms → app throws:
```
Failed to execute 'atob' on 'Window': The string to be decoded is not correctly encoded.
```

### Root cause (two issues in `passkey.ts`)

**Issue 1 — Wrong base64url padding formula**

Old code:
```typescript
const padded = b64.replace(/-/g, "+").replace(/_/g, "/") + "==".slice((b64.length + 3) & 3);
```

The `& 3` formula produces wrong padding for non-multiples of 4:
| `length % 4` | Chars needed | Formula gives | Correct |
|---|---|---|---|
| 0 | 0 | `"==".slice(3)` = `""` | ✓ |
| 2 | 2 | `"==".slice(1)` = `"="` | ✗ (gave 1 instead of 2) |
| 3 | 1 | `"==".slice(2)` = `""` | ✗ (gave 0 instead of 1) |

A 32-byte hash encoded as base64url = 43 chars. `43 % 4 = 3` → needs `"="` but got `""` → `atob` received an unpadded string → crash.

**Fixed formula**:
```typescript
const base64 = b64.replace(/-/g, "+").replace(/_/g, "/");
const padded = base64 + "===".slice(0, (4 - base64.length % 4) % 4);
// (4 - len%4) % 4: 0→0, 2→2, 3→1  ✓
```

**Issue 2 — Unnecessary base64url round-trip**

Old `signWithPasskey`:
```typescript
const hashBytes = base64urlToBytes(
  bytesToBase64url(Uint8Array.from(hash.slice(2).match(/.{2}/g)!.map(...)))
);
```
hex → bytes → base64url → `atob()` → bytes: the `atob` call is what failed.

Fixed — decode hex directly, no round-trip:
```typescript
const hashBytes = Uint8Array.from(hash.slice(2).match(/.{2}/g)!.map((b) => parseInt(b, 16)));
```

### Expected UX after fix

1. Smart Mode selected → Send clicked
2. FHE encrypt runs
3. **First send only**: MetaMask popup (EOA approves smart account as FHERC20 operator) — expected, one-time
4. User confirms MetaMask
5. **Passkey prompt appears** (browser biometric) — was crashing before fix
6. User approves passkey → UserOp submitted via bundler
7. Transfer completes — no more MetaMask after step 3

### File changed

| File | Change |
|------|--------|
| `src/lib/passkey.ts` | Fix `base64urlToBytes` padding formula; remove `atob` round-trip in `signWithPasskey` |


---

## W5P9.3 — AA33 Paymaster TargetNotWhitelisted Fix ✅

**Completed**: current session — script `contracts-hardhat/scripts/addPaymasterWhitelist.ts`

### Bug

**Symptom**: Smart mode send (passkey enrolled, operator approved) → relay submits UserOp → bundler returns:
```
AA33 reverted: 0x47ccabe7000000000000000000000000ed46020df8abe7bb1e096f27d089f4326d223a53
```
Error selector `0x47ccabe7` = `TargetNotWhitelisted(address)` from `ObscuraPaymaster.sol`.

### Root cause

`ObscuraPaymaster.validatePaymasterUserOp` extracts the call target from
`UserOp.callData` (reading the first argument of `execute(address,uint256,bytes)`
selector `0xb61d27f6`), then checks `whitelistedTargets[callTarget]`.

The paymaster was deployed and initially configured in `deploySmartAccount.ts`
with 10 whitelisted contracts — **but `ocUSDC_Pay` was NOT included**.
Additionally, three Wave 5 v3 contracts (PayStreamV3, InsuranceSubscriptionV2,
PayrollResolverV3) replaced their v2 predecessors after the paymaster was already
deployed, so they were also absent from the whitelist.

### Fix

Script `contracts-hardhat/scripts/addPaymasterWhitelist.ts` calls `whitelistTarget(addr, true)`
from the governance wallet for each missing contract. All 4 transactions confirmed on Arbitrum Sepolia.

### Contracts whitelisted (on-chain, confirmed)

| Contract | Address |
|----------|---------|
| `ocUSDC_Pay` | `0xEd46020Df8abe7BB1E096f27d089F4326D223a53` |
| `ObscuraPayStreamV3` | `0xE4328F139F03138D63f7fdF90A8Ef240e04653fA` |
| `ObscuraInsuranceSubscriptionV2` | `0xEA9Fc5800F41d090dFB90f9735F4CF3824d6743D` |
| `ObscuraPayrollResolverV3` | `0xB077c231448EF2252060E4B4dD404078DBD94180` |

Governance wallet: `0xD208aC8327e6479967693Af2F2216e1612D0171A`
Paymaster: `0x9B1F61A65467F11339A8d0834349Be32EB2CF878`

### How to add future contracts

Run: `npx hardhat run scripts/addPaymasterWhitelist.ts --network arb-sepolia`
(script is idempotent — skips already-whitelisted targets).

Or add to `TO_WHITELIST` array and rerun. Must be called from governance wallet.

---

## W5P9.4 — AA24 WebAuthn Signature Fix ✅

**Completed**: current session — final factory `0xFaC683D8AB872cCf5eBfaE1659a9CD44C6FB4feB`

### Bug

**Symptom**: Smart Mode direct ocUSDC send shows the browser passkey prompt; after user clicks Continue, relay returns:
```
Relay error 400: {"error":"Bundler error: UserOperation reverted with reason: AA24 signature error"}
```

### Root cause

The old smart account treated passkey signatures as raw P-256 signatures over `userOpHash`:
```solidity
_validateP256(userOpHash, sig[1:65])
```

Browser WebAuthn never signs the raw challenge. It signs:
```
sha256(authenticatorData || sha256(clientDataJSON))
```
where `clientDataJSON.challenge` contains `base64url(userOpHash)`. The frontend was returning only `0x01 || r || s`, so the contract verified the wrong digest and EntryPoint rejected with AA24.

### Fix

`src/lib/passkey.ts` now returns:
```
0x01 || abi.encode(bytes authenticatorData, bytes clientDataJSON, uint256 challengeOffset, bytes32 r, bytes32 s)
```

`ObscuraSmartAccount.sol` now:
- decodes the WebAuthn assertion payload
- verifies `clientDataJSON` starts with `{"type":"webauthn.get"`
- verifies exact challenge match: `base64url(userOpHash)` followed by closing quote
- requires the WebAuthn User Present flag in `authenticatorData`
- verifies RIP-7212 P-256 over `sha256(authenticatorData || sha256(clientDataJSON))`

### Deployment

Old clones are immutable EIP-1167 accounts, so contract logic required a new factory.

| Contract | Address |
|----------|---------|
| Old raw-hash factory | `0xbe8dC1d4Dcc368e0dBb6c7A5BDFfac2Fe72AFd05` |
| New WebAuthn factory | `0xFaC683D8AB872cCf5eBfaE1659a9CD44C6FB4feB` |
| New implementation | `0x0415945e442C4C5533367Fbb6f0D40528e0D7809` |
| Existing paymaster | `0x9B1F61A65467F11339A8d0834349Be32EB2CF878` |

Deploy script: `contracts-hardhat/scripts/deploySmartAccountFactoryWebAuthn.ts`.
Frontend `.env`: `VITE_SMART_ACCOUNT_FACTORY_ADDRESS=0xFaC683D8AB872cCf5eBfaE1659a9CD44C6FB4feB`.
Frontend guard: `src/config/smartAccount.ts` falls back to the final WebAuthn factory if Vercel/local env still contains a known deprecated factory (`0xbe8d...` raw-hash or `0x1736...` loose-challenge).

### User migration note

Existing smart accounts from the old factory cannot be upgraded. Users must deploy a smart account from the new factory. The frontend now reuses the stored passkey when deploying against a new factory, so users do not need a duplicate passkey unless they choose to re-enroll.

### Verification

- `npx hardhat compile` ✅
- `npx hardhat test test/ObscuraSmartAccount.test.ts` → 40 passing ✅
- `npm run build` in `frontend/obscura-os-main` ✅

---

## W5P9.5 — Smart Mode MetaMask Popup Routing Fix ✅

**Completed**: current session — fixes direct ocUSDC send opening MetaMask after Smart Account enrollment.

### Bug

**Symptom**: user enrolls/deploys the new WebAuthn smart account, selects Smart Mode, then sends direct ocUSDC. Instead of the device passkey prompt, MetaMask opens against the Pay ocUSDC contract (`0xEd46020Df8abe7BB1E096f27d089F4326D223a53`).

### Root cause

This was not another AA24 contract failure. The frontend had two Smart Mode UX/routing problems:

1. `useOcUSDCTransfer()` treated Smart Mode as smart only when its own local `useSmartAccount()` instance had already loaded `accountAddress + isDeployed`. If that local hook was still loading, it silently used the EOA `writeContractAsync()` path, which opens MetaMask.
2. For EOA-held ocUSDC, the smart account must be approved once as an FHERC20 operator before it can call `confidentialTransferFrom(owner, to, encryptedAmount)`. That required wallet approval was happening inside the send step with no explicit setup/status, so it looked like the direct transfer was bypassing passkey.

### Fix

Frontend changes:

| File | Change |
|------|--------|
| `src/hooks/useSmartAccount.ts` | `sendUserOp()` now re-resolves the passkey smart account from the factory if local hook state is stale; `deploy()` returns the smart account address. |
| `src/hooks/useUnifiedWrite.ts` | Smart Mode no longer silently falls back to EOA. If smart account is not ready, it throws a setup error instead of opening MetaMask. |
| `src/hooks/useOcUSDCTransfer.ts` | Direct ocUSDC Smart Mode now uses PaymentMode context as source of truth and never routes to EOA when Smart Mode is selected. Exposes `checkIsOperator()` and `approveSmartOperator()`. |
| `src/components/pay-v4/UnifiedSendForm.tsx` | Direct and stealth sends now treat Smart Mode as mandatory once selected; no EOA fallback. Progress copy calls out the one-time ocUSDC authorization if missing. |
| `src/components/harmony/PasskeyEnrollModal.tsx` | Enrollment now performs the one-time ocUSDC smart-send operator authorization after deploying the smart account. Future sends should go directly to passkey. |
| `src/pages/PayPage.tsx` | Smart Account settings now show `ocUSDC smart sends: Enabled / Needs approval` and provide an `Enable ocUSDC smart sends` button for already-deployed accounts. |
| `src/components/harmony/PaymentModeBar.tsx` | Smart Mode copy clarified: passkey/gasless behavior applies after one-time ocUSDC authorization. |

### Expected behavior after this fix

- New Smart Account setup: passkey enrollment/deploy happens, then one wallet confirmation may appear for `setOperator(smartAccount, expiry)` on Pay ocUSDC.
- After `ocUSDC smart sends` is enabled, direct Smart Mode sends should show the device passkey prompt and submit through the relay/paymaster.
- If Smart Mode is selected but the smart account is not ready, the app stops with a setup error instead of opening MetaMask as a fallback.
- Existing users who already deployed the new factory account can go to Settings → Smart Account and click `Enable ocUSDC smart sends` once.

### Verification

- Editor diagnostics: no errors in touched Smart Mode/send files ✅
- `npm run build` in `frontend/obscura-os-main` ✅ (`✓ built in 46.90s`)

---

## W5P9.6 — UserOp Priority Fee Fix ✅

**Completed**: current session — fixes relay error after passkey prompt:

```
Relay error 400: {"error":"Bundler error: maxPriorityFeePerGas must be at least 120000 (current maxPriorityFeePerGas: 0) - use pimlico_getUserOperationGasPrice to get the current gas price"}
```

### Root cause

Smart Mode routing and WebAuthn signature verification were working: the user saw the passkey prompt, then the relay submitted a signed UserOp. The bundler rejected the signed UserOp because `src/lib/userop.ts` built `gasFees` from `publicClient.estimateFeesPerGas()`. On Arbitrum Sepolia that RPC path can return `maxPriorityFeePerGas = 0n`; the old nullish fallback did not catch real zero values.

This is **not** a paymaster funding/private-key problem. The paymaster deposit pays sponsored UserOps after bundler validation. This error happens earlier because the signed UserOp gas field itself is invalid.

### Fix

| File | Change |
|------|--------|
| `frontend/obscura-os-main/src/lib/userop.ts` | Before signing, fetches `/userop-gas-price` from the relay and packs non-zero UserOp gas fees. Local RPC fallback now clamps `maxPriorityFeePerGas >= 120000` and ensures `maxFeePerGas >= maxPriorityFeePerGas`. Also corrected stale `paymasterAndData` comment. |
| `backend/obscura-api/src/relay.ts` | Added `GET /userop-gas-price`, which calls `pimlico_getUserOperationGasPrice` on configured bundlers and normalizes the result. If bundlers do not expose the method, it returns a safe fallback with the same non-zero minimum. |

### Gas sponsorship note

Do **not** use the frontend wallet or private key to pay every Smart Account user transaction. The model is:

1. Governance/deployer key funds `ObscuraPaymaster` EntryPoint deposit when needed.
2. User signs UserOps with passkey.
3. Paymaster sponsors whitelisted Obscura Pay calls from its EntryPoint deposit.

Only top-ups or deployments should use the private deployer key. The per-user transaction path should remain passkey + relay + paymaster.

### Verification

- Editor diagnostics: no errors in `src/lib/userop.ts` or `backend/obscura-api/src/relay.ts` ✅
- `npm run build` in `frontend/obscura-os-main` ✅ (`✓ built in 14.05s`)
- `npm run build` in `backend/obscura-api` ✅

---

## W5P9.7 — UserOp preVerificationGas Fix ✅

**Completed**: current session — fixes relay error after passkey prompt:

```
Relay error 400: {"error":"Bundler error: preVerificationGas is not enough, required: 67500, got: 50000"}
```

### Root cause

The passkey/WebAuthn route was working and the UserOp reached the bundler, but `frontend/obscura-os-main/src/lib/userop.ts` still used a hard-coded `PRE_VERIFICATION = 50_000n`.

That was too low for the real v0.7 UserOp calldata size, especially after the WebAuthn fix made signatures much larger:

```
0x01 || abi.encode(bytes authenticatorData, bytes clientDataJSON, uint256 challengeOffset, bytes32 r, bytes32 s)
```

Pimlico docs confirm the correct path is `eth_estimateUserOperationGas`, which returns `preVerificationGas` for the UserOperation. Docs also note the signature can be dummy for estimation as long as it is well-formed, because many account implementations require a correctly shaped signature payload.

### Fix

| File | Change |
|------|--------|
| `frontend/obscura-os-main/src/lib/userop.ts` | Raised fallback `PRE_VERIFICATION` from `50_000n` to `100_000n`; added a well-formed dummy WebAuthn signature; calls the relay `/estimate-userop-gas` endpoint before passkey signing; applies a 20% safety margin to returned gas fields; signs only after final gas fields are set. |
| `backend/obscura-api/src/relay.ts` | Added `POST /estimate-userop-gas`; relay unpacks the v0.7 packed UserOp and calls bundler `eth_estimateUserOperationGas`; tries primary bundler then fallback. |

### Why this must happen before passkey signing

`preVerificationGas`, `accountGasLimits`, `gasFees`, and `paymasterAndData` are all part of the signed ERC-4337 UserOp hash. The relay must not mutate them after the passkey signature is produced or AA24/signature validation will fail again.

Correct flow now:

1. Build unsigned UserOp with conservative initial gas fields.
2. Attach well-formed dummy WebAuthn signature for estimation only.
3. Relay calls `eth_estimateUserOperationGas` using the unpacked v0.7 UserOp.
4. Frontend applies returned gas values + safety margin.
5. Frontend computes final UserOp hash.
6. User approves passkey once for the final hash.
7. Relay submits the signed UserOp unchanged.

### Fallback behavior

If production relay is not yet deployed or bundler estimation is unavailable, frontend still uses the new `100_000n` preVerificationGas floor, which is above the observed required `67_500`.

### Verification

- Editor diagnostics: no errors in `frontend/obscura-os-main/src/lib/userop.ts` or `backend/obscura-api/src/relay.ts` ✅
- `npm run build` in `frontend/obscura-os-main` ✅ (`✓ built in 13.86s`)
- `npm run build` in `backend/obscura-api` ✅

---

## W5P9.8 — AA False Success + CoFHE InvalidSigner Fix ✅

**Completed**: current session — fixes the case where the UI showed `Payment sent`, but Arbiscan showed the Account Abstraction transaction failed and the ocUSDC balance stayed unchanged.

### Observed failed transaction

| Field | Value |
|------|-------|
| AA / UserOp hash | `0x609482501566a699b5156c84a12fd0be1cb7ce32fd74827175b2e801f234fd18` |
| Bundle tx hash | `0xb83a874899ea4f686a9cbafd5d15c8b4a3371128e901476d0a72fe1a72943511` |
| Bundle tx status | Success (`status: 0x1`) |
| UserOp execution | Failed (`success=false` in EntryPoint AA event / Arbiscan AA page) |
| Revert selector | `0x7ba5ffb5` = CoFHE `InvalidSigner(address,address)` |

### Root cause 1 — UI treated bundler acceptance as payment success

`frontend/obscura-os-main/src/lib/userop.ts` returned success immediately after `eth_sendUserOperation` returned a `userOpHash`.

That only means the bundler accepted the UserOp. It does **not** mean the target call succeeded. EntryPoint can later emit a failed UserOperation while the bundle transaction itself still has status `0x1`.

This caused:

1. Relay accepted UserOp.
2. Frontend returned hash.
3. `UnifiedSendForm` saved a local receipt.
4. UI showed `Payment sent`.
5. EntryPoint execution actually failed, so balance stayed unchanged.

### Root cause 2 — encrypted ocUSDC sends cannot be forwarded through the Smart Account

The direct Smart Mode path called:

```typescript
smartAccount.execute(
  ocUSDC,
  0,
  confidentialTransferFrom(eoa, recipient, InEuint64)
)
```

But `InEuint64` proofs are signed/authorized by the connected wallet. When the token consumes the encrypted input, the immediate caller is the Smart Account, not the EOA, so CoFHE rejects it with:

```
InvalidSigner(address,address) selector 0x7ba5ffb5
```

This is the same forwarding restriction already documented in:

- `contracts-hardhat/contracts/ObscuraConfidentialEscrow.sol`
- `frontend/obscura-os-main/src/config/payV3.ts`

Operator approval (`setOperator`) is not enough. It authorizes the Smart Account to spend, but it does not make the EOA-signed encrypted proof valid when forwarded by the Smart Account.

### Fix

| File | Change |
|------|--------|
| `backend/obscura-api/src/relay.ts` | Added `GET /userop-receipt/:userOpHash`, which calls bundler `eth_getUserOperationReceipt`. |
| `frontend/obscura-os-main/src/lib/userop.ts` | `submitUserOp()` now polls the relay for the actual UserOperation receipt and throws if `success !== true`; special-cases `0x7ba5ffb5` with a clear encrypted-send message. |
| `frontend/obscura-os-main/src/hooks/useOcUSDCTransfer.ts` | Blocks Smart Mode encrypted ocUSDC transfer before submission; EOA path now waits for receipt before `READY`. |
| `frontend/obscura-os-main/src/components/pay-v4/UnifiedSendForm.tsx` | Shows a Smart Mode warning on encrypted send review, disables Send while Smart Mode is active, and provides a `Use Wallet Mode` button. |
| `frontend/obscura-os-main/src/components/harmony/PasskeyEnrollModal.tsx` | Removed misleading one-time ocUSDC operator approval during passkey enrollment. |
| `frontend/obscura-os-main/src/pages/PayPage.tsx` | Replaced `ocUSDC smart sends` status with `Encrypted ocUSDC sends: Wallet Mode`. |
| `frontend/obscura-os-main/src/components/harmony/PaymentModeBar.tsx` + `PayHarmonyHome.tsx` | Updated Smart Mode copy to `supported actions`; no longer promises gasless encrypted ocUSDC transfers. |

### Current rule

Smart Mode/passkey is valid for supported non-FHE-forwarding actions. Encrypted ocUSDC sends that consume `InEuint64` must use Wallet Mode until a future contract architecture can consume the encrypted proof without forwarding it through the Smart Account.

The private deployer key/paymaster cannot fix this. It is not a funding problem; it is an encrypted input signer/caller constraint.

### Verification

- Bundle receipt inspected through Arbitrum Sepolia RPC ✅
- Editor diagnostics: no errors in touched frontend/backend files ✅
- `npm run build` in `frontend/obscura-os-main` ✅ (`✓ built in 15.43s`)
- `npm run build` in `backend/obscura-api` ✅

---

## W5P10 — Smart Mode Full Routing (All Pay Features) ✅

**Completed**: commits `1ac0a5d` (UI toggle), `fdb83fa` (all components fixed)

### Problem
PaymentModeBar toggle built in prior session, but every feature still opened MetaMask in Smart Mode.
Root cause: every hook/component called `writeContractAsync` directly from `useWriteContract`, bypassing `useSmartAccount` entirely.

### Solution architecture

#### `useUnifiedWrite.ts` — rewritten to dynamic callable API

```typescript
export function useUnifiedWrite() {
  const { write } = useUnifiedWrite();
  // Dynamic call (no static opts at hook init):
  const hash = await write({
    abi, address, functionName, args, gas?,
    mode?: "eoa" | "smart-account"  // override mode; default = PaymentModeContext
  });
}
```

- Smart path: `encodeFunctionData(...)` → `sendUserOp(target, callData, value?)`
- EOA path: `writeContractAsync({ abi, address, functionName, args, account: eoaAddress, chain: arbitrumSepolia, gas })`
- Mode check: `opts.mode` override → else `contextMode === "smart"`
- Smart active: `isDeployed && !!accountAddress`

#### `useOcUSDCTransfer.ts` — FHE operator approval pattern

FHERC20 `confidentialTransfer(to, enc)` can ONLY be called by the token holder (EOA).
Smart account cannot call it directly.

**Solution**: EOA approves smart account as operator (one-time MetaMask), then smart account calls `confidentialTransferFrom(eoaAddr, to, enc)`.

```typescript
// One-time setup (one MetaMask popup)
const approveSmartOperator = async (smartAddr: Address) => {
  const expiry = BigInt(Math.floor(Date.now() / 1000) + 365 * 24 * 3600);
  const hash = await writeContractAsync({
    address: OBSCURA_PAY_OCUSDC_ADDRESS, abi: CONFIDENTIAL_TOKEN_ABI,
    functionName: 'setOperator', args: [smartAddr, expiry],  // expiry is uint48
    account: address, chain: arbitrumSepolia
  });
  await publicClient.waitForTransactionReceipt({ hash });
};

// Check before each send (read-only)
const checkIsOperator = async (smartAddr: Address): Promise<boolean> => {
  return await publicClient.readContract({
    address: OBSCURA_PAY_OCUSDC_ADDRESS, abi: CONFIDENTIAL_TOKEN_ABI,
    functionName: 'isOperator', args: [address, smartAddr],  // (holder, spender)
  }) as boolean;
};

// Smart transfer via sendUserOp
const callData = encodeFunctionData({
  abi: CONFIDENTIAL_TOKEN_ABI,
  functionName: 'confidentialTransferFrom',
  args: [address, to, encryptedInputs[0]]  // (from=EOA, to, InEuint64)
}) as Hex;
await sendUserOp(OBSCURA_PAY_OCUSDC_ADDRESS, callData);
```

**Critical ABI facts**:
- `isOperator(holder: address, spender: address) → bool` — args: holder=EOA, spender=smartAccount
- `setOperator(operator: address, until: uint48)` — uint48 not uint256
- `confidentialTransferFrom(from: address, to: address, encryptedAmount: InEuint64)`

#### StakePoolForm.tsx — operator approval is always EOA

For `setOperator` in stake flow, use `mode: "eoa"` override to force EOA even in smart mode:
```typescript
await write({ ..., functionName: "setOperator", mode: "eoa" });
```
This prevents the smart account from trying to approve itself as its own operator.

### Files changed

| File | Commits | Change |
|------|---------|--------|
| `src/hooks/useUnifiedWrite.ts` | `1ac0a5d` | Rewritten: static-opts init → dynamic `write(opts)` callable |
| `src/hooks/useOcUSDCTransfer.ts` | `1ac0a5d` | Smart mode + `checkIsOperator` + `approveSmartOperator` + `confidentialTransferFrom` path |
| `src/components/pay-v4/UnifiedSendForm.tsx` | `1ac0a5d` | Direct send, stealth transfer, announce, retryAnnounce — all smart-mode aware |
| `src/contexts/PaymentModeContext.tsx` | prior | Global `wallet | smart` mode, `usePaymentMode()` |
| `src/components/harmony/PaymentModeBar.tsx` | prior | UI toggle: Wallet Mode / Smart Mode segmented control |
| `src/components/pay-v4/StreamList.tsx` | `fdb83fa` | 3 `writeContractAsync` calls → `write()` from `useUnifiedWrite` |
| `src/components/pay-v4/ResolverManager.tsx` | `fdb83fa` | 2 `writeContractAsync` calls → `write()` from `useUnifiedWrite` |
| `src/components/pay-v4/AuditorGrantPanel.tsx` | `fdb83fa` | 1 `writeContractAsync` call → `write()` from `useUnifiedWrite` |
| `src/components/pay-v4/StakePoolForm.tsx` | `fdb83fa` | 2 calls → `write()`; `setOperator` uses `mode: "eoa"` |

### User experience after these changes

| Feature | EOA mode | Smart mode |
|---------|----------|-----------|
| Direct send (ocUSDC) | MetaMask | Passkey (after first-time operator approval) |
| Stealth transfer | MetaMask | Passkey |
| Stealth announce | MetaMask | Passkey |
| Stream pause/cancel/resume | MetaMask | Passkey |
| Payroll approve/cancel cycle | MetaMask | Passkey |
| Auditor grant | MetaMask | Passkey |
| Stake to pool | MetaMask (always — operator approval) | Passkey for stake tx only |

**First send in smart mode**: One MetaMask popup (EOA approves smart account as FHERC20 operator). All subsequent sends use passkey — no MetaMask.

### Build result
`✓ build succeeded` — zero TypeScript errors, all chunk size warnings are expected.

---

## W5P11 — Dual Public/Private Pay Architecture ✅

**Completed**: current session — replaces the stale W5P10 encrypted-smart routing assumption with a strict mode split.

### Architecture decision

Obscura Pay now has two separate payment lanes:

| Mode | Token | Execution | UX promise |
|------|-------|-----------|------------|
| Public Mode | public `USDC` | Smart Account / ERC-4337 / passkey / paymaster | Fast, gasless, passkey |
| Private Mode | encrypted `ocUSDC` | Wallet / EOA FHE transactions | Encrypted, hidden, wallet-secured |

Critical rule: encrypted `ocUSDC` flows must not route through the Smart Account. CoFHE encrypted input proofs are bound to the immediate caller, so forwarding `InEuint64` through `smartAccount.execute(...)` fails with `InvalidSigner(address,address)`.

### Frontend behavior

- `PaymentModeContext` now stores `privacyMode: "public" | "private"` in `obscura:payPrivacyMode`.
- Legacy `mode: "wallet" | "smart"` remains for older hooks:
  - Private Mode always resolves to `wallet`.
  - Public Mode resolves to `smart` only when passkey + smart account are ready.
- `PaymentModeBar` is now a Public/Private segmented switch:
  - Public = fast, gasless, passkey.
  - Private = encrypted, hidden, wallet-secured.
- Smart-account readiness is broadcast with `obscura:smartAccountRefresh` so separate `useSmartAccount()` hook instances update after deployment.

### Public Mode

- New `PublicUSDCSendForm` sends normal USDC from the user's smart account.
- Supports single public USDC transfer via `sendUserOp(USDC, transfer(to, amount))`.
- Supports batch public transfers via `sendBatchUserOp([...])`, which encodes `executeBatch(address[],uint256[],bytes[])`.
- Shows wallet USDC balance, smart-account USDC balance, funding action from wallet to smart account, passkey setup state, and paymaster USDC whitelist status.
- Public receive surface shares smart-account address and wallet address.
- Public automations surface exposes gasless batch USDC transfers.

### Private Mode preserved

All existing private Pay features stay wallet/FHE:

- shield / unshield,
- direct and stealth ocUSDC send,
- stealth inbox / sweep / registration,
- escrows,
- invoices,
- streams,
- subscriptions,
- payroll,
- insurance / coverage / staking,
- auditor grants and legacy ocUSDC tools.

Public Mode routes private-only screens to clear switch-to-Private callouts instead of attempting Smart Account execution.

### Paymaster support

`ObscuraPaymaster` now validates both:

- `execute(address,uint256,bytes)` — one target must be whitelisted.
- `executeBatch(address[],uint256[],bytes[])` — every target must be whitelisted.

New deployment helper: `contracts-hardhat/scripts/deployPublicPaymasterV2.ts` deploys a paymaster with batch validation, funds it, whitelists public USDC plus active Pay targets, and updates `deployments/<network>.json`.

Updated `deploySmartAccount.ts` whitelist includes public USDC and current active Wave 4/5 Pay contracts.

### Files changed

| File | Change |
|------|--------|
| `frontend/obscura-os-main/src/contexts/PaymentModeContext.tsx` | Privacy mode store + legacy execution derivation |
| `frontend/obscura-os-main/src/components/harmony/PaymentModeBar.tsx` | Public/Private switch |
| `frontend/obscura-os-main/src/components/pay-v4/PublicUSDCSendForm.tsx` | New public USDC single/batch Smart Account send UI |
| `frontend/obscura-os-main/src/pages/PayPage.tsx` | Mode-aware Pay/Get Paid/Automations/Activity/Settings routing and private gates |
| `frontend/obscura-os-main/src/components/harmony/PayHarmonyHome.tsx` | Dual-lane onboarding and overview copy |
| `frontend/obscura-os-main/src/components/harmony/PayHarmonyTabShell.tsx` | Mode-aware tab descriptions and balance bar |
| `frontend/obscura-os-main/src/hooks/useSmartAccount.ts` | `sendBatchUserOp`, bundle tx return, cross-hook refresh event |
| `frontend/obscura-os-main/src/lib/userop.ts` | Pre-encoded account calldata support for batch UserOps |
| `frontend/obscura-os-main/src/config/pay.ts` | Public USDC ERC20 `transfer` + `allowance` ABI |
| `frontend/obscura-os-main/src/hooks/useOcUSDCTransfer.ts` | Guard copy changed to Private Mode terminology |
| `frontend/obscura-os-main/src/components/pay-v4/UnifiedSendForm.tsx` | Private fallback copy changed to Private Mode |
| `frontend/obscura-os-main/src/components/pay-v4/StreamList.tsx` | Removed duplicate `toast` import that blanked dev mode |
| `contracts-hardhat/contracts/SmartAccount/ObscuraPaymaster.sol` | Batch target whitelist validation |
| `contracts-hardhat/test/ObscuraSmartAccount.test.ts` | Paymaster execute + executeBatch sponsorship tests |
| `contracts-hardhat/scripts/deploySmartAccount.ts` | Refreshed whitelist targets |
| `contracts-hardhat/scripts/deployPublicPaymasterV2.ts` | New paymaster-v2 deployment script |

### Verification

- Editor diagnostics on modified files: clean ✅
- Frontend build: `npm run build` in `frontend/obscura-os-main` ✅
- Frontend tests: `npm run test` in `frontend/obscura-os-main` ✅ (`1 passed`)
- Backend build: `npm run build` in `backend/obscura-api` ✅
- Contracts compile: `npx hardhat compile` in `contracts-hardhat` ✅
- Targeted Smart Account/Paymaster tests: `npx hardhat test test/ObscuraSmartAccount.test.ts` ✅ (`44 passing`)
- Browser smoke test: Vite dev server rendered `/pay`; no page errors after removing duplicate `toast`; localStorage mode flip showed Public passkey / Private wallet posture ✅

Full `npx hardhat test` result: `118 passing, 5 failing`. Failures are pre-existing and unrelated to W5P11:

- `ObscuraCreditScore` artifact missing; test likely needs `ObscuraCreditScoreV2`.
- `ObscuraPayrollResolver` artifact missing; available contracts are V2/V3.
- Three legacy `ObscuraPay.grantAuditAccess` tests revert inside CoFHE mock `FHE.allow`.

### Deployment status / limitations

- Paymaster v2 deployed on Arbitrum Sepolia: `0x7a8D880D9c5F88Ba8bd4435c450256628F66dd0C`.
- Funded paymaster v2 with `0.15 ETH` EntryPoint deposit. Funding tx: `0xb6f1c213fecc70b3c185863f8bd59552efdee0181ddcdbf2b543dc9acb894e9b`.
- Whitelisted public USDC and all active Pay targets on the new paymaster.
- Updated `contracts-hardhat/deployments/arb-sepolia.json` and local `frontend/obscura-os-main/.env` `VITE_PAYMASTER_ADDRESS` to the new paymaster.
- Old paymaster `0x9B1F61A65467F11339A8d0834349Be32EB2CF878` remains obsolete for Public batch sponsorship because it only validates single `execute(...)` calls.
- Final frontend build after `.env` update passed: `✓ built in 14.30s`.
- Manual wallet-connected verification is still required on Arbitrum Sepolia:
  1. Private Mode shield/reveal/send/stealth/stream/escrow flows still work with wallet prompts.
  2. Public Mode passkey setup works.
  3. Funding smart account with public USDC works.
  4. Public single USDC send succeeds after USDC target whitelist/paymaster v2.
  5. Public batch send succeeds after paymaster v2 deployment.

---

## W5P12 — Public Mode WebAuthn preVerificationGas Fix ✅

**Completed**: current session — fixes the live Public Mode USDC send failure after accepting the passkey prompt.

### User-reported failure

Public Mode flow reached passkey signing, then relay submission failed with:

```
Relay error 400: {"error":"Bundler error: preVerificationGas is not enough, required: 362979, got: 120000"}
```

### Root cause

`preVerificationGas` was still using a `100_000` fallback plus the shared 20% gas margin, producing the signed value `120_000` whenever the bundler estimate was low or unavailable. WebAuthn + ERC-4337 + paymaster UserOps on Arbitrum Sepolia need substantially more pre-verification gas because the passkey signature payload, paymaster data, and calldata are all charged before execution.

Important: `preVerificationGas` is part of the signed UserOp hash, so it must be set correctly before the passkey prompt. The relay cannot safely bump it after signing.

### Fix

| File | Change |
|------|--------|
| `frontend/obscura-os-main/src/lib/userop.ts` | Raised the public UserOp pre-verification floor from `100_000` to `500_000` |
| `frontend/obscura-os-main/src/lib/userop.ts` | Added a dedicated `withPreVerificationMargin()` helper using a 40% margin for bundler estimates |
| `frontend/obscura-os-main/src/lib/userop.ts` | Switched pre-verification assignment to `maxPreVerificationGas(...)` so low estimates cannot sign under-gassed UserOps |

### Expected behavior

- Public Mode funding is unchanged: wallet sends normal USDC to the smart account.
- Public Mode USDC send still uses passkey + paymaster sponsorship.
- Signed UserOps now carry at least `500000` `preVerificationGas`, covering the observed `required: 362979` failure.
- Private Mode ocUSDC/FHE wallet execution remains untouched.

### Verification

- Editor diagnostics on `src/lib/userop.ts`: clean ✅
- Frontend build: `npm run build` in `frontend/obscura-os-main` ✅ (`✓ built in 55.42s`)
- Frontend tests: `npm run test` in `frontend/obscura-os-main` ✅ (`1 passed`)

### Deployment note

This is a frontend-only fix. Backend relay and contracts do not need changes. The local dev build includes the fix immediately; hosted Vercel needs a redeploy from the updated frontend code.

---

## W5P13 — True Mode-Specific Pay Surfaces ✅

**Completed**: current session — turns Public/Private Mode from a visual toggle into real product surfaces across Pay.

### Product architecture locked in

| Mode | Token | Execution | UX surface |
|------|-------|-----------|------------|
| Private Mode | `ocUSDC` | Wallet / EOA FHE writes | Default mode, encrypted balances, stealth inbox, streams, escrows, subscriptions, payroll, private receipts |
| Public Mode | normal `USDC` | Smart Account / ERC-4337 / passkey / paymaster | Visible USDC workspace, smart account funding, passkey sends, sponsored UserOps, public receipts |

Critical rule preserved: encrypted `ocUSDC` transfers are never routed through the Smart Account because CoFHE signer binding rejects forwarded `InEuint64` flows (`InvalidSigner`, selector `0x7ba5ffb5`). Public Mode is the gasless normal-USDC lane only.

### What changed

| File | Change |
|------|--------|
| `frontend/obscura-os-main/src/lib/payModeFilters.ts` | New centralized mode classifier for local receipts and indexed activity |
| `frontend/obscura-os-main/src/contexts/PaymentModeContext.tsx` | First load now defaults to Private Mode unless an explicit `obscura:payPrivacyMode` exists |
| `frontend/obscura-os-main/src/hooks/useUSDCBalance.ts` | Accepts optional account address so wallet USDC and Smart Account USDC can display separately |
| `frontend/obscura-os-main/src/hooks/useOnboardingState.ts` | Private onboarding `hasActivity` now counts private receipts only, not public USDC receipts |
| `frontend/obscura-os-main/src/components/pay-v4/PaymentReceipt.tsx` | Receipts filter by mode; Public receipts show USDC amounts; Private receipts stay masked until reveal; CSV/JSON exports are mode-filtered |
| `frontend/obscura-os-main/src/components/harmony/ActivityFeed.tsx` | Indexed Supabase activity filters by mode; Public shows USDC/UserOp/paymaster/CCTP-like events; Private shows encrypted Pay events |
| `frontend/obscura-os-main/src/pages/PayPage.tsx` | Mode-aware shell, Pay/Get Paid/Automations/Activity/Settings routing; Public Mode hides private inbox badge/banner; Public Automations is gated instead of rendering batch sends |
| `frontend/obscura-os-main/src/components/harmony/PayHarmonyTabShell.tsx` | Mode-aware tab descriptions and balance bar; Public shows wallet/smart USDC only; Private shows ocUSDC reveal + shield context |
| `frontend/obscura-os-main/src/components/harmony/PaymentModeBar.tsx` | Private Mode moved first and marked Default; Public copy clarifies visible USDC + passkey + sponsored gas |
| `frontend/obscura-os-main/src/components/harmony/PayHarmonyHome.tsx` | Overview now fully branches: Public USDC smart-account workspace vs Private encrypted treasury workspace |

### Mode-aware behavior now enforced

- Private Mode is the default for new sessions.
- Public Overview no longer shows private balance reveal, stealth inbox widgets, private inbox counts, or ocUSDC activity.
- Private Overview keeps the encrypted treasury setup and uses private receipts for activity/progress.
- Public Activity filters indexed activity to public USDC / Smart Account / paymaster / bridge-like events and local public receipts.
- Private Activity filters indexed activity and local receipts to private ocUSDC flows.
- Public Receipts show visible USDC amounts by design; Private Receipts remain masked unless the user explicitly reveals locally.
- Public Automations no longer pretends batch public sends are recurring automations; it shows a Private Mode-required gate for streams, escrows, payroll, subscriptions, and insurance.
- Public Get Paid shows wallet/smart-account receiving for normal USDC and gates private invoice/stealth inbox flows.
- Public Settings focuses Smart Account, preferences, notifications, and data; private privacy/contact/legacy panels stay in Private Mode.
- Unknown receipt/activity classifications default to Private Mode to avoid accidental private-data leakage.

### Not changed

- No contract changes.
- No backend relay/paymaster changes.
- No FHE decrypt-on-mount behavior added.
- Private ocUSDC hooks/forms remain wallet-executed; Public Mode still cannot forward encrypted transfers.
- Forbidden docs (`about.md`, `README.md`, `wave4.md`) were not touched.

### Verification

- Editor diagnostics on `frontend/obscura-os-main/src`: clean ✅
- Frontend build: `npm run build` in `frontend/obscura-os-main` ✅ (`✓ built in 33.97s`)
- Frontend tests: `npm run test` in `frontend/obscura-os-main` ✅ (`1 passed`)
- Targeted lint on touched files: `npx eslint src/lib/payModeFilters.ts src/contexts/PaymentModeContext.tsx src/hooks/useUSDCBalance.ts src/hooks/useOnboardingState.ts src/components/pay-v4/PaymentReceipt.tsx src/components/harmony/ActivityFeed.tsx src/components/harmony/PayHarmonyTabShell.tsx src/components/harmony/PaymentModeBar.tsx src/components/harmony/PayHarmonyHome.tsx src/pages/PayPage.tsx` ✅ (`0 errors`, one existing Fast Refresh warning in `PaymentModeContext.tsx`)
- Full frontend lint: `npm run lint` still fails on pre-existing repo-wide lint debt (`105 errors`, mostly `no-explicit-any`, empty blocks, and UI template lint issues outside this Pay mode pass). No new touched-file lint errors found.
- Browser/dev-server smoke: not run in this session because the dev-server launch was skipped after validation; build/test/diagnostics are green.

### Build note

The first W5P13 frontend build caught a JSX literal `>` in the new Public Overview `View all ->` button. It was fixed by replacing the text arrow with the existing `ChevronRight` icon, then the production build passed.

---

## W5P14 — Push Notification Delivery Fix ✅

**Completed**: current session — fixes the browser push delivery pipeline for indexed Obscura Pay activity.

### Pipeline traced

Contract event → `obscura-worker` viem watcher → `insertActivity()` upsert into `obscura_activity` → notification dispatcher → `webpush.sendNotification()` → `/sw.js` push handler → browser notification.

### Root cause

The saved Web Push subscription and VAPID pair were valid, but the old delivery architecture only dispatched from `obscura-api` via a Supabase Realtime listener on `obscura_activity` inserts. On Render free tier, the API can sleep or miss a Realtime insert, while the worker still indexes events. The old dispatcher also had silent stop paths:

- no log when an activity was received from Realtime,
- no log when prefs were missing or event prefs skipped a row,
- no log when no subscription existed,
- `webpush.sendNotification()` errors were swallowed unless the status was `410`,
- no manual endpoint existed to prove browser push delivery from saved subscriptions.

Live trace before the fix:

- `obscura_activity` had 2 rows: `ObscuraPayStreamV3.StreamCreated` and `ObscuraStealthRegistry.Announcement`.
- API `/prefs/0xf76e...71a3` returned `push_enabled: true`, `events: ["*"]`.
- The stealth announcement participants included `0xf76e...71a3`, so event filtering was not the blocker.
- A direct debug send with the saved subscription returned `sent: 1`, proving VAPID + subscription + browser push path were valid. The stop was dispatch triggering / observability, not cryptographic push config.

### Final architecture

- `obscura-api` still owns browser registration and preferences:
  - `GET /vapid-public-key`
  - `POST /subscribe`
  - `DELETE /subscribe`
  - `POST /prefs`
  - `GET /prefs/:wallet`
- `obscura-api` still keeps the Supabase Realtime listener as a fallback/background dispatcher.
- `obscura-worker` now dispatches Web Push immediately after a fresh `obscura_activity` insert. This makes delivery follow the reliable path that is already awake when an event is indexed.
- Duplicate event upserts do not dispatch again; `insertActivity()` returns `null` for duplicates and returns the stored row for fresh inserts.
- Both API and worker log every critical stage:
  - event indexed,
  - notification queued,
  - skipped no prefs,
  - skipped event prefs,
  - skipped no subscription,
  - notification sent,
  - notification failed,
  - stale subscription removed.

### Debug endpoint

Temporary endpoint added on `obscura-api`:

```http
POST /debug/push-test
Content-Type: application/json

{
  "wallet": "0x...",
  "title": "Obscura Push Test",
  "body": "Debug notification"
}
```

Also supports `GET /debug/push-test?wallet=0x...`.

Behavior:

- If `wallet` is provided, it sends to that wallet's saved subscription.
- If no wallet is provided, it sends to the latest saved subscriptions, capped at 25.
- Returns attempted/sent/failed/staleRemoved/targets/errors.
- In-memory rate limit: 5 debug requests per IP per minute.
- Logs endpoint hashes only, never full push endpoints or keys.

### Frontend fixes

- `useNotificationPrefs.enable()` now explicitly calls `Notification.requestPermission()`.
- VAPID key fetch, `/subscribe`, and `/prefs` saves now check HTTP status and throw on failure.
- Existing browser push subscriptions are reused instead of blindly creating another subscription.
- Settings UI shows push setup errors instead of making failed setup look enabled.
- `/sw.js` now preserves nested payload data, opens the intended URL, and logs push receipt / `showNotification()` failure in the browser console.
- `useActivityFeed()` Realtime now filters inserted rows client-side by `participants[]` as well as `wallet`, matching the polling query and the worker's indexed participant model.
- Activity filters/labels now include the actual V3 event names indexed by the worker.

### Files changed

| File | Change |
|------|--------|
| `backend/obscura-api/src/notifications.ts` | Structured dispatch summary, DB error handling, detailed logs, stale subscription cleanup, `/debug/push-test` |
| `backend/obscura-worker/src/notifications.ts` | New worker-side Web Push dispatcher using saved subscriptions/prefs |
| `backend/obscura-worker/src/db.ts` | `insertActivity()` returns the inserted row or `null` for duplicates; logs event indexed |
| `backend/obscura-worker/src/indexer/index.ts` | Calls worker dispatcher after fresh activity inserts |
| `backend/obscura-worker/package.json` + lockfile | Added `web-push` and types |
| `render.yaml` | Added `FRONTEND_URL`; added worker VAPID public/contact config and `VAPID_PRIVATE_KEY` secret slot |
| `frontend/obscura-os-main/src/hooks/useNotificationPrefs.ts` | Permission request + response validation + default `events: ["*"]` safety |
| `frontend/obscura-os-main/src/pages/PayPage.tsx` | Push setup busy/error UI in Settings → Notifications |
| `frontend/obscura-os-main/public/sw.js` | Browser-side push receipt/showNotification logging and payload data handling |
| `frontend/obscura-os-main/src/hooks/useActivityFeed.ts` | Participant-aware Realtime handling and current indexed event filters |
| `frontend/obscura-os-main/src/components/harmony/ActivityFeed.tsx` | Labels for current indexed event names |

### Verification

- API build: `npm run build` in `backend/obscura-api` ✅
- Worker lockfile updated: `npm install --package-lock-only` in `backend/obscura-worker` ✅
- Worker dependency installed locally: `npm install` in `backend/obscura-worker` ✅
- Worker build: `npm run build` in `backend/obscura-worker` ✅
- Frontend build: `npm run build` in `frontend/obscura-os-main` ✅ (`✓ built in 46.62s`)
- Editor diagnostics on changed files: clean ✅
- Existing production smoke: `scripts/test-e2e.ps1` ✅ (`PASS=10 WARN=0 FAIL=0`)
- Local API debug endpoint test against saved subscription:
  - `POST http://localhost:3000/debug/push-test`
  - result: `attempted: 1`, `sent: 1`, `failed: 0`, `staleRemoved: 0` ✅
  - log: `notification sent source=debug-push-test wallet=0xf76e...71a3 endpoint=953fe9b5155a` ✅
- Local compiled worker dispatcher test against existing activity row `id=2`:
  - queued wallets: `2`
  - sent: `1`
  - skipped no prefs: `1` for the stealth address participant
  - failed: `0` ✅

### Deployment steps

1. Redeploy `obscura-api` on Render so `/debug/push-test` and dispatcher logging are live.
2. Redeploy `obscura-worker` on Render so worker-side dispatch runs after new inserts.
3. In Render `obscura-worker`, set secret `VAPID_PRIVATE_KEY` to the same private key that matches public key `BIgVcwUhCL93WVMnDdRT...`.
4. Confirm `obscura-worker` still has `SUPABASE_SERVICE_ROLE_KEY` and `RPC_URL` set.
5. Redeploy the Vercel frontend so the updated `useNotificationPrefs` hook and `/sw.js` ship.
6. After deploy, call `POST https://obscura-api-n62v.onrender.com/debug/push-test` with the subscribed wallet to verify production push send.
7. Generate a new Pay event and confirm logs show `event indexed` → `notification queued` → `notification sent`.

### Privacy / mode safety

- Public/Private Pay mode logic was not changed.
- Private ocUSDC/FHE writes still use wallet/EOA execution only.
- No decrypt-on-mount behavior was added.
- Push payloads include event name, tx hash, activity id, and wallet only; encrypted amounts remain encrypted and are not revealed in notifications.

---

## W5P15 — Worker Crash Recovery + Real Push Env Fix

**Completed**: 2026-05-26 — recovery patch after W5P14 regression.

### Regression root cause

After the notification changes, `obscura-worker` restarted and the old startup backfill called `eth_getLogs` across a very large block range. Alchemy free-tier RPC rejects ranges over 10 blocks, so the worker crashed before live indexing and new rows stopped appearing in `obscura_activity`.

### Worker fix

- `backend/obscura-worker/src/indexer/index.ts` now chunks every `getLogs` request to `<= 10` blocks.
- Each chunk retries with exponential backoff and logs `attempt`, `from`, `to`, phase, and failure reason.
- Per-log indexing failures are caught and logged; one bad log no longer kills the whole worker.
- Notification dispatch after `insertActivity()` is non-fatal, so push failures cannot stop indexing.
- Live indexing no longer depends on `client.watchEvent`; it uses chunked polling so the same provider limit applies to startup catch-up and live operation.
- Live pollers start immediately from a recent safety window (`INDEXER_STARTUP_RECENT_BLOCKS=5000`) while older deep backfill runs in the background after a delay.
- If the first startup block-number request fails, the poller recovers the recent-window start on the next successful poll instead of falling forward to latest only.

### Real env correction

The real worker env file `backend/obscura-worker/.env` was updated, not just `.env.example`:

- Added real indexer safety values.
- Copied the actual VAPID contact/public/private values from `backend/obscura-api/.env` into `backend/obscura-worker/.env` without printing the secret values.
- `backend/obscura-worker/.env.example` and `render.yaml` now list the same required worker settings.

### Required Render env for `obscura-worker`

Non-secret values from `render.yaml`:

```env
NODE_ENV=production
PORT=3001
SUPABASE_URL=https://quoovjkjwgtdqwdofubh.supabase.co
FRONTEND_URL=https://obscura-os-nine.vercel.app
VAPID_CONTACT_EMAIL=noreply@obscura.finance
VAPID_PUBLIC_KEY=BIgVcwUhCL93WVMnDdRT9KqySwDS4Sm9C-fSLg4dWJRdddSuLbyDv_M9R5FmDi2F8NwDuKuMtvNiZAwZQ0RH86o
INDEXER_GETLOGS_CHUNK_BLOCKS=10
INDEXER_GETLOGS_RETRIES=3
INDEXER_GETLOGS_RETRY_BASE_MS=1000
INDEXER_LIVE_POLL_MS=5000
INDEXER_LIVE_RETRY_MAX_MS=30000
INDEXER_STARTUP_RECENT_BLOCKS=5000
INDEXER_BACKGROUND_BACKFILL_DELAY_MS=15000
```

Secrets that must be set manually in Render dashboard:

```env
RPC_URL=<Arbitrum Sepolia RPC URL>
SUPABASE_SERVICE_ROLE_KEY=<quoovjkjwgtdqwdofubh service_role key>
VAPID_PRIVATE_KEY=<same VAPID private key used by obscura-api>
KEEPER_PRIVATE_KEY=<credit keeper bot key, only if keeper should run>
```

### Verification this session

- Worker build passed: `npm run build` in `backend/obscura-worker`.
- Local fixed indexer started and processed chunked live ranges without fatal crash loops; provider hiccups produced retries/recovery logs instead of process exit.
- Latest reported tx was inserted into production `obscura_activity`:
  - tx: `0x826b0fb6c4e0dc017ceda88f68edb5e1e3cea97a2e5ea990010bd4689fb171f7`
  - event: `ObscuraStealthRegistry.Announcement`
  - block: `271316979`
  - activity id: `3`
- Production API debug push test succeeded:
  - `POST https://obscura-api-n62v.onrender.com/debug/push-test`
  - result: `attempted: 1`, `sent: 1`, `failed: 0`, `staleRemoved: 0`

### Honest remaining state

- Code and local env are fixed, but Render production worker must be redeployed before claiming the deployed worker is alive on the new chunked code.
- Browser notification appearance still requires observing the browser/device notification after redeploy or a manual debug push confirmation from the subscribed browser.
- Do not claim full final success until Render worker health is stable, a new post-redeploy event indexes into `obscura_activity`, worker logs show notification dispatch, and the browser notification appears.

---

## W5P16 — Browser Push Delivery Follow-up / Duplicate Catch-up Dispatch

**Completed**: 2026-05-26 — follow-up after DB rows appeared but no visible browser notification.

### What the new evidence showed

- `obscura_activity` was updating and the frontend inbox showed 3 private payments.
- Production worker logs showed chunked live catch-up running, but only `live chunk complete ... logs=0` lines for the pasted range and no `notification queued` / `notification sent` lines yet.
- The latest row in DB (`id=5`, `ObscuraStealthRegistry.Announcement`, block `271321464`) included the connected wallet `0xf76e...71a3` in `participants`.
- API prefs for `0xf76e...71a3` were valid: `push_enabled=true`, `events=["*"]`.
- API debug push to that wallet returned `attempted=1`, `sent=1`, `failed=0`.
- Manual worker dispatch for activity `id=5` using the fixed local worker modules returned:
  - queued wallets: `2`
  - skipped no prefs: `1` for the generated stealth address
  - sent: `1` to `0xf76e...71a3`
  - failed: `0`

### Root cause refinement

There were two issues after the crash recovery:

1. Rows restored before the Render worker reached those blocks became duplicate upserts. `insertActivity()` returned `null` for duplicates, so `handleLog()` returned before dispatching any notification. The worker could therefore catch up over an existing DB row and never send push for it.
2. The credit keeper was running live in the same Render process and sharing the same Alchemy key. Its market scans produced `429 Too Many Requests`, slowing or starving Pay indexer catch-up.

### Fixes added

- `backend/obscura-worker/src/db.ts`
  - `insertActivity()` now returns `{ activity, inserted }`.
  - On duplicate upsert, it fetches and returns the existing row by `(tx_hash, log_index)` instead of returning `null`.
- `backend/obscura-worker/src/indexer/index.ts`
  - Recent live catch-up now dispatches notifications for duplicate activity rows once per worker process when `INDEXER_DISPATCH_RECOVERED_DUPLICATES=true`.
  - Logs `recovered duplicate activity ... dispatching catch-up notification` before dispatch.
- `backend/obscura-worker/src/notifications.ts`
  - Logs `worker push dispatch enabled` on startup when VAPID keys are configured.
- `backend/obscura-worker/src/index.ts`
  - Keeper is now explicit opt-in via `KEEPER_ENABLED=true`; this prevents credit keeper scans from consuming Pay notification RPC quota by default.
- `frontend/obscura-os-main/src/hooks/useNotificationPrefs.ts`
  - Added `repair()` to force-unsubscribe/re-subscribe the current browser and save that endpoint for the wallet.
  - Added `testPush()` to call `/debug/push-test` for the connected wallet.
- `frontend/obscura-os-main/src/pages/PayPage.tsx`
  - Settings → Notifications now has `Repair browser` and `Test` buttons when push is enabled.

### Required Render worker env additions

```env
INDEXER_DISPATCH_RECOVERED_DUPLICATES=true
KEEPER_ENABLED=false
KEEPER_DRY_RUN=true
```

Keep the existing required values:

```env
VAPID_PRIVATE_KEY=<same key used by obscura-api>
SUPABASE_SERVICE_ROLE_KEY=<quoovjkjwgtdqwdofubh service_role key>
RPC_URL=<Arbitrum Sepolia RPC URL>
```

### Verification

- Worker build: `npm run build` in `backend/obscura-worker` passed.
- Frontend build: `npm run build` in `frontend/obscura-os-main` passed.
- Manual worker dispatch for activity `id=5` showed `sent=1 failed=0` using worker VAPID config.

### Final browser-side note

If API/worker logs show `notification sent` but no desktop notification appears, the remaining failure is the browser/OS endpoint path: stale saved endpoint, a different Chrome profile/device, site notification permission, Windows notification settings, or focus/quiet mode. After frontend deploy, use Settings → Notifications → `Repair browser`, then `Test`; the saved subscription will be replaced with the current browser endpoint before testing.

---

## PAY-FINAL P0.1/P0.2 — Deploy/Env Parity + Indexer/Notification Reliability

**Completed locally**: 2026-05-27 — implementation for `PAY_FINAL_PLAN.md` P0.1 and P0.2 only.

### Completed work

- Aligned the Pay API deployment config on current paymaster v2:
  - `PAYMASTER_ADDRESS=0x7a8D880D9c5F88Ba8bd4435c450256628F66dd0C`
  - updated `render.yaml`, `backend/obscura-api/.env.example`, and local ignored API `.env`.
- Sanitized env examples so dashboard-only secrets are placeholders:
  - API bundler URLs use `<ALCHEMY_KEY>` / `<PIMLICO_KEY>` placeholders.
  - Worker `RPC_URL` uses `<ALCHEMY_KEY>` placeholder.
  - no VAPID private key literal in `.env.example` files.
- Updated frontend notification local fallback:
  - `VITE_NOTIFICATIONS_URL` fallback is now `http://localhost:3000` for unified `obscura-api`.
- Replaced stale operator runbook `backend_db_vercal.md` with current topology:
  - Vercel root `frontend/obscura-os-main`, build `npm run build`, output `dist`.
  - Render roots `backend/obscura-api` and `backend/obscura-worker`.
  - Supabase project `quoovjkjwgtdqwdofubh`.
  - current paymaster v2 and WebAuthn smart-account factory.
  - Render/Vercel secret boundary documented without committed secret values.
- Hardened debug push privacy:
  - `/debug/push-test` now ignores caller-provided notification title/body and always sends fixed amount-free copy.
- Added worker health summary:
  - `GET /health` now includes `indexer.chunkSize`, `maxChunkSize`, retry settings, watched contracts, timestamps, failures, and recovered duplicate dispatch count.
  - `keeper.enabled` and `keeper.configured` are exposed as booleans only, with no secret values.
- Updated local ignored smoke helper `scripts/test-e2e.ps1`:
  - asserts current EntryPoint and paymaster from API `/health`.
  - checks worker `indexer.chunkSize <= 10` after worker redeploy.

### Infra/deployment changes

- `render.yaml` is ready for redeploy with:
  - `obscura-api` current paymaster v2.
  - `obscura-worker` chunk size `10`, duplicate catch-up dispatch enabled, keeper disabled by default.
- `backend_db_vercal.md` is the current operator runbook for P0.1/P0.2.
- Vercel still needs dashboard env parity with all `VITE_*` values from `frontend/obscura-os-main/.env`, especially relay URL, notifications URL, Supabase URL/anon key, smart-account factory, current paymaster, and Pay ocUSDC.

### Validation run

- `npm run build` in `backend/obscura-api` passed.
- `npm run build` in `backend/obscura-worker` passed.
- `npm run build` in `frontend/obscura-os-main` passed.
- `npm run test` in `frontend/obscura-os-main` passed (`1 passed`).
- `git diff --check` on touched files passed.
- Local API `/health` returned current EntryPoint and paymaster v2.
- Local worker `/health` returned `indexer.chunkSize=10`, `maxChunkSize=10`, six watched Pay contracts, `consecutiveFailures=0`, and `keeper.enabled=false`.
- Production smoke script result before redeploy:
  - API/health reachable but still served old paymaster, so Render API must redeploy with updated env/config.
  - worker/health reachable, but health summary missing until Render worker redeploys.
  - VAPID public key present.
  - all three Supabase tables HTTP 200.
  - recent `obscura_activity` rows present.
  - frontend and `/sw.js` HTTP 200.

### Blockers / remaining tasks

- Render redeploy is required before claiming production P0.1/P0.2 is green:
  1. Redeploy `obscura-api` so `/health` reports paymaster `0x7a8D880D9c5F88Ba8bd4435c450256628F66dd0C`.
  2. Redeploy `obscura-worker` so `/health` includes indexer health summary and keeps `chunkSize <= 10`.
  3. Confirm Render dashboard secrets are set and not committed: `BUNDLER_URL`, `BUNDLER_URL_FALLBACK`, `SUPABASE_SERVICE_ROLE_KEY`, `VAPID_PRIVATE_KEY`, worker `RPC_URL`, optional `RESEND_API_KEY`, optional `KEEPER_PRIVATE_KEY` only when keeper is intentionally enabled.
  4. Redeploy Vercel if env or frontend bundle changed.
  5. Re-run `scripts/test-e2e.ps1`; expected final result is no paymaster mismatch and no worker health-summary warning.
  6. In a subscribed browser, Settings → Notifications → Repair browser, then Test; confirm visible browser notification.
  7. Generate a fresh Pay event and confirm exactly one `obscura_activity` row plus worker log `notification queued` and `notification sent` or an explicit skip reason.

### Privacy/FHE safety

- No contract or FHE write path changed.
- No auto-decrypt behavior added.
- Private `ocUSDC` remains wallet/EOA execution only.
- Stealth, streams, escrow, payroll, subscriptions, request links, notifications, and activity feed paths were not refactored.
- Notification bodies remain amount-free.

---

## PAY-FINAL P0.3/P0.4 — Public/Private Execution Split + Privacy UX Safety

**Completed locally**: 2026-05-27 — implementation for `PAY_FINAL_PLAN.md` P0.3 and P0.4 only.

### Completed work

- Added `frontend/obscura-os-main/src/lib/payExecutionPolicy.ts` as the shared Pay execution-policy layer:
  - final WebAuthn smart-account factory fallback: `0xFaC683D8AB872cCf5eBfaE1659a9CD44C6FB4feB`.
  - current paymaster fallback: `0x7a8D880D9c5F88Ba8bd4435c450256628F66dd0C`.
  - deprecated factory rejection for the old raw-hash and loose-challenge factories.
  - Private Mode always resolves to wallet execution; Public Mode resolves to smart execution only when the smart account is ready.
  - smart-account writes throw when requested but unavailable instead of silently falling back to EOA.
- Wired the policy into:
  - `src/config/smartAccount.ts`
  - `src/contexts/PaymentModeContext.tsx`
  - `src/hooks/useUnifiedWrite.ts`
  - `src/hooks/useOcUSDCTransfer.ts`
- Removed stale private smart-account routing from `UnifiedSendForm.tsx`:
  - no `sendUserOp(...)` inside private direct/stealth ocUSDC send.
  - no `confidentialTransferFrom(...)` path for private UI.
  - no smart-account stealth `announce(...)` or retry path.
  - private direct and stealth sends stay wallet/EOA FHE writes only.
- Forced private Pay management writes through wallet execution with `mode: "eoa"`:
  - insurance stake flow in `StakePoolForm.tsx`.
  - payroll resolver approve/cancel in `ResolverManager.tsx`.
  - stream pause/cancel/resume in `StreamList.tsx`.
  - auditor grants in `AuditorGrantPanel.tsx`.
- Made claim-link verification privacy-safe:
  - `ClaimEscrowCard.tsx` no longer auto-runs reveal/verification after claim settlement.
  - balance verification is now an explicit user click.
- Hardened receipt-status behavior in legacy confidential escrow hook:
  - `useConfidentialEscrow.ts` waits for transaction receipts before setting `FHEStepStatus.READY` in create/fund/redeem/cancel paths.
- Cleaned active Pay UI copy away from implementation jargon:
  - Public Mode copy is normal-USDC/passkey/sponsored-gas language.
  - Private Mode copy is wallet-secured/private-amount language.
  - removed targeted active phrases such as `Passkey UserOps`, `sponsored UserOp`, `FHE coprocessor`, `decryption permit`, and `FHE silent-failure`.
- Added targeted regression tests in `src/test/pay-final-p0.test.ts` for:
  - final factory and deprecated factory rejection.
  - current paymaster v2 default and Render YAML parity.
  - Private Mode wallet-only execution.
  - no silent smart-to-EOA fallback.
  - UserOp receipt success required before success.
  - private send source free of smart-account submission.
  - private management writes forced to EOA.
  - active Pay UI copy safety.
  - amount-free notification bodies.
  - activity reads scoped by wallet participants.

### Validation run

- Editor diagnostics on touched frontend files: clean.
- Frontend tests: `npm run test` in `frontend/obscura-os-main` passed (`2 test files`, `11 tests`).
- Frontend build: `npm run build` in `frontend/obscura-os-main` passed (`✓ built in 14.92s`; only expected chunk-size warnings).
- API build: `npm run build` in `backend/obscura-api` passed.
- Worker build: `npm run build` in `backend/obscura-worker` passed.
- `git diff --check` passed.
- Built bundle checks:
  - no old paymaster `0x9B1F61A65467F11339A8d0834349Be32EB2CF878`.
  - no stale local relay `http://localhost:3701`.
  - deprecated factory addresses appear only in the policy rejection set.
  - no Obscura server env identifiers such as `SUPABASE_SERVICE_ROLE_KEY`, `VAPID_PRIVATE_KEY`, `RESEND_API_KEY`, `KEEPER_PRIVATE`, or `ALCHEMY_API_KEY`; one CoFHE SDK mock constant name appears from bundled dependency code and is not an Obscura env secret.
- Source privacy checks:
  - `UnifiedSendForm.tsx` has no `sendUserOp` or `confidentialTransferFrom` private path.
  - claim reveal in `ClaimEscrowCard.tsx` appears only inside click handlers.
  - active Pay notification bodies remain amount-free.
  - activity feed remains wallet/participant filtered.

### Deployment status / limitations

- Code is locally stable and ready for deploy.
- No Render/Vercel deployment was performed from this session.
- Production health smoke after this patch:
  - `https://obscura-api-n62v.onrender.com/health` reports EntryPoint `0x0000000071727De22E5E9d8BAf0edAc6f37da032` and paymaster v2 `0x7a8D880D9c5F88Ba8bd4435c450256628F66dd0C`.
  - `https://obscura-worker-0ppj.onrender.com/health` reports `indexer.chunkSize=10`, `maxChunkSize=10`, six watched contracts, and `keeper.enabled=false`.
- Remaining deploy gap: redeploy Vercel so the P0.3/P0.4 frontend policy, tests-backed guards, and privacy copy ship.
- Manual wallet-connected checks are still required after frontend deploy because code-only tests cannot approve wallet/passkey prompts or observe browser OS notifications.

### Manual test checklist after deploy

1. Private Mode direct ocUSDC send prompts the wallet, waits for receipt, and records a private receipt.
2. Private Mode stealth send prompts the wallet for the private transfer and wallet announce/retry; it never opens a passkey/UserOp path.
3. Public Mode public USDC send uses smart account/passkey/paymaster and only reports success after UserOp receipt success.
4. Public Mode cannot send encrypted ocUSDC and shows the explicit switch-to-Private message.
5. Stream, resolver, stake, and auditor management writes in Private Mode use wallet execution.
6. Claim link claim settles without an automatic reveal prompt; the user must click the verify/reveal action.
7. Notifications remain amount-free and activity rows are scoped to the connected wallet participants.

### Privacy/FHE safety

- No Solidity contracts changed.
- No auto-decrypt on mount added.
- No smart-account route remains for private encrypted ocUSDC send paths.
- FHE permits/reveals remain user-triggered.
- Existing private send, stealth receive, streams, escrow, payroll, subscriptions, request links, notifications, and activity feed were preserved.

---

## PAY-FINAL P0.5/P1.1/P1.2 — Smoke Gate + Reputation Foundation + Mobile/PWA Polish

**Implemented locally**: 2026-05-27 — implementation for `PAY_FINAL_PLAN.md` P0.5, P1.1, and P1.2 only.

### Completed work

- Added `backend/obscura-worker/migrations/002_create_reputation_events.sql`:
  - `obscura_reputation_events` table with `wallet`, `source_app`, `signal_type`, `signal_weight`, `event_ref`, `public_context`, `created_at`.
  - source app check for `pay`, `credit`, `vote`.
  - idempotency via unique `(wallet, source_app, signal_type, event_ref)`.
  - RLS enabled, anon/authenticated `SELECT` explicitly granted, anon/authenticated writes revoked.
  - realtime publication add guarded by a `pg_publication_tables` check.
- Added worker reputation producer in `backend/obscura-worker/src/reputation.ts`:
  - derives capped Pay signals only from indexed public event metadata.
  - signal types: private payment sent/received, stream created, stream cycle settled, escrow redeemed, invoice paid, subscription consumed.
  - links stream/invoice/subscription completion signals back to earlier activity rows by public ids when needed.
  - stores no amounts, notes, labels, decrypted balances, or private counterpart metadata.
  - startup backfill is idempotent and controlled by `REPUTATION_EVENTS_ENABLED`, `REPUTATION_BACKFILL_ON_START`, `REPUTATION_BACKFILL_LIMIT`.
- Wired worker live indexing to insert reputation signals non-fatally after fresh activity inserts.
- Added worker health surface for reputation backfill/signaling state.
- Added aggregate-only API route `GET /reputation/:wallet`:
  - returns wallet, `sourceApp=pay`, capped score, tier, and per-signal aggregate counts.
  - does not expose raw event refs or raw activity rows.
- Added frontend hook and UI panel:
  - `src/hooks/useReputationSummary.ts`.
  - `src/components/harmony/ReputationSignalsPanel.tsx`.
  - shown in Private Mode Activity as aggregate Pay reputation only.
- P1.2 mobile/PWA polish:
  - mobile bottom nav now includes all six Pay tabs including Settings.
  - mobile nav items have `aria-label`s and truncating labels.
  - Payment Mode switch stacks on mobile and avoids narrow overflow.
  - Activity rows, receipt rows, receipt export buttons, and notification settings wrap cleanly on mobile.
  - notification unsupported copy shortened to browser-native language.
  - `/sw.js` now has version `pay-final-p1-2`, update checks from `main.tsx`, `SKIP_WAITING` message handling, and backwards-compatible `url`/`data.url`/`clickUrl` payload support.
- P0.5 smoke gate refresh:
  - `src/test/pay-final-p0.test.ts` extended to cover reputation schema/privacy, non-fatal worker insertion, aggregate API, mobile nav, SW update compatibility, and production smoke coverage.
  - `tests/wave3-pay-smoke.spec.ts` replaced with current Pay final IA/mobile/activity/settings/deep-link/SW smoke checks.
  - `playwright.config.ts` replaced the missing `lovable-agent-playwright-config` dependency with standard `@playwright/test` config.
  - `scripts/test-e2e.ps1` now checks `obscura_reputation_events`, `/reputation/:wallet`, and P1.2 SW version.
- Updated `render.yaml`, worker `.env.example`, and `backend_db_vercal.md` with reputation env/deployment details.

### Validation run

- Editor diagnostics on touched TypeScript/TSX files: clean.
- Frontend tests: `npm run test` in `frontend/obscura-os-main` passed (`2 test files`, `17 tests`).
- Frontend build: `npm run build` in `frontend/obscura-os-main` passed (expected Rollup/chunk-size warnings only).
- API build: `npm run build` in `backend/obscura-api` passed.
- Worker build: `npm run build` in `backend/obscura-worker` passed.
- `git diff --check` passed with Windows LF/CRLF warnings only for `playwright.config.ts` and `src/main.tsx`.
- Playwright local smoke after `npx playwright install chromium`: `npx playwright test tests/wave3-pay-smoke.spec.ts` passed (`6 passed`) against local preview on `127.0.0.1:8080`.
- Secret scan: no literal server secrets found; expected env variable names only.

### Production smoke result

- `scripts/test-e2e.ps1` current production result before deploy:
  - API health: pass, current EntryPoint and paymaster v2.
  - Worker health: pass, chunk size 10, six watched contracts.
  - VAPID public key: pass.
  - Existing Supabase tables: pass.
  - `obscura_reputation_events`: **not found** because migration has not been applied to production yet.
  - `/reputation/:wallet`: **404** because API has not been redeployed yet.
  - `/sw.js`: served, but P1.2 version not deployed yet.

### Deployment status / limitations

- Code is locally stable and ready for deploy.
- Supabase MCP/tool search returned no available migration tool in this session.
- Local environment has `SUPABASE_SERVICE_ROLE_KEY`, but no `SUPABASE_ACCESS_TOKEN`, Supabase CLI, SQL RPC (`execute_sql`/`exec_sql` returned 404), DB URL, Render token/hook, or Vercel token/CLI.
- Therefore production deployment/migration could not be completed from this session.
- Required deployment steps:
  1. Apply `backend/obscura-worker/migrations/002_create_reputation_events.sql` to Supabase project `quoovjkjwgtdqwdofubh`.
  2. Redeploy `obscura-api` so `/reputation/:wallet` is live.
  3. Redeploy `obscura-worker` so live reputation insertion/backfill and health are live.
  4. Redeploy Vercel frontend so the mobile/PWA/reputation UI changes and `pay-final-p1-2` SW are live.
  5. Re-run `powershell -ExecutionPolicy Bypass -File .\scripts\test-e2e.ps1`.

### Privacy/FHE safety

- No Solidity contracts changed.
- No FHE write path changed.
- No auto-decrypt on mount added.
- No `decryptForView` or `getOrCreateSelfPermit` added.
- Private ocUSDC remains wallet/EOA execution only.
- Reputation signals are derived from indexed chain metadata only and exclude raw amounts, notes, labels, decrypted balances, and private counterpart metadata.
- Existing private send, stealth receive, streams, escrow, payroll, subscriptions, request links, smart accounts, notifications, and activity feed paths were preserved.

## P1.3 Push Visibility + Stealth Inbox Unlock Hotfix — 2026-05-27

### User-reported production issues

- Notifications Test reached the service worker (`[SW] push received`) but did not show a visible browser notification.
- Private inbox showed a MetaMask signature prompt for `Obscura stealth keystore unlock v1`, then stayed empty.
- User had already deployed the P0.5/P1.1/P1.2 stack and applied `002_create_reputation_events.sql` in Supabase.

### Notification fixes

- `frontend/obscura-os-main/public/sw.js` bumped to `pay-final-p1-3`.
- Service worker now normalizes `url`, `clickUrl`, nested `data`, text payloads, debug payloads, timestamps, and notification options before display.
- Service worker always calls real `self.registration.showNotification()` for push events with `requireInteraction`, `renotify`, `silent: false`, icon, badge, timestamp, actions, and robust error logging.
- Service worker broadcasts `OBSCURA_PUSH_RECEIVED` to foreground clients so the app can show an in-page Sonner toast while the browser notification is still displayed by the SW.
- Service worker accepts `OBSCURA_SHOW_NOTIFICATION` client messages for explicit local display checks.
- Notification click handling now focuses exact tabs, navigates same-origin Obscura tabs to the target URL, or opens a new window.
- `src/main.tsx` listens for `OBSCURA_PUSH_RECEIVED` and shows foreground toasts with Open action.
- `src/hooks/useNotificationPrefs.ts` now tracks notification permission and service-worker readiness, ensures SW registration/readiness, requests permission only from explicit Settings actions, and makes Test call `ServiceWorkerRegistration.showNotification()` as a real browser display probe after the server debug push.
- `PayPage` Settings > Notifications now displays browser permission and service-worker readiness, and Test reports `Browser notification displayed` with server push sent/attempted counts.
- API debug push payloads now use unique tags, `requireInteraction`, `renotify`, `silent: false`, and `sentAt` so repeated tests are not silently collapsed under an old tag.
- Worker/API activity pushes now include consistent `renotify`, `silent: false`, and `sentAt` fields.
- `NewPaymentBanner` no longer auto-prompts for Notification permission; it only shows hidden-tab notifications if permission was already granted from Settings, using the SW registration API.

### Stealth inbox fixes

- `src/lib/keystore.ts` now supports an 8-hour session unlock cache in `sessionStorage` plus memory cache, with `lockKeystore()` clearing both. This avoids repeated MetaMask signature spam after a user explicitly unlocks.
- `src/lib/stealth.ts` now caches decrypted stealth keys in memory, exposes cached/unlocked/lock helpers, and clears both decrypted keys and keystore unlock state on lock.
- `src/hooks/useStealthScan.ts` was refactored so scans never call `personal_sign` from mount/polling. If no explicit unlock/session exists, scan returns `Unlock inbox to scan private announcements`.
- `useStealthScan` now queries indexed `obscura_activity` rows for `ObscuraStealthRegistry.Announcement` via Supabase (limit 2000), scans them locally with the viewing key, and also checks a small chunked recent RPC fallback window. This fixes the old fragile 50k-block raw RPC lookback, which could miss older payments and fail on provider range limits.
- Scan results are cached/published across hook instances so the inbox component and Pay shell badge can share matches after an explicit scan.
- `src/hooks/useStealthInbox.ts` now polls only while `scan.isUnlocked` is true; no wallet prompt can happen from background timers or hidden components.
- `StealthInboxV2` now has explicit `Unlock inbox` and `Lock` controls. Refresh, mark read, and claim-all are disabled while locked. Setup unlocks/scans as part of the user's setup action using the already-cached key.
- Empty state now distinguishes locked inbox from scanned-empty inbox and shows indexed/RPC scan counts after scans.
- Private inbox continues to use the connected wagmi EOA address for local keys and registry scanning; Public Mode smart-account addresses are not used for private ocUSDC/stealth ownership.

### Validation run

- Editor diagnostics on touched frontend/API/worker files: clean.
- Frontend tests: `npm run test` in `frontend/obscura-os-main` passed (`2 test files`, `19 tests`).
- Frontend build: `npm run build` in `frontend/obscura-os-main` passed (expected Rollup/chunk-size warnings only).
- API build: `npm run build` in `backend/obscura-api` passed.
- Worker build: `npm run build` in `backend/obscura-worker` passed.
- Playwright local smoke: `npx playwright test tests/wave3-pay-smoke.spec.ts` passed (`6 passed`) against local preview on `127.0.0.1:8080`.
- Browser notification probe: headed Chromium with notification permission granted successfully created a `ServiceWorkerRegistration.showNotification()` notification (`permission=granted`, `count=1`, title `Obscura Push Visual Check`). Headless Chromium denies notifications, so headed probe was required.
- Production smoke: `scripts/test-e2e.ps1` passed API health, worker health, VAPID public key, all Supabase tables including `obscura_reputation_events`, recent activity/indexer rows, prefs, reputation API, frontend HTTP. It warned only that production `/sw.js` is not redeployed to `pay-final-p1-3` yet.
- `git diff --check` passed with the existing Windows LF/CRLF warning for `src/main.tsx` only.

### Deployment note

- Production currently serves the old `/sw.js` until Vercel redeploys the frontend; redeploy frontend for `pay-final-p1-3` notification behavior.
- Redeploy API and worker for the payload-option updates. Supabase migration `002_create_reputation_events.sql` is already applied per user and verified by smoke script.

### Privacy/FHE safety

- No Solidity contracts changed.
- No FHE write path changed.
- No auto-decrypt or wallet-triggered stealth unlock on mount/polling added.
- `decryptForView` and `getOrCreateSelfPermit` were not added.
- Private ocUSDC remains wallet/EOA execution only.
- Stealth scanning uses public announcements plus local viewing keys; no private keys, decrypted values, or plaintext amounts are sent to Supabase/API.

