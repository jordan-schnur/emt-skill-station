import { render, screen } from "@testing-library/preact";
import { GuideView } from "../../src/views/GuideView";

describe("GuideView", () => {
  it("renders the main heading", () => {
    render(<GuideView />);
    expect(screen.getByRole("heading", { name: "Study Guide" })).toBeTruthy();
  });

  it("renders study mode cards", () => {
    render(<GuideView />);
    expect(screen.getByText("Flashcards (SRS)")).toBeTruthy();
    // these appear in both the modes list and the recommended sequence; use getAllBy
    expect(screen.getAllByText("Order Drill").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Blank Recall").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Spoken Script").length).toBeGreaterThanOrEqual(1);
  });

  it("renders the recommended sequence list", () => {
    render(<GuideView />);
    expect(screen.getByRole("heading", { name: "Recommended study sequence" })).toBeTruthy();
  });

  it("renders the backup tip", () => {
    render(<GuideView />);
    expect(screen.getByText(/All data is saved in your browser/)).toBeTruthy();
  });
});
