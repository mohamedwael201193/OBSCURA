import { test, expect } from "@playwright/test";

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:5175";

test.describe("Vote V6 navigation", () => {
  test("desktop shell renders four Vote sections without page errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));

    await page.goto(`${BASE}/vote`);
    await expect(page).toHaveURL(/\/vote/);

    for (const label of ["Overview", "Proposals", "Participation", "Advanced Governance"]) {
      await page.getByRole("button", { name: label, exact: true }).first().click();
      await expect(page.getByRole("button", { name: label, exact: true }).first()).toBeVisible();
    }

    expect(errors, errors.join("\n")).toEqual([]);
  });

  test("mobile bottom nav keeps four Vote destinations reachable without horizontal overflow", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${BASE}/vote`);

    const mobileNav = page.locator("nav.fixed.bottom-0");
    for (const label of ["Home", "Vote", "Profile", "Advanced"]) {
      await expect(mobileNav.getByText(label, { exact: true })).toBeVisible();
    }

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2);
    expect(overflow).toBe(false);
  });

  test("proposals sub-nav exposes browse, vote, create, and results modes", async ({ page }) => {
    await page.goto(`${BASE}/vote`);
    await page.getByRole("button", { name: "Proposals", exact: true }).first().click();

    for (const label of ["Browse", "Vote", "Create", "Results"]) {
      await page.getByRole("button", { name: label, exact: true }).first().click();
      await expect(page.getByRole("heading", { name: "Proposals" })).toBeVisible();
    }
  });

  test("participation profile and advanced intro copy render", async ({ page }) => {
    await page.goto(`${BASE}/vote`);

    await page.getByRole("button", { name: "Participation", exact: true }).first().click();
    await expect(page.getByRole("heading", { name: "Participation profile" })).toBeVisible();

    await page.getByRole("button", { name: "Advanced Governance", exact: true }).first().click();
    await expect(page.getByRole("heading", { name: "Advanced governance", exact: true }).first()).toBeVisible();
  });
});
