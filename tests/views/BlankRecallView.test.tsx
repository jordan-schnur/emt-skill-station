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

import { BlankRecallView } from "../../src/views/drills/BlankRecallView";
import type { Sheet } from "../../src/types";

const MOCK_SHEET: Sheet = {
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
      ],
    },
  ],
  criticalCriteria: [],
  cards: [],
};

describe("BlankRecallView", () => {
  it("renders input phase by default", () => {
    render(<BlankRecallView sheet={MOCK_SHEET} />);
    expect(screen.getByText("Blank Sheet Recall")).toBeTruthy();
    expect(screen.getByText("Check my recall")).toBeTruthy();
    expect(screen.getByText("View full sheet →")).toBeTruthy();
    expect(screen.getByRole("textbox")).toBeTruthy();
  });

  it("shows results after submission", () => {
    render(<BlankRecallView sheet={MOCK_SHEET} />);
    const textarea = screen.getByRole("textbox") as HTMLTextAreaElement;
    fireEvent.input(textarea, { target: { value: "BSI precautions\nVerbalize scene safety" } });
    fireEvent.click(screen.getByText("Check my recall"));
    expect(screen.getByText(/steps recalled/)).toBeTruthy();
    expect(screen.getByText("Try again")).toBeTruthy();
  });

  it("shows try again button in results", () => {
    render(<BlankRecallView sheet={MOCK_SHEET} />);
    const textarea = screen.getByRole("textbox") as HTMLTextAreaElement;
    fireEvent.input(textarea, { target: { value: "BSI precautions" } });
    fireEvent.click(screen.getByText("Check my recall"));
    expect(screen.getByText("Try again")).toBeTruthy();
  });

  it("shows practice missed button when steps were missed", () => {
    render(<BlankRecallView sheet={MOCK_SHEET} />);
    const textarea = screen.getByRole("textbox") as HTMLTextAreaElement;
    fireEvent.input(textarea, { target: { value: "BSI precautions" } });
    fireEvent.click(screen.getByText("Check my recall"));
    expect(screen.getByText(/Practice.*missed step/)).toBeTruthy();
  });

  it("navigates to missed card view on practice missed", () => {
    render(<BlankRecallView sheet={MOCK_SHEET} />);
    const textarea = screen.getByRole("textbox") as HTMLTextAreaElement;
    fireEvent.input(textarea, { target: { value: "BSI precautions" } });
    fireEvent.click(screen.getByText("Check my recall"));
    fireEvent.click(screen.getByText(/Practice.*missed step/));
    expect(screen.getByText("Missed Step Review")).toBeTruthy();
    expect(screen.getByText("Reveal step")).toBeTruthy();
  });

  it("reveals step on click", () => {
    render(<BlankRecallView sheet={MOCK_SHEET} />);
    const textarea = screen.getByRole("textbox") as HTMLTextAreaElement;
    fireEvent.input(textarea, { target: { value: "BSI precautions" } });
    fireEvent.click(screen.getByText("Check my recall"));
    fireEvent.click(screen.getByText(/Practice.*missed step/));
    fireEvent.click(screen.getByText("Reveal step"));
    expect(screen.getByText("Verbalize scene safety")).toBeTruthy();
  });
});
