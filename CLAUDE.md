# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev                     # Vite dev server (hot reload, primary development mode)
npm run build                   # Production build → dist/
npm run preview                 # Preview production build locally
npm test                        # Vitest unit tests with coverage (watch: npm run test:watch)
npm run test:ci                 # Full pipeline: Vitest + Playwright
npm run test:e2e:browser        # Playwright E2E tests only (requires browsers installed)
npm run test:playwright:install # One-time browser install (needs internet)
npm run serve                   # python3 -m http.server 8000 (legacy path, still works)
npx tsc --noEmit                # Type-check without building
python3 preprocess.py           # Regenerate data.json and js/data.js from PDFs
```

## Architecture

The app uses **Preact + Vite + TypeScript**. Source lives in `src/`; the legacy `js/` files still exist for the data pipeline output but are no longer the primary runtime.

**Data pipeline:** `preprocess.py` reads the 10 NREMT PDF skill sheets using `pdfplumber` and writes `data.json` + `js/data.js`. The canonical step list lives in `preprocess.py` as `SHEETS = [...]` — edit there, re-run the script, reload the browser. Card IDs: `<sheetId>::<sectionSlug>::<stepIndex>`. Total ~172 cards across 10 sheets.

**Entry point:** `src/main.tsx` → `src/App.tsx`. Vite builds everything into `dist/`.

**State management:** `@preact/signals` — global state lives in `src/store/appStore.ts`.
- `appState` signal holds the full `AppState` (loaded from localStorage on boot)
- `route` signal holds the current `Route`
- `mutateState(fn)` — clones state, calls `fn(draft)`, writes the signal. Must be followed by `save()`.
- `save()` — persists to localStorage, runs achievement checks, triggers cloud sync
- `navigate(route)` — updates the `route` signal and syncs the URL hash
- Never write `appState.value = ...` directly outside the store

**Routing:** Hash-based via `src/router/hashRouter.ts`. Routes: `#sheet/<sheetId>/<tab>`, `#stats`, `#settings`, `#guide`, `#chat[/<chatId>]`, `#mnemonics[/quiz]`, `#medconditions[/<tab>]`. Use `navigate()` from `appStore.ts` — never manipulate `window.location.hash` directly.

**Views:** Preact components in `src/views/`. `App.tsx` dispatches on `route.value.view` via the `VIEWS` map. To add a new top-level view: create `src/views/MyView.tsx` and add it to `VIEWS` in `App.tsx`.

**Drill views** live in `src/views/drills/` and receive the current `Sheet` as a prop from `SheetView.tsx`.

**Shared UI:** `src/components/ui/` — `Modal`, `Toast`, `HelpIcon`, `DraggableList`, `MarkdownEditor`, `UpdateBanner`. Modal and Toast are rendered once in `App.tsx` and driven by signals (`openHelpModal`, `openConfirmModal` from `Modal.tsx`).

**`dangerouslySetInnerHTML`:** Used only in `Modal.tsx` for help-modal `bodyHTML`. All callers pass developer-authored literal strings — no user input flows into it.

**Cloud sync:** Optional Firestore (`src/lib/firebase.ts`). On sign-in, compares `updatedAt` timestamps and takes the newer version. AI chat API keys are never synced.

## App State

Lives in `localStorage` under `"nremt.state.v1"`. Types in `src/types/index.ts`.

```ts
{
  version: 1,
  srs:    {},                  // legacy; kept for compat — do not add new features here
  notes:  { step: { "<cardId>": "text" }, sheet: { "<sheetId>": "text" } },
  stats:  { totalReviews, lastReviewedAt, dailyStreak, longestStreak, lastStreakDay },
  drills: {
    secorder:    { "<sheetId>": { mastered, streak, attempts } },
    stepseq:     { "<sheetId>": { "<sectionName>": { mastered, streak, attempts } } },
    whatnext:    { "<sheetId>": { mastered, streak, attempts } },
    blankrecall: { "<sheetId>": { attempts, lastAttemptAt, lastScore: { matched, missed, total, pct }, bestPct } },
    spokenscript:{ "<sheetId>": { mastered, streak, attempts, lastScore: { correct, total, pct } } },
  },
  achievements: { "<id>": timestampMs },
  mnemonics:    { "<sheetId>": { sections: "...", steps: { "<sectionName>": "..." } } },
  chats:        { "<chatId>": { id, title, mode, sheetId, messages } },
  emsSrs:       { "<cardId>": SRSRecord },
  medcondSrs:   { "<cardId>": SRSRecord },
}
```

`stats.totalReviews` is incremented on every drill submission (all 5 drill types). Drives engagement achievements.

## Study Modes (Per-Sheet Tabs in `src/views/drills/`)

| Tab | File | Description |
|-----|------|-------------|
| `sheet` | `ReferenceView.tsx` | Read-only full sheet with collapsible sections and inline note editing |
| `notes` | `NotesView.tsx` | Per-sheet markdown note + all step notes for this sheet |
| `order` | `SectionOrderDrill.tsx` | Drag header sections into correct exam order; mastery = 3 consecutive correct |
| `steps` | `StepSeqDrill.tsx` | Pick a section, drag its steps into order; mastered per-section; tab shows `M/N` |
| `whatnext` | `WhatNextDrill.tsx` | 4-choice: pick the step that comes next; mastery = 3 consecutive correct |
| `recall` | `BlankRecallView.tsx` | Type every step from memory; Jaccard fuzzy match (threshold 0.45); tracks `bestPct` |
| `script` | `SpokenScriptView.tsx` | Type what you'd say aloud; ≥80% on 3 runs = mastered |
| `mnemonics` | `MnemonicsView.tsx` | AI-generated section/step mnemonics; user-editable |
| `chat` | `ChatView.tsx` | Q&A or Examiner role-play via AI API |

**Key constants** (all in `src/lib/drillHelpers.ts` and drill view files):
- `MASTERY_RUNS = 3` — consecutive correct runs required for secorder / stepseq / whatnext / spokenscript mastery
- `SPOKENSCRIPT_PASS_RATE = 0.8` — minimum score per run for spoken script mastery
- Blank recall fuzzy match threshold: `0.45` (Jaccard similarity)

## Global Views (`src/views/`)

| Route | File | Description |
|-------|------|-------------|
| `#` / `#home` | `HomeView.tsx` | Sheet grid with mastery badges |
| `#stats` | `StatsView.tsx` | Streak, achievements, per-sheet drill summary |
| `#settings` | `SettingsView.tsx` | Cloud sync, JSON export/import, AI API config |
| `#guide` | `GuideView.tsx` | Tutorial for every study mode |
| `#mnemonics` | `EmsMnemonicsView.tsx` | EMS clinical acronyms (OPQRST, SAMPLE, etc.) with browse + quiz modes |
| `#medconditions` | `MedConditionsView.tsx` | Medical conditions reference + quiz |

## Achievements (`src/lib/achievements.ts`)

`check(state)` runs automatically inside `save()` — never call it manually. Returns newly unlocked achievements; each triggers an achievement toast.

| ID | Name | Trigger |
|----|------|---------|
| `first_review` | First Responder | `totalReviews >= 1` |
| `ten_reviews` | Getting Started | `totalReviews >= 10` |
| `fifty_reviews` | Building Momentum | `totalReviews >= 50` |
| `hundred_reviews` | Dedicated Student | `totalReviews >= 100` |
| `five_hundred_reviews` | Study Machine | `totalReviews >= 500` |
| `first_note` | Note Taker | Any step note written |
| `ten_notes` | Detailed Notes | 10+ step notes |
| `first_drill_mastered` | Drill Sergeant | Any drill mastered |
| `order_mastered_first` | In Order | Section order mastered on any sheet |
| `stepseq_mastered_first` | Step by Step | Step sequence mastered in any section |
| `whatnext_mastered_first` | What Comes Next | What's Next? mastered on any sheet |
| `first_recall_attempt` | From Memory | First blank recall attempt |
| `good_recall` | Memory Champion | Blank recall ≥ 80% on any sheet |
| `perfect_recall` | Total Recall | Blank recall 100% on any sheet |
| `recall_three_sheets` | Recall Ace | Blank recall ≥ 80% on 3+ sheets |
| `spoken_script_pass` | Verbal Fluency | Spoken script ≥ 80% on any sheet |
| `spoken_script_mastered` | Script Master | Spoken script mastered on any sheet |
| `streak_3` / `streak_7` / `streak_30` | Consistent / Week Warrior / Monthly Scholar | `longestStreak` milestones |
| `all_drills_one_sheet` | Complete Package | All 5 drills mastered/good on one sheet |
| `all_drills_three_sheets` | Triple Threat | All 5 drills mastered/good on 3 sheets |

When adding a new drill type, add corresponding achievements here.

## Testing

Tests use **Vitest** + `@testing-library/preact` in jsdom.

**Unit/component tests:** `tests/**/*.test.{ts,tsx}` — run with `npm test`.

**Test fixtures:** `tests/vitest.fixtures.ts` — use `createMockSheet()`, `createEmptyState()`, `createMockRoute()`, etc. Do not create new mock data inline.

**Coverage thresholds** (enforced by Vitest): 40% statements, 37% branches, 40% functions, 44% lines. These are the floor; don't lower them.

**E2E tests:** `tests/e2e/*.spec.js` use Playwright — run with `npm run test:e2e:browser`. Excluded from Vitest runs.

**Type checking:** Run `npx tsc --noEmit` before marking any TypeScript task done. CI enforces this in the `code-quality` job.

## Coding Conventions

- **No comments by default.** Only add one when the WHY is non-obvious. Never describe what the code does.
- **State writes:** always `mutateState(draft => { ... })` then `save()`. Never mutate `appState.value` directly.
- **New state keys** go on the top-level `AppState` — never add to `state.srs`.
- **New views** → `src/views/MyView.tsx` + entry in `VIEWS` map in `App.tsx`.
- **New lib functions** → `src/lib/` with a matching test in `tests/`.
- Keep `src/types/index.ts` as the single source of truth for all shared types.

## Active Roadmap

`README.md` tracks what's shipped (✅) and what's planned. Check it before starting any new feature.

## Issue Queue

Ordered by dependency and impact. Update status as work progresses.

| # | Issue | Status | Notes |
|---|-------|--------|-------|
| 1 | [T-012 #48] Promote Critical Criteria to first-class mode on SheetView | ⬜ todo | Drill already built (T-017 done); just add mode card to SheetView.tsx |
| 2 | [T-002 #38] Add /skills route + SkillsView (extract sheet grid from Home) | ⬜ todo | Prerequisite for all nav IA work (T-001 epic) |
| 3 | [T-003 #39] Convert HomeView into Today dashboard | ⬜ todo | Requires T-002 first |
| 4 | [T-019 #55] Achievement: "Auto-Fail Auditor" — master all critical criteria | ⬜ todo | Small addition to achievements.ts; independent |
| 5 | [T-031 #67] Curate initial video list (3-5 physical-skill sheets) | ⬜ todo | Content-only; finalizes video epic |
| 6 | [Exam Day #34] Vitals (Pulse, BP, RR) station skill sheet | ⬜ todo | Independent content addition |
| 7 | [Exam Day #33] Suction station skill sheet | ⬜ todo | Independent content addition |
| 8 | [Exam Day #32] 12-Lead ECG station skill sheet | ⬜ todo | Independent content addition |
| 9 | [Exam Day #31] CPAP station skill sheet | ⬜ todo | Independent content addition |
| 10 | [T-008 #44] Top nav rebuild: 4 tabs + settings icon | ⬜ todo | Requires T-002 + T-003 |
| 11 | [T-010 #46] Build Learn mode (rebrand SRS flashcards) | ⬜ todo | Simple rebrand on SheetView |
| 12 | [T-011 #47] Build adaptive Drill mode (rotate secorder/stepseq/whatnext) | ⬜ todo | New DrillView.tsx + pickNextDrill.ts |
| 13 | [T-021 #57] Hero "next best action" card + recommendation engine | ⬜ todo | Requires T-003 |
| 14 | [T-022 #58] 14-day activity strip component | ⬜ todo | Requires T-003 |
| 15 | [T-023 #59] Inline streak + mastery + weekly reviews on Today | ⬜ todo | Requires T-003 |

**Status key:** ⬜ todo · 🔄 in progress · ✅ done · ⏭ skipped

## Workflow

For every task:
1. Write tests first (or alongside) — unit in `tests/*.test.{ts,tsx}`, E2E in `tests/e2e/*.spec.js`
2. Implement the feature
3. Run `npm test` — must pass
4. Run `npx tsc --noEmit` — zero errors
5. Run `npm run test:e2e:browser` — must pass for any user-facing change
6. Visually verify in the browser (`npm run dev`)

A task is **not done** until:
- `npm test` shows green (run it yourself)
- `npx tsc --noEmit` is clean
- E2E tests pass for UI changes
- No new console errors or warnings
- Coverage thresholds are not regressed

When tests fail: fix the code or the test — never skip, comment out, or lower thresholds.

When creating a PR: after pushing the branch and opening the PR, always ask the user whether they want to push to stage (deploy the branch).
