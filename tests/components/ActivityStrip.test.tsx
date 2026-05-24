import { render, screen } from "@testing-library/preact";
import { ActivityStrip } from "../../src/components/ActivityStrip";

describe("ActivityStrip", () => {
  it("renders 14 bars", () => {
    const { container } = render(<ActivityStrip log={undefined} />);
    const bars = container.querySelectorAll(".today-week-bar");
    expect(bars).toHaveLength(14);
  });

  it("today's bar (last) has is-today class", () => {
    const { container } = render(<ActivityStrip log={undefined} />);
    const bars = container.querySelectorAll(".today-week-bar");
    const lastBar = bars[bars.length - 1];
    expect(lastBar.classList.contains("is-today")).toBe(true);
  });

  it("only the last bar has is-today class", () => {
    const { container } = render(<ActivityStrip log={undefined} />);
    const bars = container.querySelectorAll(".today-week-bar");
    const todayBars = Array.from(bars).filter((b) => b.classList.contains("is-today"));
    expect(todayBars).toHaveLength(1);
  });

  it("renders without error when log is empty", () => {
    expect(() => render(<ActivityStrip log={{}} />)).not.toThrow();
  });

  it("renders without error when log is undefined", () => {
    expect(() => render(<ActivityStrip log={undefined} />)).not.toThrow();
  });

  it("renders 14 day-label columns", () => {
    const { container } = render(<ActivityStrip log={undefined} />);
    const cols = container.querySelectorAll(".today-week-col");
    expect(cols).toHaveLength(14);
  });
});
