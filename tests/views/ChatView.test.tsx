import { render, screen } from "@testing-library/preact";

// All refs that are used inside vi.mock factories must be hoisted
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
    criticalCriteria: [],
    cards: [],
  };

  // We need an initial state without createEmptyState (no imports in hoisted)
  const emptyState = {
    version: 2,
    srs: {},
    notes: { step: {}, sheet: {} },
    stats: { totalReviews: 0, lastReviewedAt: null, dailyStreak: 0, longestStreak: 0, lastStreakDay: null },
    drills: { secorder: {}, stepseq: {}, whatnext: {}, blankrecall: {}, spokenscript: {}, critical: {} },
    achievements: {},
    mnemonics: {},
    chats: {},
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

vi.mock("../../src/data/sheets", () => ({
  NREMT_DATA: { sheets: [MOCK_SHEET], totalCards: 0 },
}));

vi.mock("../../src/lib/chat", async () => {
  const actual = await import("../../src/lib/chat");
  return {
    ...actual,
    getConfig: vi.fn(),
    sendMessage: vi.fn(),
    buildSystemPrompt: vi.fn(() => "system prompt"),
  };
});

import { createEmptyState } from "../../src/lib/storage";
import type { AppState } from "../../src/types";
import { ChatView } from "../../src/views/ChatView";
import { getConfig, createChat } from "../../src/lib/chat";

const mockGetConfig = getConfig as ReturnType<typeof vi.fn>;

describe("ChatView", () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    mockSave.mockClear();
    mockMutateState.mockClear();
    mockAppState.value = createEmptyState();
    mockRoute.value = { view: "sheet", sheetId: "e201", tab: "chat" };
    mockGetConfig.mockReturnValue({ provider: "openai", model: "gpt-4o", apiKey: "" });
    mockMutateState.mockImplementation((fn: (draft: AppState) => void) => fn(mockAppState.value));
  });

  describe("without sheetCtx (global /chat route)", () => {
    it("renders ChatList normally when API key is present", () => {
      mockGetConfig.mockReturnValue({ provider: "openai", model: "gpt-4o", apiKey: "sk-test" });
      mockRoute.value = { view: "chat" };
      render(<ChatView />);
      expect(screen.getByText("AI Chat")).toBeTruthy();
    });

    it("renders no-key state when no API key", () => {
      mockGetConfig.mockReturnValue({ provider: "openai", model: "gpt-4o", apiKey: "" });
      mockRoute.value = { view: "chat" };
      render(<ChatView />);
      expect(screen.getByText("No API key configured.")).toBeTruthy();
    });
  });

  describe("with sheetCtx (sheet tab)", () => {
    it("renders null (not ChatList) when API key is present and no chatId", () => {
      mockGetConfig.mockReturnValue({ provider: "openai", model: "gpt-4o", apiKey: "sk-test" });
      const { container } = render(<ChatView sheetCtx={MOCK_SHEET} />);
      expect(container.firstChild).toBeNull();
    });

    it("shows no-key state when API key is absent", () => {
      mockGetConfig.mockReturnValue({ provider: "openai", model: "gpt-4o", apiKey: "" });
      render(<ChatView sheetCtx={MOCK_SHEET} />);
      expect(screen.getByText("No API key configured.")).toBeTruthy();
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it("auto-creates examiner chat and navigates when API key present and no existing chat", () => {
      mockGetConfig.mockReturnValue({ provider: "openai", model: "gpt-4o", apiKey: "sk-test" });
      render(<ChatView sheetCtx={MOCK_SHEET} />);
      expect(mockMutateState).toHaveBeenCalled();
      expect(mockSave).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith(
        expect.objectContaining({ view: "chat", chatId: expect.any(String) })
      );
    });

    it("navigates to existing examiner chat when one exists for the sheet", () => {
      mockGetConfig.mockReturnValue({ provider: "openai", model: "gpt-4o", apiKey: "sk-test" });
      const state = createEmptyState();
      const existingId = createChat(state, { mode: "examiner", sheetId: "e201" });
      mockAppState.value = state;

      render(<ChatView sheetCtx={MOCK_SHEET} />);

      expect(mockNavigate).toHaveBeenCalledWith({ view: "chat", chatId: existingId });
      expect(mockMutateState).not.toHaveBeenCalled();
    });

    it("does not run auto-redirect when chatId is already in route", () => {
      mockGetConfig.mockReturnValue({ provider: "openai", model: "gpt-4o", apiKey: "sk-test" });
      window.HTMLElement.prototype.scrollIntoView = vi.fn();
      const state = createEmptyState();
      state.chats["existing-chat-id"] = {
        id: "existing-chat-id",
        title: "Test chat",
        mode: "examiner",
        sheetId: "e201",
        messages: [],
      };
      mockAppState.value = state;
      mockRoute.value = { view: "chat", chatId: "existing-chat-id" };

      render(<ChatView sheetCtx={MOCK_SHEET} />);
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });
});
