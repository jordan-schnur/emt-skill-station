import { useState } from "preact/hooks";
import { MarkdownEditor } from "../../components/ui/MarkdownEditor";
import { getStepNote, setStepNote } from "../../lib/notes";
import { appState, save, mutateState } from "../../store/appStore";
import { showToast } from "../../store/appStore";
import type { Sheet, Step } from "../../types";

// ─── Helpers ───────────────────────────────────────────────────────────────

function renderMarkdownHtml(text: string): string {
  if (!text || !text.trim()) return "";
  const m = (window as unknown as { marked?: { parse: (t: string, o?: object) => string } }).marked;
  return m ? m.parse(text, { breaks: true, gfm: true }) : text;
}

// ─── RefRow ────────────────────────────────────────────────────────────────

interface RefRowProps {
  cardId: string | null;
  text: string;
  points: number | null;
  isSub: boolean;
}

function RefRow({ cardId, text, points }: RefRowProps) {
  const state = appState.value;
  const note = cardId ? getStepNote(state, cardId) : "";
  const [editing, setEditing] = useState(false);

  function handleSave(val: string) {
    if (!cardId) return;
    mutateState((draft) => setStepNote(draft, cardId, val));
    save();
    showToast(val.trim() ? "Note saved" : "Note removed");
    setEditing(false);
  }

  return (
    <div>
      <div class="ref-row">
        <div class="text">{text}</div>
        <div class="points">{points ? String(points) : ""}</div>
        {cardId && !editing && (
          <button
            class={`note-btn${note ? " has-note" : ""}`}
            onClick={() => setEditing(true)}
          >
            {note ? "✎ note" : "+ note"}
          </button>
        )}
      </div>
      {editing && cardId && (
        <MarkdownEditor
          value={getStepNote(appState.value, cardId)}
          placeholder="Your private note for this step…"
          saveLabel="Save note"
          onSave={handleSave}
          onCancel={() => setEditing(false)}
        />
      )}
      {!editing && note && (
        <div class="card-note ref-note-display">
          <span class="label">Your note</span>
          <div class="md-content" dangerouslySetInnerHTML={{ __html: renderMarkdownHtml(note) }} />
        </div>
      )}
    </div>
  );
}

// ─── Section renderer ───────────────────────────────────────────────────────

function renderStepRows(sheet: Sheet, sectionName: string, steps: Step[]) {
  return steps.map((step, stepIdx) => {
    const substeps = step.substeps || [];
    const cardId = substeps.length ? null : `${sheet.id}::${sectionName}::${stepIdx}`;
    return (
      <div key={stepIdx}>
        <RefRow cardId={cardId} text={step.text} points={step.points ?? null} isSub={false} />
        {step.examinerNote && <div class="examiner-line">Examiner: {step.examinerNote}</div>}
        {step.note && <div class="examiner-line">{step.note}</div>}
        {step.mnemonic && <div class="examiner-line">Mnemonic: {step.mnemonic}</div>}
        {substeps.length > 0 && (
          <div class="ref-sub">
            {substeps.map((sub, subIdx) => (
              <RefRow
                key={subIdx}
                cardId={`${sheet.id}::${sectionName}::${stepIdx}::${subIdx}`}
                text={sub.text}
                points={sub.points ?? null}
                isSub={true}
              />
            ))}
          </div>
        )}
      </div>
    );
  });
}

// ─── Main component ────────────────────────────────────────────────────────

interface Props {
  sheet: Sheet;
}

export function ReferenceView({ sheet }: Props) {
  return (
    <div>
      {sheet.sections.map((section) => (
        <div key={section.name} class="ref-section">
          {section.header ? (
            <details open>
              <summary class="ref-section-summary">
                <span class="ref-section-name">{section.name}</span>
                <span class="ref-section-count">
                  {section.steps.length} step{section.steps.length !== 1 ? "s" : ""}
                </span>
              </summary>
              {renderStepRows(sheet, section.name, section.steps)}
            </details>
          ) : (
            renderStepRows(sheet, section.name, section.steps)
          )}
        </div>
      ))}

      {/* Critical criteria */}
      <details open class="ref-section">
        <summary class="ref-section-summary ref-section-summary--critical">
          <span class="ref-section-name">Critical Criteria</span>
          <span class="ref-section-count">auto-fail</span>
        </summary>
        <ul class="critical-list">
          {sheet.criticalCriteria.map((cc, i) => <li key={i}>{cc}</li>)}
        </ul>
      </details>
    </div>
  );
}
