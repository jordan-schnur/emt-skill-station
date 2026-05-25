import { render, screen, fireEvent } from "@testing-library/preact";
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../src/store/appStore", async () => {
  const storage = await import("../../src/lib/storage");
  const { signal } = await import("@preact/signals");
  const appStateSignal = signal(storage.createEmptyState());
  return {
    appState: appStateSignal,
    route: signal({ view: "sheet", sheetId: "e201", tab: "critical" }),
    navigate: vi.fn(),
    save: vi.fn(),
    mutateState: vi.fn((fn: (s: ReturnType<typeof storage.createEmptyState>) => void) => {
      fn(appStateSignal.value);
    }),
    showToast: vi.fn(),
  };
});

import { CriticalCriteriaDrill } from "../../src/views/drills/CriticalCriteriaDrill";
import type { Sheet } from "../../src/types";
import * as appStoreMock from "../../src/store/appStore";
import { createEmptyState } from "../../src/lib/storage";

const MOCK_SHEET: Sheet = {
  id: "e201",
  title: "Trauma Assessment",
  shortTitle: "Trauma",
  category: "Trauma",
  totalPoints: 48,
  sections: [],
  criticalCriteria: [
    "Failed to take or verbalize body substance isolation precautions",
    "Did not assess for and manage life threats",
    "Did not assess the response to treatments",
  ],
  cards: [],
};

function revealCurrent() {
  fireEvent.click(screen.getByText(/Reveal criterion/));
}

describe("CriticalCriteriaDrill", () => {
  beforeEach(() => {
    appStoreMock.appState.value = createEmptyState();
    vi.clearAllMocks();
  });

  it("hides first criterion as ??? on mount", () => {
    render(<CriticalCriteriaDrill sheet={MOCK_SHEET} />);
    expect(screen.getByText("???")).toBeTruthy();
    expect(screen.queryByText(/Failed to take or verbalize body substance isolation/)).toBeNull();
  });

  it("shows all other criteria in the list on mount", () => {
    render(<CriticalCriteriaDrill sheet={MOCK_SHEET} />);
    expect(screen.getByText(/Did not assess for and manage life threats/)).toBeTruthy();
    expect(screen.getByText(/Did not assess the response to treatments/)).toBeTruthy();
  });

  it("shows sheet code in header", () => {
    render(<CriticalCriteriaDrill sheet={MOCK_SHEET} />);
    expect(screen.getByText(/E201 — Critical Criteria/)).toBeTruthy();
  });

  it("shows known cold counter", () => {
    render(<CriticalCriteriaDrill sheet={MOCK_SHEET} />);
    expect(screen.getByText(/0\/3 known cold/)).toBeTruthy();
  });

  it("shows Reveal button before grade buttons", () => {
    render(<CriticalCriteriaDrill sheet={MOCK_SHEET} />);
    expect(screen.getByText(/Reveal criterion/)).toBeTruthy();
    expect(screen.queryByText(/Would fail/)).toBeNull();
    expect(screen.queryByText(/Close call/)).toBeNull();
    expect(screen.queryByText(/Know it cold/)).toBeNull();
  });

  it("shows grade buttons and revealed text after clicking Reveal", () => {
    render(<CriticalCriteriaDrill sheet={MOCK_SHEET} />);
    revealCurrent();
    expect(screen.getByText(/Failed to take or verbalize body substance isolation/)).toBeTruthy();
    expect(screen.getByText(/Would fail/)).toBeTruthy();
    expect(screen.getByText(/Close call/)).toBeTruthy();
    expect(screen.getByText(/Know it cold/)).toBeTruthy();
  });

  it("shows all criteria in numbered list", () => {
    render(<CriticalCriteriaDrill sheet={MOCK_SHEET} />);
    const items = document.querySelectorAll(".critical-list-item");
    expect(items.length).toBe(3);
  });

  it("marks current criterion as target", () => {
    render(<CriticalCriteriaDrill sheet={MOCK_SHEET} />);
    const target = document.querySelector(".critical-list-item.is-target");
    expect(target).toBeTruthy();
  });

  it("shows session-complete screen after grading all criteria as know", () => {
    render(<CriticalCriteriaDrill sheet={MOCK_SHEET} />);
    for (let i = 0; i < 3; i++) {
      revealCurrent();
      fireEvent.click(screen.getByText(/Know it cold/));
    }
    expect(screen.getByText(/Session complete/)).toBeTruthy();
    expect(screen.getByText(/Start new session/)).toBeTruthy();
  });

  it("Start new session button restarts drill", () => {
    render(<CriticalCriteriaDrill sheet={MOCK_SHEET} />);
    for (let i = 0; i < 3; i++) {
      revealCurrent();
      fireEvent.click(screen.getByText(/Know it cold/));
    }
    fireEvent.click(screen.getByText(/Start new session/));
    expect(screen.getByText("???")).toBeTruthy();
  });

  it("shows all-caught-up screen when buildQueue returns empty", () => {
    const now = Date.now();
    appStoreMock.appState.value.drills.critical["e201"] = {
      "0": { grade: "know", lastSeenAt: now, streakKnown: 1, attempts: 1 },
      "1": { grade: "know", lastSeenAt: now, streakKnown: 1, attempts: 1 },
      "2": { grade: "know", lastSeenAt: now, streakKnown: 1, attempts: 1 },
    };
    render(<CriticalCriteriaDrill sheet={MOCK_SHEET} />);
    expect(screen.getByText(/All caught up/)).toBeTruthy();
    expect(screen.getByText(/Drill all 3 criteria anyway/)).toBeTruthy();
  });

  it("keyboard Space reveals criterion", () => {
    render(<CriticalCriteriaDrill sheet={MOCK_SHEET} />);
    fireEvent.keyDown(document, { key: " " });
    expect(screen.getByText(/Would fail/)).toBeTruthy();
  });

  it("keyboard key 3 grades as know after reveal and calls save", () => {
    render(<CriticalCriteriaDrill sheet={MOCK_SHEET} />);
    revealCurrent();
    fireEvent.keyDown(document, { key: "3" });
    expect(appStoreMock.save).toHaveBeenCalled();
  });

  it("keyboard key 1 grades as fail after reveal and calls save", () => {
    render(<CriticalCriteriaDrill sheet={MOCK_SHEET} />);
    revealCurrent();
    fireEvent.keyDown(document, { key: "1" });
    expect(appStoreMock.save).toHaveBeenCalled();
  });
});
