import { useState } from "preact/hooks";
import { appState, mutateState, save, showToast } from "../../store/appStore";
import { NREMT_MNEMONICS } from "../../data/mnemonics";
import type { Sheet } from "../../types";

interface Props { sheet: Sheet }

interface MnemonicCardProps {
  label: string;
  fieldKey: "sections" | "steps";
  sectionName: string | null;
  stepList: string[];
  currentVal: string;
  isCustom: boolean;
  onSave: (val: string) => void;
  onReset: () => void;
}

function MnemonicCard({ label, fieldKey, sectionName, stepList, currentVal, isCustom, onSave, onReset }: MnemonicCardProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(currentVal);

  function handleSave() {
    onSave(draft.trim());
    showToast("Mnemonic saved");
    setEditing(false);
  }

  const words = currentVal.trim().split(/\s+/).map(w => w.replace(/[^a-zA-Z]/g, "")).filter(Boolean);
  const canBreakdown = stepList.length > 0 && words.length === stepList.length;

  return (
    <div class="mnemonic-card">
      <div class="mnemonic-card-header">
        <div class="mnemonic-card-label">{label}</div>
        {isCustom && (
          <button class="btn-ghost btn btn-sm" type="button" onClick={onReset}>
            Reset to default
          </button>
        )}
      </div>

      {stepList.length > 0 && (
        <details class="mnemonic-steps-details">
          <summary class="mnemonic-steps-toggle">{stepList.length} steps</summary>
          <ol class="mnemonic-steps-list">
            {stepList.map((s, i) => <li key={i}>{s}</li>)}
          </ol>
        </details>
      )}

      <div class="mnemonic-display-wrap">
        {editing ? (
          <>
            <textarea
              class="mnemonic-textarea"
              rows={3}
              placeholder="Type your mnemonic…"
              value={draft}
              onInput={e => setDraft((e.target as HTMLTextAreaElement).value)}
              autoFocus
            />
            <div class="mnemonic-editor-actions">
              <button class="btn btn-sm btn-primary" type="button" onClick={handleSave}>Save</button>
              <button class="btn btn-sm btn-ghost" type="button" onClick={() => { setDraft(currentVal); setEditing(false); }}>Cancel</button>
            </div>
          </>
        ) : (
          <>
            {!currentVal ? (
              <div class="mnemonic-display mnemonic-empty">No mnemonic yet.</div>
            ) : (
              <>
                <div class="mnemonic-sentence">{currentVal}</div>
                {canBreakdown && (
                  <>
                    <div class="mnemonic-acronym">{words.map(w => w[0].toUpperCase()).join(" · ")}</div>
                    <div class="mnemonic-breakdown">
                      {words.map((word, i) => (
                        <div class="mnemonic-row" key={i}>
                          <span class="mnemonic-word">
                            <strong class="mnemonic-letter">{word[0].toUpperCase()}</strong>
                            {word.slice(1).toLowerCase()}
                          </span>
                          <span class="mnemonic-arrow">→</span>
                          <span class="mnemonic-step-label">
                            {stepList[i].length > 72 ? stepList[i].slice(0, 70) + "…" : stepList[i]}
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </>
            )}
            <button class="btn btn-sm btn-secondary" type="button" onClick={() => { setDraft(currentVal); setEditing(true); }}>
              Edit
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export function MnemonicsView({ sheet }: Props) {
  const state = appState.value;
  const defaults = NREMT_MNEMONICS[sheet.id] ?? { sections: undefined, steps: {} };
  const overrides = state.mnemonics?.[sheet.id] ?? {};

  function getVal(key: "sections" | "steps", sectionName: string | null): string {
    if (key === "sections") {
      return overrides.sections !== undefined ? (overrides.sections ?? "") : (defaults.sections ?? "");
    }
    const name = sectionName!;
    return overrides.steps?.[name] !== undefined
      ? (overrides.steps[name] ?? "")
      : (defaults.steps?.[name] ?? "");
  }

  function isCustom(key: "sections" | "steps", sectionName: string | null): boolean {
    if (key === "sections") return overrides.sections !== undefined;
    return (overrides.steps ?? {})[sectionName!] !== undefined;
  }

  function saveVal(key: "sections" | "steps", sectionName: string | null, val: string) {
    mutateState(draft => {
      if (!draft.mnemonics) draft.mnemonics = {};
      if (!draft.mnemonics[sheet.id]) draft.mnemonics[sheet.id] = {};
      if (key === "sections") {
        draft.mnemonics[sheet.id].sections = val;
      } else {
        if (!draft.mnemonics[sheet.id].steps) draft.mnemonics[sheet.id].steps = {};
        draft.mnemonics[sheet.id].steps![sectionName!] = val;
      }
    });
    save();
  }

  function resetVal(key: "sections" | "steps", sectionName: string | null) {
    mutateState(draft => {
      const entry = draft.mnemonics?.[sheet.id];
      if (!entry) return;
      if (key === "sections") delete entry.sections;
      else if (entry.steps) delete entry.steps[sectionName!];
    });
    save();
    showToast("Reset to default");
  }

  const headerSections = sheet.sections.filter(s => s.header);

  return (
    <div class="mnemonics-pane">
      <p class="muted">
        AI-generated memory aids for each section and its steps. Edit any mnemonic to make it your own.
      </p>

      {headerSections.length > 1 && (
        <>
          <h3>Section order</h3>
          <MnemonicCard
            key={`${sheet.id}:sections`}
            label="Remember the order of all sections"
            fieldKey="sections"
            sectionName={null}
            stepList={headerSections.map(s => s.name)}
            currentVal={getVal("sections", null)}
            isCustom={isCustom("sections", null)}
            onSave={val => saveVal("sections", null, val)}
            onReset={() => resetVal("sections", null)}
          />
        </>
      )}

      <h3>Steps within each section</h3>
      {sheet.sections
        .filter(s => s.steps.length >= 2)
        .map(sec => (
          <MnemonicCard
            key={`${sheet.id}:${sec.name}`}
            label={sec.name}
            fieldKey="steps"
            sectionName={sec.name}
            stepList={sec.steps.map(s => s.text)}
            currentVal={getVal("steps", sec.name)}
            isCustom={isCustom("steps", sec.name)}
            onSave={val => saveVal("steps", sec.name, val)}
            onReset={() => resetVal("steps", sec.name)}
          />
        ))}
    </div>
  );
}
