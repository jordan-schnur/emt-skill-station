import { useState, useRef } from "preact/hooks";
import { appState, navigate, mutateState, save } from "../../store/appStore";
import { HelpIcon } from "../../components/ui/HelpIcon";
import { buildFlatSequence, matchLines } from "../../lib/drillHelpers";
import type { MatchResult, FlatStep } from "../../lib/drillHelpers";
import type { Sheet } from "../../types";

type Phase = "input" | "results" | "missed";

export function BlankRecallView({ sheet }: { sheet: Sheet }) {
  const expectedSteps = buildFlatSequence(sheet);
  const [phase, setPhase] = useState<Phase>("input");
  const [results, setResults] = useState<MatchResult[]>([]);
  const [missedSteps, setMissedSteps] = useState<FlatStep[]>([]);
  const [missedIdx, setMissedIdx] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const rec = appState.value.drills?.blankrecall?.[sheet.id];

  function onSubmit() {
    const raw = textareaRef.current?.value ?? "";
    const typedLines = raw.split("\n").map((s) => s.trim()).filter(Boolean);
    if (!typedLines.length) return;

    const rawResults = matchLines(typedLines, expectedSteps);

    // Mark out-of-order matched items
    let lastExpectedIdx = -1;
    for (const r of rawResults) {
      if (!r.matched) continue;
      const eIdx = expectedSteps.indexOf(r.expected);
      if (eIdx < lastExpectedIdx) {
        r.outOfOrder = true;
      } else {
        lastExpectedIdx = eIdx;
      }
    }

    const matched = rawResults.filter((r) => r.matched).length;
    const total = rawResults.length;
    const pct = Math.round((matched / total) * 100);

    mutateState((draft) => {
      if (!draft.drills.blankrecall) draft.drills.blankrecall = {};
      if (!draft.drills.blankrecall[sheet.id]) {
        draft.drills.blankrecall[sheet.id] = { attempts: 0, lastAttemptAt: null, lastScore: null, bestPct: 0 };
      }
      const r = draft.drills.blankrecall[sheet.id];
      r.attempts += 1;
      r.lastAttemptAt = new Date().toISOString();
      r.lastScore = { matched, missed: total - matched, total, pct };
      r.bestPct = Math.max(r.bestPct, pct);
      draft.stats.totalReviews = (draft.stats.totalReviews || 0) + 1;
    });
    save();

    setResults(rawResults);
    setPhase("results");
  }

  function startMissed() {
    const missed = results.filter((r) => !r.matched).map((r) => r.expected);
    setMissedSteps(missed);
    setMissedIdx(0);
    setRevealed(false);
    setPhase("missed");
  }

  function nextMissed() {
    if (missedIdx + 1 < missedSteps.length) {
      setMissedIdx(missedIdx + 1);
      setRevealed(false);
    } else {
      setPhase("results");
    }
  }

  function tryAgain() {
    setPhase("input");
    setResults([]);
  }

  if (phase === "input") {
    return (
      <div class="drill-pane">
        <div class="drill-header">
          <div class="drill-title-row">
            <h2>Blank Sheet Recall</h2>
            {rec && rec.bestPct > 0 && <span class="mastered-badge">Best: {rec.bestPct}%</span>}
            <HelpIcon
              title="Blank Sheet Recall"
              bodyHTML={`<p>Type every step you remember from memory, one per line. Order doesn't need to be perfect.</p>
              <p><strong>Fuzzy matching</strong> — you don't need word-for-word accuracy, just close enough in meaning.</p>
              <p>After submitting, you can drill any missed steps one by one with reveal cards.</p>
              <p>Your best score is tracked. Hit <em>View full sheet</em> first if you want to preview what's being tested.</p>`}
            />
          </div>
        </div>
        <p class="muted">Write every step from memory, one per line. Word-for-word isn't required — we use fuzzy matching.</p>
        <textarea
          ref={textareaRef}
          class="recall-textarea"
          rows={20}
          placeholder={"Step 1\nStep 2\n..."}
        />
        <div class="drill-actions">
          <button class="btn btn-primary" onClick={onSubmit}>Check my recall</button>
          <button
            class="btn btn-ghost"
            onClick={() => navigate({ view: "sheet", sheetId: sheet.id, tab: "sheet" })}
          >
            View full sheet →
          </button>
        </div>
        {rec && rec.attempts > 0 && (
          <p class="muted small">
            {rec.attempts} attempt{rec.attempts === 1 ? "" : "s"} · best {rec.bestPct}%
          </p>
        )}
      </div>
    );
  }

  if (phase === "missed") {
    const step = missedSteps[missedIdx];
    const total = missedSteps.length;
    const nextLabel = missedIdx + 1 < total ? "Next →" : "Back to results";
    return (
      <div class="drill-pane">
        <div class="drill-header">
          <h2>Missed Step Review</h2>
          <div class="study-meta">
            <span>Step {missedIdx + 1} of {total}</span>
          </div>
        </div>
        <div class="card">
          <div class="card-section">{step.sectionName}</div>
          <div class="card-prompt">What is this step?</div>
          {revealed && <div class="card-answer">{step.text}</div>}
          <div class="card-actions">
            {!revealed && (
              <button class="btn btn-primary" onClick={() => setRevealed(true)}>Reveal step</button>
            )}
            {revealed && (
              <button class="btn btn-primary" onClick={nextMissed}>{nextLabel}</button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // results phase
  const matched = results.filter((r) => r.matched).length;
  const total = results.length;
  const pct = Math.round((matched / total) * 100);
  const scoreClass = pct >= 80 ? "score-good" : pct >= 50 ? "score-ok" : "score-poor";
  const missedResults = results.filter((r) => !r.matched);

  return (
    <div class="drill-pane">
      <div class="drill-header">
        <h2>Blank Sheet Recall</h2>
        <div class={"recall-score " + scoreClass}>
          {matched} / {total} steps recalled ({pct}%)
        </div>
      </div>

      <div class="recall-results">
        {results.map((r, i) => {
          let icon: string, cls: string;
          if (r.matched && r.outOfOrder) { icon = "~"; cls = "recall-ooo"; }
          else if (r.matched) { icon = "✓"; cls = "recall-match"; }
          else { icon = "✗"; cls = "recall-miss"; }
          return (
            <div key={i} class={"recall-row " + cls}>
              <span class="recall-icon">{icon}</span>
              <span class="recall-step">{r.expected.text}</span>
              {r.matched && r.score < 0.9 && r.typedLine && (
                <div class="recall-typed muted small">you wrote: "{r.typedLine}"</div>
              )}
            </div>
          );
        })}
      </div>

      {missedResults.length > 0 && (
        <div class="drill-actions">
          <button class="btn btn-primary" onClick={startMissed}>
            Practice {missedResults.length} missed step{missedResults.length === 1 ? "" : "s"} →
          </button>
        </div>
      )}

      <div class="drill-actions">
        <button class="btn btn-primary" onClick={tryAgain}>Try again</button>
        <button
          class="btn btn-ghost"
          onClick={() => navigate({ view: "sheet", sheetId: sheet.id, tab: "sheet" })}
        >
          View full sheet →
        </button>
      </div>
    </div>
  );
}
