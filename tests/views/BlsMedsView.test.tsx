import { render, screen, fireEvent } from "@testing-library/preact";
import { signal } from "@preact/signals";
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../src/store/appStore", async () => {
  const storage = await import("../../src/lib/storage");
  return {
    appState: signal(storage.createEmptyState()),
    route: signal({ view: "blsmeds", blsmedsTab: "reference" }),
    navigate: vi.fn(),
    save: vi.fn(),
    mutateState: vi.fn((fn: (s: ReturnType<typeof storage.createEmptyState>) => void) => {
      const s = storage.createEmptyState();
      fn(s);
    }),
    showToast: vi.fn(),
  };
});

vi.mock("../../src/data/bls_medications", () => ({
  BLS_MEDICATIONS: [
    {
      id: "aspirin",
      name: "Aspirin",
      category: "Cardiovascular",
      mechanism: "Inhibits platelet aggregation via COX inhibition.",
      indications: ["Suspected ACS"],
      contraindications: ["True aspirin allergy"],
      dose: { adult: "324 mg chewed" },
      route: ["Oral"],
      onset: "30–40 minutes",
      sideEffects: ["GI upset"],
      clinicalPearls: ["Chewed not swallowed"],
      scenarios: [
        {
          id: "asa-test-1",
          vignette: "58yo male, chest pain.",
          prompt: "Would you administer aspirin?",
          format: "give-withhold",
          answer: "give",
          explanation: "No contraindications.",
          followUps: [],
        },
        {
          id: "asa-test-2",
          vignette: "22yo, GI bleed.",
          prompt: "Would you administer aspirin?",
          format: "give-withhold",
          answer: "withhold",
          explanation: "Active GI bleed is a CI.",
          followUps: [
            {
              question: "Why is aspirin contraindicated here?",
              type: "contraindication-check",
              answer: "Worsens bleeding",
              options: ["Worsens bleeding", "Causes allergy", "Wrong dose", "Wrong route"],
            },
          ],
        },
        {
          id: "asa-test-3",
          vignette: "45yo male, stroke signs and chest pain.",
          prompt: "Would you administer aspirin?",
          format: "give-withhold",
          answer: "withhold",
          explanation: "Cannot rule out hemorrhagic stroke.",
          followUps: [],
        },
      ],
    },
    {
      id: "oxygen",
      name: "Oxygen",
      category: "Foundational",
      mechanism: "Increases FiO2.",
      indications: ["Hypoxia"],
      contraindications: ["None absolute"],
      dose: { adult: "2–15 L/min" },
      route: ["Inhalation"],
      onset: "Immediate",
      sideEffects: ["Drying mucosa"],
      clinicalPearls: ["Target SpO2 94–98%"],
      scenarios: [
        {
          id: "o2-test-1",
          vignette: "SpO2 84%.",
          prompt: "Give oxygen?",
          format: "give-withhold",
          answer: "give",
          explanation: "Hypoxic.",
          followUps: [],
        },
        {
          id: "o2-test-2",
          vignette: "SpO2 97%.",
          prompt: "Give high-flow O2?",
          format: "give-withhold",
          answer: "withhold",
          explanation: "Already normoxic.",
          followUps: [],
        },
        {
          id: "o2-test-3",
          vignette: "Unresponsive in garage.",
          prompt: "Give O2?",
          format: "give-withhold",
          answer: "give",
          explanation: "CO poisoning.",
          followUps: [],
        },
      ],
    },
  ],
}));

import { BlsMedsView } from "../../src/views/BlsMedsView";

describe("BlsMedsView — Reference tab", () => {
  it("renders tab buttons", () => {
    render(<BlsMedsView />);
    expect(screen.getByText("Reference")).toBeTruthy();
    expect(screen.getByText("Scenarios")).toBeTruthy();
    expect(screen.getByText("Drill")).toBeTruthy();
  });

  it("shows medication cards in reference tab", () => {
    render(<BlsMedsView />);
    expect(screen.getByText("Aspirin")).toBeTruthy();
    expect(screen.getByText("Oxygen")).toBeTruthy();
  });

  it("shows category filter chips", () => {
    render(<BlsMedsView />);
    expect(screen.getByText("All")).toBeTruthy();
    expect(screen.getByText("Cardiovascular")).toBeTruthy();
  });

  it("filter chip hides non-matching medications", () => {
    render(<BlsMedsView />);
    fireEvent.click(screen.getByText("Cardiovascular"));
    expect(screen.getByText("Aspirin")).toBeTruthy();
    expect(screen.queryByText("Oxygen")).toBeNull();
  });

  it("clicking a medication card expands it to show clinical details", () => {
    render(<BlsMedsView />);
    const aspirinCard = screen.getByText("Aspirin").closest(".blsmed-card")!;
    fireEvent.click(aspirinCard);
    expect(screen.getByText("Suspected ACS")).toBeTruthy();
    expect(screen.getByText("True aspirin allergy")).toBeTruthy();
    expect(screen.getByText("324 mg chewed")).toBeTruthy();
  });
});
