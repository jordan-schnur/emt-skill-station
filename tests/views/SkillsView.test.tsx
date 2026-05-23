import { render, screen, fireEvent } from "@testing-library/preact";
import { signal } from "@preact/signals";
import type { AppState } from "../../src/types";
import { createEmptyState } from "../../src/lib/storage";

vi.mock("../../src/store/appStore", async () => {
  const storage = await import("../../src/lib/storage");
  return {
    appState: signal(storage.createEmptyState()),
    navigate: vi.fn(),
    save: vi.fn(),
    showToast: vi.fn(),
    mutateState: vi.fn(),
  };
});

vi.mock("../../src/data/sheets", () => ({
  NREMT_DATA: {
    sheets: [
      {
        id: "trauma-assessment",
        title: "Trauma Assessment",
        shortTitle: "Trauma",
        category: "Trauma",
        totalPoints: 48,
        timeLimit: "10 min",
        sections: [
          { name: "Scene Size-Up", header: true, steps: [{ text: "Step A", points: 1 }, { text: "Step B", points: 1 }] },
          { name: "Primary Survey", header: true, steps: [{ text: "Step C", points: 1 }, { text: "Step D", points: 1 }] },
        ],
        criticalCriteria: ["Failure A", "Failure B", "Failure C"],
        cards: [],
      },
      {
        id: "bvm-assembly",
        title: "BVM Assembly",
        shortTitle: "BVM",
        category: "Airway",
        totalPoints: 20,
        sections: [{ name: "Assembly", header: false, steps: [{ text: "Step 1", points: 1 }] }],
        criticalCriteria: ["Failure X"],
        cards: [],
      },
    ],
    totalCards: 0,
  },
}));

import { SkillsView } from "../../src/views/SkillsView";

describe("SkillsView", () => {
  it("renders the All sheets heading", () => {
    render(<SkillsView />);
    expect(screen.getByRole("heading", { name: "All sheets" })).toBeTruthy();
  });

  it("renders a card for each sheet using shortTitle", () => {
    render(<SkillsView />);
    expect(screen.getAllByText("Trauma").length).toBeGreaterThan(0);
    expect(screen.getAllByText("BVM").length).toBeGreaterThan(0);
  });

  it("shows sheet metadata", () => {
    render(<SkillsView />);
    expect(screen.getByText(/48 pts/)).toBeTruthy();
    expect(screen.getByText(/10 min/)).toBeTruthy();
  });

  it("navigates to sheet on card click", async () => {
    const { navigate } = await import("../../src/store/appStore");
    render(<SkillsView />);
    const traumaCards = screen.getAllByText("Trauma");
    fireEvent.click(traumaCards[traumaCards.length - 1]);
    expect(navigate).toHaveBeenCalledWith({
      view: "sheet",
      sheetId: "trauma-assessment",
      tab: "sheet",
    });
  });

  it("shows empty drill badges in pristine state", () => {
    render(<SkillsView />);
    const stepsEls = screen.getAllByText(/^Steps/);
    expect(stepsEls.length).toBeGreaterThan(0);
    const nextEls = screen.getAllByText("Next?");
    expect(nextEls.length).toBeGreaterThan(0);
  });

  it("shows Order badge only on multi-section sheets", () => {
    render(<SkillsView />);
    const orderBadges = screen.getAllByText(/^Order/);
    expect(orderBadges.length).toBe(1);
  });

  it("shows critical drill badge", () => {
    render(<SkillsView />);
    expect(screen.getByText("Critical 0/3")).toBeTruthy();
    expect(screen.getByText("Critical 0/1")).toBeTruthy();
  });

  it("shows mastered Order badge after secorder mastery", async () => {
    const { appState } = await import("../../src/store/appStore");
    const state: AppState = {
      ...createEmptyState(),
      drills: {
        secorder: { "trauma-assessment": { mastered: true, streak: 3, attempts: 3 } },
        stepseq: {},
        whatnext: {},
        blankrecall: {},
        spokenscript: {},
      },
    };
    (appState as ReturnType<typeof signal<AppState>>).value = state;
    render(<SkillsView />);
    expect(screen.getByText("Order ✓")).toBeTruthy();
  });

  it("shows recall percent badge after blank recall attempt", async () => {
    const { appState } = await import("../../src/store/appStore");
    const state: AppState = {
      ...createEmptyState(),
      drills: {
        secorder: {},
        stepseq: {},
        whatnext: {},
        blankrecall: {
          "trauma-assessment": { attempts: 1, lastAttemptAt: null, lastScore: null, bestPct: 78 },
        },
        spokenscript: {},
      },
    };
    (appState as ReturnType<typeof signal<AppState>>).value = state;
    render(<SkillsView />);
    expect(screen.getByText("Recall 78%")).toBeTruthy();
  });
});
