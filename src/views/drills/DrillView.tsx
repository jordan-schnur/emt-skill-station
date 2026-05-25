import { useState } from "preact/hooks";
import { appState } from "../../store/appStore";
import { pickNextDrill } from "../../lib/pickNextDrill";
import { SectionOrderDrill } from "./SectionOrderDrill";
import { StepSeqDrill } from "./StepSeqDrill";
import { WhatNextDrill } from "./WhatNextDrill";
import type { Sheet, Section } from "../../types";
import type { DrillType } from "../../lib/pickNextDrill";

const DRILL_LABELS: Record<DrillType, string> = {
  order: "Section Order",
  steps: "Step Sequence",
  whatnext: "What's Next?",
};

function DrillWithSection({ sheet, sectionName }: { sheet: Sheet; sectionName: string }) {
  const section = sheet.sections.find((s) => s.name === sectionName);
  if (!section) return <StepSeqDrill sheet={sheet} />;

  const patchedSheet: Sheet = {
    ...sheet,
    sections: [section],
  };
  return <StepSeqDrill sheet={patchedSheet} />;
}

export function DrillView({ sheet }: { sheet: Sheet }) {
  const [round, setRound] = useState(1);
  const [selection, setSelection] = useState(() => pickNextDrill(appState.value, sheet));
  const [manualOverride, setManualOverride] = useState<DrillType | "">("");

  const effectiveType: DrillType = (manualOverride as DrillType) || selection.type;

  function advance() {
    const next = pickNextDrill(appState.value, sheet);
    setSelection(next);
    setManualOverride("");
    setRound((r) => r + 1);
  }

  function handleManualChange(e: Event) {
    const val = (e.target as HTMLSelectElement).value as DrillType | "";
    setManualOverride(val);
    if (val) setRound((r) => r + 1);
  }

  let drillContent;
  if (effectiveType === "order") {
    drillContent = <SectionOrderDrill key={`${sheet.id}:order:${round}`} sheet={sheet} />;
  } else if (effectiveType === "steps") {
    const sectionName = manualOverride ? undefined : selection.sectionName;
    if (sectionName) {
      drillContent = <DrillWithSection key={`${sheet.id}:steps:${sectionName}:${round}`} sheet={sheet} sectionName={sectionName} />;
    } else {
      drillContent = <StepSeqDrill key={`${sheet.id}:steps:${round}`} sheet={sheet} />;
    }
  } else {
    drillContent = <WhatNextDrill key={`${sheet.id}:whatnext:${round}`} sheet={sheet} />;
  }

  return (
    <div class="drill-view">
      <div class="drill-view-header">
        <div class="drill-view-round">Drill Session — Round {round}</div>
        <div class="drill-view-type">{DRILL_LABELS[effectiveType]}</div>
        <div class="drill-view-controls">
          <select
            class="drill-view-select"
            value={manualOverride}
            onChange={handleManualChange}
            aria-label="Pick a specific drill"
          >
            <option value="">Engine picks for you</option>
            <option value="order">Section Order</option>
            <option value="steps">Step Sequence</option>
            <option value="whatnext">What's Next?</option>
          </select>
        </div>
      </div>

      {drillContent}

      <div class="drill-view-footer">
        <button class="btn btn-primary" onClick={advance}>
          Next drill →
        </button>
      </div>
    </div>
  );
}
