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

vi.mock("../../src/lib/chat", () => ({
  getConfig: () => ({ provider: "openai", apiKey: "", model: "" }),
  saveConfig: vi.fn(),
  clearConfig: vi.fn(),
  fetchModels: vi.fn().mockResolvedValue([{ id: "gpt-4o", label: "gpt-4o" }]),
}));

vi.mock("../../src/lib/storage", async () => {
  const actual = await vi.importActual<typeof import("../../src/lib/storage")>("../../src/lib/storage");
  return {
    ...actual,
    reset: vi.fn(),
    exportToFile: vi.fn(),
    importFromFile: vi.fn().mockResolvedValue(actual.createEmptyState()),
  };
});

import { SettingsView } from "../../src/views/SettingsView";

describe("SettingsView", () => {
  it("renders the main heading", () => {
    render(<SettingsView />);
    expect(screen.getByRole("heading", { name: "Backup & Settings" })).toBeTruthy();
  });

  it("renders export and import sections", () => {
    render(<SettingsView />);
    expect(screen.getByText("Export progress")).toBeTruthy();
    expect(screen.getByText("Import progress")).toBeTruthy();
  });

  it("renders reset section", () => {
    render(<SettingsView />);
    expect(screen.getByText("Reset everything")).toBeTruthy();
    expect(screen.getByText("Reset")).toBeTruthy();
  });

  it("renders AI Chat section", () => {
    render(<SettingsView />);
    expect(screen.getByText("AI Chat")).toBeTruthy();
    expect(screen.getByText("Fetch models")).toBeTruthy();
  });

  it("calls exportToFile on download click", async () => {
    const { exportToFile } = await import("../../src/lib/storage");
    render(<SettingsView />);
    fireEvent.click(screen.getByText("Download JSON"));
    expect(exportToFile).toHaveBeenCalledOnce();
  });

  it("shows cloud sync unavailable when CloudSync is not defined", () => {
    render(<SettingsView />);
    expect(screen.getByText("Cloud sync is not configured.")).toBeTruthy();
  });
});
