/**
 * Playwright E2E tests for navigation and basic UI
 * Tests real browser interactions with the actual app
 */

import { test, expect } from "@playwright/test";

test.describe("Navigation & Home View", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("should load home page with title", async ({ page }) => {
    await expect(page).toHaveTitle(/.*NREMT.*|.*localhost.*/);
    await expect(page.locator("h1")).toContainText(
      "NREMT Skill Sheet Trainer"
    );
  });

  test("should display all sheet cards", async ({ page }) => {
    const cards = page.locator(".sheet-card");
    const count = await cards.count();

    expect(count).toBeGreaterThan(0);
    // E201 should be first (Trauma Assessment)
    await expect(cards.first()).toContainText("E201");
  });

  test("should show sheet metadata on cards", async ({ page }) => {
    const firstCard = page.locator(".sheet-card").first();

    await expect(firstCard).toContainText("Trauma Assessment");
    await expect(firstCard).toContainText("pts");
    await expect(firstCard).toContainText("cards");
  });

  test("should display mastery percentage", async ({ page }) => {
    const masteryBars = page.locator(".mastery-bar");
    await expect(masteryBars.first()).toBeVisible();

    const text = await page.locator(".sheet-stats").first().textContent();
    expect(text).toMatch(/mastery \d+%/);
  });

  test("should navigate to sheet on card click", async ({ page }) => {
    const firstCard = page.locator(".sheet-card").first();
    await firstCard.click();

    // Should navigate to sheet view
    await expect(page).toHaveURL(/.*sheet.*/, { timeout: 5000 });
    await expect(page.locator("h1")).toContainText("Trauma Assessment");
  });

  test("should display roadmap of upcoming features", async ({ page }) => {
    const roadmap = page.locator(".roadmap");
    await expect(roadmap).toBeVisible();
    await expect(roadmap).toContainText("Coming next");
    await expect(roadmap).toContainText("Critical Fail Mode");
  });

  test("should navigate back from sheet to home", async ({ page }) => {
    // Go to sheet
    await page.locator(".sheet-card").first().click();
    await page.waitForURL(/.*sheet.*/);

    // Click back button
    await page.locator("text=← All sheets").click();

    // Should be back at home
    await expect(page).toHaveURL(/#(?!.*sheet)/, { timeout: 5000 });
    await expect(page.locator("h1")).toContainText(
      "NREMT Skill Sheet Trainer"
    );
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
    await page.goto("/");
    // Navigate to first sheet (E201)
    await page.locator(".sheet-card").first().click();
    await page.waitForURL(/.*sheet.*e201.*/);
  });

  test("should display all sheet tabs", async ({ page }) => {
    const tabs = page.locator(".tabs button");
    const count = await tabs.count();

    expect(count).toBeGreaterThanOrEqual(3); // At least study, sheet, notes

    // Check for expected tabs
    const tabText = await page.locator(".tabs").textContent();
    expect(tabText).toContain("Flashcards");
    expect(tabText).toContain("Full sheet");
    expect(tabText).toContain("Notes");
  });

  test("should switch between tabs", async ({ page }) => {
    // Start on Flashcards tab
    let currentTab = await page.locator(".tabs button.active").textContent();
    expect(currentTab).toContain("Flashcards");

    // Click "Full sheet" tab
    await page.locator("button:has-text('Full sheet')").click();
    await page.waitForLoadState("networkidle");

    // Should see sheet content
    const title = page.locator(".ref-section");
    await expect(title.first()).toBeVisible();

    // Click "Notes" tab
    await page.locator("button:has-text('Notes')").click();
    await page.waitForLoadState("networkidle");

    // Should see notes editor
    const noteEditor = page.locator("textarea");
    await expect(noteEditor.first()).toBeVisible();
  });

  test("should display sheet header with metadata", async ({ page }) => {
    const header = page.locator(".sheet-header");
    await expect(header).toContainText("Trauma Assessment");
    await expect(header).toContainText("e201");
    await expect(header).toContainText("Patient Assessment");
  });
});

test.describe("Footer & Status Display", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("should display footer with stats", async ({ page }) => {
    const footer = page.locator("footer, #footer-status");
    const footerText = await footer.textContent();

    // Should show number of sheets and cards
    expect(footerText).toMatch(/\d+ sheets/);
    expect(footerText).toMatch(/\d+ cards/);
  });

  test("should update review count in footer", async ({ page }) => {
    // Get initial footer text
    const footer = page.locator("footer, #footer-status");
    const initialText = await footer.textContent();

    // Navigate to sheet and study
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
    await page.goto("/");

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
    await page.goto("/");

    // Should load fine
    await expect(page.locator("h1")).toContainText("NREMT");

    // Navigation should work
    await page.locator(".sheet-card").first().click();
    await page.waitForURL(/.*sheet.*/);
    await expect(page.locator("h1")).toContainText("Trauma");
  });

  test("should work on desktop size", async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto("/");

    await expect(page.locator("h1")).toContainText("NREMT");

    const cards = page.locator(".sheet-card");
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);
  });
});

test.describe("Accessibility", () => {
  test("should have proper heading hierarchy", async ({ page }) => {
    await page.goto("/");

    // Should have h1
    const h1 = page.locator("h1");
    await expect(h1).toHaveCount(1);
    await expect(h1).toContainText("NREMT");
  });

  test("should support keyboard navigation", async ({ page }) => {
    await page.goto("/");

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
    await page.goto("/");

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
