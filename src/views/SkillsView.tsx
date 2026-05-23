import { useState } from "preact/hooks";
import { appState, navigate } from "../store/appStore";
import { NREMT_DATA } from "../data/sheets";
import { countSheetNotes } from "../lib/notes";
import { sheetMasteryPct } from "../lib/drillHelpers";
import { MasteryRing } from "./HomeView";
import type { AppState, Sheet } from "../types";

const MASTERY_RUNS = 3;

const CATEGORY_ORDER = [
  "Patient Assessment",
  "Airway / Ventilation",
  "Cardiac",
  "Trauma / Immobilization",
  "Trauma / Circulation",
];

// ─── DrillBadge ───────────────────────────────────────────────────────────────

export type BadgeState = "done" | "empty" | number | { done: number; total: number };

export function DrillBadge({ label, state: bs }: { label: string; state: BadgeState }) {
  if (bs === "done") return <span class="drill-badge is-done">{label} ✓</span>;
  if (bs === "empty") return <span class="drill-badge is-empty">{label}</span>;
  if (typeof bs === "number") {
    return <span class={`drill-badge ${bs >= 80 ? "is-done" : "is-progress"}`}>{label} {bs}%</span>;
  }
  const { done, total } = bs;
  if (done >= total && total > 0) return <span class="drill-badge is-done">{label} ✓</span>;
  if (done > 0) return <span class="drill-badge is-progress">{label} {done}/{total}</span>;
  return <span class="drill-badge is-empty">{label} 0/{total}</span>;
}

// ─── SheetCard ────────────────────────────────────────────────────────────────

export function SheetCard({ sheet }: { sheet: Sheet }) {
  const state = appState.value;
  const pct = sheetMasteryPct(state, sheet);
  const noteCount = countSheetNotes(state, sheet);

  const secRec = state.drills?.secorder?.[sheet.id];
  const wnRec = state.drills?.whatnext?.[sheet.id];
  const brRec = state.drills?.blankrecall?.[sheet.id];
  const ssRec = state.drills?.spokenscript?.[sheet.id];

  const orderState: BadgeState = secRec?.mastered
    ? "done"
    : secRec && secRec.streak > 0
    ? { done: secRec.streak, total: MASTERY_RUNS }
    : "empty";

  const drillableSections = sheet.sections.filter((s) => s.steps.length >= 2);
  const stepsMastered = drillableSections.filter(
    (s) => state.drills?.stepseq?.[sheet.id]?.[s.name]?.mastered,
  ).length;
  const stepsState: BadgeState =
    drillableSections.length === 0
      ? "empty"
      : stepsMastered === drillableSections.length && drillableSections.length > 0
      ? "done"
      : { done: stepsMastered, total: drillableSections.length };

  const nextState: BadgeState = wnRec?.mastered
    ? "done"
    : wnRec && wnRec.streak > 0
    ? { done: wnRec.streak, total: MASTERY_RUNS }
    : "empty";

  const recallState: BadgeState = brRec && brRec.attempts > 0 ? brRec.bestPct : "empty";

  const scriptState: BadgeState = ssRec?.mastered
    ? "done"
    : ssRec && ssRec.streak > 0
    ? { done: ssRec.streak, total: MASTERY_RUNS }
    : "empty";

  const critCount = sheet.criticalCriteria.length;
  const critState: BadgeState = critCount > 0 ? { done: 0, total: critCount } : "empty";

  return (
    <div
      class="sheet-card"
      onClick={() => navigate({ view: "sheet", sheetId: sheet.id, tab: "sheet" })}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && navigate({ view: "sheet", sheetId: sheet.id, tab: "sheet" })}
    >
      <div class="sheet-card-head">
        <MasteryRing pct={pct} />
        <div class="sheet-card-headtext">
          <span class="sheet-id">{sheet.id.toUpperCase()}</span>
          <div class="sheet-title">{sheet.shortTitle || sheet.title}</div>
          <div class="sheet-meta">
            {sheet.totalPoints} pts
            {sheet.timeLimit ? ` · ${sheet.timeLimit}` : ""}
            {noteCount ? ` · ${noteCount} note${noteCount === 1 ? "" : "s"}` : ""}
          </div>
        </div>
      </div>
      <div class="sheet-card-badges">
        {sheet.sections.length > 1 && <DrillBadge label="Order" state={orderState} />}
        <DrillBadge label="Steps" state={stepsState} />
        <DrillBadge label="Next?" state={nextState} />
        <DrillBadge label="Recall" state={recallState} />
        <DrillBadge label="Script" state={scriptState} />
        <DrillBadge label="Critical" state={critState} />
      </div>
    </div>
  );
}

// ─── SkillsView ───────────────────────────────────────────────────────────────

export function SkillsView() {
  const state = appState.value;
  const [sortMode, setSortMode] = useState(() => localStorage.getItem("nremt.home.sort") ?? "category");

  function handleSort(m: string) {
    localStorage.setItem("nremt.home.sort", m);
    setSortMode(m);
  }

  const flatSheets = (() => {
    if (sortMode === "mastery") {
      return NREMT_DATA.sheets.slice().sort((a, b) => sheetMasteryPct(state, a) - sheetMasteryPct(state, b));
    }
    return NREMT_DATA.sheets;
  })();

  return (
    <div>
      <div class="home-section-row">
        <h2 class="home-section-title">All sheets</h2>
        <div class="home-sort">
          {(["category", "mastery"] as const).map((id) => (
            <button
              key={id}
              class={`home-sort-btn${sortMode === id ? " is-active" : ""}`}
              onClick={() => handleSort(id)}
            >
              {id === "category" ? "By category" : "By mastery"}
            </button>
          ))}
        </div>
      </div>

      {sortMode === "category" ? (
        (() => {
          const groups: Record<string, Sheet[]> = {};
          for (const s of NREMT_DATA.sheets) {
            (groups[s.category] ??= []).push(s);
          }
          const ordered = [
            ...CATEGORY_ORDER.filter((k) => groups[k]),
            ...Object.keys(groups).filter((k) => !CATEGORY_ORDER.includes(k)),
          ];
          return (
            <>
              {ordered.map((cat) => (
                <div class="sheet-group" key={cat}>
                  <div class="sheet-group-head">
                    <h3 class="sheet-group-title">{cat}</h3>
                    <div class="sheet-group-rule" />
                    <span class="sheet-group-count">{groups[cat].length}</span>
                  </div>
                  <div class="sheet-grid">
                    {groups[cat].map((s) => <SheetCard key={s.id} sheet={s} />)}
                  </div>
                </div>
              ))}
            </>
          );
        })()
      ) : (
        <div class="sheet-grid">
          {flatSheets.map((s) => <SheetCard key={s.id} sheet={s} />)}
        </div>
      )}
    </div>
  );
}
