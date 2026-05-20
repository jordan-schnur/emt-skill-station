# NREMT App — Feature Reference

Complete documentation of every feature and study mode in the app. Keep this in sync when adding/removing features.

---

## Study Modes (Per-Sheet Tabs)

### Full Sheet (`Views.reference`)
Read-only reference of the entire skill sheet. Shows all sections, steps, substeps, points, examiner notes, and critical criteria. Sections are collapsible (header sections expand by default). Each step has a `+ note` button for inline note editing. Rendered at `#sheet/<id>/sheet`.

### Notes (`Views.notes`)
Displays all step-level notes the user has written for this sheet, plus a general per-sheet markdown note with a full toolbar (bold, italic, bullets, live preview). Notes are stored in `state.notes.step[cardId]` and `state.notes.sheet[sheetId]`.

### Section Order Drill (`Views.sectionOrderDrill`)
Drag the major header sections into the correct exam order. Desktop drag-and-drop; mobile touch with ghost element. Feedback per section (correct/incorrect). Hint reveals correct order on wrong answer. **Mastery gate:** 3 consecutive correct runs → `state.drills.secorder[sheetId].mastered = true`. Tab badge shows streak pips. Only rendered when a sheet has 2+ header sections.

State shape: `state.drills.secorder[sheetId] = { mastered, streak, attempts }`

### Step Sequence Drill (`Views.stepSeqDrill`)
Pick a section from a picker, then drag steps into the correct order within that section. Per-section streak tracking. **Mastery gate:** 3 consecutive correct per section. Tab label shows `Step Drill (M/N)` where M = sections mastered, N = drillable sections (2+ steps). Single-section sheets skip the picker.

State shape: `state.drills.stepseq[sheetId][sectionName] = { mastered, streak, attempts }`

### What's Next? Drill (`Views.whatNextDrill`)
Multiple-choice: given a step, pick the next step from 4 options (one correct, three distractors). **Mastery gate:** 3 consecutive correct answers → mastered. Tab shows `What's Next? (X/3)` → `What's Next? ✓`.

State shape: `state.drills.whatnext[sheetId] = { streak, attempts, mastered }`

### Blank Recall (`Views.blankRecall`)
The primary mastery mode. User types every step from memory in a textarea (one per line). Fuzzy Jaccard matching (threshold 0.45) accepts shorthand. Results show ✓/✗/~ (out-of-order) per step with score and best-attempt tracking. **Missed Item Loop:** after results, a button launches a mini flashcard session for missed steps. No mastery gate — tracks `bestPct`.

State shape: `state.drills.blankrecall[sheetId] = { attempts, lastAttemptAt, lastScore: { matched, missed, total, pct }, bestPct }`

### Spoken Script (`Views.spokenScript`)
User types what they would say aloud for each step (comparing against the `spokenScript` field in data). Similarity scoring with Jaccard threshold 0.45. Per-step feedback: ✓ Good / ✗ Not quite (shows expected script). **Mastery gate:** 3 runs where score ≥ 80% → mastered. Streak pips shown.

State shape: `state.drills.spokenscript[sheetId] = { streak, mastered, attempts, lastScore: { correct, total, pct } }`

### Mnemonics (`Views.mnemonics` — per-sheet tab)
AI-generated memory aids. Section-order mnemonic (for sheets with multiple header sections) and per-section step mnemonics (for sections with 2+ steps). User can edit any mnemonic. Breakdown view maps sentence → acronym → step. Default mnemonics from `window.NREMT_MNEMONICS`; user overrides stored in `state.mnemonics[sheetId]`.

State shape: `state.mnemonics[sheetId] = { sections: "...", steps: { sectionName: "..." } }`

### Chat (`Views.chat` — per-sheet tab)
Two modes: **Chat** (Q&A about the skill sheet) and **Examiner** (AI role-plays as the NREMT examiner). Configures OpenAI or Anthropic API keys (stored separately from sync state — never sent to Firestore). Chat histories stored in `state.chats`. Routed at `#chat` and `#chat/<chatId>`.

---

## Global Views

### Home (`Views.home`)
Dashboard showing all 10 sheets as cards. Each sheet card shows: title, category, drill badges (mastery status per drill type), notes count, and link. Includes a roadmap panel at the bottom.

### Stats (`Views.stats`)
Aggregated progress view. Shows:
- **Hero bar**: streak, achievements count, total notes, sheets completed
- **Drill mastery summary**: per drill type, how many sheets mastered out of 10
- **Achievements grid**: all achievements with unlock status and date
- **Per-sheet breakdown**: each sheet's drill badges and notes count
Routed at `#stats`.

### Settings (`Views.settings`)
Cloud sync (Firestore sign-in), JSON export/import backup, AI API config (OpenAI/Anthropic keys for Chat mode). Routed at `#settings`.

### Guide (`Views.guide`)
Tutorial explaining every study mode. Routed at `#guide`.

### EMS Mnemonics (`Views.emsMnemonics`)
Library of standard EMS clinical acronyms (OPQRST, SAMPLE, AVPU, etc.) with definitions. Browse mode and quiz/flashcard mode. SRS state stored in `state.emsSrs`. Routed at `#mnemonics`.

---

## App Architecture

### State (`localStorage["nremt.state.v1"]`)
```js
{
  version: 1,
  srs: {},                         // legacy SRS (removed — kept for data compat)
  notes: { step: {}, sheet: {} },  // user notes
  stats: { totalReviews, lastReviewedAt, dailyStreak, longestStreak, lastStreakDay },
  drills: { secorder, stepseq, whatnext, blankrecall, spokenscript },
  achievements: { [id]: timestampMs },
  mnemonics: { [sheetId]: { sections, steps } },
  chats: { [chatId]: { id, title, mode, sheetId, messages } },
  emsSrs: { [cardId]: SRSRecord }
}
```

`totalReviews` is incremented on every drill submission (section order, step sequence, what's next, blank recall, spoken script). Used to track overall engagement and unlock review-milestone achievements.

### Routing
Hash-based: `#sheet/<sheetId>/<tab>`, `#stats`, `#settings`, `#guide`, `#chat`, `#chat/<chatId>`, `#mnemonics`.

### Data
10 NREMT psychomotor skill sheets. Generated by `preprocess.py` from PDFs into `data.json` and `js/data.js`. Card IDs: `<sheetId>::<sectionSlug>::<stepIndex>`. Total: ~172 cards across 10 sheets.

### Achievements (`js/achievements.js`)
`Achievements.check(state)` runs after every `ctx.save()` in `app.js`. Returns newly unlocked achievements (shown as toast notifications). See `achievements.md` for the full achievement list.

### Cloud Sync (`js/firebase.js`)
Optional Firestore sync. On sign-in, compares `updatedAt` timestamps; takes newer version. API keys for AI chat are never synced. Debounced upload on every save.

---

## Key Constants (in `views.js`)
- `SECORDER_MASTERY_RUNS = 3` — streak required for section order mastery
- `STEPSEQ_MASTERY_RUNS = 3` — streak required for step sequence mastery
- `WHATNEXT_MASTERY_RUNS = 3` — streak required for what's next mastery
- `SPOKENSCRIPT_PASS_RATE = 0.8` — minimum score per run for spoken script
- `SPOKENSCRIPT_MASTERY_RUNS = 3` — runs at pass rate needed for mastery
- Fuzzy match threshold: `0.45` (Jaccard similarity)
