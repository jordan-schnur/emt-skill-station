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

import { SectionOrderDrill } from "../../src/views/drills/SectionOrderDrill";
import type { Sheet } from "../../src/types";

const MULTI_SECTION_SHEET: Sheet = {
  id: "trauma-assessment",
  title: "Trauma Assessment",
  shortTitle: "Trauma",
  category: "Trauma",
  totalPoints: 48,
  sections: [
    { name: "Scene Size-Up", header: true, steps: [{ text: "BSI precautions", points: 1 }] },
    { name: "Initial Assessment", header: true, steps: [{ text: "General impression", points: 1 }] },
    { name: "Focused Assessment", header: true, steps: [{ text: "Assess injury", points: 1 }] },
  ],
  criticalCriteria: [],
  cards: [],
};

const SINGLE_SECTION_SHEET: Sheet = {
  id: "bvm",
  title: "BVM Assembly",
  shortTitle: "BVM",
  category: "Airway",
  totalPoints: 10,
  sections: [
    { name: "Sequence", header: true, steps: [{ text: "Step 1", points: 1 }] },
  ],
  criticalCriteria: [],
  cards: [],
};

describe("SectionOrderDrill", () => {
  it("shows fallback for single-section sheets", () => {
    render(<SectionOrderDrill sheet={SINGLE_SECTION_SHEET} />);
    expect(screen.getByText(/single continuous sequence/)).toBeTruthy();
    expect(screen.getByText("View Full Sheet →")).toBeTruthy();
  });

  it("renders drill for multi-section sheet", () => {
    render(<SectionOrderDrill sheet={MULTI_SECTION_SHEET} />);
    expect(screen.getByText("Section Order Drill")).toBeTruthy();
    expect(screen.getByText("Check my order")).toBeTruthy();
    expect(screen.getByText("Reshuffle")).toBeTruthy();
  });

  it("renders all section names in the list", () => {
    render(<SectionOrderDrill sheet={MULTI_SECTION_SHEET} />);
    expect(screen.getByText("Scene Size-Up")).toBeTruthy();
    expect(screen.getByText("Initial Assessment")).toBeTruthy();
    expect(screen.getByText("Focused Assessment")).toBeTruthy();
  });

  it("shows result after checking order", () => {
    render(<SectionOrderDrill sheet={MULTI_SECTION_SHEET} />);
    fireEvent.click(screen.getByText("Check my order"));
    const hasResult =
      screen.queryByText("Correct order!") !== null ||
      screen.queryByText("Not quite — check corrections above.") !== null;
    expect(hasResult).toBe(true);
  });

  it("shows Try again after submitting", () => {
    render(<SectionOrderDrill sheet={MULTI_SECTION_SHEET} />);
    fireEvent.click(screen.getByText("Check my order"));
    expect(screen.getByText("Try again")).toBeTruthy();
  });

  it("shows streak pips header", () => {
    render(<SectionOrderDrill sheet={MULTI_SECTION_SHEET} />);
    expect(screen.getByText(/Streak/)).toBeTruthy();
  });

  it("renders arrow buttons for nudging", () => {
    render(<SectionOrderDrill sheet={MULTI_SECTION_SHEET} />);
    const upBtns = screen.getAllByLabelText("Move up");
    const downBtns = screen.getAllByLabelText("Move down");
    expect(upBtns.length).toBe(3);
    expect(downBtns.length).toBe(3);
  });
});
