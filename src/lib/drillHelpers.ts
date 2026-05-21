import type { AppState, Sheet } from "../types";

export interface FlatStep {
  text: string;
  sectionName: string;
}

export interface ScriptStep {
  text: string;
  spokenScript: string;
  sectionName: string;
}

export interface MatchResult {
  expected: FlatStep;
  matched: boolean;
  typedLine: string | null;
  score: number;
  outOfOrder?: boolean;
}

export function buildFlatSequence(sheet: Sheet): FlatStep[] {
  const seq: FlatStep[] = [];
  for (const section of sheet.sections) {
    for (const step of section.steps) {
      seq.push({ text: step.text, sectionName: section.name });
      for (const sub of (step.substeps ?? [])) {
        seq.push({ text: sub.text, sectionName: section.name });
      }
    }
  }
  return seq;
}

export function buildScriptSequence(sheet: Sheet): ScriptStep[] {
  const seq: ScriptStep[] = [];
  for (const section of sheet.sections) {
    for (const step of section.steps) {
      if (step.spokenScript) {
        seq.push({ text: step.text, spokenScript: step.spokenScript, sectionName: section.name });
      }
    }
  }
  return seq;
}

function tokenize(text: string): string[] {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, "").split(/\s+/).filter(Boolean);
}

export function jaccardSimilarity(a: string, b: string): number {
  const setA = new Set(tokenize(a));
  const setB = new Set(tokenize(b));
  if (setA.size === 0 && setB.size === 0) return 1;
  let intersection = 0;
  for (const tok of setA) { if (setB.has(tok)) intersection++; }
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

export function matchLines(typedLines: string[], expectedSteps: FlatStep[], threshold = 0.45): MatchResult[] {
  const available = [...typedLines];
  return expectedSteps.map((expected) => {
    let bestScore = 0, bestIdx = -1;
    available.forEach((line, i) => {
      const s = jaccardSimilarity(line, expected.text);
      if (s > bestScore) { bestScore = s; bestIdx = i; }
    });
    if (bestScore >= threshold && bestIdx !== -1) {
      const matched = available.splice(bestIdx, 1)[0];
      return { expected, matched: true, typedLine: matched, score: bestScore };
    }
    return { expected, matched: false, typedLine: null, score: bestScore };
  });
}

const DRILL_MASTERY_RUNS = 3;

export function sheetMasteryPct(state: AppState, sheet: Sheet): number {
  const secRec = state.drills?.secorder?.[sheet.id];
  const secScore = secRec?.mastered ? 1 : Math.min((secRec?.streak ?? 0) / DRILL_MASTERY_RUNS, 1);

  const drillable = sheet.sections.filter((s) => s.steps.length >= 2);
  const stepScore =
    drillable.length === 0
      ? 0
      : drillable.filter((s) => state.drills?.stepseq?.[sheet.id]?.[s.name]?.mastered).length /
        drillable.length;

  const wnRec = state.drills?.whatnext?.[sheet.id];
  const wnScore = wnRec?.mastered ? 1 : Math.min((wnRec?.streak ?? 0) / DRILL_MASTERY_RUNS, 1);

  const brRec = state.drills?.blankrecall?.[sheet.id];
  const brScore = (brRec?.bestPct ?? 0) / 100;

  const ssRec = state.drills?.spokenscript?.[sheet.id];
  const ssScore = ssRec?.mastered ? 1 : Math.min((ssRec?.streak ?? 0) / DRILL_MASTERY_RUNS, 1);

  return Math.round(((secScore + stepScore + wnScore + brScore + ssScore) / 5) * 100);
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  if (a.length > 1 && a.every((v, i) => v === arr[i])) return shuffle(arr);
  return a;
}
