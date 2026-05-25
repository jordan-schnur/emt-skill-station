import { render, screen, fireEvent } from "@testing-library/preact";
import { describe, it, expect, vi } from "vitest";
import { ReferenceToolbar } from "../../src/components/ReferenceToolbar";

describe("ReferenceToolbar", () => {
  const cats = ["All", "Cardiac", "Respiratory"];

  it("renders a search input", () => {
    render(
      <ReferenceToolbar
        query=""
        onQueryChange={vi.fn()}
        categories={cats}
        activeCategory="All"
        onCategoryChange={vi.fn()}
      />
    );
    expect(screen.getByRole("searchbox")).toBeInTheDocument();
  });

  it("renders all category pills", () => {
    render(
      <ReferenceToolbar
        query=""
        onQueryChange={vi.fn()}
        categories={cats}
        activeCategory="All"
        onCategoryChange={vi.fn()}
      />
    );
    expect(screen.getByText("All")).toBeInTheDocument();
    expect(screen.getByText("Cardiac")).toBeInTheDocument();
    expect(screen.getByText("Respiratory")).toBeInTheDocument();
  });

  it("marks activeCategory pill with 'active' class", () => {
    const { container } = render(
      <ReferenceToolbar
        query=""
        onQueryChange={vi.fn()}
        categories={cats}
        activeCategory="Cardiac"
        onCategoryChange={vi.fn()}
      />
    );
    const activeBtn = container.querySelector(".ref-filter-chip.active");
    expect(activeBtn?.textContent).toBe("Cardiac");
  });

  it("calls onQueryChange when typing in search", () => {
    const onChange = vi.fn();
    render(
      <ReferenceToolbar
        query=""
        onQueryChange={onChange}
        categories={cats}
        activeCategory="All"
        onCategoryChange={vi.fn()}
      />
    );
    fireEvent.input(screen.getByRole("searchbox"), { target: { value: "cardiac" } });
    expect(onChange).toHaveBeenCalledWith("cardiac");
  });

  it("calls onCategoryChange when a pill is clicked", () => {
    const onCat = vi.fn();
    render(
      <ReferenceToolbar
        query=""
        onQueryChange={vi.fn()}
        categories={cats}
        activeCategory="All"
        onCategoryChange={onCat}
      />
    );
    fireEvent.click(screen.getByText("Cardiac"));
    expect(onCat).toHaveBeenCalledWith("Cardiac");
  });

  it("shows clear button when query is non-empty", () => {
    const { container } = render(
      <ReferenceToolbar
        query="test"
        onQueryChange={vi.fn()}
        categories={cats}
        activeCategory="All"
        onCategoryChange={vi.fn()}
      />
    );
    expect(container.querySelector(".ref-search-clear")).toBeInTheDocument();
  });

  it("does not show clear button when query is empty", () => {
    const { container } = render(
      <ReferenceToolbar
        query=""
        onQueryChange={vi.fn()}
        categories={cats}
        activeCategory="All"
        onCategoryChange={vi.fn()}
      />
    );
    expect(container.querySelector(".ref-search-clear")).not.toBeInTheDocument();
  });

  it("clear button calls onQueryChange with empty string", () => {
    const onChange = vi.fn();
    const { container } = render(
      <ReferenceToolbar
        query="test"
        onQueryChange={onChange}
        categories={cats}
        activeCategory="All"
        onCategoryChange={vi.fn()}
      />
    );
    fireEvent.click(container.querySelector(".ref-search-clear")!);
    expect(onChange).toHaveBeenCalledWith("");
  });
});
