import { sheetMasteryPct } from "./drillHelpers";
import { suggestNextMode } from "./todayContext";
import type { AppState, Sheet, SheetTab } from "../types";

export interface Recommendation {
  sheet: Sheet;
  tab: SheetTab;
  label: string;
  justification: string;
  durationMin: number;
}

const DURATION: Record<SheetTab, number> = {
  order: 5,
  whatnext: 5,
  steps: 8,
  recall: 8,
  script: 8,
  sheet: 3,
  notes: 3,
  mnemonics: 3,
  chat: 3,
  critical: 5,
  drill: 10,
};

function buildJustification(state: AppState, sheet: Sheet, tab: SheetTab): string {
  if (tab === "critical") {
    return `${sheet.shortTitle || sheet.title} has critical criteria that could auto-fail your exam — drill them now.`;
  }
  if (tab === "order") {
    return "You haven't drilled the section order yet — it's the spine of the sheet.";
  }
  if (tab === "steps") {
    const seqRecs = state.drills?.stepseq?.[sheet.id] ?? {};
    const drillable = sheet.sections.filter((s) => s.steps.length >= 2);
    const remaining = drillable.filter((s) => !seqRecs[s.name]?.mastered).length;
    return `${remaining} of ${drillable.length} step sequence${drillable.length !== 1 ? "s" : ""} still need work.`;
  }
  if (tab === "whatnext") {
    return "Section order is locked in — now practice picking what comes next.";
  }
  if (tab === "recall") {
    const bestPct = state.drills?.blankrecall?.[sheet.id]?.bestPct ?? 0;
    if (bestPct === 0) return "Try writing every step from memory — it's the best way to find gaps.";
    return `Your best blank recall is ${bestPct}% — push it to 90%+ to move on.`;
  }
  if (tab === "script") {
    return "Nearly there — practice saying the steps aloud to build verbal fluency for exam day.";
  }
  return "All drills are strong — do a quick full-sheet review to stay sharp.";
}

export function recommendNext(state: AppState, sheets: Sheet[]): Recommendation {
  const masteryPcts = sheets.map((s) => sheetMasteryPct(state, s));

  const criticalSheet = sheets.find((s, i) =>
    (s.criticalCriteria?.length ?? 0) > 0 && masteryPcts[i] < 50
  );

  if (criticalSheet) {
    return {
      sheet: criticalSheet,
      tab: "critical",
      label: "Critical Criteria Drill",
      justification: buildJustification(state, criticalSheet, "critical"),
      durationMin: DURATION["critical"],
    };
  }

  let lowestSheet = sheets[0];
  let lowestPct = 101;
  for (let i = 0; i < sheets.length; i++) {
    if (masteryPcts[i] < lowestPct) {
      lowestPct = masteryPcts[i];
      lowestSheet = sheets[i];
    }
  }

  const { tab, label } = suggestNextMode(state, lowestSheet);
  return {
    sheet: lowestSheet,
    tab,
    label,
    justification: buildJustification(state, lowestSheet, tab),
    durationMin: DURATION[tab] ?? 5,
  };
}
