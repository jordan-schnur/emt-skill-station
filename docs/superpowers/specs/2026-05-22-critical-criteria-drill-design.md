# T-017 — CriticalCriteriaDrill Design

**Tickets:** #53 (T-017 Build CriticalCriteriaDrill view), #48 (T-012 wire into SheetView)
**Depends on:** T-016 (drills.critical state, criticalSrs library) — already landed on phase1-schema-foundations

---

## Data Model

Criterion IDs are string indices `"0"`, `"1"`, … into `sheet.criticalCriteria`. Keyed as `drills.critical[sheetId]["0"]`, etc. Stable because `criticalCriteria` order is fixed in data.json from the PDF.

`CriticalRecord` (from types/index.ts): `{ grade, lastSeenAt, streakKnown, attempts }`

---

## Session Flow

1. On mount: `criteriaIds = sheet.criticalCriteria.map((_, i) => String(i))`
2. `queue = buildQueue(criteriaIds, drills.critical[sheetId] ?? {})` from criticalSrs.ts
3. If `queue.length === 0`: render "All caught up" screen (nothing due today)
4. Show criterion at `queue[queueIndex]`
5. User grades (keyboard 1/2/3 or button click):
   - `gradeCard(existingRecord, grade)` → write to `drills.critical[sheetId][id]` via `mutateState` + `save()`
   - `know` → increment `queueIndex`
   - `fail | close` → `reinsertCard(queue, id, grade, queueIndex)` → replace queue; increment `queueIndex`
6. `queueIndex >= queue.length` → session-complete screen
7. `stats.totalReviews` incremented per grade (counts toward achievements)

---

## UI Layout

### Header
- Sheet code (e.g. "E201") + "— Critical Criteria"
- "N known cold / M total" tile (N = criteria with `grade === 'know'` in persistent records, M = `criticalCriteria.length`)

### Progress Bar
- `queueIndex / queue.length`, full width, red fill

### Criterion Card
- Red left-border (3px, `var(--again)`), 1px outline
- Large criterion text (body copy size, not heading)
- Expandable "Why this matters →" section: `<details><summary>Why this matters →</summary><p>{pearl text || "Coming soon."}</p></details>`
- Pearl text lives on the criterion object — initially empty; T-018 populates it

### Action Buttons
- `Would fail` — red, keyboard `1`
- `Close call` — amber, keyboard `2`
- `Know it cold` — green, keyboard `3`
- Buttons disabled while session-complete screen is shown

### Mini-list
- All criteria as small 2-column grid of chips at page bottom
- Color by persisted grade: null=gray, fail=red (`var(--again)`), close=amber, know=green
- Current item highlighted with blue outline

### Session-Complete Screen
Replaces card + buttons:
- "Session complete" heading
- Summary: counts for each grade bucket
- "Start new session" button — resets `queueIndex` to 0 and rebuilds queue from scratch (not from buildQueue — forces all criteria, so user can re-drill)

### All Caught Up Screen (empty queue on mount)
- "All caught up" heading
- "Next session available in X hours" (time until earliest `lastSeenAt + SESSION_DAY_MS`)
- "Drill all N criteria anyway" button — bypasses buildQueue, queues all indices

---

## SheetView Wiring

- Add `"critical"` to `SheetTab` union in `src/types/index.ts`
- `SheetView.tsx`: add `tab === "critical"` branch dispatching `<CriticalCriteriaDrill sheet={sheet} />`
- Enable the mode card: remove `disabled`, change `tab="sheet"` → `tab="critical"`
- QuickJump: add `{ id: "critical", label: criticalLabel() }` where `criticalLabel()` returns e.g. `"Crit (2/4)"` or `"Crit ✓"` (all known cold)

---

## Files

| Action | Path |
|--------|------|
| Create | `src/views/drills/CriticalCriteriaDrill.tsx` |
| Create | `tests/views/CriticalCriteriaDrill.test.tsx` |
| Modify | `src/types/index.ts` — add `"critical"` to SheetTab |
| Modify | `src/views/SheetView.tsx` — wire tab + enable mode card + QuickJump label |
| Modify | `css/styles.css` — drill-specific styles |

---

## Tests

- Render with a sheet that has criticalCriteria → shows first criterion
- Keyboard `1` grades fail → reinserts card, increments totalReviews
- Keyboard `3` grades know → advances index; when all done, shows session-complete
- "Start new session" resets and shows first criterion again
- Empty queue on mount → shows "All caught up"
- SheetTab type includes `"critical"` (type-level, enforced by tsc)
