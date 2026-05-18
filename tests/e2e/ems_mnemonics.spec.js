/**
 * Playwright E2E tests for the EMS Mnemonics & Acronyms section.
 */

import { test, expect } from "@playwright/test";

test.describe("EMS Mnemonics & Acronyms", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("Mnemonics nav button is visible in topbar", async ({ page }) => {
    const btn = page.locator(".topnav button", { hasText: "Mnemonics" });
    await expect(btn).toBeVisible();
  });

  test("clicking Mnemonics nav navigates to mnemonics view", async ({ page }) => {
    await page.locator(".topnav button", { hasText: "Mnemonics" }).click();
    await expect(page).toHaveURL(/#mnemonics/);
    await expect(page.locator("h1")).toContainText("Mnemonics");
  });

  test("mnemonics view shows category filter chips", async ({ page }) => {
    await page.goto("/#mnemonics");
    const allChip = page.locator(".ems-filter-chip", { hasText: "All" });
    await expect(allChip).toBeVisible();
    const chips = page.locator(".ems-filter-chip");
    const count = await chips.count();
    expect(count).toBeGreaterThan(2);
  });

  test("mnemonic cards are visible on browse view", async ({ page }) => {
    await page.goto("/#mnemonics");
    const cards = page.locator(".ems-card");
    const count = await cards.count();
    expect(count).toBeGreaterThan(5);
  });

  test("SAMPLE card is visible with its acronym", async ({ page }) => {
    await page.goto("/#mnemonics");
    const acronyms = page.locator(".ems-acronym");
    const texts = await acronyms.allTextContents();
    expect(texts).toContain("SAMPLE");
  });

  test("clicking a card expands to show letter rows", async ({ page }) => {
    await page.goto("/#mnemonics");
    const firstCard = page.locator(".ems-card").first();
    // Body should be hidden initially
    const body = firstCard.locator(".ems-card-body");
    await expect(body).toBeHidden();
    // Click to expand
    await firstCard.click();
    await expect(body).toBeVisible();
    // Should show at least one letter row
    const rows = firstCard.locator(".ems-letter-row");
    const rowCount = await rows.count();
    expect(rowCount).toBeGreaterThan(0);
  });

  test("clicking expanded card collapses it", async ({ page }) => {
    await page.goto("/#mnemonics");
    const firstCard = page.locator(".ems-card").first();
    await firstCard.click(); // expand
    await firstCard.click(); // collapse
    const body = firstCard.locator(".ems-card-body");
    await expect(body).toBeHidden();
  });

  test("category filter shows only matching cards", async ({ page }) => {
    await page.goto("/#mnemonics");
    const strokeChip = page.locator(".ems-filter-chip", { hasText: "Stroke" });
    await strokeChip.click();
    const cards = page.locator(".ems-card");
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);
    // All visible cards should have the Stroke category tag
    const tags = await page.locator(".ems-category-tag").allTextContents();
    for (const tag of tags) {
      expect(tag).toBe("Stroke");
    }
  });

  test("Quiz button is visible and navigates to quiz mode", async ({ page }) => {
    await page.goto("/#mnemonics");
    const quizBtn = page.locator(".ems-quiz-btn");
    await expect(quizBtn).toBeVisible();
    await quizBtn.click();
    await expect(page).toHaveURL(/#mnemonics\/quiz/);
    const card = page.locator(".ems-quiz-card");
    await expect(card).toBeVisible();
  });

  test("quiz card shows acronym on front", async ({ page }) => {
    await page.goto("/#mnemonics/quiz");
    const acronym = page.locator(".ems-quiz-acronym");
    await expect(acronym).toBeVisible();
    const text = await acronym.textContent();
    expect(text.length).toBeGreaterThan(0);
  });

  test("back is hidden until Reveal is clicked", async ({ page }) => {
    await page.goto("/#mnemonics/quiz");
    const back = page.locator(".ems-quiz-back");
    await expect(back).toBeHidden();
    const gradeRow = page.locator(".ems-grade-row");
    await expect(gradeRow).toBeHidden();
  });

  test("clicking Reveal shows letter table and grade buttons", async ({ page }) => {
    await page.goto("/#mnemonics/quiz");
    await page.locator(".ems-reveal-btn").click();
    const back = page.locator(".ems-quiz-back");
    await expect(back).toBeVisible();
    const gradeRow = page.locator(".ems-grade-row");
    await expect(gradeRow).toBeVisible();
    const buttons = gradeRow.locator("button");
    expect(await buttons.count()).toBe(4); // Again, Hard, Good, Easy
  });

  test("grading Good advances to next card or shows session complete", async ({ page }) => {
    await page.goto("/#mnemonics/quiz");
    await page.locator(".ems-reveal-btn").click();
    const goodBtn = page.locator(".ems-grade-row .btn", { hasText: "Good" });
    await goodBtn.click();
    // Either next card loaded or session complete
    const nextCard = page.locator(".ems-quiz-card");
    const complete = page.locator(".empty-state");
    const hasCard = await nextCard.isVisible().catch(() => false);
    const hasComplete = await complete.isVisible().catch(() => false);
    expect(hasCard || hasComplete).toBe(true);
  });

  test("back link from quiz returns to browse view", async ({ page }) => {
    await page.goto("/#mnemonics/quiz");
    const backLink = page.locator(".btn-link", { hasText: "← Back" });
    await expect(backLink).toBeVisible();
    await backLink.click();
    await expect(page).toHaveURL(/#mnemonics$/);
    await expect(page.locator(".ems-mnemonic-grid")).toBeVisible();
  });

  test("Mnemonics nav button is active while on mnemonics view", async ({ page }) => {
    await page.goto("/#mnemonics");
    const btn = page.locator(".topnav button", { hasText: "Mnemonics" });
    await expect(btn).toHaveClass(/active/);
  });
});
