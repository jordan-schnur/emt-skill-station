import { useState, useRef, useEffect } from "preact/hooks";
import { appState, mutateState, save } from "../../store/appStore";
import { HelpIcon } from "../../components/ui/HelpIcon";
import { buildScriptSequence, jaccardSimilarity } from "../../lib/drillHelpers";
import type { ScriptStep } from "../../lib/drillHelpers";
import type { Sheet } from "../../types";

const MASTERY_RUNS = 3;
const PASS_RATE = 0.8;
const THRESHOLD = 0.45;

interface StepResult {
  step: ScriptStep;
  typed: string;
  matched: boolean;
  score: number;
  skipped?: boolean;
}

type Phase = "practicing" | "results";

export function SpokenScriptView({ sheet }: { sheet: Sheet }) {
  const steps = buildScriptSequence(sheet);

  if (steps.length === 0) {
    return (
      <div class="drill-pane">
        <div class="drill-header">
          <h2>Spoken Script</h2>
        </div>
        <div class="empty-state">
          <p>No spoken scripts available for this sheet.</p>
          <p class="muted">Run: python3 preprocess.py --generate-scripts</p>
        </div>
      </div>
    );
  }

  const [phase, setPhase] = useState<Phase>("practicing");
  const [stepIdx, setStepIdx] = useState(0);
  const [results, setResults] = useState<StepResult[]>([]);
  const [checkedCurrent, setCheckedCurrent] = useState(false);
  const [feedback, setFeedback] = useState<{ matched: boolean; expected: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const rec = appState.value.drills?.spokenscript?.[sheet.id] ?? { streak: 0, mastered: false, attempts: 0, lastScore: null };

  useEffect(() => {
    if (phase === "practicing") {
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [stepIdx, phase]);

  function onCheck() {
    if (checkedCurrent) return;
    const typed = inputRef.current?.value.trim() ?? "";
    const step = steps[stepIdx];
    const score = jaccardSimilarity(typed, step.spokenScript);
    const matched = score >= THRESHOLD && typed.length > 0;
    const newResult: StepResult = { step, typed, matched, score };
    setResults((prev) => [...prev, newResult]);
    setFeedback({ matched, expected: step.spokenScript });
    setCheckedCurrent(true);
  }

  function onSkip() {
    if (checkedCurrent) return;
    const step = steps[stepIdx];
    const newResult: StepResult = { step, typed: "", matched: false, score: 0, skipped: true };
    const newResults = [...results, newResult];
    setResults(newResults);
    setCheckedCurrent(true);
    if (stepIdx + 1 < steps.length) {
      setStepIdx(stepIdx + 1);
      setCheckedCurrent(false);
      setFeedback(null);
    } else {
      finishRun(newResults);
    }
  }

  function onNext() {
    if (stepIdx + 1 < steps.length) {
      setStepIdx(stepIdx + 1);
      setCheckedCurrent(false);
      setFeedback(null);
    } else {
      finishRun(results);
    }
  }

  function finishRun(finalResults: StepResult[]) {
    const correctCount = finalResults.filter((r) => r.matched).length;
    const pct = steps.length > 0 ? correctCount / steps.length : 0;
    mutateState((draft) => {
      if (!draft.drills.spokenscript) draft.drills.spokenscript = {};
      if (!draft.drills.spokenscript[sheet.id]) {
        draft.drills.spokenscript[sheet.id] = { streak: 0, mastered: false, attempts: 0, lastScore: null };
      }
      const r = draft.drills.spokenscript[sheet.id];
      r.attempts += 1;
      r.lastScore = { correct: correctCount, total: steps.length, pct: Math.round(pct * 100) };
      if (!r.mastered) {
        r.streak = pct >= PASS_RATE ? r.streak + 1 : 0;
        r.mastered = r.streak >= MASTERY_RUNS;
      }
      draft.stats.totalReviews = (draft.stats.totalReviews || 0) + 1;
    });
    save();
    setPhase("results");
  }

  function restart() {
    setPhase("practicing");
    setStepIdx(0);
    setResults([]);
    setCheckedCurrent(false);
    setFeedback(null);
  }

  if (phase === "results") {
    const latestRec = appState.value.drills?.spokenscript?.[sheet.id] ?? rec;
    const correctCount = results.filter((r) => r.matched).length;
    return (
      <div class="drill-pane">
        <div class="drill-header">
          <h2>Spoken Script — Results</h2>
          {latestRec.mastered && <span class="mastered-badge">✓ Mastered</span>}
        </div>
        <p class="recall-score">
          {correctCount} / {steps.length} correct ({Math.round((correctCount / steps.length) * 100)}%)
        </p>
        <div class="streak-pips">
          {Array.from({ length: MASTERY_RUNS }, (_, i) => (
            <span key={i} class={"streak-pip" + (i < latestRec.streak ? " filled" : "")} />
          ))}
        </div>
        <div class="recall-results">
          {results.map((r, i) => {
            const icon = r.skipped ? "—" : r.matched ? "✓" : "✗";
            const cls = r.skipped ? "recall-row skipped" : r.matched ? "recall-row matched" : "recall-row missed";
            return (
              <div key={i} class={cls}>
                <span class="recall-icon">{icon}</span>
                <div class="recall-text">
                  <strong>{r.step.sectionName}: {r.step.text}</strong>
                  {r.matched
                    ? <span class="muted small">{r.typed}</span>
                    : <div>
                        {r.typed && <div class="muted small">You: "{r.typed}"</div>}
                        <div class="expected-script small">Expected: "{r.step.spokenScript}"</div>
                      </div>
                  }
                </div>
              </div>
            );
          })}
        </div>
        <div class="drill-actions">
          <button class="btn btn-primary" onClick={restart}>Try again</button>
        </div>
      </div>
    );
  }

  const step = steps[stepIdx];

  return (
    <div class="drill-pane">
      <div class="drill-header">
        <div class="drill-title-row">
          <h2>Spoken Script</h2>
          {rec.mastered
            ? <span class="mastered-badge">✓ Mastered</span>
            : rec.streak > 0
            ? <span class="muted small">Streak: {rec.streak}/{MASTERY_RUNS}</span>
            : null}
          <HelpIcon
            title="Spoken Script"
            bodyHTML={`<p>Each step shows the action. Type what you'd say aloud to the examiner during that step — not just the action, but the verbalization.</p>
            <p>Scored by similarity to the expected script — close phrasing counts, word-for-word isn't required.</p>
            <p><strong>Mastery</strong> = 3 rounds where you score ≥ 80% across all steps in this sheet.</p>
            <p>Practice this last — it bridges memorization and actual exam performance.</p>`}
          />
        </div>
      </div>

      <p class="muted small">Step {stepIdx + 1} of {steps.length}</p>

      <div class="script-cue">
        <span class="section-chip">{step.sectionName}</span>
        <p class="cue-text">{step.text}</p>
      </div>

      <p class="script-prompt">What would you say aloud?</p>

      <input
        ref={inputRef}
        type="text"
        class="script-input"
        placeholder="Type your verbalization…"
        autocomplete="off"
        spellcheck={false}
        onKeyDown={(e) => { if (e.key === "Enter" && !checkedCurrent) onCheck(); }}
      />

      {feedback && (
        <div class={feedback.matched ? "script-feedback correct" : "script-feedback wrong"}>
          <span>{feedback.matched ? "✓ Good" : "✗ Not quite"}</span>
          {!feedback.matched && <p class="expected-script">Expected: "{feedback.expected}"</p>}
        </div>
      )}

      <div class="drill-actions">
        <button class="btn btn-primary" disabled={checkedCurrent} onClick={onCheck}>Check</button>
        <button class="btn btn-ghost" disabled={checkedCurrent} onClick={onSkip}>Skip</button>
        {checkedCurrent && (
          <button class="btn btn-primary" onClick={onNext}>Next →</button>
        )}
      </div>
    </div>
  );
}
