# 05 — User Guide

A step-by-step walkthrough of every Credit feature for end users.

> **Network:** Arbitrum Sepolia. Get test ETH from <https://www.alchemy.com/faucets/arbitrum-sepolia>.
>
> **Test cUSDC:** Use the Pay page faucet, or call `cUSDC.mint(yourAddress, 1_000_000_000)` (1000 cUSDC).

## 1 · Connect & open Credit

1. Open the app, click **Connect Wallet**, switch to Arbitrum Sepolia.
2. Click **Credit** in the top nav.
3. The page automatically initializes the FHE client (status pill in the header).

## 2 · Deposit into a vault

1. **Vaults** tab.
2. Choose **Conservative** (single-market exposure) or **Aggressive** (multi-market).
3. Enter an amount (cUSDC).
4. Click **Approve operator** if prompted (one-time per session).
5. Click **Deposit** — the page encrypts the amount client-side and sends one transaction.
6. The vault's TVL mirror updates within ~3s.

To withdraw: same form, switch to **Withdraw**, enter the encrypted amount you want back.

## 3 · Supply collateral + borrow stealth

1. **Markets** tab → pick a market (e.g. **77% LLTV** for safer terms).
2. Click **Supply collateral** → enter amount → confirm.
3. Switch to **Borrow** tab.
4. Pick the same market.
5. Enter a **borrow amount** + a **stealth destination address** (a fresh address, generated via the Pay page or your wallet).
6. Confirm. The page encrypts both fields and submits one transaction.
7. The recipient's wallet sees the cUSDC arrive — but on-chain analytics see only an encrypted blob.

## 4 · Check your health factor

1. **Health** tab.
2. Enter your collateral USD value and your debt USD value (read them from your wallet's encrypted balance UI, or from an off-chain decryptor).
3. The badge turns green/amber/red based on:
   - **Healthy**: HF > 1.5
   - **Watch**: 1.0 < HF ≤ 1.5
   - **At risk**: HF ≤ 1.0 (liquidation imminent)

## 5 · Repay

1. **Repay** tab.
2. Pick the market.
3. Enter an amount. The market clamps it to your actual debt (no overpay).
4. Confirm. If you have unaccrued interest, click **Accrue interest** first to pay it down too.

## 6 · Auto-repay (set-and-forget)

1. **Settings** tab → **Auto-repay** card.
2. Pick a market, enter `perCycle` (e.g. 5 cUSDC) and `periodDays` (e.g. 7).
3. Click **Enable**.
4. The hook will pull `perCycle` cUSDC every cycle and apply it to your debt. Cancel any time by revoking the cUSDC operator approval (also on the Settings page).

## 7 · Insurance auto-collateral

Same shape as auto-repay but on the **Insurance** card. Subscribe to an insurance product; if it pays out, the hook tops up your collateral instead of the cash going to your wallet.

## 8 · Bid on a liquidation auction

1. **Auctions** tab — see all active auctions with live countdowns.
2. Pick one, enter your bid amount (cUSDC).
3. Click **Place bid** — the bid is encrypted and stored.
4. After the deadline, anyone can click **Settle**. The contract decrypts the max bid, the winner pays the market, and they receive the collateral.

## 9 · Improve your borrowing terms with a credit score

1. **Score** tab.
2. Click **Recompute** — pulls fresh data from PayStream, Vote, AddressBook.
3. Click **Attest to market** and pick the market — this writes your score into the market for that user.
4. Future borrows in that market may use a more favorable LLTV (curator-defined).

## 10 · Recent activity

The **History** card on the Home tab shows the last 5000 blocks of Supplied/Borrowed/Repaid events across all credit markets, with Arbiscan links. Useful for verifying that a transaction landed.

## Common errors & fixes

| Symptom | Cause | Fix |
|---|---|---|
| "Operator not approved" | First time using a market/vault | Click the **Approve operator** button on the same form |
| "Insufficient cUSDC balance" | Wallet has 0 test cUSDC | Use Pay page faucet |
| Tx revert with no message | FHE pre-flight failed (e.g. amount = 0) | Re-enter a positive amount; refresh FHE status pill in header |
| "Wrong network" | Connected to mainnet | Switch to Arbitrum Sepolia (chainId 421614) |
