import { describe, it, expect } from "vitest";
import { suggestNextMode, computeTodayContext, reviewsThisWeek } from "../../src/lib/todayContext";
import { createEmptyState } from "../vitest.fixtures";
import { NREMT_DATA } from "../../src/data/sheets";

describe("suggestNextMode", () => {
  it("returns order when section order not mastered on multi-section sheet", () => {
    const state = createEmptyState();
    const sheet = NREMT_DATA.sheets.find(s => s.sections.length > 1)!;
    const result = suggestNextMode(state, sheet);
    expect(result.tab).toBe("order");
  });

  it("returns steps when order mastered but a section not mastered", () => {
    const sheet = NREMT_DATA.sheets.find(s => s.sections.filter(sec => sec.steps.length >= 2).length > 0)!;
    const state = createEmptyState();
    state.drills.secorder[sheet.id] = { mastered: true, streak: 3, attempts: 3 };
    const result = suggestNextMode(state, sheet);
    expect(result.tab).toBe("steps");
  });

  it("returns sheet fallback when everything is mastered", () => {
    const sheet = NREMT_DATA.sheets[0];
    const state = createEmptyState();
    state.drills.secorder[sheet.id] = { mastered: true, streak: 3, attempts: 3 };
    const drillable = sheet.sections.filter(s => s.steps.length >= 2);
    drillable.forEach(sec => {
      if (!state.drills.stepseq[sheet.id]) state.drills.stepseq[sheet.id] = {};
      state.drills.stepseq[sheet.id][sec.name] = { mastered: true, streak: 3, attempts: 3 };
    });
    state.drills.whatnext[sheet.id] = { mastered: true, streak: 3, attempts: 3 };
    state.drills.blankrecall[sheet.id] = { attempts: 5, lastAttemptAt: "", lastScore: { matched: 10, missed: 0, total: 10, pct: 100 }, bestPct: 100 };
    state.drills.spokenscript[sheet.id] = { mastered: true, streak: 3, attempts: 3, lastScore: { correct: 10, total: 10, pct: 1 } };
    const result = suggestNextMode(state, sheet);
    expect(result.tab).toBe("sheet");
  });
});

describe("reviewsThisWeek", () => {
  it("returns exactly 7 entries", () => {
    expect(reviewsThisWeek(undefined)).toHaveLength(7);
  });

  it("zero-fills missing days", () => {
    const result = reviewsThisWeek({});
    expect(result.every(n => n === 0)).toBe(true);
  });

  it("places today count in last position", () => {
    const today = new Date().toISOString().slice(0, 10);
    const result = reviewsThisWeek({ [today]: 5 });
    expect(result[6]).toBe(5);
  });
});

describe("computeTodayContext", () => {
  it("returns sheetsAbove80 = 0 for empty state", () => {
    const ctx = computeTodayContext(createEmptyState(), NREMT_DATA.sheets);
    expect(ctx.sheetsAbove80).toBe(0);
  });

  it("criticalAlertSheets is empty when no sheets have criticalCriteria with low mastery", () => {
    const ctx = computeTodayContext(createEmptyState(), NREMT_DATA.sheets.filter(s => !s.criticalCriteria?.length));
    expect(ctx.criticalAlertSheets).toHaveLength(0);
  });
});
