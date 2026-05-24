# T-019 — Achievement: Auto-Fail Auditor

**Issue:** #55 (T-019 Achievement: "Auto-Fail Auditor" — master all critical criteria)
**Date:** 2026-05-23
**Status:** Approved

## Summary

Add one achievement to `src/lib/achievements.ts` that unlocks when a user has graded every critical criterion "know cold" on at least one sheet. Unlock condition: any single sheet.

## Achievement Definition

| Field | Value |
|-------|-------|
| ID | `auto_fail_auditor` |
| Name | Auto-Fail Auditor |
| Description | Know all critical criteria cold on at least one sheet |
| Icon | 🚨 |

## Check Logic

```ts
check: (s) =>
  NREMT_DATA.sheets.some(sheet => {
    if (!sheet.criticalCriteria?.length) return false;
    const records = s.drills?.critical?.[sheet.id] ?? {};
    return sheet.criticalCriteria.every((_, i) => records[String(i)]?.grade === 'know');
  })
```

Criterion IDs are string indices `"0"`, `"1"`, … matching `CriticalCriteriaDrill`'s convention. A sheet qualifies only if it has criticalCriteria AND every criterion has been graded `'know'` at least once. Sheets with no criticalCriteria are skipped.

## Placement in DEFS

Insert after `all_drills_three_sheets` (the last multi-sheet mastery achievement), before `thousand_reviews`.

## Tests

- `check` returns `false` when no critical drills attempted
- `check` returns `false` when some criteria are `'know'` but at least one is `'fail'` or `null`
- `check` returns `true` when all criteria for one sheet are `'know'`
- `getAll` includes `auto_fail_auditor` in returned list

## Files

| Action | Path |
|--------|------|
| Modify | `src/lib/achievements.ts` — add achievement def |
| Modify | `tests/achievements.test.ts` — add test cases |

## Acceptance Criteria

- [ ] `npm test` green — new test cases pass
- [ ] `npx tsc --noEmit` clean
- [ ] Achievement visible in StatsView after unlock
- [ ] Does not unlock prematurely (requires ALL criteria on at least one sheet)
