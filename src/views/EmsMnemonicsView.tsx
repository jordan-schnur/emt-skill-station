import { useState } from "preact/hooks";
import { appState, mutateState, save, navigate } from "../store/appStore";
import { EMS_CLINICAL_MNEMONICS } from "../data/ems_clinical_mnemonics";
import { defaultRecord, grade, describeDue } from "../lib/emsSrs";
import { route } from "../store/appStore";
import type { ClinicalMnemonic, SRSRecord } from "../types";

type Grade = "again" | "hard" | "good" | "easy";

// ─── Browse card ────────────────────────────────────────────────────────────

function EmsCard({ mnemonic, srsRec }: { mnemonic: ClinicalMnemonic; srsRec: SRSRecord | undefined }) {
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
        </div>
      )}
    </div>
  );
}

// ─── Browse mode ─────────────────────────────────────────────────────────────

function BrowseMode() {
  const categories = ["All", ...Array.from(new Set(EMS_CLINICAL_MNEMONICS.map(m => m.category)))];
  const [activeCat, setActiveCat] = useState("All");
  const srsStore = appState.value.emsSrs ?? {};
  const now = Date.now();
  const dueCount = EMS_CLINICAL_MNEMONICS.filter(m => {
    const rec = srsStore["ems::" + m.id];
    return !rec || rec.due <= now;
  }).length;

  const filtered = activeCat === "All"
    ? EMS_CLINICAL_MNEMONICS
    : EMS_CLINICAL_MNEMONICS.filter(m => m.category === activeCat);

  return (
    <>
      <h1>EMS Mnemonics &amp; Acronyms</h1>
      <p class="subtitle">Clinical assessment and treatment acronyms used throughout EMS. Tap a card to expand, or use Quiz mode for spaced repetition.</p>
      <div class="ems-filter-row">
        {categories.map(cat => (
          <button
            key={cat}
            class={`ems-filter-chip${cat === activeCat ? " active" : ""}`}
            type="button"
            onClick={() => setActiveCat(cat)}
          >{cat}</button>
        ))}
      </div>
      <button
        class="btn btn-primary ems-quiz-btn"
        type="button"
        onClick={() => navigate({ view: "mnemonics", mnemonicsTab: "quiz" })}
      >
        {dueCount > 0 ? `Quiz — ${dueCount} card${dueCount === 1 ? "" : "s"} due` : "Quiz — all caught up"}
      </button>
      <div class="ems-mnemonic-grid">
        {filtered.map(m => (
          <EmsCard key={m.id} mnemonic={m} srsRec={srsStore["ems::" + m.id]} />
        ))}
      </div>
    </>
  );
}

// ─── Quiz mode ────────────────────────────────────────────────────────────────

function QuizMode() {
  const srsStore = appState.value.emsSrs ?? {};
  const now = Date.now();

  const due = EMS_CLINICAL_MNEMONICS
    .filter(m => { const r = srsStore["ems::" + m.id]; return r && r.due <= now; })
    .sort((a, b) => (srsStore["ems::" + a.id]?.due ?? 0) - (srsStore["ems::" + b.id]?.due ?? 0))
    .map(m => ({ m, rec: srsStore["ems::" + m.id] }));

  const fresh = EMS_CLINICAL_MNEMONICS
    .filter(m => !srsStore["ems::" + m.id])
    .map(m => ({ m, rec: defaultRecord() }));

  const initialQueue = [...due, ...fresh];

  const [queue, setQueue] = useState(initialQueue);
  const [idx, setIdx] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [done, setDone] = useState(false);

  if (done || queue.length === 0) {
    return (
      <div class="empty-state">
        <div class="big">✓</div>
        <p>{queue.length === 0 ? "All caught up! Come back later." : "Session complete!"}</p>
        <button class="btn" onClick={() => navigate({ view: "mnemonics", mnemonicsTab: "browse" })}>← Browse mnemonics</button>
      </div>
    );
  }

  const { m, rec } = queue[idx];
  const remaining = queue.length - idx;

  function applyGrade(g: Grade) {
    const cardId = "ems::" + m.id;
    const updated = grade(rec, g);
    mutateState(draft => {
      if (!draft.emsSrs) draft.emsSrs = {};
      draft.emsSrs[cardId] = updated;
    });
    save();

    if (g === "again") {
      setQueue(q => [...q, { m, rec: updated }]);
    }
    if (idx + 1 >= queue.length + (g === "again" ? 1 : 0)) {
      setDone(true);
    } else {
      setIdx(i => i + 1);
      setRevealed(false);
    }
  }

  return (
    <>
      <div class="crumbs">
        <button class="btn-link" onClick={() => navigate({ view: "mnemonics", mnemonicsTab: "browse" })}>← Back to EMS Mnemonics &amp; Acronyms</button>
      </div>
      <div class="ems-quiz-header">
        <span class="ems-quiz-counter">{remaining} card{remaining === 1 ? "" : "s"} remaining</span>
      </div>
      <div class="ems-quiz-card">
        <div class="ems-quiz-front">
          <div class="ems-quiz-acronym">{m.acronym}</div>
          <div class="ems-quiz-category">{m.category}</div>
          <div class="ems-quiz-prompt muted">What does each letter stand for?</div>
        </div>
        {revealed && (
          <div class="ems-quiz-back">
            {m.note && <div class="ems-card-note">{m.note}</div>}
            <div class="ems-letter-table">
              {m.letters.filter(l => l.stand !== "(connector)").map((l, i) => (
                <div class="ems-letter-row" key={i}>
                  <span class="ems-letter-badge">{l.letter}</span>
                  <div class="ems-letter-content">
                    <strong>{l.stand}</strong>
                    {l.detail && <div class="ems-letter-detail muted">{l.detail}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {!revealed ? (
          <button class="btn btn-primary ems-reveal-btn" onClick={() => setRevealed(true)}>Reveal</button>
        ) : (
          <div class="ems-grade-row">
            {(["again", "hard", "good", "easy"] as Grade[]).map((g, i) => (
              <button
                key={g}
                class={`btn ${i === 0 ? "btn-danger" : i === 2 ? "btn-primary" : ""}`}
                onClick={() => applyGrade(g)}
              >
                {g.charAt(0).toUpperCase() + g.slice(1)}
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

// ─── Root view ────────────────────────────────────────────────────────────────

export function EmsMnemonicsView() {
  const tab = route.value.mnemonicsTab ?? "browse";
  return (
    <div class="ems-mnemonics">
      {tab === "quiz" ? <QuizMode /> : <BrowseMode />}
    </div>
  );
}
