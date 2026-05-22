import { useState } from "preact/hooks";
import { route, navigate } from "../store/appStore";
import { BLS_MEDICATIONS } from "../data/bls_medications";
import type { BLSMedication } from "../types";

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

function ScenariosTab() {
  return <div class="blsmed-scenarios"><p class="muted">Scenarios coming soon…</p></div>;
}

function DrillTab() {
  return <div class="blsmed-drill"><p class="muted">Drill coming soon…</p></div>;
}

const TABS: { id: BlsTab; label: string }[] = [
  { id: "reference", label: "Reference" },
  { id: "scenarios", label: "Scenarios" },
  { id: "drill", label: "Drill" },
];

export function BlsMedsView() {
  const r = route.value as { blsmedsTab?: string };
  const tab = (r.blsmedsTab as BlsTab) ?? "reference";
  return (
    <div class="blsmed-wrap">
      <div class="blsmed-tab-strip">
        {TABS.map((t) => (
          <button
            key={t.id}
            class={`blsmed-tab-btn${tab === t.id ? " active" : ""}`}
            type="button"
            onClick={() => navigate({ view: "blsmeds", blsmedsTab: t.id })}
          >{t.label}</button>
        ))}
      </div>
      {tab === "reference" && <ReferenceTab />}
      {tab === "scenarios" && <ScenariosTab />}
      {tab === "drill" && <DrillTab />}
    </div>
  );
}
