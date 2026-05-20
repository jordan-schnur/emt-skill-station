import type { JSX } from "preact";
import { appState, navigate } from "../store/appStore";
import { NREMT_DATA } from "../data/sheets";
import { countSheetNotes } from "../lib/notes";
import { HelpIcon } from "../components/ui/HelpIcon";
import type { Sheet } from "../types";

const MASTERY_RUNS = 3;

function SheetCard({ sheet }: { sheet: Sheet }) {
  const state = appState.value;
  const noteCount = countSheetNotes(state, sheet);
  const secRec = state.drills?.secorder?.[sheet.id];

  let badge: JSX.Element | null = null;
  if (secRec?.mastered) {
    badge = <span class="sec-badge mastered" title="Section order mastered">order ✓</span>;
  } else if (secRec && secRec.streak > 0) {
    badge = (
      <span class="sec-badge progress" title={`Section order streak ${secRec.streak}/${MASTERY_RUNS}`}>
        order {secRec.streak}/{MASTERY_RUNS}
      </span>
    );
  }

  return (
    <div
      class="sheet-card"
      onClick={() => navigate({ view: "sheet", sheetId: sheet.id, tab: "sheet" })}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && navigate({ view: "sheet", sheetId: sheet.id, tab: "sheet" })}
    >
      <div class="row">
        <span class="sheet-id">{sheet.id.toUpperCase()}</span>
      </div>
      <div class="sheet-title">{sheet.title}</div>
      <div class="sheet-meta">
        {sheet.totalPoints} pts
        {sheet.timeLimit ? ` · ${sheet.timeLimit}` : ""}
        {noteCount ? ` · ${noteCount} note${noteCount === 1 ? "" : "s"}` : ""}
      </div>
      <div class="sheet-stats">
        {badge ?? <span>{sheet.category}</span>}
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
