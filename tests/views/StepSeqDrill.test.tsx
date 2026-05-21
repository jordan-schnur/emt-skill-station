import { render, screen, fireEvent } from "@testing-library/preact";
import { signal } from "@preact/signals";

vi.mock("../../src/store/appStore", async () => {
  const storage = await import("../../src/lib/storage");
  return {
    appState: signal(storage.createEmptyState()),
    navigate: vi.fn(),
    save: vi.fn(),
    showToast: vi.fn(),
    mutateState: vi.fn((fn) => {
      const state = storage.createEmptyState();
      fn(state);
    }),
  };
});

import { StepSeqDrill } from "../../src/views/drills/StepSeqDrill";
import type { Sheet } from "../../src/types";

const MULTI_SECTION_SHEET: Sheet = {
  id: "trauma-assessment",
  title: "Trauma Assessment",
  shortTitle: "Trauma",
  category: "Trauma",
  totalPoints: 48,
  sections: [
    {
      name: "Scene Size-Up",
      header: true,
      steps: [
        { text: "BSI precautions", points: 1 },
        { text: "Verbalize scene safety", points: 1 },
        { text: "Determine MOI", points: 1 },
      ],
    },
    {
      name: "Initial Assessment",
      header: true,
      steps: [
        { text: "Form general impression", points: 1 },
        { text: "Assess mental status", points: 1 },
      ],
    },
  ],
  criticalCriteria: [],
  cards: [],
};

const SINGLE_DRILLABLE_SHEET: Sheet = {
  id: "bvm",
  title: "BVM Assembly",
  shortTitle: "BVM",
  category: "Airway",
  totalPoints: 10,
  sections: [
    {
      name: "Sequence",
      header: true,
      steps: [
        { text: "Assemble mask", points: 1 },
        { text: "Attach reservoir", points: 1 },
        { text: "Connect oxygen", points: 1 },
      ],
    },
  ],
  criticalCriteria: [],
  cards: [],
};

describe("StepSeqDrill", () => {
  it("shows section picker for multi-section sheet", () => {
    render(<StepSeqDrill sheet={MULTI_SECTION_SHEET} />);
    expect(screen.getByText("Step Sequence Drill")).toBeTruthy();
    expect(screen.getByText("Scene Size-Up")).toBeTruthy();
    expect(screen.getByText("Initial Assessment")).toBeTruthy();
  });

  it("auto-starts drill for single drillable section", () => {
    render(<StepSeqDrill sheet={SINGLE_DRILLABLE_SHEET} />);
    expect(screen.getByText("Step Sequence Drill")).toBeTruthy();
    expect(screen.getByText("Check my order")).toBeTruthy();
    // Should show step texts
    expect(screen.getByText("Assemble mask")).toBeTruthy();
  });

  it("starts section drill after clicking picker row", () => {
    render(<StepSeqDrill sheet={MULTI_SECTION_SHEET} />);
    fireEvent.click(screen.getByText("Scene Size-Up"));
    expect(screen.getByText("Check my order")).toBeTruthy();
    expect(screen.getByText("BSI precautions")).toBeTruthy();
  });

  it("shows back button when in multi-section mode", () => {
    render(<StepSeqDrill sheet={MULTI_SECTION_SHEET} />);
    fireEvent.click(screen.getByText("Scene Size-Up"));
    expect(screen.getByText("← All sections")).toBeTruthy();
  });

  it("goes back to picker on back button click", () => {
    render(<StepSeqDrill sheet={MULTI_SECTION_SHEET} />);
    fireEvent.click(screen.getByText("Scene Size-Up"));
    fireEvent.click(screen.getByText("← All sections"));
    expect(screen.getByText("Initial Assessment")).toBeTruthy();
  });

  it("shows result after checking order", () => {
    render(<StepSeqDrill sheet={SINGLE_DRILLABLE_SHEET} />);
    fireEvent.click(screen.getByText("Check my order"));
    const hasResult =
      screen.queryByText("Correct order!") !== null ||
      screen.queryByText(/Section mastered/) !== null ||
      screen.queryByText("Not quite — check corrections above.") !== null;
    expect(hasResult).toBe(true);
  });

  it("shows reshuffle in results", () => {
    render(<StepSeqDrill sheet={SINGLE_DRILLABLE_SHEET} />);
    fireEvent.click(screen.getByText("Check my order"));
    expect(screen.getByText("Try again")).toBeTruthy();
  });

  it("shows help icon", () => {
    render(<StepSeqDrill sheet={MULTI_SECTION_SHEET} />);
    expect(screen.getByRole("button", { name: /Help/ })).toBeTruthy();
  });
});
