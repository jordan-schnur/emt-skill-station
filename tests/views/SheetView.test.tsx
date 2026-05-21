import { render, screen, fireEvent } from "@testing-library/preact";
import { signal } from "@preact/signals";

// Use vi.hoisted so these exist before vi.mock hoisting
const { mockNavigate, mockRoute, MOCK_SHEET } = vi.hoisted(() => {
  const { signal } = require("@preact/signals");
  const sheet = {
    id: "trauma-assessment",
    title: "Trauma Assessment",
    shortTitle: "Trauma",
    category: "Trauma",
    totalPoints: 48,
    timeLimit: "10 min",
    sections: [
      { name: "Scene Size-Up", header: true, steps: [{ text: "BSI precautions", points: 1 }] },
      { name: "Initial Assessment", header: true, steps: [{ text: "Verbalize scene safety", points: 1 }] },
    ],
    criticalCriteria: ["Failed to take BSI precautions"],
    cards: [],
  };
  return {
    mockNavigate: vi.fn(),
    mockRoute: signal({ view: "sheet", sheetId: "trauma-assessment", tab: "sheet" }),
    MOCK_SHEET: sheet,
  };
});

vi.mock("../../src/store/appStore", async () => {
  const storage = await import("../../src/lib/storage");
  return {
    appState: signal(storage.createEmptyState()),
    route: mockRoute,
    navigate: mockNavigate,
    save: vi.fn(),
    showToast: vi.fn(),
    mutateState: vi.fn(),
  };
});

vi.mock("../../src/data/sheets", () => ({
  NREMT_DATA: { sheets: [MOCK_SHEET], totalCards: 0 },
}));

import { SheetView } from "../../src/views/SheetView";

describe("SheetView", () => {
  beforeEach(() => {
    mockRoute.value = { view: "sheet", sheetId: "trauma-assessment", tab: "sheet" };
    mockNavigate.mockClear();
  });

  it("renders sheet title and metadata", () => {
    render(<SheetView />);
    expect(screen.getByRole("heading", { name: "Trauma Assessment" })).toBeTruthy();
    expect(screen.getByText(/48 possible points/)).toBeTruthy();
    expect(screen.getByText(/10 min/)).toBeTruthy();
  });

  it("renders breadcrumb back button", () => {
    render(<SheetView />);
    expect(screen.getByText("← All sheets")).toBeTruthy();
  });

  it("navigates home on breadcrumb click", () => {
    render(<SheetView />);
    fireEvent.click(screen.getByText("← All sheets"));
    expect(mockNavigate).toHaveBeenCalledWith({ view: "home" });
  });

  it("renders tab buttons", () => {
    render(<SheetView />);
    // Quickjump strip shows these labels
    expect(screen.getByText("Full sheet")).toBeTruthy();
    // "Notes" appears in both mode-picker and quickjump
    expect(screen.getAllByText("Notes").length).toBeGreaterThan(0);
    // Quickjump shows "Order" (short label); mode-picker shows "Section Order"
    expect(screen.getByText("Section Order")).toBeTruthy();
  });

  it("renders ReferenceView for sheet tab", () => {
    render(<SheetView />);
    expect(screen.getByText("Scene Size-Up")).toBeTruthy();
  });

  it("shows NotFoundView when sheet id is unknown", () => {
    mockRoute.value = { view: "sheet", sheetId: "nonexistent", tab: "sheet" };
    render(<SheetView />);
    expect(screen.getByText("Nothing here.")).toBeTruthy();
  });

  it("navigates to notes tab on click", () => {
    render(<SheetView />);
    // "Notes" appears in both mode-picker and quickjump; click the quickjump button (last match)
    const notesButtons = screen.getAllByText("Notes");
    fireEvent.click(notesButtons[notesButtons.length - 1]);
    expect(mockNavigate).toHaveBeenCalledWith({
      view: "sheet",
      sheetId: "trauma-assessment",
      tab: "notes",
    });
  });
});
