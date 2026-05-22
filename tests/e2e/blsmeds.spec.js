import { test, expect } from "@playwright/test";

test.describe("BLS Medications", () => {
  test("BLS Meds nav button is visible in topnav", async ({ page }) => {
    await page.goto(".");
    const btn = page.locator(".topnav button", { hasText: "BLS Meds" });
    await expect(btn).toBeVisible();
  });

  test("clicking BLS Meds nav navigates to blsmeds view", async ({ page }) => {
    await page.goto(".");
    await page.locator(".topnav button", { hasText: "BLS Meds" }).click();
    await expect(page).toHaveURL(/#blsmeds/);
    await expect(page.locator("h1")).toContainText("BLS Medications");
  });

  test("reference tab shows 9 medication cards", async ({ page }) => {
    await page.goto("./#blsmeds");
    await expect(page.locator(".blsmed-card").first()).toBeVisible();
    const count = await page.locator(".blsmed-card").count();
    expect(count).toBe(9);
  });

  test("filter chip reduces visible medications", async ({ page }) => {
    await page.goto("./#blsmeds");
    await expect(page.locator(".blsmed-card").first()).toBeVisible();
    const allCount = await page.locator(".blsmed-card").count();
    await page.locator(".blsmed-filter-chip", { hasText: "Cardiovascular" }).click();
    const filteredCount = await page.locator(".blsmed-card").count();
    expect(filteredCount).toBeLessThan(allCount);
  });

  test("clicking a medication card expands to show indications", async ({ page }) => {
    await page.goto("./#blsmeds");
    const firstCard = page.locator(".blsmed-card").first();
    await firstCard.click();
    await expect(firstCard.locator(".blsmed-indications")).toBeVisible();
  });

  test("scenarios tab shows a vignette", async ({ page }) => {
    await page.goto("./#blsmeds/scenarios");
    await expect(page.locator(".blsmed-vignette")).toBeVisible();
  });

  test("scenarios tab: answering shows explanation", async ({ page }) => {
    await page.goto("./#blsmeds/scenarios");
    await expect(page.locator(".blsmed-vignette")).toBeVisible();
    const giveBtn = page.locator(".blsmed-gw-row .btn", { hasText: "Give" });
    const withholdBtn = page.locator(".blsmed-gw-row .btn", { hasText: "Withhold" });
    if (await giveBtn.isVisible()) {
      await giveBtn.click();
    } else {
      await withholdBtn.click();
    }
    await expect(page.locator(".blsmed-explanation")).toBeVisible();
  });

  test("drill tab shows medication name card", async ({ page }) => {
    await page.goto("./#blsmeds/drill");
    await expect(page.locator(".blsmed-drill-card")).toBeVisible();
    await expect(page.locator(".blsmed-drill-name, .blsmed-drill-clue").first()).toBeVisible();
  });

  test("drill tab: reveal shows grade buttons", async ({ page }) => {
    await page.goto("./#blsmeds/drill");
    await page.locator("button", { hasText: "Reveal" }).click();
    await expect(page.locator("button", { hasText: "Again" })).toBeVisible();
    await expect(page.locator("button", { hasText: "Good" })).toBeVisible();
  });

  test("deep-link to #blsmeds/scenarios loads scenarios tab directly", async ({ page }) => {
    await page.goto("./#blsmeds/scenarios");
    const activeTab = page.locator(".blsmed-tab-btn.active");
    await expect(activeTab).toContainText("Scenarios");
  });

  test("deep-link to #blsmeds/drill loads drill tab directly", async ({ page }) => {
    await page.goto("./#blsmeds/drill");
    const activeTab = page.locator(".blsmed-tab-btn.active");
    await expect(activeTab).toContainText("Drill");
  });
});
