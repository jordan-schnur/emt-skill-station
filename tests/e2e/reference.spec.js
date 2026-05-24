import { test, expect } from "@playwright/test";

test.describe("Reference view — tab navigation", () => {
  test("navigating to /reference shows Conditions tab active", async ({ page }) => {
    await page.goto("./reference");
    await page.waitForURL(/reference/, { timeout: 5000 });
    const activeTab = page.locator(".ref-tab-btn.active");
    await expect(activeTab).toHaveText("Conditions");
  });

  test("clicking Mnemonics tab navigates to /reference/mnemonics", async ({ page }) => {
    await page.goto("./reference");
    await page.waitForURL(/reference/, { timeout: 5000 });
    await page.click(".ref-tab-btn:has-text('Mnemonics')");
    await expect(page).toHaveURL(/reference\/mnemonics/);
    const activeTab = page.locator(".ref-tab-btn.active");
    await expect(activeTab).toHaveText("Mnemonics");
  });

  test("clicking Meds tab navigates to /reference/meds", async ({ page }) => {
    await page.goto("./reference");
    await page.waitForURL(/reference/, { timeout: 5000 });
    await page.click(".ref-tab-btn:has-text('Meds')");
    await expect(page).toHaveURL(/reference\/meds/);
    const activeTab = page.locator(".ref-tab-btn.active");
    await expect(activeTab).toHaveText("Meds");
  });

  test("direct link /reference/meds opens meds tab", async ({ page }) => {
    await page.goto("./reference/meds");
    await page.waitForURL(/reference\/meds/, { timeout: 5000 });
    const activeTab = page.locator(".ref-tab-btn.active");
    await expect(activeTab).toHaveText("Meds");
  });

  test("direct link /reference/mnemonics opens mnemonics tab", async ({ page }) => {
    await page.goto("./reference/mnemonics");
    await page.waitForURL(/reference\/mnemonics/, { timeout: 5000 });
    const activeTab = page.locator(".ref-tab-btn.active");
    await expect(activeTab).toHaveText("Mnemonics");
  });
});

test.describe("Reference view — old route redirects", () => {
  test("/mnemonics redirects to /reference/mnemonics", async ({ page }) => {
    await page.goto("./mnemonics");
    await page.waitForURL(/reference\/mnemonics/, { timeout: 5000 });
    await expect(page).toHaveURL(/reference\/mnemonics/);
  });

  test("/medconditions redirects to /reference/conditions", async ({ page }) => {
    await page.goto("./medconditions");
    await page.waitForURL(/reference\/conditions/, { timeout: 5000 });
    await expect(page).toHaveURL(/reference\/conditions/);
  });

  test("/blsmeds redirects to /reference/meds", async ({ page }) => {
    await page.goto("./blsmeds");
    await page.waitForURL(/reference\/meds/, { timeout: 5000 });
    await expect(page).toHaveURL(/reference\/meds/);
  });
});

test.describe("Reference view — search filters", () => {
  test("typing in search narrows conditions list", async ({ page }) => {
    await page.goto("./reference/conditions");
    await page.waitForURL(/reference\/conditions/, { timeout: 5000 });
    const cards = page.locator(".medcond-card");
    await cards.first().waitFor({ state: "visible" });
    const initialCount = await cards.count();
    await page.fill(".ref-search-input", "hypoglycemia");
    await page.waitForTimeout(300);
    const filteredCount = await cards.count();
    expect(filteredCount).toBeLessThan(initialCount);
    expect(filteredCount).toBeGreaterThan(0);
  });

  test("typing in search narrows mnemonics list", async ({ page }) => {
    await page.goto("./reference/mnemonics");
    await page.waitForURL(/reference\/mnemonics/, { timeout: 5000 });
    const cards = page.locator(".ems-card");
    await cards.first().waitFor({ state: "visible" });
    const initialCount = await cards.count();
    await page.fill(".ref-search-input", "OPQRST");
    await page.waitForTimeout(300);
    const filteredCount = await cards.count();
    expect(filteredCount).toBeLessThan(initialCount);
    expect(filteredCount).toBeGreaterThan(0);
  });
});

test.describe("Reference view — compare modal", () => {
  test("condition card with compareWith shows compare button when expanded", async ({ page }) => {
    await page.goto("./reference/conditions");
    await page.waitForURL(/reference\/conditions/, { timeout: 5000 });
    const cards = page.locator(".medcond-card");
    await cards.first().waitFor({ state: "visible" });
    await page.locator(".medcond-card-header").filter({ hasText: "Hypoglycemia" }).first().click();
    await expect(page.locator(".medcond-compare-inline-btn")).toBeVisible();
  });

  test("clicking compare button opens the compare modal", async ({ page }) => {
    await page.goto("./reference/conditions");
    await page.waitForURL(/reference\/conditions/, { timeout: 5000 });
    const cards = page.locator(".medcond-card");
    await cards.first().waitFor({ state: "visible" });
    await page.locator(".medcond-card-header").filter({ hasText: "Hypoglycemia" }).first().click();
    await page.click(".medcond-compare-inline-btn");
    await expect(page.locator(".compare-modal")).toBeVisible();
  });

  test("compare modal close button dismisses the modal", async ({ page }) => {
    await page.goto("./reference/conditions");
    await page.waitForURL(/reference\/conditions/, { timeout: 5000 });
    const cards = page.locator(".medcond-card");
    await cards.first().waitFor({ state: "visible" });
    await page.locator(".medcond-card-header").filter({ hasText: "Hypoglycemia" }).first().click();
    await page.click(".medcond-compare-inline-btn");
    await page.locator(".compare-modal").waitFor({ state: "visible" });
    await page.click(".compare-modal-close");
    await expect(page.locator(".compare-modal")).not.toBeVisible();
  });
});
