import { vi } from "vitest";
import type { AppState, Sheet, Route } from "../src/types";

export function createMockSheet(overrides: Partial<Sheet> = {}): Sheet {
  return {
    id: "e201",
    title: "Patient Assessment / Management – Trauma",
    shortTitle: "Patient Assessment",
    category: "Patient Assessment",
    totalPoints: 42,
    timeLimit: "10 minutes",
    cards: [
      { id: "e201::ppe::0", sheetId: "e201", text: "Takes or verbalizes appropriate PPE precautions", points: 1, section: "PPE", stepIndex: 0, subIndex: null, parent: null, sectionHeader: false },
      { id: "e201::scene::0", sheetId: "e201", text: "Determines the scene/situation is safe", points: 1, section: "SCENE SIZE-UP", stepIndex: 0, subIndex: null, parent: null, sectionHeader: false },
      { id: "e201::scene::1", sheetId: "e201", text: "Determines the mechanism of injury", points: 1, section: "SCENE SIZE-UP", stepIndex: 1, subIndex: null, parent: null, sectionHeader: false },
    ],
    sections: [
      {
        name: "PPE",
        header: false,
        steps: [
          { text: "Takes or verbalizes appropriate PPE precautions", points: 1, spokenScript: "I'm taking BSI precautions." },
        ],
      },
      {
        name: "SCENE SIZE-UP",
        header: true,
        steps: [
          { text: "Determines the scene/situation is safe", points: 1, spokenScript: "The scene is safe." },
          { text: "Determines the mechanism of injury", points: 1, spokenScript: "The mechanism of injury appears to be blunt trauma." },
        ],
      },
      {
        name: "PRIMARY SURVEY/RESUSCITATION",
        header: true,
        steps: [
          { text: "Verbalizes general impression of the patient", points: 1, spokenScript: "My general impression is an adult male in moderate distress." },
          {
            text: "Airway",
            points: 2,
            substeps: [
              { text: "Opens and assesses airway", points: 1 },
              { text: "Inserts adjunct as indicated", points: 1 },
            ],
          },
        ],
      },
    ],
    criticalCriteria: [
      "Failure to take appropriate PPE precautions",
      "Failure to assess airway",
      "Failure to manage the airway",
    ],
    ...overrides,
  };
}

export function createEmptyState(): AppState {
  return {
    version: 1,
    srs: {},
    notes: { step: {}, sheet: {} },
    stats: { totalReviews: 0, lastReviewedAt: null, dailyStreak: 0, longestStreak: 0, lastStreakDay: null },
    drills: { secorder: {}, stepseq: {}, whatnext: {}, blankrecall: {}, spokenscript: {} },
    achievements: {},
    mnemonics: {},
    chats: {},
    emsSrs: {},
    medcondSrs: {},
  };
}

export function createStateWithNotes(): AppState {
  const state = createEmptyState();
  state.notes = {
    step: { "e201::ppe::0": "Remember: gloves, mask, eye protection", "e201::scene::0": "Always check for hazards first" },
    sheet: { "e201": "Focus on the order: PPE → Scene → Primary Survey" },
  };
  return state;
}

export function createStateWithDrills(): AppState {
  const state = createEmptyState();
  state.drills = {
    secorder: { "e201": { mastered: false, streak: 2, attempts: 2 } },
    stepseq: { "e201": { "SCENE SIZE-UP": { mastered: true, streak: 3, attempts: 3 } } },
    whatnext: {},
    blankrecall: {},
    spokenscript: {},
  };
  return state;
}

export function createStateWithWhatnext(): AppState {
  const state = createEmptyState();
  state.drills.whatnext = { "e201": { streak: 2, attempts: 4, mastered: false } };
  return state;
}

export function createStateWithBlankrecall(): AppState {
  const state = createEmptyState();
  state.drills.blankrecall = {
    "e201": { attempts: 3, lastAttemptAt: new Date().toISOString(), lastScore: { matched: 4, missed: 1, total: 5, pct: 80 }, bestPct: 80 },
  };
  return state;
}

export function setupMockNREMTData() {
  (global as unknown as Record<string, unknown>)["NREMT_DATA"] = {
    sheets: [createMockSheet(), createMockSheet({ id: "e202", title: "Medical Patient Assessment" })],
    totalCards: 100,
  };
}

export function createMockContext(state?: AppState, route?: Route) {
  return {
    state: state ?? createEmptyState(),
    route: route ?? { view: "home" as const },
    navigate: vi.fn(),
    refresh: vi.fn(),
    toast: vi.fn(),
    save: vi.fn(),
  };
}
