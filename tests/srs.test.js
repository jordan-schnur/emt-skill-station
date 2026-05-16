/**
 * Unit tests for srs.js – spaced repetition algorithm (SM-2 variant)
 */

// Load the SRS module (vanilla JS IIFE)
require("../js/srs.js");

import { createEmptyState, createStateWithSRS } from "./fixtures.js";

describe("SRS – Spaced Repetition", () => {
  const DAY = 24 * 60 * 60 * 1000;

  describe("defaultRecord", () => {
    it("should create a new card record with default values", () => {
      const rec = window.SRS.defaultRecord();
      expect(rec).toEqual({
        ease: 2.5,
        interval: 0,
        reps: 0,
        due: 0,
        lastGrade: null,
        lapses: 0,
        lastReviewed: null,
      });
    });
  });

  describe("getRecord", () => {
    it("should return an existing record from state", () => {
      const state = createStateWithSRS();
      const rec = window.SRS.getRecord(state, "e201::ppe::0");
      expect(rec.reps).toBe(1);
      expect(rec.ease).toBe(2.5);
    });

    it("should return a default record if the card doesn't exist", () => {
      const state = createEmptyState();
      const rec = window.SRS.getRecord(state, "nonexistent");
      expect(rec).toEqual(window.SRS.defaultRecord());
    });
  });

  describe("grade – 'again' (0% recall)", () => {
    it("should reset interval and increase lapses", () => {
      const before = window.SRS.defaultRecord();
      const after = window.SRS.grade(before, "again");

      expect(after.lapses).toBe(1);
      expect(after.reps).toBe(0);
      expect(after.interval).toBe(0);
    });

    it("should lower the ease factor (floor 1.3)", () => {
      const before = { ...window.SRS.defaultRecord(), ease: 1.5 };
      const after = window.SRS.grade(before, "again");

      expect(after.ease).toBe(1.3); // 1.5 - 0.2, but floored at 1.3
    });

    it("should schedule the card for 1 minute later", () => {
      const now = Date.now();
      const after = window.SRS.grade(window.SRS.defaultRecord(), "again", now);
      const dueOffset = after.due - now;

      expect(dueOffset).toBe(60 * 1000); // 1 minute
    });
  });

  describe("grade – 'hard' (40% recall)", () => {
    it("should increment reps and lower ease factor", () => {
      const before = window.SRS.defaultRecord();
      const after = window.SRS.grade(before, "hard");

      expect(after.reps).toBe(1);
      expect(after.ease).toBe(2.35); // 2.5 - 0.15
    });

    it("should schedule new cards for 1 day", () => {
      const now = Date.now();
      const after = window.SRS.grade(window.SRS.defaultRecord(), "hard", now);
      const expectedDue = now + 1 * DAY;

      expect(after.interval).toBe(1);
      expect(Math.abs(after.due - expectedDue)).toBeLessThan(1000); // within 1s
    });

    it("should apply 1.2x multiplier to interval on subsequent reviews", () => {
      const before = {
        ...window.SRS.defaultRecord(),
        reps: 2,
        interval: 6,
      };
      const after = window.SRS.grade(before, "hard");

      expect(after.interval).toBe(6 * 1.2); // 7.2 days
      expect(after.reps).toBe(3);
    });
  });

  describe("grade – 'good' (60% recall)", () => {
    it("should increment reps without changing ease", () => {
      const before = { ...window.SRS.defaultRecord(), ease: 2.5 };
      const after = window.SRS.grade(before, "good");

      expect(after.reps).toBe(1);
      expect(after.ease).toBe(2.5); // unchanged
    });

    it("should schedule new cards for 1 day", () => {
      const now = Date.now();
      const after = window.SRS.grade(window.SRS.defaultRecord(), "good", now);

      expect(after.interval).toBe(1);
      expect(after.due).toBeCloseTo(now + 1 * DAY, -3);
    });

    it("should schedule second review for 6 days", () => {
      const before = {
        ...window.SRS.defaultRecord(),
        reps: 1,
        interval: 1,
      };
      const now = Date.now();
      const after = window.SRS.grade(before, "good", now);

      expect(after.interval).toBe(6);
      expect(after.due).toBeCloseTo(now + 6 * DAY, -3);
    });

    it("should apply ease multiplier on subsequent reviews", () => {
      const before = {
        ...window.SRS.defaultRecord(),
        reps: 2,
        interval: 6,
        ease: 2.5,
      };
      const after = window.SRS.grade(before, "good");

      expect(after.interval).toBe(6 * 2.5); // interval * ease
      expect(after.reps).toBe(3);
    });
  });

  describe("grade – 'easy' (90%+ recall)", () => {
    it("should increment reps and increase ease factor", () => {
      const before = window.SRS.defaultRecord();
      const after = window.SRS.grade(before, "easy");

      expect(after.reps).toBe(1);
      expect(after.ease).toBe(2.65); // 2.5 + 0.15
    });

    it("should schedule new cards for 1 day", () => {
      const now = Date.now();
      const after = window.SRS.grade(window.SRS.defaultRecord(), "easy", now);

      expect(after.interval).toBe(1);
      expect(after.due).toBeCloseTo(now + 1 * DAY, -3);
    });

    it("should apply 1.3x ease multiplier on subsequent reviews", () => {
      const before = {
        ...window.SRS.defaultRecord(),
        reps: 2,
        interval: 6,
        ease: 2.65,
      };
      const after = window.SRS.grade(before, "easy");

      // interval * ease * 1.3
      expect(after.interval).toBe(6 * 2.65 * 1.3);
      expect(after.reps).toBe(3);
    });
  });

  describe("grade – interval capping", () => {
    it("should cap interval at 4 years (to prevent 18-year deferals)", () => {
      let rec = window.SRS.defaultRecord();
      // Simulate many "easy" grades to grow the interval
      for (let i = 0; i < 50; i++) {
        rec = window.SRS.grade(rec, "easy");
      }

      const maxDays = 365 * 4;
      expect(rec.interval).toBeLessThanOrEqual(maxDays);
    });
  });

  describe("buildQueue", () => {
    it("should include new cards (due <= 0)", () => {
      const sheet = {
        cards: [
          { id: "card1" },
          { id: "card2" },
        ],
      };
      const state = createEmptyState();
      const queue = window.SRS.buildQueue(state, sheet);

      expect(queue).toHaveLength(2);
    });

    it("should include overdue cards (due <= now)", () => {
      const now = Date.now();
      const sheet = {
        cards: [
          { id: "card1" },
          { id: "card2" },
        ],
      };
      const state = createEmptyState();
      state.srs["card1"] = {
        ...window.SRS.defaultRecord(),
        due: now - DAY, // 1 day overdue
      };
      // card2 has no SRS record (new/unreviewed)
      // This tests that buildQueue includes overdue AND new cards

      const queue = window.SRS.buildQueue(state, sheet, now);

      expect(queue).toHaveLength(2);
      // Overdue cards should be first, then new cards
      expect(queue[0].card.id).toBe("card1");
      expect(queue[1].card.id).toBe("card2");
    });

    it("should sort overdue cards by due date (earliest first)", () => {
      const now = Date.now();
      const sheet = {
        cards: [
          { id: "card1" },
          { id: "card2" },
          { id: "card3" },
        ],
      };
      const state = createEmptyState();
      state.srs["card1"] = { ...window.SRS.defaultRecord(), due: now - 3 * DAY };
      state.srs["card2"] = { ...window.SRS.defaultRecord(), due: now - 1 * DAY };
      state.srs["card3"] = { ...window.SRS.defaultRecord(), due: now + 1 * DAY };

      const queue = window.SRS.buildQueue(state, sheet, now);

      // Cards sorted: card1 (oldest), card2, card3 (new)
      expect(queue[0].card.id).toBe("card1");
      expect(queue[1].card.id).toBe("card2");
    });
  });

  describe("masteryFor", () => {
    it("should return 0 for a sheet with no cards", () => {
      const sheet = { cards: [] };
      const state = createEmptyState();

      const mastery = window.SRS.masteryFor(state, sheet);
      expect(mastery).toBe(0);
    });

    it("should return 0 for unreviewed cards", () => {
      const sheet = {
        cards: [{ id: "card1" }, { id: "card2" }],
      };
      const state = createEmptyState();

      const mastery = window.SRS.masteryFor(state, sheet);
      expect(mastery).toBe(0);
    });

    it("should calculate mean mastery from interval and rep scores", () => {
      const sheet = {
        cards: [
          { id: "card1" },
          { id: "card2" },
        ],
      };
      const state = createEmptyState();
      state.srs["card1"] = {
        ...window.SRS.defaultRecord(),
        interval: 30, // will score 1.0 (30/30)
        reps: 4, // will score 1.0 (4/4)
        // combined: (1.0 * 0.6) + (1.0 * 0.4) = 1.0
      };
      state.srs["card2"] = {
        ...window.SRS.defaultRecord(),
        interval: 15, // will score 0.5 (15/30)
        reps: 2, // will score 0.5 (2/4)
        // combined: (0.5 * 0.6) + (0.5 * 0.4) = 0.5
      };

      const mastery = window.SRS.masteryFor(state, sheet);
      // Mean: (1.0 + 0.5) / 2 = 0.75
      expect(mastery).toBeCloseTo(0.75, 1);
    });
  });

  describe("dueCount", () => {
    it("should count new cards as due", () => {
      const sheet = {
        cards: [
          { id: "card1" },
          { id: "card2" },
        ],
      };
      const state = createEmptyState();

      const count = window.SRS.dueCount(state, sheet);
      expect(count).toBe(2);
    });

    it("should count overdue cards", () => {
      const now = Date.now();
      const sheet = {
        cards: [
          { id: "card1" },
          { id: "card2" },
          { id: "card3" },
        ],
      };
      const state = createEmptyState();
      state.srs["card1"] = { ...window.SRS.defaultRecord(), due: now - DAY };
      state.srs["card2"] = { ...window.SRS.defaultRecord(), due: now + DAY }; // not due
      state.srs["card3"] = { ...window.SRS.defaultRecord(), due: 0 }; // new

      const count = window.SRS.dueCount(state, sheet, now);
      expect(count).toBe(2); // card1 (overdue) + card3 (new)
    });
  });

  describe("describeDue", () => {
    it('should return "new" for a null/undefined record', () => {
      expect(window.SRS.describeDue(null)).toBe("new");
      expect(window.SRS.describeDue(undefined)).toBe("new");
    });

    it('should return "due now" when due <= now', () => {
      const now = Date.now();
      const rec = {
        ...window.SRS.defaultRecord(),
        due: now - 60 * 1000,
      };

      expect(window.SRS.describeDue(rec, now)).toBe("due now");
    });

    it('should describe due time in hours (< 1 day)', () => {
      const now = Date.now();
      const rec = {
        ...window.SRS.defaultRecord(),
        due: now + 3 * 60 * 60 * 1000, // 3 hours
      };

      expect(window.SRS.describeDue(rec, now)).toBe("due in 3h");
    });

    it('should describe due time in days (1-30 days)', () => {
      const now = Date.now();
      const rec = {
        ...window.SRS.defaultRecord(),
        due: now + 5 * DAY,
      };

      expect(window.SRS.describeDue(rec, now)).toBe("due in 5d");
    });

    it('should describe due time in months (> 30 days)', () => {
      const now = Date.now();
      const rec = {
        ...window.SRS.defaultRecord(),
        due: now + 90 * DAY,
      };

      expect(window.SRS.describeDue(rec, now)).toBe("due in 3mo");
    });
  });
});
