import { navigate } from "../store/appStore";

const BIG_FIVE = [
  { num: 1, label: "Scene safe?", script: '"Is the scene safe to enter?"' },
  { num: 2, label: "BSI", script: '"I am taking BSI precautions." (gloves, eye protection)' },
  { num: 3, label: "Number of patients", script: '"I see one patient."' },
  { num: 4, label: "MOI / NOI", script: '"Mechanism of injury is…" or "Nature of illness is…"' },
  { num: 5, label: "Additional resources", script: '"Do I need additional resources?"' },
];

type Scenario = {
  name: string;
  equipment: string;
  sheetId: string | null;
  issueUrl: string | null;
};

const SCENARIOS: Scenario[] = [
  { name: "O2 Administration", equipment: "Non-rebreather mask, O2 cylinder, regulator", sheetId: "e204", issueUrl: null },
  { name: "CPR / AED", equipment: "AED, CPR barrier, gloves", sheetId: "e215", issueUrl: null },
  { name: "Tourniquet / Bleeding Control", equipment: "Tourniquet, trauma dressings, gloves", sheetId: "e213", issueUrl: null },
  { name: "Joint Immobilization", equipment: "SAM splints, padding, bandaging", sheetId: "e216", issueUrl: null },
  { name: "Long Bone Immobilization", equipment: "Traction splint or board splints", sheetId: "e217", issueUrl: null },
  { name: "OPA / BVM Ventilation", equipment: "BVM, OPA set, O2 source", sheetId: "e203", issueUrl: null },
  { name: "CPAP", equipment: "CPAP mask, manometer, O2 source", sheetId: null, issueUrl: null },
  { name: "12-Lead ECG", equipment: "12-lead monitor, leads, electrodes", sheetId: null, issueUrl: null },
  { name: "Suction", equipment: "Suction unit, yankauer catheter", sheetId: null, issueUrl: null },
  { name: "Vitals (Pulse, BP, RR)", equipment: "BP cuff, stethoscope, watch", sheetId: null, issueUrl: null },
];

export function ExamDayView() {
  return (
    <div class="examday-view">
      <h1>Exam Day</h1>
      <p class="examday-intro">Tips from a PA NREMT examiner. Know these before you walk in the room.</p>

      <section class="examday-section">
        <h2>Dispatch strategy</h2>
        <p class="examday-callout">Dispatches are vague — write down what you hear immediately.</p>
        <ul class="examday-list">
          <li>Listen for age, chief complaint, and mechanism of injury.</li>
          <li>Don't assume the scenario from the dispatch alone.</li>
          <li>Note-taking on arrival is expected and professional.</li>
        </ul>
      </section>

      <section class="examday-section">
        <h2>Read the room</h2>
        <p class="examday-callout">Equipment in the room is a clue — look before you approach.</p>
        <ul class="examday-list">
          <li>The equipment set up in the station often signals the scenario type.</li>
          <li>Example: CPAP mask + O2 cylinder → CPAP station. BP cuff + stethoscope → Vitals.</li>
          <li>If O2 is already assembled, leave it assembled.</li>
          <li>Do a quick visual scan before beginning.</li>
        </ul>
      </section>

      <section class="examday-section">
        <h2>The Big 5</h2>
        <p class="examday-section-desc">Always verbalize these before beginning any skill. The examiner scores only what they hear.</p>
        <div class="big-five-list">
          {BIG_FIVE.map((item) => (
            <div key={item.num} class="big-five-card">
              <span class="big-five-num">{item.num}</span>
              <div class="big-five-body">
                <strong class="big-five-label">{item.label}</strong>
                <div class="big-five-script">{item.script}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section class="examday-section">
        <h2>During the station</h2>
        <ul class="examday-list">
          <li>Talk to the patient. Talk to family members. Announce every action to the examiner.</li>
          <li>Request all information — vital signs, patient history, allergies.</li>
          <li><strong>Silence = not done.</strong> The examiner can only score what they hear.</li>
        </ul>
      </section>

      <section class="examday-section">
        <h2>Wrap-up: hospital transport</h2>
        <ul class="examday-list">
          <li>At the end the examiner may ask: <em>"Where would you transport this patient?"</em></li>
          <li>Know trauma center vs. stroke center vs. STEMI center criteria for your region.</li>
          <li>If unsure: say "the nearest appropriate facility" and briefly justify why.</li>
        </ul>
      </section>

      <section class="examday-section">
        <h2>Logistics</h2>
        <ul class="examday-list">
          <li>Pennsylvania uses a <strong>single-scenario format</strong> — not the older multi-station rotation.</li>
          <li>You can often <strong>retry the same night</strong> if you fail — ask the examiner immediately after the debrief.</li>
          <li>Do not leave the testing site before asking about a re-attempt.</li>
        </ul>
      </section>

      <section class="examday-section">
        <h2>Possible scenarios (PA format)</h2>
        <p class="examday-section-desc">Click a linked card to jump straight to that skill sheet.</p>
        <div class="scenario-grid">
          {SCENARIOS.map((s) => (
            <div
              key={s.name}
              class={`scenario-card${s.sheetId ? " scenario-card--linked" : " scenario-card--soon"}`}
              role={s.sheetId ? "button" : undefined}
              tabIndex={s.sheetId ? 0 : undefined}
              onClick={s.sheetId ? () => navigate({ view: "sheet", sheetId: s.sheetId!, tab: "sheet" }) : undefined}
              onKeyDown={s.sheetId ? (e) => {
                if (e.key === "Enter" || e.key === " ") { e.preventDefault(); navigate({ view: "sheet", sheetId: s.sheetId!, tab: "sheet" }); }
              } : undefined}
            >
              <div class="scenario-name">{s.name}</div>
              <div class="scenario-equipment">{s.equipment}</div>
              {s.sheetId
                ? <span class="scenario-badge scenario-badge--go">Practice →</span>
                : <span class="scenario-badge scenario-badge--soon">Coming soon</span>
              }
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
