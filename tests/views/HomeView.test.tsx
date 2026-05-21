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

import { HomeView } from "../../src/views/HomeView";

describe("HomeView", () => {
  it("renders the home section heading", () => {
    render(<HomeView />);
    expect(screen.getByRole("heading", { name: "All sheets" })).toBeTruthy();
  });

  it("renders a card for each sheet using shortTitle", () => {
    render(<HomeView />);
    // SheetCard renders shortTitle ("Trauma", "BVM") not the full title
    expect(screen.getAllByText("Trauma").length).toBeGreaterThan(0);
    expect(screen.getAllByText("BVM").length).toBeGreaterThan(0);
  });

  it("shows sheet metadata", () => {
    render(<HomeView />);
    expect(screen.getByText(/48 pts/)).toBeTruthy();
    expect(screen.getByText(/10 min/)).toBeTruthy();
  });

  it("navigates to sheet on card click", async () => {
    const { navigate } = await import("../../src/store/appStore");
    render(<HomeView />);
    // Click the sheet card — find the card using shortTitle "Trauma" displayed in the card
    const traumaCards = screen.getAllByText("Trauma");
    fireEvent.click(traumaCards[traumaCards.length - 1]); // click the one in the sheet card
    expect(navigate).toHaveBeenCalledWith({
      view: "sheet",
      sheetId: "trauma-assessment",
      tab: "sheet",
    });
  });

  it("shows mastery rings with 0% in pristine state", () => {
    render(<HomeView />);
    const rings = screen.getAllByLabelText(/0% mastery/);
    // 2 sheet cards + 1 overall ring in the hero
    expect(rings.length).toBeGreaterThanOrEqual(2);
  });

  it("shows empty drill badges in pristine state", () => {
    render(<HomeView />);
    const stepsEls = screen.getAllByText(/^Steps/);
    expect(stepsEls.length).toBeGreaterThan(0);
    const nextEls = screen.getAllByText("Next?");
    expect(nextEls.length).toBeGreaterThan(0);
  });

  it("shows Order badge only on multi-section sheets", () => {
    render(<HomeView />);
    const orderBadges = screen.getAllByText(/^Order/);
    expect(orderBadges.length).toBe(1);
  });

  it("shows critical drill badge", () => {
    render(<HomeView />);
    // Critical badges render as "Critical 0/3" and "Critical 0/1"
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
    render(<HomeView />);
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
    render(<HomeView />);
    expect(screen.getByText("Recall 78%")).toBeTruthy();
  });
});
