import { render, screen, fireEvent } from "@testing-library/preact";
import { signal } from "@preact/signals";

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
        sections: [{ name: "Scene Size-Up", header: true, steps: [] }],
        criticalCriteria: [],
        cards: [],
      },
      {
        id: "bvm-assembly",
        title: "BVM Assembly",
        shortTitle: "BVM",
        category: "Airway",
        totalPoints: 20,
        sections: [],
        criticalCriteria: [],
        cards: [],
      },
    ],
    totalCards: 0,
  },
}));

import { HomeView } from "../../src/views/HomeView";

describe("HomeView", () => {
  it("renders the main heading", () => {
    render(<HomeView />);
    expect(screen.getByRole("heading", { name: "NREMT Skill Sheet Trainer" })).toBeTruthy();
  });

  it("renders a card for each sheet", () => {
    render(<HomeView />);
    expect(screen.getByText("Trauma Assessment")).toBeTruthy();
    expect(screen.getByText("BVM Assembly")).toBeTruthy();
  });

  it("shows sheet metadata", () => {
    render(<HomeView />);
    expect(screen.getByText(/48 pts/)).toBeTruthy();
    expect(screen.getByText(/10 min/)).toBeTruthy();
  });

  it("navigates to sheet on card click", async () => {
    const { navigate } = await import("../../src/store/appStore");
    render(<HomeView />);
    fireEvent.click(screen.getByText("Trauma Assessment"));
    expect(navigate).toHaveBeenCalledWith({
      view: "sheet",
      sheetId: "trauma-assessment",
      tab: "sheet",
    });
  });

  it("shows category badge when no drill progress", () => {
    render(<HomeView />);
    expect(screen.getByText("Trauma")).toBeTruthy();
  });
});
