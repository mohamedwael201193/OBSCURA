import { test, expect } from "@playwright/test";

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:8080";

test.describe("Pay final smoke", () => {
  test("Pay shell renders the current IA without page errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));

    await page.goto(`${BASE}/pay`);
    await expect(page).toHaveURL(/\/pay/);

    for (const label of ["Overview", "Pay", "Get Paid", "Automations", "Activity", "Settings"]) {
      await expect(page.getByText(label, { exact: true }).first()).toBeVisible();
    }
    expect(errors, errors.join("\n")).toEqual([]);
  });

  test("mobile bottom nav keeps Pay, Get Paid, Activity, and Settings reachable", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${BASE}/pay?tab=activity`);

    for (const label of ["Pay", "Get Paid", "Activity", "Settings"]) {
      await expect(page.getByRole("button", { name: label })).toBeVisible();
    }
  });

  test("activity workspace shows private visibility, reputation, and receipts surfaces", async ({ page }) => {
    await page.goto(`${BASE}/pay?tab=activity`);

    await expect(page.getByText("Private Mode visibility", { exact: true })).toBeVisible();
    await expect(page.getByText("Pay reputation", { exact: true })).toBeVisible();
    await expect(page.getByText("Private activity", { exact: true })).toBeVisible();
    await expect(page.getByText("Local receipts", { exact: true })).toBeVisible();
  });

  test("settings notifications route renders browser push controls", async ({ page }) => {
    await page.goto(`${BASE}/pay?tab=settings&sub=notifications`);

    await expect(page.getByText("Push notifications", { exact: true })).toBeVisible();
    await expect(page.getByText(/Push alerts|cannot receive push alerts/i).first()).toBeVisible();
    await expect(page.getByText("Email notifications", { exact: true })).toBeVisible();
  });

  test("invoice and claim deep links do not crash", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));

    await page.goto(`${BASE}/pay?invoice=42`);
    await expect(page).toHaveURL(/invoice=42/);
    await expect(page.getByText("Get Paid", { exact: true }).first()).toBeVisible();

    await page.goto(`${BASE}/pay?claim=42`);
    await expect(page).toHaveURL(/claim=42/);
    await expect(page.getByText("Get Paid", { exact: true }).first()).toBeVisible();

    expect(errors, errors.join("\n")).toEqual([]);
  });

  test("service worker is served with P1.3 notification handling", async ({ request }) => {
    const response = await request.get(`${BASE}/sw.js`);
    expect(response.ok()).toBeTruthy();
    const body = await response.text();
    expect(body).toContain("pay-final-p1-3");
    expect(body).toContain("SKIP_WAITING");
    expect(body).toContain("nestedData.url");
    expect(body).toContain("OBSCURA_SHOW_NOTIFICATION");
  });
});