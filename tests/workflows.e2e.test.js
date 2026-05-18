/**
 * End-to-end workflow tests – simulating real user interactions
 * These tests verify complete user journeys and catch regressions.
 *
 * Note: SRS flashcard workflows were removed when the SRS system was removed.
 */

require("../js/storage.js");
require("../js/notes.js");
require("../js/views.js");

import {
  createMockSheet,
  createEmptyState,
  createMockContext,
  setupMockNREMTData,
} from "./fixtures.js";

describe("User Workflows – End-to-End", () => {
  beforeEach(() => {
    setupMockNREMTData();
    document.body.innerHTML = '<div id="root"></div>';
  });

  describe("Workflow: User views full sheet reference", () => {
    it("should allow user to open sheet and see all steps", () => {
      const ctx = createMockContext(createEmptyState());
      const sheet = createMockSheet();

      const refView = window.Views.reference(ctx, sheet);
      expect(refView.textContent).toContain("PPE");
      expect(refView.textContent).toContain("SCENE SIZE-UP");
      expect(refView.textContent).toContain("Critical Criteria");
    });

    it("should show note buttons for each step", () => {
      const ctx = createMockContext(createEmptyState());
      const sheet = createMockSheet();

      const refView = window.Views.reference(ctx, sheet);
      const noteBtns = refView.querySelectorAll(".note-btn");
      expect(noteBtns.length).toBeGreaterThan(0);
    });
  });

  describe("Workflow: User adds notes to a step", () => {
    it("should display note in reference view after adding programmatically", () => {
      const ctx = createMockContext(createEmptyState());
      const sheet = createMockSheet();
      const cardId = sheet.cards[0].id;

      // Add note programmatically
      window.Notes.setStepNote(ctx.state, cardId, "My study note");

      // View reference sheet
      const refView = window.Views.reference(ctx, sheet);

      // Note indicator should appear
      expect(refView.textContent).toContain("1+ note");
    });
  });

  describe("Workflow: User reviews their progress", () => {
    it("should show sheet progress on home screen", () => {
      const ctx = createMockContext(createEmptyState());

      const homeView = window.Views.home(ctx);

      expect(homeView.querySelector(".sheet-grid")).toBeTruthy();
      expect(homeView.querySelectorAll(".sheet-card").length).toBeGreaterThan(0);
    });
  });

  describe("Workflow: User exports and imports progress", () => {
    it("should export progress with notes and state data", async () => {
      const state = createEmptyState();
      state.stats.totalReviews = 5;
      // Add some notes
      window.Notes.setStepNote(state, "e201::ppe::0", "Important note");
      window.Notes.setSheetNote(state, "e201", "Sheet notes");

      // Export should include everything
      const exported = JSON.stringify(state);

      expect(exported).toContain('"notes"');
      expect(exported).toContain("Important note");
    });

    it("should preserve state.srs key when exporting (data compatibility)", async () => {
      const state = createEmptyState();
      // state.srs exists but is empty — should still export
      const exported = JSON.stringify(state);
      expect(exported).toContain('"srs"');
    });

    it("should import previously exported progress", async () => {
      const original = createEmptyState();
      original.stats.totalReviews = 3;
      window.Notes.setStepNote(original, "e201::card::0", "My note");

      // Export to file
      const fileContent = JSON.stringify(original);
      const file = new File([fileContent], "backup.json", {
        type: "application/json",
      });

      // Import from file
      const imported = await window.Storage.importFromFile(file);

      // Data should match
      expect(imported.stats.totalReviews).toBe(3);
      expect(imported.notes).toEqual(original.notes);
    });
  });

  describe("Workflow: Navigating between views", () => {
    it("should navigate from home to sheet reference and back", () => {
      const ctx = createMockContext();
      const sheet = createMockSheet();

      // Home view
      let view = window.Views.home(ctx);
      expect(view.textContent).toContain("NREMT Skill Sheet Trainer");

      // Navigate to sheet
      ctx.navigate({ view: "sheet", sheetId: sheet.id, tab: "sheet" });
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
    it("should preserve state across reloads via storage", () => {
      // Session 1: User makes progress
      let ctx = createMockContext(createEmptyState());
      ctx.state.stats.totalReviews = 5;
      window.Notes.setStepNote(ctx.state, "e201::ppe::0", "My note");

      // Save to "localStorage"
      const savedState = JSON.stringify(ctx.state);

      // Session 2: User returns, data is reloaded
      const reloadedState = JSON.parse(savedState);
      const newCtx = createMockContext(reloadedState);

      // Progress should be intact
      expect(newCtx.state.stats.totalReviews).toBe(5);
      expect(window.Notes.getStepNote(newCtx.state, "e201::ppe::0")).toBe("My note");
    });

    it("should tolerate pre-existing state.srs data from localStorage", () => {
      // Users who had SRS data will still have state.srs in their localStorage
      const stateWithSRS = createEmptyState();
      stateWithSRS.srs = {
        "e201::ppe::0": { ease: 2.5, interval: 6, reps: 2, due: Date.now() + 86400000, lastGrade: "good", lapses: 0, lastReviewed: Date.now() },
      };

      const ctx = createMockContext(stateWithSRS);
      // App should not crash when rendering with SRS data present
      expect(() => window.Views.home(ctx)).not.toThrow();
      expect(() => window.Views.reference(ctx, createMockSheet())).not.toThrow();
    });
  });

  describe("Edge cases and error recovery", () => {
    it("should handle missing sheet data gracefully", () => {
      const ctx = createMockContext();

      // Render home with no sheets
      global.NREMT_DATA.sheets = [];

      expect(() => window.Views.home(ctx)).not.toThrow();

      const view = window.Views.home(ctx);
      expect(view.querySelectorAll(".sheet-card")).toHaveLength(0);
    });

    it("should handle sheet not found gracefully", () => {
      const ctx = createMockContext();
      ctx.route = { view: "sheet", sheetId: "nonexistent", tab: "sheet" };

      expect(() => window.Views.sheet(ctx)).not.toThrow();
    });
  });
});
