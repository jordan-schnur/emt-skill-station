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

import { SpokenScriptView } from "../../src/views/drills/SpokenScriptView";
import type { Sheet } from "../../src/types";

const SCRIPT_SHEET: Sheet = {
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
        { text: "BSI precautions", points: 1, spokenScript: "I am taking BSI precautions including gloves and eye protection." },
        { text: "Verbalize scene safety", points: 1, spokenScript: "The scene appears safe to enter." },
      ],
    },
  ],
  criticalCriteria: [],
  cards: [],
};

const NO_SCRIPT_SHEET: Sheet = {
  id: "bvm",
  title: "BVM Assembly",
  shortTitle: "BVM",
  category: "Airway",
  totalPoints: 10,
  sections: [
    {
      name: "Sequence",
      header: true,
      steps: [{ text: "Assemble mask", points: 1 }],
    },
  ],
  criticalCriteria: [],
  cards: [],
};

describe("SpokenScriptView", () => {
  it("shows fallback when no scripts available", () => {
    render(<SpokenScriptView sheet={NO_SCRIPT_SHEET} />);
    expect(screen.getByText("Spoken Script")).toBeTruthy();
    expect(screen.getByText(/No spoken scripts available/)).toBeTruthy();
  });

  it("renders practice phase with step cue", () => {
    render(<SpokenScriptView sheet={SCRIPT_SHEET} />);
    expect(screen.getByText("Spoken Script")).toBeTruthy();
    expect(screen.getByText("What would you say aloud?")).toBeTruthy();
    expect(screen.getByText("Check")).toBeTruthy();
    expect(screen.getByText("Skip")).toBeTruthy();
  });

  it("shows step 1 of 2 progress indicator", () => {
    render(<SpokenScriptView sheet={SCRIPT_SHEET} />);
    expect(screen.getByText("Step 1 of 2")).toBeTruthy();
  });

  it("shows feedback after checking", () => {
    render(<SpokenScriptView sheet={SCRIPT_SHEET} />);
    const input = screen.getByPlaceholderText("Type your verbalization…");
    fireEvent.input(input, { target: { value: "I am taking BSI precautions including gloves" } });
    fireEvent.click(screen.getByText("Check"));
    const hasFeedback =
      screen.queryByText("✓ Good") !== null ||
      screen.queryByText("✗ Not quite") !== null;
    expect(hasFeedback).toBe(true);
  });

  it("shows Next button after checking", () => {
    render(<SpokenScriptView sheet={SCRIPT_SHEET} />);
    const input = screen.getByPlaceholderText("Type your verbalization…");
    fireEvent.input(input, { target: { value: "some verbalization" } });
    fireEvent.click(screen.getByText("Check"));
    expect(screen.getByText("Next →")).toBeTruthy();
  });

  it("disables Check and Skip after answering", () => {
    render(<SpokenScriptView sheet={SCRIPT_SHEET} />);
    const input = screen.getByPlaceholderText("Type your verbalization…");
    fireEvent.input(input, { target: { value: "test" } });
    fireEvent.click(screen.getByText("Check"));
    expect((screen.getByText("Check") as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByText("Skip") as HTMLButtonElement).disabled).toBe(true);
  });

  it("shows results phase after completing all steps", () => {
    render(<SpokenScriptView sheet={SCRIPT_SHEET} />);
    // Skip step 1
    fireEvent.click(screen.getByText("Skip"));
    // Skip step 2
    fireEvent.click(screen.getByText("Skip"));
    expect(screen.getByText("Spoken Script — Results")).toBeTruthy();
    expect(screen.getByText(/correct/)).toBeTruthy();
    expect(screen.getByText("Try again")).toBeTruthy();
  });
});
