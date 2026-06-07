import { render, screen, fireEvent } from "@testing-library/preact";
import { describe, it, expect } from "vitest";
import { DosageQuiz } from "../../src/views/reference/DosageQuiz";
import { MEDICATION_DOSAGES } from "../../src/data/medication_dosages";

describe("DosageQuiz", () => {
  it("shows an intro screen with a start button", () => {
    render(<DosageQuiz />);
    expect(screen.getByText(/Start Dosage Quiz/i)).toBeTruthy();
    expect(screen.getByText(new RegExp(`${MEDICATION_DOSAGES.length} EMT medications`))).toBeTruthy();
  });

  it("reveals the dose then advances on grade", () => {
    render(<DosageQuiz />);
    fireEvent.click(screen.getByText(/Start Dosage Quiz/i));

    // First card front + counter visible
    expect(screen.getByText(/cards remaining/i)).toBeTruthy();
    expect(screen.getByText(/What is the adult dose\?/i)).toBeTruthy();

    // Reveal answer, then grade
    fireEvent.click(screen.getByText(/^Reveal$/));
    expect(screen.getByText(/Got it/)).toBeTruthy();
    expect(screen.getByText(/Missed it/)).toBeTruthy();
    fireEvent.click(screen.getByText(/Got it/));

    // Advanced to a new card (still a Reveal button present)
    expect(screen.getByText(/^Reveal$/)).toBeTruthy();
  });

  it("reaches a summary after grading every card", () => {
    render(<DosageQuiz />);
    fireEvent.click(screen.getByText(/Start Dosage Quiz/i));
    for (let i = 0; i < MEDICATION_DOSAGES.length; i++) {
      fireEvent.click(screen.getByText(/^Reveal$/));
      fireEvent.click(screen.getByText(/Got it/));
    }
    expect(screen.getByText("100%")).toBeTruthy();
    expect(screen.getByText(/Try Again/)).toBeTruthy();
  });
});
