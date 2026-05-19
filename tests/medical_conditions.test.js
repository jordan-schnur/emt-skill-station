/**
 * Unit tests for medical_conditions.js and the Views.medConditions renderer.
 */

require("../js/medical_conditions.js");
require("../js/achievements.js");

import {
  createEmptyState,
  createMockContext,
  setupMockNREMTData,
} from "./fixtures.js";

// ─── Helper – minimal DOM setup ──────────────────────────────────────────────
function setupViewDeps() {
  setupMockNREMTData();
  global.NREMT_DATA = window.NREMT_DATA;
  global.MEDICAL_CONDITIONS = window.MEDICAL_CONDITIONS;
}

// ─── Data file ───────────────────────────────────────────────────────────────
describe("MEDICAL_CONDITIONS data", () => {
  beforeEach(setupViewDeps);

  it("loads and is an array", () => {
    expect(Array.isArray(window.MEDICAL_CONDITIONS)).toBe(true);
  });

  it("has at least 16 conditions", () => {
    expect(window.MEDICAL_CONDITIONS.length).toBeGreaterThanOrEqual(16);
  });

  it("every condition has required fields", () => {
    for (const cond of window.MEDICAL_CONDITIONS) {
      expect(typeof cond.id).toBe("string");
      expect(typeof cond.name).toBe("string");
      expect(typeof cond.category).toBe("string");
      expect(Array.isArray(cond.signs)).toBe(true);
      expect(Array.isArray(cond.distinguishing)).toBe(true);
      expect(Array.isArray(cond.criticalFindings)).toBe(true);
      expect(Array.isArray(cond.treatment)).toBe(true);
    }
  });

  it("all ids are unique", () => {
    const ids = window.MEDICAL_CONDITIONS.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("includes hypoglycemia and hyperglycemia", () => {
    const ids = window.MEDICAL_CONDITIONS.map((c) => c.id);
    expect(ids).toContain("hypoglycemia");
    expect(ids).toContain("hyperglycemia");
  });

  it("includes anaphylaxis", () => {
    const ids = window.MEDICAL_CONDITIONS.map((c) => c.id);
    expect(ids).toContain("anaphylaxis");
  });

  it("includes neurogenic_shock with bradycardia noted", () => {
    const cond = window.MEDICAL_CONDITIONS.find((c) => c.id === "neurogenic_shock");
    expect(cond).toBeDefined();
    const allText = [...cond.signs, cond.keyDifferentiator, ...Object.values(cond.compareDimensions || {})].join(" ").toLowerCase();
    expect(allText).toMatch(/bradycardia/i);
  });

  it("diabetic conditions are in same compareGroup", () => {
    const hypo = window.MEDICAL_CONDITIONS.find((c) => c.id === "hypoglycemia");
    const hyper = window.MEDICAL_CONDITIONS.find((c) => c.id === "hyperglycemia");
    expect(hypo.compareGroup).toBe(hyper.compareGroup);
  });

  it("conditions have compareDimensions with keySign", () => {
    for (const cond of window.MEDICAL_CONDITIONS) {
      if (cond.compareDimensions) {
        expect(typeof cond.compareDimensions.keySign).toBe("string");
      }
    }
  });
});

// ─── Achievements (new medical ones) ─────────────────────────────────────────
describe("Medical conditions achievements", () => {
  beforeEach(() => {
    setupMockNREMTData();
    global.NREMT_DATA = window.NREMT_DATA;
  });

  it("med_quiz_first unlocks after sessionCount >= 1", () => {
    const state = createEmptyState();
    state.drills.medcondquiz = { sessionCount: 1, bestScore: 0.5, lastScore: 0.5, totalAttempts: 10, totalCorrect: 5 };
    const result = window.Achievements.check(state);
    expect(result.some((a) => a.id === "med_quiz_first")).toBe(true);
  });

  it("med_quiz_first does NOT unlock with no sessions", () => {
    const state = createEmptyState();
    const result = window.Achievements.check(state);
    expect(result.some((a) => a.id === "med_quiz_first")).toBe(false);
  });

  it("med_quiz_pass unlocks after bestScore >= 0.7", () => {
    const state = createEmptyState();
    state.drills.medcondquiz = { sessionCount: 2, bestScore: 0.8, lastScore: 0.8, totalAttempts: 20, totalCorrect: 16 };
    const result = window.Achievements.check(state);
    expect(result.some((a) => a.id === "med_quiz_pass")).toBe(true);
  });

  it("med_quiz_pass does NOT unlock below 0.7", () => {
    const state = createEmptyState();
    state.drills.medcondquiz = { sessionCount: 1, bestScore: 0.6, lastScore: 0.6, totalAttempts: 10, totalCorrect: 6 };
    const result = window.Achievements.check(state);
    expect(result.some((a) => a.id === "med_quiz_pass")).toBe(false);
  });

  it("med_quiz_ace unlocks after bestScore >= 0.9", () => {
    const state = createEmptyState();
    state.drills.medcondquiz = { sessionCount: 3, bestScore: 0.9, lastScore: 0.9, totalAttempts: 30, totalCorrect: 27 };
    const result = window.Achievements.check(state);
    expect(result.some((a) => a.id === "med_quiz_ace")).toBe(true);
  });

  it("thousand_reviews unlocks at 1000", () => {
    const state = createEmptyState();
    state.stats.totalReviews = 1000;
    const result = window.Achievements.check(state);
    expect(result.some((a) => a.id === "thousand_reviews")).toBe(true);
  });

  it("thousand_reviews does NOT unlock at 999", () => {
    const state = createEmptyState();
    state.stats.totalReviews = 999;
    const result = window.Achievements.check(state);
    expect(result.some((a) => a.id === "thousand_reviews")).toBe(false);
  });

  it("streak_14 unlocks at longestStreak >= 14", () => {
    const state = createEmptyState();
    state.stats.longestStreak = 14;
    const result = window.Achievements.check(state);
    expect(result.some((a) => a.id === "streak_14")).toBe(true);
  });

  it("all_sheets_started unlocks when each sheet has at least one reps>=1 card", () => {
    const state = createEmptyState();
    const data = window.NREMT_DATA;
    for (const sheet of data.sheets) {
      if (sheet.cards.length > 0) {
        state.srs[sheet.cards[0].id] = { reps: 1, ease: 2.5, interval: 1, due: Date.now(), lapses: 0 };
      }
    }
    const result = window.Achievements.check(state);
    expect(result.some((a) => a.id === "all_sheets_started")).toBe(true);
  });

  it("all_sheets_started does NOT unlock when no cards have been studied", () => {
    const state = createEmptyState();
    const result = window.Achievements.check(state);
    expect(result.some((a) => a.id === "all_sheets_started")).toBe(false);
  });

  it("total achievements count increased by 6", () => {
    expect(window.Achievements.DEFS.length).toBe(28);
  });
});

// ─── Views.medConditions rendering ───────────────────────────────────────────
describe("Views.medConditions", () => {
  let ctx;

  beforeEach(() => {
    setupViewDeps();
    require("../js/storage.js");
    require("../js/srs.js");
    require("../js/notes.js");
    require("../js/views.js");
    ctx = createMockContext();
    ctx.route = { view: "medconditions", tab: "browse" };
  });

  it("renders without throwing on browse tab", () => {
    expect(() => window.Views.medConditions(ctx)).not.toThrow();
  });

  it("returns an HTMLElement", () => {
    const el = window.Views.medConditions(ctx);
    expect(el instanceof HTMLElement).toBe(true);
  });

  it("renders tab strip with three tabs", () => {
    const el = window.Views.medConditions(ctx);
    const tabs = el.querySelectorAll(".medcond-tab-btn");
    expect(tabs.length).toBe(3);
  });

  it("renders condition cards on browse tab", () => {
    const el = window.Views.medConditions(ctx);
    const cards = el.querySelectorAll(".medcond-card");
    expect(cards.length).toBeGreaterThan(0);
  });

  it("renders compare tab without throwing", () => {
    ctx.route = { view: "medconditions", tab: "compare" };
    expect(() => window.Views.medConditions(ctx)).not.toThrow();
  });

  it("renders quiz tab without throwing", () => {
    ctx.route = { view: "medconditions", tab: "quiz" };
    expect(() => window.Views.medConditions(ctx)).not.toThrow();
  });

  it("quiz tab renders answer options", () => {
    ctx.route = { view: "medconditions", tab: "quiz" };
    const el = window.Views.medConditions(ctx);
    const options = el.querySelectorAll(".medcond-option");
    expect(options.length).toBe(4);
  });

  it("saves quiz session to state on completion", () => {
    const state = ctx.state;
    expect((state.drills.medcondquiz || {}).sessionCount).toBeFalsy();

    ctx.route = { view: "medconditions", tab: "quiz" };
    const el = window.Views.medConditions(ctx);

    // Answer all 10 questions by clicking first option each time
    for (let i = 0; i < 10; i++) {
      const option = el.querySelector(".medcond-option:not([disabled])");
      if (option) option.click();
      const nextBtn = el.querySelector(".medcond-quiz-next");
      if (nextBtn && nextBtn.style.display !== "none") nextBtn.click();
    }

    // After 10 questions the results are shown, state should be saved
    expect(state.drills.medcondquiz).toBeDefined();
    expect(state.drills.medcondquiz.sessionCount).toBe(1);
  });
});
