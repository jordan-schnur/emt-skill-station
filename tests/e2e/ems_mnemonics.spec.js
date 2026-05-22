import { test, expect } from "@playwright/test";

test.describe("EMS Mnemonics & Acronyms", () => {
  // Tests that need the home page load it themselves
  test("Mnemonics nav button is visible in topbar", async ({ page }) => {
    await page.goto(".");
    const btn = page.locator(".topnav button", { hasText: "Mnemonics" });
    await expect(btn).toBeVisible();
  });

  test("clicking Mnemonics nav navigates to mnemonics view", async ({ page }) => {
    await page.goto(".");
    await page.locator(".topnav button", { hasText: "Mnemonics" }).click();
    await expect(page).toHaveURL(/#mnemonics/);
    await expect(page.locator("h1")).toContainText("Mnemonics");
  });

  // Browse-mode tests: navigate directly to #mnemonics
  test("mnemonics view shows category filter chips", async ({ page }) => {
    await page.goto("./mnemonics");
    // Wait for the view to be fully rendered before counting chips
    await expect(page.locator(".ems-mnemonics")).toBeVisible();
    const allChip = page.locator(".ems-filter-chip", { hasText: "All" });
    await expect(allChip).toBeVisible();
    const chips = page.locator(".ems-filter-chip");
    await expect(chips.first()).toBeVisible();
    const count = await chips.count();
    expect(count).toBeGreaterThan(2);
  });

  test("mnemonic cards are visible on browse view", async ({ page }) => {
    await page.goto("./mnemonics");
    // Wait for at least one card before counting
    await expect(page.locator(".ems-card").first()).toBeVisible();
    const count = await page.locator(".ems-card").count();
    expect(count).toBeGreaterThan(5);
  });

  test("SAMPLE card is visible with its acronym", async ({ page }) => {
    await page.goto("./mnemonics");
    // Wait for acronym elements to render before collecting text
    await expect(page.locator(".ems-acronym").first()).toBeVisible();
    const texts = await page.locator(".ems-acronym").allTextContents();
    expect(texts).toContain("SAMPLE");
  });

  test("clicking a card expands to show letter rows", async ({ page }) => {
    await page.goto("./mnemonics");
    const firstCard = page.locator(".ems-card").first();
    const body = firstCard.locator(".ems-card-body");
    await expect(body).toBeHidden();
    await firstCard.click();
    await expect(body).toBeVisible();
    const rows = firstCard.locator(".ems-letter-row");
    const rowCount = await rows.count();
    expect(rowCount).toBeGreaterThan(0);
  });

  test("clicking expanded card collapses it", async ({ page }) => {
    await page.goto("./mnemonics");
    const firstCard = page.locator(".ems-card").first();
    await firstCard.click(); // expand
    await firstCard.click(); // collapse
    const body = firstCard.locator(".ems-card-body");
    await expect(body).toBeHidden();
  });

  test("category filter shows only matching cards", async ({ page }) => {
    await page.goto("./mnemonics");
    const strokeChip = page.locator(".ems-filter-chip", { hasText: "Stroke" });
    await strokeChip.click();
    const cards = page.locator(".ems-card");
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);
    const tags = await page.locator(".ems-category-tag").allTextContents();
    for (const tag of tags) {
      expect(tag).toBe("Stroke");
    }
  });

  test("Quiz button is visible and navigates to quiz mode", async ({ page }) => {
    await page.goto("./mnemonics");
    const quizBtn = page.locator(".ems-quiz-btn");
    await expect(quizBtn).toBeVisible();
    await quizBtn.click();
    await expect(page).toHaveURL(/#mnemonics\/quiz/);
    const card = page.locator(".ems-quiz-card");
    await expect(card).toBeVisible();
  });

  // Quiz-mode tests: navigate directly to #mnemonics/quiz
  test("quiz card shows acronym on front", async ({ page }) => {
    await page.goto("./mnemonics/quiz");
    const acronym = page.locator(".ems-quiz-acronym");
    await expect(acronym).toBeVisible();
    const text = await acronym.textContent();
    expect(text.length).toBeGreaterThan(0);
  });

  test("back is hidden until Reveal is clicked", async ({ page }) => {
    await page.goto("./mnemonics/quiz");
    await expect(page.locator(".ems-quiz-card")).toBeVisible();
    const back = page.locator(".ems-quiz-back");
    await expect(back).toBeHidden();
    const gradeRow = page.locator(".ems-grade-row");
    await expect(gradeRow).toBeHidden();
  });

  test("clicking Reveal shows letter table and grade buttons", async ({ page }) => {
    await page.goto("./mnemonics/quiz");
    await page.locator(".ems-reveal-btn").click();
    const back = page.locator(".ems-quiz-back");
    await expect(back).toBeVisible();
    const gradeRow = page.locator(".ems-grade-row");
    await expect(gradeRow).toBeVisible();
    const buttons = gradeRow.locator("button");
    expect(await buttons.count()).toBe(4);
  });

  test("grading Good advances to next card or shows session complete", async ({ page }) => {
    await page.goto("./mnemonics/quiz");
    await page.locator(".ems-reveal-btn").click();
    const goodBtn = page.locator(".ems-grade-row .btn", { hasText: "Good" });
    await goodBtn.click();
    // Either next card or session complete screen should appear
    const nextCard = page.locator(".ems-quiz-card");
    const complete = page.locator(".empty-state");
    await expect(nextCard.or(complete)).toBeVisible();
  });

  test("back link from quiz returns to browse view", async ({ page }) => {
    await page.goto("./mnemonics/quiz");
    // Wait for quiz to fully load before looking for the back button
    await expect(page.locator(".ems-quiz-card")).toBeVisible();
    const backLink = page.locator(".btn-link", { hasText: "← Back" });
    await expect(backLink).toBeVisible();
    await backLink.click();
    await expect(page).toHaveURL(/#mnemonics$/);
    await expect(page.locator(".ems-mnemonic-grid")).toBeVisible();
  });

  test("Mnemonics nav button is active while on mnemonics view", async ({ page }) => {
    await page.goto("./mnemonics");
    // Wait for the view to render before checking nav state
    await expect(page.locator("h1")).toContainText("Mnemonics");
    const btn = page.locator(".topnav button", { hasText: "Mnemonics" });
    await expect(btn).toHaveClass(/active/);
  });
});
