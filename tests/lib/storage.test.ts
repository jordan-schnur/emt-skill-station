import { describe, it, expect, vi, beforeEach } from "vitest";
import { load, save, reset, exportToFile, importFromFile, Storage, createEmptyState } from "../../src/lib/storage";
import { createStateWithNotes } from "../vitest.fixtures";

describe("Storage – localStorage wrapper", () => {
  describe("load", () => {
    it("returns empty state when localStorage is empty", () => {
      const state = load();
      expect(state).toEqual(createEmptyState());
    });

    it("loads and parses a valid state from localStorage", () => {
      const saved = { ...createEmptyState(), stats: { totalReviews: 10, lastReviewedAt: null, dailyStreak: 0, longestStreak: 0, lastStreakDay: null } };
      localStorage.setItem("nremt.state.v1", JSON.stringify(saved));

      const loaded = load();
      expect(loaded.version).toBe(2);
      expect(loaded.stats.totalReviews).toBe(10);
    });

    it("backfills missing branches (forward compatibility)", () => {
      const old = { version: 1, srs: {}, notes: { step: {}, sheet: {} }, stats: { totalReviews: 5, lastReviewedAt: null } };
      localStorage.setItem("nremt.state.v1", JSON.stringify(old));

      const loaded = load();
      expect(loaded.drills).toEqual({ secorder: {}, stepseq: {}, whatnext: {}, blankrecall: {}, spokenscript: {}, critical: {} });
    });

    it("migrates v1 state: initializes drills.critical to {} and sets version to 2", () => {
      const v1State = {
        version: 1,
        srs: {},
        notes: { step: {}, sheet: {} },
        stats: { totalReviews: 5, lastReviewedAt: null, dailyStreak: 0, longestStreak: 0, lastStreakDay: null },
        drills: { secorder: { "e201": { mastered: true, streak: 3, attempts: 3 } }, stepseq: {}, whatnext: {}, blankrecall: {}, spokenscript: {} },
        achievements: {},
        mnemonics: {},
        chats: {},
        emsSrs: {},
        medcondSrs: {},
      };
      localStorage.setItem("nremt.state.v1", JSON.stringify(v1State));

      const loaded = load();

      expect(loaded.version).toBe(2);
      expect(loaded.drills.critical).toEqual({});
      expect(loaded.drills.secorder["e201"].mastered).toBe(true);
    });

    it("handles parse errors gracefully and returns empty state", () => {
      localStorage.setItem("nremt.state.v1", "{invalid json}");
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const loaded = load();
      expect(loaded).toEqual(createEmptyState());
      consoleSpy.mockRestore();
    });

    it("preserves partial data on load (notes but no drills)", () => {
      const partial = { version: 1, srs: {}, notes: { step: { "card1": "my note" }, sheet: {} }, stats: { totalReviews: 0 } };
      localStorage.setItem("nremt.state.v1", JSON.stringify(partial));

      const loaded = load();
      expect(loaded.notes.step).toEqual(partial.notes.step);
      expect(loaded.drills).toBeDefined();
    });
  });

  describe("save", () => {
    it("saves state as JSON to localStorage", () => {
      const state = createEmptyState();
      save(state);
      expect(localStorage.getItem("nremt.state.v1")).toBe(JSON.stringify(state));
    });

    it("uses the correct storage key", () => {
      const state = createEmptyState();
      save(state);
      expect(localStorage.getItem("nremt.state.v1")).not.toBeNull();
    });

    it("handles save errors gracefully", () => {
      const state = createEmptyState();
      const spy = vi.spyOn(Storage, "KEY", "get");
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const origSetItem = localStorage.setItem.bind(localStorage);
      vi.stubGlobal("localStorage", {
        ...localStorage,
        setItem: vi.fn(() => { throw new Error("QuotaExceededError"); }),
        getItem: localStorage.getItem.bind(localStorage),
        removeItem: localStorage.removeItem.bind(localStorage),
        clear: localStorage.clear.bind(localStorage),
      });

      expect(() => save(state)).not.toThrow();

      vi.unstubAllGlobals();
      consoleSpy.mockRestore();
      spy.mockRestore();
    });
  });

  describe("reset", () => {
    it("removes the state from localStorage", () => {
      const state = createEmptyState();
      save(state);
      reset();
      expect(localStorage.getItem("nremt.state.v1")).toBeNull();
    });
  });

  describe("exportToFile", () => {
    it("creates a downloadable element with state data", () => {
      const state = createEmptyState();
      const createElementSpy = vi.spyOn(document, "createElement");
      const appendSpy = vi.spyOn(document.body, "appendChild").mockImplementation(() => document.body);

      exportToFile(state);

      expect(createElementSpy).toHaveBeenCalledWith("a");
      appendSpy.mockRestore();
    });

    it("sets the correct filename with date stamp", () => {
      const state = createEmptyState();
      const mockLink = { href: "", download: "", click: vi.fn(), remove: vi.fn() };
      vi.spyOn(document, "createElement").mockReturnValueOnce(mockLink as unknown as HTMLAnchorElement);
      vi.spyOn(document.body, "appendChild").mockImplementation(() => document.body);

      exportToFile(state);

      expect(mockLink.download).toMatch(/^nremt-progress-\d{4}-\d{2}-\d{2}\.json$/);
    });

    it("triggers a download action", () => {
      const state = createEmptyState();
      const mockLink = { href: "", download: "", click: vi.fn(), remove: vi.fn() };
      vi.spyOn(document, "createElement").mockReturnValueOnce(mockLink as unknown as HTMLAnchorElement);
      vi.spyOn(document.body, "appendChild").mockImplementation(() => document.body);

      exportToFile(state);

      expect(mockLink.click).toHaveBeenCalled();
    });

    it("cleans up temporary DOM elements after download", () => {
      const state = createEmptyState();
      const mockLink = { href: "", download: "", click: vi.fn(), remove: vi.fn() };
      vi.spyOn(document, "createElement").mockReturnValueOnce(mockLink as unknown as HTMLAnchorElement);
      vi.spyOn(document.body, "appendChild").mockImplementation(() => document.body);

      exportToFile(state);

      expect(mockLink.remove).toHaveBeenCalled();
    });
  });

  describe("importFromFile", () => {
    it("parses a valid JSON file and returns the state", async () => {
      const original = createStateWithNotes();
      const file = new File([JSON.stringify(original)], "backup.json", { type: "application/json" });

      const imported = await importFromFile(file);

      expect(imported.version).toBe(original.version);
      expect(imported.notes).toEqual(original.notes);
    });

    it("backfills missing fields in imported state", async () => {
      const partial = { version: 1, srs: {}, notes: { step: {}, sheet: {} } };
      const file = new File([JSON.stringify(partial)], "old.json", { type: "application/json" });

      const imported = await importFromFile(file);

      expect(imported.stats).toBeDefined();
      expect(imported.drills).toBeDefined();
    });

    it("throws on invalid JSON", async () => {
      const file = new File(["{invalid json}"], "bad.json", { type: "application/json" });
      await expect(importFromFile(file)).rejects.toThrow();
    });

    it("throws on non-object content", async () => {
      const file = new File(['["array", "not", "object"]'], "array.json", { type: "application/json" });
      await expect(importFromFile(file)).rejects.toThrow("Invalid file");
    });

    it("preserves user notes when importing", async () => {
      const state = createStateWithNotes();
      const file = new File([JSON.stringify(state)], "backup.json", { type: "application/json" });

      const imported = await importFromFile(file);

      expect(imported.notes.step["e201::ppe::0"]).toBe("Remember: gloves, mask, eye protection");
      expect(imported.notes.sheet["e201"]).toBe("Focus on the order: PPE → Scene → Primary Survey");
    });
  });

  describe("Storage key constant", () => {
    it("uses a versioned key to support migrations", () => {
      expect(Storage.KEY).toBe("nremt.state.v1");
    });
  });
});
