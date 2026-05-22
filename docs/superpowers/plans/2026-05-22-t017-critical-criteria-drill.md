# T-017 — CriticalCriteriaDrill Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a CriticalCriteriaDrill view that lets users grade each auto-fail criterion as "Would fail / Close call / Know it cold," wire it into SheetView as an enabled tab, and persist results to `drills.critical[sheetId]`.

**Architecture:** Index-keyed criterion IDs (`"0"`, `"1"`, …) into `drills.critical[sheetId]`. Session queue built by `buildQueue` from `criticalSrs.ts`. Each grade calls `gradeCard` + persists via `mutateState`/`save`; fail/close uses `reinsertCard` to replay the card. Session-complete and all-caught-up screens handle edge states.

**Tech Stack:** TypeScript / Preact signals, `@preact/signals`, Vitest + @testing-library/preact, CSS custom properties

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Modify | `src/types/index.ts` | Add `"critical"` to `SheetTab` union |
| Create | `src/views/drills/CriticalCriteriaDrill.tsx` | Drill component |
| Modify | `src/views/SheetView.tsx` | Wire tab dispatch, enable mode card, add QuickJump label |
| Modify | `css/styles.css` | Drill-specific styles |
| Create | `tests/views/CriticalCriteriaDrill.test.tsx` | Component tests |

---

## Task 1: Add `"critical"` to SheetTab

**Files:**
- Modify: `src/types/index.ts:272-281`

- [ ] **Step 1: Edit the SheetTab union**

In `src/types/index.ts`, find the `SheetTab` type (currently lines 272–281) and add `"critical"`:

```ts
export type SheetTab =
  | "sheet"
  | "notes"
  | "order"
  | "steps"
  | "whatnext"
  | "recall"
  | "script"
  | "mnemonics"
  | "chat"
  | "critical";
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: zero errors (SheetView already passes `tab="sheet"` for the disabled critical row — that will break in Task 3, but is still a `SheetTab` value for now)

---

## Task 2: Create `CriticalCriteriaDrill.tsx`

**Files:**
- Create: `src/views/drills/CriticalCriteriaDrill.tsx`

- [ ] **Step 1: Write the component**

```tsx
import { useState, useEffect } from "preact/hooks";
import { appState, mutateState, save } from "../../store/appStore";
import {
  buildQueue,
  gradeCard,
  reinsertCard,
  SESSION_DAY_MS,
} from "../../lib/criticalSrs";
import type { Sheet, CriticalGrade } from "../../types";

export function CriticalCriteriaDrill({ sheet }: { sheet: Sheet }) {
  const criteriaIds = sheet.criticalCriteria.map((_, i) => String(i));

  const [queue, setQueue] = useState<string[]>(() => {
    const records = appState.value.drills?.critical?.[sheet.id] ?? {};
    return buildQueue(criteriaIds, records);
  });
  const [queueIndex, setQueueIndex] = useState(0);
  const [sessionDone, setSessionDone] = useState(false);

  const records = appState.value.drills?.critical?.[sheet.id] ?? {};
  const knownCold = criteriaIds.filter(
    (id) => records[id]?.grade === "know"
  ).length;

  function grade(g: Exclude<CriticalGrade, null>) {
    const currentId = queue[queueIndex];
    mutateState((draft) => {
      if (!draft.drills.critical[sheet.id]) {
        draft.drills.critical[sheet.id] = {};
      }
      draft.drills.critical[sheet.id][currentId] = gradeCard(
        draft.drills.critical[sheet.id][currentId],
        g
      );
      draft.stats.totalReviews = (draft.stats.totalReviews || 0) + 1;
    });
    save();

    if (g === "know") {
      if (queueIndex + 1 >= queue.length) {
        setSessionDone(true);
      } else {
        setQueueIndex(queueIndex + 1);
      }
    } else {
      const newQueue = reinsertCard(queue, currentId, g, queueIndex);
      setQueue(newQueue);
      setQueueIndex(queueIndex + 1);
    }
  }

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;
      if (e.key === "1") grade("fail");
      else if (e.key === "2") grade("close");
      else if (e.key === "3") grade("know");
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  });

  if (queue.length === 0 && !sessionDone) {
    const minNext = Object.values(records).reduce<number>((min, r) => {
      const t = r.lastSeenAt + SESSION_DAY_MS;
      return t < min ? t : min;
    }, Infinity);
    const hoursUntil =
      minNext === Infinity
        ? null
        : Math.max(1, Math.ceil((minNext - Date.now()) / 3_600_000));
    return (
      <div class="drill-pane">
        <div class="critical-state-screen">
          <div class="critical-state-icon">✓</div>
          <h2 class="critical-state-title">All caught up</h2>
          {hoursUntil !== null && (
            <p class="critical-state-sub">
              Next session available in {hoursUntil} hour
              {hoursUntil !== 1 ? "s" : ""}.
            </p>
          )}
          <button
            class="btn btn-primary"
            onClick={() => {
              setQueue(criteriaIds);
              setQueueIndex(0);
            }}
          >
            Drill all {criteriaIds.length} criteria anyway
          </button>
        </div>
      </div>
    );
  }

  if (sessionDone) {
    const failCount = criteriaIds.filter(
      (id) => records[id]?.grade === "fail"
    ).length;
    const closeCount = criteriaIds.filter(
      (id) => records[id]?.grade === "close"
    ).length;
    return (
      <div class="drill-pane">
        <div class="critical-state-screen">
          <div class="critical-state-icon">🎯</div>
          <h2 class="critical-state-title">Session complete</h2>
          <div class="critical-summary">
            <div class="critical-summary-item critical-summary-know">
              <span class="critical-summary-count">{knownCold}</span> known cold
            </div>
            <div class="critical-summary-item critical-summary-close">
              <span class="critical-summary-count">{closeCount}</span> close calls
            </div>
            <div class="critical-summary-item critical-summary-fail">
              <span class="critical-summary-count">{failCount}</span> would fail
            </div>
          </div>
          <button
            class="btn btn-primary"
            onClick={() => {
              setQueue(criteriaIds);
              setQueueIndex(0);
              setSessionDone(false);
            }}
          >
            Start new session
          </button>
        </div>
      </div>
    );
  }

  const currentId = queue[queueIndex];
  const criterionText = sheet.criticalCriteria[parseInt(currentId)];

  return (
    <div class="drill-pane">
      <div class="drill-header">
        <div class="drill-title-row">
          <h2 class="drill-title">
            {sheet.id.toUpperCase()} — Critical Criteria
          </h2>
          <span class="critical-known-tile">
            {knownCold}/{criteriaIds.length} known cold
          </span>
        </div>
        <div class="critical-progress-bar">
          <div
            class="critical-progress-fill"
            style={{ width: `${Math.round((queueIndex / queue.length) * 100)}%` }}
          />
        </div>
      </div>

      <div class="critical-card">
        <div class="critical-card-text">{criterionText}</div>
        <details class="critical-pearl">
          <summary class="critical-pearl-summary">Why this matters →</summary>
          <p class="critical-pearl-body">Coming soon.</p>
        </details>
      </div>

      <div class="critical-buttons">
        <button class="btn critical-btn critical-btn-fail" onClick={() => grade("fail")}>
          Would fail <kbd>1</kbd>
        </button>
        <button class="btn critical-btn critical-btn-close" onClick={() => grade("close")}>
          Close call <kbd>2</kbd>
        </button>
        <button class="btn critical-btn critical-btn-know" onClick={() => grade("know")}>
          Know it cold <kbd>3</kbd>
        </button>
      </div>

      <div class="critical-mini-list">
        {criteriaIds.map((id) => {
          const g = records[id]?.grade ?? null;
          const isCurrent = id === currentId;
          return (
            <div
              key={id}
              class={[
                "critical-chip",
                g === "fail" ? "critical-chip-fail" : "",
                g === "close" ? "critical-chip-close" : "",
                g === "know" ? "critical-chip-know" : "",
                isCurrent ? "critical-chip-current" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {parseInt(id) + 1}.{" "}
              {sheet.criticalCriteria[parseInt(id)].length > 45
                ? sheet.criticalCriteria[parseInt(id)].slice(0, 45) + "…"
                : sheet.criticalCriteria[parseInt(id)]}
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: zero errors

---

## Task 3: Add CSS for the drill

**Files:**
- Modify: `css/styles.css`

- [ ] **Step 1: Append styles at the end of the file**

Add the following block at the very end of `css/styles.css`:

```css
/* ─── Critical Criteria Drill ──────────────────────────────────────────────── */
.critical-known-tile {
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 10px;
  background: rgba(229, 83, 75, 0.12);
  color: var(--again);
}

.critical-progress-bar {
  height: 4px;
  background: var(--border);
  border-radius: 2px;
  margin-top: 10px;
  overflow: hidden;
}

.critical-progress-fill {
  height: 100%;
  background: var(--again);
  border-radius: 2px;
  transition: width 0.2s ease;
}

.critical-card {
  border-left: 3px solid var(--again);
  border: 1px solid var(--border);
  border-left: 3px solid var(--again);
  border-radius: 8px;
  padding: 20px 20px 16px;
  margin: 20px 0;
  background: var(--bg-elev-1);
}

.critical-card-text {
  font-size: 15px;
  line-height: 1.55;
  color: var(--text);
}

.critical-pearl {
  margin-top: 12px;
}

.critical-pearl-summary {
  font-size: 12px;
  color: var(--text-mute);
  cursor: pointer;
  user-select: none;
}

.critical-pearl-body {
  font-size: 13px;
  color: var(--text-mute);
  margin: 8px 0 0;
  line-height: 1.5;
}

.critical-buttons {
  display: flex;
  gap: 8px;
  margin: 16px 0;
}

.critical-btn {
  flex: 1;
  padding: 10px 8px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  border: 2px solid transparent;
  cursor: pointer;
  transition: opacity 0.15s;
}

.critical-btn kbd {
  font-size: 10px;
  font-weight: 700;
  opacity: 0.7;
  font-family: inherit;
}

.critical-btn-fail {
  background: rgba(229, 83, 75, 0.12);
  color: var(--again);
  border-color: rgba(229, 83, 75, 0.3);
}

.critical-btn-fail:hover { background: rgba(229, 83, 75, 0.2); }

.critical-btn-close {
  background: rgba(210, 153, 34, 0.1);
  color: var(--hard);
  border-color: rgba(210, 153, 34, 0.3);
}

.critical-btn-close:hover { background: rgba(210, 153, 34, 0.18); }

.critical-btn-know {
  background: rgba(46, 160, 67, 0.1);
  color: var(--good);
  border-color: rgba(46, 160, 67, 0.3);
}

.critical-btn-know:hover { background: rgba(46, 160, 67, 0.18); }

.critical-mini-list {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px;
  margin-top: 24px;
}

.critical-chip {
  font-size: 11px;
  padding: 5px 8px;
  border-radius: 5px;
  border: 1px solid var(--border);
  color: var(--text-mute);
  background: var(--bg-elev-1);
  line-height: 1.4;
  transition: border-color 0.15s;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.critical-chip-fail   { border-color: var(--again); color: var(--again); background: rgba(229,83,75,0.06); }
.critical-chip-close  { border-color: var(--hard);  color: var(--hard);  background: rgba(210,153,34,0.06); }
.critical-chip-know   { border-color: var(--good);  color: var(--good);  background: rgba(46,160,67,0.06); }
.critical-chip-current { border-color: var(--accent); color: var(--text); background: rgba(79,158,255,0.08); font-weight: 600; }

.critical-state-screen {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40px 20px;
  gap: 12px;
  text-align: center;
}

.critical-state-icon { font-size: 32px; }
.critical-state-title { font-size: 20px; font-weight: 700; margin: 0; }
.critical-state-sub   { font-size: 13px; color: var(--text-mute); margin: 0; }

.critical-summary {
  display: flex;
  gap: 20px;
  margin: 8px 0 16px;
}

.critical-summary-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  font-size: 12px;
  color: var(--text-mute);
}

.critical-summary-count { font-size: 22px; font-weight: 700; }
.critical-summary-know  .critical-summary-count { color: var(--good); }
.critical-summary-close .critical-summary-count { color: var(--hard); }
.critical-summary-fail  .critical-summary-count { color: var(--again); }
```

---

## Task 4: Wire CriticalCriteriaDrill into SheetView

**Files:**
- Modify: `src/views/SheetView.tsx`

- [ ] **Step 1: Add the import**

At the top of `src/views/SheetView.tsx`, after the existing drill imports (after `import { MnemonicsView } ...`), add:

```ts
import { CriticalCriteriaDrill } from "./drills/CriticalCriteriaDrill";
```

- [ ] **Step 2: Add the critical tab dispatch in `SheetView`**

In the `SheetView` function, find the `if/else` block that dispatches `tabContent`. Add a new branch after `tab === "chat"`:

```ts
else if (tab === "critical") tabContent = <CriticalCriteriaDrill key={`${sheet.id}:critical`} sheet={sheet} />;
```

The full dispatch block should look like:

```ts
let tabContent: JSX.Element | null;
if (tab === "sheet")          tabContent = <ReferenceView sheet={sheet} />;
else if (tab === "notes")     tabContent = <NotesView sheet={sheet} />;
else if (tab === "whatnext")  tabContent = <WhatNextDrill key={`${sheet.id}:whatnext`} sheet={sheet} />;
else if (tab === "recall")    tabContent = <BlankRecallView key={`${sheet.id}:recall`} sheet={sheet} />;
else if (tab === "script")    tabContent = <SpokenScriptView key={`${sheet.id}:script`} sheet={sheet} />;
else if (tab === "order")     tabContent = <SectionOrderDrill key={`${sheet.id}:order`} sheet={sheet} />;
else if (tab === "steps")     tabContent = <StepSeqDrill key={`${sheet.id}:steps`} sheet={sheet} />;
else if (tab === "mnemonics") tabContent = <MnemonicsView key={`${sheet.id}:mnemonics`} sheet={sheet} />;
else if (tab === "chat")      tabContent = <ChatView key={`${sheet.id}:chat`} sheetCtx={sheet} />;
else if (tab === "critical")  tabContent = <CriticalCriteriaDrill key={`${sheet.id}:critical`} sheet={sheet} />;
else tabContent = null;
```

- [ ] **Step 3: Add critical state computation in `ModeBuckets`**

In `ModeBuckets`, after the `ssState`/`ssBadge` block (around line 171), add:

```ts
const critRecs = state.drills?.critical?.[sheet.id] ?? {};
const critKnown = sheet.criticalCriteria.filter(
  (_, i) => critRecs[String(i)]?.grade === "know"
).length;
const critTotal = sheet.criticalCriteria.length;
const critBadge =
  critTotal > 0
    ? critKnown === critTotal
      ? "✓"
      : `${critKnown}/${critTotal}`
    : undefined;
const critState: ModeRowState =
  currentTab === "critical" ? "active"
  : critKnown === critTotal && critTotal > 0 ? "done"
  : critKnown > 0 ? "progress"
  : "empty";
```

- [ ] **Step 4: Enable the Critical Criteria mode card**

Find the `<ModeRow` block for Critical Criteria (currently has `disabled` and `tab="sheet"`). Replace the entire block with:

```tsx
<ModeRow
  label="Critical Criteria"
  desc="Auto-fail behaviors — must be reflexes"
  tab="critical"
  rowState={critState}
  badge={critBadge}
  critical
  sheetId={sheet.id}
/>
```

Also update the `drillActive` check to include `"critical"`:

```ts
const drillActive = ["order", "steps", "whatnext", "critical"].includes(currentTab);
```

- [ ] **Step 5: Add `criticalLabel` helper and QuickJump entry**

In `QuickJump`, add a helper function inside the component (after `stepLabel`):

```ts
function criticalLabel(): string {
  const critRecs = state.drills?.critical?.[sheet.id] ?? {};
  const known = sheet.criticalCriteria.filter(
    (_, i) => critRecs[String(i)]?.grade === "know"
  ).length;
  const total = sheet.criticalCriteria.length;
  if (total === 0) return "Crit";
  if (known === total) return "Crit ✓";
  if (known > 0) return `Crit (${known}/${total})`;
  return "Crit";
}
```

Then add the critical entry to the `tabs` array (after the `steps` entry):

```ts
...(sheet.criticalCriteria.length > 0
  ? [{ id: "critical" as SheetTab, label: criticalLabel() }]
  : []),
```

- [ ] **Step 6: Type-check**

Run: `npx tsc --noEmit`
Expected: zero errors

---

## Task 5: Write tests

**Files:**
- Create: `tests/views/CriticalCriteriaDrill.test.tsx`

- [ ] **Step 1: Write the test file**

```tsx
import { render, screen, fireEvent } from "@testing-library/preact";
import { signal } from "@preact/signals";
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../src/store/appStore", async () => {
  const storage = await import("../../src/lib/storage");
  const { signal: sig } = await import("@preact/signals");
  const appStateSignal = sig(storage.createEmptyState());
  return {
    appState: appStateSignal,
    route: sig({ view: "sheet", sheetId: "e201", tab: "critical" }),
    navigate: vi.fn(),
    save: vi.fn(),
    mutateState: vi.fn((fn: (s: ReturnType<typeof storage.createEmptyState>) => void) => {
      fn(appStateSignal.value);
    }),
    showToast: vi.fn(),
  };
});

import { CriticalCriteriaDrill } from "../../src/views/drills/CriticalCriteriaDrill";
import type { Sheet } from "../../src/types";

const MOCK_SHEET: Sheet = {
  id: "e201",
  title: "Trauma Assessment",
  shortTitle: "Trauma",
  category: "Trauma",
  totalPoints: 48,
  sections: [],
  criticalCriteria: [
    "Failed to take or verbalize body substance isolation precautions",
    "Did not assess for and manage life threats",
    "Did not assess the response to treatments",
  ],
  cards: [],
};

const EMPTY_CC_SHEET: Sheet = {
  ...MOCK_SHEET,
  id: "empty-cc",
  criticalCriteria: [],
};

describe("CriticalCriteriaDrill", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders first criterion on mount", () => {
    render(<CriticalCriteriaDrill sheet={MOCK_SHEET} />);
    expect(screen.getByText(/Failed to take or verbalize body substance isolation/)).toBeTruthy();
  });

  it("shows sheet code in header", () => {
    render(<CriticalCriteriaDrill sheet={MOCK_SHEET} />);
    expect(screen.getByText(/E201 — Critical Criteria/)).toBeTruthy();
  });

  it("shows known cold counter", () => {
    render(<CriticalCriteriaDrill sheet={MOCK_SHEET} />);
    expect(screen.getByText(/0\/3 known cold/)).toBeTruthy();
  });

  it("shows three grade buttons", () => {
    render(<CriticalCriteriaDrill sheet={MOCK_SHEET} />);
    expect(screen.getByText(/Would fail/)).toBeTruthy();
    expect(screen.getByText(/Close call/)).toBeTruthy();
    expect(screen.getByText(/Know it cold/)).toBeTruthy();
  });

  it("shows expandable 'Why this matters' pearl", () => {
    render(<CriticalCriteriaDrill sheet={MOCK_SHEET} />);
    expect(screen.getByText(/Why this matters/)).toBeTruthy();
  });

  it("shows mini-list with all criteria as chips", () => {
    render(<CriticalCriteriaDrill sheet={MOCK_SHEET} />);
    const chips = document.querySelectorAll(".critical-chip");
    expect(chips.length).toBe(3);
  });

  it("shows session-complete screen after grading all criteria as 'know'", () => {
    render(<CriticalCriteriaDrill sheet={MOCK_SHEET} />);
    const knowBtn = screen.getByText(/Know it cold/);
    fireEvent.click(knowBtn);
    fireEvent.click(knowBtn);
    fireEvent.click(knowBtn);
    expect(screen.getByText(/Session complete/)).toBeTruthy();
    expect(screen.getByText(/Start new session/)).toBeTruthy();
  });

  it("shows 'Start new session' button that restarts drill", () => {
    render(<CriticalCriteriaDrill sheet={MOCK_SHEET} />);
    const knowBtn = screen.getByText(/Know it cold/);
    fireEvent.click(knowBtn);
    fireEvent.click(knowBtn);
    fireEvent.click(knowBtn);
    fireEvent.click(screen.getByText(/Start new session/));
    expect(screen.getByText(/Failed to take or verbalize body substance isolation/)).toBeTruthy();
  });

  it("shows all-caught-up screen when buildQueue returns empty", () => {
    // All criteria have been seen within 24h
    const { appState } = require("../../src/store/appStore");
    const now = Date.now();
    appState.value.drills.critical["e201"] = {
      "0": { grade: "know", lastSeenAt: now, streakKnown: 1, attempts: 1 },
      "1": { grade: "know", lastSeenAt: now, streakKnown: 1, attempts: 1 },
      "2": { grade: "know", lastSeenAt: now, streakKnown: 1, attempts: 1 },
    };
    render(<CriticalCriteriaDrill sheet={MOCK_SHEET} />);
    expect(screen.getByText(/All caught up/)).toBeTruthy();
    expect(screen.getByText(/Drill all 3 criteria anyway/)).toBeTruthy();
  });

  it("keyboard key '3' grades as know", () => {
    render(<CriticalCriteriaDrill sheet={MOCK_SHEET} />);
    const { save } = require("../../src/store/appStore");
    fireEvent.keyDown(document, { key: "3" });
    expect(save).toHaveBeenCalled();
  });

  it("keyboard key '1' grades as fail and reinsertes card", () => {
    render(<CriticalCriteriaDrill sheet={MOCK_SHEET} />);
    const { save } = require("../../src/store/appStore");
    fireEvent.keyDown(document, { key: "1" });
    expect(save).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run tests**

Run: `npm test -- tests/views/CriticalCriteriaDrill.test.tsx`
Expected: all tests pass

---

## Task 6: Run full suite and commit

- [ ] **Step 1: Run full test suite**

Run: `npm test`
Expected: all tests pass, coverage thresholds not regressed

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: zero errors

- [ ] **Step 3: Commit**

```bash
git add src/types/index.ts src/views/drills/CriticalCriteriaDrill.tsx \
        src/views/SheetView.tsx css/styles.css \
        tests/views/CriticalCriteriaDrill.test.tsx
git commit -m "$(cat <<'EOF'
feat(drill): build CriticalCriteriaDrill view and wire into SheetView

- New CriticalCriteriaDrill: index-keyed criteria, buildQueue/gradeCard/
  reinsertCard from criticalSrs.ts, keyboard 1/2/3 shortcuts
- Session-complete and all-caught-up screens
- Expandable 'Why this matters' pearl (UI shell; content pending T-018)
- SheetView: add 'critical' SheetTab, enable mode card, QuickJump label

Closes #53
EOF
)"
```

---

## Self-Review

**Spec coverage:**
- [x] One criterion shown at a time — `queue[queueIndex]`
- [x] Keyboard 1/2/3 grade and advance — `useEffect` handler
- [x] Mini-list updates in real-time — reads `records` from `appState.value` each render
- [x] Session-complete state shows summary + "next session" button — Task 2 `sessionDone` branch
- [x] `SheetTab` includes `"critical"` — Task 1
- [x] Mode card enabled and wired — Task 4 Step 4
- [x] QuickJump shows progress label — Task 4 Step 5
- [x] `totalReviews` incremented per grade — in `grade()` function

**Placeholder scan:** No TBDs. "Coming soon." in pearl body is intentional per spec (T-018 will populate).

**Type consistency:**
- `CriticalGrade` imported from `../../types` in component and used as `Exclude<CriticalGrade, null>` in `grade()` — matches `gradeCard` signature in `criticalSrs.ts`
- `CriticalRecord` not directly referenced in component (only used via `records[id]?.grade`) — consistent
- `drills.critical[sheet.id]` initialised as `{}` if missing — matches `Drills.critical: Record<string, Record<string, CriticalRecord>>`
