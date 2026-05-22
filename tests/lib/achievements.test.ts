import { describe, it, expect, beforeEach } from "vitest";
import { check, getAll } from "../../src/lib/achievements";
import { createEmptyState, setupMockNREMTData } from "../vitest.fixtures";

describe("Achievements", () => {
  beforeEach(() => {
    setupMockNREMTData();
  });

  describe("check()", () => {
    it("returns empty array when nothing is earned", () => {
      const state = createEmptyState();
      expect(check(state)).toEqual([]);
    });

    it("initializes state.achievements if missing", () => {
      const state = createEmptyState();
      delete (state as Partial<typeof state>).achievements;
      check(state);
      expect(state.achievements).toBeDefined();
    });

    // Engagement milestones
    it("unlocks first_review after 1 drill attempt", () => {
      const state = createEmptyState();
      state.stats.totalReviews = 1;
      const result = check(state);
      expect(result.some((a) => a.id === "first_review")).toBe(true);
      expect(state.achievements.first_review).toBeTruthy();
    });

    it("unlocks ten_reviews after 10 drill attempts", () => {
      const state = createEmptyState();
      state.stats.totalReviews = 10;
      expect(check(state).some((a) => a.id === "ten_reviews")).toBe(true);
    });

    it("unlocks fifty_reviews after 50 drill attempts", () => {
      const state = createEmptyState();
      state.stats.totalReviews = 50;
      expect(check(state).some((a) => a.id === "fifty_reviews")).toBe(true);
    });

    it("unlocks hundred_reviews after 100 drill attempts", () => {
      const state = createEmptyState();
      state.stats.totalReviews = 100;
      expect(check(state).some((a) => a.id === "hundred_reviews")).toBe(true);
    });

    it("unlocks five_hundred_reviews after 500 drill attempts", () => {
      const state = createEmptyState();
      state.stats.totalReviews = 500;
      expect(check(state).some((a) => a.id === "five_hundred_reviews")).toBe(true);
    });

    // Notes
    it("unlocks first_note when one step note exists", () => {
      const state = createEmptyState();
      state.notes.step["e201::ppe::0"] = "Remember gloves";
      expect(check(state).some((a) => a.id === "first_note")).toBe(true);
    });

    it("does not unlock first_note with zero notes", () => {
      const state = createEmptyState();
      expect(check(state).some((a) => a.id === "first_note")).toBe(false);
    });

    it("unlocks ten_notes when 10 step notes exist", () => {
      const state = createEmptyState();
      for (let i = 0; i < 10; i++) state.notes.step[`e201::ppe::${i}`] = "note";
      expect(check(state).some((a) => a.id === "ten_notes")).toBe(true);
    });

    // Drill type firsts
    it("unlocks first_drill_mastered when any drill is mastered", () => {
      const state = createEmptyState();
      state.drills.secorder["e201"] = { streak: 3, mastered: true, attempts: 3 };
      expect(check(state).some((a) => a.id === "first_drill_mastered")).toBe(true);
    });

    it("unlocks order_mastered_first when section order is mastered", () => {
      const state = createEmptyState();
      state.drills.secorder["e201"] = { mastered: true, streak: 3, attempts: 3 };
      expect(check(state).some((a) => a.id === "order_mastered_first")).toBe(true);
    });

    it("does not unlock order_mastered_first when not mastered", () => {
      const state = createEmptyState();
      state.drills.secorder["e201"] = { mastered: false, streak: 2, attempts: 2 };
      expect(check(state).some((a) => a.id === "order_mastered_first")).toBe(false);
    });

    it("unlocks stepseq_mastered_first when any section is mastered", () => {
      const state = createEmptyState();
      state.drills.stepseq["e201"] = { "SCENE SIZE-UP": { mastered: true, streak: 3, attempts: 3 } };
      expect(check(state).some((a) => a.id === "stepseq_mastered_first")).toBe(true);
    });

    it("unlocks whatnext_mastered_first when what's next is mastered", () => {
      const state = createEmptyState();
      state.drills.whatnext["e201"] = { mastered: true, streak: 3, attempts: 5 };
      expect(check(state).some((a) => a.id === "whatnext_mastered_first")).toBe(true);
    });

    // Blank recall
    it("unlocks first_recall_attempt after one attempt", () => {
      const state = createEmptyState();
      state.drills.blankrecall["e201"] = { attempts: 1, bestPct: 40, lastAttemptAt: null, lastScore: null };
      expect(check(state).some((a) => a.id === "first_recall_attempt")).toBe(true);
    });

    it("does not unlock first_recall_attempt with zero attempts", () => {
      const state = createEmptyState();
      state.drills.blankrecall["e201"] = { attempts: 0, bestPct: 0, lastAttemptAt: null, lastScore: null };
      expect(check(state).some((a) => a.id === "first_recall_attempt")).toBe(false);
    });

    it("unlocks good_recall at 80% blank recall", () => {
      const state = createEmptyState();
      state.drills.blankrecall["e201"] = { attempts: 1, bestPct: 80, lastAttemptAt: null, lastScore: null };
      expect(check(state).some((a) => a.id === "good_recall")).toBe(true);
    });

    it("unlocks perfect_recall at 100% blank recall", () => {
      const state = createEmptyState();
      state.drills.blankrecall["e201"] = { attempts: 1, bestPct: 100, lastAttemptAt: null, lastScore: null };
      expect(check(state).some((a) => a.id === "perfect_recall")).toBe(true);
    });

    it("does not unlock good_recall below 80%", () => {
      const state = createEmptyState();
      state.drills.blankrecall["e201"] = { attempts: 1, bestPct: 79, lastAttemptAt: null, lastScore: null };
      expect(check(state).some((a) => a.id === "good_recall")).toBe(false);
    });

    it("unlocks recall_three_sheets when 3 sheets have >=80% recall", () => {
      const state = createEmptyState();
      state.drills.blankrecall["e201"] = { attempts: 1, bestPct: 85, lastAttemptAt: null, lastScore: null };
      state.drills.blankrecall["e202"] = { attempts: 1, bestPct: 90, lastAttemptAt: null, lastScore: null };
      state.drills.blankrecall["e203"] = { attempts: 1, bestPct: 80, lastAttemptAt: null, lastScore: null };
      expect(check(state).some((a) => a.id === "recall_three_sheets")).toBe(true);
    });

    it("does not unlock recall_three_sheets with only 2 sheets", () => {
      const state = createEmptyState();
      state.drills.blankrecall["e201"] = { attempts: 1, bestPct: 85, lastAttemptAt: null, lastScore: null };
      state.drills.blankrecall["e202"] = { attempts: 1, bestPct: 90, lastAttemptAt: null, lastScore: null };
      expect(check(state).some((a) => a.id === "recall_three_sheets")).toBe(false);
    });

    // Spoken script
    it("unlocks spoken_script_pass when lastScore.pct >= 80", () => {
      const state = createEmptyState();
      state.drills.spokenscript["e201"] = { streak: 1, mastered: false, attempts: 1, lastScore: { correct: 4, total: 5, pct: 80 } };
      expect(check(state).some((a) => a.id === "spoken_script_pass")).toBe(true);
    });

    it("does not unlock spoken_script_pass when lastScore.pct < 80", () => {
      const state = createEmptyState();
      state.drills.spokenscript["e201"] = { streak: 0, mastered: false, attempts: 1, lastScore: { correct: 3, total: 5, pct: 60 } };
      expect(check(state).some((a) => a.id === "spoken_script_pass")).toBe(false);
    });

    it("does not unlock spoken_script_pass with null lastScore", () => {
      const state = createEmptyState();
      state.drills.spokenscript["e201"] = { streak: 0, mastered: false, attempts: 0, lastScore: null };
      expect(check(state).some((a) => a.id === "spoken_script_pass")).toBe(false);
    });

    it("unlocks spoken_script_mastered when mastered flag is true", () => {
      const state = createEmptyState();
      state.drills.spokenscript["e201"] = { streak: 3, mastered: true, attempts: 3, lastScore: { correct: 5, total: 5, pct: 100 } };
      expect(check(state).some((a) => a.id === "spoken_script_mastered")).toBe(true);
    });

    // Streaks
    it("unlocks streak_3 when longestStreak >= 3", () => {
      const state = createEmptyState();
      state.stats.longestStreak = 3;
      expect(check(state).some((a) => a.id === "streak_3")).toBe(true);
    });

    it("unlocks streak_7 when longestStreak >= 7", () => {
      const state = createEmptyState();
      state.stats.longestStreak = 7;
      expect(check(state).some((a) => a.id === "streak_7")).toBe(true);
    });

    it("unlocks streak_30 when longestStreak >= 30", () => {
      const state = createEmptyState();
      state.stats.longestStreak = 30;
      expect(check(state).some((a) => a.id === "streak_30")).toBe(true);
    });

    it("does not unlock streak_7 with only 6 days", () => {
      const state = createEmptyState();
      state.stats.longestStreak = 6;
      expect(check(state).some((a) => a.id === "streak_7")).toBe(false);
    });

    it("does not re-unlock already earned achievements", () => {
      const state = createEmptyState();
      state.stats.totalReviews = 1;
      const ts = Date.now() - 10000;
      state.achievements.first_review = ts;
      const result = check(state);
      expect(result.some((a) => a.id === "first_review")).toBe(false);
      expect(state.achievements.first_review).toBe(ts);
    });

    it("records unlock timestamp in state.achievements", () => {
      const state = createEmptyState();
      state.stats.totalReviews = 1;
      const before = Date.now();
      check(state);
      expect(state.achievements.first_review).toBeGreaterThanOrEqual(before);
    });

    it("all_drills_one_sheet returns false when drills not mastered", () => {
      const state = createEmptyState();
      expect(check(state).some((a) => a.id === "all_drills_one_sheet")).toBe(false);
    });

    it("all_drills_three_sheets returns false with no progress", () => {
      const state = createEmptyState();
      expect(check(state).some((a) => a.id === "all_drills_three_sheets")).toBe(false);
    });

    it("unlocks blsmeds_first_scenario after first scenario completed", () => {
      const state = createEmptyState();
      (state.drills as Record<string, unknown>)["blsmedsquiz"] = { scenariosCompleted: 1, lastSessionAt: new Date().toISOString() };
      expect(check(state).some((a) => a.id === "blsmeds_first_scenario")).toBe(true);
    });

    it("does not unlock blsmeds_first_scenario with zero scenarios", () => {
      const state = createEmptyState();
      expect(check(state).some((a) => a.id === "blsmeds_first_scenario")).toBe(false);
    });

    it("unlocks blsmeds_all_drilled when all 9 meds have SRS records with reps >= 1", () => {
      const state = createEmptyState();
      const ids = ["oxygen", "aspirin", "nitroglycerin", "oral-glucose", "activated-charcoal", "epinephrine-auto-injector", "albuterol", "naloxone", "isopropyl-alcohol"];
      for (const id of ids) {
        state.blsMedsSrs[`blsmed::${id}::dose`] = { ease: 2.5, interval: 1, reps: 1, due: Date.now() + 86400000, lastGrade: "good", lapses: 0, lastReviewed: new Date().toISOString() };
      }
      expect(check(state).some((a) => a.id === "blsmeds_all_drilled")).toBe(true);
    });

    it("does not unlock blsmeds_all_drilled when only 8 meds drilled", () => {
      const state = createEmptyState();
      const ids = ["oxygen", "aspirin", "nitroglycerin", "oral-glucose", "activated-charcoal", "epinephrine-auto-injector", "albuterol", "naloxone"];
      for (const id of ids) {
        state.blsMedsSrs[`blsmed::${id}::dose`] = { ease: 2.5, interval: 1, reps: 1, due: Date.now() + 86400000, lastGrade: "good", lapses: 0, lastReviewed: new Date().toISOString() };
      }
      expect(check(state).some((a) => a.id === "blsmeds_all_drilled")).toBe(false);
    });
  });

  describe("getAll()", () => {
    it("returns all achievement definitions", () => {
      const state = createEmptyState();
      const all = getAll(state);
      expect(all.length).toBeGreaterThan(0);
      expect(all[0]).toHaveProperty("id");
      expect(all[0]).toHaveProperty("name");
      expect(all[0]).toHaveProperty("desc");
      expect(all[0]).toHaveProperty("icon");
      expect(all[0]).toHaveProperty("unlockedAt");
    });

    it("marks earned achievements with a timestamp", () => {
      const state = createEmptyState();
      state.stats.totalReviews = 1;
      check(state);
      const all = getAll(state);
      const firstReview = all.find((a) => a.id === "first_review");
      expect(firstReview?.unlockedAt).not.toBeNull();
    });

    it("marks unearned achievements with null", () => {
      const state = createEmptyState();
      const all = getAll(state);
      const firstReview = all.find((a) => a.id === "first_review");
      expect(firstReview?.unlockedAt).toBeNull();
    });
  });
});
