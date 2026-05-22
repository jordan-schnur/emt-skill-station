import { useState } from "preact/hooks";
import { route, navigate, appState, mutateState, save } from "../store/appStore";
import { BLS_MEDICATIONS } from "../data/bls_medications";
import { defaultRecord, grade } from "../lib/emsSrs";
import type { BLSMedication, BLSScenario, BLSFollowUp, SRSRecord } from "../types";

type BlsTab = "reference" | "scenarios" | "drill";

function MedCard({ med }: { med: BLSMedication }) {
  const [open, setOpen] = useState(false);
  return (
    <div class={`blsmed-card${open ? " expanded" : ""}`} onClick={() => setOpen((o) => !o)}>
      <div class="blsmed-card-header">
        <div class="blsmed-card-left">
          <span class="blsmed-name">{med.name}</span>
          {med.genericName && med.genericName !== med.name && (
            <span class="blsmed-generic muted">{med.genericName}</span>
          )}
        </div>
        <div class="blsmed-card-right">
          <span class="blsmed-expand-icon">{open ? "▴" : "▾"}</span>
        </div>
      </div>
      {!open && <div class="blsmed-mechanism-preview muted">{med.mechanism}</div>}
      {open && (
        <div class="blsmed-card-body">
          <div class="blsmed-mechanism">{med.mechanism}</div>
          <div class="blsmed-section blsmed-indications">
            <div class="blsmed-section-label">Indications</div>
            <ul class="blsmed-list">{med.indications.map((i, idx) => <li key={idx}>{i}</li>)}</ul>
          </div>
          <div class="blsmed-section blsmed-contraindications">
            <div class="blsmed-section-label">Contraindications</div>
            <ul class="blsmed-list">{med.contraindications.map((c, idx) => <li key={idx}>{c}</li>)}</ul>
          </div>
          <div class="blsmed-section">
            <div class="blsmed-section-label">Dose</div>
            <div><strong>Adult:</strong> {med.dose.adult}</div>
            {med.dose.pediatric && <div class="muted"><strong>Pediatric:</strong> {med.dose.pediatric}</div>}
            {med.dose.notes && <div class="muted">{med.dose.notes}</div>}
          </div>
          <div class="blsmed-section">
            <div class="blsmed-section-label">Route</div>
            <ul class="blsmed-list">{med.route.map((r, idx) => <li key={idx}>{r}</li>)}</ul>
          </div>
          <div class="blsmed-section">
            <div class="blsmed-section-label">Onset</div>
            <div>{med.onset}{med.duration ? ` · Duration: ${med.duration}` : ""}</div>
          </div>
          <div class="blsmed-section">
            <div class="blsmed-section-label">Side Effects</div>
            <ul class="blsmed-list">{med.sideEffects.map((s, idx) => <li key={idx}>{s}</li>)}</ul>
          </div>
          <div class="blsmed-section blsmed-pearls">
            <div class="blsmed-section-label">Clinical Pearls</div>
            <ul class="blsmed-list">{med.clinicalPearls.map((p, idx) => <li key={idx}>{p}</li>)}</ul>
          </div>
        </div>
      )}
    </div>
  );
}

function ReferenceTab() {
  const categories = ["All", ...Array.from(new Set(BLS_MEDICATIONS.map((m) => m.category)))];
  const [activeCat, setActiveCat] = useState("All");
  const filtered = activeCat === "All" ? BLS_MEDICATIONS : BLS_MEDICATIONS.filter((m) => m.category === activeCat);
  return (
    <div class="blsmed-reference">
      <div class="blsmed-filter-row">
        {categories.map((cat) => (
          <button
            key={cat}
            class={`blsmed-filter-chip${cat === activeCat ? " active" : ""}`}
            type="button"
            onClick={(e) => { e.stopPropagation(); setActiveCat(cat); }}
          >{cat}</button>
        ))}
      </div>
      <div class="blsmed-card-grid">
        {filtered.map((med) => <MedCard key={med.id} med={med} />)}
      </div>
    </div>
  );
}

function buildScenarioQueue() {
  const srsStore = appState.value.blsMedsSrs ?? {};
  const now = Date.now();
  const all: Array<{ scenario: BLSScenario; medId: string; rec: SRSRecord }> = [];
  for (const med of BLS_MEDICATIONS) {
    for (const s of med.scenarios) {
      const key = `blsmed::${med.id}::${s.id}`;
      const rec = srsStore[key] ?? defaultRecord();
      all.push({ scenario: s, medId: med.id, rec });
    }
  }
  const due = all.filter((x) => x.rec.due && x.rec.due <= now).sort((a, b) => a.rec.due - b.rec.due);
  const fresh = all.filter((x) => !x.rec.due || x.rec.due === 0);
  const upcoming = all.filter((x) => x.rec.due && x.rec.due > now).sort((a, b) => a.rec.due - b.rec.due);
  return [...due, ...fresh, ...upcoming].slice(0, 10);
}

function ScenariosTab() {
  const [queue] = useState(() => buildScenarioQueue());
  const [idx, setIdx] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [deepMode, setDeepMode] = useState(false);
  const [followUpIdx, setFollowUpIdx] = useState(0);
  const [followUpAnswered, setFollowUpAnswered] = useState(false);
  const [followUpSelected, setFollowUpSelected] = useState<string | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [done, setDone] = useState(false);

  if (done || queue.length === 0) {
    const pct = queue.length > 0 ? Math.round((correctCount / Math.min(idx, queue.length)) * 100) : 0;
    return (
      <div class="blsmed-scenarios-done">
        <div class="blsmed-done-score">{pct}%</div>
        <div class="blsmed-done-detail">{correctCount} / {Math.min(idx, queue.length)} correct</div>
        <button class="btn btn-primary" type="button" onClick={() => navigate({ view: "blsmeds", blsmedsTab: "reference" })}>
          ← Back to Reference
        </button>
      </div>
    );
  }

  const { scenario, medId, rec } = queue[idx];
  const isCorrect = answered && selectedAnswer === scenario.answer;
  const hasFollowUps = scenario.followUps.length > 0;
  const currentFollowUp: BLSFollowUp | undefined = scenario.followUps[followUpIdx];

  function chooseAnswer(ans: string) {
    if (answered) return;
    setAnswered(true);
    setSelectedAnswer(ans);
    const wasCorrect = ans === scenario.answer;
    if (wasCorrect) setCorrectCount((c) => c + 1);
    const key = `blsmed::${medId}::${scenario.id}`;
    const updated = grade(rec, wasCorrect ? "good" : "again");
    mutateState((draft) => {
      if (!draft.blsMedsSrs) draft.blsMedsSrs = {};
      draft.blsMedsSrs[key] = updated;
      if (!draft.drills.blsmedsquiz) draft.drills.blsmedsquiz = { scenariosCompleted: 0, lastSessionAt: null };
      draft.drills.blsmedsquiz.scenariosCompleted += 1;
      draft.drills.blsmedsquiz.lastSessionAt = new Date().toISOString();
    });
    save();
  }

  function advance() {
    if (idx + 1 >= queue.length) setDone(true);
    else {
      setIdx((i) => i + 1);
      setAnswered(false);
      setSelectedAnswer(null);
      setDeepMode(false);
      setFollowUpIdx(0);
      setFollowUpAnswered(false);
      setFollowUpSelected(null);
    }
  }

  function chooseFollowUp(opt: string) {
    if (followUpAnswered) return;
    setFollowUpAnswered(true);
    setFollowUpSelected(opt);
  }

  function nextFollowUp() {
    if (followUpIdx + 1 >= scenario.followUps.length) {
      setDeepMode(false);
      advance();
    } else {
      setFollowUpIdx((i) => i + 1);
      setFollowUpAnswered(false);
      setFollowUpSelected(null);
    }
  }

  return (
    <div class="blsmed-scenarios">
      <div class="blsmed-scenarios-header">
        <span class="blsmed-progress">{idx + 1} / {queue.length}</span>
        <span class="blsmed-score muted">{correctCount} correct</span>
      </div>
      {!deepMode ? (
        <div class="blsmed-scenario-card">
          <div class="blsmed-vignette">{scenario.vignette}</div>
          <div class="blsmed-prompt">{scenario.prompt}</div>
          {!answered && scenario.format === "give-withhold" && (
            <div class="blsmed-gw-row">
              <button class="btn btn-primary" type="button" onClick={() => chooseAnswer("give")}>Give</button>
              <button class="btn btn-danger" type="button" onClick={() => chooseAnswer("withhold")}>Withhold</button>
            </div>
          )}
          {answered && (
            <>
              <div class={`blsmed-feedback ${isCorrect ? "blsmed-feedback-correct" : "blsmed-feedback-wrong"}`}>
                {isCorrect ? "Correct!" : `Incorrect — answer is ${scenario.answer.charAt(0).toUpperCase() + scenario.answer.slice(1)}`}
              </div>
              <div class="blsmed-explanation muted">{scenario.explanation}</div>
              <div class="blsmed-actions">
                {hasFollowUps && <button class="btn" type="button" onClick={() => setDeepMode(true)}>Go Deeper →</button>}
                <button class="btn btn-primary" type="button" onClick={advance}>Next →</button>
              </div>
            </>
          )}
        </div>
      ) : (
        currentFollowUp && (
          <div class="blsmed-followup-card">
            <div class="blsmed-followup-label muted">Deep Mode — Follow-up</div>
            <div class="blsmed-followup-question">{currentFollowUp.question}</div>
            <div class="blsmed-followup-options">
              {currentFollowUp.options.map((opt) => (
                <button
                  key={opt}
                  class={`blsmed-option btn${
                    followUpAnswered && opt === currentFollowUp.answer
                      ? " correct"
                      : followUpAnswered && opt === followUpSelected && opt !== currentFollowUp.answer
                      ? " wrong"
                      : ""
                  }`}
                  type="button"
                  disabled={followUpAnswered}
                  onClick={() => chooseFollowUp(opt)}
                >{opt}</button>
              ))}
            </div>
            {followUpAnswered && (
              <button class="btn btn-primary" type="button" onClick={nextFollowUp}>Next →</button>
            )}
          </div>
        )
      )}
    </div>
  );
}

function DrillTab() {
  const srsStore = appState.value.blsMedsSrs ?? {};
  const now = Date.now();
  const [reverse, setReverse] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [done, setDone] = useState(false);

  const due = BLS_MEDICATIONS
    .filter((m) => { const r = srsStore[`blsmed::${m.id}`]; return r && r.due <= now; })
    .sort((a, b) => (srsStore[`blsmed::${a.id}`]?.due ?? 0) - (srsStore[`blsmed::${b.id}`]?.due ?? 0));

  const fresh = BLS_MEDICATIONS.filter((m) => !srsStore[`blsmed::${m.id}`]);
  const initialQueue = [...due, ...fresh];
  const [queue] = useState(initialQueue);
  const [idx, setIdx] = useState(0);

  const dueCount = BLS_MEDICATIONS.filter((m) => {
    const r = srsStore[`blsmed::${m.id}`];
    return !r || r.due <= now;
  }).length;

  if (done || queue.length === 0) {
    return (
      <div class="blsmed-drill-done">
        <p>{queue.length === 0 ? "All caught up! Check back later." : "Session complete!"}</p>
        <button class="btn" type="button" onClick={() => navigate({ view: "blsmeds", blsmedsTab: "reference" })}>
          ← Back to Reference
        </button>
      </div>
    );
  }

  const med = queue[idx];
  const recKey = `blsmed::${med.id}`;
  const rec = srsStore[recKey] ?? defaultRecord();

  function applyGrade(g: "again" | "hard" | "good" | "easy") {
    const updated = grade(rec, g);
    mutateState((draft) => {
      if (!draft.blsMedsSrs) draft.blsMedsSrs = {};
      draft.blsMedsSrs[recKey] = updated;
    });
    save();
    if (idx + 1 >= queue.length) setDone(true);
    else {
      setIdx((i) => i + 1);
      setRevealed(false);
    }
  }

  const reverseClue = med.indications[0] ?? med.contraindications[0];

  return (
    <div class="blsmed-drill">
      <div class="blsmed-drill-header">
        <span class="blsmed-drill-counter">{queue.length - idx} card{queue.length - idx === 1 ? "" : "s"} remaining</span>
        <span class="blsmed-due-count muted">{dueCount} due</span>
        <button
          class={`blsmed-reverse-btn btn${reverse ? " active" : ""}`}
          type="button"
          onClick={() => { setReverse((r) => !r); setRevealed(false); }}
        >Reverse</button>
      </div>
      <div class="blsmed-drill-card">
        <div class="blsmed-drill-card-front">
          {!reverse ? (
            <>
              <div class="blsmed-drill-name">{med.name}</div>
              <div class="blsmed-drill-cat muted">{med.category}</div>
            </>
          ) : (
            <>
              <div class="blsmed-drill-reverse-prompt muted">Which drug?</div>
              <div class="blsmed-drill-clue">{reverseClue}</div>
            </>
          )}
        </div>
        {revealed && (
          <div class="blsmed-drill-card-back">
            {!reverse ? (
              <>
                <div class="blsmed-section">
                  <div class="blsmed-section-label">Indications</div>
                  <ul class="blsmed-list">{med.indications.map((i, n) => <li key={n}>{i}</li>)}</ul>
                </div>
                <div class="blsmed-section">
                  <div class="blsmed-section-label">Contraindications</div>
                  <ul class="blsmed-list">{med.contraindications.map((c, n) => <li key={n}>{c}</li>)}</ul>
                </div>
                <div class="blsmed-section">
                  <strong>Dose:</strong> {med.dose.adult}
                </div>
                <div class="blsmed-section">
                  <strong>Route:</strong> {med.route.join(", ")}
                </div>
                <div class="blsmed-section blsmed-pearls">
                  <div class="blsmed-section-label">Clinical Pearls</div>
                  <ul class="blsmed-list">{med.clinicalPearls.map((p, n) => <li key={n}>{p}</li>)}</ul>
                </div>
              </>
            ) : (
              <div class="blsmed-drill-answer">
                <strong>{med.name}</strong>
                <div class="muted">{med.category}</div>
              </div>
            )}
          </div>
        )}
        {!revealed ? (
          <button class="btn btn-primary" type="button" onClick={() => setRevealed(true)}>Reveal</button>
        ) : (
          <div class="blsmed-grade-row">
            {(["again", "hard", "good", "easy"] as const).map((g, i) => (
              <button
                key={g}
                class={`btn ${i === 0 ? "btn-danger" : i === 2 ? "btn-primary" : ""}`}
                type="button"
                onClick={() => applyGrade(g)}
              >
                {g.charAt(0).toUpperCase() + g.slice(1)}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const TABS: { id: BlsTab; label: string }[] = [
  { id: "reference", label: "Reference" },
  { id: "scenarios", label: "Scenarios" },
  { id: "drill", label: "Drill" },
];

export function BlsMedsView() {
  const r = route.value as { blsmedsTab?: string };
  const tab = (r.blsmedsTab as BlsTab) ?? "reference";
  const srsStore = appState.value.blsMedsSrs ?? {};
  const now = Date.now();
  const drillDue = BLS_MEDICATIONS.filter((m) => {
    const rec = srsStore[`blsmed::${m.id}`];
    return !rec || rec.due <= now;
  }).length;

  return (
    <div class="blsmed-wrap">
      <div class="blsmed-tab-strip">
        {TABS.map((t) => (
          <button
            key={t.id}
            class={`blsmed-tab-btn${tab === t.id ? " active" : ""}`}
            type="button"
            onClick={() => navigate({ view: "blsmeds", blsmedsTab: t.id })}
          >
            {t.id === "drill" && drillDue > 0 ? `Drill (${drillDue})` : t.label}
          </button>
        ))}
      </div>
      {tab === "reference" && <ReferenceTab />}
      {tab === "scenarios" && <ScenariosTab />}
      {tab === "drill" && <DrillTab />}
    </div>
  );
}
