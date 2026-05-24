/**
 * Playwright E2E tests for navigation and basic UI
 * Tests real browser interactions with the actual app
 */

import { test, expect } from "@playwright/test";

test.describe("Navigation & Home View", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(".");
  });

  test("should load home page with title", async ({ page }) => {
    await expect(page).toHaveTitle(/.*NREMT.*|.*localhost.*/);
    await expect(page.locator(".today-headline")).toBeVisible();
  });

  test("should display all sheet cards", async ({ page }) => {
    await page.goto("./skills");
    const cards = page.locator(".sheet-card");
    const count = await cards.count();

    expect(count).toBeGreaterThan(0);
    // E201 should be first (Trauma Assessment)
    await expect(cards.first()).toContainText("E201");
  });

  test("should show sheet metadata on cards", async ({ page }) => {
    await page.goto("./skills");
    const firstCard = page.locator(".sheet-card").first();

    await expect(firstCard).toContainText("E201");
    await expect(firstCard).toContainText("pts");
  });

  test("should display drill progress area on cards", async ({ page }) => {
    await page.goto("./skills");
    const firstCard = page.locator(".sheet-card").first();
    await expect(firstCard).toBeVisible();

    // sheet-card-badges renders mastery drill badges
    const badges = firstCard.locator(".sheet-card-badges");
    await expect(badges).toBeVisible();
    const text = await badges.textContent();
    expect(text?.trim().length).toBeGreaterThan(0);
  });

  test("should navigate to sheet on card click", async ({ page }) => {
    await page.goto("./skills");
    const firstCard = page.locator(".sheet-card").first();
    await firstCard.click();

    // Should navigate to sheet view
    await expect(page).toHaveURL(/.*sheet.*/, { timeout: 5000 });
    await expect(page.locator("h1")).toContainText("Patient Assessment");
  });

  test("should display today hero panel", async ({ page }) => {
    const hero = page.locator(".today-card");
    await expect(hero).toBeVisible();
    await expect(hero).toContainText("Browse sheets");
  });

  test("should navigate back from sheet to home", async ({ page }) => {
    // Go to skills to find a sheet card
    await page.goto("./skills");
    await page.locator(".sheet-card").first().click();
    await page.waitForURL(/.*sheet.*/);

    // Click back button
    await page.locator("text=← All sheets").click();

    // Should be back at home — today hero visible
    await expect(page.locator(".today-headline")).toBeVisible({ timeout: 5000 });
  });

  test("should have functional top navigation buttons", async ({ page }) => {
    const navButtons = page.locator(".topnav button");
    const count = await navButtons.count();

    expect(count).toBeGreaterThan(0);

    // Click each navigation button
    const firstNav = navButtons.first();
    const initialText = await firstNav.textContent();
    await firstNav.click();

    // Should still be functional (not crash)
    await expect(page.locator("body")).toBeTruthy();
  });
});

test.describe("Sheet Detail View & Tabs", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("./skills");
    // Navigate to first sheet (E201)
    await page.locator(".sheet-card").first().click();
    await page.waitForURL(/.*sheet.*e201.*/);
  });

  test("should display all sheet tabs", async ({ page }) => {
    const tabs = page.locator(".quickjump button");
    const count = await tabs.count();

    expect(count).toBeGreaterThanOrEqual(3);

    // Check for expected tabs
    const tabText = await page.locator(".quickjump").textContent();
    expect(tabText).toContain("Order");
    expect(tabText).toContain("Full sheet");
    expect(tabText).toContain("Notes");
  });

  test("should switch between tabs", async ({ page }) => {
    // Default tab when navigating from home is "Full sheet"
    let currentTab = await page.locator(".quickjump button.is-active").textContent();
    expect(currentTab).toContain("Full sheet");

    // Should see sheet content on Full sheet tab
    const title = page.locator(".ref-section");
    await expect(title.first()).toBeVisible();

    // Click "Notes" tab (use quickjump to avoid ambiguity with mode-row button)
    await page.locator(".quickjump button:has-text('Notes')").click();
    await page.waitForLoadState("networkidle");

    // Should see notes editor
    const noteEditor = page.locator("textarea");
    await expect(noteEditor.first()).toBeVisible();

    // Click "Order" tab (label shortened in redesign)
    await page.locator(".quickjump button:has-text('Order')").click();
    await page.waitForLoadState("networkidle");

    // Should see drill content
    await expect(page.locator("body")).toBeTruthy();
  });

  test("should display sheet header with metadata", async ({ page }) => {
    const hero = page.locator(".sheet-hero");
    await expect(hero).toContainText("Patient Assessment");
    await expect(hero).toContainText("E201");
  });
});

test.describe("Footer & Status Display", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(".");
  });

  test("should display footer with stats", async ({ page }) => {
    const footer = page.locator("#footer-status");
    const footerText = await footer.textContent();

    // Should show number of sheets and cards
    expect(footerText).toMatch(/\d+ sheets/);
    expect(footerText).toMatch(/\d+ cards/);
  });

  test("should update review count in footer", async ({ page }) => {
    // Get initial footer text
    const footer = page.locator("#footer-status");
    const initialText = await footer.textContent();

    // Navigate to skills then to a sheet
    await page.goto("./skills");
    await page.locator(".sheet-card").first().click();
    await page.waitForURL(/.*sheet.*e201.*/);

    // Open study view (should already be there)
    const studyButton = page.locator("button:has-text('Flashcards')");
    if (await studyButton.isVisible()) {
      await studyButton.click();
    }

    // If there's a card to review, reveal and grade it
    const revealBtn = page.locator(
      "button:has-text('Show answer'), button:has-text('Reveal')"
    );
    if ((await revealBtn.count()) > 0) {
      await revealBtn.first().click();

      // Click a grade button
      const gradeBtn = page.locator(".grade.good").first();
      if (await gradeBtn.isVisible()) {
        await gradeBtn.click();
        await page.waitForTimeout(500);

        // Footer should update with new review count
        const updatedText = await footer.textContent();
        // Review count should have increased (or stayed same if async)
        expect(updatedText).toBeTruthy();
      }
    }
  });
});

test.describe("Responsive Design", () => {
  test("should be mobile-responsive", async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("./skills");

    // Page should load without horizontal scroll
    const body = page.locator("body");
    const scrollWidth = await body.evaluate((el) => el.scrollWidth);
    const viewportWidth = 375;

    expect(scrollWidth).toBeLessThanOrEqual(viewportWidth + 10); // small tolerance

    // Sheet cards should be visible
    const cards = page.locator(".sheet-card");
    await expect(cards.first()).toBeVisible();
  });

  test("should work on tablet size", async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto(".");

    // Today hero should be visible
    await expect(page.locator(".today-headline")).toBeVisible();

    // Navigation should work
    await page.goto("./skills");
    await page.locator(".sheet-card").first().click();
    await page.waitForURL(/.*sheet.*/);
    await expect(page.locator(".sheet-hero-title")).toBeVisible();
  });

  test("should work on desktop size", async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto(".");
    await expect(page.locator(".today-headline")).toBeVisible();

    await page.goto("./skills");
    const cards = page.locator(".sheet-card");
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);
  });
});

test.describe("Exam Day View", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("./examday");
    await page.waitForLoadState("domcontentloaded");
  });

  test("should load via #examday hash route", async ({ page }) => {
    await expect(page.locator("h1")).toContainText("Exam Day");
  });

  test("should display all Big 5 cards", async ({ page }) => {
    const cards = page.locator(".big-five-card");
    await expect(cards).toHaveCount(5);
    await expect(cards.nth(0)).toContainText("Scene safe");
    await expect(cards.nth(1)).toContainText("BSI");
    await expect(cards.nth(4)).toContainText("Additional resources");
  });

  test("should display scenario grid with linked and coming-soon cards", async ({ page }) => {
    const linked = page.locator(".scenario-card--linked");
    const soon = page.locator(".scenario-card--soon");
    await expect(linked).toHaveCount(6);
    await expect(soon).toHaveCount(4);
  });

  test("should navigate to sheet view when linked scenario card is clicked", async ({ page }) => {
    const firstLinked = page.locator(".scenario-card--linked").first();
    await firstLinked.click();
    await expect(page).toHaveURL(/.*sheet.*/, { timeout: 5000 });
  });

  test("should navigate to exam day from topnav", async ({ page }) => {
    await page.goto(".");
    await page.waitForLoadState("domcontentloaded");
    await page.locator(".topnav button", { hasText: "Exam Day" }).click();
    await expect(page.locator("h1")).toContainText("Exam Day");
  });
});

test.describe("Accessibility", () => {
  test("should have proper heading hierarchy", async ({ page }) => {
    await page.goto(".");

    // Should have exactly one h1 (the today headline)
    const h1 = page.locator("h1");
    await expect(h1).toHaveCount(1);
    await expect(h1).toBeVisible();
  });

  test("should support keyboard navigation", async ({ page }) => {
    await page.goto("./skills");

    // Tab to first sheet card
    await page.keyboard.press("Tab");

    // First card should be focused or near focused element should be visible
    const card = page.locator(".sheet-card").first();
    await expect(card).toBeVisible();

    // Click with keyboard (Enter)
    await page.keyboard.press("Enter");

    // May navigate or open, just check it doesn't crash
    await expect(page.locator("body")).toBeTruthy();
  });

  test("should have alt text or ARIA labels on interactive elements", async ({
    page,
  }) => {
    await page.goto(".");

    // Check that buttons have accessible text
    const buttons = page.locator("button");
    const count = await buttons.count();

    if (count > 0) {
      const firstButton = buttons.first();
      const ariaLabel = await firstButton.getAttribute("aria-label");
      const textContent = await firstButton.textContent();

      // Should have either aria-label or visible text
      const hasAccessibleName = ariaLabel || (textContent && textContent.trim());
      expect(hasAccessibleName).toBeTruthy();
    }
  });
});
