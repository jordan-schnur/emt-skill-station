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

import { WhatNextDrill } from "../../src/views/drills/WhatNextDrill";
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

const EMPTY_SHEET: Sheet = {
  id: "empty",
  title: "Empty",
  shortTitle: "Empty",
  category: "Test",
  totalPoints: 0,
  sections: [{ name: "Section", header: true, steps: [{ text: "Only step", points: 1 }] }],
  criticalCriteria: [],
  cards: [],
};

describe("WhatNextDrill", () => {
  it("shows fallback for sheets with fewer than 2 steps", () => {
    render(<WhatNextDrill sheet={EMPTY_SHEET} />);
    expect(screen.getByText(/enough steps for this drill/)).toBeTruthy();
  });

  it("renders drill with choices", () => {
    render(<WhatNextDrill sheet={MOCK_SHEET} />);
    expect(screen.getByText("What's Next?")).toBeTruthy();
    expect(screen.getByText("What comes next?")).toBeTruthy();
    // 4 choice buttons with letters
    const letters = ["A", "B", "C", "D"];
    for (const l of letters) {
      expect(screen.getByText(l)).toBeTruthy();
    }
  });

  it("shows result after clicking a choice", () => {
    render(<WhatNextDrill sheet={MOCK_SHEET} />);
    const buttons = screen.getAllByRole("button").filter((b) => b.className.includes("whatnext-choice"));
    fireEvent.click(buttons[0]);
    // Should show either "Correct!" or the correct step text
    const hasResult =
      screen.queryByText("Correct!") !== null ||
      screen.queryByText(/The next step is/) !== null;
    expect(hasResult).toBe(true);
  });

  it("shows Next question button after answering", () => {
    render(<WhatNextDrill sheet={MOCK_SHEET} />);
    const buttons = screen.getAllByRole("button").filter((b) => b.className.includes("whatnext-choice"));
    fireEvent.click(buttons[0]);
    expect(screen.getByText("Next question →")).toBeTruthy();
  });

  it("disables choices after answering", () => {
    render(<WhatNextDrill sheet={MOCK_SHEET} />);
    const choices = screen.getAllByRole("button").filter((b) => b.className.includes("whatnext-choice"));
    fireEvent.click(choices[0]);
    for (const btn of choices) {
      expect((btn as HTMLButtonElement).disabled).toBe(true);
    }
  });

  it("shows streak pips", () => {
    render(<WhatNextDrill sheet={MOCK_SHEET} />);
    expect(screen.getByText(/Streak/)).toBeTruthy();
    expect(screen.getByText(/0\/3/)).toBeTruthy();
  });
});
