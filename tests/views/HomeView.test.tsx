import { render, screen, fireEvent } from "@testing-library/preact";
import { signal } from "@preact/signals";
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
        ],
        criticalCriteria: [],
        cards: [],
      },
    ],
    totalCards: 0,
  },
}));

import { HomeView } from "../../src/views/HomeView";

describe("HomeView", () => {
  it("renders the today hero headline", () => {
    render(<HomeView />);
    expect(screen.getByRole("heading", { level: 1 })).toBeTruthy();
  });

  it("'Browse sheets' button navigates to skills route", async () => {
    const { navigate } = await import("../../src/store/appStore");
    render(<HomeView />);
    fireEvent.click(screen.getByText("Browse sheets"));
    expect(navigate).toHaveBeenCalledWith({ view: "skills" });
  });

  it("'Start now' button navigates to a sheet", async () => {
    const { navigate } = await import("../../src/store/appStore");
    render(<HomeView />);
    fireEvent.click(screen.getByText("▶ Start now"));
    expect(navigate).toHaveBeenCalledWith(
      expect.objectContaining({ view: "sheet", sheetId: "trauma-assessment" })
    );
  });

  it("shows overall mastery ring", () => {
    render(<HomeView />);
    expect(screen.getByLabelText(/0% mastery/)).toBeTruthy();
  });
});
