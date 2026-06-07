import { useState } from "preact/hooks";
import { EMS_CLINICAL_MNEMONICS } from "../../data/ems_clinical_mnemonics";
import { getNonConnectorLetters } from "../../lib/emsMnemonicsHelpers";
import type { MnemonicLetter } from "../../types";

type Phase = "intro" | "playing" | "done";

const BEFAST = EMS_CLINICAL_MNEMONICS.find(m => m.id === "befast");

function Card({ item, onGrade }: {
  item: MnemonicLetter;
  onGrade: (correct: boolean) => void;
}) {
  const [revealed, setRevealed] = useState(false);

  return (
    <div class="blsmed-drill-card dosage-quiz-card">
      <div class="blsmed-drill-card-front">
        <div class="blsmed-drill-cat">BE-FAST</div>
        <div class="befast-drill-letter">{item.letter}</div>
        <div class="blsmed-drill-question">What do you assess?</div>
      </div>
      {revealed && (
        <div class="blsmed-drill-card-back">
          <div class="blsmed-drill-text-answer">{item.stand}</div>
          {item.detail && <div class="dosage-quiz-meta muted"><span>{item.detail}</span></div>}
        </div>
      )}
      {!revealed ? (
        <button class="btn btn-primary" type="button" onClick={() => setRevealed(true)}>Reveal</button>
      ) : (
        <div class="blsmed-grade-row">
          <button class="btn btn-danger" type="button" onClick={() => onGrade(false)}>Missed it</button>
          <button class="btn btn-primary" type="button" onClick={() => onGrade(true)}>Got it</button>
        </div>
      )}
    </div>
  );
}

export function BeFastDrill({ onBack }: { onBack: () => void }) {
  const letters = BEFAST ? getNonConnectorLetters(BEFAST.letters) : [];
  const [phase, setPhase] = useState<Phase>("intro");
  const [idx, setIdx] = useState(0);
  const [correct, setCorrect] = useState(0);

  if (!BEFAST || letters.length === 0) {
    return (
      <div class="blsmed-drill-done">
        <p>BE-FAST content is unavailable.</p>
        <button class="btn" type="button" onClick={onBack}>← Back to mnemonics</button>
      </div>
    );
  }

  function start() {
    setIdx(0);
    setCorrect(0);
    setPhase("playing");
  }

  function grade(wasCorrect: boolean) {
    if (wasCorrect) setCorrect(c => c + 1);
    if (idx + 1 >= letters.length) setPhase("done");
    else setIdx(i => i + 1);
  }

  if (phase === "intro") {
    return (
      <div class="dosage-quiz-intro">
        <p class="dosage-quiz-lead">
          BE-FAST — {BEFAST.title}. Step through all {letters.length} stroke-assessment findings.
          Recall what each letter checks for, reveal to confirm, then mark whether you had it.
        </p>
        <button class="btn btn-primary" type="button" onClick={start}>Start BE-FAST Drill</button>
      </div>
    );
  }

  if (phase === "done") {
    const pct = Math.round((correct / letters.length) * 100);
    return (
      <div class="blsmed-drill-done">
        <div class="dosage-quiz-score">{pct}%</div>
        <p>{correct} / {letters.length} correct</p>
        <button class="btn btn-primary" type="button" onClick={start}>Try Again</button>
        <button class="btn" type="button" onClick={onBack}>← Back to mnemonics</button>
      </div>
    );
  }

  const item = letters[idx];
  return (
    <div class="blsmed-drill">
      <div class="blsmed-drill-header">
        <span class="blsmed-drill-counter">{letters.length - idx} card{letters.length - idx === 1 ? "" : "s"} remaining</span>
        <span class="blsmed-due-count">{correct} correct</span>
      </div>
      <Card key={item.letter + idx} item={item} onGrade={grade} />
    </div>
  );
}
