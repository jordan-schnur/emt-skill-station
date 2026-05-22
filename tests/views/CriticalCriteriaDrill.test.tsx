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

describe("CriticalCriteriaDrill", () => {
  beforeEach(() => {
    appStoreMock.appState.value = createEmptyState();
    vi.clearAllMocks();
  });

  it("renders first criterion on mount", () => {
    render(<CriticalCriteriaDrill sheet={MOCK_SHEET} />);
    expect(screen.getByText(/Failed to take or verbalize body substance isolation/)).toBeTruthy();
  });

  it("shows sheet code in header", () => {
    render(<CriticalCriteriaDrill sheet={MOCK_SHEET} />);
    expect(screen.getByText(/E201 — Critical Criteria/)).toBeTruthy();
  });

  it("shows known cold counter", () => {
    render(<CriticalCriteriaDrill sheet={MOCK_SHEET} />);
    expect(screen.getByText(/0\/3 known cold/)).toBeTruthy();
  });

  it("shows three grade buttons", () => {
    render(<CriticalCriteriaDrill sheet={MOCK_SHEET} />);
    expect(screen.getByText(/Would fail/)).toBeTruthy();
    expect(screen.getByText(/Close call/)).toBeTruthy();
    expect(screen.getByText(/Know it cold/)).toBeTruthy();
  });

  it("shows expandable 'Why this matters' pearl", () => {
    render(<CriticalCriteriaDrill sheet={MOCK_SHEET} />);
    expect(screen.getByText(/Why this matters/)).toBeTruthy();
  });

  it("shows mini-list with all criteria as chips", () => {
    render(<CriticalCriteriaDrill sheet={MOCK_SHEET} />);
    const chips = document.querySelectorAll(".critical-chip");
    expect(chips.length).toBe(3);
  });

  it("shows session-complete screen after grading all criteria as know", () => {
    render(<CriticalCriteriaDrill sheet={MOCK_SHEET} />);
    const knowBtn = screen.getByText(/Know it cold/);
    fireEvent.click(knowBtn);
    fireEvent.click(knowBtn);
    fireEvent.click(knowBtn);
    expect(screen.getByText(/Session complete/)).toBeTruthy();
    expect(screen.getByText(/Start new session/)).toBeTruthy();
  });

  it("Start new session button restarts drill", () => {
    render(<CriticalCriteriaDrill sheet={MOCK_SHEET} />);
    const knowBtn = screen.getByText(/Know it cold/);
    fireEvent.click(knowBtn);
    fireEvent.click(knowBtn);
    fireEvent.click(knowBtn);
    fireEvent.click(screen.getByText(/Start new session/));
    expect(screen.getByText(/Failed to take or verbalize body substance isolation/)).toBeTruthy();
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

  it("keyboard key 3 grades as know and calls save", () => {
    render(<CriticalCriteriaDrill sheet={MOCK_SHEET} />);
    fireEvent.keyDown(document, { key: "3" });
    expect(appStoreMock.save).toHaveBeenCalled();
  });

  it("keyboard key 1 grades as fail and calls save", () => {
    render(<CriticalCriteriaDrill sheet={MOCK_SHEET} />);
    fireEvent.keyDown(document, { key: "1" });
    expect(appStoreMock.save).toHaveBeenCalled();
  });
});
