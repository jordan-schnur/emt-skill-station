import { appState, navigate } from "../store/appStore";
import { NREMT_DATA } from "../data/sheets";
import { countSheetNotes } from "../lib/notes";
import { HelpIcon } from "../components/ui/HelpIcon";
import { sheetMasteryPct } from "../lib/drillHelpers";
import type { Sheet } from "../types";

const MASTERY_RUNS = 3;

function MasteryRing({ pct }: { pct: number }) {
  const size = 52;
  const stroke = 5;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const fill = (pct / 100) * circ;
  const color =
    pct >= 85 ? "var(--good)" :
    pct >= 50 ? "var(--accent)" :
    pct >= 20 ? "var(--hard)" :
    "var(--text-mute)";

  return (
    <div class="mastery-ring" aria-label={`${Math.round(pct)}% mastery`}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border)" strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={`${fill} ${circ}`} strokeLinecap="round"
        />
      </svg>
      <span class="mastery-ring-label" style={{ color }}>
        {Math.round(pct)}<sup>%</sup>
      </span>
    </div>
  );
}

type BadgeState = "done" | "empty" | number | { done: number; total: number };

function DrillBadge({ label, state: bs }: { label: string; state: BadgeState }) {
  if (bs === "done") {
    return <span class="drill-badge is-done">{label} ✓</span>;
  }
  if (bs === "empty") {
    return <span class="drill-badge is-empty">{label}</span>;
  }
  if (typeof bs === "number") {
    return <span class={`drill-badge ${bs >= 80 ? "is-done" : "is-progress"}`}>{label} {bs}%</span>;
  }
  const { done, total } = bs;
  if (done >= total && total > 0) {
    return <span class="drill-badge is-done">{label} ✓</span>;
  }
  return <span class="drill-badge is-progress">{label} {done}/{total}</span>;
}

function SheetCard({ sheet }: { sheet: Sheet }) {
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
    (s) => state.drills?.stepseq?.[sheet.id]?.[s.name]?.mastered
  ).length;
  const stepsState: BadgeState =
    drillableSections.length === 0
      ? "empty"
      : stepsMastered === drillableSections.length
      ? "done"
      : stepsMastered > 0
      ? { done: stepsMastered, total: drillableSections.length }
      : "empty";

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
          <div class="sheet-title">{sheet.title}</div>
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
        <span class="drill-badge is-empty">{sheet.criticalCriteria.length} crit</span>
      </div>
    </div>
  );
}

export function HomeView() {
  return (
    <div>
      <h1>NREMT Skill Sheet Trainer</h1>
      <p class="subtitle">
        Pick a skill sheet to study. Use the drills to master section order, step sequences, and more.
        <HelpIcon
          title="How the home screen works"
          bodyHTML={`<p>Click any sheet to open it. Each sheet has multiple study modes available via the tab row at the top.</p>
          <p>See the <strong>Guide</strong> page (top nav) for a full explanation of every study mode.</p>`}
        />
      </p>

      <div class="sheet-grid">
        {NREMT_DATA.sheets.map((sheet) => (
          <SheetCard key={sheet.id} sheet={sheet} />
        ))}
      </div>

      <div class="roadmap">
        <h2>Coming next</h2>
        <p class="muted">
          Open any sheet and use the Order Drill tab to learn sections in sequence. More modes coming:
        </p>
        <ul>
          <li><span class="tag shipped">✓ live</span>Section Order Drill — drag the major sections of each sheet into the correct exam order</li>
          <li><span class="tag shipped">✓ live</span>Step Sequence Drill — pick a section, drag its steps into the correct exam order</li>
          <li><span class="tag">soon</span>Timed run-through — simulate the 10/15 minute station with a checklist and stopwatch</li>
        </ul>
      </div>
    </div>
  );
}
