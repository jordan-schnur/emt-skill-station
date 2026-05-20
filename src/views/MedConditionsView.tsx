import { useState } from "preact/hooks";
import { appState, mutateState, save, navigate, route } from "../store/appStore";
import { MEDICAL_CONDITIONS } from "../data/medical_conditions";
import type { MedicalCondition } from "../types";

type MedTab = "browse" | "compare" | "quiz";

// ─── Browse ──────────────────────────────────────────────────────────────────

function CondCard({ cond }: { cond: MedicalCondition }) {
  const [open, setOpen] = useState(false);
  const sections = [
    { label: "Key Signs & Symptoms", items: cond.signs, cls: "medcond-signs" },
    { label: "Distinguishing Features", items: cond.distinguishing, cls: "medcond-distinguishing" },
    { label: "Critical Findings", items: cond.criticalFindings, cls: "medcond-critical" },
    { label: "EMT Treatment Priority", items: cond.treatment, cls: "medcond-treatment" },
  ];
  return (
    <div class={`medcond-card${open ? " expanded" : ""}`}>
      <div class="medcond-card-header" onClick={() => setOpen(o => !o)}>
        <div class="medcond-card-left">
          <span class="medcond-name">{cond.name}</span>
          <span class="medcond-key-diff">{cond.keyDifferentiator}</span>
        </div>
        <div class="medcond-card-right">
          <span class="medcond-cat-badge">{cond.category}</span>
          <span class="medcond-expand-icon">▾</span>
        </div>
      </div>
      {open && (
        <div class="medcond-card-body">
          {sections.map(sec => sec.items?.length ? (
            <div key={sec.cls} class={`medcond-section ${sec.cls}`}>
              <div class="medcond-section-label">{sec.label}</div>
              <ul class="medcond-list">{sec.items.map((it, i) => <li key={i}>{it}</li>)}</ul>
            </div>
          ) : null)}
          {cond.onset && <div class="medcond-onset"><strong>Onset: </strong>{cond.onset}</div>}
        </div>
      )}
    </div>
  );
}

function BrowseTab() {
  const cats = ["All", ...Array.from(new Set(MEDICAL_CONDITIONS.map(c => c.category)))];
  const [activeCat, setActiveCat] = useState("All");
  const filtered = activeCat === "All" ? MEDICAL_CONDITIONS : MEDICAL_CONDITIONS.filter(c => c.category === activeCat);
  return (
    <>
      <div class="medcond-header">
        <h1>Medical Conditions Reference</h1>
        <p class="subtitle">Signs, symptoms, and distinguishing features for common EMT medical emergencies. Click a condition to expand.</p>
      </div>
      <div class="medcond-filter-row">
        {cats.map(cat => (
          <button key={cat} class={`medcond-filter-chip${cat === activeCat ? " active" : ""}`} type="button" onClick={() => setActiveCat(cat)}>{cat}</button>
        ))}
      </div>
      <div class="medcond-grid">
        {filtered.map(c => <CondCard key={c.id} cond={c} />)}
      </div>
    </>
  );
}

// ─── Compare ─────────────────────────────────────────────────────────────────

const COMPARE_GROUPS: Record<string, { label: string; dimensions: string[] }> = {
  diabetic:        { label: "Diabetic Emergencies", dimensions: ["onset", "skin", "breath", "respirations", "keySign", "history"] },
  cardiac_dyspnea: { label: "Cardiac (AMI vs CHF)", dimensions: ["onset", "dyspnea", "skin", "edema", "keySign", "history"] },
  obstructive:     { label: "Asthma vs COPD", dimensions: ["onset", "breathSounds", "skin", "cough", "keySign", "smokingHistory", "reversibility"] },
  pulmonary_acute: { label: "PE vs Pneumothorax vs Pneumonia", dimensions: ["onset", "breathSounds", "fever", "cough", "keySign", "breathSoundsSymmetry"] },
  neuro:           { label: "Stroke / TIA / Seizure", dimensions: ["onset", "symptomDuration", "FASTexam", "headache", "keySign", "urgency"] },
  allergic:        { label: "Allergic Reaction vs Anaphylaxis", dimensions: ["onset", "airway", "bloodPressure", "skinFindings", "shockSigns", "keySign", "epinephrine"] },
  shock:           { label: "Shock Types", dimensions: ["cause", "heartRate", "skin", "lungsounds", "JVD", "keySign"] },
};

const DIM_LABELS: Record<string, string> = {
  onset: "Onset", skin: "Skin", breath: "Breath Odor", respirations: "Respirations",
  keySign: "Key Finding", history: "History", dyspnea: "Dyspnea", edema: "Peripheral Edema",
  breathSounds: "Breath Sounds", cough: "Cough", smokingHistory: "Smoking History",
  reversibility: "Reversibility", fever: "Fever", breathSoundsSymmetry: "Breath Sound Symmetry",
  symptomDuration: "Duration", FASTexam: "FAST Exam", headache: "Headache", urgency: "Urgency",
  airway: "Airway", bloodPressure: "Blood Pressure", skinFindings: "Skin Findings",
  shockSigns: "Shock Signs", epinephrine: "Epinephrine", cause: "Cause",
  heartRate: "Heart Rate", lungsounds: "Lung Sounds", JVD: "JVD",
};

function CompareTab() {
  const groupIds = Object.keys(COMPARE_GROUPS);
  const [activeGroup, setActiveGroup] = useState(groupIds[0]);
  const group = COMPARE_GROUPS[activeGroup];
  const groupConds = MEDICAL_CONDITIONS.filter(c => c.compareGroup === activeGroup);

  return (
    <>
      <h1>Side-by-Side Comparison</h1>
      <p class="subtitle">Select a group to compare commonly confused conditions.</p>
      <div class="medcond-group-row">
        {groupIds.map(gid => (
          <button
            key={gid}
            class={`medcond-group-chip${gid === activeGroup ? " active" : ""}`}
            type="button"
            onClick={() => setActiveGroup(gid)}
          >{COMPARE_GROUPS[gid].label}</button>
        ))}
      </div>
      <div class="medcond-compare-wrap">
        {groupConds.length === 0 ? (
          <p class="muted">No conditions in this group.</p>
        ) : (
          <div class="medcond-compare-table" style={`--cols: ${groupConds.length}`}>
            <div class="medcond-th medcond-dim-label" />
            {groupConds.map(c => <div key={c.id} class="medcond-th">{c.name}</div>)}
            {group.dimensions.map((dim, ri) => (
              <>
                <div key={`label-${dim}`} class={`medcond-td medcond-dim-label${ri % 2 === 1 ? " medcond-row-stripe" : ""}`}>
                  {DIM_LABELS[dim] ?? dim}
                </div>
                {groupConds.map(c => (
                  <div
                    key={`${c.id}-${dim}`}
                    class={`medcond-td${dim === "keySign" ? " medcond-key-row" : ri % 2 === 1 ? " medcond-row-stripe" : ""}`}
                  >
                    {c.compareDimensions?.[dim] ?? "—"}
                  </div>
                ))}
              </>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

// ─── Quiz ─────────────────────────────────────────────────────────────────────

interface Question {
  condId: string;
  answer: string;
  clue: string;
  category: string;
  options: string[];
  explanation: string | null;
  status: "new" | "due" | "review";
}

function srsUpdate(record: { interval: number; ease: number; reps: number } | undefined, correct: boolean) {
  const r = record ?? { interval: 1, ease: 2.5, reps: 0 };
  let { interval, ease, reps } = r;
  if (correct) { reps++; interval = reps <= 1 ? 1 : reps === 2 ? 4 : Math.round(interval * ease); ease = Math.min(3.0, ease + 0.1); }
  else { reps = 0; interval = 1; ease = Math.max(1.3, ease - 0.2); }
  return { interval, ease, reps, due: Date.now() + interval * 86400000 };
}

function buildQuestions(srsData: Record<string, { due: number }>, count: number): Question[] {
  const now = Date.now();
  const due = MEDICAL_CONDITIONS.filter(c => srsData[c.id] && srsData[c.id].due <= now).sort(() => Math.random() - 0.5);
  const unseen = MEDICAL_CONDITIONS.filter(c => !srsData[c.id]).sort(() => Math.random() - 0.5);
  const upcoming = MEDICAL_CONDITIONS.filter(c => srsData[c.id] && srsData[c.id].due > now).sort((a, b) => srsData[a.id].due - srsData[b.id].due);
  const ordered = [...due, ...unseen, ...upcoming];
  const questions: Question[] = [];
  for (const cond of ordered) {
    if (questions.length >= count) break;
    if (!cond.keyDifferentiator) continue;
    const sameGroup = MEDICAL_CONDITIONS.filter(c => c.compareGroup === cond.compareGroup && c.id !== cond.id);
    const otherGroup = MEDICAL_CONDITIONS.filter(c => c.compareGroup !== cond.compareGroup).sort(() => Math.random() - 0.5);
    const distractors: MedicalCondition[] = [];
    for (const d of [...sameGroup, ...otherGroup]) {
      if (distractors.length >= 3) break;
      if (!distractors.find(x => x.id === d.id)) distractors.push(d);
    }
    if (distractors.length < 3) continue;
    const rec = srsData[cond.id];
    questions.push({
      condId: cond.id, answer: cond.name, clue: cond.keyDifferentiator,
      category: cond.category, explanation: cond.distinguishing?.[0] ?? null,
      options: [cond.name, ...distractors.map(d => d.name)].sort(() => Math.random() - 0.5),
      status: !rec ? "new" : rec.due <= now ? "due" : "review",
    });
  }
  return questions;
}

function QuizTab() {
  const srsData = appState.value.medcondSrs ?? {};
  const [questions] = useState(() => buildQuestions(srsData as Record<string, { due: number }>, 10));
  const [idx, setIdx] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [correct, setCorrect] = useState(0);
  const [done, setDone] = useState(false);

  if (!questions.length) return <p class="muted">Could not build quiz questions.</p>;

  const now = Date.now();
  const totalDue = MEDICAL_CONDITIONS.filter(c => (srsData as Record<string, { due: number }>)[c.id]?.due <= now).length;
  const totalNew = MEDICAL_CONDITIONS.filter(c => !(srsData as Record<string, { due: number }>)[c.id]).length;

  if (done) {
    const score = correct / questions.length;
    const pct = Math.round(score * 100);
    const grade = pct >= 90 ? "Excellent!" : pct >= 70 ? "Good job!" : pct >= 50 ? "Keep studying!" : "Keep at it!";
    const gradeClass = pct >= 90 ? "medcond-grade-great" : pct >= 70 ? "medcond-grade-good" : "medcond-grade-low";
    const newSrsData = appState.value.medcondSrs ?? {};
    const newDue = MEDICAL_CONDITIONS.filter(c => (newSrsData as Record<string, { due: number }>)[c.id]?.due <= Date.now()).length;
    return (
      <div class="medcond-results">
        <div class="medcond-results-icon">{pct >= 70 ? "🏥" : "📋"}</div>
        <div class={`medcond-results-score ${gradeClass}`}>{pct}%</div>
        <div class="medcond-results-grade">{grade}</div>
        <div class="medcond-results-detail">{correct} / {questions.length} correct</div>
        <div class="medcond-results-detail">{newDue > 0 ? `${newDue} card${newDue === 1 ? "" : "s"} due for review` : "All caught up!"}</div>
        <button class="btn btn-primary" onClick={() => navigate({ view: "medconditions", tab: "quiz" })}>Continue Studying</button>
        <button class="btn" onClick={() => navigate({ view: "medconditions", tab: "browse" })}>Browse Conditions</button>
      </div>
    );
  }

  const q = questions[idx];

  function choose(opt: string) {
    if (answered) return;
    setAnswered(true);
    setSelected(opt);
    const isCorrect = opt === q.answer;
    if (isCorrect) setCorrect(c => c + 1);
    mutateState(draft => {
      if (!draft.medcondSrs) draft.medcondSrs = {};
      (draft.medcondSrs as Record<string, ReturnType<typeof srsUpdate>>)[q.condId] = srsUpdate(
        (draft.medcondSrs as Record<string, { interval: number; ease: number; reps: number }>)[q.condId],
        isCorrect
      );
    });
    save();
  }

  function next() {
    if (idx + 1 >= questions.length) setDone(true);
    else { setIdx(i => i + 1); setAnswered(false); setSelected(null); }
  }

  return (
    <>
      <div class="medcond-quiz-header">
        <div class="medcond-quiz-counter">Question {idx + 1} of {questions.length}</div>
        <div class="medcond-quiz-srs-info">
          {totalDue > 0 && <span class="medcond-srs-count medcond-srs-count-due">{totalDue} due</span>}
          {totalNew > 0 && <span class="medcond-srs-count medcond-srs-count-new">{totalNew} new</span>}
        </div>
      </div>
      <div class="medcond-quiz-card">
        <div class="medcond-quiz-card-header">
          <div class="medcond-quiz-srs-status">
            {q.status === "new" && <span class="medcond-srs-badge medcond-srs-new">New</span>}
            {q.status === "due" && <span class="medcond-srs-badge medcond-srs-due">Review</span>}
          </div>
        </div>
        <div class="medcond-quiz-question">
          <div class="medcond-quiz-label muted">Which condition does this describe?</div>
          <div class="medcond-quiz-clue">{q.clue}</div>
          {q.category && <div class="medcond-quiz-hint muted">Category: {q.category}</div>}
        </div>
        <div class="medcond-quiz-options">
          {q.options.map(opt => (
            <button
              key={opt}
              class={`medcond-option btn${answered && opt === q.answer ? " correct" : answered && opt === selected && opt !== q.answer ? " wrong" : ""}`}
              type="button"
              disabled={answered}
              onClick={() => choose(opt)}
            >{opt}</button>
          ))}
        </div>
        {answered && (
          <div class="medcond-quiz-feedback">
            {selected === q.answer
              ? <div class="medcond-feedback-correct">Correct!</div>
              : <div class="medcond-feedback-wrong">Incorrect — the answer is <strong>{q.answer}</strong></div>}
            {q.explanation && <div class="medcond-feedback-detail muted">{q.explanation}</div>}
          </div>
        )}
        {answered && (
          <button class="btn btn-primary medcond-quiz-next" type="button" onClick={next}>Next →</button>
        )}
      </div>
    </>
  );
}

// ─── Tab strip ────────────────────────────────────────────────────────────────

const TABS: { id: MedTab; label: string }[] = [
  { id: "browse", label: "Browse" },
  { id: "compare", label: "Compare" },
  { id: "quiz", label: "Quiz" },
];

export function MedConditionsView() {
  const r = route.value as { tab?: string };
  const tab = (r.tab as MedTab) ?? "browse";

  return (
    <div class="medcond-wrap">
      <div class="medcond-tab-strip">
        {TABS.map(t => (
          <button
            key={t.id}
            class={`medcond-tab-btn${tab === t.id ? " active" : ""}`}
            type="button"
            onClick={() => navigate({ view: "medconditions", tab: t.id })}
          >{t.label}</button>
        ))}
      </div>
      {tab === "browse" && <BrowseTab />}
      {tab === "compare" && <CompareTab />}
      {tab === "quiz" && <QuizTab />}
    </div>
  );
}
