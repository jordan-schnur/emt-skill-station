import { describe, it, expect } from "vitest";
import {
  parseAIResponse,
  computeDebrief,
  createSession,
  buildScenarioPrompt,
  buildExaminerSystemPrompt,
  buildDebriefSystemPrompt,
  getActiveSession,
  getPreSession,
  getPastSessions,
  BIG5_ITEMS,
} from "../../src/lib/examiner";
import type { AppState, ExaminerSession, Sheet } from "../../src/types";

const MOCK_SHEET: Sheet = {
  id: "e202",
  title: "Patient Assessment – Medical",
  shortTitle: "Medical",
  category: "Patient Assessment",
  totalPoints: 40,
  timeLimit: "15 min",
  sections: [],
  criticalCriteria: [{ text: "Failure to take BSI precautions", pearl: null }],
  cards: [],
};

function makeEmptyState(): AppState {
  return {
    version: 2,
    srs: {},
    notes: { step: {}, sheet: {} },
    stats: { totalReviews: 0, lastReviewedAt: null, dailyStreak: 0, longestStreak: 0, lastStreakDay: null },
    drills: { secorder: {}, stepseq: {}, whatnext: {}, blankrecall: {}, spokenscript: {}, critical: {} },
    achievements: {},
    mnemonics: {},
    chats: {},
    examinerSessions: {},
    emsSrs: {},
    medcondSrs: {},
    blsMedsSrs: {},
  };
}

// ─── parseAIResponse ──────────────────────────────────────────────────────────

describe("parseAIResponse", () => {
  it("extracts JSON and reply from well-formed response", () => {
    const raw = `{"big5_detected":["scene_safety","bsi"],"vitals_revealed":["hr"],"violations":[]}
The patient is conscious and breathing. *You notice mild diaphoresis.*`;
    const result = parseAIResponse(raw);
    expect(result.big5Detected).toEqual(["scene_safety", "bsi"]);
    expect(result.vitalsRevealed).toEqual(["hr"]);
    expect(result.violations).toEqual([]);
    expect(result.reply).toContain("conscious");
  });

  it("returns empty arrays and raw text when JSON is missing", () => {
    const raw = "Continue. The scene is safe.";
    const result = parseAIResponse(raw);
    expect(result.big5Detected).toEqual([]);
    expect(result.vitalsRevealed).toEqual([]);
    expect(result.violations).toEqual([]);
    expect(result.reply).toBe("Continue. The scene is safe.");
  });

  it("returns empty arrays when JSON is malformed", () => {
    const raw = `{bad json here}
Some reply text.`;
    const result = parseAIResponse(raw);
    expect(result.big5Detected).toEqual([]);
    expect(result.reply).toContain("Some reply");
  });

  it("filters out invalid Big 5 ids", () => {
    const raw = `{"big5_detected":["scene_safety","invalid_id"],"vitals_revealed":[],"violations":[]}
Noted.`;
    const result = parseAIResponse(raw);
    expect(result.big5Detected).toEqual(["scene_safety"]);
  });

  it("handles violations array with indices", () => {
    const raw = `{"big5_detected":[],"vitals_revealed":[],"violations":[2,7]}
That intervention is contraindicated.`;
    const result = parseAIResponse(raw);
    expect(result.violations).toEqual([2, 7]);
  });
});

// ─── createSession ────────────────────────────────────────────────────────────

describe("createSession", () => {
  it("creates session with status pre and null scenario", () => {
    const session = createSession("e202", ["Failure to take PPE", "Failure to assess airway"]);
    expect(session.status).toBe("pre");
    expect(session.scenario).toBeNull();
    expect(session.sheetId).toBe("e202");
  });

  it("initializes big5 with all 5 items undone", () => {
    const session = createSession("e202", []);
    expect(session.big5).toHaveLength(5);
    expect(session.big5.every(b => !b.done)).toBe(true);
    const ids = session.big5.map(b => b.id);
    expect(ids).toContain("scene_safety");
    expect(ids).toContain("bsi");
  });

  it("initializes crits from criticalCriteria array", () => {
    const crits = [
      { text: "Failure A", pearl: null },
      { text: "Failure B", pearl: null },
      { text: "Failure C", pearl: null },
    ];
    const session = createSession("e201", crits);
    expect(session.crits).toHaveLength(3);
    expect(session.crits[0]).toEqual({ idx: 0, body: "Failure A", violated: false });
    expect(session.crits[2].body).toBe("Failure C");
  });

  it("initializes all vitals as unrevealed", () => {
    const session = createSession("e202", []);
    expect(session.vitalsRevealed).toEqual({ hr: false, bp: false, rr: false, spo2: false, gcs: false });
  });

  it("generates unique ids for each session", () => {
    const a = createSession("e202", []);
    const b = createSession("e202", []);
    expect(a.id).not.toBe(b.id);
  });
});

// ─── computeDebrief ───────────────────────────────────────────────────────────

function makeSession(overrides: Partial<ExaminerSession> = {}): ExaminerSession {
  const base = createSession("e202", ["Crit A", "Crit B"]);
  return {
    ...base,
    status: "debrief",
    scenario: {
      dispatch: "Test dispatch",
      patient: { age: 62, sex: "M", chiefComplaint: "chest pain", history: "PMH HTN" },
      vitals: { hr: "92 bpm", bp: "148/86 mmHg", rr: "20 breaths/min", spo2: "94% RA", gcs: "15" },
      timeLimitSec: 900,
    },
    startedAt: Date.now() - 300000,
    endedAt: Date.now(),
    ...overrides,
  };
}

describe("computeDebrief", () => {
  it("returns pass when all Big 5 done and no violations", () => {
    const session = makeSession({
      big5: BIG5_ITEMS.map(b => ({ ...b, done: true })),
      crits: [{ idx: 0, body: "Crit A", violated: false }],
    });
    const result = computeDebrief(session);
    expect(result.verdict).toBe("pass");
    expect(result.big5Done).toBe(5);
    expect(result.violationCount).toBe(0);
  });

  it("returns fail when Big 5 incomplete", () => {
    const session = makeSession({
      big5: BIG5_ITEMS.map((b, i) => ({ ...b, done: i < 3 })),
      crits: [],
    });
    const result = computeDebrief(session);
    expect(result.verdict).toBe("fail");
    expect(result.big5Done).toBe(3);
    expect(result.reasons.some(r => r.includes("Big 5"))).toBe(true);
  });

  it("returns fail when violations present", () => {
    const session = makeSession({
      big5: BIG5_ITEMS.map(b => ({ ...b, done: true })),
      crits: [{ idx: 0, body: "Crit A", violated: true }],
    });
    const result = computeDebrief(session);
    expect(result.verdict).toBe("fail");
    expect(result.violationCount).toBe(1);
  });

  it("computes elapsed time from startedAt/endedAt", () => {
    const startedAt = Date.now() - 180000;
    const endedAt = Date.now();
    const session = makeSession({ startedAt, endedAt, big5: BIG5_ITEMS.map(b => ({ ...b, done: true })), crits: [] });
    const result = computeDebrief(session);
    expect(result.elapsedSec).toBeGreaterThanOrEqual(178);
    expect(result.elapsedSec).toBeLessThanOrEqual(182);
  });

  it("returns zero elapsedSec when startedAt or endedAt is null", () => {
    const session = makeSession({ startedAt: null, endedAt: null });
    const result = computeDebrief(session);
    expect(result.elapsedSec).toBe(0);
  });
});

// ─── buildScenarioPrompt ──────────────────────────────────────────────────────

describe("buildScenarioPrompt", () => {
  it("returns system and user strings", () => {
    const { system, user } = buildScenarioPrompt(MOCK_SHEET);
    expect(typeof system).toBe("string");
    expect(typeof user).toBe("string");
    expect(system.length).toBeGreaterThan(0);
    expect(user).toMatch(/^Generate a scenario now\. Nonce: [a-z0-9]+$/);
  });

  it("includes the sheet title and id in the system prompt", () => {
    const { system } = buildScenarioPrompt(MOCK_SHEET);
    expect(system).toContain(MOCK_SHEET.title);
    expect(system).toContain(MOCK_SHEET.id.toUpperCase());
  });

  it("uses seed data for known sheet ids", () => {
    const sheet: Sheet = { ...MOCK_SHEET, id: "e201", title: "Patient Assessment – Trauma" };
    const { system } = buildScenarioPrompt(sheet);
    expect(system).toContain("trauma mechanisms");
  });

  it("falls back to generic hints for unknown sheet ids", () => {
    const sheet: Sheet = { ...MOCK_SHEET, id: "e999", title: "Unknown Station" };
    const { system } = buildScenarioPrompt(sheet);
    expect(system).toContain("appropriate emergency");
  });
});

// ─── buildExaminerSystemPrompt ────────────────────────────────────────────────

describe("buildExaminerSystemPrompt", () => {
  const SCENARIO = {
    dispatch: "Test dispatch.",
    patient: { age: 45, sex: "M" as const, chiefComplaint: "chest pain", history: "PMH HTN" },
    vitals: { hr: "92 bpm", bp: "148/86 mmHg", rr: "18 breaths/min", spo2: "96% RA", gcs: "15" },
    timeLimitSec: 600,
  };

  it("includes patient info and timeLimitSec in prompt", () => {
    const session = { ...createSession("e202", ["Crit A"]), scenario: SCENARIO, startedAt: Date.now() };
    const prompt = buildExaminerSystemPrompt(session, MOCK_SHEET);
    expect(prompt).toContain("45-year-old male");
    expect(prompt).toContain("chest pain");
    expect(prompt).toContain("10 minutes");
  });

  it("shows 'untimed' when timeLimitSec is 0", () => {
    const session = {
      ...createSession("e202", []),
      scenario: { ...SCENARIO, timeLimitSec: 0 },
      startedAt: Date.now(),
    };
    const prompt = buildExaminerSystemPrompt(session, MOCK_SHEET);
    expect(prompt).toContain("untimed");
  });

  it("includes critical criteria list", () => {
    const session = { ...createSession("e202", [{ text: "Failure to take BSI", pearl: null }]), scenario: SCENARIO, startedAt: Date.now() };
    const prompt = buildExaminerSystemPrompt(session, MOCK_SHEET);
    expect(prompt).toContain("Failure to take BSI");
  });
});

// ─── Session state helpers ────────────────────────────────────────────────────

describe("getActiveSession", () => {
  it("returns null when no sessions exist", () => {
    const state = makeEmptyState();
    expect(getActiveSession(state, "e202")).toBeNull();
  });

  it("returns active session for the sheet", () => {
    const state = makeEmptyState();
    const session = { ...createSession("e202", []), status: "active" as const };
    state.examinerSessions[session.id] = session;
    const result = getActiveSession(state, "e202");
    expect(result?.id).toBe(session.id);
  });

  it("does not return pre or debrief sessions", () => {
    const state = makeEmptyState();
    const pre = createSession("e202", []);
    const debrief = { ...createSession("e202", []), status: "debrief" as const };
    state.examinerSessions[pre.id] = pre;
    state.examinerSessions[debrief.id] = debrief;
    expect(getActiveSession(state, "e202")).toBeNull();
  });
});

describe("getPreSession", () => {
  it("returns null when no pre sessions exist", () => {
    const state = makeEmptyState();
    expect(getPreSession(state, "e202")).toBeNull();
  });

  it("returns the most recent pre session", () => {
    const state = makeEmptyState();
    const s1 = { ...createSession("e202", []), createdAt: "2024-01-01T00:00:00Z" };
    const s2 = { ...createSession("e202", []), createdAt: "2024-01-02T00:00:00Z" };
    state.examinerSessions[s1.id] = s1;
    state.examinerSessions[s2.id] = s2;
    const result = getPreSession(state, "e202");
    expect(result?.id).toBe(s2.id);
  });
});

describe("getPastSessions", () => {
  it("returns empty array when no debrief sessions", () => {
    const state = makeEmptyState();
    expect(getPastSessions(state, "e202")).toEqual([]);
  });

  it("returns only debrief sessions for the given sheetId", () => {
    const state = makeEmptyState();
    const d1 = { ...createSession("e202", []), status: "debrief" as const };
    const d2 = { ...createSession("e201", []), status: "debrief" as const };
    state.examinerSessions[d1.id] = d1;
    state.examinerSessions[d2.id] = d2;
    const result = getPastSessions(state, "e202");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(d1.id);
  });
});

// ─── createSession ────────────────────────────────────────────────────────────

describe("createSession", () => {
  it("initializes debriefMessages as empty array", () => {
    const session = createSession("e202", ["Crit A"]);
    expect(session.debriefMessages).toEqual([]);
  });
});

// ─── buildDebriefSystemPrompt ─────────────────────────────────────────────────

describe("buildDebriefSystemPrompt", () => {
  const SCENARIO = {
    dispatch: "Dispatch to chest pain.",
    patient: { age: 55, sex: "M" as const, chiefComplaint: "chest pain", history: "PMH HTN, hyperlipidemia" },
    vitals: { hr: "104 bpm", bp: "156/92 mmHg", rr: "20 breaths/min", spo2: "94% RA", gcs: "15" },
    timeLimitSec: 900,
  };

  it("includes sheet info and verdict in the prompt", () => {
    const session = {
      ...createSession("e202", ["Failure to take BSI"]),
      scenario: SCENARIO,
      startedAt: Date.now() - 300000,
      endedAt: Date.now(),
      status: "debrief" as const,
    };
    session.big5.forEach(b => { b.done = true; });
    const prompt = buildDebriefSystemPrompt(session, MOCK_SHEET);
    expect(prompt).toContain("PASS");
    expect(prompt).toContain(MOCK_SHEET.title);
    expect(prompt).toContain("E202");
  });

  it("lists missed Big 5 items when not done", () => {
    const session = {
      ...createSession("e202", []),
      scenario: SCENARIO,
      startedAt: Date.now() - 60000,
      endedAt: Date.now(),
      status: "debrief" as const,
    };
    const prompt = buildDebriefSystemPrompt(session, MOCK_SHEET);
    expect(prompt).toContain("FAIL");
    expect(prompt).toContain("Scene safety");
  });

  it("includes violation info when crits are violated", () => {
    const session = {
      ...createSession("e202", [{ text: "Failure to take BSI", pearl: null }]),
      scenario: SCENARIO,
      startedAt: Date.now() - 60000,
      endedAt: Date.now(),
      status: "debrief" as const,
    };
    session.crits[0].violated = true;
    const prompt = buildDebriefSystemPrompt(session, MOCK_SHEET);
    expect(prompt).toContain("Failure to take BSI");
  });

  it("handles session with no scenario", () => {
    const session = {
      ...createSession("e202", []),
      scenario: null,
      startedAt: Date.now() - 30000,
      endedAt: Date.now(),
      status: "debrief" as const,
    };
    const prompt = buildDebriefSystemPrompt(session, MOCK_SHEET);
    expect(typeof prompt).toBe("string");
    expect(prompt.length).toBeGreaterThan(0);
  });
});
