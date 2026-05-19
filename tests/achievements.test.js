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

    // ---- Engagement milestones ----
    it("unlocks first_review after 1 drill attempt", () => {
      const state = createEmptyState();
      state.stats.totalReviews = 1;
      const result = window.Achievements.check(state);
      expect(result.some((a) => a.id === "first_review")).toBe(true);
      expect(state.achievements.first_review).toBeTruthy();
    });

    it("unlocks ten_reviews after 10 drill attempts", () => {
      const state = createEmptyState();
      state.stats.totalReviews = 10;
      const result = window.Achievements.check(state);
      expect(result.some((a) => a.id === "ten_reviews")).toBe(true);
    });

    it("unlocks fifty_reviews after 50 drill attempts", () => {
      const state = createEmptyState();
      state.stats.totalReviews = 50;
      const result = window.Achievements.check(state);
      expect(result.some((a) => a.id === "fifty_reviews")).toBe(true);
    });

    it("unlocks hundred_reviews after 100 drill attempts", () => {
      const state = createEmptyState();
      state.stats.totalReviews = 100;
      const result = window.Achievements.check(state);
      expect(result.some((a) => a.id === "hundred_reviews")).toBe(true);
    });

    it("unlocks five_hundred_reviews after 500 drill attempts", () => {
      const state = createEmptyState();
      state.stats.totalReviews = 500;
      const result = window.Achievements.check(state);
      expect(result.some((a) => a.id === "five_hundred_reviews")).toBe(true);
    });

    // ---- Notes ----
    it("unlocks first_note when one step note exists", () => {
      const state = createEmptyState();
      state.notes.step["e201::ppe::0"] = "Remember gloves";
      const result = window.Achievements.check(state);
      expect(result.some((a) => a.id === "first_note")).toBe(true);
    });

    it("does not unlock first_note with zero notes", () => {
      const state = createEmptyState();
      const result = window.Achievements.check(state);
      expect(result.some((a) => a.id === "first_note")).toBe(false);
    });

    it("unlocks ten_notes when 10 step notes exist", () => {
      const state = createEmptyState();
      for (let i = 0; i < 10; i++) {
        state.notes.step[`e201::ppe::${i}`] = "note";
      }
      const result = window.Achievements.check(state);
      expect(result.some((a) => a.id === "ten_notes")).toBe(true);
    });

    // ---- Drill type firsts ----
    it("unlocks first_drill_mastered when any drill is mastered", () => {
      const state = createEmptyState();
      state.drills.secorder["e201"] = { streak: 3, mastered: true, attempts: 3 };
      const result = window.Achievements.check(state);
      expect(result.some((a) => a.id === "first_drill_mastered")).toBe(true);
    });

    it("unlocks order_mastered_first when section order is mastered", () => {
      const state = createEmptyState();
      state.drills.secorder["e201"] = { mastered: true, streak: 3, attempts: 3 };
      const result = window.Achievements.check(state);
      expect(result.some((a) => a.id === "order_mastered_first")).toBe(true);
    });

    it("does not unlock order_mastered_first when not mastered", () => {
      const state = createEmptyState();
      state.drills.secorder["e201"] = { mastered: false, streak: 2, attempts: 2 };
      const result = window.Achievements.check(state);
      expect(result.some((a) => a.id === "order_mastered_first")).toBe(false);
    });

    it("unlocks stepseq_mastered_first when any section is mastered", () => {
      const state = createEmptyState();
      state.drills.stepseq["e201"] = { "SCENE SIZE-UP": { mastered: true, streak: 3, attempts: 3 } };
      const result = window.Achievements.check(state);
      expect(result.some((a) => a.id === "stepseq_mastered_first")).toBe(true);
    });

    it("unlocks whatnext_mastered_first when what's next is mastered", () => {
      const state = createEmptyState();
      state.drills.whatnext["e201"] = { mastered: true, streak: 3, attempts: 5 };
      const result = window.Achievements.check(state);
      expect(result.some((a) => a.id === "whatnext_mastered_first")).toBe(true);
    });

    // ---- Blank recall ----
    it("unlocks first_recall_attempt after one attempt", () => {
      const state = createEmptyState();
      state.drills.blankrecall["e201"] = { attempts: 1, bestPct: 40 };
      const result = window.Achievements.check(state);
      expect(result.some((a) => a.id === "first_recall_attempt")).toBe(true);
    });

    it("does not unlock first_recall_attempt with zero attempts", () => {
      const state = createEmptyState();
      state.drills.blankrecall["e201"] = { attempts: 0, bestPct: 0 };
      const result = window.Achievements.check(state);
      expect(result.some((a) => a.id === "first_recall_attempt")).toBe(false);
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

    it("unlocks recall_three_sheets when 3 sheets have >=80% recall", () => {
      const state = createEmptyState();
      state.drills.blankrecall["e201"] = { attempts: 1, bestPct: 85 };
      state.drills.blankrecall["e202"] = { attempts: 1, bestPct: 90 };
      state.drills.blankrecall["e203"] = { attempts: 1, bestPct: 80 };
      const result = window.Achievements.check(state);
      expect(result.some((a) => a.id === "recall_three_sheets")).toBe(true);
    });

    it("does not unlock recall_three_sheets with only 2 sheets", () => {
      const state = createEmptyState();
      state.drills.blankrecall["e201"] = { attempts: 1, bestPct: 85 };
      state.drills.blankrecall["e202"] = { attempts: 1, bestPct: 90 };
      const result = window.Achievements.check(state);
      expect(result.some((a) => a.id === "recall_three_sheets")).toBe(false);
    });

    // ---- Spoken script ----
    it("unlocks spoken_script_pass when lastScore.pct >= 80", () => {
      const state = createEmptyState();
      state.drills.spokenscript["e201"] = {
        streak: 1,
        mastered: false,
        attempts: 1,
        lastScore: { correct: 4, total: 5, pct: 80 },
      };
      const result = window.Achievements.check(state);
      expect(result.some((a) => a.id === "spoken_script_pass")).toBe(true);
    });

    it("does not unlock spoken_script_pass when lastScore.pct < 80", () => {
      const state = createEmptyState();
      state.drills.spokenscript["e201"] = {
        streak: 0,
        mastered: false,
        attempts: 1,
        lastScore: { correct: 3, total: 5, pct: 60 },
      };
      const result = window.Achievements.check(state);
      expect(result.some((a) => a.id === "spoken_script_pass")).toBe(false);
    });

    it("does not unlock spoken_script_pass with null lastScore", () => {
      const state = createEmptyState();
      state.drills.spokenscript["e201"] = { streak: 0, mastered: false, attempts: 0, lastScore: null };
      const result = window.Achievements.check(state);
      expect(result.some((a) => a.id === "spoken_script_pass")).toBe(false);
    });

    it("unlocks spoken_script_mastered when mastered flag is true", () => {
      const state = createEmptyState();
      state.drills.spokenscript["e201"] = {
        streak: 3,
        mastered: true,
        attempts: 3,
        lastScore: { correct: 5, total: 5, pct: 100 },
      };
      const result = window.Achievements.check(state);
      expect(result.some((a) => a.id === "spoken_script_mastered")).toBe(true);
    });

    // ---- Streaks ----
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

    it("unlocks streak_30 when longestStreak >= 30", () => {
      const state = createEmptyState();
      state.stats.longestStreak = 30;
      const result = window.Achievements.check(state);
      expect(result.some((a) => a.id === "streak_30")).toBe(true);
    });

    it("does not unlock streak_7 with only 6 days", () => {
      const state = createEmptyState();
      state.stats.longestStreak = 6;
      const result = window.Achievements.check(state);
      expect(result.some((a) => a.id === "streak_7")).toBe(false);
    });

    // ---- Already earned ----
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

    // ---- Complete package ----
    it("all_drills_one_sheet returns false when drills not mastered", () => {
      const state = createEmptyState();
      const result = window.Achievements.check(state);
      expect(result.some((a) => a.id === "all_drills_one_sheet")).toBe(false);
    });

    it("all_drills_three_sheets returns false with no progress", () => {
      const state = createEmptyState();
      const result = window.Achievements.check(state);
      expect(result.some((a) => a.id === "all_drills_three_sheets")).toBe(false);
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
    it("SRS-dependent achievements are removed", () => {
      expect(window.Achievements.DEFS.find((d) => d.id === "first_card_deep")).toBeUndefined();
      expect(window.Achievements.DEFS.find((d) => d.id === "all_cards_seen")).toBeUndefined();
      expect(window.Achievements.DEFS.find((d) => d.id === "sheet_mastery_75")).toBeUndefined();
      expect(window.Achievements.DEFS.find((d) => d.id === "halfway_overall")).toBeUndefined();
    });

    it("all_drills_one_sheet check returns false when drills not mastered", () => {
      const state = createEmptyState();
      const def = window.Achievements.DEFS.find((d) => d.id === "all_drills_one_sheet");
      expect(def.check(state)).toBe(false);
    });

    it("all new drill-type achievements are defined", () => {
      const ids = window.Achievements.DEFS.map((d) => d.id);
      expect(ids).toContain("order_mastered_first");
      expect(ids).toContain("stepseq_mastered_first");
      expect(ids).toContain("whatnext_mastered_first");
      expect(ids).toContain("first_recall_attempt");
      expect(ids).toContain("spoken_script_mastered");
      expect(ids).toContain("recall_three_sheets");
      expect(ids).toContain("first_note");
      expect(ids).toContain("ten_notes");
      expect(ids).toContain("streak_30");
      expect(ids).toContain("all_drills_three_sheets");
    });
  });
});
