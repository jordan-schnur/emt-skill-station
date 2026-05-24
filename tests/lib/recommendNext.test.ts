import { describe, it, expect } from "vitest";
import { recommendNext } from "../../src/lib/recommendNext";
import { createEmptyState, createMockSheet } from "../vitest.fixtures";

describe("recommendNext", () => {
  it("zero state returns a sheet with valid tab and non-empty justification", () => {
    const state = createEmptyState();
    const sheet = createMockSheet();
    const rec = recommendNext(state, [sheet]);
    expect(rec.sheet).toBe(sheet);
    expect(rec.tab).toBeTruthy();
    expect(rec.label).toBeTruthy();
    expect(rec.justification.length).toBeGreaterThan(0);
    expect(rec.durationMin).toBeGreaterThan(0);
  });

  it("sheet with critical criteria and mastery < 50% is prioritized with tab=critical", () => {
    const state = createEmptyState();
    const critSheet = createMockSheet({
      id: "crit",
      criticalCriteria: ["Failure to assess airway"],
    });
    const safeSheet = createMockSheet({
      id: "safe",
      criticalCriteria: [],
    });
    const rec = recommendNext(state, [safeSheet, critSheet]);
    expect(rec.sheet.id).toBe("crit");
    expect(rec.tab).toBe("critical");
    expect(rec.justification).toMatch(/critical/i);
  });

  it("sheet without critical criteria is not forced to critical tab", () => {
    const state = createEmptyState();
    const sheet = createMockSheet({ criticalCriteria: [] });
    const rec = recommendNext(state, [sheet]);
    expect(rec.tab).not.toBe("critical");
  });

  it("all drills mastered returns tab=sheet", () => {
    const state = createEmptyState();
    const sheet = createMockSheet({ criticalCriteria: [] });
    state.drills.secorder[sheet.id] = { mastered: true, streak: 3, attempts: 3 };
    const drillable = sheet.sections.filter((s) => s.steps.length >= 2);
    drillable.forEach((sec) => {
      if (!state.drills.stepseq[sheet.id]) state.drills.stepseq[sheet.id] = {};
      state.drills.stepseq[sheet.id][sec.name] = { mastered: true, streak: 3, attempts: 3 };
    });
    state.drills.whatnext[sheet.id] = { mastered: true, streak: 3, attempts: 3 };
    state.drills.blankrecall[sheet.id] = { attempts: 5, lastAttemptAt: "", lastScore: { matched: 10, missed: 0, total: 10, pct: 100 }, bestPct: 100 };
    state.drills.spokenscript[sheet.id] = { mastered: true, streak: 3, attempts: 3, lastScore: { correct: 10, total: 10, pct: 1 } };
    const rec = recommendNext(state, [sheet]);
    expect(rec.tab).toBe("sheet");
  });

  it("critical sheet with mastery >= 50% is not prioritized for critical tab", () => {
    const state = createEmptyState();
    const sheet = createMockSheet({ criticalCriteria: ["Failure to assess airway"] });
    state.drills.secorder[sheet.id] = { mastered: true, streak: 3, attempts: 3 };
    const drillable = sheet.sections.filter((s) => s.steps.length >= 2);
    drillable.forEach((sec) => {
      if (!state.drills.stepseq[sheet.id]) state.drills.stepseq[sheet.id] = {};
      state.drills.stepseq[sheet.id][sec.name] = { mastered: true, streak: 3, attempts: 3 };
    });
    state.drills.whatnext[sheet.id] = { mastered: true, streak: 3, attempts: 3 };
    state.drills.blankrecall[sheet.id] = { attempts: 5, lastAttemptAt: "", lastScore: { matched: 10, missed: 0, total: 10, pct: 100 }, bestPct: 100 };
    state.drills.spokenscript[sheet.id] = { mastered: true, streak: 3, attempts: 3, lastScore: { correct: 10, total: 10, pct: 1 } };
    const rec = recommendNext(state, [sheet]);
    expect(rec.tab).not.toBe("critical");
  });
});
