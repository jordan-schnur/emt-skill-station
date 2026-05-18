/**
 * Unit tests for achievements.js
 */

require("../js/achievements.js");

import {
  createEmptyState,
  createMockSheet,
  setupMockNREMTData,
} from "./fixtures.js";

describe("Achievements", () => {
  beforeEach(() => {
    setupMockNREMTData();
    global.NREMT_DATA = window.NREMT_DATA;
  });

  describe("check()", () => {
    it("returns empty array when nothing is earned", () => {
      const state = createEmptyState();
      const result = window.Achievements.check(state);
      expect(result).toEqual([]);
    });

    it("initializes state.achievements if missing", () => {
      const state = createEmptyState();
      delete state.achievements;
      window.Achievements.check(state);
      expect(state.achievements).toBeDefined();
    });

    it("unlocks first_review after 1 review", () => {
      const state = createEmptyState();
      state.stats.totalReviews = 1;
      const result = window.Achievements.check(state);
      expect(result.some((a) => a.id === "first_review")).toBe(true);
      expect(state.achievements.first_review).toBeTruthy();
    });

    it("unlocks ten_reviews after 10 reviews", () => {
      const state = createEmptyState();
      state.stats.totalReviews = 10;
      const result = window.Achievements.check(state);
      expect(result.some((a) => a.id === "ten_reviews")).toBe(true);
    });

    it("unlocks fifty_reviews after 50 reviews", () => {
      const state = createEmptyState();
      state.stats.totalReviews = 50;
      const result = window.Achievements.check(state);
      expect(result.some((a) => a.id === "fifty_reviews")).toBe(true);
    });

    it("unlocks hundred_reviews after 100 reviews", () => {
      const state = createEmptyState();
      state.stats.totalReviews = 100;
      const result = window.Achievements.check(state);
      expect(result.some((a) => a.id === "hundred_reviews")).toBe(true);
    });

    it("unlocks five_hundred_reviews after 500 reviews", () => {
      const state = createEmptyState();
      state.stats.totalReviews = 500;
      const result = window.Achievements.check(state);
      expect(result.some((a) => a.id === "five_hundred_reviews")).toBe(true);
    });

    it("unlocks first_card_deep when a card has interval >= 7", () => {
      const state = createEmptyState();
      state.srs["e201::ppe::0"] = { ease: 2.5, interval: 7, reps: 3, due: 0, lastGrade: "good", lapses: 0 };
      const result = window.Achievements.check(state);
      expect(result.some((a) => a.id === "first_card_deep")).toBe(true);
    });

    it("does not unlock first_card_deep when interval is 6", () => {
      const state = createEmptyState();
      state.srs["e201::ppe::0"] = { ease: 2.5, interval: 6, reps: 2, due: 0, lastGrade: "easy", lapses: 0 };
      const result = window.Achievements.check(state);
      expect(result.some((a) => a.id === "first_card_deep")).toBe(false);
    });

    it("unlocks first_drill_mastered when any drill is mastered", () => {
      const state = createEmptyState();
      state.drills.secorder["e201"] = { streak: 3, mastered: true, attempts: 3 };
      const result = window.Achievements.check(state);
      expect(result.some((a) => a.id === "first_drill_mastered")).toBe(true);
    });

    it("unlocks good_recall at 80% blank recall", () => {
      const state = createEmptyState();
      state.drills.blankrecall["e201"] = { attempts: 1, bestPct: 80 };
      const result = window.Achievements.check(state);
      expect(result.some((a) => a.id === "good_recall")).toBe(true);
    });

    it("unlocks perfect_recall at 100% blank recall", () => {
      const state = createEmptyState();
      state.drills.blankrecall["e201"] = { attempts: 1, bestPct: 100 };
      const result = window.Achievements.check(state);
      expect(result.some((a) => a.id === "perfect_recall")).toBe(true);
    });

    it("does not unlock good_recall below 80%", () => {
      const state = createEmptyState();
      state.drills.blankrecall["e201"] = { attempts: 1, bestPct: 79 };
      const result = window.Achievements.check(state);
      expect(result.some((a) => a.id === "good_recall")).toBe(false);
    });

    it("unlocks spoken_script_pass when lastScore >= 0.8", () => {
      const state = createEmptyState();
      state.drills.spokenscript["e201"] = { streak: 1, mastered: false, attempts: 1, lastScore: 0.85 };
      const result = window.Achievements.check(state);
      expect(result.some((a) => a.id === "spoken_script_pass")).toBe(true);
    });

    it("unlocks streak_3 when longestStreak >= 3", () => {
      const state = createEmptyState();
      state.stats.longestStreak = 3;
      const result = window.Achievements.check(state);
      expect(result.some((a) => a.id === "streak_3")).toBe(true);
    });

    it("unlocks streak_7 when longestStreak >= 7", () => {
      const state = createEmptyState();
      state.stats.longestStreak = 7;
      const result = window.Achievements.check(state);
      expect(result.some((a) => a.id === "streak_7")).toBe(true);
    });

    it("does not re-unlock already earned achievements", () => {
      const state = createEmptyState();
      state.stats.totalReviews = 1;
      const ts = Date.now() - 10000;
      state.achievements.first_review = ts;
      const result = window.Achievements.check(state);
      expect(result.some((a) => a.id === "first_review")).toBe(false);
      expect(state.achievements.first_review).toBe(ts);
    });

    it("records unlock timestamp in state.achievements", () => {
      const state = createEmptyState();
      state.stats.totalReviews = 1;
      const before = Date.now();
      window.Achievements.check(state);
      expect(state.achievements.first_review).toBeGreaterThanOrEqual(before);
    });
  });

  describe("getAll()", () => {
    it("returns all achievement definitions", () => {
      const state = createEmptyState();
      const all = window.Achievements.getAll(state);
      expect(all.length).toBeGreaterThan(0);
      expect(all.length).toBe(window.Achievements.DEFS.length);
    });

    it("marks unlocked achievements with unlockedAt", () => {
      const state = createEmptyState();
      const ts = Date.now();
      state.achievements.first_review = ts;
      const all = window.Achievements.getAll(state);
      const ach = all.find((a) => a.id === "first_review");
      expect(ach.unlockedAt).toBe(ts);
    });

    it("marks locked achievements with unlockedAt = null", () => {
      const state = createEmptyState();
      const all = window.Achievements.getAll(state);
      const ach = all.find((a) => a.id === "first_review");
      expect(ach.unlockedAt).toBeNull();
    });

    it("each achievement has id, name, desc, icon fields", () => {
      const state = createEmptyState();
      const all = window.Achievements.getAll(state);
      for (const a of all) {
        expect(a.id).toBeTruthy();
        expect(a.name).toBeTruthy();
        expect(a.desc).toBeTruthy();
        expect(a.icon).toBeTruthy();
      }
    });
  });

  describe("DEFS (achievement list)", () => {
    it("all_cards_seen returns false when no cards studied", () => {
      const state = createEmptyState();
      const def = window.Achievements.DEFS.find((d) => d.id === "all_cards_seen");
      expect(def.check(state)).toBe(false);
    });

    it("sheet_mastery_75 and halfway_overall removed (SRS-dependent)", () => {
      // These two achievements were removed when SRS was removed
      expect(window.Achievements.DEFS.find((d) => d.id === "sheet_mastery_75")).toBeUndefined();
      expect(window.Achievements.DEFS.find((d) => d.id === "halfway_overall")).toBeUndefined();
    });

    it("all_drills_one_sheet returns false when drills not mastered", () => {
      const state = createEmptyState();
      const def = window.Achievements.DEFS.find((d) => d.id === "all_drills_one_sheet");
      expect(def.check(state)).toBe(false);
    });
  });
});
