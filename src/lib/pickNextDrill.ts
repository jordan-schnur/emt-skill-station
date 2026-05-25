import type { AppState, Sheet } from "../types";

export type DrillType = "order" | "steps" | "whatnext";

export interface DrillSelection {
  type: DrillType;
  sectionName?: string;
}

export function pickNextDrill(state: AppState, sheet: Sheet): DrillSelection {
  const secRec = state.drills?.secorder?.[sheet.id];
  if (!secRec?.mastered && (secRec?.attempts ?? 0) < 3) {
    return { type: "order" };
  }

  const drillableSections = sheet.sections.filter((s) => s.steps.length >= 2);
  const seqRecs = state.drills?.stepseq?.[sheet.id] ?? {};

  const unmasteredSections = drillableSections.filter((s) => !seqRecs[s.name]?.mastered);

  if (unmasteredSections.length > 0) {
    const weakest = unmasteredSections.reduce((best, s) => {
      const bestStreak = seqRecs[best.name]?.streak ?? 0;
      const sStreak = seqRecs[s.name]?.streak ?? 0;
      return sStreak < bestStreak ? s : best;
    });
    return { type: "steps", sectionName: weakest.name };
  }

  if (drillableSections.length > 0) {
    return { type: "whatnext" };
  }

  return { type: "order" };
}
