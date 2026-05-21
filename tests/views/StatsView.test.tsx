import { render, screen } from "@testing-library/preact";
import { signal } from "@preact/signals";

vi.mock("../../src/store/appStore", async () => {
  const storage = await import("../../src/lib/storage");
  const state = storage.createEmptyState();
  return {
    appState: signal(state),
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
        id: "test-sheet",
        title: "Test Sheet",
        shortTitle: "Test",
        category: "Test",
        totalPoints: 100,
        sections: [],
        criticalCriteria: [],
        cards: [],
      },
    ],
    totalCards: 0,
  },
}));

import { StatsView } from "../../src/views/StatsView";

describe("StatsView", () => {
  it("renders the hero stats", () => {
    render(<StatsView />);
    expect(screen.getByText("day streak")).toBeTruthy();
    expect(screen.getByText("achievements")).toBeTruthy();
    expect(screen.getByText("notes written")).toBeTruthy();
    expect(screen.getByText("sheets complete")).toBeTruthy();
  });

  it("renders drill mastery section", () => {
    render(<StatsView />);
    expect(screen.getByRole("heading", { name: "Drill Mastery" })).toBeTruthy();
    expect(screen.getByText("Section Order")).toBeTruthy();
    expect(screen.getByText("Step Sequence")).toBeTruthy();
  });

  it("renders achievements section", () => {
    render(<StatsView />);
    expect(screen.getByRole("heading", { name: /Achievements/ })).toBeTruthy();
  });

  it("renders progress by sheet section", () => {
    render(<StatsView />);
    expect(screen.getByRole("heading", { name: "Progress by Sheet" })).toBeTruthy();
    expect(screen.getByText("Test Sheet")).toBeTruthy();
  });

  it("renders the med conditions CTA when no quiz data", () => {
    render(<StatsView />);
    expect(screen.getByText("Haven't tried the Medical Conditions Quiz yet?")).toBeTruthy();
  });
});
