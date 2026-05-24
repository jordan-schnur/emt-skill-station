import { sheetMasteryPct } from "./drillHelpers";
import type { AppState, Sheet, SheetTab } from "../types";

export function suggestNextMode(state: AppState, sheet: Sheet): { tab: SheetTab; label: string } {
  const drillable = sheet.sections.filter((s) => s.steps.length >= 2);
  const seqRecs = state.drills?.stepseq?.[sheet.id] ?? {};
  if (sheet.sections.length > 1 && !state.drills?.secorder?.[sheet.id]?.mastered) {
    return { tab: "order", label: "Section Order Drill" };
  }
  const nextSec = drillable.find((s) => !seqRecs[s.name]?.mastered);
  if (nextSec) return { tab: "steps", label: `Step Drill — ${nextSec.name}` };
  if (!state.drills?.whatnext?.[sheet.id]?.mastered) {
    return { tab: "whatnext", label: "What's Next? Drill" };
  }
  if ((state.drills?.blankrecall?.[sheet.id]?.bestPct ?? 0) < 90) {
    return { tab: "recall", label: "Blank Recall" };
  }
  if (!state.drills?.spokenscript?.[sheet.id]?.mastered) {
    return { tab: "script", label: "Spoken Script" };
  }
  return { tab: "sheet", label: "Full sheet review" };
}

export function computeTodayContext(state: AppState, sheets: Sheet[]) {
  const masteryPcts = sheets.map((s) => sheetMasteryPct(state, s));
  const overallMasteryPct = Math.round(masteryPcts.reduce((a, b) => a + b, 0) / sheets.length);
  const sheetsAbove80 = masteryPcts.filter((p) => p >= 80).length;
  const totalSheetsToMaster = masteryPcts.filter((p) => p < 100).length;

  let lowestSheet = sheets[0];
  let lowestPct = 101;
  for (let i = 0; i < sheets.length; i++) {
    if (masteryPcts[i] < lowestPct) { lowestPct = masteryPcts[i]; lowestSheet = sheets[i]; }
  }

  const criticalAlertSheets = sheets.filter((s, i) =>
    (s.criticalCriteria?.length ?? 0) > 0 && masteryPcts[i] < 50
  );

  return { overallMasteryPct, sheetsAbove80, lowestMasterySheet: lowestSheet, criticalAlertSheets, totalSheetsToMaster };
}

export function reviewsThisWeek(log: Record<string, number> | undefined): number[] {
  const todayStr = new Date().toISOString().slice(0, 10);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(todayStr);
    d.setUTCDate(d.getUTCDate() - (6 - i));
    return (log ?? {})[d.toISOString().slice(0, 10)] ?? 0;
  });
}
