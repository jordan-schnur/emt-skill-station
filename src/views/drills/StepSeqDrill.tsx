import { useState } from "preact/hooks";
import { appState, navigate, mutateState, save } from "../../store/appStore";
import { HelpIcon } from "../../components/ui/HelpIcon";
import { DraggableList } from "../../components/ui/DraggableList";
import { shuffle } from "../../lib/drillHelpers";
import type { Sheet, Section } from "../../types";

const MASTERY_RUNS = 3;

// ─── Mini Drill (missed steps sub-drill) ────────────────────────────────────

interface MiniDrillProps {
  section: Section;
  missedTexts: string[];
  onBack: () => void;
}

function MiniDrill({ section, missedTexts, onBack }: MiniDrillProps) {
  const miniCorrect = section.steps.map((s) => s.text).filter((t) => missedTexts.includes(t));
  const [miniItems, setMiniItems] = useState<string[]>(() => shuffle([...missedTexts]));
  const [miniSubmitted, setMiniSubmitted] = useState(false);
  const [miniCorrectness, setMiniCorrectness] = useState<boolean[]>([]);

  function reorder(from: number, to: number) {
    setMiniItems((prev) => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  }

  function moveItem(idx: number, dir: number) {
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= miniItems.length) return;
    setMiniItems((prev) => {
      const next = [...prev];
      [next[idx], next[newIdx]] = [next[newIdx], next[idx]];
      return next;
    });
  }

  function miniCheck() {
    setMiniCorrectness(miniItems.map((t, i) => t === miniCorrect[i]));
    setMiniSubmitted(true);
  }

  const allOk = miniSubmitted && miniCorrectness.every(Boolean);

  return (
    <div class="drill-pane">
      <div class="drill-header">
        <h2 class="drill-title">Practicing missed steps</h2>
        <div class="card-section">{section.name}</div>
        <p class="drill-hint muted">Drag to reorder · tap ↑↓ to nudge</p>
      </div>

      <DraggableList
        items={miniItems}
        onReorder={reorder}
        submitted={miniSubmitted}
        labelClass="order-name step-name"
        itemClass={(item, idx) =>
          "order-item" + (miniSubmitted ? (miniCorrectness[idx] ? " item-correct" : " item-wrong") : "")
        }
        renderRight={(item, idx) => (
          <div style={{ display: "contents" }}>
            {miniSubmitted && !miniCorrectness[idx] && (
              <span class="order-feedback">→ position {miniCorrect.indexOf(item) + 1}</span>
            )}
            <div class="arrow-btns">
              <button
                class="arrow-btn"
                disabled={idx === 0}
                aria-label="Move up"
                onClick={(e) => { e.stopPropagation(); moveItem(idx, -1); }}
              >↑</button>
              <button
                class="arrow-btn"
                disabled={idx === miniItems.length - 1}
                aria-label="Move down"
                onClick={(e) => { e.stopPropagation(); moveItem(idx, 1); }}
              >↓</button>
            </div>
          </div>
        )}
      />

      {!miniSubmitted ? (
        <div class="drill-actions">
          <button class="btn btn-primary" onClick={miniCheck}>Check my order</button>
        </div>
      ) : (
        <>
          <div class={"drill-result " + (allOk ? "result-pass" : "result-fail")}>
            <div class="result-icon">{allOk ? "✓" : "✗"}</div>
            <div>
              <strong>{allOk ? "Got them all!" : "Check corrections above."}</strong>
            </div>
          </div>
          <div class="drill-actions">
            <button class="btn btn-primary" onClick={onBack}>Back to full drill</button>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Section Picker ──────────────────────────────────────────────────────────

interface SectionPickerProps {
  sheet: Sheet;
  drillableSections: Section[];
  onSelect: (section: Section) => void;
}

function SectionPicker({ sheet, drillableSections, onSelect }: SectionPickerProps) {
  const state = appState.value;
  const masteredCount = drillableSections.filter(
    (s) => state.drills?.stepseq?.[sheet.id]?.[s.name]?.mastered
  ).length;

  return (
    <div class="drill-pane">
      <div class="drill-header">
        <div class="drill-title-row">
          <h2 class="drill-title">Step Sequence Drill</h2>
          {masteredCount === drillableSections.length && drillableSections.length > 0 && (
            <span class="mastered-badge">✓ All Mastered</span>
          )}
          <HelpIcon
            title="Step Sequence Drill"
            bodyHTML={`<p>Pick a section, then drag its steps into the correct exam order.</p>
              <p>Each section is tracked independently — <strong>3 correct in a row per section</strong> = mastered. Sections with fewer than 2 steps are skipped.</p>
              <p>Filled circles below each section name show your current streak toward mastery.</p>`}
          />
        </div>
        <p class="drill-sub muted">
          Pick a section. Drag its steps into the correct exam order. {MASTERY_RUNS} correct in a row = section mastered.
        </p>
      </div>

      {drillableSections.length === 0 ? (
        <p class="muted">No multi-step sections found.</p>
      ) : (
        <div class="section-picker">
          {drillableSections.map((section) => {
            const m = state.drills?.stepseq?.[sheet.id]?.[section.name] ?? { streak: 0, attempts: 0, mastered: false };
            return (
              <div
                key={section.name}
                class={"picker-row" + (m.mastered ? " mastered" : "")}
                onClick={() => onSelect(section)}
              >
                <div class="picker-info">
                  <div class="picker-name">{section.name}</div>
                  <div class="picker-meta muted">
                    {section.steps.length} steps
                    {m.attempts ? ` · ${m.attempts} attempt${m.attempts === 1 ? "" : "s"}` : ""}
                  </div>
                </div>
                <div class="picker-right">
                  {m.mastered ? (
                    <span class="mastered-badge">✓</span>
                  ) : (
                    <div class="streak-row">
                      {Array.from({ length: MASTERY_RUNS }, (_, i) => (
                        <span key={i} class={"streak-pip" + (i < m.streak ? " filled" : "")} />
                      ))}
                    </div>
                  )}
                </div>
                <span class="picker-arrow">→</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Single Section Drill ────────────────────────────────────────────────────

interface SectionDrillProps {
  sheet: Sheet;
  section: Section;
  drillableSections: Section[];
  onBack: () => void;
}

function SectionDrill({ sheet, section, drillableSections, onBack }: SectionDrillProps) {
  const correctOrder = section.steps.map((s) => s.text);
  const [items, setItems] = useState<string[]>(() => shuffle(correctOrder));
  const [submitted, setSubmitted] = useState(false);
  const [correctness, setCorrectness] = useState<boolean[]>([]);
  const [miniMissed, setMiniMissed] = useState<string[] | null>(null);

  const m = appState.value.drills?.stepseq?.[sheet.id]?.[section.name] ?? { streak: 0, attempts: 0, mastered: false };

  function reorder(from: number, to: number) {
    setItems((prev) => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  }

  function moveItem(idx: number, dir: number) {
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= items.length) return;
    setItems((prev) => {
      const next = [...prev];
      [next[idx], next[newIdx]] = [next[newIdx], next[idx]];
      return next;
    });
  }

  function checkOrder() {
    const newCorrectness = items.map((text, idx) => text === correctOrder[idx]);
    const allCorrect = newCorrectness.every(Boolean);
    mutateState((draft) => {
      if (!draft.drills.stepseq) draft.drills.stepseq = {};
      if (!draft.drills.stepseq[sheet.id]) draft.drills.stepseq[sheet.id] = {};
      if (!draft.drills.stepseq[sheet.id][section.name]) {
        draft.drills.stepseq[sheet.id][section.name] = { streak: 0, attempts: 0, mastered: false };
      }
      const r = draft.drills.stepseq[sheet.id][section.name];
      r.attempts += 1;
      if (allCorrect) {
        r.streak += 1;
        if (r.streak >= MASTERY_RUNS) r.mastered = true;
      } else {
        r.streak = 0;
      }
      draft.stats.totalReviews = (draft.stats.totalReviews || 0) + 1;
    });
    save();
    setCorrectness(newCorrectness);
    setSubmitted(true);
  }

  function reshuffle() {
    setItems(shuffle(correctOrder));
    setSubmitted(false);
    setCorrectness([]);
    setMiniMissed(null);
  }

  if (miniMissed) {
    return (
      <MiniDrill
        section={section}
        missedTexts={miniMissed}
        onBack={reshuffle}
      />
    );
  }

  const allCorrect = submitted && correctness.every(Boolean);
  const latestM = appState.value.drills?.stepseq?.[sheet.id]?.[section.name] ?? m;
  const missedTexts = submitted ? items.filter((_, idx) => !correctness[idx]) : [];

  return (
    <div class="drill-pane">
      <div class="drill-header">
        {drillableSections.length > 1 && (
          <button class="btn-link" style="padding:0 0 8px;display:block" onClick={onBack}>
            ← All sections
          </button>
        )}
        <div class="drill-title-row">
          <h2 class="drill-title">Step Sequence Drill</h2>
          {latestM.mastered && <span class="mastered-badge">✓ Mastered</span>}
        </div>
        <div class="card-section">{sheet.id.toUpperCase()} · {section.name}</div>
        <div class="streak-row">
          <span class="streak-label">Streak </span>
          {Array.from({ length: MASTERY_RUNS }, (_, i) => (
            <span key={i} class={"streak-pip" + (i < latestM.streak ? " filled" : "")} />
          ))}
          <span class="muted">
            {" "}{latestM.streak}/{MASTERY_RUNS}
            {latestM.attempts ? ` · ${latestM.attempts} attempt${latestM.attempts === 1 ? "" : "s"}` : ""}
          </span>
        </div>
        <p class="drill-hint muted">Drag to reorder · tap ↑↓ to nudge</p>
      </div>

      <DraggableList
        items={items}
        onReorder={reorder}
        submitted={submitted}
        labelClass="order-name step-name"
        itemClass={(item, idx) =>
          "order-item" + (submitted ? (correctness[idx] ? " correct" : " wrong") : "")
        }
        renderRight={(item, idx) =>
          submitted ? (
            <span class="order-check">
              {correctness[idx] ? "✓" : `✗ · should be #${correctOrder.indexOf(item) + 1}`}
            </span>
          ) : (
            <div class="order-arrows">
              <button
                class="arrow-btn"
                disabled={idx === 0}
                aria-label="Move up"
                onClick={(e) => { e.stopPropagation(); moveItem(idx, -1); }}
              >↑</button>
              <button
                class="arrow-btn"
                disabled={idx === items.length - 1}
                aria-label="Move down"
                onClick={(e) => { e.stopPropagation(); moveItem(idx, 1); }}
              >↓</button>
            </div>
          )
        }
      />

      {!submitted ? (
        <div class="drill-actions">
          <button class="btn btn-primary" onClick={checkOrder}>Check my order</button>
          <button class="btn btn-ghost" onClick={reshuffle}>Reshuffle</button>
        </div>
      ) : (
        <>
          <div class={"drill-result " + (allCorrect ? "result-pass" : "result-fail")}>
            <div class="result-icon">{allCorrect ? "✓" : "✗"}</div>
            {allCorrect ? (
              <div>
                <strong>{latestM.mastered ? "Section mastered!" : "Correct order!"}</strong>
                <p>{latestM.mastered ? "You know this section cold." : `Streak: ${latestM.streak} / ${MASTERY_RUNS} — keep going!`}</p>
              </div>
            ) : (
              <div>
                <strong>Not quite — check corrections above.</strong>
                <p>Streak reset. Try again, or open Full sheet to review.</p>
              </div>
            )}
            <div class="drill-actions">
              <button class="btn btn-primary" onClick={reshuffle}>Try again</button>
              {drillableSections.length > 1 && (
                <button class="btn" onClick={onBack}>Pick another section</button>
              )}
              <button
                class="btn btn-ghost"
                onClick={() => navigate({ view: "sheet", sheetId: sheet.id, tab: "sheet" })}
              >
                Full sheet →
              </button>
            </div>
          </div>
          {!allCorrect && (
            <>
              <details class="hint-details">
                <summary class="muted">Show correct order</summary>
                <ol class="correct-order-list">
                  {correctOrder.map((t) => <li key={t}>{t}</li>)}
                </ol>
              </details>
              {missedTexts.length > 0 && (
                <div class="drill-actions">
                  <button class="btn btn-primary" onClick={() => setMiniMissed(missedTexts)}>
                    Practice {missedTexts.length} missed step{missedTexts.length === 1 ? "" : "s"} →
                  </button>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

// ─── Main StepSeqDrill ───────────────────────────────────────────────────────

export function StepSeqDrill({ sheet }: { sheet: Sheet }) {
  const drillableSections = sheet.sections.filter((s) => s.steps.length >= 2);
  const [activeSection, setActiveSection] = useState<Section | null>(
    drillableSections.length === 1 ? drillableSections[0] : null
  );

  if (activeSection) {
    return (
      <SectionDrill
        sheet={sheet}
        section={activeSection}
        drillableSections={drillableSections}
        onBack={() => setActiveSection(null)}
      />
    );
  }

  return (
    <SectionPicker
      sheet={sheet}
      drillableSections={drillableSections}
      onSelect={setActiveSection}
    />
  );
}
