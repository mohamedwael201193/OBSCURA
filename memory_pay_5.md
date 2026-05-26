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

