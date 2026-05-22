import { buildFlatSequence, buildScriptSequence, jaccardSimilarity, matchLines, shuffle, sheetMasteryPct } from "../../src/lib/drillHelpers";
import type { AppState, Sheet } from "../../src/types";

const SHEET: Sheet = {
  id: "test",
  title: "Test",
  shortTitle: "T",
  category: "Test",
  totalPoints: 10,
  sections: [
    {
      name: "Section A",
      header: true,
      steps: [
        { text: "Step 1", points: 1, spokenScript: "I am doing step 1." },
        {
          text: "Step 2",
          points: 1,
          substeps: [{ text: "Sub 2a", points: 0 }],
        },
      ],
    },
    {
      name: "Section B",
      header: true,
      steps: [{ text: "Step 3", points: 1, spokenScript: "I am doing step 3." }],
    },
  ],
  criticalCriteria: [],
  cards: [],
};

describe("buildFlatSequence", () => {
  it("flattens steps from all sections", () => {
    const seq = buildFlatSequence(SHEET);
    expect(seq.map((s) => s.text)).toEqual(["Step 1", "Step 2", "Sub 2a", "Step 3"]);
  });

  it("attaches correct sectionName to each step", () => {
    const seq = buildFlatSequence(SHEET);
    expect(seq[0].sectionName).toBe("Section A");
    expect(seq[3].sectionName).toBe("Section B");
  });
});

describe("buildScriptSequence", () => {
  it("only includes steps with spokenScript", () => {
    const seq = buildScriptSequence(SHEET);
    expect(seq).toHaveLength(2);
    expect(seq[0].text).toBe("Step 1");
    expect(seq[1].text).toBe("Step 3");
  });

  it("includes spokenScript field", () => {
    const seq = buildScriptSequence(SHEET);
    expect(seq[0].spokenScript).toBe("I am doing step 1.");
  });
});

describe("jaccardSimilarity", () => {
  it("returns 1 for identical strings", () => {
    expect(jaccardSimilarity("BSI precautions", "BSI precautions")).toBe(1);
  });

  it("returns 1 for two empty strings", () => {
    expect(jaccardSimilarity("", "")).toBe(1);
  });

  it("returns 0 for completely different strings", () => {
    expect(jaccardSimilarity("apple banana", "orange grape")).toBe(0);
  });

  it("returns partial similarity for overlapping words", () => {
    const s = jaccardSimilarity("BSI precautions gloves", "BSI precautions");
    expect(s).toBeGreaterThan(0);
    expect(s).toBeLessThan(1);
  });

  it("is case insensitive", () => {
    const s1 = jaccardSimilarity("BSI Precautions", "bsi precautions");
    expect(s1).toBe(1);
  });
});

describe("matchLines", () => {
  const steps = buildFlatSequence(SHEET).filter((s) => !s.text.startsWith("Sub"));

  it("matches exact lines", () => {
    const results = matchLines(["Step 1", "Step 3"], steps);
    const step1 = results.find((r) => r.expected.text === "Step 1");
    const step3 = results.find((r) => r.expected.text === "Step 3");
    expect(step1?.matched).toBe(true);
    expect(step3?.matched).toBe(true);
  });

  it("marks unmatched steps", () => {
    const results = matchLines(["Step 1"], steps);
    const unmatched = results.filter((r) => !r.matched);
    expect(unmatched.length).toBeGreaterThan(0);
  });

  it("does not reuse the same typed line", () => {
    const results = matchLines(["Step 1", "Step 1"], steps);
    const matched = results.filter((r) => r.matched);
    // Same line should only match one expected step
    expect(matched.length).toBeLessThanOrEqual(2);
  });
});

describe("shuffle", () => {
  it("returns array of same length", () => {
    const arr = [1, 2, 3, 4, 5];
    expect(shuffle(arr)).toHaveLength(arr.length);
  });

  it("contains same elements", () => {
    const arr = [1, 2, 3, 4, 5];
    expect(shuffle(arr).sort()).toEqual([...arr].sort());
  });

  it("does not return same order for arrays larger than 1", () => {
    // Run multiple times to reduce false negative probability
    const arr = [1, 2, 3, 4, 5, 6, 7];
    let differentFound = false;
    for (let i = 0; i < 20; i++) {
      if (!shuffle(arr).every((v, i) => v === arr[i])) {
        differentFound = true;
        break;
      }
    }
    expect(differentFound).toBe(true);
  });
});

const MULTI_SECTION_SHEET: Sheet = {
  id: "e201",
  title: "Test",
  shortTitle: "T",
  category: "Test",
  totalPoints: 10,
  sections: [
    { name: "A", header: true, steps: [{ text: "1", points: 1 }, { text: "2", points: 1 }] },
    { name: "B", header: true, steps: [{ text: "3", points: 1 }, { text: "4", points: 1 }] },
  ],
  criticalCriteria: [],
  cards: [],
};

function emptyState(): AppState {
  return {
    version: 2,
    srs: {},
    notes: { step: {}, sheet: {} },
    stats: { totalReviews: 0, lastReviewedAt: null, dailyStreak: 0, longestStreak: 0, lastStreakDay: null },
    drills: { secorder: {}, stepseq: {}, whatnext: {}, blankrecall: {}, spokenscript: {}, critical: {} },
    achievements: {},
    mnemonics: {},
    chats: {},
    emsSrs: {},
    medcondSrs: {},
    blsMedsSrs: {},
  };
}

describe("sheetMasteryPct", () => {
  it("returns 0 for pristine state", () => {
    expect(sheetMasteryPct(emptyState(), MULTI_SECTION_SHEET)).toBe(0);
  });

  it("returns 20 when only secorder is mastered (1 of 5 sources)", () => {
    const state = emptyState();
    state.drills.secorder["e201"] = { mastered: true, streak: 3, attempts: 3 };
    expect(sheetMasteryPct(state, MULTI_SECTION_SHEET)).toBe(20);
  });

  it("returns 20 when only blankrecall bestPct is 100", () => {
    const state = emptyState();
    state.drills.blankrecall["e201"] = { attempts: 1, lastAttemptAt: null, lastScore: null, bestPct: 100 };
    expect(sheetMasteryPct(state, MULTI_SECTION_SHEET)).toBe(20);
  });

  it("returns 100 when all five drills are fully mastered", () => {
    const state = emptyState();
    state.drills.secorder["e201"] = { mastered: true, streak: 3, attempts: 3 };
    state.drills.stepseq["e201"] = {
      A: { mastered: true, streak: 3, attempts: 3 },
      B: { mastered: true, streak: 3, attempts: 3 },
    };
    state.drills.whatnext["e201"] = { mastered: true, streak: 3, attempts: 3 };
    state.drills.blankrecall["e201"] = { attempts: 1, lastAttemptAt: null, lastScore: null, bestPct: 100 };
    state.drills.spokenscript["e201"] = { mastered: true, streak: 3, attempts: 3, lastScore: null };
    expect(sheetMasteryPct(state, MULTI_SECTION_SHEET)).toBe(100);
  });

  it("counts partial stepseq progress proportionally", () => {
    const state = emptyState();
    state.drills.stepseq["e201"] = {
      A: { mastered: true, streak: 3, attempts: 3 },
    };
    const pct = sheetMasteryPct(state, MULTI_SECTION_SHEET);
    expect(pct).toBeGreaterThan(0);
    expect(pct).toBeLessThan(20);
  });

  it("counts blankrecall bestPct as fraction of 100", () => {
    const state = emptyState();
    state.drills.blankrecall["e201"] = { attempts: 2, lastAttemptAt: null, lastScore: null, bestPct: 50 };
    expect(sheetMasteryPct(state, MULTI_SECTION_SHEET)).toBe(10);
  });
});
