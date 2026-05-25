# memory_pay_5.md — Obscura Pay Wave 5 AI Memory

This file captures completed tasks, architectural decisions, and key patterns
from PAY_MASTER_EXECUTION_PLAN.md phases. Updated after each phase completes.

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
| `ObscuraSmartAccountFactory` | `0xbe8dC1d4Dcc368e0dBb6c7A5BDFfac2Fe72AFd05` |
| `ObscuraSmartAccount` (impl) | `0xe3c51Bb4BBCde1Ac6DBb590b2bc3fAdb7F99cd1B` |
| `ObscuraPaymaster` | `0x9B1F61A65467F11339A8d0834349Be32EB2CF878` |
| ERC-4337 EntryPoint v0.7 | `0x0000000071727De22E5E9d8BAf0edAc6f37da032` |

Paymaster funded: 0.5 ETH via EntryPoint deposit.
All 10 Obscura Pay contracts whitelisted.
Tests: 40/40 passing.

### Frontend files (no TS errors)

| File | Purpose |
|------|---------|
| `src/config/smartAccount.ts` | Factory/paymaster addresses + chain config |
| `src/lib/passkey.ts` | P-256 WebAuthn create/get, `prehash: false` always |
| `src/lib/userop.ts` | Build + sign + submit PackedUserOperation v0.7 |
| `src/hooks/useSmartAccount.ts` | Account address derivation + passkey enrollment state |
| `src/hooks/useUnifiedWrite.ts` | Route to EOA or SmartAccount based on enrollment |
| `src/components/harmony/PasskeyEnrollModal.tsx` | Enrollment UX — no auto-decrypt on mount |

### Critical constants
- `prehash: false` — ALWAYS on all P-256 signatures (RIP-7212 precompile `0x0000000000000000000000000000000000000100`)
- ERC-4337 v0.7 uses `PackedUserOperation` (not v0.6 struct)
- Factory function must NOT be named `getAddress` (Solidity reserved)
- `VITE_SMART_ACCOUNT_FACTORY_ADDRESS=0xbe8dC1d4Dcc368e0dBb6c7A5BDFfac2Fe72AFd05`
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
