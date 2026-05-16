# NREMT Skill Sheet Trainer

Local study tool for the 10 NREMT EMT psychomotor skill sheets in this folder.
Memorize the steps with flashcards + spaced repetition, attach personal
notes to any step, and keep your progress in your browser.

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

The features below are ordered by research-backed
evidence-to-effort ratio. Sources for the ordering: cognitive-science
papers on active recall + procedural memory, plus practitioner advice
from EMTLIFE / Allied Medical Training / Unitek EMT / MedicTests. See
the chat history of the session in which this was planned for the
full citation list.

### Already shipped
- ✅ Structured JSON data for all 10 sheets (`preprocess.py` →
  `data.json` + `js/data.js`)
- ✅ Flashcards + SM-2 spaced repetition (`js/srs.js`)
- ✅ Per-step + per-sheet notes, stored in `localStorage`
- ✅ Full-sheet reference view with Critical Criteria
- ✅ JSON export / import for backup
- ✅ Visible roadmap panel on the home screen
- ✅ **Mnemonic prompts on flashcard fronts** — OPQRST / SAMPLE
  substep cards now ask "What does the **P** stand for?" with the
  acronym rendered, missing letter highlighted (search
  `mnemonicMatch` in `js/views.js`).

### Up next (priority order by learning ROI)

#### Tier 1: Foundation — Build first
1. **Skill-step drill mode (sequence drilling by section).**
   *Why:* Core foundation. NREMT demands knowing both the order within
   sections AND the order of sections themselves. Current flashcards test
   individual items but miss sequencing entirely.
   *How:* New tab "Step drill" next to "Flashcards". Show section header
   + "What comes next?" Render `<input type="text">` for user to type the
   step, or tap from a shuffled list. On submit, diff against canonical
   order, highlight hits/misses. Feed results into an SRS record at the
   *step-sequence* level (key: `stepseq::<sheetId>::<stepId>`).
   Estimated: ~200 lines in `js/views.js`, new SRS bucket in `srs.js`.

2. **Critical fail memorization mode.**
   *Why:* A single critical-criteria failure automatically fails the
   entire station. These are "do not fuck this up" items.
   *How:* New study tab "Critical drill". Auto-extract `sheet.criticalCriteria`
   and isolate them. Two quiz templates: (a) True/false — "Failure to X
   **automatically fails** this station." (b) Multiple-choice — "Which is
   **not** a critical criterion?" Track in `state.criticalScores[sheetId]`.
   High-contrast visual alert when drilling (red border, warning icon).
   Estimated: ~100 lines in `js/views.js`.

3. **Blank sheet recall (hide-and-reconstruct mode).**
   *Why:* Reconstructing from pure memory (not guided) shows true
   retention. Highest evidence-based learning gain.
   *How:* New tab "Blank sheet". Hide all steps behind a button labeled
   "Show step N". User sees only the section header and a numbered list
   of buttons. Clicks "Show step 1" to reveal the canonical text, then
   tries to reproduce it by typing (or clicks "Check" for a quick hit/miss).
   Optional: add a `<textarea>` to write out entire section at once, then
   diff on submit. Feed into `state.srs[blanksheet::<sheetId>::<sectionId>]`.
   Estimated: ~150 lines in `js/views.js`.

#### Tier 2: Realism & Pressure
4. **Station timer with official time limits.**
   *Why:* NREMT exams run under strict time. Practicing under pressure
   trains performance, not just memory.
   *How:* Display countdown timer in the top-right of any drill mode
   (sourced from `sheet.timeLimit`). Show red overlay if user exceeds
   limit. Save each session's `{ durationMs, lapses, passedAt }` to
   `state.runs[sheetId] = [...]`. Display best-time + best-lapses on
   the sheet home card.
   Estimated: ~80 lines in `js/views.js`.

5. **Examiner mode (friend evaluation via shared session).**
   *Why:* Real exam has an evaluator tapping checkboxes while you
   verbalize. This is the closest simulator.
   *How:* Generate a shareable read-only link that shows the full sheet
   checklist. Friend opens link in separate browser, sees checkboxes
   next to each step. As they tap, your browser (in "performer mode")
   sees real-time which steps were marked correct/incorrect. Session
   is ephemeral (URL token expires in 1 hour). Estimated: ~250 lines
   (new `examiner.js` module + lightweight messaging via `localStorage`
   polling or WebSocket if you add a backend).

#### Tier 3: Maintenance & Meta
6. **Random station mode (shuffle + unlock-in-order prevention).**
   *Why:* Prevents rote order memorization. Good for maintenance once
   skills are locked in.
   *How:* Checkbox on the home screen: "Shuffle sheet order". New tab
   "Random drill" — pick a random sheet + random drill mode
   (flashcard / step-drill / blank-sheet / critical-drill). Track stats
   separately so the user sees that shuffle-mode performance is harder
   (motivating) but validating (true mastery if you pass shuffled).
   Estimated: ~80 lines in `js/views.js`.

7. **Claude on-demand scenario feedback.**
   *Why:* Get AI feedback on "what did I do wrong?" for specific patient
   scenarios. Light, user-initiated (not real-time).
   *How:* Text field in the step-drill and blank-sheet modes: "Ask Claude
   for feedback". User types or pastes their answer, clicks "Evaluate",
   frontend calls an API endpoint that invokes Claude (with token rate-
   limiting + usage tracking). Claude responds with specific correctness +
   next-step coaching. Requires backend endpoint (e.g. Vercel function).
   Estimated: ~150 lines frontend + 50 lines backend function.

8. **Pocket Prep companion tracker (meta-reporting).**
   *Why:* Users study via multiple sources (Pocket Prep, NREMT sheets,
   YouTube, etc.). Lightweight dashboard to see external progress.
   *How:* New "Meta" tab on the Stats page. Manual entry fields:
   - Overall Pocket Prep score
   - Weakest subject(s)
   - Missed-question themes
   - Daily question streak
   These feed a simple `state.pocketPrepMeta` object, rendered as a
   summary card. Emoji/color badges for streak motivation.
   Estimated: ~60 lines in `js/views.js`.

#### Parking lot
- Voice / TTS verbalization mode (read steps aloud, optional speech
  recognition for hands-free drill).
- Video demo link next to each section header (point to YouTube,
  MedicTests, etc.).
- Mini analytics: which sections you lapse on most (histogram on Stats tab).
- Per-section mastery badges (bronze/silver/gold for consecutive correct runs).

### Smaller ideas / parking lot
- Expand the canonical `mnemonic` fields in `preprocess.py` for other
  common EMS acronyms where they map cleanly to substeps (DCAP-BTLS
  is the obvious candidate — would need substep data on the secondary-
  assessment body areas, which the sheets don't currently give us).
- Surface the mnemonic + acronym in the reference view, not just on
  the flashcard back.
- "Critical-criteria-first" study filter on the homepage — a one-click
  way to drill only the auto-fail items across all sheets.
- Mini analytics on the Stats tab: which sections you lapse on most.

### Picking the work back up cold

If you're returning in a fresh session, here's the orienting tour:

- `preprocess.py` holds the canonical data for all 10 sheets as Python
  dicts. Edit there, re-run `python3 preprocess.py`, reload the page.
- The frontend is six small files in `js/`. Start with `js/views.js`
  (~800 lines, all the rendering). New study modes are new entries in
  the `Views` object plus a tab in `renderTabs`.
- SRS lives in `js/srs.js`. New SRS targets (section-level, run-
  through best times, quiz scores) should add their own top-level
  keys on `state` rather than mixing with `state.srs.<cardId>`.
- The DOM-shim end-to-end test pattern from the build session is the
  fastest way to catch regressions — render every view via the shim
  and check no exception fires. See git history / chat log for the
  exact harness.
