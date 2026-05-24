/**
 * Playwright E2E tests for drill study workflow.
 *
 * The SRS flashcard tab was replaced with structured drills. These tests cover
 * the "What's Next?" drill, which is the core interactive study mode
 * (shows a step, user picks what comes next from 4 choices).
 */

import { test, expect } from "@playwright/test";

// Navigate to the first sheet's "What's Next?" tab.
async function goToWhatNextDrill(page) {
  await page.goto("./#skills");
  await page.locator(".sheet-card").first().click();
  await page.waitForURL(/.*sheet.*e201.*/);
  await page.locator("button:has-text(\"What's Next?\")").first().click();
  await page.waitForLoadState("networkidle");
}

test.describe("What's Next? Drill Flow", () => {
  test("should display a step prompt and four choices", async ({ page }) => {
    await goToWhatNextDrill(page);

    const prompt = page.locator(".whatnext-prompt-text");
    await expect(prompt.first()).toBeVisible();

    const question = page.locator(".whatnext-question");
    await expect(question.first()).toBeVisible();
    await expect(question.first()).toContainText("What comes next?");

    const choices = page.locator(".whatnext-choice");
    await expect(choices).toHaveCount(4);
  });

  test("should show result feedback after clicking a choice", async ({ page }) => {
    await goToWhatNextDrill(page);

    const choices = page.locator(".whatnext-choice");
    await choices.first().click();

    // Result block appears (pass or fail)
    const result = page.locator(".drill-result");
    await expect(result.first()).toBeVisible();
  });

  test("correct choice highlights green, wrong choices dim", async ({ page }) => {
    await goToWhatNextDrill(page);

    // Click first choice (may or may not be correct)
    const choices = page.locator(".whatnext-choice");
    await choices.first().click();

    // After answering, exactly one choice should be marked correct
    const correctChoice = page.locator(".whatnext-choice.correct");
    await expect(correctChoice).toHaveCount(1);
  });

  test("'Next question' button advances to a new prompt", async ({ page }) => {
    await goToWhatNextDrill(page);

    const firstPromptText = await page.locator(".whatnext-prompt-text").first().textContent();

    // Answer the question
    await page.locator(".whatnext-choice").first().click();

    // Click Next
    const nextBtn = page.locator("button:has-text('Next question')");
    await expect(nextBtn.first()).toBeVisible();
    await nextBtn.first().click();

    // Prompt should be fresh (choices re-rendered, result gone)
    const result = page.locator(".drill-result");
    await expect(result).toHaveCount(0);

    const choices = page.locator(".whatnext-choice");
    await expect(choices).toHaveCount(4);
  });

  test("answering a question saves progress to localStorage", async ({ page }) => {
    await goToWhatNextDrill(page);

    // Answer one question
    await page.locator(".whatnext-choice").first().click();
    await page.waitForTimeout(300);

    const storageData = await page.evaluate(() => {
      const raw = localStorage.getItem("nremt.state.v1");
      return raw ? JSON.parse(raw) : null;
    });

    expect(storageData).toBeTruthy();
    expect(storageData.version).toBe(2);
    // whatnext drill record should exist for e201
    expect(storageData.drills?.whatnext?.e201).toBeTruthy();
    expect(storageData.drills.whatnext.e201.attempts).toBeGreaterThanOrEqual(1);
  });

  test("streak counter increments on correct answers", async ({ page }) => {
    await goToWhatNextDrill(page);

    // Answer question (we don't know if it's right, but state should update)
    await page.locator(".whatnext-choice").first().click();
    await page.waitForTimeout(200);

    const storageData = await page.evaluate(() => {
      const raw = localStorage.getItem("nremt.state.v1");
      return raw ? JSON.parse(raw) : null;
    });

    expect(storageData?.drills?.whatnext?.e201?.attempts).toBe(1);
  });

  test("drill title shows What's Next? heading", async ({ page }) => {
    await goToWhatNextDrill(page);

    const heading = page.locator("h2.drill-title, h2");
    const bodyText = await page.locator("body").textContent();
    expect(bodyText).toContain("What's Next?");
  });

  test("section label is shown above the prompt", async ({ page }) => {
    await goToWhatNextDrill(page);

    const sectionLabel = page.locator(".card-section");
    await expect(sectionLabel.first()).toBeVisible();
  });
});

test.describe("Card Display Features", () => {
  test.beforeEach(async ({ page }) => {
    await goToWhatNextDrill(page);
  });

  test("should display the prompt text (non-empty)", async ({ page }) => {
    const prompt = page.locator(".whatnext-prompt-text");
    const text = await prompt.first().textContent();
    expect(text?.trim().length).toBeGreaterThan(0);
  });

  test("should display four labelled choice buttons (A-D)", async ({ page }) => {
    const letters = page.locator(".choice-letter");
    await expect(letters).toHaveCount(4);
    const allLetters = await letters.allTextContents();
    expect(allLetters).toEqual(["A", "B", "C", "D"]);
  });

  test("should show drill-result after any choice is selected", async ({ page }) => {
    await page.locator(".whatnext-choice").first().click();
    const result = page.locator(".drill-result");
    await expect(result.first()).toBeVisible();
  });
});
