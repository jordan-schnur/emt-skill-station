import { describe, it, expect } from "vitest";
import {
  parseAIResponse,
  computeDebrief,
  createSession,
  BIG5_ITEMS,
} from "../src/lib/examiner";
import type { ExaminerSession } from "../src/types";

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
    const crits = ["Failure A", "Failure B", "Failure C"];
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
    const startedAt = Date.now() - 180000; // 3 minutes ago
    const endedAt = Date.now();
    const session = makeSession({ startedAt, endedAt, big5: BIG5_ITEMS.map(b => ({ ...b, done: true })), crits: [] });
    const result = computeDebrief(session);
    expect(result.elapsedSec).toBeGreaterThanOrEqual(178);
    expect(result.elapsedSec).toBeLessThanOrEqual(182);
  });
});
