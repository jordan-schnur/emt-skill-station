# NREMT Trainer — UX Redesign Implementation Spec

For an engineer / Claude Code agent working in the `nremt-medical-conditions/` codebase.
**You have read access to:** `js/views.js`, `js/app.js`, `js/storage.js`, `js/notes.js`,
`js/achievements.js`, `js/srs.js`, `css/styles.css`, `index.html`, `data.json`.

These tickets are independent and can ship in any order. They modify the existing
files in place — no new build step, no new dependencies, no framework. Plain
ES5-ish JS using the `h()` helper at the top of `js/views.js`, plus CSS variables
already defined in `css/styles.css` (`--bg`, `--bg-elev`, `--bg-elev-2`,
`--border`, `--text`, `--text-dim`, `--text-mute`, `--accent`, `--accent-warm`,
`--good`, `--hard`, `--again`, `--easy`, `--radius`, `--radius-sm`, `--shadow`).

All numeric thresholds reuse existing constants where they exist:
`SECORDER_MASTERY_RUNS`, `STEPSEQ_MASTERY_RUNS`, `WHATNEXT_MASTERY_RUNS`,
`SPOKENSCRIPT_MASTERY_RUNS` (all `= 3` today).

GitHub issues: #8 (T1) · #9 (T2) · #10 (T3) · #11 (T4) · #12 (T5) · #13 (T6) · #14 (T7)

---

## Ticket 1 — Sheet card: mastery ring + drill badges + due pill

**File:** `js/views.js` (function `renderSheetCard`, ~lines 280–305) and
`css/styles.css` (`.sheet-card` block, ~lines 200–270).

### Current state
Each card on Home is a 260px wide tile containing only: `E2xx` ID, title,
`{points} pts · {timeLimit}`, and either the category name or a small "order"
streak badge. Every card looks identical regardless of progress. The mastery
bar / due pill that exist in CSS are not actually rendered.

### Target state
Each card shows progress at a glance via three additions:

1. **Mastery ring** on the left, 52×52px SVG donut.
2. **Due-count pill** next to the sheet ID — only when `due > 0`.
3. **Row of six drill badges** at the bottom, one per drill type.

### Computed values (add helper functions near top of `views.js`)

```js
// Returns 0–100. Average of the four mastery sources, weighted equally.
// Sources missing for a sheet (e.g. single-section sheets have no Order Drill)
// are excluded from the average.
function sheetMasteryPct(state, sheet) {
  const parts = [];
  // Section order
  if (sheet.sections.length > 1) {
    const r = state.drills?.secorder?.[sheet.id];
    parts.push(r?.mastered ? 100 : Math.min(100, (r?.streak || 0) / SECORDER_MASTERY_RUNS * 100));
  }
  // Step sequence (% of drillable sections mastered)
  const drillable = sheet.sections.filter(s => s.steps.length >= 2);
  if (drillable.length) {
    const recs = state.drills?.stepseq?.[sheet.id] || {};
    const mastered = drillable.filter(s => recs[s.name]?.mastered).length;
    parts.push(mastered / drillable.length * 100);
  }
  // SRS card mastery: % of cards in this sheet whose interval >= 7 days
  const cardIds = collectCardIdsForSheet(sheet);  // existing helper, otherwise inline
  if (cardIds.length) {
    const known = cardIds.filter(id => (state.srs?.[id]?.interval || 0) >= 7).length;
    parts.push(known / cardIds.length * 100);
  }
  // Blank recall best %
  const br = state.drills?.blankrecall?.[sheet.id];
  if (br?.bestPct != null) parts.push(br.bestPct);

  if (!parts.length) return 0;
  return Math.round(parts.reduce((a, b) => a + b, 0) / parts.length);
}

// Number of SRS cards currently due (interval expired) for this sheet.
function sheetDueCount(state, sheet) {
  const now = Date.now();
  let n = 0;
  for (const id of collectCardIdsForSheet(sheet)) {
    const rec = state.srs?.[id];
    if (!rec) { n++; continue; }  // never reviewed = due
    if (new Date(rec.due).getTime() <= now) n++;
  }
  return n;
}
```

If `collectCardIdsForSheet` doesn't exist, add one that iterates
`sheet.sections[].steps[]` and `.substeps[]` and returns the card-id list using
whatever ID scheme `js/srs.js` already uses (search for `state.srs[` usages).

### Mastery ring component

Add this helper next to `renderSheetCard`:

```js
function masteryRing(pct, size, stroke) {
  size = size || 52;
  stroke = stroke || 4.5;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - pct / 100);
  const color =
    pct >= 85 ? "var(--good)" :
    pct >= 50 ? "var(--accent)" :
    pct >= 20 ? "var(--hard)" :
                "var(--again)";

  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("width", size);
  svg.setAttribute("height", size);
  svg.setAttribute("class", "mastery-ring-svg");

  const track = document.createElementNS(ns, "circle");
  track.setAttribute("cx", size/2); track.setAttribute("cy", size/2);
  track.setAttribute("r", r); track.setAttribute("fill", "none");
  track.setAttribute("stroke", "var(--bg-elev-2)");
  track.setAttribute("stroke-width", stroke);
  svg.appendChild(track);

  const arc = document.createElementNS(ns, "circle");
  arc.setAttribute("cx", size/2); arc.setAttribute("cy", size/2);
  arc.setAttribute("r", r); arc.setAttribute("fill", "none");
  arc.setAttribute("stroke", color);
  arc.setAttribute("stroke-width", stroke);
  arc.setAttribute("stroke-linecap", "round");
  arc.setAttribute("stroke-dasharray", c);
  arc.setAttribute("stroke-dashoffset", offset);
  svg.appendChild(arc);

  const wrap = h("div", { class: "mastery-ring", style: `width:${size}px;height:${size}px` });
  wrap.appendChild(svg);
  wrap.appendChild(h("div", { class: "mastery-ring-label" }, [
    String(pct), h("span", { class: "mastery-ring-pct" }, ["%"])
  ]));
  return wrap;
}
```

### Drill badge helper

```js
// state: 'done' | 'progress' | null | number (recall %) | {done,total}
function drillBadge(label, state) {
  let cls = "drill-badge";
  let text = label;
  if (state === "done")        { cls += " is-done";     text = label + " ✓"; }
  else if (state === "progress") { cls += " is-progress"; text = label; }
  else if (typeof state === "number") {
    if (state >= 85)      { cls += " is-done";     text = label + " " + state + "%"; }
    else if (state > 0)   { cls += " is-progress"; text = label + " " + state + "%"; }
    else                  { cls += " is-empty";    text = label; }
  } else if (state && typeof state === "object") {
    const complete = state.total > 0 && state.done === state.total;
    if (complete)         { cls += " is-done";     text = label + " ✓"; }
    else if (state.done)  { cls += " is-progress"; text = label + " " + state.done + "/" + state.total; }
    else                  { cls += " is-empty";    text = label + " 0/" + state.total; }
  } else                  { cls += " is-empty"; }
  return h("span", { class: cls }, [text]);
}
```

### Replace `renderSheetCard` body

```js
function renderSheetCard(ctx, sheet) {
  const state = ctx.state;
  const pct = sheetMasteryPct(state, sheet);
  const due = sheetDueCount(state, sheet);
  const noteCount = Notes.countSheetNotes(state, sheet);
  const lastReviewed = sheet._lastReviewedAt; // compute or look up

  // Drill states
  const secRec = state.drills?.secorder?.[sheet.id];
  const orderState = sheet.sections.length <= 1 ? null
    : secRec?.mastered ? "done"
    : (secRec?.streak > 0 ? "progress" : "empty");

  const drillable = sheet.sections.filter(s => s.steps.length >= 2);
  const seqRecs = state.drills?.stepseq?.[sheet.id] || {};
  const seqDone = drillable.filter(s => seqRecs[s.name]?.mastered).length;
  const stepsState = { done: seqDone, total: drillable.length || 1 };

  const wnRec = state.drills?.whatnext?.[sheet.id];
  const whatNextState = wnRec?.mastered ? "done" : (wnRec?.streak > 0 ? "progress" : "empty");

  const brRec = state.drills?.blankrecall?.[sheet.id];
  const recallState = brRec?.bestPct || 0;

  const ssRec = state.drills?.spokenscript?.[sheet.id];
  const scriptState = ssRec?.mastered ? "done" : (ssRec?.streak > 0 ? "progress" : "empty");

  const critRec = state.drills?.critical?.[sheet.id];  // if present in state model
  const criticalState = critRec?.mastered ? "done" : (critRec?.streak > 0 ? "progress" : "empty");

  return h("div", {
    class: "sheet-card",
    onclick: () => ctx.navigate({ view: "sheet", sheetId: sheet.id, tab: "sheet" }),
  }, [
    h("div", { class: "sheet-card-head" }, [
      masteryRing(pct),
      h("div", { class: "sheet-card-headtext" }, [
        h("div", { class: "sheet-card-idrow" }, [
          h("span", { class: "sheet-id" }, [sheet.id.toUpperCase()]),
          due > 0 ? h("span", { class: "due-pill" }, [String(due), " due"]) : null,
        ]),
        h("div", { class: "sheet-title" }, [sheet.shortTitle || sheet.title]),
        h("div", { class: "sheet-meta" }, [
          sheet.totalPoints + " pts",
          sheet.timeLimit ? " · " + sheet.timeLimit : "",
          lastReviewed ? " · last " + relativeTime(lastReviewed) : "",
          noteCount ? " · " + noteCount + " note" + (noteCount === 1 ? "" : "s") : "",
        ]),
      ]),
    ]),
    h("div", { class: "sheet-card-badges" }, [
      drillBadge("Order",    orderState),
      drillBadge("Steps",    stepsState),
      drillBadge("Next?",    whatNextState),
      drillBadge("Recall",   recallState),
      drillBadge("Script",   scriptState),
      drillBadge("Critical", criticalState),
    ]),
  ]);
}
```

### CSS changes — append to `css/styles.css`

```css
/* mastery ring */
.mastery-ring { position: relative; flex-shrink: 0; }
.mastery-ring-svg { transform: rotate(-90deg); }
.mastery-ring-svg circle { transition: stroke-dashoffset .5s; }
.mastery-ring-label {
  position: absolute; inset: 0;
  display: grid; place-items: center;
  font-size: 13px; font-weight: 700; color: var(--text);
  letter-spacing: -0.3px;
}
.mastery-ring-pct { font-size: 9px; color: var(--text-mute); margin-left: 1px; }

/* sheet card layout — overrides the existing .sheet-card flexcol */
.sheet-card { gap: 12px; min-height: auto; }
.sheet-card-head { display: flex; align-items: flex-start; gap: 12px; }
.sheet-card-headtext { flex: 1; min-width: 0; }
.sheet-card-idrow { display: flex; align-items: center; gap: 8px; margin-bottom: 2px; }
.sheet-card-badges { display: flex; flex-wrap: wrap; gap: 4px; }

/* drill badge */
.drill-badge {
  display: inline-flex; align-items: center;
  padding: 3px 8px; border-radius: 999px;
  font-size: 10.5px; font-weight: 600; letter-spacing: 0.2px;
  white-space: nowrap;
  background: var(--bg-elev-2); color: var(--text-mute);
  border: 0;
}
.drill-badge.is-empty { background: transparent; border: 1px dashed var(--border); color: var(--text-mute); }
.drill-badge.is-progress { background: rgba(79,158,255,0.12); color: var(--accent); }
.drill-badge.is-done     { background: rgba(63,185,80,0.14); color: var(--good); }

/* due pill: tweak existing rule — already exists, just verify */
.due-pill {
  display: inline-flex; align-items: center;
  background: var(--accent); color: #fff;
  border-radius: 999px; padding: 1px 7px;
  font-size: 10px; font-weight: 700; gap: 4px;
}
```

### Acceptance
- A pristine state (`localStorage` cleared) shows every card with a 0% gray
  ring, no due pill, and all six drill badges with a dashed outline reading
  `Order`, `Steps 0/4`, `Next?`, `Recall`, `Script`, `Critical`.
- After completing Section Order Drill 3× on E201, the E201 card's `Order`
  badge becomes green and reads `Order ✓`.
- After a Blank Recall attempt scoring 78% on E201, the `Recall 78%` badge
  appears in blue.
- After 24 hours with no review, due pill on E201 shows the count of
  expired-interval cards.
- Single-section sheets (E203 BVM, E204 O2, E213, E215, E216, E217) do **not**
  show an `Order` badge.

---

## Ticket 2 — Home: "Today" hero panel

**File:** `js/views.js` (function `Views.home`, ~line 256) and
`css/styles.css` (append).

### Current state
`Views.home` renders an `<h1>NREMT Skill Sheet Trainer</h1>`, a one-line
subtitle with a `?` help icon, the sheet grid, then a `.roadmap` block listing
shipped/upcoming modes. No daily guidance.

### Target state
Replace the `<h1>` + subtitle + roadmap with:
1. **Today hero card** (`.today-card`) — left two-thirds: today's call-to-action.
2. **Stats column** (`.today-stats`) — right third: overall mastery ring + this-week sparkline.
3. **Critical-criteria alert strip** *inside* the hero, only when
   `criticalDueCount > 0`.
4. Sheet grid below, unchanged in markup but reordered/grouped (see Ticket 3).
5. Remove the roadmap entirely from Home — move its content to the existing
   `Guide` page or delete (every visible item is shipped).

### Computed values

```js
function computeTodayContext(state) {
  const sheets = NREMT_DATA.sheets;

  // Total due across all sheets
  let totalDue = 0;
  let sheetsWithDue = 0;
  for (const s of sheets) {
    const n = sheetDueCount(state, s);
    if (n > 0) { totalDue += n; sheetsWithDue++; }
  }

  // Critical criteria still in 'would fail' or 'close call' bucket
  let criticalDue = 0;
  for (const s of sheets) {
    for (const id of Object.keys(state.srs || {})) {
      if (!id.startsWith("critical::" + s.id + "::")) continue;
      const rec = state.srs[id];
      if (new Date(rec.due).getTime() <= Date.now()) criticalDue++;
    }
  }

  // Suggested next sheet: weakest mastery among sheets with due cards,
  // else weakest mastery overall.
  let target = null, targetScore = Infinity;
  for (const s of sheets) {
    const due = sheetDueCount(state, s);
    const pct = sheetMasteryPct(state, s);
    // prefer "weakest with stuff due"; break ties by mastery ascending
    const score = (due > 0 ? 0 : 1000) + pct;
    if (score < targetScore) { targetScore = score; target = s; }
  }

  // Suggested next mode for that sheet — first drill that's not done.
  const nextMode = suggestNextModeForSheet(state, target);

  return { totalDue, sheetsWithDue, criticalDue, target, nextMode };
}

function suggestNextModeForSheet(state, sheet) {
  if (!sheet) return null;
  const drillable = sheet.sections.filter(s => s.steps.length >= 2);
  const seqRecs = state.drills?.stepseq?.[sheet.id] || {};
  if (sheet.sections.length > 1 && !state.drills?.secorder?.[sheet.id]?.mastered) {
    return { tab: "order", label: "Section Order Drill" };
  }
  const nextSec = drillable.find(s => !seqRecs[s.name]?.mastered);
  if (nextSec) return { tab: "steps", label: "Step Drill — " + nextSec.name };
  if ((state.drills?.blankrecall?.[sheet.id]?.bestPct || 0) < 90) {
    return { tab: "recall", label: "Blank Recall" };
  }
  return { tab: "sheet", label: "Full sheet review" };
}

function reviewsThisWeek(state) {
  // Returns 7-element array, oldest first, ending today.
  // Requires state.stats.dailyReviewLog — see Ticket 4 (optional).
  // If not present, fall back to [0,0,0,0,0,0, state.stats.totalReviews]
  const log = state.stats?.dailyReviewLog;
  if (!log) return [0, 0, 0, 0, 0, 0, 0];
  const out = [];
  const today = new Date(); today.setHours(0,0,0,0);
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today); d.setDate(d.getDate() - i);
    out.push(log[d.toISOString().slice(0,10)] || 0);
  }
  return out;
}
```

### Replace `Views.home`

```js
Views.home = (ctx) => {
  const wrap = h("div");
  const today = computeTodayContext(ctx.state);
  const overallPct = Math.round(
    NREMT_DATA.sheets.reduce((a, s) => a + sheetMasteryPct(ctx.state, s), 0) / NREMT_DATA.sheets.length
  );
  const masteredCount = NREMT_DATA.sheets.filter(s => sheetMasteryPct(ctx.state, s) >= 80).length;
  const week = reviewsThisWeek(ctx.state);
  const weekMax = Math.max(...week, 1);

  // Hero row
  const hero = h("div", { class: "today-row" }, [
    h("div", { class: "today-card" }, [
      h("div", { class: "today-eyebrow" }, [
        new Date().toLocaleDateString("en-US",
          { weekday: "long", month: "short", day: "numeric" }).toUpperCase(),
      ]),
      h("h1", { class: "today-headline" }, [
        today.totalDue > 0
          ? [
              "You've got ",
              h("strong", {}, [String(today.totalDue), " cards"]),
              " due across ",
              h("strong", {}, [String(today.sheetsWithDue), " sheet" + (today.sheetsWithDue === 1 ? "" : "s")]),
              ".",
            ]
          : "All caught up. Pick a sheet below or push deeper into a weak one.",
      ]),
      today.target && h("p", { class: "today-suggestion" }, [
        "Start with ",
        h("strong", {}, [today.target.shortTitle || today.target.title]),
        " — ",
        today.nextMode ? today.nextMode.label.toLowerCase() : "weakest sheet right now",
        ".",
      ]),
      h("div", { class: "today-actions" }, [
        h("button", { class: "btn btn-primary btn-large",
          onclick: () => ctx.navigate({ view: "sheet", sheetId: today.target.id, tab: today.nextMode?.tab || "sheet" })
        }, ["▶ Start now"]),
        h("button", { class: "btn btn-ghost",
          onclick: () => document.querySelector(".sheet-grid")?.scrollIntoView({ behavior: "smooth" })
        }, ["Free study"]),
      ]),
      today.criticalDue > 0 && h("div", { class: "today-critical" }, [
        h("div", { class: "today-critical-icon" }, ["⚠"]),
        h("div", { class: "today-critical-text" }, [
          h("strong", {}, [String(today.criticalDue), " critical-fail criteria"]),
          " due. Miss one on exam = automatic fail.",
        ]),
        h("button", { class: "today-critical-btn",
          onclick: () => navigateToCriticalDrill(ctx)  // see ticket
        }, ["Drill now"]),
      ]),
    ]),

    h("div", { class: "today-stats" }, [
      h("div", { class: "today-stats-card" }, [
        masteryRing(overallPct, 64, 6),
        h("div", {}, [
          h("div", { class: "today-stats-label" }, ["OVERALL MASTERY"]),
          h("div", { class: "today-stats-value" }, [String(masteredCount), " of ", String(NREMT_DATA.sheets.length), " sheets ≥ 80%"]),
        ]),
      ]),
      h("div", { class: "today-stats-card today-stats-week" }, [
        h("div", { class: "today-stats-label" }, ["THIS WEEK"]),
        h("div", { class: "today-week-bars" },
          week.map((n, i) => h("div", { class: "today-week-col" }, [
            h("div", {
              class: "today-week-bar" + (i === 6 ? " is-today" : ""),
              style: `height: ${Math.max(3, Math.round(n / weekMax * 56))}px`,
            }),
            h("div", { class: "today-week-label" }, [
              ["M","T","W","T","F","S","S"][(new Date().getDay() + 6 - (6 - i)) % 7]
            ]),
          ]))
        ),
        h("div", { class: "today-stats-value" }, [
          String(week.reduce((a, b) => a + b, 0)), " reviews",
        ]),
      ]),
    ]),
  ]);
  wrap.appendChild(hero);

  // Grid (use Ticket 3 grouping when shipped)
  const grid = h("div", { class: "sheet-grid" });
  for (const sheet of NREMT_DATA.sheets) grid.appendChild(renderSheetCard(ctx, sheet));
  wrap.appendChild(grid);

  return wrap;
};
```

### Helper

```js
function navigateToCriticalDrill(ctx) {
  // Pick first sheet with a critical-criteria card due, else any sheet.
  const target = NREMT_DATA.sheets.find(s => {
    return Object.keys(ctx.state.srs || {}).some(id => {
      if (!id.startsWith("critical::" + s.id + "::")) return false;
      return new Date(ctx.state.srs[id].due).getTime() <= Date.now();
    });
  }) || NREMT_DATA.sheets[0];
  ctx.navigate({ view: "sheet", sheetId: target.id, tab: "critical" });
}
```

### CSS — append to `css/styles.css`

```css
/* today hero */
.today-row {
  display: grid;
  grid-template-columns: minmax(0, 1.6fr) minmax(0, 1fr);
  gap: 16px;
  margin-bottom: 28px;
}
@media (max-width: 768px) {
  .today-row { grid-template-columns: 1fr; }
}

.today-card {
  position: relative; overflow: hidden;
  background: linear-gradient(135deg, var(--bg-elev) 0%, var(--bg-elev-2) 100%);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 24px;
}
.today-card::after {
  content: ""; position: absolute; top: -40px; right: -40px;
  width: 200px; height: 200px; pointer-events: none;
  background: radial-gradient(circle, rgba(79,158,255,0.12), transparent 70%);
}
.today-eyebrow {
  font-size: 11px; font-weight: 700; letter-spacing: 1.5px;
  color: var(--accent); margin-bottom: 6px;
}
.today-headline {
  font-size: 26px; margin: 0 0 8px; line-height: 1.2; font-weight: 600;
  letter-spacing: -0.3px; color: var(--text);
}
.today-headline strong { color: var(--accent); font-weight: 600; }
.today-suggestion { color: var(--text-dim); margin: 0 0 18px; font-size: 14px; line-height: 1.5; }
.today-suggestion strong { color: var(--text); }
.today-actions { display: flex; gap: 10px; flex-wrap: wrap; }
.btn-large { padding: 12px 18px; font-size: 14px; font-weight: 600; }
.btn-ghost { background: transparent; color: var(--text-dim); border: 0; }
.btn-ghost:hover { color: var(--text); }

.today-critical {
  margin-top: 22px; padding: 14px 16px;
  background: rgba(229,83,75,0.08);
  border: 1px solid rgba(229,83,75,0.25);
  border-radius: 10px;
  display: flex; align-items: center; gap: 12px;
}
.today-critical-icon {
  width: 28px; height: 28px; border-radius: 8px; flex-shrink: 0;
  background: rgba(229,83,75,0.18); color: var(--again);
  display: grid; place-items: center; font-size: 14px; font-weight: 700;
}
.today-critical-text { flex: 1; font-size: 13px; line-height: 1.45; color: var(--text-dim); }
.today-critical-text strong { color: var(--text); }
.today-critical-btn {
  background: transparent; color: var(--again);
  border: 1px solid rgba(229,83,75,0.4); border-radius: 8px;
  padding: 6px 12px; font: inherit; font-size: 12px; font-weight: 600;
  cursor: pointer; white-space: nowrap;
}

/* today stats column */
.today-stats { display: flex; flex-direction: column; gap: 16px; }
.today-stats-card {
  background: var(--bg-elev); border: 1px solid var(--border);
  border-radius: 16px; padding: 20px;
  display: flex; align-items: center; gap: 18px;
}
.today-stats-card.today-stats-week { display: block; }
.today-stats-label {
  font-size: 11px; color: var(--text-mute); letter-spacing: 0.8px;
  font-weight: 600; margin-bottom: 4px;
}
.today-stats-value { font-size: 14px; font-weight: 600; color: var(--text); }
.today-week-bars { display: flex; align-items: flex-end; gap: 6px; height: 64px; margin: 10px 0 8px; }
.today-week-col { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4px; }
.today-week-bar { width: 100%; background: var(--bg-elev-2); border-radius: 3px; }
.today-week-bar.is-today { background: var(--accent); }
.today-week-label { font-size: 9px; color: var(--text-mute); }
```

### Acceptance
- Pristine state: headline reads "All caught up..." and a suggestion to start
  with the first sheet (lowest mastery).
- After completing a Blank Recall: total reviews count increases; bar for
  today appears in the week sparkline.
- When no critical cards are due, the red alert strip is not rendered at all
  (not just hidden).
- The roadmap section no longer appears on Home.

---

## Ticket 3 — Group home grid by category + sort toggle

**File:** `js/views.js` (`Views.home`) and `css/styles.css` (append).

### Target state
Below the Today hero, render a sort toggle and the sheet grid grouped by
category with section headings. Sort modes: `By category` (default),
`By mastery` (ascending — weakest first), `By due` (most due first).

### Implementation

Add a small state hook persisted to `localStorage`:

```js
function homeSortMode() {
  return localStorage.getItem("nremt.home.sort") || "category";
}
function setHomeSortMode(m) { localStorage.setItem("nremt.home.sort", m); }
```

After the hero in `Views.home`:

```js
const sortMode = homeSortMode();

const sortRow = h("div", { class: "home-section-row" }, [
  h("h2", { class: "home-section-title" }, ["All sheets"]),
  h("div", { class: "home-sort" },
    [
      { id: "category", label: "By category" },
      { id: "mastery",  label: "By mastery" },
      { id: "due",      label: "By due" },
    ].map(opt => h("button", {
      class: "home-sort-btn" + (sortMode === opt.id ? " is-active" : ""),
      onclick: () => { setHomeSortMode(opt.id); ctx.refresh(); },
    }, [opt.label]))
  ),
]);
wrap.appendChild(sortRow);

if (sortMode === "category") {
  // Stable group order — append any unknown categories at the end
  const ORDER = [
    "Patient Assessment",
    "Airway / Ventilation",
    "Cardiac",
    "Trauma / Immobilization",
    "Trauma / Circulation",
  ];
  const groups = {};
  for (const s of NREMT_DATA.sheets) (groups[s.category] = groups[s.category] || []).push(s);
  const ordered = [
    ...ORDER.filter(k => groups[k]),
    ...Object.keys(groups).filter(k => !ORDER.includes(k)),
  ];
  for (const cat of ordered) {
    const block = h("div", { class: "sheet-group" }, [
      h("div", { class: "sheet-group-head" }, [
        h("h3", { class: "sheet-group-title" }, [cat]),
        h("div", { class: "sheet-group-rule" }),
        h("span", { class: "sheet-group-count" }, [String(groups[cat].length)]),
      ]),
      h("div", { class: "sheet-grid" }, groups[cat].map(s => renderSheetCard(ctx, s))),
    ]);
    wrap.appendChild(block);
  }
} else {
  const sorted = NREMT_DATA.sheets.slice().sort((a, b) => {
    if (sortMode === "mastery") return sheetMasteryPct(ctx.state, a) - sheetMasteryPct(ctx.state, b);
    if (sortMode === "due")     return sheetDueCount(ctx.state, b) - sheetDueCount(ctx.state, a);
    return 0;
  });
  const grid = h("div", { class: "sheet-grid" });
  for (const s of sorted) grid.appendChild(renderSheetCard(ctx, s));
  wrap.appendChild(grid);
}
```

### CSS

```css
.home-section-row {
  display: flex; align-items: baseline; justify-content: space-between;
  margin-bottom: 14px; gap: 12px; flex-wrap: wrap;
}
.home-section-title { font-size: 17px; font-weight: 600; margin: 0; }
.home-sort { display: flex; gap: 4px; }
.home-sort-btn {
  background: transparent; color: var(--text-dim); border: 0;
  padding: 6px 12px; border-radius: 6px; font: inherit; font-size: 12px;
  cursor: pointer;
}
.home-sort-btn.is-active { background: var(--bg-elev-2); color: var(--text); }
.home-sort-btn:hover { color: var(--text); }

.sheet-group { margin-bottom: 24px; }
.sheet-group-head {
  display: flex; align-items: center; gap: 10px; margin-bottom: 10px;
}
.sheet-group-title {
  font-size: 11px; color: var(--text-dim); margin: 0;
  text-transform: uppercase; letter-spacing: 1px; font-weight: 700;
}
.sheet-group-rule { flex: 1; height: 1px; background: var(--border); opacity: 0.5; }
.sheet-group-count { font-size: 11px; color: var(--text-mute); }
```

### Acceptance
- Default load groups the 10 sheets under: Patient Assessment (2), Airway /
  Ventilation (2), Cardiac (1), Trauma / Immobilization (4), Trauma /
  Circulation (1). Empty categories don't render.
- Clicking "By mastery" reorders into one flat grid, weakest first; the sort
  choice persists across reloads.
- The sheet card markup itself is unchanged from Ticket 1.

---

## Ticket 4 — Top nav simplification + streak indicator

**File:** `index.html` (the `.topnav` block, lines ~28–36) and
`js/app.js` (`render()`, lines ~89–101) and `css/styles.css`.

### Target state
Top nav shrinks from 7 items to 5 content destinations: **Today** (was Home),
**Sheets** (new — full alphabetical sheet list view if needed; can alias to
`home` for now), **Mnemonics**, **Medical**, **AI Chat**. Stats, Backup, and
Guide collapse under a settings cog button on the far right. Streak count
shows as a pill between nav and cog.

### Markup change in `index.html`

```html
<header class="topbar">
  <button class="brand" data-nav="home" type="button">
    <img src="images/hand-pulse.svg" alt="" class="brand-logo" width="32" height="32" aria-hidden="true" />
    <span class="brand-text">
      <span class="brand-mark">NREMT</span>
      <span class="brand-sub">Psychomotor Trainer</span>
    </span>
  </button>
  <nav class="topnav">
    <button data-nav="home" type="button">Today</button>
    <button data-nav="mnemonics" type="button">Mnemonics</button>
    <button data-nav="medconditions" type="button">Medical</button>
    <button data-nav="chat" type="button">AI Chat</button>
  </nav>
  <div class="topbar-right">
    <span id="streak-pill" class="streak-pill" hidden>
      <span class="streak-emoji">🔥</span>
      <span class="streak-text"></span>
    </span>
    <div class="topbar-menu">
      <button class="topbar-menu-btn" type="button" aria-label="More">⚙</button>
      <div class="topbar-menu-pop" role="menu">
        <button data-nav="stats" type="button">Stats</button>
        <button data-nav="settings" type="button">Backup &amp; sync</button>
        <button data-nav="guide" type="button">Guide</button>
      </div>
    </div>
  </div>
</header>
```

### `app.js` — keep streak pill in sync at the bottom of `render()`

```js
const streakEl = document.getElementById("streak-pill");
const days = state.stats?.dailyStreak || 0;
if (days >= 2) {
  streakEl.hidden = false;
  streakEl.querySelector(".streak-text").textContent = days + "-day streak";
} else {
  streakEl.hidden = true;
}
```

Wire the menu buttons the same way as the existing nav buttons (the existing
loop already grabs `.topnav button` — extend the selector to
`.topnav button, .topbar-menu-pop button, .brand`).

### CSS

```css
.topbar-right { display: flex; align-items: center; gap: 10px; margin-left: auto; }

.streak-pill {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 6px 10px; border-radius: 999px;
  background: rgba(255,180,84,0.10); color: var(--accent-warm);
  font-size: 12px; font-weight: 600;
}

.topbar-menu { position: relative; }
.topbar-menu-btn {
  width: 32px; height: 32px; border-radius: 999px;
  background: var(--bg-elev-2); border: 1px solid var(--border);
  color: var(--text-dim); cursor: pointer; font-size: 14px;
}
.topbar-menu-pop {
  position: absolute; top: 100%; right: 0; margin-top: 6px;
  background: var(--bg-elev); border: 1px solid var(--border);
  border-radius: 10px; padding: 4px;
  min-width: 180px; box-shadow: var(--shadow);
  display: none; z-index: 60;
}
.topbar-menu.is-open .topbar-menu-pop { display: block; }
.topbar-menu-pop button {
  display: block; width: 100%; text-align: left;
  background: transparent; border: 0; color: var(--text);
  padding: 8px 12px; border-radius: 6px; font: inherit;
  cursor: pointer;
}
.topbar-menu-pop button:hover { background: var(--bg-elev-2); }
```

Add a click-outside-to-close + button click toggles `is-open` in `app.js`.

### Acceptance
- 5 nav items visible on desktop; cog button on far right opens a popover with
  Stats / Backup / Guide.
- Streak pill appears only when `state.stats.dailyStreak >= 2`.
- All original views are still reachable via the cog menu — no broken hash
  routes.

---

## Ticket 5 — Sheet detail: Learn / Drill / Prove buckets

**File:** `js/views.js` (`Views.sheet` ~line 354, `renderTabs` ~line 374) and
`css/styles.css`.

### Current state
`renderTabs` returns a single horizontal scroller with up to 9 tabs
(`Order Drill`, `Step Drill`, `What's Next?`, `Blank Recall`, `Spoken Script`,
`Mnemonics`, `Full sheet`, `Notes`, `Chat`). All visually equal. New users
have no idea what order to do them in.

### Target state
Above the tab strip, render a **mode-picker card** with three columns:

| Column | Modes | Visual treatment |
|---|---|---|
| **Step 1 · Learn the sheet** | Full sheet · Mnemonics · Spoken Script | Default card |
| **Step 2 · Drill until automatic** (active highlight) | Section Order · Step Sequence · What's Next? · Flashcards (SRS) · Critical Criteria | Blue border + glow |
| **Step 3 · Prove mastery** | Blank Recall · Timed Simulation (disabled · "soon") · Notes · AI Chat | Default card |

Also: keep the flat tab strip as a thin secondary "quick-jump" bar **below** the
mode-picker. Reorder its tabs to match the bucket order: `Full sheet · Notes ·
Mnemonics · Order Drill · Step Drill · What's Next? · Blank Recall · Spoken Script · Critical · Chat`.

Add a "Do this next" suggestion chip in the sheet header.

### Sheet hero markup

Replace the existing `.sheet-header` block in `Views.sheet` with:

```js
h("div", { class: "sheet-hero" }, [
  masteryRing(sheetMasteryPct(ctx.state, sheet), 88, 7),
  h("div", { class: "sheet-hero-text" }, [
    h("div", { class: "sheet-hero-eyebrow" }, [
      sheet.id.toUpperCase(), " · ", sheet.category,
    ]),
    h("h1", {}, [sheet.title]),
    h("div", { class: "sheet-hero-meta" }, [
      sheet.totalPoints + " possible points",
      sheet.timeLimit ? " · " + sheet.timeLimit + " station" : "",
      " · ",
      String(sheetDueCount(ctx.state, sheet)), " cards due now",
    ]),
  ]),
  (function suggest() {
    const next = suggestNextModeForSheet(ctx.state, sheet);
    if (!next) return null;
    return h("div", { class: "sheet-hero-suggest" }, [
      h("div", { class: "sheet-hero-suggest-eyebrow" }, ["↳ DO THIS NEXT"]),
      h("div", { class: "sheet-hero-suggest-text" }, [
        "Try ", h("strong", {}, [next.label]), ".",
      ]),
      h("button", {
        class: "btn btn-primary btn-sm",
        onclick: () => ctx.navigate({ view: "sheet", sheetId: sheet.id, tab: next.tab }),
      }, ["Open"]),
    ]);
  })(),
]),
```

### Mode-picker

Build a function `renderModeBuckets(ctx, sheet, currentTab)` that returns a
three-column grid. Each row inside a column is a "mode row" with a 6px-wide
status bar on the left, label, description, and progress badge.

```js
function modeRow(ctx, sheet, opts) {
  // opts: { id, label, desc, tab, state, badge, alert, disabled, critical }
  const row = h("button", {
    class: "mode-row"
      + (opts.state === "done" ? " is-done" : "")
      + (opts.state === "active" ? " is-active" : "")
      + (opts.alert ? " has-alert" : "")
      + (opts.disabled ? " is-disabled" : "")
      + (opts.critical ? " is-critical" : ""),
    onclick: opts.disabled ? null
      : () => ctx.navigate({ view: "sheet", sheetId: sheet.id, tab: opts.tab }),
  }, [
    h("div", { class: "mode-row-pill" }),
    h("div", { class: "mode-row-text" }, [
      h("div", { class: "mode-row-label" }, [opts.label]),
      h("div", { class: "mode-row-desc" }, [opts.desc]),
    ]),
    opts.badge ? h("span", { class: "mode-row-badge" }, [opts.badge]) : null,
  ]);
  return row;
}
```

Compute the right badge per mode using the existing drill records. Example for
Section Order:

```js
const secRec = ctx.state.drills?.secorder?.[sheet.id];
const orderBadge = secRec?.mastered ? "✓"
  : secRec?.streak > 0 ? secRec.streak + "/" + SECORDER_MASTERY_RUNS
  : null;
```

Apply the same pattern for Step, What's Next?, Spoken Script. Flashcards uses
`sheetDueCount`. Critical uses count of due `critical::` SRS records.

### CSS

```css
/* sheet hero */
.sheet-hero {
  background: var(--bg-elev); border: 1px solid var(--border);
  border-radius: 16px; padding: 20px; margin-bottom: 16px;
  display: flex; gap: 20px; align-items: center;
}
.sheet-hero-text { flex: 1; min-width: 0; }
.sheet-hero-eyebrow {
  font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace;
  font-size: 11px; color: var(--text-mute); letter-spacing: 0.8px;
  margin-bottom: 4px;
}
.sheet-hero h1 { margin: 0; font-size: 22px; font-weight: 600; letter-spacing: -0.3px; }
.sheet-hero-meta { display: flex; gap: 6px; margin-top: 6px; color: var(--text-dim); font-size: 13px; }

.sheet-hero-suggest {
  padding: 12px 14px; background: rgba(79,158,255,0.10);
  border: 1px solid var(--accent); border-radius: 12px;
  max-width: 280px;
}
.sheet-hero-suggest-eyebrow { font-size: 10px; color: var(--accent); font-weight: 700; letter-spacing: 1px; margin-bottom: 4px; }
.sheet-hero-suggest-text { font-size: 13px; color: var(--text); line-height: 1.4; margin-bottom: 8px; }
.btn-sm { padding: 6px 12px; font-size: 12px; }

/* mode picker grid */
.mode-buckets {
  display: grid; grid-template-columns: repeat(3, 1fr);
  gap: 14px; margin-bottom: 20px;
}
@media (max-width: 768px) { .mode-buckets { grid-template-columns: 1fr; } }
.mode-bucket {
  background: var(--bg-elev); border: 1px solid var(--border);
  border-radius: 14px; padding: 16px;
}
.mode-bucket.is-active {
  border-color: var(--accent);
  background: linear-gradient(180deg, rgba(79,158,255,0.06), transparent 60%), var(--bg-elev);
}
.mode-bucket-head { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
.mode-bucket-icon {
  width: 24px; height: 24px; border-radius: 6px;
  display: grid; place-items: center; font-size: 13px;
  background: var(--bg-elev-2); color: var(--text-dim);
}
.mode-bucket.is-active .mode-bucket-icon { background: var(--accent); color: #fff; }
.mode-bucket-step {
  font-size: 11px; color: var(--text-mute); font-weight: 700; letter-spacing: 1px;
}
.mode-bucket.is-active .mode-bucket-step { color: var(--accent); }
.mode-bucket-name { font-size: 14px; font-weight: 600; color: var(--text); }

.mode-row {
  display: flex; align-items: center; gap: 10px; width: 100%; text-align: left;
  padding: 10px 12px; margin: 0 -6px; border-radius: 10px;
  background: transparent; border: 0; cursor: pointer;
  color: var(--text); font: inherit;
}
.mode-row:hover { background: var(--bg-elev-2); }
.mode-row.is-active { background: rgba(79,158,255,0.06); }
.mode-row.is-disabled { opacity: 0.5; cursor: not-allowed; }

.mode-row-pill { width: 6px; height: 24px; border-radius: 3px; background: var(--bg-elev-2); flex-shrink: 0; }
.mode-row.is-done .mode-row-pill   { background: var(--good); }
.mode-row.is-active .mode-row-pill,
.mode-row.has-alert .mode-row-pill { background: var(--accent); }

.mode-row-text { flex: 1; min-width: 0; }
.mode-row-label { font-size: 13px; font-weight: 600; color: var(--text); }
.mode-row-desc { font-size: 11px; color: var(--text-mute); margin-top: 1px; }

.mode-row-badge {
  font-size: 11px; font-weight: 700;
  padding: 3px 8px; border-radius: 999px;
  background: var(--bg-elev-2); color: var(--text-dim);
}
.mode-row.is-done   .mode-row-badge { background: rgba(63,185,80,0.14); color: var(--good); }
.mode-row.is-active .mode-row-badge { background: rgba(79,158,255,0.14); color: var(--accent); }
.mode-row.is-critical.is-done .mode-row-badge { background: rgba(229,83,75,0.14); color: var(--again); }
.mode-row.has-alert .mode-row-badge { background: var(--accent); color: #fff; }

/* quick-jump strip */
.quickjump {
  background: var(--bg-elev); border: 1px solid var(--border);
  border-radius: 12px; padding: 4px 6px;
  display: flex; gap: 2px; overflow-x: auto; -webkit-overflow-scrolling: touch;
}
.quickjump button {
  background: transparent; color: var(--text-dim);
  border: 0; padding: 8px 12px; border-radius: 8px;
  font: inherit; font-size: 12px; cursor: pointer; white-space: nowrap;
}
.quickjump button.is-active { background: var(--bg-elev-2); color: var(--text); }
.quickjump button:hover { color: var(--text); }
```

### Acceptance
- Sheet detail page top-to-bottom: breadcrumb → sheet-hero card → mode-buckets
  → quickjump → existing tab content.
- The mode bucket with the active mode highlights blue.
- "Step Drill" badge inside the Drill bucket shows `4/6` when 4 of 6 drillable
  sections are mastered, and `✓` when all 6 are.
- "Critical Criteria" row uses red coloring (var(--again)) for badge + pill
  when not done, green when done.
- "Timed Simulation" row is rendered but disabled with badge text `soon`.
- The quickjump strip preserves all 9 existing tabs but in a more logical
  order; clicking still routes via the existing hash structure.

---

## Ticket 6 — Flashcard / SRS card polish

**File:** `js/views.js` (the SRS/flashcard view — search for the function that
renders `.study-pane` and the grade buttons; look near `study-meta`,
`flashcard`, `grade-`. Likely named `Views.flashcards` or rendered inside
`Views.sheet` when `tab === "study"`).
**File:** `css/styles.css` (`.study-pane` etc. ~line 388 onward).

### Target state
1. Header row: `← Exit session` ghost button + sheet name + small section
   eyebrow + a "Card 4 / 12" pill on the right.
2. Below header: 4px-tall progress bar showing position in the session
   (linear gradient `--accent` → `--good`).
3. Card body:
   - Section eyebrow (small caps): "PRIMARY SURVEY · Step 4 of 7"
   - Question typography goes from current 18px to 28px, font-weight 600,
     letter-spacing -0.3px, line-height 1.25.
   - Mnemonic question highlights the asked-about letter in `--accent` and
     renders the acronym (e.g. `OPQRST`) in monospace inside a `var(--bg-elev-2)`
     pill — already done in `mnemonicMatch` per README; just verify the styling.
   - "Tap to reveal" hint row at the bottom of the card front with a
     `<kbd>Space</kbd>` chip on the right.
4. Grade row: 4 buttons in equal-width flex. Each button shows label, next
   interval (e.g. `Again <1m`, `Hard 6m`, `Good 10m`, `Easy 4d`), and a
   `<kbd>1/2/3/4</kbd>` chip below. Colored labels using the existing
   `--again / --hard / --good / --easy` vars.
5. Footer row below the card: `+ Add a note to this step` link on the left,
   `Session avg 87% · 3m 12s spent` on the right (mute color, 12px).

### Compute next intervals
Use existing SRS helpers in `js/srs.js`. Pseudocode:

```js
function previewIntervals(rec, grades) {
  // returns { again: "<1m", hard: "6m", good: "10m", easy: "4d" }
  // Re-runs the SRS algorithm on a clone for each grade, formats the result.
}
function formatInterval(days) {
  if (days < 1/1440) return "<1m";
  if (days < 1)      return Math.round(days * 1440) + "m";
  if (days < 1/24)   return Math.round(days * 24) + "h";
  if (days < 30)     return Math.round(days) + "d";
  if (days < 365)    return Math.round(days / 30) + "mo";
  return Math.round(days / 365) + "y";
}
```

### CSS

```css
.study-pane { max-width: 760px; }

.study-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; gap: 12px; }
.study-header-left { display: flex; align-items: center; gap: 10px; }
.study-header-where { font-size: 12px; color: var(--text-dim); }
.study-header-where strong { color: var(--text); font-weight: 600; }

.study-progress {
  height: 4px; background: var(--bg-elev-2); border-radius: 999px;
  margin-bottom: 28px; overflow: hidden;
}
.study-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--accent), var(--good));
  transition: width .3s;
}

.flashcard {
  background: var(--bg-elev); border: 1px solid var(--border);
  border-radius: 20px; padding: 32px;
  min-height: 320px;
  display: flex; flex-direction: column;
  box-shadow: 0 24px 60px rgba(0,0,0,0.35);
}
.flashcard-eyebrow {
  font-size: 11px; color: var(--text-mute); letter-spacing: 1.2px;
  font-weight: 700; margin-bottom: 14px;
}
.flashcard-question {
  font-size: 26px; font-weight: 600; line-height: 1.25;
  letter-spacing: -0.3px; margin-bottom: 18px;
}
.flashcard-question .mnemonic-letter { color: var(--accent); }
.flashcard-acronym {
  font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace;
  background: var(--bg-elev-2); padding: 2px 10px; border-radius: 6px;
  font-size: 22px;
}
.flashcard-reveal-hint {
  padding: 16px; border-radius: 12px; background: var(--bg-elev-2);
  color: var(--text-dim); font-style: italic;
  display: flex; align-items: center; justify-content: space-between; gap: 12px;
}
.flashcard kbd {
  font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace;
  padding: 3px 8px; border-radius: 6px;
  background: var(--bg-elev); color: var(--text);
  border: 1px solid var(--border); font-size: 11px;
}

.grade-row {
  display: flex; gap: 6px; margin-top: 24px;
  padding-top: 16px; border-top: 1px solid var(--border);
}
.grade-btn {
  flex: 1; padding: 12px 8px; border-radius: 12px;
  background: transparent; border: 1px solid var(--border);
  color: var(--text); cursor: pointer; font: inherit;
  display: flex; flex-direction: column; align-items: center; gap: 2px;
}
.grade-btn:hover { border-color: var(--text-dim); }
.grade-btn-label { font-size: 14px; font-weight: 600; }
.grade-btn-label.is-again { color: var(--again); }
.grade-btn-label.is-hard  { color: var(--hard); }
.grade-btn-label.is-good  { color: var(--good); }
.grade-btn-label.is-easy  { color: var(--easy); }
.grade-btn-interval { font-size: 10px; color: var(--text-mute); }
.grade-btn-key {
  margin-top: 4px;
  font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace;
  font-size: 9px; padding: 1px 5px; border-radius: 4px;
  background: var(--bg-elev-2); color: var(--text-mute);
}

.flashcard-footer {
  display: flex; justify-content: space-between; align-items: center;
  margin-top: 14px; font-size: 12px; color: var(--text-mute);
}
.flashcard-footer strong { color: var(--text); }
```

### Acceptance
- The flashcard view's question text is visibly larger (26–28px) than before
  (was ~18px).
- All four grade buttons show their label + next interval underneath +
  number chip.
- `Space` reveals; `1`–`4` grade (preserve existing keyboard handlers).
- Progress bar reflects current card position in the session.

---

## Ticket 7 — Remove home-page roadmap, consolidate to Guide

The `.roadmap` block currently on Home lists Section Order Drill (shipped),
Step Sequence Drill (shipped), and "Timed run-through (soon)". Two of three
items are shipped; the third is a teaser. Cut it from Home entirely, and move
the upcoming-items list to a "What's coming" section at the bottom of the
existing Guide view (`Views.guide`). Delete `.roadmap` CSS rules.

---

## Suggested order of work

1. **Ticket 1** (sheet card upgrade) — biggest at-a-glance UX win, no data model changes.
2. **Ticket 3** (category grouping + sort) — depends on T1's helpers.
3. **Ticket 2** (Today hero) — depends on T1's `sheetMasteryPct` / `sheetDueCount` / `suggestNextModeForSheet`.
4. **Ticket 5** (sheet detail buckets) — reuses same helpers; pairs naturally with T2.
5. **Ticket 6** (flashcard polish) — independent, can ship any time.
6. **Ticket 4** (top nav + cog menu) — chrome polish, independent.
7. **Ticket 7** (roadmap removal) — trivial cleanup, do alongside T2.

## Non-goals (do not change in these tickets)
- The actual SRS algorithm in `js/srs.js`.
- The data model in `state` / `localStorage` / `data.json`.
- The preprocess pipeline.
- Cloud sync logic in `js/firebase.js`.
- Existing keyboard shortcuts.
- The Mnemonics, Medical Conditions, Chat, Backup, Stats, or Guide pages
  (except moving the roadmap snippet into Guide in T7).

## Testing
The existing Jest + DOM-shim setup in `tests/views.test.js` exercises every
view by rendering it. After each ticket, run `npm test` and confirm zero new
exceptions. Add a render-only smoke test for the Today hero and mode-buckets
where appropriate.
