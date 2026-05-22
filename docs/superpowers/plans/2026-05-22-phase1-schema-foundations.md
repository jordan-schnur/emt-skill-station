# Phase 1 — Schema Foundations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the `drills.critical` state slice with v1→v2 migration and a `Video` type with `videos?` on `Sheet`, both with no UI changes.

**Architecture:** T-016 adds a per-criterion SRS-lite record to `drills.critical` plus a pure `criticalSrs.ts` library for queue and grading logic; storage migrates v1 state on load. T-029 adds a `Video` type and optional `videos[]` on `Sheet`, read from per-sheet YAML files by `preprocess.py`.

**Tech Stack:** TypeScript / Preact signals, Vitest, Python 3 / pyyaml, pdfplumber

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Modify | `src/types/index.ts` | Add `CriticalGrade`, `CriticalRecord`, update `Drills`, bump `AppState.version` to `2`, add `Video`, add `videos?` to `Sheet` |
| Modify | `src/lib/storage.ts` | Update `createEmptyState()` for v2; add v1→v2 migration in `mergeState()` |
| Create | `src/lib/criticalSrs.ts` | Pure functions: `isDue`, `buildQueue`, `gradeCard`, `reinsertCard` |
| Create | `tests/lib/criticalSrs.test.ts` | 100% line coverage on criticalSrs |
| Modify | `tests/lib/storage.test.ts` | Update version assertions; add migration test |
| Modify | `tests/vitest.fixtures.ts` | Update `createEmptyState()` and `createStateWithDrills()` for v2 |
| Modify | `tests/lib/drillHelpers.test.ts:149-161` | Update inline `emptyState()` for v2 |
| Modify | `tests/e2e/data-persistence.spec.js:238,250` | Update version assertions to 2 |
| Modify | `tests/e2e/flashcards.spec.js:92` | Update version assertion to 2 |
| Create | `E201_videos.yaml` … `E217_videos.yaml` | 10 video YAML files (one per sheet) |
| Modify | `preprocess.py` | Add `load_videos()` + merge videos in main loop |
| Regenerate | `data.json` | Run `python3 preprocess.py` |

---

## Task 1: Add types to `src/types/index.ts`

**Files:**
- Modify: `src/types/index.ts`

- [ ] **Step 1: Add `CriticalGrade`, `CriticalRecord`, update `Drills`, bump `AppState.version`**

In `src/types/index.ts`, after the `SpokenScriptRecord` block (after line 90) add:

```ts
export type CriticalGrade = 'fail' | 'close' | 'know' | null;

export interface CriticalRecord {
  grade: CriticalGrade;
  lastSeenAt: number;
  streakKnown: number;
  attempts: number;
}
```

Change the `Drills` interface to add `critical`:

```ts
export interface Drills {
  secorder: Record<string, DrillRecord>;
  stepseq: Record<string, Record<string, DrillRecord>>;
  whatnext: Record<string, DrillRecord>;
  blankrecall: Record<string, BlankRecallRecord>;
  spokenscript: Record<string, SpokenScriptRecord>;
  medcondquiz?: MedCondQuizRecord;
  critical: Record<string, Record<string, CriticalRecord>>;
}
```

Change `AppState.version` literal type from `1` to `2`:

```ts
export interface AppState {
  version: 2;
  // ... rest unchanged
}
```

- [ ] **Step 2: Add `Video` interface and `videos?` on `Sheet`**

After the `NremtData` block (after line 47), add:

```ts
export interface Video {
  videoId: string;
  title: string;
  channel: string;
  duration?: string;
  url: string;
  note?: string;
}
```

Update `Sheet` to include `videos?`:

```ts
export interface Sheet {
  id: string;
  title: string;
  shortTitle: string;
  category: string;
  totalPoints: number;
  timeLimit?: string;
  sections: Section[];
  criticalCriteria: string[];
  cards: Card[];
  videos?: Video[];
}
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: errors because storage.ts still returns `version: 1` — fix in Task 2.

---

## Task 2: Update `src/lib/storage.ts` for v2

**Files:**
- Modify: `src/lib/storage.ts`

- [ ] **Step 1: Update `createEmptyState()` to version 2 with `drills.critical`**

Replace the entire `createEmptyState` function:

```ts
export function createEmptyState(): AppState {
  return {
    version: 2,
    srs: {},
    notes: { step: {}, sheet: {} },
    stats: {
      totalReviews: 0,
      lastReviewedAt: null,
      dailyStreak: 0,
      longestStreak: 0,
      lastStreakDay: null,
    },
    drills: { secorder: {}, stepseq: {}, whatnext: {}, blankrecall: {}, spokenscript: {}, critical: {} },
    achievements: {},
    mnemonics: {},
    chats: {},
    emsSrs: {},
    medcondSrs: {},
  };
}
```

- [ ] **Step 2: Update `mergeState()` to migrate v1 → v2**

Replace the entire `mergeState` function:

```ts
function mergeState(parsed: unknown): AppState {
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return createEmptyState();
  }
  const p = parsed as Record<string, unknown>;
  const fresh = createEmptyState();
  const parsedDrills = (p["drills"] as Record<string, unknown>) || {};
  const isV1 = !p["version"] || (p["version"] as number) < 2;
  return {
    ...fresh,
    ...(p as Partial<AppState>),
    version: 2,
    notes: { ...fresh.notes, ...((p["notes"] as Partial<AppState["notes"]>) || {}) },
    stats: { ...fresh.stats, ...((p["stats"] as Partial<AppState["stats"]>) || {}) },
    srs: (p["srs"] as AppState["srs"]) || {},
    achievements: { ...((p["achievements"] as AppState["achievements"]) || {}) },
    mnemonics: { ...((p["mnemonics"] as AppState["mnemonics"]) || {}) },
    chats: { ...((p["chats"] as AppState["chats"]) || {}) },
    emsSrs: { ...((p["emsSrs"] as AppState["emsSrs"]) || {}) },
    drills: {
      ...fresh.drills,
      ...(parsedDrills as Partial<AppState["drills"]>),
      secorder:     parsedDrills["secorder"]     ? { ...(parsedDrills["secorder"]     as AppState["drills"]["secorder"]) }     : {},
      stepseq:      parsedDrills["stepseq"]      ? { ...(parsedDrills["stepseq"]      as AppState["drills"]["stepseq"]) }      : {},
      whatnext:     parsedDrills["whatnext"]     ? { ...(parsedDrills["whatnext"]     as AppState["drills"]["whatnext"]) }     : {},
      blankrecall:  parsedDrills["blankrecall"]  ? { ...(parsedDrills["blankrecall"]  as AppState["drills"]["blankrecall"]) }  : {},
      spokenscript: parsedDrills["spokenscript"] ? { ...(parsedDrills["spokenscript"] as AppState["drills"]["spokenscript"]) } : {},
      critical:     isV1 ? {} : (parsedDrills["critical"] ? { ...(parsedDrills["critical"] as AppState["drills"]["critical"]) } : {}),
    },
  };
}
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: zero errors

---

## Task 3: Create `src/lib/criticalSrs.ts`

**Files:**
- Create: `src/lib/criticalSrs.ts`

- [ ] **Step 1: Write the file**

```ts
import type { CriticalRecord, CriticalGrade } from "../types";

export const REINSERT_FAIL = 2;
export const REINSERT_CLOSE = 5;
export const SESSION_DAY_MS = 86_400_000;

export function isDue(record: CriticalRecord): boolean {
  if (record.grade === null) return true;
  return Date.now() - record.lastSeenAt >= SESSION_DAY_MS;
}

export function buildQueue(
  criteriaIds: string[],
  records: Record<string, CriticalRecord>
): string[] {
  return criteriaIds.filter(id => {
    const r = records[id];
    return !r || isDue(r);
  });
}

export function gradeCard(
  record: CriticalRecord | undefined,
  grade: Exclude<CriticalGrade, null>
): CriticalRecord {
  const prev = record ?? { grade: null, lastSeenAt: 0, streakKnown: 0, attempts: 0 };
  return {
    grade,
    lastSeenAt: Date.now(),
    streakKnown: grade === 'know' ? prev.streakKnown + 1 : 0,
    attempts: prev.attempts + 1,
  };
}

export function reinsertCard(
  queue: string[],
  cardId: string,
  grade: 'fail' | 'close',
  currentIndex: number
): string[] {
  const offset = grade === 'fail' ? REINSERT_FAIL : REINSERT_CLOSE;
  const result = [...queue];
  result.splice(Math.min(currentIndex + offset, result.length), 0, cardId);
  return result;
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: zero errors

---

## Task 4: Write `tests/lib/criticalSrs.test.ts` (100% line coverage)

**Files:**
- Create: `tests/lib/criticalSrs.test.ts`

- [ ] **Step 1: Write the test file**

```ts
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
```

- [ ] **Step 2: Run tests and verify 100% coverage for criticalSrs.ts**

Run: `npm test -- --coverage --reporter=verbose 2>&1 | grep -A5 "criticalSrs"`
Expected: all functions covered, 0 uncovered lines

---

## Task 5: Update `tests/lib/storage.test.ts` for v2

**Files:**
- Modify: `tests/lib/storage.test.ts`

- [ ] **Step 1: Update version assertion on line 17**

Change:
```ts
expect(loaded.version).toBe(1);
```
To:
```ts
expect(loaded.version).toBe(2);
```

- [ ] **Step 2: Update the backfill test on line 26**

The test saves a v1 object `{ version: 1, ... }` with no drills and checks the result. Change:
```ts
expect(loaded.drills).toEqual({ secorder: {}, stepseq: {}, whatnext: {}, blankrecall: {}, spokenscript: {} });
```
To:
```ts
expect(loaded.drills).toEqual({ secorder: {}, stepseq: {}, whatnext: {}, blankrecall: {}, spokenscript: {}, critical: {} });
```

- [ ] **Step 3: Add v1→v2 migration test**

After the existing "backfills missing branches" test, insert:

```ts
it("migrates v1 state: initializes drills.critical to {} and sets version to 2", () => {
  const v1State = {
    version: 1,
    srs: {},
    notes: { step: {}, sheet: {} },
    stats: { totalReviews: 5, lastReviewedAt: null, dailyStreak: 0, longestStreak: 0, lastStreakDay: null },
    drills: { secorder: { "e201": { mastered: true, streak: 3, attempts: 3 } }, stepseq: {}, whatnext: {}, blankrecall: {}, spokenscript: {} },
    achievements: {},
    mnemonics: {},
    chats: {},
    emsSrs: {},
    medcondSrs: {},
  };
  localStorage.setItem("nremt.state.v1", JSON.stringify(v1State));

  const loaded = load();

  expect(loaded.version).toBe(2);
  expect(loaded.drills.critical).toEqual({});
  expect(loaded.drills.secorder["e201"].mastered).toBe(true);
});
```

- [ ] **Step 4: Run tests**

Run: `npm test -- tests/lib/storage.test.ts`
Expected: all passing

---

## Task 6: Update remaining test files for v2

**Files:**
- Modify: `tests/vitest.fixtures.ts`
- Modify: `tests/lib/drillHelpers.test.ts`
- Modify: `tests/e2e/data-persistence.spec.js`
- Modify: `tests/e2e/flashcards.spec.js`

- [ ] **Step 1: Update `tests/vitest.fixtures.ts`**

In `createEmptyState()` (line 58), change `version: 1` to `version: 2` and add `critical: {}` to drills:

```ts
export function createEmptyState(): AppState {
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
  };
}
```

Also update `createStateWithDrills()` (line 82) to include `critical: {}` in drills:

```ts
export function createStateWithDrills(): AppState {
  const state = createEmptyState();
  state.drills = {
    secorder: { "e201": { mastered: false, streak: 2, attempts: 2 } },
    stepseq: { "e201": { "SCENE SIZE-UP": { mastered: true, streak: 3, attempts: 3 } } },
    whatnext: {},
    blankrecall: {},
    spokenscript: {},
    critical: {},
  };
  return state;
}
```

- [ ] **Step 2: Update `tests/lib/drillHelpers.test.ts` inline `emptyState()`**

The local `emptyState()` function starting at line 149 returns `version: 1` and drills without `critical`. Change to:

```ts
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
  };
}
```

- [ ] **Step 3: Update `tests/e2e/data-persistence.spec.js`**

Line 238: change `toBe(1)` to `toBe(2)`.
Line 250: change `{ version: 1, srs: {}, notes: {}, stats: {} }` to `{ version: 2, srs: {}, notes: {}, stats: {} }`.

- [ ] **Step 4: Update `tests/e2e/flashcards.spec.js`**

Line 92: change `toBe(1)` to `toBe(2)`.

- [ ] **Step 5: Run full test suite**

Run: `npm test`
Expected: all passing, coverage thresholds not regressed

- [ ] **Step 6: Commit T-016 work**

```bash
git add src/types/index.ts src/lib/storage.ts src/lib/criticalSrs.ts \
        tests/lib/criticalSrs.test.ts tests/lib/storage.test.ts \
        tests/vitest.fixtures.ts tests/lib/drillHelpers.test.ts \
        tests/e2e/data-persistence.spec.js tests/e2e/flashcards.spec.js
git commit -m "feat(state): add drills.critical slice, v1→v2 migration, criticalSrs library

- Add CriticalGrade, CriticalRecord types; critical field on Drills
- Bump AppState.version to 2; mergeState migrates v1 by initializing critical: {}
- New criticalSrs.ts: isDue, buildQueue, gradeCard, reinsertCard
- Tests: 100% coverage on criticalSrs; storage migration tests

Closes #52"
```

---

## Task 7: Create video YAML files

**Files:**
- Create: `E201_videos.yaml`, `E202_videos.yaml`, `E203_videos.yaml`, `E204_videos.yaml`,
  `E211_videos.yaml`, `E212_videos.yaml`, `E213_videos.yaml`, `E215_videos.yaml`,
  `E216_videos.yaml`, `E217_videos.yaml`

- [ ] **Step 1: Create each YAML file**

`E201_videos.yaml`:
```yaml
- videoId: vsvDUhqlfhs
  title: "EMT Skills: Trauma Patient Assessment/Management"
  channel: EMTprep
  url: https://www.youtube.com/watch?v=vsvDUhqlfhs
- videoId: Fb6UIBquI5U
  title: National Registry EMT Trauma Patient Assessment/Management
  channel: Rallypoint EMS NREMT Demos
  url: https://www.youtube.com/watch?v=Fb6UIBquI5U
```

`E202_videos.yaml`:
```yaml
- videoId: cwyJHy8zaE4
  title: "EMT Skills: Medical Patient Assessment/Management"
  channel: EMTprep
  url: https://www.youtube.com/watch?v=cwyJHy8zaE4
- videoId: XenGVbGMzCk
  title: Medical Assessment - EMT Skill
  channel: Safety Unlimited
  url: https://www.youtube.com/watch?v=XenGVbGMzCk
```

`E203_videos.yaml`:
```yaml
- videoId: U2cpSUpMO30
  title: BVM Ventilation of an Apneic Adult Patient - EMT Skill
  channel: Safety Unlimited
  url: https://www.youtube.com/watch?v=U2cpSUpMO30
- videoId: O3StYjvfjUo
  title: "EMT Skills: Bag-Valve-Mask (BVM) Ventilation"
  channel: EMTprep
  url: https://www.youtube.com/watch?v=O3StYjvfjUo
```

`E204_videos.yaml`:
```yaml
- videoId: TDVVFT67bo0
  title: Oxygen Administration by Non-Rebreather Mask - EMT Skill
  channel: Safety Unlimited
  url: https://www.youtube.com/watch?v=TDVVFT67bo0
- videoId: Mk3GbDFpvFU
  title: "NREMT EMT Oxygen Delivery: Non-Rebreather Mask Technique Step-By-Step"
  channel: SkinnyMedic
  url: https://www.youtube.com/watch?v=Mk3GbDFpvFU
```

`E211_videos.yaml`:
```yaml
- videoId: HAtyB-UEN7Y
  title: "EMT Skills: Spinal Immobilization Seated Patient"
  channel: EMTprep
  url: https://www.youtube.com/watch?v=HAtyB-UEN7Y
- videoId: K9qenNlqNiQ
  title: Spinal Immobilization (Seated Patient) - EMT Skill
  channel: Safety Unlimited
  url: https://www.youtube.com/watch?v=K9qenNlqNiQ
```

`E212_videos.yaml`:
```yaml
- videoId: j4d9NvFIqGo
  title: "NREMT Skills Sheet: Spinal Immobilization - Supine Patient"
  channel: Best Practice Medicine
  url: https://www.youtube.com/watch?v=j4d9NvFIqGo
- videoId: X0NbNMYQkhM
  title: Spinal Immobilization (Supine Patient) - EMT Skill
  channel: Safety Unlimited
  url: https://www.youtube.com/watch?v=X0NbNMYQkhM
```

`E213_videos.yaml`:
```yaml
- videoId: kgXvQWWWgFw
  title: Bleeding Control/Shock Management - EMT Skill
  channel: Safety Unlimited
  url: https://www.youtube.com/watch?v=kgXvQWWWgFw
- videoId: MZQ7nYsK11Q
  title: "EMT Skills: Bleeding Control/Shock Management"
  channel: EMTprep
  url: https://www.youtube.com/watch?v=MZQ7nYsK11Q
```

`E215_videos.yaml`:
```yaml
- videoId: pE6dSsMM6nE
  title: "EMT Skills: Cardiac Arrest Management AED"
  channel: EMTprep
  url: https://www.youtube.com/watch?v=pE6dSsMM6nE
- videoId: 6l27jMcUP8A
  title: Cardiac Arrest Management/AED - EMT Skill
  channel: Safety Unlimited
  url: https://www.youtube.com/watch?v=6l27jMcUP8A
```

`E216_videos.yaml`:
```yaml
- videoId: E0U4xIBQE50
  title: "EMT Skills: Joint Immobilization"
  channel: EMTprep
  url: https://www.youtube.com/watch?v=E0U4xIBQE50
- videoId: RPamG0RR6D0
  title: NREMT Joint Immobilization
  channel: YNHSH Staff
  url: https://www.youtube.com/watch?v=RPamG0RR6D0
```

`E217_videos.yaml`:
```yaml
- videoId: u-sCMeqhyk0
  title: "EMT Skills: Long Bone Immobilization"
  channel: EMTprep
  url: https://www.youtube.com/watch?v=u-sCMeqhyk0
- videoId: woetGcau5bo
  title: Joint and Longbone Immobilization
  channel: EMS training demo
  url: https://www.youtube.com/watch?v=woetGcau5bo
```

---

## Task 8: Update `preprocess.py` to load videos

**Files:**
- Modify: `preprocess.py`

- [ ] **Step 1: Add yaml import after the pdfplumber import block (after line 38)**

```python
try:
    import yaml
except ImportError:
    sys.stderr.write("pyyaml is required. Install: pip install pyyaml\n")
    sys.exit(1)
```

- [ ] **Step 2: Add `load_videos()` function before `main()`**

Add this function just before `def main() -> int:` (around line 698):

```python
def load_videos(sheet_id: str) -> list[dict] | None:
    path = HERE / f"{sheet_id.upper()}_videos.yaml"
    if not path.exists():
        return None
    with open(path) as f:
        data = yaml.safe_load(f)
    return data if isinstance(data, list) else None
```

- [ ] **Step 3: Merge videos into `out_sheets.append(...)` in `main()`**

Change the `out_sheets.append` block (currently lines 730-734) from:

```python
        out_sheets.append({
            **sheet,
            "criticalCriteria": criteria,
            "cards": cards,
        })
```

To:

```python
        videos = load_videos(sheet_id)
        sheet_entry: dict = {
            **sheet,
            "criticalCriteria": criteria,
            "cards": cards,
        }
        if videos is not None:
            sheet_entry["videos"] = videos
        out_sheets.append(sheet_entry)
```

- [ ] **Step 4: Run preprocess.py to verify it parses without errors**

Run: `python3 preprocess.py 2>&1 | tail -5`
Expected: "Wrote data.json" and "Wrote js/data.js"

---

## Task 9: Verify `data.json` and run all tests

**Files:**
- `data.json` (regenerated)

- [ ] **Step 1: Confirm videos appear in data.json**

Run: `python3 -c "import json; d=json.load(open('data.json')); s=next(x for x in d['sheets'] if x['id']=='e201'); print(s['videos'])"`
Expected: list with 2 video dicts for e201

- [ ] **Step 2: Confirm sheets without video files have no videos key**

All 10 sheets in the user's CSV have YAML files so all should have videos. Confirm with:
Run: `python3 -c "import json; d=json.load(open('data.json')); [print(s['id'], 'videos' in s) for s in d['sheets']]"`
Expected: all 10 sheets show `True`

- [ ] **Step 3: Run full test suite and type check**

Run: `npm test && npx tsc --noEmit`
Expected: all tests pass, zero type errors

- [ ] **Step 4: Commit T-029 work**

```bash
git add src/types/index.ts preprocess.py data.json js/data.js \
        E201_videos.yaml E202_videos.yaml E203_videos.yaml E204_videos.yaml \
        E211_videos.yaml E212_videos.yaml E213_videos.yaml E215_videos.yaml \
        E216_videos.yaml E217_videos.yaml
git commit -m "feat(schema): add Video type and per-sheet videos[] field

- Add Video interface with videoId, title, channel, url (duration optional)
- Add videos? to Sheet type
- preprocess.py reads E2XX_videos.yaml and merges into data.json
- 10 video YAML files covering all skill sheets

Closes #65"
```

---

## Self-Review

**Spec coverage:**
- [x] T-016: `AppState` types updated (`CriticalRecord`, `CriticalGrade`, `Drills.critical`)
- [x] T-016: Migration v1→v2 leaves all other fields untouched (tested in Task 5 Step 3)
- [x] T-016: `criticalSrs.ts` grade and pick functions with 100% line coverage (Task 4)
- [x] T-029: `Video` type added
- [x] T-029: `preprocess.py` reads optional video YAML files
- [x] T-029: Sheets with no YAML file get `videos: undefined` (not `[]`) — `load_videos` returns `None`, entry only added if not `None`

**Placeholder scan:** No TBDs or "implement later" patterns. All code blocks are complete.

**Type consistency:**
- `CriticalRecord` defined in Task 1, imported in Task 3 and Task 4
- `CriticalGrade` defined in Task 1, used in `criticalSrs.ts` as `Exclude<CriticalGrade, null>`
- `gradeCard` returns `CriticalRecord`, used in test assertions matching same shape
- `reinsertCard` signature uses `'fail' | 'close'` (subset of `CriticalGrade`) — consistent across tasks
- `Video` defined in Task 1, output from `load_videos()` in Task 8 produces matching dict shape
