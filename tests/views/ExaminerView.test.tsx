import { render, screen, fireEvent } from "@testing-library/preact";

const { mockNavigate, mockRoute, mockAppState, mockMutateState, mockSave, MOCK_SHEET } = vi.hoisted(() => {
  const { signal } = require("@preact/signals");
  const sheet = {
    id: "e201",
    title: "Patient Assessment – Trauma",
    shortTitle: "Patient Assessment",
    category: "Patient Assessment",
    totalPoints: 42,
    timeLimit: "10 min",
    sections: [{ name: "PPE", header: false, steps: [{ text: "Take BSI precautions", points: 1 }] }],
    criticalCriteria: ["Failure to take BSI precautions"],
    cards: [],
  };

  const emptyState = {
    version: 2,
    srs: {},
    notes: { step: {}, sheet: {} },
    stats: { totalReviews: 0, lastReviewedAt: null, dailyStreak: 0, longestStreak: 0, lastStreakDay: null },
    drills: { secorder: {}, stepseq: {}, whatnext: {}, blankrecall: {}, spokenscript: {}, critical: {} },
    achievements: {},
    mnemonics: {},
    chats: {},
    examinerSessions: {},
    emsSrs: {},
    medcondSrs: {},
    blsMedsSrs: {},
  };

  return {
    mockNavigate: vi.fn(),
    mockRoute: signal({ view: "sheet", sheetId: "e201", tab: "chat" }),
    mockAppState: signal(emptyState),
    mockMutateState: vi.fn(),
    mockSave: vi.fn(),
    MOCK_SHEET: sheet,
  };
});

vi.mock("../../src/store/appStore", () => ({
  appState: mockAppState,
  route: mockRoute,
  navigate: mockNavigate,
  save: mockSave,
  mutateState: mockMutateState,
  showToast: vi.fn(),
}));

vi.mock("../../src/lib/chat", async () => {
  const actual = await import("../../src/lib/chat");
  return {
    ...actual,
    getConfig: vi.fn(),
  };
});

vi.mock("../../src/lib/examiner", async () => {
  const actual = await import("../../src/lib/examiner");
  return {
    ...actual,
    callExaminerAI: vi.fn(),
  };
});

import { ExaminerView } from "../../src/views/ExaminerView";
import { getConfig } from "../../src/lib/chat";
import { createSession } from "../../src/lib/examiner";
import type { AppState } from "../../src/types";

const mockGetConfig = getConfig as ReturnType<typeof vi.fn>;

function makeStateWithSession(overrides: Partial<ReturnType<typeof createSession>> = {}) {
  const session = {
    ...createSession("e201", ["Failure to take BSI precautions"]),
    ...overrides,
  };
  return {
    version: 2 as const,
    srs: {},
    notes: { step: {}, sheet: {} },
    stats: { totalReviews: 0, lastReviewedAt: null, dailyStreak: 0, longestStreak: 0, lastStreakDay: null },
    drills: { secorder: {}, stepseq: {}, whatnext: {}, blankrecall: {}, spokenscript: {}, critical: {} },
    achievements: {},
    mnemonics: {},
    chats: {},
    examinerSessions: { [session.id]: session },
    emsSrs: {},
    medcondSrs: {},
    blsMedsSrs: {},
  } as AppState;
}

describe("ExaminerView", () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    mockSave.mockClear();
    mockMutateState.mockClear();
    mockMutateState.mockImplementation((fn: (draft: AppState) => void) => {
      const copy = structuredClone(mockAppState.value);
      fn(copy);
      mockAppState.value = copy;
    });
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
  });

  it("shows API key required card when no API key configured", () => {
    mockGetConfig.mockReturnValue({ provider: "openai", model: "gpt-4o", apiKey: "" });
    mockAppState.value = makeStateWithSession();
    render(<ExaminerView sheet={MOCK_SHEET} />);
    expect(screen.getByText("API key required")).toBeTruthy();
  });

  it("shows begin scenario button when API key is present", () => {
    mockGetConfig.mockReturnValue({ provider: "openai", model: "gpt-4o", apiKey: "sk-test" });
    mockAppState.value = makeStateWithSession();
    render(<ExaminerView sheet={MOCK_SHEET} />);
    expect(screen.getByText("Begin scenario →")).toBeTruthy();
  });

  it("creates a new pre session on mount when none exists", () => {
    mockGetConfig.mockReturnValue({ provider: "openai", model: "gpt-4o", apiKey: "sk-test" });
    const emptyState = {
      version: 2 as const,
      srs: {},
      notes: { step: {}, sheet: {} },
      stats: { totalReviews: 0, lastReviewedAt: null, dailyStreak: 0, longestStreak: 0, lastStreakDay: null },
      drills: { secorder: {}, stepseq: {}, whatnext: {}, blankrecall: {}, spokenscript: {}, critical: {} },
      achievements: {},
      mnemonics: {},
      chats: {},
      examinerSessions: {},
      emsSrs: {},
      medcondSrs: {},
      blsMedsSrs: {},
    } as AppState;
    mockAppState.value = emptyState;
    render(<ExaminerView sheet={MOCK_SHEET} />);
    expect(mockMutateState).toHaveBeenCalled();
    expect(mockSave).toHaveBeenCalled();
  });

  it("navigates to settings when clicking Go to Settings in no-key state", () => {
    mockGetConfig.mockReturnValue({ provider: "openai", model: "gpt-4o", apiKey: "" });
    mockAppState.value = makeStateWithSession();
    render(<ExaminerView sheet={MOCK_SHEET} />);
    fireEvent.click(screen.getByText("Go to Settings →"));
    expect(mockNavigate).toHaveBeenCalledWith({ view: "settings" });
  });

  it("renders loading when no session matches", () => {
    mockGetConfig.mockReturnValue({ provider: "openai", model: "gpt-4o", apiKey: "sk-test" });
    const emptyState = {
      version: 2 as const,
      srs: {},
      notes: { step: {}, sheet: {} },
      stats: { totalReviews: 0, lastReviewedAt: null, dailyStreak: 0, longestStreak: 0, lastStreakDay: null },
      drills: { secorder: {}, stepseq: {}, whatnext: {}, blankrecall: {}, spokenscript: {}, critical: {} },
      achievements: {},
      mnemonics: {},
      chats: {},
      examinerSessions: {},
      emsSrs: {},
      medcondSrs: {},
      blsMedsSrs: {},
    } as AppState;
    mockMutateState.mockImplementationOnce(() => {});
    mockAppState.value = emptyState;
    render(<ExaminerView sheet={MOCK_SHEET} />);
    expect(screen.getByText("Loading…")).toBeTruthy();
  });
});
