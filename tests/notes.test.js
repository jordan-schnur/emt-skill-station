/**
 * Unit tests for notes.js – per-step and per-sheet note management
 */

require("../js/notes.js");

import { createEmptyState, createStateWithNotes, createMockSheet } from "./fixtures.js";

describe("Notes – Step and Sheet notes", () => {
  describe("getStepNote", () => {
    it("should return an empty string when no note exists", () => {
      const state = createEmptyState();

      const note = window.Notes.getStepNote(state, "card1");

      expect(note).toBe("");
    });

    it("should return the note text for an existing step note", () => {
      const state = createStateWithNotes();

      const note = window.Notes.getStepNote(state, "e201::ppe::0");

      expect(note).toBe("Remember: gloves, mask, eye protection");
    });

    it("should handle missing notes object gracefully", () => {
      const state = { srs: {}, notes: null };

      const note = window.Notes.getStepNote(state, "card1");

      expect(note).toBe("");
    });

    it("should handle missing step notes object gracefully", () => {
      const state = { notes: { sheet: {} } };

      const note = window.Notes.getStepNote(state, "card1");

      expect(note).toBe("");
    });
  });

  describe("setStepNote", () => {
    it("should create a new step note", () => {
      const state = createEmptyState();

      window.Notes.setStepNote(state, "card1", "This is my note");

      expect(state.notes.step["card1"]).toBe("This is my note");
    });

    it("should update an existing step note", () => {
      const state = createStateWithNotes();

      window.Notes.setStepNote(state, "e201::ppe::0", "New text");

      expect(state.notes.step["e201::ppe::0"]).toBe("New text");
    });

    it("should delete a note when given empty string", () => {
      const state = createStateWithNotes();
      expect(state.notes.step["e201::ppe::0"]).toBeDefined();

      window.Notes.setStepNote(state, "e201::ppe::0", "");

      expect(state.notes.step["e201::ppe::0"]).toBeUndefined();
    });

    it("should delete a note when given whitespace-only string", () => {
      const state = createStateWithNotes();

      window.Notes.setStepNote(state, "e201::ppe::0", "   ");

      expect(state.notes.step["e201::ppe::0"]).toBeUndefined();
    });

    it("should initialize notes object if missing", () => {
      const state = { srs: {} }; // no notes

      window.Notes.setStepNote(state, "card1", "Note text");

      expect(state.notes).toBeDefined();
      expect(state.notes.step).toBeDefined();
      expect(state.notes.step["card1"]).toBe("Note text");
    });

    it("should preserve whitespace-padded notes", () => {
      const state = createEmptyState();
      const noteText = "  Important note with leading spaces";

      window.Notes.setStepNote(state, "card1", noteText);

      expect(state.notes.step["card1"]).toBe(noteText);
    });
  });

  describe("getSheetNote", () => {
    it("should return an empty string when no note exists", () => {
      const state = createEmptyState();

      const note = window.Notes.getSheetNote(state, "e201");

      expect(note).toBe("");
    });

    it("should return the note text for an existing sheet note", () => {
      const state = createStateWithNotes();

      const note = window.Notes.getSheetNote(state, "e201");

      expect(note).toBe("Focus on the order: PPE → Scene → Primary Survey");
    });

    it("should handle missing sheet notes object gracefully", () => {
      const state = { notes: { step: {} } };

      const note = window.Notes.getSheetNote(state, "e201");

      expect(note).toBe("");
    });
  });

  describe("setSheetNote", () => {
    it("should create a new sheet note", () => {
      const state = createEmptyState();

      window.Notes.setSheetNote(state, "e201", "General notes for this sheet");

      expect(state.notes.sheet["e201"]).toBe("General notes for this sheet");
    });

    it("should update an existing sheet note", () => {
      const state = createStateWithNotes();

      window.Notes.setSheetNote(state, "e201", "Updated sheet note");

      expect(state.notes.sheet["e201"]).toBe("Updated sheet note");
    });

    it("should delete a note when given empty string", () => {
      const state = createStateWithNotes();

      window.Notes.setSheetNote(state, "e201", "");

      expect(state.notes.sheet["e201"]).toBeUndefined();
    });

    it("should delete a note when given whitespace-only string", () => {
      const state = createStateWithNotes();

      window.Notes.setSheetNote(state, "e201", "  \n  ");

      expect(state.notes.sheet["e201"]).toBeUndefined();
    });
  });

  describe("countSheetNotes", () => {
    it("should count zero notes for a sheet with no notes", () => {
      const state = createEmptyState();
      const sheet = createMockSheet();

      const count = window.Notes.countSheetNotes(state, sheet);

      expect(count).toBe(0);
    });

    it("should count step notes for a sheet", () => {
      const state = createEmptyState();
      const sheet = createMockSheet();
      window.Notes.setStepNote(state, sheet.cards[0].id, "Note 1");
      window.Notes.setStepNote(state, sheet.cards[1].id, "Note 2");

      const count = window.Notes.countSheetNotes(state, sheet);

      expect(count).toBe(2);
    });

    it("should count sheet-level notes", () => {
      const state = createEmptyState();
      const sheet = createMockSheet();
      window.Notes.setSheetNote(state, sheet.id, "Sheet note");

      const count = window.Notes.countSheetNotes(state, sheet);

      expect(count).toBe(1);
    });

    it("should count both step and sheet notes", () => {
      const state = createEmptyState();
      const sheet = createMockSheet();
      window.Notes.setStepNote(state, sheet.cards[0].id, "Step note");
      window.Notes.setSheetNote(state, sheet.id, "Sheet note");

      const count = window.Notes.countSheetNotes(state, sheet);

      expect(count).toBe(2);
    });

    it("should only count notes on cards in the sheet", () => {
      const state = createEmptyState();
      const sheet = createMockSheet();
      // Add a note for a card not in this sheet
      window.Notes.setStepNote(state, "other-sheet::card::0", "Foreign note");
      window.Notes.setStepNote(state, sheet.cards[0].id, "Sheet note");

      const count = window.Notes.countSheetNotes(state, sheet);

      expect(count).toBe(1); // only the sheet's note
    });

    it("should ignore empty notes", () => {
      const state = createEmptyState();
      const sheet = createMockSheet();
      // Try to add and then remove a note
      window.Notes.setStepNote(state, sheet.cards[0].id, "Temporary");
      window.Notes.setStepNote(state, sheet.cards[0].id, ""); // delete

      const count = window.Notes.countSheetNotes(state, sheet);

      expect(count).toBe(0);
    });
  });

  describe("Notes integration", () => {
    it("should allow full CRUD on both step and sheet notes", () => {
      const state = createEmptyState();
      const sheet = createMockSheet();
      const cardId = sheet.cards[0].id;

      // Create
      window.Notes.setStepNote(state, cardId, "Initial note");
      expect(window.Notes.getStepNote(state, cardId)).toBe("Initial note");

      // Read
      const note = window.Notes.getStepNote(state, cardId);
      expect(note).toBe("Initial note");

      // Update
      window.Notes.setStepNote(state, cardId, "Updated note");
      expect(window.Notes.getStepNote(state, cardId)).toBe("Updated note");

      // Delete
      window.Notes.setStepNote(state, cardId, "");
      expect(window.Notes.getStepNote(state, cardId)).toBe("");
    });

    it("should maintain separation between step and sheet notes", () => {
      const state = createEmptyState();
      const sheetId = "e201";
      const cardId = "e201::card::0";

      window.Notes.setSheetNote(state, sheetId, "Sheet-level note");
      window.Notes.setStepNote(state, cardId, "Step-level note");

      const sheetNote = window.Notes.getSheetNote(state, sheetId);
      const stepNote = window.Notes.getStepNote(state, cardId);

      expect(sheetNote).toBe("Sheet-level note");
      expect(stepNote).toBe("Step-level note");
    });

    it("should support multiple notes on the same sheet", () => {
      const state = createEmptyState();
      const sheet = createMockSheet();

      for (let i = 0; i < sheet.cards.length; i++) {
        window.Notes.setStepNote(state, sheet.cards[i].id, `Note ${i}`);
      }

      const count = window.Notes.countSheetNotes(state, sheet);
      expect(count).toBe(sheet.cards.length);
    });
  });
});
