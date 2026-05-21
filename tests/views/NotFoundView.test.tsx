import { render, screen } from "@testing-library/preact";
import { NotFoundView } from "../../src/views/NotFoundView";

describe("NotFoundView", () => {
  it("renders the ? indicator", () => {
    render(<NotFoundView />);
    expect(screen.getByText("?")).toBeTruthy();
  });

  it("renders the not found message", () => {
    render(<NotFoundView />);
    expect(screen.getByText("Nothing here.")).toBeTruthy();
  });
});
