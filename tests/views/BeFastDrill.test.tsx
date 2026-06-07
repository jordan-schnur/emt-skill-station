import { render, screen, fireEvent } from "@testing-library/preact";
import { describe, it, expect, vi } from "vitest";
import { BeFastDrill } from "../../src/views/reference/BeFastDrill";

describe("BeFastDrill", () => {
  it("shows an intro screen referencing all six findings", () => {
    render(<BeFastDrill onBack={() => {}} />);
    expect(screen.getByText(/Start BE-FAST Drill/i)).toBeTruthy();
    expect(screen.getByText(/6 stroke-assessment findings/i)).toBeTruthy();
  });

  it("reveals each finding then advances on grade", () => {
    render(<BeFastDrill onBack={() => {}} />);
    fireEvent.click(screen.getByText(/Start BE-FAST Drill/i));

    // First card shows the prompt and a letter badge
    expect(screen.getByText(/What do you assess\?/i)).toBeTruthy();
    expect(screen.getByText(/cards remaining/i)).toBeTruthy();

    fireEvent.click(screen.getByText(/^Reveal$/));
    expect(screen.getByText(/Got it/)).toBeTruthy();
    fireEvent.click(screen.getByText(/Got it/));
    expect(screen.getByText(/^Reveal$/)).toBeTruthy();
  });

  it("reaches a 100% summary after grading all six, and Back fires", () => {
    const onBack = vi.fn();
    render(<BeFastDrill onBack={onBack} />);
    fireEvent.click(screen.getByText(/Start BE-FAST Drill/i));
    for (let i = 0; i < 6; i++) {
      fireEvent.click(screen.getByText(/^Reveal$/));
      fireEvent.click(screen.getByText(/Got it/));
    }
    expect(screen.getByText("100%")).toBeTruthy();
    fireEvent.click(screen.getByText(/Back to mnemonics/i));
    expect(onBack).toHaveBeenCalled();
  });
});
