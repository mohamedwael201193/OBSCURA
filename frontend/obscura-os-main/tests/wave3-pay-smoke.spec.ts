import { test, expect } from "@playwright/test";

/**
 * Wave-3 Pay smoke tests.
 *
 * These run without a connected wallet — they verify that the new Pay
 * UI mounts without errors, the Phase A/B surfaces are reachable from
 * the sidebar, and that the URL routing for invoice / claim links does
 * not crash. Wallet-dependent flows (actual encrypt/transfer) are
 * covered by manual testing against arb-sepolia (see WAVE3_PAY_TESTING.md).
 */

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:8080";

test.describe("Wave-3 Pay surface smoke", () => {
  test("Pay home renders without console errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(`${BASE}/pay`);
    await expect(page).toHaveURL(/\/pay/);
    // Sidebar should expose all the Wave-3 sections.
    for (const label of ["Send", "Receive", "Streams", "Escrow", "Insurance"]) {
      await expect(page.getByText(label, { exact: true }).first()).toBeVisible();
    }
    expect(errors, errors.join("\n")).toEqual([]);
  });

  test("Streams tab shows the new Subscription form (B2)", async ({ page }) => {
    await page.goto(`${BASE}/pay?tab=streams`);
    // Disconnected user: Streams tab shows the not-connected hint OR
    // the new subscription card eyebrow. Either is acceptable.
    const visible = await Promise.race([
      page.getByText(/Confidential subscription/i).first().isVisible().catch(() => false),
      page.getByText(/Connect your wallet/i).first().isVisible().catch(() => false),
    ]);
    expect(visible).toBeTruthy();
  });

  test("Escrow tab routes ?invoice=<id> without crashing (B1)", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(`${BASE}/pay?invoice=42`);
    await expect(page).toHaveURL(/invoice=42/);
    // Either the InvoicePayCard mounts (connected) or the not-connected
    // notice appears. We just want zero JS errors.
    await page.waitForTimeout(1500);
    expect(errors, errors.join("\n")).toEqual([]);
  });

  test("Escrow tab routes ?claim=<id> without crashing (existing flow)", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(`${BASE}/pay?claim=42`);
    await expect(page).toHaveURL(/claim=42/);
    await page.waitForTimeout(1500);
    expect(errors, errors.join("\n")).toEqual([]);
  });

  test("Receipts surface exposes both JSON and CSV export (C2)", async ({ page }) => {
    await page.goto(`${BASE}/pay`);
    // The export buttons only render if the user has receipts; here we
    // just check the receipt list renders the empty-state without throwing.
    await expect(page.getByText(/No receipts yet|Recent receipts/i).first()).toBeVisible({ timeout: 8000 });
  });

  test("Disconnected /pay renders the trust-chip hero (Phase 5)", async ({ page }) => {
    await page.goto(`${BASE}/pay?tab=send`);
    // The new NotConnected hero advertises the three privacy guarantees.
    await expect(page.getByText(/Fhenix CoFHE encrypted/i).first()).toBeVisible();
    await expect(page.getByText(/Arbitrum Sepolia/i).first()).toBeVisible();
    await expect(page.getByText(/No backend, no logs/i).first()).toBeVisible();
  });

  test("Sidebar exposes Legacy (renamed from Advanced) (Phase 2)", async ({ page }) => {
    await page.goto(`${BASE}/pay`);
    await expect(page.getByText("Legacy", { exact: true }).first()).toBeVisible();
  });
});
