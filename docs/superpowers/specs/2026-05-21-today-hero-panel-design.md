# Today Hero Panel — Design Spec

**Issue:** #9 — Home: "Today" hero panel
**Date:** 2026-05-21
**Status:** Approved

## Summary

Replace the `<h1>` + subtitle + roadmap block at the top of `HomeView` with a two-column "Today" hero card that shows the user's overall progress and a personalized next-action suggestion. The roadmap block is removed entirely.

## Data Model Changes

### `src/types/index.ts` — `Stats` interface

Add an optional `dailyReviewLog` field:

```ts
export interface Stats {
  totalReviews: number;
  lastReviewedAt: string | null;
  dailyStreak: number;
  longestStreak: number;
  lastStreakDay: string | null;
  dailyReviewLog?: Record<string, number>; // YYYY-MM-DD → review count
}
```

The `?` makes it backward-compatible with existing localStorage state (old entries simply have no log).

### `src/store/appStore.ts` — `save()`

Inside `save()`, after `updateStreak(state)`, add a call to `updateDailyLog(state)`. This helper increments `state.stats.dailyReviewLog[today]` by 1 on every save (every drill submission).

## New Library: `src/lib/todayContext.ts`

Three pure, exported functions — all unit-testable with no Preact dependency.

### `computeTodayContext(state: AppState, sheets: Sheet[])`

Returns:
```ts
{
  totalSheetsToMaster: number,   // sheets where sheetMasteryPct < 100
  lowestMasterySheet: Sheet | null,
  criticalAlertSheets: Sheet[],  // criticalCriteria.length > 0 AND mastery < 50%
  overallMasteryPct: number,     // average sheetMasteryPct across all sheets (rounded)
  sheetsAbove80: number,         // count of sheets with mastery >= 80%
}
```

- "All caught up" state: `totalSheetsToMaster === 0`
- `lowestMasterySheet` is the sheet with the lowest `sheetMasteryPct`, used for the hero suggestion and "Free study" button

### `suggestNextMode(state: AppState, sheet: Sheet)`

Returns `{ tab: string; label: string }` — the first incomplete drill in this priority order:

1. `order` — if section order not mastered (skip for sheets with only 1 section)
2. `steps` — if any section's step sequence not mastered
3. `whatnext` — if What's Next? not mastered
4. `recall` — if blank recall bestPct < 90%
5. `script` — if spoken script not mastered
6. `sheet` / "Full sheet review" — fallback when all drills complete

### `reviewsThisWeek(log: Record<string, number> | undefined)`

Returns a `number[]` of length 7 — oldest-first, today last. Pulls from `dailyReviewLog`, zero-filling any missing days. Used for the sparkline.

## UI Changes: `src/views/HomeView.tsx`

### Removed
- `<h1>NREMT Skill Sheet Trainer</h1>`
- `<p class="subtitle">…</p>` + `HelpIcon`
- `<div class="roadmap">…</div>`

### Added: `TodayRow` component (rendered inside `HomeView`)

```
<div class="today-row">
  <TodayHeroCard context={ctx} suggestion={suggestion} />
  <TodayStatsColumn overallPct={ctx.overallMasteryPct} sheetsAbove80={ctx.sheetsAbove80} reviews={reviews} />
</div>
```

### `TodayHeroCard`

```
<div class="today-card">
  <div class="today-eyebrow">{weekdayName}, {monthName} {day}</div>
  <div class="today-headline">
    {totalSheetsToMaster > 0
      ? `You have ${totalSheetsToMaster} sheet${…} to master.`
      : "All caught up — keep the streak going."}
  </div>
  <div class="today-suggestion">
    Start with <strong>{sheet.shortTitle}</strong> — {suggestion.label}.
  </div>
  <div class="today-actions">
    <button onClick={→ navigate sheet + suggestion.tab}>▶ Start now</button>
    <button onClick={→ navigate sheet + "sheet"}>Free study</button>
  </div>
  {criticalAlertSheets.length > 0 && (
    <div class="today-critical">
      ⚠ {criticalAlertSheets.length} sheet(s) have critical criteria not yet mastered.
      <button onClick={→ navigate criticalAlertSheets[0] + "recall"}>Drill now</button>
    </div>
  )}
</div>
```

Critical strip is **conditionally rendered** (not hidden) — absent from DOM when count is 0.

### `TodayStatsColumn`

Two stat cards stacked vertically:

1. **Mastery ring card**: `<MasteryRing pct={overallPct} size={64} stroke={6} />`, label "Overall mastery", subtitle "{sheetsAbove80} of {total} sheets ≥ 80%"
2. **Week sparkline card**: `<WeekSparkline reviews={reviews} />`, subtitle "{totalThisWeek} reviews this week"

### `MasteryRing` update

Add optional `size` and `stroke` props (default to current 52 / 5) so the stats column can render a larger 64px ring.

### `WeekSparkline` component

Small inline component — 7 flex bars. Today's bar (last) uses `--accent`; others use `--bg-elev-2`. Bar height is proportional to count (min 2px so zero-days show a baseline). Rendered in the stats column only.

## CSS additions (`css/styles.css`)

```css
/* -- today hero row ---------------------------------------- */
.today-row { display: grid; grid-template-columns: 1.6fr 1fr; gap: 16px; margin-bottom: 24px; }
@media (max-width: 768px) { .today-row { grid-template-columns: 1fr; } }

.today-card {
  background: linear-gradient(135deg, var(--bg-elev), var(--bg-elev-2));
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 20px 24px;
  position: relative;
  overflow: hidden;
}
.today-card::after {
  content: ""; position: absolute; top: -40px; right: -40px;
  width: 160px; height: 160px;
  background: radial-gradient(circle, var(--accent) 0%, transparent 70%);
  opacity: 0.07; pointer-events: none;
}

.today-eyebrow { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: var(--text-mute); margin-bottom: 8px; }
.today-headline { font-size: 18px; font-weight: 600; color: var(--text); margin-bottom: 6px; }
.today-suggestion { font-size: 14px; color: var(--text-dim); margin-bottom: 16px; }
.today-actions { display: flex; gap: 8px; flex-wrap: wrap; }

.today-critical {
  margin-top: 14px; padding: 10px 14px;
  background: rgba(229, 83, 75, 0.12);
  border: 1px solid rgba(229, 83, 75, 0.3);
  border-radius: var(--radius-sm);
  display: flex; align-items: center; gap: 10px;
  font-size: 13px; color: var(--again);
}

.today-stats { display: flex; flex-direction: column; gap: 12px; }
.today-stats-card {
  background: var(--bg-elev); border: 1px solid var(--border);
  border-radius: var(--radius); padding: 16px;
  display: flex; flex-direction: column; align-items: center; gap: 6px;
  text-align: center;
}

.today-week-bars { display: flex; align-items: flex-end; gap: 4px; height: 40px; }
.today-week-bars .bar { flex: 1; min-height: 2px; border-radius: 3px 3px 0 0; background: var(--bg-elev-2); transition: height 0.2s; }
.today-week-bars .bar.today { background: var(--accent); }
```

## Acceptance Criteria

- [ ] Pristine state: headline reads "You have 10 sheets to master." with suggestion pointing to first sheet
- [ ] All sheets mastered: headline reads "All caught up — keep the streak going."
- [ ] After a drill submission: today's bar in sparkline appears/grows; `totalReviews` increments
- [ ] No critical sheets with low mastery: critical strip is absent from DOM (not `display:none`)
- [ ] Critical strip appears when a sheet has `criticalCriteria.length > 0` AND mastery < 50%
- [ ] Roadmap block no longer rendered anywhere in Home
- [ ] Responsive: stacks to single column on ≤768px
- [ ] `MasteryRing` renders at 64px in stats column, 52px in sheet cards (no visual regression)

## Files Changed

| File | Change |
|------|--------|
| `src/types/index.ts` | Add `dailyReviewLog?` to `Stats` |
| `src/store/appStore.ts` | Add `updateDailyLog()` helper, call in `save()` |
| `src/lib/todayContext.ts` | New file — 3 pure helper functions |
| `src/views/HomeView.tsx` | Replace header+roadmap with `TodayRow`; add `WeekSparkline`, update `MasteryRing` |
| `css/styles.css` | Append today-hero CSS |
| `tests/todayContext.test.ts` | New test file for the 3 helpers |
| `tests/HomeView.test.tsx` | Add/update component tests |
