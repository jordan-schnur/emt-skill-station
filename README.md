# NREMT Skill Sheet Trainer

Local study tool for the 10 NREMT EMT psychomotor skill sheets in this folder.
Memorize the steps with flashcards + spaced repetition, attach personal
notes to any step, and keep your progress in your browser.

[![Deploy production](https://github.com/jordan-schnur/emt-skill-station/actions/workflows/deploy-production.yml/badge.svg?branch=main)](https://github.com/jordan-schnur/emt-skill-station/actions/workflows/deploy-production.yml)
[![Tests](https://github.com/jordan-schnur/emt-skill-station/actions/workflows/test.yml/badge.svg?branch=main)](https://github.com/jordan-schnur/emt-skill-station/actions/workflows/test.yml)
[![E2E Tests](https://github.com/jordan-schnur/emt-skill-station/actions/workflows/e2e.yml/badge.svg?branch=main)](https://github.com/jordan-schnur/emt-skill-station/actions/workflows/e2e.yml)

## What's in here

```
nremt/
├── E201_NREMT.pdf … E217_NREMT.pdf   Source skill sheets
├── preprocess.py                     Reads the PDFs, validates the
│                                     canonical step data, generates
│                                     data.json and js/data.js
├── data.json                         Generated; structured sheet data
├── index.html                        Entry point
├── css/styles.css
└── js/
    ├── data.js     window.NREMT_DATA = { sheets: […] }   (generated)
    ├── storage.js  localStorage wrapper + JSON export/import
    ├── srs.js      Simplified SM-2 spaced repetition
    ├── notes.js    Per-step / per-sheet note helpers
    ├── views.js    Renderers for every view
    └── app.js      Router + render loop
```

## Run it

1. Regenerate the data (only needed if you edit `preprocess.py`):

   ```bash
   pip install pdfplumber
   python3 preprocess.py
   ```

2. Open `index.html` in any modern browser. It works from `file://` —
   no server needed.

   (If your browser blocks local files, run
   `python3 -m http.server` from this folder and visit
   `http://localhost:8000`.)

## Study flow

- **Home** lists the 10 sheets with mastery %, cards due now, and a
  *Coming next* roadmap.
- Click a sheet to open it. Three tabs:
  - **Flashcards (SRS)** — one step per card. Reveal, then grade
    *Again / Hard / Good / Easy*. Keyboard: `Space` reveals,
    `1`–`4` grade.
  - **Full sheet** — read-only view of the entire sheet with sub-steps,
    examiner cues, and the auto-fail Critical Criteria. Click the
    `+ note` chip on any row to attach a private note.
  - **Notes** — review all of your notes for this sheet and edit a
    general note that applies to the whole sheet.
- **Stats** tab summarizes progress across sheets.
- **Backup** tab exports a `nremt-progress-YYYY-MM-DD.json` you can
  keep in this folder. Import on another device to migrate.

## Editing the data

The canonical step list lives in `preprocess.py` as a single
`SHEETS = [...]` list of Python dicts. Edit it there, re-run
`python3 preprocess.py`, and reload the page. The script:

- pulls full text from every PDF via `pdfplumber`,
- verifies each step's wording actually appears in its PDF (warns
  on mismatches — see the "Head" row in E201 for a known PDF
  rendering quirk that's safe to ignore),
- auto-extracts the Critical Criteria block from each PDF,
- writes `data.json` and `js/data.js`.

Steps can carry `note`, `mnemonic`, and `examinerNote` fields — they
all show up on the back of the matching flashcard and in the Full
sheet reference view.

## Where progress lives

Everything is in `localStorage` under the single key
`nremt.state.v1`. The structure:

```js
{
  version: 1,
  srs:   { "<cardId>": { ease, interval, reps, due, lastGrade, lapses } },
  notes: { step: { "<cardId>": "…" }, sheet: { "<sheetId>": "…" } },
  stats: { totalReviews, lastReviewedAt }
}
```

Clearing browser data on this origin wipes it — use **Backup → Export**
periodically.

## Roadmap

North star: **Can I perform this station from memory, in order, without
critical fails, under time?** (Not just: "Do I recognize this step?")

### Already shipped
- ✅ Structured JSON data for all 10 sheets (`preprocess.py` → `data.json` + `js/data.js`)
- ✅ Flashcards + SM-2 spaced repetition (`js/srs.js`)
- ✅ Per-step + per-sheet notes, stored in `localStorage` with full Markdown support (editor toolbar + live rendering)
- ✅ Full-sheet reference view with Critical Criteria
- ✅ JSON export / import for backup
- ✅ Visible roadmap panel on the home screen
- ✅ Favicon and branded logo
- ✅ **Mnemonic prompts on flashcard fronts** — OPQRST / SAMPLE substep cards ask "What does the **P** stand for?" with the acronym rendered and the missing letter highlighted (see `mnemonicMatch` in `js/views.js`).
- ✅ **Section Order Drill** — drag-to-order the major sections of each sheet; streak pips track progress to mastery (3 correct in a row); mastery badge persists on sheet cards and the Order Drill tab. Single-section sheets (BVM, CPR, etc.) show a graceful fallback. State stored under `state.drills.secorder[sheetId]`.
- ✅ **Step Sequence Drill** — section picker lists all drillable sections with per-section streak tracking; drag or ↑↓ to reorder steps within a section; same mastery gate (3-streak); tab label shows live progress `Step Drill (2/4)`. Single-section sheets skip the picker and go straight to the steps. State stored under `state.drills.stepseq[sheetId][sectionName]`.
- ✅ **Critical Criteria Drill** — dedicated "Critical Criteria" tab on every sheet drills only auto-fail criteria with SRS scheduling. Three-button self-rating (✗ Would fail / ~ Close call / ✓ Know it cold); "again" resurfaces in 30 s. Tab label shows live mastery progress `Critical Criteria (1/3)` → `Critical Criteria ✓`. Card IDs stored under `state.srs["critical::<sheetId>::<idx>"]`.
- ✅ **What's Next? Drill** — multiple-choice drill: app shows a step and asks which step comes next; 3-streak mastery gate; tab label shows live progress `What's Next? (2/3)` → `What's Next? ✓`. State stored under `state.drills.whatnext[sheetId]`.
- ✅ **Missed Item Loop** — after any Blank Recall attempt with missed steps, a "Practice X missed steps →" button launches a mini reveal-card session for just the misses; after working through all missed cards the view returns to the results screen. Embedded in `blankRecall` in `js/views.js`.
- ✅ **Blank Sheet Recall** — textarea where the user types every step from memory; fuzzy Jaccard matching accepts shorthand; results view shows ✓/✗/~ (out-of-order) per step with score and best-attempt tracking. State stored under `state.drills.blankrecall[sheetId]`.

---

### Phase 1 — Core learning loop ✅ *shipped*

#### ✅ 1. Section Order Drill *(shipped)*
**Goal:** Memorize the major chunks of each skill sheet in the correct order
before drilling individual steps.

Users first need to learn the skeleton:
`BSI/PPE → Scene Safety → Primary Assessment → History → Secondary Assessment → Reassessment → Critical Criteria`

- ✅ Show shuffled section names; user drags them into the correct order.
- ✅ Immediate feedback on hits/misses.
- ✅ Track mastery per sheet (streak pips + badge on sheet card and tab).
- ✅ Require 3 correct runs before marking section order as learned.

*Why this matters:* Directly solves the "what comes next?" problem.

#### ✅ 2. Step Sequence Drill *(shipped)*
**Goal:** Learn the steps inside each section in order.

Example for Primary Assessment: General impression → Level of consciousness → Airway → Breathing → Circulation → Priority decision.

- ✅ Pick a section; steps are shuffled.
- ✅ User orders them (drag on desktop, ↑↓ on mobile).
- ✅ Show missed and misplaced steps with correct-position hints.
- ✅ Save weak sections for extra review (per-section streak tracking).

#### ✅ 3. Critical Fail Mode *(shipped)*
**Goal:** Separate automatic-fail criteria from normal point items.

- ✅ Dedicated "Critical Criteria" tab on every sheet.
- ✅ SRS-ordered drill: due criteria first, never-seen last.
- ✅ Per-card self-rating: "✗ Would fail" / "~ Close call" / "✓ Know it cold".
- ✅ Critical misses resurface in 30 s (vs. 60 s for normal flashcards).
- ✅ Tab label shows live progress: `Critical Criteria (1/3)` → `Critical Criteria ✓`.
- Full simulations automatically fail if a critical criterion is missed *(future — no simulation mode yet)*.

---

### Phase 2 — Full performance recall ✅ *shipped*

#### ✅ 4. Blank Sheet Recall *(shipped)*
**Goal:** User reconstructs an entire skill sheet from memory — the main mastery mode.

- ✅ Start with a blank text area.
- ✅ User types the full sheet from memory; allow shorthand/partial matching (fuzzy Jaccard).
- ✅ Compare against expected sections and steps.
- ✅ Show: missing steps and out-of-order steps per row.
- ✅ Save missed items into the Missed Item Loop (Practice X missed steps mini-session).

#### 5. Spoken Script Mode *(Very high priority)*
**Goal:** Memorize what to actually *say* during testing.

Each step has a clean verbalization:
`"I'm taking BSI precautions." / "The scene is safe." / "I would assess airway and breathing."`

- Convert each sheet into a spoken script.
- Practice line-by-line (typing for MVP; voice input later).

#### 6. Timed Full Simulation *(High priority)*
**Goal:** Practice under exam-like conditions.

- Timer per skill sheet with a start button.
- User performs blank recall or checklist recall.
- End-of-session grade: completion, order, critical criteria, time.
- Save all simulation attempts.

---

### Phase 3 — Examiner realism

#### 7. Examiner Prompt Mode *(High priority)*
**Goal:** Train responses to examiner cues.

Example: *Examiner: "The patient is unresponsive, apneic, and pulseless."*
Expected: Start chest compressions immediately.

- Prompt cards drawn from examiner notes/cues.
- User answers what they would do next.
- Prompts tied to exact sheet location.
- Missed prompts become review cards.

#### ✅ 8. "What Comes Next?" Drill *(shipped)*
**Goal:** Train procedural flow step-by-step.

App shows a step → user picks the next step from 4 choices (multiple choice).

Example: *Current: "Assesses airway." → Question: "What comes next?" → Answer: "Assesses breathing."*

- ✅ 3-streak mastery gate; tab label shows live progress.
- ✅ 4-choice multiple choice with immediate correct/wrong feedback.

#### 9. Scenario Interruption Cards *(Medium-high priority)*
**Goal:** Train decision points and trap moments.

Example: *"You found no pulse. What should you do immediately?"*
A) Apply AED pads  B) Begin compressions  C) Check blood pressure  D) Give oxygen

- Multiple choice or short answer.
- Focus on common test failures; stronger weighting for critical decisions.

---

### Phase 4 — Better SRS logic

#### 10. Weakness-based SRS (upgrade from card-based) *(Medium-high priority)*
Each item type gets its own mastery score:

| Mastery type | SRS key prefix |
|---|---|
| Step mastery | `srs::<cardId>` (existing) |
| Section order mastery | `secorder::<sheetId>` |
| Section content mastery | `seccontent::<sheetId>::<sectionId>` |
| Critical criteria mastery | `critical::<sheetId>` |
| Full-sheet recall mastery | `fullrecall::<sheetId>` |
| Timed performance mastery | `timed::<sheetId>` |

#### ✅ 11. Missed Item Loop *(shipped — in Blank Recall)*
After a Blank Recall attempt, a "Practice X missed steps →" button launches a
mini reveal-card session for just the missed steps.

> *"Practice 3 missed steps → [Reveal step] → [Next →]"*

Embedded in Blank Recall. Future: extend to Critical Criteria and other drills.

#### 12. Mastery Gate per sheet *(Medium priority)*
A sheet is not mastered until all of the following pass:

- Section order: passed 3×
- Step sequence: passed 3×
- Critical criteria: 100%
- Blank recall: ≥90%
- Timed simulation: passed
- No critical fails: passed

---

### Phase 5 — Study plan / exam mode

#### 13. Cram Mode *(High priority)*
**Goal:** Best use of limited time before the exam.

Priority order: Critical criteria → Weak sections → Section order → Examiner prompts → Full timed simulations.

User picks available time (10 / 20 / 45 / 90 minutes); app generates a session:

> *20-minute cram: 5 min critical fails · 5 min weak sections · 5 min what-comes-next · 5 min full sheet recall*

#### 14. Random Station Mode *(Medium priority)*
**Goal:** Prevent rote order memorization via interleaving.

App randomly picks a station and mode (e.g. *Medical Assessment — Blank Recall*, then *Cardiac Arrest/AED — Critical Criteria*).

#### 15. Daily Due Queue *(Medium priority)*
**Goal:** Make the homepage actionable instead of just statistical.

> *Today: 12 due flashcards · 3 weak sections · 2 critical criteria reviews · 1 full timed simulation*

---

### Phase 6 — Notes and mnemonics

#### 16. Notes attached to mistakes *(Medium priority)*
After missing a step twice, prompt: *"Add a memory note?"*
Example note: *"After airway always think breathing."*

#### 17. Mnemonic Builder *(Medium-low priority)*
For any section with 3+ steps, allow a custom mnemonic.

Example: Scene Size-Up (BSI, Scene Safety, MOI/NOI, Patients, Resources, C-spine)
→ User creates: *"Big Safe Medics Pick Resources Carefully"*

#### 18. Collapsed Reference View *(Medium-low priority)*
Full-sheet view shows sections collapsed by default:

```
[+] Scene Size-Up
[+] Primary Assessment
[+] History Taking
[+] Secondary Assessment
[+] Reassessment
[+] Critical Criteria
```

---

### Phase 7 — AI / advanced features *(Later)*

#### 19. AI feedback
Not the core feature — use it to augment after core drills exist:
- Evaluate typed blank recall and accept alternate wording.
- Explain why order matters; turn misses into memory tricks.
- Generate mnemonics on demand.
- Requires a backend endpoint (e.g. Vercel function calling Claude API).

#### 20. Voice Practice
User verbalizes the station; speech-to-text checks against expected steps and highlights misses. Great feature, not needed for MVP.

---

### Build order (implementation slices)

**Slice 1 — From flashcard app to psychomotor trainer** ✅ *complete*
1. ✅ Section Order Drill
2. ✅ Step Sequence Drill
3. ✅ Critical Fail Mode

**Slice 2 — Procedural memory** ✅ *complete*
4. ✅ What Comes Next? Drill
5. ✅ Missed Item Loop (in Blank Recall)
6. ✅ Blank Sheet Recall

**Slice 3 — Exam readiness** *(next)*
7. Timed Simulation
8. Examiner Prompt Mode
9. Cram Mode

**Then:** Random Station Mode, Daily Due Queue, Mastery Gates, Spoken Script Mode, Notes after misses, Mnemonic Builder.

**Later:** AI feedback, Voice practice, Partner/examiner mode, Printable pocket scripts, Mobile polish.

---

### Data model additions

Extend each step object with:

```json
{
  "type": "normal | critical | examinerCue | sequenceSensitive | timeSensitive",
  "expectedOrder": 1,
  "sectionOrder": 1,
  "spokenScript": "I would assess airway.",
  "acceptableAnswers": ["assess airway", "checks airway", "airway"],
  "commonMistakes": [],
  "mastery": {
    "step": 0,
    "sequence": 0,
    "critical": 0,
    "fullRecall": 0
  }
}
```

Add an attempt record schema:

```json
{
  "attemptId": "uuid",
  "sheetId": "trauma-assessment",
  "mode": "blankRecall",
  "startedAt": "…",
  "durationSeconds": 420,
  "missedStepIds": [],
  "outOfOrderStepIds": [],
  "criticalMissIds": [],
  "passed": false
}
```

---

### Picking the work back up cold

If you're returning in a fresh session, here's the orienting tour:

- `preprocess.py` holds the canonical data for all 10 sheets as Python dicts. Edit there, re-run `python3 preprocess.py`, reload the page.
- The frontend is six small files in `js/`. Start with `js/views.js` (~800 lines, all the rendering). New study modes are new entries in the `Views` object plus a tab in `renderTabs`.
- SRS lives in `js/srs.js`. New SRS targets (section-level, run-through best times, quiz scores) should add their own top-level keys on `state` rather than mixing with `state.srs.<cardId>`.
- The DOM-shim end-to-end test pattern from the build session is the fastest way to catch regressions — render every view via the shim and check no exception fires. See git history / chat log for the exact harness.
