/**
 * Test fixtures – reusable mock data for all tests
 */

/**
 * Minimal mock sheet for testing
 */
export function createMockSheet(overrides = {}) {
  return {
    id: "e201",
    title: "Patient Assessment / Management – Trauma",
    category: "Patient Assessment",
    totalPoints: 42,
    timeLimit: "10 minutes",
    cards: [
      { id: "e201::ppe::0", text: "Takes or verbalizes appropriate PPE precautions", points: 1, section: "PPE", stepIndex: 0, parent: null },
      { id: "e201::scene::0", text: "Determines the scene/situation is safe", points: 1, section: "SCENE SIZE-UP", stepIndex: 0, parent: null },
      { id: "e201::scene::1", text: "Determines the mechanism of injury", points: 1, section: "SCENE SIZE-UP", stepIndex: 1, parent: null },
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

/**
 * Empty state object as created by Storage.empty()
 */
export function createEmptyState() {
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
  };
}

/**
 * State with some SRS records already graded
 */
export function createStateWithSRS() {
  const state = createEmptyState();
  const now = Date.now();
  const DAY = 24 * 60 * 60 * 1000;

  state.srs = {
    "e201::ppe::0": {
      ease: 2.5,
      interval: 1,
      reps: 1,
      due: now + 1 * DAY,
      lastGrade: "good",
      lapses: 0,
      lastReviewed: now - 1 * DAY,
    },
    "e201::scene::0": {
      ease: 2.35,
      interval: 0,
      reps: 0,
      due: now + 60 * 1000, // 1 minute – just graded "again"
      lastGrade: "again",
      lapses: 1,
      lastReviewed: now,
    },
    "e201::scene::1": {
      ease: 2.65,
      interval: 6,
      reps: 2,
      due: now + 6 * DAY,
      lastGrade: "easy",
      lapses: 0,
      lastReviewed: now - 6 * DAY,
    },
  };
  state.stats = {
    totalReviews: 10,
    lastReviewedAt: now,
    dailyStreak: 1,
    longestStreak: 1,
    lastStreakDay: new Date().toISOString().slice(0, 10),
  };

  return state;
}

/**
 * State with notes
 */
export function createStateWithNotes() {
  const state = createEmptyState();
  state.notes = {
    step: {
      "e201::ppe::0": "Remember: gloves, mask, eye protection",
      "e201::scene::0": "Always check for hazards first",
    },
    sheet: {
      "e201": "Focus on the order: PPE → Scene → Primary Survey",
    },
  };
  return state;
}

/**
 * State with section order drill progress
 */
export function createStateWithDrills() {
  const state = createEmptyState();
  state.drills = {
    secorder: {
      "e201": {
        mastered: false,
        streak: 2,
        attempts: [
          { correct: true, at: Date.now() - 60000 },
          { correct: true, at: Date.now() - 30000 },
        ],
      },
    },
    stepseq: {
      "e201": {
        "SCENE SIZE-UP": {
          mastered: true,
          streak: 3,
          attempts: [
            { correct: true, at: Date.now() - 180000 },
            { correct: true, at: Date.now() - 120000 },
            { correct: true, at: Date.now() - 60000 },
          ],
        },
      },
    },
    whatnext: {},
    blankrecall: {},
  };
  return state;
}

/**
 * Mock context object passed to views
 */
export function createMockContext(state = null, route = null) {
  return {
    state: state || createEmptyState(),
    route: route || { view: "home" },
    navigate: jest.fn(),
    refresh: jest.fn(),
    toast: jest.fn(),
    save: jest.fn(),
  };
}

/**
 * Mock global NREMT_DATA
 */
export function setupMockNREMTData() {
  global.NREMT_DATA = {
    sheets: [
      createMockSheet(),
      createMockSheet({ id: "e202", title: "Medical Patient Assessment" }),
    ],
    totalCards: 100,
  };
}

/**
 * State with What's Next? drill progress
 */
export function createStateWithWhatnext() {
  const state = createEmptyState();
  state.drills.whatnext = {
    "e201": { streak: 2, attempts: 4, mastered: false },
  };
  return state;
}

/**
 * State with Blank Sheet Recall progress
 */
export function createStateWithBlankrecall() {
  const state = createEmptyState();
  state.drills.blankrecall = {
    "e201": {
      attempts: 3,
      lastAttemptAt: Date.now() - 60000,
      lastScore: { matched: 4, missed: 1, total: 5, pct: 80 },
      bestPct: 80,
    },
  };
  return state;
}

/**
 * State with Spoken Script drill progress
 */
export function createStateWithSpokenScript() {
  const state = createEmptyState();
  state.drills.spokenscript = {
    "e201": { streak: 1, mastered: false, attempts: 2, lastScore: { correct: 2, total: 3, pct: 67 } },
  };
  return state;
}

/**
 * Helper to parse a date string or timestamp into a readable format
 */
export function formatDate(timestamp) {
  if (!timestamp) return null;
  return new Date(timestamp).toISOString().slice(0, 10);
}
