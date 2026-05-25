import { useState, useRef } from "preact/hooks";
import { appState, mutateState, save, navigate, route } from "../../store/appStore";
import { EMS_CLINICAL_MNEMONICS } from "../../data/ems_clinical_mnemonics";
import { defaultRecord, grade, describeDue } from "../../lib/emsSrs";
import { suggestGrade, getNonConnectorLetters, quizMatchesAnswer } from "../../lib/emsMnemonicsHelpers";
import { ReferenceToolbar } from "../../components/ReferenceToolbar";
import type { ClinicalMnemonic, SRSRecord } from "../../types";

type Grade = "again" | "hard" | "good" | "easy";

function EmsCard({ mnemonic, srsRec, onPractice }: { mnemonic: ClinicalMnemonic; srsRec: SRSRecord | undefined; onPractice: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const due = describeDue(srsRec);

  return (
    <div class={`ems-card${open ? " expanded" : ""}`} onClick={() => setOpen(o => !o)}>
      <div class="ems-card-header">
        <div class="ems-card-left">
          <span class="ems-acronym">{mnemonic.acronym}</span>
          <span class="ems-card-title">{mnemonic.title}</span>
        </div>
        <div class="ems-card-right">
          <span class="ems-category-tag">{mnemonic.category}</span>
          <span class={`ems-due-badge${!srsRec || srsRec.due <= Date.now() ? " due" : ""}`}>{due}</span>
          <button class="ems-practice-icon" title="Practice this card" onClick={e => { e.stopPropagation(); onPractice(mnemonic.id); }}>▶</button>
          <span class="ems-expand-icon">▾</span>
        </div>
      </div>
      {open && (
        <div class="ems-card-body">
          {mnemonic.note && <div class="ems-card-note">{mnemonic.note}</div>}
          <div class="ems-letter-table">
            {mnemonic.letters.filter(l => l.stand !== "(connector)").map((l, i) => (
              <div class="ems-letter-row" key={i}>
                <span class="ems-letter-badge">{l.letter}</span>
                <div class="ems-letter-content">
                  <strong>{l.stand}</strong>
                  {l.detail && <div class="ems-letter-detail muted">{l.detail}</div>}
                </div>
              </div>
            ))}
          </div>
          {mnemonic.sources && mnemonic.sources.length > 0 && (
            <div class="ems-card-sources muted">Sources: {mnemonic.sources.join(" · ")}</div>
          )}
          <button class="btn ems-practice-body-btn" onClick={e => { e.stopPropagation(); onPractice(mnemonic.id); }}>Practice this card</button>
        </div>
      )}
    </div>
  );
}

function BrowseMode({ onQuiz, onPracticeCard }: { onQuiz: () => void; onPracticeCard: (id: string) => void }) {
  const categories = ["All", ...Array.from(new Set(EMS_CLINICAL_MNEMONICS.map(m => m.category)))];
  const [activeCat, setActiveCat] = useState("All");
  const [query, setQuery] = useState("");
  const srsStore = appState.value.emsSrs ?? {};
  const now = Date.now();
  const dueCount = EMS_CLINICAL_MNEMONICS.filter(m => {
    const rec = srsStore["ems::" + m.id];
    return !rec || rec.due <= now;
  }).length;

  const filtered = EMS_CLINICAL_MNEMONICS.filter(m => {
    const matchesCat = activeCat === "All" || m.category === activeCat;
    const q = query.toLowerCase();
    const matchesQuery = !q || m.acronym.toLowerCase().includes(q) || m.title.toLowerCase().includes(q);
    return matchesCat && matchesQuery;
  });

  return (
    <>
      <h1>EMS Mnemonics &amp; Acronyms</h1>
      <p class="subtitle">Clinical assessment and treatment acronyms used throughout EMS. Tap a card to expand, or use Quiz mode for spaced repetition.</p>
      <ReferenceToolbar
        query={query}
        onQueryChange={setQuery}
        categories={categories}
        activeCategory={activeCat}
        onCategoryChange={setActiveCat}
        placeholder="Search acronyms…"
      />
      <button class="btn btn-primary ems-quiz-btn" type="button" onClick={onQuiz}>
        {dueCount > 0 ? `Quiz — ${dueCount} card${dueCount === 1 ? "" : "s"} due` : "Quiz — all caught up"}
      </button>
      <div class="ems-mnemonic-grid">
        {filtered.map(m => (
          <EmsCard key={m.id} mnemonic={m} srsRec={srsStore["ems::" + m.id]} onPractice={onPracticeCard} />
        ))}
        {filtered.length === 0 && <p class="muted">No mnemonics match.</p>}
      </div>
    </>
  );
}

interface LetterResult {
  letter: string;
  stand: string;
  correct: boolean;
  given: string;
}

type QuizPhase = "front" | "quizzing" | "summary";

function PerLetterQuiz({ mnemonic, rec, remaining, onGrade }: {
  mnemonic: ClinicalMnemonic;
  rec: SRSRecord;
  remaining: number;
  onGrade: (g: Grade) => void;
}) {
  const letters = getNonConnectorLetters(mnemonic.letters);
  const [phase, setPhase] = useState<QuizPhase>("front");
  const [letterIdx, setLetterIdx] = useState(0);
  const [answer, setAnswer] = useState("");
  const [letterResult, setLetterResult] = useState<{ correct: boolean; stand: string } | null>(null);
  const [results, setResults] = useState<LetterResult[]>([]);
  const [chosenGrade, setChosenGrade] = useState<Grade | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const suggested = suggestGrade(results.filter(r => r.correct).length, results.length);

  function submitAnswer() {
    const current = letters[letterIdx];
    const correct = quizMatchesAnswer(answer.trim(), current.stand);
    setLetterResult({ correct, stand: current.stand });
    setResults(prev => [...prev, { letter: current.letter, stand: current.stand, correct, given: answer.trim() }]);
  }

  function advance() {
    const next = letterIdx + 1;
    if (next >= letters.length) setPhase("summary");
    else { setLetterIdx(next); setAnswer(""); setLetterResult(null); setTimeout(() => inputRef.current?.focus(), 0); }
  }

  if (phase === "front") {
    return (
      <div class="ems-quiz-card">
        <div class="ems-quiz-front">
          <div class="ems-quiz-acronym">{mnemonic.acronym}</div>
          <div class="ems-quiz-title">{mnemonic.title}</div>
          <div class="ems-quiz-category">{mnemonic.category}</div>
        </div>
        <button class="btn btn-primary ems-reveal-btn" onClick={() => { setPhase("quizzing"); setTimeout(() => inputRef.current?.focus(), 0); }}>Begin Quiz</button>
      </div>
    );
  }

  if (phase === "quizzing") {
    const current = letters[letterIdx];
    return (
      <div class="ems-quiz-card">
        <div class="ems-quiz-letter-prompt">
          <span class="ems-quiz-acronym-sm">{mnemonic.acronym}</span>{" — what does "}<strong>{current.letter}</strong>{" stand for?"}
        </div>
        <div class="ems-quiz-progress muted">{letterIdx + 1} / {letters.length}</div>
        {letterResult === null ? (
          <div class="ems-quiz-input-row">
            <input ref={inputRef} class="ems-quiz-input" type="text" value={answer} placeholder="Type your answer…" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck={false}
              onInput={e => setAnswer((e.target as HTMLInputElement).value)}
              onKeyDown={e => { if (e.key === "Enter" && answer.trim()) submitAnswer(); }}
            />
            <button class="btn btn-primary" disabled={!answer.trim()} onClick={submitAnswer}>Submit</button>
          </div>
        ) : (
          <div class="ems-quiz-result">
            <div class={`ems-quiz-verdict ${letterResult.correct ? "correct" : "incorrect"}`}>{letterResult.correct ? "✓ Correct" : "✗ Incorrect"}</div>
            <div class="ems-quiz-correct-ans"><strong>{current.letter}</strong> = {letterResult.stand}</div>
            <button class="btn btn-primary" onClick={advance}>{letterIdx + 1 < letters.length ? "Next →" : "See Results"}</button>
          </div>
        )}
      </div>
    );
  }

  const correctCount = results.filter(r => r.correct).length;
  const finalGrade = chosenGrade ?? suggested;
  const gradeLabels: Record<Grade, string> = { again: "Again", hard: "Hard", good: "Good", easy: "Easy" };

  return (
    <div class="ems-quiz-card">
      <div class="ems-quiz-summary-title">{mnemonic.acronym} — Results</div>
      <div class="ems-quiz-score">{correctCount} / {results.length} correct</div>
      <div class="ems-quiz-result-list">
        {results.map((r, i) => (
          <div key={i} class={`ems-quiz-result-row ${r.correct ? "correct" : "incorrect"}`}>
            <span class="ems-letter-badge">{r.letter}</span>
            <span class="ems-quiz-result-stand">{r.stand}</span>
            {!r.correct && r.given && <span class="ems-quiz-result-given muted">you wrote: {r.given}</span>}
          </div>
        ))}
      </div>
      <div class="ems-quiz-grade-section">
        <div class="muted">Suggested: <strong>{gradeLabels[suggested]}</strong></div>
        <div class="ems-grade-row">
          {(["again", "hard", "good", "easy"] as Grade[]).map((g, i) => (
            <button key={g} class={`btn ${g === finalGrade ? (i === 0 ? "btn-danger" : i === 2 || i === 3 ? "btn-primary" : "") + " ems-grade-selected" : ""}`} onClick={() => setChosenGrade(g)}>{gradeLabels[g]}</button>
          ))}
        </div>
        <button class="btn btn-primary" onClick={() => onGrade(finalGrade)}>Confirm →</button>
      </div>
    </div>
  );
}

function QuizMode({ pinnedId, onBack }: { pinnedId?: string; onBack: () => void }) {
  const srsStore = appState.value.emsSrs ?? {};
  const now = Date.now();

  const due = EMS_CLINICAL_MNEMONICS
    .filter(m => { const r = srsStore["ems::" + m.id]; return r && r.due <= now; })
    .sort((a, b) => (srsStore["ems::" + a.id]?.due ?? 0) - (srsStore["ems::" + b.id]?.due ?? 0))
    .map(m => ({ m, rec: srsStore["ems::" + m.id] }));

  const fresh = EMS_CLINICAL_MNEMONICS.filter(m => !srsStore["ems::" + m.id]).map(m => ({ m, rec: defaultRecord() }));
  const fullQueue = [...due, ...fresh];

  const initialQueue = pinnedId
    ? (() => { const found = EMS_CLINICAL_MNEMONICS.find(m => m.id === pinnedId); return found ? [{ m: found, rec: srsStore["ems::" + found.id] ?? defaultRecord() }] : fullQueue; })()
    : fullQueue;

  const [queue, setQueue] = useState(initialQueue);
  const [idx, setIdx] = useState(0);
  const [done, setDone] = useState(false);

  if (done || queue.length === 0) {
    return (
      <div class="empty-state">
        <div class="big">✓</div>
        <p>{pinnedId ? "Done!" : queue.length === 0 ? "All caught up! Come back later." : "Session complete!"}</p>
        <button class="btn" onClick={onBack}>← Back to mnemonics</button>
      </div>
    );
  }

  const { m, rec } = queue[idx];
  const remaining = queue.length - idx;

  function applyGrade(g: Grade) {
    const cardId = "ems::" + m.id;
    const updated = grade(rec, g);
    mutateState(draft => { if (!draft.emsSrs) draft.emsSrs = {}; draft.emsSrs[cardId] = updated; });
    save();
    if (g === "again") setQueue(q => [...q, { m, rec: updated }]);
    if (idx + 1 >= queue.length + (g === "again" ? 1 : 0)) setDone(true);
    else setIdx(i => i + 1);
  }

  return (
    <>
      <div class="crumbs">
        <button class="btn-link" onClick={onBack}>← Back to EMS Mnemonics &amp; Acronyms</button>
      </div>
      <div class="ems-quiz-header">
        <span class="ems-quiz-counter">{remaining} card{remaining === 1 ? "" : "s"} remaining</span>
      </div>
      <PerLetterQuiz key={m.id + "-" + idx} mnemonic={m} rec={rec} remaining={remaining} onGrade={applyGrade} />
    </>
  );
}

export function MnemonicsMode() {
  const pinnedId = route.value.referenceCardId;
  const [isQuiz, setIsQuiz] = useState(!!pinnedId);

  return (
    <div class="ems-mnemonics">
      {isQuiz
        ? <QuizMode pinnedId={pinnedId} onBack={() => { setIsQuiz(false); navigate({ view: "reference", referenceTab: "mnemonics" }); }} />
        : <BrowseMode onQuiz={() => setIsQuiz(true)} onPracticeCard={id => { navigate({ view: "reference", referenceTab: "mnemonics", referenceCardId: id }); setIsQuiz(true); }} />
      }
    </div>
  );
}
