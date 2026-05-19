# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm test                        # Run all unit tests with coverage
npm run test:watch              # Watch mode during development
npm run test:all                # Verbose output with coverage
npm test tests/views.test.js    # Run a single test file
npm run test:e2e:browser        # Playwright E2E tests (requires browsers installed)
npm run test:playwright:install # One-time browser install (needs internet)
npm run test:ci                 # Full pipeline: unit + E2E
npm run serve                   # python3 -m http.server 8000 (app works from file:// too)
python3 preprocess.py           # Regenerate data.json and js/data.js from PDFs
```

## Feature Documentation

Detailed feature docs live in `.claude/docs/`:
- `.claude/docs/features.md` — every study mode, global view, state shape, routing, and key constants
- `.claude/docs/achievements.md` — full achievement list with IDs, triggers, and implementation notes

Read these before adding features or modifying the stats/achievements system.

## Architecture

This is a **static, no-build frontend**. All JS files are loaded via `<script>` tags in `index.html`. There is no bundler.

**Data pipeline:** `preprocess.py` reads the 10 NREMT PDF skill sheets using `pdfplumber`, validates step wording against PDF text, and writes `data.json` + `js/data.js`. The canonical step list lives in `preprocess.py` as `SHEETS = [...]` — edit there, re-run the script, reload the browser.

**JS module load order matters** (no ES modules in prod):
1. `js/data.js` — sets `window.NREMT_DATA = { sheets, totalCards }`
2. `js/storage.js` — sets `window.Storage`
3. `js/srs.js` — sets `window.SRS` (placeholder — SRS removed)
4. `js/notes.js` — sets `window.Notes`
5. `js/achievements.js` — sets `window.Achievements`
6. `js/views.js` — sets `window.Views`
7. `js/app.js` — wires everything together, owns the render loop

**App state** lives in `localStorage` under `"nremt.state.v1"`. Full shape:
```js
{
  version: 1,
  srs:    {},                                          // legacy SRS (removed; kept for compat)
  notes:  { step: { "<cardId>": "text" }, sheet: { "<sheetId>": "text" } },
  stats:  { totalReviews, lastReviewedAt, dailyStreak, longestStreak, lastStreakDay },
  drills: {
    secorder:    { "<sheetId>": { mastered, streak, attempts } },
    stepseq:     { "<sheetId>": { "<sectionName>": { mastered, streak, attempts } } },
    whatnext:    { "<sheetId>": { mastered, streak, attempts } },
    blankrecall: { "<sheetId>": { attempts, lastAttemptAt, lastScore: { matched, missed, total, pct }, bestPct } },
    spokenscript:{ "<sheetId>": { mastered, streak, attempts, lastScore: { correct, total, pct } } }
  },
  achievements: { "<id>": timestampMs },
  mnemonics:    { "<sheetId>": { sections, steps: { "<sectionName>": "..." } } },
  chats:        { "<chatId>": { id, title, mode, sheetId, messages } },
  emsSrs:       { "<cardId>": SRSRecord }
}
```

`stats.totalReviews` is incremented on every drill submission (all 5 drill types). Drives engagement achievements.

**Routing** is hash-based in `app.js`: `#sheet/<sheetId>/<tab>`, `#stats`, `#settings`, `#guide`, `#chat`, `#chat/<chatId>`, `#mnemonics`. The `navigate(route)` function on `ctx` is the only way to change routes.

**Views** (`js/views.js`): Every view is a function in the `Views` object that takes `ctx = { state, route, navigate, refresh, toast, save }` and returns an `HTMLElement`. Views never touch `localStorage` directly — they call `ctx.save()`. To add a new study mode: add an entry to `Views`, add a tab in `renderTabs`.

**SRS** (`js/srs.js`): File exists as placeholder — spaced repetition was removed. `state.srs` is kept empty for data compatibility. Do not add new features to `state.srs`; use new top-level keys on `state` instead.

**Drill mastery** uses 3-consecutive-correct-runs as the gate, tracked per drill type in `state.drills.*`. See `.claude/docs/features.md` for per-type state shapes.

**Achievements** (`js/achievements.js`): `Achievements.check(state)` is called after every `ctx.save()` in `app.js`. Returns newly unlocked achievements. See `.claude/docs/achievements.md` for the full list. When adding a new drill type, add corresponding achievements here.

## Testing

Tests run in jsdom via Jest with Babel. The test environment provides DOM but not a real browser, so `views.js` tests render elements via the DOM shim.

**Test fixtures** are in `tests/fixtures.js` — use `createMockSheet()`, `createEmptyState()`, `createMockContext()`, etc. Do not create new mock data inline.

Coverage thresholds (enforced by Jest): 44% statements, 42% branches, 36% functions, 46% lines. These are the current floor; don't lower them.

E2E tests (`tests/e2e/*.spec.js`) use Playwright and are excluded from Jest runs — they run only via `npm run test:e2e:browser`.

## Active roadmap

`README.md` is the living todo list. It tracks what's shipped (✅) and what's planned across Phases 1–7, with a prioritized build order. Check it before starting any new feature to understand where work fits in the sequence.

## Workflow

For every task:
1. Write tests first (or alongside) — unit tests in `tests/*.test.js`, E2E in `tests/e2e/*.spec.js`
2. Implement the feature
3. Run `npm test` — must pass
4. Run `npm run test:e2e:browser` — must pass for any user-facing change
5. Visually verify in the browser (`npm run serve`)

A task is **not done** until:
- `npm test` shows green (you ran it yourself, not just assumed)
- E2E tests pass for UI changes
- No new console errors or warnings
- Coverage thresholds are not regressed

When tests fail: fix the code or the test — never skip or comment out. Never move forward with a failing suite.
