/**
 * Unit tests for storage.js – localStorage wrapper and import/export
 */

require("../js/storage.js");

import { createEmptyState, createStateWithSRS, createStateWithNotes } from "./fixtures.js";

describe("Storage – localStorage wrapper", () => {
  beforeEach(() => {
    localStorage.getItem.mockClear();
    localStorage.setItem.mockClear();
    localStorage.removeItem.mockClear();
    localStorage.clear.mockClear();
  });

  describe("load", () => {
    it("should return empty state when localStorage is empty", () => {
      localStorage.getItem.mockReturnValue(null);

      const state = window.Storage.load();

      expect(state).toEqual(createEmptyState());
    });

    it("should load and parse a valid state from localStorage", () => {
      const saved = createStateWithSRS();
      localStorage.getItem.mockReturnValue(JSON.stringify(saved));

      const loaded = window.Storage.load();

      expect(loaded.version).toBe(1);
      expect(loaded.srs).toEqual(saved.srs);
      expect(loaded.stats).toEqual(saved.stats);
    });

    it("should backfill missing branches (forward compatibility)", () => {
      // Simulate an old state from before drills were added
      const old = {
        version: 1,
        srs: { "card1": { ease: 2.5, reps: 1, interval: 1 } },
        notes: { step: {}, sheet: {} },
        stats: { totalReviews: 5, lastReviewedAt: Date.now() },
        // drills is missing
      };
      localStorage.getItem.mockReturnValue(JSON.stringify(old));

      const loaded = window.Storage.load();

      expect(loaded.drills).toEqual({ secorder: {}, stepseq: {}, whatnext: {}, blankrecall: {} });
      expect(loaded.srs).toEqual(old.srs);
    });

    it("should handle parse errors gracefully and return empty state", () => {
      localStorage.getItem.mockReturnValue("{invalid json}");
      jest.spyOn(console, "error").mockImplementation(() => {});

      const loaded = window.Storage.load();

      expect(loaded).toEqual(createEmptyState());
      console.error.mockRestore();
    });

    it("should preserve partial data on load (e.g., notes but no drills)", () => {
      const partial = {
        version: 1,
        srs: {},
        notes: { step: { "card1": "my note" }, sheet: {} },
        stats: { totalReviews: 0, lastReviewedAt: null },
        // drills missing
      };
      localStorage.getItem.mockReturnValue(JSON.stringify(partial));

      const loaded = window.Storage.load();

      expect(loaded.notes.step).toEqual(partial.notes.step);
      expect(loaded.drills).toBeDefined();
    });
  });

  describe("save", () => {
    it("should save state as JSON to localStorage", () => {
      const state = createStateWithSRS();

      window.Storage.save(state);

      expect(localStorage.setItem).toHaveBeenCalledWith(
        window.Storage.KEY,
        JSON.stringify(state)
      );
    });

    it("should use the correct storage key", () => {
      const state = createEmptyState();

      window.Storage.save(state);

      expect(localStorage.setItem).toHaveBeenCalledWith(
        "nremt.state.v1",
        expect.any(String)
      );
    });

    it("should handle save errors gracefully", () => {
      const state = createEmptyState();
      localStorage.setItem.mockImplementation(() => {
        throw new Error("QuotaExceededError");
      });
      jest.spyOn(console, "error").mockImplementation(() => {});

      expect(() => window.Storage.save(state)).not.toThrow();
      console.error.mockRestore();
    });
  });

  describe("reset", () => {
    it("should remove the state from localStorage", () => {
      window.Storage.reset();

      expect(localStorage.removeItem).toHaveBeenCalledWith(window.Storage.KEY);
    });
  });

  describe("exportToFile", () => {
    it("should create a downloadable blob with state data", () => {
      const state = createStateWithSRS();
      const createElementSpy = jest.spyOn(document, "createElement");
      document.body.appendChild = jest.fn();

      window.Storage.exportToFile(state);

      // Should have created an <a> element
      expect(createElementSpy).toHaveBeenCalledWith("a");
      document.body.appendChild.mockRestore();
    });

    it("should set the correct filename with date stamp", () => {
      const state = createEmptyState();
      const mockLink = { href: "", download: "", click: jest.fn(), remove: jest.fn() };
      document.createElement = jest.fn(() => mockLink);
      document.body.appendChild = jest.fn();

      window.Storage.exportToFile(state);

      // Filename should have format: nremt-progress-YYYY-MM-DD.json
      const filename = mockLink.download;
      expect(filename).toMatch(/^nremt-progress-\d{4}-\d{2}-\d{2}\.json$/);
    });

    it("should trigger a download action", () => {
      const state = createEmptyState();
      const mockLink = { href: "", download: "", click: jest.fn(), remove: jest.fn() };
      document.createElement = jest.fn(() => mockLink);
      document.body.appendChild = jest.fn();

      window.Storage.exportToFile(state);

      expect(mockLink.click).toHaveBeenCalled();
    });

    it("should clean up temporary DOM elements after download", () => {
      const state = createEmptyState();
      const mockLink = { href: "", download: "", click: jest.fn(), remove: jest.fn() };
      document.createElement = jest.fn(() => mockLink);
      document.body.appendChild = jest.fn();

      window.Storage.exportToFile(state);

      expect(mockLink.remove).toHaveBeenCalled();
    });
  });

  describe("importFromFile", () => {
    it("should parse a valid JSON file and return the state", async () => {
      const original = createStateWithNotes();
      const file = new File(
        [JSON.stringify(original)],
        "backup.json",
        { type: "application/json" }
      );

      const imported = await window.Storage.importFromFile(file);

      expect(imported.version).toBe(original.version);
      expect(imported.notes).toEqual(original.notes);
    });

    it("should backfill missing fields in imported state", async () => {
      const partial = {
        version: 1,
        srs: { "card1": { ease: 2.5, reps: 1 } },
        notes: { step: {}, sheet: {} },
        // stats and drills missing
      };
      const file = new File(
        [JSON.stringify(partial)],
        "old-backup.json",
        { type: "application/json" }
      );

      const imported = await window.Storage.importFromFile(file);

      expect(imported.stats).toBeDefined();
      expect(imported.drills).toBeDefined();
    });

    it("should throw on invalid JSON", async () => {
      const file = new File(
        ["{invalid json}"],
        "bad.json",
        { type: "application/json" }
      );

      await expect(window.Storage.importFromFile(file)).rejects.toThrow();
    });

    it("should throw on non-object content", async () => {
      const file = new File(
        ['["array", "not", "object"]'],
        "array.json",
        { type: "application/json" }
      );

      await expect(window.Storage.importFromFile(file)).rejects.toThrow(
        "Invalid file"
      );
    });

    it("should preserve user notes when importing", async () => {
      const state = createStateWithNotes();
      const file = new File(
        [JSON.stringify(state)],
        "backup.json",
        { type: "application/json" }
      );

      const imported = await window.Storage.importFromFile(file);

      expect(imported.notes.step["e201::ppe::0"]).toBe(
        "Remember: gloves, mask, eye protection"
      );
      expect(imported.notes.sheet["e201"]).toBe(
        "Focus on the order: PPE → Scene → Primary Survey"
      );
    });
  });

  describe("Round-trip: save → export → import → load", () => {
    it("should preserve state through a full save/export/import cycle", async () => {
      const original = createStateWithSRS();
      original.notes = createStateWithNotes().notes;

      // "Save" to localStorage
      localStorage.getItem.mockReturnValue(JSON.stringify(original));
      const loaded = window.Storage.load();

      // "Export" to file
      const file = new File(
        [JSON.stringify(loaded)],
        "backup.json",
        { type: "application/json" }
      );

      // "Import" from file
      const imported = await window.Storage.importFromFile(file);

      // Verify round-trip
      expect(imported.version).toBe(original.version);
      expect(imported.srs).toEqual(original.srs);
      expect(imported.notes).toEqual(original.notes);
      expect(imported.stats).toEqual(original.stats);
    });
  });

  describe("Storage key constant", () => {
    it("should use a versioned key to support migrations", () => {
      expect(window.Storage.KEY).toBe("nremt.state.v1");
    });
  });
});
