import { render, screen, fireEvent } from "@testing-library/preact";
import { describe, it, expect, vi, beforeEach } from "vitest";

const { navigateMock, routeSignal } = vi.hoisted(() => {
  const { signal } = require("@preact/signals");
  const navigateMock = vi.fn();
  const routeSignal = signal({ view: "reference", referenceTab: "conditions" });
  return { navigateMock, routeSignal };
});

vi.mock("../../src/store/appStore", async () => {
  const storage = await import("../../src/lib/storage");
  const { signal: sig } = await import("@preact/signals");
  return {
    appState: sig(storage.createEmptyState()),
    route: routeSignal,
    navigate: navigateMock,
    save: vi.fn(),
    mutateState: vi.fn(),
    showToast: vi.fn(),
  };
});

vi.mock("../../src/views/reference/ConditionsMode", () => ({
  ConditionsMode: () => <div data-testid="conditions-mode">Conditions</div>,
}));
vi.mock("../../src/views/reference/MnemonicsMode", () => ({
  MnemonicsMode: () => <div data-testid="mnemonics-mode">Mnemonics</div>,
}));
vi.mock("../../src/views/reference/MedsMode", () => ({
  MedsMode: () => <div data-testid="meds-mode">Meds</div>,
}));

import { ReferenceView } from "../../src/views/ReferenceView";

describe("ReferenceView", () => {
  beforeEach(() => {
    navigateMock.mockClear();
    routeSignal.value = { view: "reference", referenceTab: "conditions" };
  });

  it("renders the Conditions tab as active by default", () => {
    const { container } = render(<ReferenceView />);
    const activeTab = container.querySelector(".ref-tab-btn.active");
    expect(activeTab?.textContent).toBe("Conditions");
  });

  it("renders ConditionsMode when referenceTab is conditions", () => {
    render(<ReferenceView />);
    expect(screen.getByTestId("conditions-mode")).toBeInTheDocument();
  });

  it("renders MnemonicsMode when referenceTab is mnemonics", () => {
    routeSignal.value = { view: "reference", referenceTab: "mnemonics" };
    render(<ReferenceView />);
    expect(screen.getByTestId("mnemonics-mode")).toBeInTheDocument();
  });

  it("renders MedsMode when referenceTab is meds", () => {
    routeSignal.value = { view: "reference", referenceTab: "meds" };
    render(<ReferenceView />);
    expect(screen.getByTestId("meds-mode")).toBeInTheDocument();
  });

  it("clicking Mnemonics tab calls navigate with referenceTab mnemonics", () => {
    render(<ReferenceView />);
    fireEvent.click(screen.getByText("Mnemonics"));
    expect(navigateMock).toHaveBeenCalledWith({ view: "reference", referenceTab: "mnemonics" });
  });

  it("clicking Meds tab calls navigate with referenceTab meds", () => {
    render(<ReferenceView />);
    fireEvent.click(screen.getByText("Meds"));
    expect(navigateMock).toHaveBeenCalledWith({ view: "reference", referenceTab: "meds" });
  });

  it("renders all three tab buttons", () => {
    const { container } = render(<ReferenceView />);
    const tabBtns = container.querySelectorAll(".ref-tab-btn");
    const labels = Array.from(tabBtns).map(b => b.textContent);
    expect(labels).toContain("Conditions");
    expect(labels).toContain("Mnemonics");
    expect(labels).toContain("Meds");
  });
});
