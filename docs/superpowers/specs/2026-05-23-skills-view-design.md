# T-002: SkillsView — Design Spec

**Date:** 2026-05-23  
**Issue:** T-002 / #38  
**Status:** Approved

## Goal

Extract the sheet grid out of `HomeView` into a dedicated `SkillsView` at route `/skills`. This is a prerequisite for T-003 (Today dashboard) and T-008 (top nav rebuild).

## Approach

Straight move (Option A): move `SheetCard`, `DrillBadge`, `CATEGORY_ORDER`, and the sort+grid rendering into a new `SkillsView.tsx`. `HomeView` keeps only `MasteryRing` and `TodayHero`.

## Files Changed

| File | Change |
|------|--------|
| `src/views/SkillsView.tsx` | **New.** Contains `DrillBadge`, `SheetCard`, `CATEGORY_ORDER`, and `SkillsView`. |
| `src/views/HomeView.tsx` | Remove grid, `DrillBadge`, `SheetCard`, `CATEGORY_ORDER`. "Browse sheets" button navigates to `skills` route. |
| `src/types/index.ts` | Add `"skills"` to `RouteView`. |
| `src/router/router.ts` | Add `"skills"` to simple-view list in `parseParts`. |
| `src/App.tsx` | Import `SkillsView`; add `skills: () => <SkillsView />` to `VIEWS`. |

## Component Ownership After Move

- `MasteryRing` — stays in `HomeView.tsx`, exported for `SheetView.tsx` (no import change there).
- `DrillBadge` — moves to `SkillsView.tsx`.
- `SheetCard` — moves to `SkillsView.tsx`.
- `CATEGORY_ORDER` — moves to `SkillsView.tsx`.

## Routing

- URL: `/skills`
- `parseParts`: add `"skills"` to the simple-view string array.
- `writePath`: no change needed — the `else if (r.view !== "home")` branch already handles it.

## Behaviour

- `SkillsView` renders the same sort toggle (`"nremt.home.sort"` localStorage key, unchanged) and category-grouped or flat grid that currently lives in `HomeView`.
- `HomeView.TodayHero` "Browse sheets" button changes from smooth-scroll to `navigate({ view: "skills" })`.
- No top-nav change — deferred to T-008.

## Testing

- Update any existing `HomeView` tests that render `SheetCard` or the grid (they move to a `SkillsView` test).
- Add smoke test: `SkillsView` renders sheet cards without crashing.
- Run `npm test` + `npx tsc --noEmit` + `npm run test:e2e:browser`.
