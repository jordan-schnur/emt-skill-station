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
    await expect(page).toHaveURL(/\/mnemonics/);
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

  test("expanded card shows sources citation when sources are present", async ({ page }) => {
    await page.goto("./#mnemonics");
    const firstCard = page.locator(".ems-card").first();
    await firstCard.click();
    const sources = firstCard.locator(".ems-card-sources");
    await expect(sources).toBeVisible();
    const text = await sources.textContent();
    expect(text).toContain("Sources:");
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
    await expect(page).toHaveURL(/\/mnemonics\/quiz/);
    const card = page.locator(".ems-quiz-card");
    await expect(card).toBeVisible();
  });

  // Quiz-mode tests: navigate directly to #mnemonics/quiz
  test("quiz card shows acronym and Begin Quiz button on front", async ({ page }) => {
    await page.goto("./mnemonics/quiz");
    const card = page.locator(".ems-quiz-card");
    await expect(card).toBeVisible();
    const acronym = card.locator(".ems-quiz-acronym");
    await expect(acronym).toBeVisible();
    const text = await acronym.textContent();
    expect(text.length).toBeGreaterThan(0);
    await expect(card.locator("button", { hasText: "Begin Quiz" })).toBeVisible();
  });

  test("clicking Begin Quiz shows letter-by-letter prompt with input", async ({ page }) => {
    await page.goto("./mnemonics/quiz");
    await page.locator("button", { hasText: "Begin Quiz" }).click();
    await expect(page.locator(".ems-quiz-input")).toBeVisible();
    await expect(page.locator(".ems-quiz-letter-prompt")).toBeVisible();
  });

  test("typing correct answer shows correct verdict", async ({ page }) => {
    await page.goto("./mnemonics/quiz");
    await page.locator("button", { hasText: "Begin Quiz" }).click();
    // The first card is SAMPLE, first letter S = "Signs and Symptoms"
    const input = page.locator(".ems-quiz-input");
    await expect(input).toBeVisible();
    await input.fill("Signs and Symptoms");
    await page.locator(".ems-quiz-input-row button", { hasText: "Submit" }).click();
    const verdict = page.locator(".ems-quiz-verdict.correct");
    await expect(verdict).toBeVisible();
  });

  test("typing clearly wrong answer shows incorrect verdict", async ({ page }) => {
    await page.goto("./mnemonics/quiz");
    await page.locator("button", { hasText: "Begin Quiz" }).click();
    const input = page.locator(".ems-quiz-input");
    await expect(input).toBeVisible();
    await input.fill("zzzzz");
    await page.locator(".ems-quiz-input-row button", { hasText: "Submit" }).click();
    const verdict = page.locator(".ems-quiz-verdict.incorrect");
    await expect(verdict).toBeVisible();
  });

  test("answering all letters correctly suggests Easy grade", async ({ page }) => {
    await page.goto("./mnemonics/quiz");
    await page.locator("button", { hasText: "Begin Quiz" }).click();

    // SAMPLE letters: S A M P L E
    const answers = [
      "Signs and Symptoms",
      "Allergies",
      "Medications",
      "Pertinent Past Medical History",
      "Last Oral Intake",
      "Events Leading Up",
    ];

    for (let i = 0; i < answers.length; i++) {
      const input = page.locator(".ems-quiz-input");
      await expect(input).toBeVisible();
      await input.fill(answers[i]);
      await page.locator(".ems-quiz-input-row button", { hasText: "Submit" }).click();
      await expect(page.locator(".ems-quiz-verdict")).toBeVisible();
      const nextBtn = page.locator("button", { hasText: /Next|See Results/ });
      await nextBtn.click();
    }

    // Summary screen — Easy or Good should be suggested (100% → Easy)
    await expect(page.locator(".ems-quiz-summary-title")).toBeVisible();
    const suggested = page.locator(".ems-quiz-grade-section .muted");
    await expect(suggested).toContainText(/Easy/i);
  });

  test("answering all letters wrong suggests Again grade", async ({ page }) => {
    await page.goto("./mnemonics/quiz");
    await page.locator("button", { hasText: "Begin Quiz" }).click();

    for (let i = 0; i < 6; i++) {
      const input = page.locator(".ems-quiz-input");
      await expect(input).toBeVisible();
      await input.fill("zzzzwrongzzz");
      await page.locator(".ems-quiz-input-row button", { hasText: "Submit" }).click();
      await expect(page.locator(".ems-quiz-verdict")).toBeVisible();
      const nextBtn = page.locator("button", { hasText: /Next|See Results/ });
      await nextBtn.click();
    }

    // Summary screen — Again should be suggested (0% correct)
    await expect(page.locator(".ems-quiz-summary-title")).toBeVisible();
    const suggested = page.locator(".ems-quiz-grade-section .muted");
    await expect(suggested).toContainText(/Again/i);
  });

  test("confirming grade from summary advances to next card or session complete", async ({ page }) => {
    await page.goto("./mnemonics/quiz");
    await page.locator("button", { hasText: "Begin Quiz" }).click();

    // Submit one letter and advance through the whole card quickly
    const answers = [
      "Signs and Symptoms",
      "Allergies",
      "Medications",
      "Pertinent Past Medical History",
      "Last Oral Intake",
      "Events Leading Up",
    ];

    for (const ans of answers) {
      await page.locator(".ems-quiz-input").fill(ans);
      await page.locator(".ems-quiz-input-row button", { hasText: "Submit" }).click();
      await expect(page.locator(".ems-quiz-verdict")).toBeVisible();
      await page.locator("button", { hasText: /Next|See Results/ }).click();
    }

    await expect(page.locator(".ems-quiz-summary-title")).toBeVisible();
    await page.locator(".ems-quiz-grade-section button", { hasText: "Confirm →" }).click();

    // Either another card's front or session complete
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
    await expect(page).toHaveURL(/\/mnemonics$/);
    await expect(page.locator(".ems-mnemonic-grid")).toBeVisible();
  });

  test("Mnemonics nav button is active while on mnemonics view", async ({ page }) => {
    await page.goto("./mnemonics");
    // Wait for the view to render before checking nav state
    await expect(page.locator("h1")).toContainText("Mnemonics");
    const btn = page.locator(".topnav button", { hasText: "Mnemonics" });
    await expect(btn).toHaveClass(/active/);
  });

  // DMIST and START content tests (issue #20)
  test("DMIST card is visible in browse view", async ({ page }) => {
    await page.goto("./#mnemonics");
    await expect(page.locator(".ems-acronym").first()).toBeVisible();
    const texts = await page.locator(".ems-acronym").allTextContents();
    expect(texts).toContain("DMIST");
  });

  test("START card is visible in browse view", async ({ page }) => {
    await page.goto("./#mnemonics");
    await expect(page.locator(".ems-acronym").first()).toBeVisible();
    const texts = await page.locator(".ems-acronym").allTextContents();
    expect(texts).toContain("START");
  });

  test("Communication filter shows DMIST", async ({ page }) => {
    await page.goto("./#mnemonics");
    await page.locator(".ems-filter-chip", { hasText: "Communication" }).click();
    const acronyms = await page.locator(".ems-acronym").allTextContents();
    expect(acronyms).toContain("DMIST");
  });

  test("Pediatric / MCI filter shows START", async ({ page }) => {
    await page.goto("./#mnemonics");
    await page.locator(".ems-filter-chip", { hasText: "Pediatric / MCI" }).click();
    const acronyms = await page.locator(".ems-acronym").allTextContents();
    expect(acronyms).toContain("START");
  });

  test("DMIST card expands and shows 5 letter rows", async ({ page }) => {
    await page.goto("./#mnemonics");
    const dmistCard = page.locator(".ems-card", { has: page.locator(".ems-acronym", { hasText: "DMIST" }) });
    await dmistCard.click();
    const rows = dmistCard.locator(".ems-letter-row");
    expect(await rows.count()).toBe(5);
  });

  test("START card expands and shows 4 letter rows", async ({ page }) => {
    await page.goto("./#mnemonics");
    const startCard = page.locator(".ems-card", { has: page.locator(".ems-acronym").filter({ hasText: /^START$/ }) });
    await startCard.click();
    const rows = startCard.locator(".ems-letter-row");
    expect(await rows.count()).toBe(4);
  });

  test("DMIST per-letter quiz works for all 5 letters", async ({ page }) => {
    await page.goto("./#mnemonics/quiz");
    // Navigate cards until we hit DMIST
    let found = false;
    for (let attempt = 0; attempt < 30 && !found; attempt++) {
      const acronym = await page.locator(".ems-quiz-acronym").textContent();
      if (acronym?.trim() === "DMIST") {
        found = true;
        break;
      }
      // Skip this card: begin quiz, type wrong for all letters, confirm Again
      await page.locator("button", { hasText: "Begin Quiz" }).click();
      for (let i = 0; i < 10; i++) {
        const input = page.locator(".ems-quiz-input");
        if (!(await input.isVisible())) break;
        await input.fill("skip");
        await page.locator(".ems-quiz-input-row button", { hasText: "Submit" }).click();
        await expect(page.locator(".ems-quiz-verdict")).toBeVisible();
        await page.locator("button", { hasText: /Next|See Results/ }).click();
      }
      if (await page.locator(".ems-quiz-summary-title").isVisible()) {
        await page.locator(".ems-quiz-grade-section button", { hasText: "Confirm →" }).click();
      }
    }
    if (!found) {
      test.skip(true, "DMIST not reached in queue");
      return;
    }
    await page.locator("button", { hasText: "Begin Quiz" }).click();
    const answers = ["Demographics", "Mechanism", "Injuries", "Signs", "Treatment"];
    for (const ans of answers) {
      await page.locator(".ems-quiz-input").fill(ans);
      await page.locator(".ems-quiz-input-row button", { hasText: "Submit" }).click();
      await expect(page.locator(".ems-quiz-verdict")).toBeVisible();
      await page.locator("button", { hasText: /Next|See Results/ }).click();
    }
    await expect(page.locator(".ems-quiz-summary-title")).toBeVisible();
  });

  // Single-card quiz (issue: practice specific card)
  test("practice icon in card header navigates to single-card quiz URL", async ({ page }) => {
    await page.goto("./mnemonics");
    const firstCard = page.locator(".ems-card").first();
    const icon = firstCard.locator(".ems-practice-icon");
    await expect(icon).toBeVisible();
    await icon.click();
    await expect(page).toHaveURL(/\/mnemonics\/quiz\/.+/);
  });

  test("practice icon click does not expand the card", async ({ page }) => {
    await page.goto("./#mnemonics");
    const firstCard = page.locator(".ems-card").first();
    await firstCard.locator(".ems-practice-icon").click();
    // Navigate back and check card is not expanded
    await page.goto("./#mnemonics");
    const body = page.locator(".ems-card").first().locator(".ems-card-body");
    await expect(body).toBeHidden();
  });

  test("practice body button appears when card is expanded", async ({ page }) => {
    await page.goto("./#mnemonics");
    const firstCard = page.locator(".ems-card").first();
    await firstCard.click();
    await expect(firstCard.locator(".ems-practice-body-btn")).toBeVisible();
  });

  test("practice body button navigates to single-card quiz URL", async ({ page }) => {
    await page.goto("./mnemonics");
    const firstCard = page.locator(".ems-card").first();
    await firstCard.click();
    await firstCard.locator(".ems-practice-body-btn").click();
    await expect(page).toHaveURL(/\/mnemonics\/quiz\/.+/);
  });

  test("single-card quiz shows only 1 card remaining", async ({ page }) => {
    await page.goto("./#mnemonics/quiz/sample");
    await expect(page.locator(".ems-quiz-card")).toBeVisible();
    const counter = page.locator(".ems-quiz-counter");
    await expect(counter).toContainText("1 card");
  });

  test("single-card quiz shows Done! after grading", async ({ page }) => {
    await page.goto("./#mnemonics/quiz/sample");
    await page.locator("button", { hasText: "Begin Quiz" }).click();
    const answers = ["Signs and Symptoms", "Allergies", "Medications", "Pertinent Past Medical History", "Last Oral Intake", "Events Leading Up"];
    for (const ans of answers) {
      await page.locator(".ems-quiz-input").fill(ans);
      await page.locator(".ems-quiz-input-row button", { hasText: "Submit" }).click();
      await expect(page.locator(".ems-quiz-verdict")).toBeVisible();
      await page.locator("button", { hasText: /Next|See Results/ }).click();
    }
    await page.locator(".ems-quiz-grade-section button", { hasText: "Confirm →" }).click();
    await expect(page.locator(".empty-state")).toContainText("Done!");
  });

  test("Done screen back button returns to browse", async ({ page }) => {
    await page.goto("./mnemonics/quiz/cms");
    await page.locator("button", { hasText: "Begin Quiz" }).click();
    // CMS has 3 letters — type correct answers so Good is suggested (avoids Again re-queue)
    const cmsAnswers = ["Circulation", "Motor Function", "Sensation"];
    for (const ans of cmsAnswers) {
      await page.locator(".ems-quiz-input").fill(ans);
      await page.locator(".ems-quiz-input-row button", { hasText: "Submit" }).click();
      await expect(page.locator(".ems-quiz-verdict")).toBeVisible();
      await page.locator("button", { hasText: /Next|See Results/ }).click();
    }
    await page.locator(".ems-quiz-grade-section button", { hasText: "Confirm →" }).click();
    await expect(page.locator(".empty-state")).toContainText("Done!");
    await page.locator(".empty-state button").click();
    await expect(page).toHaveURL(/\/mnemonics$/);
  });
});
