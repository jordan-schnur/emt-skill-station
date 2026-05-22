# Single-Card Quiz (Practice a Specific Card)

**Date:** 2026-05-21
**Status:** Approved

## Problem

The quiz mode always runs through all due/fresh cards in sequence. There is no way to practice a specific acronym on demand — useful when a user wants to drill one card they just looked at or know they're weak on.

## Goals

1. Add a "Practice" entry point to each browse card (header icon + body button).
2. When launched from a card, quiz that card only and return to browse when done.
3. No new state management — reuse the existing `QuizMode` / `PerLetterQuiz` / SRS grading pipeline.

## Non-Goals

- Multi-card selection / custom decks — future ticket.
- Changing the full-queue quiz behavior in any way.

## Routing

### `src/types/index.ts`
Add optional field to `Route`:
```ts
mnemonicsCardId?: string;
```

### `src/router/hashRouter.ts`
Parse `parts[2]` as `mnemonicsCardId`:
```
#mnemonics/quiz/sample  →  { view: "mnemonics", mnemonicsTab: "quiz", mnemonicsCardId: "sample" }
#mnemonics/quiz         →  { view: "mnemonics", mnemonicsTab: "quiz" }           // unchanged
```

### `src/store/appStore.ts`
Extend the hash builder: when `mnemonicsCardId` is set, emit `mnemonics/quiz/<id>`.

## Entry Points

Both live in `EmsCard` in `EmsMnemonicsView.tsx`. Both call:
```ts
navigate({ view: "mnemonics", mnemonicsTab: "quiz", mnemonicsCardId: mnemonic.id })
```

**Header icon (always visible):**  
A small `▶` `<button>` at the far right of `.ems-card-header`, before the expand chevron. Must call `e.stopPropagation()` to prevent toggling expand/collapse.

**Body button (expanded only):**  
A full-width "Practice this card" button rendered at the bottom of `.ems-card-body`, above the sources line.

## Quiz Behavior

`QuizMode` reads `route.value.mnemonicsCardId` on mount.

**When set:**
- Build `initialQueue` as a single-item array: the matching `ClinicalMnemonic` + its SRS record (or `defaultRecord()` if unseen).
- All `applyGrade` logic is unchanged — "Again" still appends to the queue so the user can retry.
- Done/empty terminal state message changes to: **"Done!"** with a single `← Back to mnemonics` button navigating to `{ view: "mnemonics", mnemonicsTab: "browse" }`.

**When not set (normal full-queue mode):**
- Behavior unchanged.

## Files Changed

- `src/types/index.ts` — add `mnemonicsCardId?: string` to `Route`
- `src/router/hashRouter.ts` — parse `parts[2]` into `mnemonicsCardId`
- `src/store/appStore.ts` — extend hash builder for `mnemonicsCardId`
- `src/views/EmsMnemonicsView.tsx` — add header icon + body button to `EmsCard`; add single-card queue branch to `QuizMode`

## Testing

- Unit: none needed (pure routing string manipulation, covered by E2E)
- E2E:
  - Clicking the `▶` header icon navigates to `#mnemonics/quiz/<id>`
  - Clicking "Practice this card" (expanded body) navigates to `#mnemonics/quiz/<id>`
  - Quiz shows only that card; counter reads "1 card remaining"
  - After grading, terminal state shows "Done!" (not "Session complete!")
  - "Back to mnemonics" button returns to `#mnemonics`
  - Full-queue quiz (no card ID in URL) is unaffected
