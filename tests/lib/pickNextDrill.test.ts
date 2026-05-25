import { describe, it, expect } from "vitest";
import { pickNextDrill } from "../../src/lib/pickNextDrill";
import { createEmptyState, createMockSheet } from "../vitest.fixtures";

describe("pickNextDrill", () => {
  it("returns order when secorder has no attempts", () => {
    const state = createEmptyState();
    const sheet = createMockSheet();
    const result = pickNextDrill(state, sheet);
    expect(result.type).toBe("order");
  });

  it("returns order when secorder has fewer than 3 attempts and is not mastered", () => {
    const state = createEmptyState();
    const sheet = createMockSheet();
    state.drills.secorder[sheet.id] = { streak: 1, attempts: 2, mastered: false };
    const result = pickNextDrill(state, sheet);
    expect(result.type).toBe("order");
  });

  it("returns steps for the section with lowest streak", () => {
    const state = createEmptyState();
    const sheet = createMockSheet();
    state.drills.secorder[sheet.id] = { streak: 3, attempts: 3, mastered: true };
    state.drills.stepseq[sheet.id] = {
      "SCENE SIZE-UP": { streak: 2, attempts: 2, mastered: false },
      "PRIMARY SURVEY/RESUSCITATION": { streak: 0, attempts: 1, mastered: false },
    };
    const result = pickNextDrill(state, sheet);
    expect(result.type).toBe("steps");
    expect(result.sectionName).toBe("PRIMARY SURVEY/RESUSCITATION");
  });

  it("returns steps for a never-attempted section over one with a streak", () => {
    const state = createEmptyState();
    const sheet = createMockSheet();
    state.drills.secorder[sheet.id] = { streak: 3, attempts: 3, mastered: true };
    state.drills.stepseq[sheet.id] = {
      "SCENE SIZE-UP": { streak: 1, attempts: 2, mastered: false },
    };
    const result = pickNextDrill(state, sheet);
    expect(result.type).toBe("steps");
    expect(result.sectionName).toBe("PRIMARY SURVEY/RESUSCITATION");
  });

  it("returns whatnext when all sections mastered", () => {
    const state = createEmptyState();
    const sheet = createMockSheet();
    state.drills.secorder[sheet.id] = { streak: 3, attempts: 3, mastered: true };
    state.drills.stepseq[sheet.id] = {
      "SCENE SIZE-UP": { streak: 3, attempts: 3, mastered: true },
      "PRIMARY SURVEY/RESUSCITATION": { streak: 3, attempts: 3, mastered: true },
    };
    const result = pickNextDrill(state, sheet);
    expect(result.type).toBe("whatnext");
  });

  it("is deterministic: same state produces same result", () => {
    const state = createEmptyState();
    const sheet = createMockSheet();
    state.drills.secorder[sheet.id] = { streak: 3, attempts: 3, mastered: true };
    state.drills.stepseq[sheet.id] = {
      "SCENE SIZE-UP": { streak: 1, attempts: 2, mastered: false },
      "PRIMARY SURVEY/RESUSCITATION": { streak: 1, attempts: 2, mastered: false },
    };
    const first = pickNextDrill(state, sheet);
    const second = pickNextDrill(state, sheet);
    expect(first).toEqual(second);
  });

  it("falls back to order when secorder has 3+ attempts but is not mastered and no drillable sections", () => {
    const state = createEmptyState();
    const sheet = createMockSheet({
      sections: [
        { name: "SINGLE STEP", header: false, steps: [{ text: "Only step", points: 1 }] },
      ],
    });
    state.drills.secorder[sheet.id] = { streak: 0, attempts: 5, mastered: false };
    const result = pickNextDrill(state, sheet);
    expect(result.type).toBe("order");
  });
});
