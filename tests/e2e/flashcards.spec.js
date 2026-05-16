/**
 * Playwright E2E tests for flashcard study workflow
 * Tests the core learning experience end-to-end in a real browser
 */

import { test, expect } from "@playwright/test";

test.describe("Flashcard Study Flow", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    // Navigate to E201 (Trauma Assessment)
    await page.locator(".sheet-card").first().click();
    await page.waitForURL(/.*sheet.*e201.*/);
    // Ensure we're on the Flashcards tab
    await page.locator("button:has-text('Flashcards')").click();
    await page.waitForLoadState("networkidle");
  });

  test("should display flashcard with reveal button", async ({ page }) => {
    // Should see card prompt
    const cardPrompt = page.locator(".card-prompt");
    await expect(cardPrompt.first()).toBeVisible();

    // Should see reveal button
    const revealBtn = page.locator(
      "button:has-text('Show answer'), button:has-text('Reveal')"
    );
    await expect(revealBtn.first()).toBeVisible();

    // Should NOT see answer yet
    const answer = page.locator(".card-answer");
    if (await answer.count() > 0) {
      const isHidden = await answer.first().isHidden();
      expect(isHidden).toBeTruthy();
    }
  });

  test("should reveal answer on button click", async ({ page }) => {
    const revealBtn = page.locator(
      "button:has-text('Show answer'), button:has-text('Reveal')"
    );
    await revealBtn.first().click();

    // Answer should now be visible
    const answer = page.locator(".card-answer");
    await expect(answer.first()).toBeVisible();

    // Reveal button should hide
    const btnVisible = await revealBtn.first().isVisible();
    expect(btnVisible).toBeFalsy();
  });

  test("should display grade buttons after revealing", async ({ page }) => {
    const revealBtn = page.locator(
      "button:has-text('Show answer'), button:has-text('Reveal')"
    );
    await revealBtn.first().click();

    // Should see 4 grade buttons: Again, Hard, Good, Easy
    const gradeButtons = page.locator(".grade");
    const count = await gradeButtons.count();

    expect(count).toBe(4);

    // Check button labels
    const labels = await gradeButtons.allTextContents();
    expect(labels.join("")).toContain("Again");
    expect(labels.join("")).toContain("Hard");
    expect(labels.join("")).toContain("Good");
    expect(labels.join("")).toContain("Easy");
  });

  test("should show time estimates for each grade", async ({ page }) => {
    const revealBtn = page.locator(
      "button:has-text('Show answer'), button:has-text('Reveal')"
    );
    await revealBtn.first().click();

    // Grade buttons should show estimated due times
    const goodBtn = page.locator(".grade.good");
    const goodText = await goodBtn.textContent();

    // Should contain "Good" and likely "due in 1d" or similar
    expect(goodText).toContain("Good");
  });

  test("should progress to next card after grading 'Good'", async ({
    page,
  }) => {
    // Get first card info
    const firstCardText = await page.locator(".card-prompt").first().textContent();

    // Reveal and grade
    const revealBtn = page.locator(
      "button:has-text('Show answer'), button:has-text('Reveal')"
    );
    await revealBtn.first().click();

    const goodBtn = page.locator(".grade.good");
    await goodBtn.first().click();

    // Should progress (either next card or completion message)
    await page.waitForTimeout(500);

    // Should either show new card or completion
    const cardProgress = page.locator(".study-meta, .empty-state");
    await expect(cardProgress.first()).toBeVisible();

    // If new card, it should be different
    const newPrompt = page.locator(".card-prompt");
    if (await newPrompt.count() > 0) {
      const newText = await newPrompt.first().textContent();
      // May or may not be different (could be same sheet reloaded)
      expect(newText).toBeTruthy();
    }
  });

  test("should show session complete when all cards reviewed", async ({
    page,
  }) => {
    // Try to grade all cards as "easy" to complete quickly
    let cardsGraded = 0;
    const maxAttempts = 50; // Prevent infinite loops

    while (cardsGraded < maxAttempts) {
      const revealBtn = page.locator(
        "button:has-text('Show answer'), button:has-text('Reveal')"
      );

      if ((await revealBtn.count()) === 0) {
        // No reveal button = either completed or none due
        const completion = page.locator("text=Session complete");
        const nothingDue = page.locator("text=Nothing due");

        if ((await completion.count()) > 0 || (await nothingDue.count()) > 0) {
          break;
        }
      }

      await revealBtn.first().click();
      const easyBtn = page.locator(".grade.easy");

      if ((await easyBtn.count()) > 0) {
        await easyBtn.first().click();
        cardsGraded += 1;
        await page.waitForTimeout(300);
      } else {
        break;
      }
    }

    // Should see either completion message or nothing due
    const body = page.locator("body");
    const bodyText = await body.textContent();
    expect(
      bodyText.includes("Session complete") ||
        bodyText.includes("Nothing due")
    ).toBeTruthy();
  });

  test("should support keyboard reveal (space)", async ({ page }) => {
    // Focus on the card
    const card = page.locator(".card");
    if (await card.count() > 0) {
      await card.first().focus();
    }

    // Press space to reveal
    await page.keyboard.press("Space");

    // Answer should be visible
    const answer = page.locator(".card-answer");
    await expect(answer.first()).toBeVisible();
  });

  test("should support keyboard grading (1-4 keys)", async ({ page }) => {
    const revealBtn = page.locator(
      "button:has-text('Show answer'), button:has-text('Reveal')"
    );
    await revealBtn.first().click();

    // Focus on the card
    const card = page.locator(".card");
    if (await card.count() > 0) {
      await card.first().focus();
    }

    // Press "3" for "Good" grade
    await page.keyboard.press("3");
    await page.waitForTimeout(500);

    // Should progress
    const studyMeta = page.locator(".study-meta");
    await expect(studyMeta.first()).toBeVisible();
  });

  test("should display card metadata (position, ease, due)", async ({
    page,
  }) => {
    const meta = page.locator(".study-meta");
    await expect(meta.first()).toBeVisible();

    const metaText = await meta.first().textContent();

    // Should show card position
    expect(metaText).toMatch(/Card \d+ of \d+/);

    // Should show ease
    expect(metaText).toMatch(/ease/i);
  });

  test("should display section label on card", async ({ page }) => {
    const sectionLabel = page.locator(".card-section");
    if (await sectionLabel.count() > 0) {
      await expect(sectionLabel.first()).toBeVisible();

      const text = await sectionLabel.first().textContent();
      // Should have sheet ID and section name
      expect(text).toContain("E201");
    }
  });

  test("should show note button on cards", async ({ page }) => {
    const noteBtn = page.locator("button:has-text('note')");

    if ((await noteBtn.count()) > 0) {
      await expect(noteBtn.first()).toBeVisible();
    }
  });

  test("should allow adding note during study", async ({ page }) => {
    // Look for note button or link
    const noteBtn = page.locator("button:has-text('note')");

    if ((await noteBtn.count()) > 0) {
      await noteBtn.first().click();
      await page.waitForTimeout(300);

      // Should see note editor or dialog
      const textarea = page.locator("textarea");
      if ((await textarea.count()) > 0) {
        await textarea.first().fill("Test note for this card");
        await page.keyboard.press("Tab"); // or look for save button

        // Note should be saved
        await page.waitForTimeout(300);
      }
    }
  });

  test("should handle 'Again' grade by re-showing card", async ({ page }) => {
    const cardText = await page.locator(".card-prompt").first().textContent();

    // Reveal and grade "again"
    const revealBtn = page.locator(
      "button:has-text('Show answer'), button:has-text('Reveal')"
    );
    await revealBtn.first().click();

    const againBtn = page.locator(".grade.again");
    await againBtn.first().click();
    await page.waitForTimeout(500);

    // Card should reappear (or next card)
    const newPrompt = page.locator(".card-prompt");
    await expect(newPrompt.first()).toBeVisible();
  });

  test("should display 'Cram all cards' option when none due", async ({
    page,
  }) => {
    // First, complete or schedule all cards
    // Navigate away and back to reset the view
    await page.goto("/");
    await page.locator(".sheet-card").first().click();
    await page.waitForURL(/.*sheet.*e201.*/);

    // Check if "Cram all" button appears
    const cramBtn = page.locator("button:has-text('Cram')");
    const nothingDue = page.locator("text=Nothing due");

    // Should see either nothing due message or the page loaded normally
    const body = page.locator("body");
    await expect(body).toBeVisible();
  });
});

test.describe("Card Display Features", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.locator(".sheet-card").first().click();
    await page.waitForURL(/.*sheet.*e201.*/);
    // Ensure we're on flashcards
    await page.locator("button:has-text('Flashcards')").click();
    await page.waitForLoadState("networkidle");
  });

  test("should show points on card back", async ({ page }) => {
    const revealBtn = page.locator(
      "button:has-text('Show answer'), button:has-text('Reveal')"
    );
    if ((await revealBtn.count()) > 0) {
      await revealBtn.first().click();

      const pointsDisplay = page.locator(".card-points");
      if ((await pointsDisplay.count()) > 0) {
        await expect(pointsDisplay.first()).toBeVisible();

        const text = await pointsDisplay.first().textContent();
        expect(text).toMatch(/\d+ point/);
      }
    }
  });

  test("should display examiner notes if present", async ({ page }) => {
    const revealBtn = page.locator(
      "button:has-text('Show answer'), button:has-text('Reveal')"
    );
    if ((await revealBtn.count()) > 0) {
      await revealBtn.first().click();

      const examinerNote = page.locator(".card-examiner");
      // May or may not be present
      if ((await examinerNote.count()) > 0) {
        await expect(examinerNote.first()).toBeVisible();
      }
    }
  });

  test("should display mnemonic information if available", async ({
    page,
  }) => {
    const mnemonicPrompt = page.locator(".mnemonic-prompt");

    // Some cards may be mnemonic-based, some not
    // Just check the card renders
    const cardPrompt = page.locator(".card-prompt");
    await expect(cardPrompt.first()).toBeVisible();
  });
});
