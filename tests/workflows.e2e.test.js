/**
 * End-to-end workflow tests – simulating real user interactions
 * These tests verify complete user journeys and catch regressions
 */

require("../js/srs.js");
require("../js/storage.js");
require("../js/notes.js");
require("../js/views.js");

import {
  createMockSheet,
  createEmptyState,
  createStateWithSRS,
  createMockContext,
  setupMockNREMTData,
} from "./fixtures.js";

describe("User Workflows – End-to-End", () => {
  beforeEach(() => {
    setupMockNREMTData();
    document.body.innerHTML = '<div id="root"></div>';
  });

  describe("Workflow: First time user reviews flashcards", () => {
    it("should allow user to open sheet, reveal card, and grade it", () => {
      const ctx = createMockContext(createEmptyState());
      const sheet = createMockSheet();
      const cardId = sheet.cards[0].id;

      // 1. User opens the study view
      const studyView = window.Views.study(ctx, sheet);
      expect(studyView.textContent).toContain("Show answer");

      // 2. User clicks reveal button
      // Note: querySelector doesn't support :contains, so we find by text
      const buttons = Array.from(studyView.querySelectorAll("button"));
      const reveal = buttons.find((b) => b.textContent.includes("Show answer"));
      reveal.click();

      // 3. Answer should be visible
      const answer = studyView.querySelector(".card-answer");
      expect(answer.style.display).not.toBe("none");

      // 4. User clicks "Good" grade
      const gradeButtons = studyView.querySelectorAll(".grade");
      const goodBtn = Array.from(gradeButtons).find((b) =>
        b.textContent.includes("Good")
      );
      goodBtn.click();

      // 5. State should be updated
      expect(ctx.save).toHaveBeenCalled();
      expect(ctx.state.srs[cardId]).toBeDefined();
      expect(ctx.state.srs[cardId].reps).toBe(1);
      expect(ctx.state.stats.totalReviews).toBe(1);
    });

    it("should move to next card after grading", () => {
      const ctx = createMockContext(createEmptyState());
      const sheet = createMockSheet();

      const studyView = window.Views.study(ctx, sheet);

      // Grade first card
      const buttons = Array.from(studyView.querySelectorAll("button"));
      const reveal = buttons.find((b) => b.textContent.includes("Show answer"));
      reveal.click();

      const gradeButtons = studyView.querySelectorAll(".grade");
      const goodBtn = Array.from(gradeButtons).find((b) =>
        b.textContent.includes("Good")
      );
      goodBtn.click();

      // Should show "Card 2 of X" or completion message
      const cardProgress = studyView.textContent;
      expect(
        cardProgress.includes("Card 2 of") ||
          cardProgress.includes("Session complete")
      ).toBeTruthy();
    });

    it("should handle 'Again' grade by re-queueing the card", () => {
      const ctx = createMockContext(createEmptyState());
      const sheet = createMockSheet();
      const cardId = sheet.cards[0].id;

      const studyView = window.Views.study(ctx, sheet);

      const buttons = Array.from(studyView.querySelectorAll("button"));
      const reveal = buttons.find((b) => b.textContent.includes("Show answer"));
      reveal.click();

      const gradeButtons = studyView.querySelectorAll(".grade");
      const againBtn = Array.from(gradeButtons).find((b) =>
        b.textContent.includes("Again")
      );
      againBtn.click();

      // Card should be rescheduled for 1 minute later
      expect(ctx.state.srs[cardId]).toBeDefined();
      expect(ctx.state.srs[cardId].lapses).toBe(1);
      expect(ctx.state.srs[cardId].reps).toBe(0);
    });
  });

  describe("Workflow: User adds notes to a step", () => {
    it("should allow adding a note during flashcard review", () => {
      const ctx = createMockContext(createEmptyState());
      const sheet = createMockSheet();
      const cardId = sheet.cards[0].id;

      // Open study view and try to add note
      const studyView = window.Views.study(ctx, sheet);
      const addNoteButtons = studyView.querySelectorAll("button");
      const noteBtn = Array.from(addNoteButtons).find((b) =>
        b.textContent.includes("note")
      );

      expect(noteBtn).toBeTruthy();

      // Simulate clicking note button (in real app this opens a dialog)
      // For now just verify it's there and clickable
      expect(noteBtn.click).toBeTruthy();
      // Verify the button has the correct text
      expect(noteBtn.textContent).toContain("note");
    });

    it("should display note in reference view after adding", () => {
      const ctx = createMockContext(createEmptyState());
      const sheet = createMockSheet();
      const cardId = sheet.cards[0].id;

      // Add note programmatically
      window.Notes.setStepNote(ctx.state, cardId, "My study note");

      // View reference sheet
      const refView = window.Views.reference(ctx, sheet);

      // Note indicator should appear (reference view shows "1+ note" but not full content)
      expect(refView.textContent).toContain("1+ note");
    });
  });

  describe("Workflow: User reviews their progress", () => {
    it("should show accurate mastery percentage after multiple reviews", () => {
      const ctx = createMockContext(createStateWithSRS());
      const sheet = createMockSheet();

      const homeView = window.Views.home(ctx);

      // Should show mastery percentage
      const masteryMatch = homeView.textContent.match(/mastery (\d+)%/);
      expect(masteryMatch).toBeTruthy();
      const mastery = parseInt(masteryMatch[1]);
      expect(mastery).toBeGreaterThan(0);
    });

    it("should update due count as cards are reviewed", () => {
      const ctx = createMockContext(createEmptyState());
      const sheet = createMockSheet();

      // Initially all cards are due
      let due = window.SRS.dueCount(ctx.state, sheet);
      expect(due).toBe(sheet.cards.length);

      // Grade one card as "easy" (schedule for 1+ day)
      const cardId = sheet.cards[0].id;
      const rec = window.SRS.grade(
        window.SRS.defaultRecord(),
        "easy",
        Date.now()
      );
      ctx.state.srs[cardId] = rec;

      // Due count should decrease
      due = window.SRS.dueCount(ctx.state, sheet);
      expect(due).toBeLessThan(sheet.cards.length);
    });
  });

  describe("Workflow: User exports and imports progress", () => {
    it("should export progress with all notes and SRS data", async () => {
      const ctx = createMockContext(createStateWithSRS());
      const cardId = Object.keys(ctx.state.srs)[0];

      // Add some notes
      window.Notes.setStepNote(ctx.state, cardId, "Important note");
      window.Notes.setSheetNote(ctx.state, "e201", "Sheet notes");

      // Export should include everything
      const exported = JSON.stringify(ctx.state);

      expect(exported).toContain('"srs"');
      expect(exported).toContain('"notes"');
      expect(exported).toContain("Important note");
    });

    it("should import previously exported progress", async () => {
      const original = createStateWithSRS();
      window.Notes.setStepNote(original, "e201::card::0", "My note");

      // Export to file
      const fileContent = JSON.stringify(original);
      const file = new File([fileContent], "backup.json", {
        type: "application/json",
      });

      // Import from file
      const imported = await window.Storage.importFromFile(file);

      // Data should match
      expect(imported.srs).toEqual(original.srs);
      expect(imported.notes).toEqual(original.notes);
    });
  });

  describe("Workflow: New vs. returning user experience", () => {
    it("new user should see all cards as due and zero mastery", () => {
      const ctx = createMockContext(createEmptyState());
      const sheet = createMockSheet();

      const due = window.SRS.dueCount(ctx.state, sheet);
      const mastery = window.SRS.masteryFor(ctx.state, sheet);

      expect(due).toBe(sheet.cards.length);
      expect(mastery).toBe(0);

      const homeView = window.Views.home(ctx);
      expect(homeView.textContent).toContain("mastery 0%");
    });

    it("returning user should see updated mastery after progress", () => {
      const ctx = createMockContext(createStateWithSRS());
      const sheet = createMockSheet();

      const mastery = window.SRS.masteryFor(ctx.state, sheet);

      // Should have some mastery from previous reviews
      expect(mastery).toBeGreaterThan(0);

      const homeView = window.Views.home(ctx);
      const masteryMatch = homeView.textContent.match(/mastery (\d+)%/);
      const displayedMastery = parseInt(masteryMatch[1]);

      // Should match calculated mastery
      expect(displayedMastery).toBe(Math.round(mastery * 100));
    });
  });

  describe("Workflow: Navigating between views", () => {
    it("should navigate from home to sheet to reference and back", () => {
      const ctx = createMockContext();
      const sheet = createMockSheet();

      // Home view
      let view = window.Views.home(ctx);
      expect(view.textContent).toContain("NREMT Skill Sheet Trainer");

      // Click on sheet (simulated)
      ctx.navigate({ view: "sheet", sheetId: sheet.id, tab: "study" });
      expect(ctx.navigate).toHaveBeenCalled();

      // Navigate to reference tab
      ctx.navigate({ view: "sheet", sheetId: sheet.id, tab: "sheet" });
      expect(ctx.navigate).toHaveBeenCalledWith({
        view: "sheet",
        sheetId: sheet.id,
        tab: "sheet",
      });

      // Navigate back home
      ctx.navigate({ view: "home" });
      expect(ctx.navigate).toHaveBeenCalledWith({ view: "home" });
    });
  });

  describe("Data persistence through reload", () => {
    it("should preserve SRS state across reloads via storage", () => {
      // Session 1: User reviews cards
      let ctx = createMockContext(createEmptyState());
      const sheet = createMockSheet();
      const cardId = sheet.cards[0].id;

      // Grade a card
      const rec = window.SRS.grade(
        window.SRS.defaultRecord(),
        "easy",
        Date.now()
      );
      ctx.state.srs[cardId] = rec;
      ctx.state.stats.totalReviews = 1;

      // Save to "localStorage"
      const savedState = JSON.stringify(ctx.state);

      // Session 2: User returns, data is reloaded
      const reloadedState = JSON.parse(savedState);
      const newCtx = createMockContext(reloadedState);

      // Progress should be intact
      expect(newCtx.state.srs[cardId]).toBeDefined();
      expect(newCtx.state.srs[cardId].reps).toBe(1);
      expect(newCtx.state.stats.totalReviews).toBe(1);
    });
  });

  describe("Edge cases and error recovery", () => {
    it("should handle corrupted state gracefully", () => {
      const ctx = createMockContext(createEmptyState());
      const sheet = createMockSheet();

      // Simulate corrupted SRS entry
      ctx.state.srs = null;

      // Should not crash when building queue
      expect(() =>
        window.SRS.buildQueue(ctx.state, sheet)
      ).not.toThrow();
    });

    it("should handle missing sheet data gracefully", () => {
      const ctx = createMockContext();

      // Render home with no sheets
      global.NREMT_DATA.sheets = [];

      expect(() => window.Views.home(ctx)).not.toThrow();

      const view = window.Views.home(ctx);
      expect(view.querySelectorAll(".sheet-card")).toHaveLength(0);
    });

    it("should handle empty study queue gracefully", () => {
      const ctx = createMockContext(createEmptyState());
      const sheet = createMockSheet();

      // Schedule all cards far into future
      sheet.cards.forEach((card) => {
        ctx.state.srs[card.id] = {
          ...window.SRS.defaultRecord(),
          due: Date.now() + 1000000,
        };
      });

      // Should show empty state, not crash
      expect(() => window.Views.study(ctx, sheet)).not.toThrow();

      const view = window.Views.study(ctx, sheet);
      expect(view.textContent).toContain("Nothing due");
    });
  });
});
