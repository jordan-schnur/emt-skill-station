import type { AppState } from "../types";

const KEY = "nremt.state.v1";

export function createEmptyState(): AppState {
  return {
    version: 1,
    srs: {},
    notes: { step: {}, sheet: {} },
    stats: {
      totalReviews: 0,
      lastReviewedAt: null,
      dailyStreak: 0,
      longestStreak: 0,
      lastStreakDay: null,
    },
    drills: { secorder: {}, stepseq: {}, whatnext: {}, blankrecall: {}, spokenscript: {} },
    achievements: {},
    mnemonics: {},
    chats: {},
    emsSrs: {},
    medcondSrs: {},
  };
}

function mergeState(parsed: unknown): AppState {
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return createEmptyState();
  }
  const p = parsed as Record<string, unknown>;
  const fresh = createEmptyState();
  const parsedDrills = (p["drills"] as Record<string, unknown>) || {};
  return {
    ...fresh,
    ...(p as Partial<AppState>),
    notes: { ...fresh.notes, ...((p["notes"] as Partial<AppState["notes"]>) || {}) },
    stats: { ...fresh.stats, ...((p["stats"] as Partial<AppState["stats"]>) || {}) },
    srs: (p["srs"] as AppState["srs"]) || {},
    achievements: { ...((p["achievements"] as AppState["achievements"]) || {}) },
    mnemonics: { ...((p["mnemonics"] as AppState["mnemonics"]) || {}) },
    chats: { ...((p["chats"] as AppState["chats"]) || {}) },
    emsSrs: { ...((p["emsSrs"] as AppState["emsSrs"]) || {}) },
    drills: {
      ...fresh.drills,
      ...(parsedDrills as Partial<AppState["drills"]>),
      secorder:     parsedDrills["secorder"]     ? { ...(parsedDrills["secorder"]     as AppState["drills"]["secorder"]) }     : {},
      stepseq:      parsedDrills["stepseq"]      ? { ...(parsedDrills["stepseq"]      as AppState["drills"]["stepseq"]) }      : {},
      whatnext:     parsedDrills["whatnext"]     ? { ...(parsedDrills["whatnext"]     as AppState["drills"]["whatnext"]) }     : {},
      blankrecall:  parsedDrills["blankrecall"]  ? { ...(parsedDrills["blankrecall"]  as AppState["drills"]["blankrecall"]) }  : {},
      spokenscript: parsedDrills["spokenscript"] ? { ...(parsedDrills["spokenscript"] as AppState["drills"]["spokenscript"]) } : {},
    },
  };
}

export function load(): AppState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return createEmptyState();
    return mergeState(JSON.parse(raw));
  } catch (err) {
    console.error("Failed to load state", err);
    return createEmptyState();
  }
}

export function save(state: AppState): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch (err) {
    console.error("Failed to save state", err);
  }
}

export function reset(): void {
  localStorage.removeItem(KEY);
}

export function exportToFile(state: AppState): void {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const stamp = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `nremt-progress-${stamp}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function importFromFile(file: File): Promise<AppState> {
  const text = await file.text();
  const parsed: unknown = JSON.parse(text);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Invalid file");
  }
  return mergeState(parsed);
}

export const Storage = { load, save, reset, exportToFile, importFromFile, KEY, createEmptyState };
