# T-003 — Today Dashboard Completion

**Issue:** #39 (T-003 Convert HomeView into Today dashboard)
**Date:** 2026-05-23
**Status:** Approved

## Context

HomeView already renders a `TodayHero` component with the correct visual layout (date eyebrow, headline, mastery ring, week sparkline, "Start now" / "Browse sheets" buttons). What is missing per the 2026-05-21-today-hero-panel-design.md spec:

1. `Stats.dailyReviewLog` not typed (accessed via unsafe cast)
2. `updateDailyLog()` not wired into `save()`
3. Inline `suggestNextModeForSheet` and week-bar logic not extracted into a testable library
4. Critical alert strip absent from HomeView
5. No unit tests for the helper logic

## Approach

**Extract + complete (Option A):** pull inline logic into `src/lib/todayContext.ts` as pure functions, fix the type, wire the daily log, add the critical strip, write tests. HomeView stays visually identical.

## Data Model

### `src/types/index.ts` — `Stats` interface

Add optional field:

```ts
dailyReviewLog?: Record<string, number>; // YYYY-MM-DD → review count for that day
```

### `src/store/appStore.ts` — `updateDailyLog`

New helper called inside `save()` after `updateStreak()`:

```ts
function updateDailyLog(state: AppState): void {
  const today = new Date().toISOString().slice(0, 10);
  if (!state.stats.dailyReviewLog) state.stats.dailyReviewLog = {};
  state.stats.dailyReviewLog[today] = (state.stats.dailyReviewLog[today] ?? 0) + 1;
}
```

## New Library: `src/lib/todayContext.ts`

Three pure exported functions — no Preact dependency, fully unit-testable.

### `suggestNextMode(state: AppState, sheet: Sheet): { tab: SheetTab; label: string }`

Priority order (same as current inline logic in HomeView):
1. `order` if section order not mastered and sheet has >1 section
2. `steps` if any drillable section's step sequence not mastered
3. `whatnext` if What's Next? not mastered
4. `recall` if blank recall `bestPct < 90`
5. `script` if spoken script not mastered
6. `sheet` / "Full sheet review" — fallback

### `computeTodayContext(state: AppState, sheets: Sheet[])`

Returns:
```ts
{
  overallMasteryPct: number;       // average sheetMasteryPct, rounded
  sheetsAbove80: number;           // count where mastery >= 80%
  lowestMasterySheet: Sheet;       // sheet with lowest mastery (first suggestion target)
  criticalAlertSheets: Sheet[];    // sheets where criticalCriteria.length > 0 AND mastery < 50%
  totalSheetsToMaster: number;     // count where mastery < 100%
}
```

### `reviewsThisWeek(log: Record<string, number> | undefined): number[]`

Returns array of 7 numbers, oldest-first, today last. Zero-fills missing days.

## UI: `src/views/HomeView.tsx`

### Changes
- Remove inline `suggestNextModeForSheet` — replace with `suggestNextMode` from `todayContext.ts`
- Remove inline week-bar computation — replace with `reviewsThisWeek` from `todayContext.ts`
- Remove unsafe `(state.stats as unknown as ...)` cast for `dailyReviewLog`
- Add critical alert strip inside `TodayHero`, conditionally rendered:

```tsx
{criticalAlertSheets.length > 0 && (
  <div class="today-critical">
    ⚠ {criticalAlertSheets.length} sheet{criticalAlertSheets.length > 1 ? "s" : ""} have critical criteria not yet mastered.
    <button
      class="btn btn-ghost btn-sm"
      onClick={() => navigate({ view: "sheet", sheetId: criticalAlertSheets[0].id, tab: "critical" })}
    >
      Drill now
    </button>
  </div>
)}
```

Critical strip is **conditionally rendered** (absent from DOM, not `display:none`) when count is 0.

## Tests

### `tests/todayContext.test.ts` (new)
- `suggestNextMode` returns `order` when section order not mastered on multi-section sheet
- `suggestNextMode` returns `steps` when order mastered but a section's steps not mastered
- `suggestNextMode` returns `recall` when order + steps + whatnext all mastered
- `suggestNextMode` returns `sheet` fallback when everything mastered
- `computeTodayContext` returns correct `sheetsAbove80`, `overallMasteryPct`, `criticalAlertSheets`
- `reviewsThisWeek` zero-fills missing days; returns exactly 7 entries; today is last

### `tests/HomeView.test.tsx` (new or update)
- Renders TodayHero with correct headline for pristine state
- Critical alert strip absent when no sheets have low-mastery criticalCriteria
- Critical alert strip present when a sheet has criticalCriteria and mastery < 50%
- "Start now" button calls navigate with correct sheet + tab

## Files

| Action | Path |
|--------|------|
| Modify | `src/types/index.ts` — add `dailyReviewLog?` to Stats |
| Modify | `src/store/appStore.ts` — add `updateDailyLog`, call in `save()` |
| Create | `src/lib/todayContext.ts` |
| Modify | `src/views/HomeView.tsx` — use todayContext helpers, add critical strip |
| Create | `tests/todayContext.test.ts` |
| Create or modify | `tests/HomeView.test.tsx` |

## Acceptance Criteria

- [ ] `npx tsc --noEmit` passes — no unsafe cast for `dailyReviewLog`
- [ ] `npm test` green — todayContext tests and HomeView tests pass
- [ ] After any drill submission, today's bar in sparkline grows (dailyReviewLog incremented)
- [ ] Critical strip absent from DOM when no low-mastery critical-criteria sheets
- [ ] Critical strip appears for a sheet with `criticalCriteria.length > 0` and mastery < 50%
- [ ] "Drill now" in critical strip navigates to that sheet's `critical` tab
- [ ] Visually identical to pre-change HomeView (no regression)
