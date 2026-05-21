import { useState } from "preact/hooks";
import { appState, navigate } from "../store/appStore";
import { NREMT_DATA } from "../data/sheets";
import { countSheetNotes } from "../lib/notes";
import { sheetMasteryPct } from "../lib/drillHelpers";
import type { AppState, Sheet, SheetTab } from "../types";

const MASTERY_RUNS = 3;

// ─── Next-mode suggestion ─────────────────────────────────────────────────────

function suggestNextModeForSheet(state: AppState, sheet: Sheet): { tab: SheetTab; label: string } {
  const drillable = sheet.sections.filter((s) => s.steps.length >= 2);
  const seqRecs = state.drills?.stepseq?.[sheet.id] ?? {};
  if (sheet.sections.length > 1 && !state.drills?.secorder?.[sheet.id]?.mastered) {
    return { tab: "order", label: "Section Order Drill" };
  }
  const nextSec = drillable.find((s) => !seqRecs[s.name]?.mastered);
  if (nextSec) return { tab: "steps", label: `Step Drill — ${nextSec.name}` };
  if ((state.drills?.blankrecall?.[sheet.id]?.bestPct ?? 0) < 90) {
    return { tab: "recall", label: "Blank Recall" };
  }
  return { tab: "sheet", label: "Full sheet review" };
}

// ─── MasteryRing ──────────────────────────────────────────────────────────────

export function MasteryRing({ pct, size = 52, stroke = 5 }: { pct: number; size?: number; stroke?: number }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const fill = (pct / 100) * circ;
  const color =
    pct >= 85 ? "var(--good)" :
    pct >= 50 ? "var(--accent)" :
    pct >= 20 ? "var(--hard)" :
    "var(--text-mute)";

  return (
    <div class="mastery-ring" style={{ width: size, height: size }} aria-label={`${Math.round(pct)}% mastery`}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border)" strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={`${fill} ${circ}`} strokeLinecap="round"
        />
      </svg>
      <span class="mastery-ring-label" style={{ color, fontSize: size > 60 ? 15 : 11 }}>
        {Math.round(pct)}<sup>%</sup>
      </span>
    </div>
  );
}

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

// ─── Today hero ───────────────────────────────────────────────────────────────

function TodayHero() {
  const state = appState.value;
  const sheets = NREMT_DATA.sheets;

  // Weakest-mastery sheet → "Start now" target
  let target = sheets[0];
  let targetPct = 101;
  for (const s of sheets) {
    const p = sheetMasteryPct(state, s);
    if (p < targetPct) { targetPct = p; target = s; }
  }
  const nextMode = suggestNextModeForSheet(state, target);

  const overallPct = Math.round(sheets.reduce((a, s) => a + sheetMasteryPct(state, s), 0) / sheets.length);
  const masteredCount = sheets.filter((s) => sheetMasteryPct(state, s) >= 80).length;

  const dateLabel = new Date().toLocaleDateString("en-US", {
    weekday: "long", month: "short", day: "numeric",
  }).toUpperCase();

  // Week sparkline — uses dailyReviewLog if available, else all zeros
  const rawLog = (state.stats as unknown as Record<string, unknown> & { dailyReviewLog?: Record<string, number> }).dailyReviewLog;
  const weekBars: number[] = (() => {
    if (!rawLog) return Array(7).fill(0) as number[];
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today); d.setDate(d.getDate() - (6 - i));
      return rawLog[d.toISOString().slice(0, 10)] ?? 0;
    });
  })();
  const weekMax = Math.max(...weekBars, 1);
  const weekTotal = weekBars.reduce((a, b) => a + b, 0);
  const dayLetters = ["M", "T", "W", "T", "F", "S", "S"];
  const todayDow = (new Date().getDay() + 6) % 7; // Mon = 0

  const headline = masteredCount === sheets.length
    ? "All sheets mastered. Keep practicing to stay sharp."
    : masteredCount === 0
    ? <>Let's get started. Begin with <strong>{target.shortTitle || target.title}</strong>.</>
    : <>{masteredCount} of {sheets.length} sheets at 80%+. Next: <strong>{target.shortTitle || target.title}</strong>.</>;

  return (
    <div class="today-row">
      <div class="today-card">
        <div class="today-eyebrow">{dateLabel}</div>
        <h1 class="today-headline">{headline}</h1>
        <p class="today-suggestion">
          Suggested: <strong>{nextMode.label}</strong>.
        </p>
        <div class="today-actions">
          <button
            class="btn btn-primary btn-large"
            onClick={() => navigate({ view: "sheet", sheetId: target.id, tab: nextMode.tab })}
          >
            ▶ Start now
          </button>
          <button
            class="btn btn-ghost"
            onClick={() => document.querySelector<HTMLElement>(".home-section-row")?.scrollIntoView({ behavior: "smooth" })}
          >
            Browse sheets
          </button>
        </div>
      </div>

      <div class="today-stats">
        <div class="today-stats-card">
          <MasteryRing pct={overallPct} size={64} stroke={6} />
          <div>
            <div class="today-stats-label">OVERALL MASTERY</div>
            <div class="today-stats-value">{masteredCount} of {sheets.length} sheets ≥ 80%</div>
          </div>
        </div>
        <div class="today-stats-card today-stats-week">
          <div class="today-stats-label">THIS WEEK</div>
          <div class="today-week-bars">
            {weekBars.map((n, i) => {
              const dow = (todayDow - (6 - i) + 7) % 7;
              return (
                <div class="today-week-col" key={i}>
                  <div
                    class={`today-week-bar${i === 6 ? " is-today" : ""}`}
                    style={{ height: `${Math.max(3, Math.round(n / weekMax * 56))}px` }}
                  />
                  <div class="today-week-label">{dayLetters[dow]}</div>
                </div>
              );
            })}
          </div>
          <div class="today-stats-value">
            {weekTotal > 0 ? `${weekTotal} reviews this week` : `${state.stats.totalReviews} total reviews`}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Category grouping helpers ────────────────────────────────────────────────

const CATEGORY_ORDER = [
  "Patient Assessment",
  "Airway / Ventilation",
  "Cardiac",
  "Trauma / Immobilization",
  "Trauma / Circulation",
];

// ─── HomeView ─────────────────────────────────────────────────────────────────

export function HomeView() {
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
      <TodayHero />

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
