import { describe, it, expect } from "vitest";
import { getStepNote, setStepNote, getSheetNote, setSheetNote, countSheetNotes } from "../../src/lib/notes";
import { createEmptyState, createStateWithNotes, createMockSheet } from "../vitest.fixtures";
import type { AppState } from "../../src/types";

describe("Notes – Step and Sheet notes", () => {
  describe("getStepNote", () => {
    it("returns empty string when no note exists", () => {
      const state = createEmptyState();
      expect(getStepNote(state, "card1")).toBe("");
    });

    it("returns the note text for an existing step note", () => {
      const state = createStateWithNotes();
      expect(getStepNote(state, "e201::ppe::0")).toBe("Remember: gloves, mask, eye protection");
    });

    it("handles missing notes object gracefully", () => {
      const state = { notes: null } as unknown as AppState;
      expect(getStepNote(state, "card1")).toBe("");
    });

    it("handles missing step notes object gracefully", () => {
      const state = { notes: { sheet: {} } } as unknown as AppState;
      expect(getStepNote(state, "card1")).toBe("");
    });
  });

  describe("setStepNote", () => {
    it("creates a new step note", () => {
      const state = createEmptyState();
      setStepNote(state, "card1", "This is my note");
      expect(state.notes.step["card1"]).toBe("This is my note");
    });

    it("updates an existing step note", () => {
      const state = createStateWithNotes();
      setStepNote(state, "e201::ppe::0", "New text");
      expect(state.notes.step["e201::ppe::0"]).toBe("New text");
    });

    it("deletes a note when given empty string", () => {
      const state = createStateWithNotes();
      expect(state.notes.step["e201::ppe::0"]).toBeDefined();
      setStepNote(state, "e201::ppe::0", "");
      expect(state.notes.step["e201::ppe::0"]).toBeUndefined();
    });

    it("deletes a note when given whitespace-only string", () => {
      const state = createStateWithNotes();
      setStepNote(state, "e201::ppe::0", "   ");
      expect(state.notes.step["e201::ppe::0"]).toBeUndefined();
    });

    it("initializes notes object if missing", () => {
      const state = { srs: {} } as unknown as AppState;
      setStepNote(state, "card1", "Note text");
      expect(state.notes?.step?.["card1"]).toBe("Note text");
    });

    it("preserves whitespace-padded notes (leading spaces but not whitespace-only)", () => {
      const state = createEmptyState();
      const noteText = "  Important note with leading spaces";
      setStepNote(state, "card1", noteText);
      expect(state.notes.step["card1"]).toBe(noteText);
    });
  });

  describe("getSheetNote", () => {
    it("returns empty string when no note exists", () => {
      const state = createEmptyState();
      expect(getSheetNote(state, "e201")).toBe("");
    });

    it("returns the note text for an existing sheet note", () => {
      const state = createStateWithNotes();
      expect(getSheetNote(state, "e201")).toBe("Focus on the order: PPE → Scene → Primary Survey");
    });

    it("handles missing sheet notes object gracefully", () => {
      const state = { notes: { step: {} } } as unknown as AppState;
      expect(getSheetNote(state, "e201")).toBe("");
    });
  });

  describe("setSheetNote", () => {
    it("creates a new sheet note", () => {
      const state = createEmptyState();
      setSheetNote(state, "e201", "General notes for this sheet");
      expect(state.notes.sheet["e201"]).toBe("General notes for this sheet");
    });

    it("updates an existing sheet note", () => {
      const state = createStateWithNotes();
      setSheetNote(state, "e201", "Updated sheet note");
      expect(state.notes.sheet["e201"]).toBe("Updated sheet note");
    });

    it("deletes a note when given empty string", () => {
      const state = createStateWithNotes();
      setSheetNote(state, "e201", "");
      expect(state.notes.sheet["e201"]).toBeUndefined();
    });

    it("deletes a note when given whitespace-only string", () => {
      const state = createStateWithNotes();
      setSheetNote(state, "e201", "  \n  ");
      expect(state.notes.sheet["e201"]).toBeUndefined();
    });
  });

  describe("countSheetNotes", () => {
    it("counts zero notes for a sheet with no notes", () => {
      const state = createEmptyState();
      const sheet = createMockSheet();
      expect(countSheetNotes(state, sheet)).toBe(0);
    });

    it("counts step notes for a sheet", () => {
      const state = createEmptyState();
      const sheet = createMockSheet();
      setStepNote(state, sheet.cards[0].id, "Note 1");
      setStepNote(state, sheet.cards[1].id, "Note 2");
      expect(countSheetNotes(state, sheet)).toBe(2);
    });

    it("counts sheet-level notes", () => {
      const state = createEmptyState();
      const sheet = createMockSheet();
      setSheetNote(state, sheet.id, "Sheet note");
      expect(countSheetNotes(state, sheet)).toBe(1);
    });

    it("counts both step and sheet notes", () => {
      const state = createEmptyState();
      const sheet = createMockSheet();
      setStepNote(state, sheet.cards[0].id, "Step note");
      setSheetNote(state, sheet.id, "Sheet note");
      expect(countSheetNotes(state, sheet)).toBe(2);
    });

    it("only counts notes on cards in the sheet", () => {
      const state = createEmptyState();
      const sheet = createMockSheet();
      setStepNote(state, "other-sheet::card::0", "Foreign note");
      setStepNote(state, sheet.cards[0].id, "Sheet note");
      expect(countSheetNotes(state, sheet)).toBe(1);
    });

    it("ignores empty notes", () => {
      const state = createEmptyState();
      const sheet = createMockSheet();
      setStepNote(state, sheet.cards[0].id, "Temporary");
      setStepNote(state, sheet.cards[0].id, "");
      expect(countSheetNotes(state, sheet)).toBe(0);
    });
  });

  describe("Notes integration", () => {
    it("allows full CRUD on both step and sheet notes", () => {
      const state = createEmptyState();
      const sheet = createMockSheet();
      const cardId = sheet.cards[0].id;

      setStepNote(state, cardId, "Initial note");
      expect(getStepNote(state, cardId)).toBe("Initial note");

      setStepNote(state, cardId, "Updated note");
      expect(getStepNote(state, cardId)).toBe("Updated note");

      setStepNote(state, cardId, "");
      expect(getStepNote(state, cardId)).toBe("");
    });

    it("maintains separation between step and sheet notes", () => {
      const state = createEmptyState();
      const sheetId = "e201";
      const cardId = "e201::card::0";

      setSheetNote(state, sheetId, "Sheet-level note");
      setStepNote(state, cardId, "Step-level note");

      expect(getSheetNote(state, sheetId)).toBe("Sheet-level note");
      expect(getStepNote(state, cardId)).toBe("Step-level note");
    });

    it("supports multiple notes on the same sheet", () => {
      const state = createEmptyState();
      const sheet = createMockSheet();

      for (let i = 0; i < sheet.cards.length; i++) {
        setStepNote(state, sheet.cards[i].id, `Note ${i}`);
      }

      expect(countSheetNotes(state, sheet)).toBe(sheet.cards.length);
    });
  });
});
