import { render, screen, fireEvent } from "@testing-library/preact";
import { MarkdownEditor } from "../../src/components/ui/MarkdownEditor";

describe("MarkdownEditor", () => {
  it("renders with default value", () => {
    render(<MarkdownEditor value="Hello world" onSave={vi.fn()} />);
    const ta = screen.getByRole("textbox") as HTMLTextAreaElement;
    expect(ta.value).toBe("Hello world");
  });

  it("renders Save button with default label", () => {
    render(<MarkdownEditor onSave={vi.fn()} />);
    expect(screen.getByText("Save")).toBeTruthy();
  });

  it("renders custom save label", () => {
    render(<MarkdownEditor onSave={vi.fn()} saveLabel="Save note" />);
    expect(screen.getByText("Save note")).toBeTruthy();
  });

  it("renders Cancel button when onCancel provided", () => {
    render(<MarkdownEditor onSave={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByText("Cancel")).toBeTruthy();
  });

  it("omits Cancel button when no onCancel", () => {
    render(<MarkdownEditor onSave={vi.fn()} />);
    expect(screen.queryByText("Cancel")).toBeNull();
  });

  it("calls onSave with current textarea value", () => {
    const onSave = vi.fn();
    render(<MarkdownEditor value="initial" onSave={onSave} />);
    fireEvent.click(screen.getByText("Save"));
    expect(onSave).toHaveBeenCalledWith("initial");
  });

  it("calls onCancel when Cancel clicked", () => {
    const onCancel = vi.fn();
    render(<MarkdownEditor onSave={vi.fn()} onCancel={onCancel} />);
    fireEvent.click(screen.getByText("Cancel"));
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it("renders toolbar buttons", () => {
    render(<MarkdownEditor onSave={vi.fn()} />);
    expect(screen.getByTitle("Bold (Ctrl+B)")).toBeTruthy();
    expect(screen.getByTitle("Italic (Ctrl+I)")).toBeTruthy();
    expect(screen.getByTitle("Bullet list")).toBeTruthy();
  });

  it("switches to preview mode", () => {
    render(<MarkdownEditor value="test" onSave={vi.fn()} />);
    fireEvent.click(screen.getByText("Preview"));
    // textarea is hidden, preview pane is shown
    const ta = document.querySelector("textarea.md-editor-textarea") as HTMLTextAreaElement;
    expect(ta?.style.display).toBe("none");
    expect(document.querySelector(".md-editor-preview")).toBeTruthy();
  });

  it("switches back to write mode", () => {
    render(<MarkdownEditor value="test" onSave={vi.fn()} />);
    fireEvent.click(screen.getByText("Preview"));
    fireEvent.click(screen.getByText("Write"));
    const ta = document.querySelector("textarea.md-editor-textarea") as HTMLTextAreaElement;
    expect(ta?.style.display).toBe("");
  });
});
