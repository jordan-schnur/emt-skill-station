import { useState } from "preact/hooks";
import { MEDICATION_DOSAGES } from "../../data/medication_dosages";
import type { MedicationDosage } from "../../types";

type Phase = "intro" | "playing" | "done";

function shuffle<T>(arr: T[]): T[] {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function formatTime(ms: number): string {
  const total = Math.round(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function Card({ med, onGrade }: {
  med: MedicationDosage;
  onGrade: (correct: boolean) => void;
}) {
  const [revealed, setRevealed] = useState(false);

  return (
    <div class="blsmed-drill-card dosage-quiz-card">
      <div class="blsmed-drill-card-front">
        <div class="blsmed-drill-cat">Adult Dose</div>
        <div class="blsmed-drill-name">{med.name}</div>
        <div class="blsmed-drill-question">What is the adult dose?</div>
      </div>
      {revealed && (
        <div class="blsmed-drill-card-back">
          <div class="blsmed-drill-text-answer">{med.adultDose}</div>
          <div class="dosage-quiz-meta muted">
            <span><strong>Route:</strong> {med.route}</span>
            <span><strong>For:</strong> {med.indication}</span>
          </div>
        </div>
      )}
      {!revealed ? (
        <button class="btn btn-primary" type="button" onClick={() => setRevealed(true)}>
          Reveal
        </button>
      ) : (
        <div class="blsmed-grade-row">
          <button class="btn btn-danger" type="button" onClick={() => onGrade(false)}>
            Missed it
          </button>
          <button class="btn btn-primary" type="button" onClick={() => onGrade(true)}>
            Got it
          </button>
        </div>
      )}
    </div>
  );
}

export function DosageQuiz() {
  const [phase, setPhase] = useState<Phase>("intro");
  const [queue, setQueue] = useState<MedicationDosage[]>([]);
  const [idx, setIdx] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [startedAt, setStartedAt] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  function start() {
    setQueue(shuffle(MEDICATION_DOSAGES));
    setIdx(0);
    setCorrect(0);
    setStartedAt(Date.now());
    setElapsed(0);
    setPhase("playing");
  }

  function grade(wasCorrect: boolean) {
    if (wasCorrect) setCorrect(c => c + 1);
    if (idx + 1 >= queue.length) {
      setElapsed(Date.now() - startedAt);
      setPhase("done");
    } else {
      setIdx(i => i + 1);
    }
  }

  if (phase === "intro") {
    return (
      <div class="dosage-quiz-intro">
        <p class="dosage-quiz-lead">
          Flip through all {MEDICATION_DOSAGES.length} EMT medications and recall each adult dose.
          Go at your own pace — reveal when you're ready, then mark whether you had it.
        </p>
        <button class="btn btn-primary" type="button" onClick={start}>
          Start Dosage Quiz
        </button>
      </div>
    );
  }

  if (phase === "done") {
    const pct = queue.length > 0 ? Math.round((correct / queue.length) * 100) : 0;
    return (
      <div class="blsmed-drill-done">
        <div class="dosage-quiz-score">{pct}%</div>
        <p>{correct} / {queue.length} correct · {formatTime(elapsed)} total</p>
        <button class="btn btn-primary" type="button" onClick={start}>Try Again</button>
      </div>
    );
  }

  const med = queue[idx];
  return (
    <div class="blsmed-drill">
      <div class="blsmed-drill-header">
        <span class="blsmed-drill-counter">{queue.length - idx} card{queue.length - idx === 1 ? "" : "s"} remaining</span>
        <span class="blsmed-due-count">{correct} correct</span>
      </div>
      <Card
        key={med.id}
        med={med}
        onGrade={grade}
      />
    </div>
  );
}
