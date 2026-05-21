import { useState } from "preact/hooks";
import { appState, mutateState, save } from "../../store/appStore";
import { HelpIcon } from "../../components/ui/HelpIcon";
import { buildFlatSequence } from "../../lib/drillHelpers";
import type { Sheet } from "../../types";

const MASTERY_RUNS = 3;

function shuffleArr<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

interface Round {
  currentIdx: number;
  choices: string[];
  answered: boolean;
  selectedChoice: string | null;
}

function pickRound(seq: { text: string; sectionName: string }[]): Round {
  const currentIdx = Math.floor(Math.random() * (seq.length - 1));
  const correctNext = seq[currentIdx + 1].text;
  const promptText = seq[currentIdx].text;
  const pool = seq.map((s) => s.text).filter((t) => t !== promptText && t !== correctNext);
  const distractors = shuffleArr(pool).slice(0, 3);
  const choices = shuffleArr([correctNext, ...distractors]);
  return { currentIdx, choices, answered: false, selectedChoice: null };
}

export function WhatNextDrill({ sheet }: { sheet: Sheet }) {
  const seq = buildFlatSequence(sheet);

  if (seq.length < 2) {
    return (
      <div class="empty-state">
        <div class="big">—</div>
        <p>This sheet doesn't have enough steps for this drill.</p>
      </div>
    );
  }

  const [round, setRound] = useState<Round>(() => pickRound(seq));
  const { currentIdx, choices, answered, selectedChoice } = round;
  const rec = appState.value.drills?.whatnext?.[sheet.id] ?? { streak: 0, attempts: 0, mastered: false };
  const correctText = seq[currentIdx + 1].text;
  const letters = ["A", "B", "C", "D"];

  function checkChoice(chosen: string) {
    const isCorrect = chosen === correctText;
    mutateState((draft) => {
      if (!draft.drills.whatnext) draft.drills.whatnext = {};
      if (!draft.drills.whatnext[sheet.id]) {
        draft.drills.whatnext[sheet.id] = { streak: 0, attempts: 0, mastered: false };
      }
      const r = draft.drills.whatnext[sheet.id];
      r.attempts += 1;
      if (isCorrect) {
        r.streak += 1;
        if (r.streak >= MASTERY_RUNS) r.mastered = true;
      } else {
        r.streak = 0;
      }
      draft.stats.totalReviews = (draft.stats.totalReviews || 0) + 1;
    });
    save();
    setRound({ ...round, answered: true, selectedChoice: chosen });
  }

  const isCorrectAnswer = selectedChoice === correctText;

  return (
    <div class="drill-pane">
      <div class="drill-header">
        <div class="drill-title-row">
          <h2 class="drill-title">What's Next?</h2>
          {rec.mastered && <span class="mastered-badge">✓ Mastered</span>}
          <HelpIcon
            title="What's Next? Drill"
            bodyHTML={`<p>You're shown a step and must pick what comes immediately after it — choose from 4 options.</p>
              <p><strong>Mastery</strong> = 3 correct answers in a row. Any wrong answer resets your streak.</p>
              <p>Good for reinforcing step sequence under pressure without having to type or drag.</p>`}
          />
        </div>
        <div class="streak-row">
          <span class="streak-label">Streak </span>
          {Array.from({ length: MASTERY_RUNS }, (_, i) => (
            <span key={i} class={"streak-pip" + (i < rec.streak ? " filled" : "")} />
          ))}
          <span class="muted"> {rec.streak}/{MASTERY_RUNS}</span>
        </div>
      </div>

      <div class="whatnext-prompt">
        <div class="card-section">{seq[currentIdx].sectionName}</div>
        <div class="whatnext-prompt-text">{seq[currentIdx].text}</div>
        <div class="whatnext-question">What comes next?</div>
      </div>

      <div class="whatnext-choices">
        {choices.map((text, i) => {
          let cls = "whatnext-choice";
          if (answered) {
            if (text === correctText) cls += " correct";
            else if (text === selectedChoice) cls += " wrong";
            else cls += " dim";
          }
          return (
            <button key={i} class={cls} disabled={answered} onClick={() => checkChoice(text)}>
              <span class="choice-letter">{letters[i]}</span>
              <span class="choice-text">{text}</span>
            </button>
          );
        })}
      </div>

      {answered && (
        <>
          <div class={isCorrectAnswer ? "drill-result result-pass" : "drill-result result-fail"}>
            <div class="result-icon">{isCorrectAnswer ? "✓" : "✗"}</div>
            <p>{isCorrectAnswer ? "Correct!" : `The next step is: "${correctText}"`}</p>
            {!isCorrectAnswer && <p class="muted">Section: {seq[currentIdx + 1].sectionName}</p>}
          </div>
          <div class="drill-actions">
            <button class="btn btn-primary" onClick={() => setRound(pickRound(seq))}>Next question →</button>
          </div>
        </>
      )}
    </div>
  );
}
