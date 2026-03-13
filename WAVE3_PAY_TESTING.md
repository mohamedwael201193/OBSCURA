# Wave 3 Pay — Manual Testing Guide

End-to-end checklist for every Wave 3 Pay feature on **Arbitrum Sepolia (chainId 421614)**.
Run each section in order. Each step lists: action → expected UI → on-chain verification.

---

## 0 · Pre-flight

1. **Network**: switch wallet to Arbitrum Sepolia.
2. **Faucet ETH**: bridge a tiny amount of Sepolia ETH to Arbitrum Sepolia (https://faucet.quicknode.com/arbitrum/sepolia or any).
3. **USDC**: get test USDC from the Circle faucet (https://faucet.circle.com → choose Arbitrum Sepolia).
4. **Connect wallet** at `/pay`. The header **Wallet pill** should show `cUSDC ••• ` (encrypted placeholder).
5. Click the pill once — your decrypted balance reveals (a 6-decimal cUSDC amount). Re-click to hide.
6. **Onboarding**: first connect triggers a wizard → step through it once, then it never reappears (replay from Settings).

> ✅ **Pass criteria**: address shown in nav, no console errors, no infinite spinner.

---

## 1 · cUSDC Wallet (Wrap / Unwrap)

Tab → **Streams** → "Wallet" card (`CUSDCPanel`) — also reachable from the home Wallet pill.

| Step | Action | Expected | Verify on Arbiscan |
|---|---|---|---|
| 1.1 | Approve **N USDC** | "Approval tx: 0x…" toast → Approve button greys out | `USDC.approve(REINEIRA_CUSDC, amount)` |
| 1.2 | Wrap **N USDC → cUSDC** | "Wrap tx: 0x…" toast → cUSDC balance bumps by N | `REINEIRA_CUSDC.wrap(amount)` |
| 1.3 | Authorize PayStream operator (e.g. **30 days**) | "Operator approved" toast | `REINEIRA_CUSDC.setOperator(PayStreamV2, expiry)` |
| 1.4 | Unwrap **half** | "Unwrap tx: 0x…" toast → USDC bumps back, cUSDC drops | `REINEIRA_CUSDC.unwrap(amount)` |

> ✅ Pretty dropdown for the operator-days select (gradient bg + chevron).
> ❌ If the cUSDC balance doesn't update, click the pill to force decrypt.

---

## 2 · Address Book (`ObscuraAddressBook`)

Sidebar → **Contacts** (`/pay/contacts`).

| Step | Action | Expected |
|---|---|---|
| 2.1 | Open Contacts on a fresh wallet | Empty state (no red error). The previous `listContactIds` revert is now swallowed. |
| 2.2 | Click **Add contact** → label `"Alice"`, address `0x…` | FHE encryption progress → tx pending → contact row appears |
| 2.3 | Refresh page | Contact persists; label still shows "Alice" (kept locally per-wallet) |
| 2.4 | Remove the contact | Row disappears, on-chain `removeContact(id)` tx confirms |

Verify: `ObscuraAddressBook.getContact(owner, contactId)` returns the encrypted slot.

---

## 3 · Social Resolver (`ObscuraSocialResolver`)

Currently surfaced inside `RegisterMetaAddressForm` (Receive tab) and via stealth flows.
Optional — the contract supports `selfRegister(handle)` and `resolve(handle)`.

> ✅ **Pass**: from a second wallet, calling `resolve("yourhandle")` returns the registered owner address.

---

## 4 · Stealth Rotation (`ObscuraStealthRotation`)

Sidebar → **Settings** → "Stealth privacy" section.

| Step | Action | Expected |
|---|---|---|
| 4.1 | "Generate new stealth keys" | Tx pending → success → meta-address index increments |
| 4.2 | Re-rotate | New keys generated; old keys archived in localStorage history |
| 4.3 | Set "Auto-rotate every 30 days" | Setting persists across reload |

Verify: `ObscuraStealthRotation.getMetaIndex(owner)` increases monotonically.

---

## 5 · PayStreamV2 (`ObscuraPayStreamV2`)

Sidebar → **Streams** → "Create a stream".

| Step | Action | Expected |
|---|---|---|
| 5.1 | Recipient: a wallet that has **registered a stealth meta-address** (use Receive tab from a second wallet first) | Green "Stealth meta-address found" badge below recipient |
| 5.2 | Period: pretty dropdown shows Daily/Weekly/Bi-weekly/Monthly with chevron | Selection persists |
| 5.3 | Duration: 30 days, amount per cycle: **1 cUSDC**, jitter: **3600s** | Form valid |
| 5.4 | Tick **🛡️ Auto-insure each cycle**, max premium: **0.05** | Insurance subscription will be created after stream |
| 5.5 | Click **Create encrypted stream** | Two txs total: (1) `createStream` (2) `subscribe` if auto-insure |
| 5.6 | Receipt list (Home tab) shows two new rows | `kind: "stream-create"` + `kind: "insurance-subscribe"` |

On-chain verify:
- `ObscuraPayStreamV2.getStream(streamId)` returns your stream
- localStorage `obscura.stream.salts.v1:<addr>:<streamId>` contains per-cycle salts
- `ObscuraInsuranceSubscription.getSubscription(streamId)` returns the policy

---

## 6 · PayrollResolverV2 — tick a cycle

Sidebar → **Streams** → "Send each cycle" (`StreamList mode="employer"`).

| Step | Action | Expected |
|---|---|---|
| 6.1 | Wait for `nextTickTime <= now` (or set a short period for the test) | "Tick now" button enables |
| 6.2 | Click **Tick** | FHE re-encrypt → tx → cycle counter increments, recipient gets stealth payment |
| 6.3 | Recipient checks **Receive → Stealth Inbox** | Unread badge increments in sidebar; new row appears |
| 6.4 | Cancel a cycle (advanced) | Per-cycle salt fetched from localStorage, `cancelCycle(streamId, cycle, salt)` succeeds |

---

## 7 · Inbox Index — ignore senders (`ObscuraInboxIndex`)

Receive tab → Stealth Inbox V2.

| Step | Action | Expected |
|---|---|---|
| 7.1 | "Ignore" button on a row | Row hides; on-chain `setIgnored(ephHash, true)` tx |
| 7.2 | Sidebar → Settings → "Reset inbox filter" | All ignores cleared in one tx |

---

## 8 · Insurance Subscription (`ObscuraInsuranceSubscription`)

Sidebar → **Insurance** (its own dedicated tab now — no longer hidden in "More").

| Step | Action | Expected |
|---|---|---|
| 8.1 | Buy coverage (manual policy) | Tx pending → "Your policies" lists the new policy |
| 8.2 | Pay a premium / file a dispute | Per-form on-chain calls succeed |
| 8.3 | Stake into the LP pool | Stake tx confirms |

Verify: `ObscuraInsuranceSubscription.getSubscription(streamId)` shows accrued premium.

---

## 9 · UnifiedSendForm — Direct + Stealth + Cross-chain

Sidebar → **Send**. Four-step wizard:

| Mode | Action | Expected on-chain |
|---|---|---|
| **Direct** | Recipient `0x…`, amount `1 cUSDC` → Send | `REINEIRA_CUSDC.confidentialTransfer(to, encAmt)` |
| **Stealth** | Recipient registered with meta → Send | (a) `confidentialTransfer(stealthAddr, encAmt)` (b) `ObscuraStealthRegistry.announce(...)` with metadata = `encodeAbiParameters([uint256,uint256,uint256],[0,0,amountWei])` |
| **Cross-chain** | Source chain + target Arbitrum + USDC | CCTP burn on source → mint on Arbitrum (depositForBurn flow) |

Stealth verify:
- `ObscuraStealthRegistry.Announcement` event log on Arbiscan
- Recipient's **Receive → Stealth Inbox** picks it up within 2 minutes (poll interval is now 120s + visibilitychange-aware)

---

## 10 · Bulk Payroll Import (CSV)

Sidebar → **Streams** → "Bulk payroll import".

CSV format:
```
name,address,amount_per_cycle,period_seconds,duration_cycles,jitter_seconds
Alice,0xAAA...,1.00,604800,4,3600
Bob,0xBBB...,2.50,604800,4,1800
```

| Step | Expected |
|---|---|
| Upload CSV | Preview table shows all rows |
| Click **Import** | Each row creates one stream sequentially. Status column flips green ✓ or red ✗ |
| Each successful row appears in the receipt list | `kind: "stream-create"` |

---

## 11 · Receipts (local, wallet-scoped)

Sidebar → **Advanced** → "All receipts" (or Home tab → last 5).

| Step | Expected |
|---|---|
| Per-row Arbiscan link opens the tx | ✓ |
| Trash icon removes a single receipt | ✓ |
| Switch wallet → list resets (per-address scoped storage) | ✓ |
| Settings → "Export receipts (JSON)" downloads file | ✓ |
| Settings → "Clear all receipts" empties the list | ✓ |

---

## 12 · Onboarding & Settings

| Step | Expected |
|---|---|
| First connect → wizard appears | ✓ |
| Settings → **Replay onboarding** | Wizard reappears |
| UI mode toggle Beginner ↔ Advanced | "How it works" panel hides in Advanced |
| Default send mode persists across reload | ✓ |
| Stealth auto-rotate days persists | ✓ |
| Pretty dropdowns (gradient + chevron) on every select | ✓ |

---

## 13 · UI cleanliness regression checks

After this round of cleanup the following must be true:

- [ ] **No bottom system status bar** (deleted)
- [ ] **No right sidebar** with "Active Modules / Network / Need Help?" panels (deleted)
- [ ] **Sidebar shows separate items** for `Escrow` and `Insurance` (not stuffed into "More")
- [ ] **PayPage Home zone** shows: hero diagram → How it works → recent receipts (no duplicate cUSDC card)
- [ ] **Wallet pill** appears in the page header next to the title (compact, click-to-decrypt)
- [ ] **All `<select>` elements** have the gradient-bg + emerald chevron treatment
- [ ] **Contacts page** does NOT show a red error on a fresh wallet
- [ ] **DevTools network tab** during 5 minutes idle on Receive tab: ≤ 5 RPC reads (was ~30 before throttle)
- [ ] **Background tabs** stop polling (open `/pay`, switch tabs, watch console — no scan calls)

---

## 14 · Build verification

```pwsh
cd frontend/obscura-os-main
npx tsc --noEmit          # must produce zero output
npx vite build            # must succeed; max gzip chunk ≤ 650 KB
```

Last verified: largest chunk = `index-*.js` 892 KB raw / **248 KB gzip** ✓

---

## 15 · Anti-regression invariants

These were Wave 2 bug fixes (#94, #95, #110). Spot-check that they still hold:

| Invariant | Where | Check |
|---|---|---|
| `estimateCappedFees` on every write | `src/lib/gas.ts` consumers | grep usage; no raw `gasPrice` writes |
| `ensureOperator` before any PayStream/Resolver write | `src/lib/operators.ts` | All write hooks call it |
| `waitForTransactionReceipt` after writes | hooks | No fire-and-forget txs |
| `withRateLimitRetry` wraps reads | `src/hooks/useStealthScan.ts` etc | 429 retries, exponential back-off |
| `scopedStorage.{getJSON,setJSON}(key, address)` | all localStorage | No bare `localStorage.setItem` for wallet state |

---

## 16 · Contract addresses (Arbitrum Sepolia 421614)

| Contract | Address |
|---|---|
| ObscuraPayrollResolverV2 | `0x0f130a6Fe6C200F1F8cc1594a8448AE45A3d7bBF` |
| ObscuraPayStreamV2 | `0xb2fF39C496131d4AFd01d189569aF6FEBaC54d2C` |
| ObscuraAddressBook | `0x4095065ee7cc4C9f5210A328EC08e29B4Ac74Eef` |
| ObscuraInboxIndex | `0xDF195fcfa6806F07740A5e3Bf664eE765eC98131` |
| ObscuraInsuranceSubscription | `0x0CCE5DA9E447e7B4A400fC53211dd29C51CA8102` |
| ObscuraSocialResolver | `0xCe79E7a6134b17EBC7B594C2D85090Ef3cf37578` |
| ObscuraStealthRotation | `0x47D4a7c2B2b7EDACCBf5B9d9e9C281671B2b5289` |

Open each on https://sepolia.arbiscan.io/address/&lt;addr&gt; to inspect tx history while testing.
