import { describe, it, expect, vi, afterEach } from "vitest";
import {
  isDue,
  buildQueue,
  gradeCard,
  reinsertCard,
  REINSERT_FAIL,
  REINSERT_CLOSE,
  SESSION_DAY_MS,
} from "../../src/lib/criticalSrs";
import type { CriticalRecord } from "../../src/types";

const neverSeen: CriticalRecord = { grade: null, lastSeenAt: 0, streakKnown: 0, attempts: 0 };

describe("isDue", () => {
  afterEach(() => vi.useRealTimers());

  it("returns true when grade is null (never seen)", () => {
    expect(isDue(neverSeen)).toBe(true);
  });

  it("returns false when last seen under 24 hours ago", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T12:00:00Z"));
    const r: CriticalRecord = { grade: 'know', lastSeenAt: Date.now() - 3_600_000, streakKnown: 1, attempts: 1 };
    expect(isDue(r)).toBe(false);
  });

  it("returns true when last seen exactly 24 hours ago", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-02T12:00:00Z"));
    const r: CriticalRecord = { grade: 'fail', lastSeenAt: Date.now() - SESSION_DAY_MS, streakKnown: 0, attempts: 1 };
    expect(isDue(r)).toBe(true);
  });

  it("returns true when last seen over 24 hours ago", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-02T12:00:00Z"));
    const r: CriticalRecord = { grade: 'close', lastSeenAt: Date.now() - SESSION_DAY_MS - 1, streakKnown: 0, attempts: 2 };
    expect(isDue(r)).toBe(true);
  });
});

describe("buildQueue", () => {
  afterEach(() => vi.useRealTimers());

  it("returns all ids when records is empty", () => {
    expect(buildQueue(["a", "b", "c"], {})).toEqual(["a", "b", "c"]);
  });

  it("excludes criteria seen within 24 hours", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T12:00:00Z"));
    const records: Record<string, CriticalRecord> = {
      "a": { grade: 'know', lastSeenAt: Date.now() - 3_600_000, streakKnown: 1, attempts: 1 },
    };
    expect(buildQueue(["a", "b"], records)).toEqual(["b"]);
  });

  it("includes criteria whose record has grade null", () => {
    const records: Record<string, CriticalRecord> = { "a": neverSeen };
    expect(buildQueue(["a"], records)).toEqual(["a"]);
  });

  it("returns empty array when all criteria are fresh", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T12:00:00Z"));
    const records: Record<string, CriticalRecord> = {
      "a": { grade: 'know', lastSeenAt: Date.now() - 1000, streakKnown: 1, attempts: 1 },
    };
    expect(buildQueue(["a"], records)).toEqual([]);
  });
});

describe("gradeCard", () => {
  afterEach(() => vi.useRealTimers());

  it("creates a fresh record when called with undefined", () => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000_000);
    const result = gradeCard(undefined, 'know');
    expect(result).toEqual({ grade: 'know', lastSeenAt: 1_000_000, streakKnown: 1, attempts: 1 });
  });

  it("increments streakKnown on consecutive 'know' grades", () => {
    vi.useFakeTimers();
    vi.setSystemTime(2_000_000);
    const prev: CriticalRecord = { grade: 'know', lastSeenAt: 0, streakKnown: 2, attempts: 4 };
    const result = gradeCard(prev, 'know');
    expect(result.streakKnown).toBe(3);
    expect(result.attempts).toBe(5);
    expect(result.grade).toBe('know');
  });

  it("resets streakKnown to 0 on 'fail'", () => {
    const prev: CriticalRecord = { grade: 'know', lastSeenAt: 0, streakKnown: 3, attempts: 5 };
    const result = gradeCard(prev, 'fail');
    expect(result.streakKnown).toBe(0);
    expect(result.grade).toBe('fail');
    expect(result.attempts).toBe(6);
  });

  it("resets streakKnown to 0 on 'close'", () => {
    const prev: CriticalRecord = { grade: 'know', lastSeenAt: 0, streakKnown: 1, attempts: 2 };
    const result = gradeCard(prev, 'close');
    expect(result.streakKnown).toBe(0);
    expect(result.grade).toBe('close');
  });

  it("updates lastSeenAt to current time", () => {
    vi.useFakeTimers();
    vi.setSystemTime(9_999_999);
    const result = gradeCard(neverSeen, 'fail');
    expect(result.lastSeenAt).toBe(9_999_999);
  });
});

describe("reinsertCard", () => {
  it(`inserts ${REINSERT_FAIL} positions later on 'fail'`, () => {
    const queue = ["a", "b", "c", "d", "e"];
    const result = reinsertCard(queue, "x", 'fail', 0);
    expect(result[REINSERT_FAIL]).toBe("x");
    expect(result.length).toBe(6);
  });

  it(`inserts ${REINSERT_CLOSE} positions later on 'close'`, () => {
    const queue = ["a", "b", "c", "d", "e", "f", "g"];
    const result = reinsertCard(queue, "x", 'close', 0);
    expect(result[REINSERT_CLOSE]).toBe("x");
    expect(result.length).toBe(8);
  });

  it("clamps to end of queue when offset exceeds length", () => {
    const queue = ["a", "b"];
    const result = reinsertCard(queue, "x", 'fail', 2);
    expect(result[result.length - 1]).toBe("x");
  });

  it("does not mutate the original queue", () => {
    const queue = ["a", "b", "c"];
    reinsertCard(queue, "x", 'fail', 0);
    expect(queue).toEqual(["a", "b", "c"]);
  });

  it("respects currentIndex offset (not just from position 0)", () => {
    const queue = ["a", "b", "c", "d", "e"];
    const result = reinsertCard(queue, "x", 'fail', 2);
    expect(result[4]).toBe("x");
  });
});
