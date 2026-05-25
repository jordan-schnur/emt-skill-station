import type { MedicalCondition } from "../types";

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

interface Props {
  group: { label: string; dimensions: string[] };
  conditions: MedicalCondition[];
  onClose: () => void;
}

export function ConditionCompareModal({ group, conditions, onClose }: Props) {
  if (!conditions.length) return null;

  return (
    <div class="compare-modal-overlay" onClick={onClose}>
      <div class="compare-modal" onClick={e => e.stopPropagation()}>
        <div class="compare-modal-header">
          <h2 class="compare-modal-title">{group.label}</h2>
          <button class="compare-modal-close btn" type="button" onClick={onClose} aria-label="Close">×</button>
        </div>
        <div class="compare-modal-body">
          <div class="medcond-compare-table" style={`--cols: ${conditions.length}`}>
            <div class="medcond-th medcond-dim-label" />
            {conditions.map(c => <div key={c.id} class="medcond-th">{c.name}</div>)}
            {group.dimensions.map((dim, ri) => (
              <>
                <div key={`label-${dim}`} class={`medcond-td medcond-dim-label${ri % 2 === 1 ? " medcond-row-stripe" : ""}`}>
                  {DIM_LABELS[dim] ?? dim}
                </div>
                {conditions.map(c => (
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
        </div>
      </div>
    </div>
  );
}
