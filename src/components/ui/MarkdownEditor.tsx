import { useState, useRef } from "preact/hooks";

interface Props {
  value?: string;
  placeholder?: string;
  onSave: (val: string) => void;
  onCancel?: () => void;
  saveLabel?: string;
}

function renderMarkdownHtml(text: string): string {
  if (!text || !text.trim()) return "";
  const m = (window as unknown as { marked?: { parse: (t: string, o?: object) => string } }).marked;
  return m ? m.parse(text, { breaks: true, gfm: true }) : text;
}

export function MarkdownEditor({ value = "", placeholder = "", onSave, onCancel, saveLabel = "Save" }: Props) {
  const [mode, setMode] = useState<"write" | "preview">("write");
  const taRef = useRef<HTMLTextAreaElement>(null);

  function wrapSel(before: string, after = before) {
    const ta = taRef.current;
    if (!ta) return;
    const s = ta.selectionStart, e = ta.selectionEnd;
    const sel = ta.value.slice(s, e);
    ta.value = ta.value.slice(0, s) + before + sel + after + ta.value.slice(e);
    ta.selectionStart = s + before.length;
    ta.selectionEnd = s + before.length + sel.length;
    ta.focus();
  }

  function linePfx(pfx: string) {
    const ta = taRef.current;
    if (!ta) return;
    const pos = ta.selectionStart;
    const lines = ta.value.split("\n");
    let chars = 0, li = 0;
    for (let i = 0; i < lines.length; i++) {
      if (chars + lines[i].length >= pos) { li = i; break; }
      chars += lines[i].length + 1;
    }
    lines[li] = pfx + lines[li];
    ta.value = lines.join("\n");
    ta.focus();
  }

  function handleKeyDown(e: KeyboardEvent) {
    if ((e.ctrlKey || e.metaKey) && e.key === "b") { e.preventDefault(); wrapSel("**"); }
    if ((e.ctrlKey || e.metaKey) && e.key === "i") { e.preventDefault(); wrapSel("_"); }
  }

  function handleSave() {
    onSave(taRef.current?.value ?? "");
  }

  const previewHtml = mode === "preview" ? renderMarkdownHtml(taRef.current?.value ?? value) : "";

  return (
    <div class="md-editor">
      <div class="md-editor-toolbar">
        <button class="md-toolbar-btn" type="button" title="Bold (Ctrl+B)" onClick={(e) => { e.preventDefault(); wrapSel("**"); }}>B</button>
        <button class="md-toolbar-btn" type="button" title="Italic (Ctrl+I)" onClick={(e) => { e.preventDefault(); wrapSel("_"); }}>I</button>
        <button class="md-toolbar-btn" type="button" title="Bullet list" onClick={(e) => { e.preventDefault(); linePfx("- "); }}>• List</button>
      </div>
      <div class="md-editor-tabs">
        <button
          class={`md-tab${mode === "write" ? " active" : ""}`}
          type="button"
          onClick={() => setMode("write")}
        >Write</button>
        <button
          class={`md-tab${mode === "preview" ? " active" : ""}`}
          type="button"
          onClick={() => setMode("preview")}
        >Preview</button>
      </div>
      <textarea
        ref={taRef}
        class="md-editor-textarea"
        rows={8}
        placeholder={placeholder || "Write in Markdown…"}
        style={{ display: mode === "write" ? "" : "none" }}
        onKeyDown={handleKeyDown}
        defaultValue={value}
      />
      {mode === "preview" && (
        <div
          class="md-editor-preview md-content"
          dangerouslySetInnerHTML={{ __html: previewHtml }}
        />
      )}
      <div class="md-editor-actions">
        <button class="btn btn-primary" type="button" onClick={handleSave}>{saveLabel}</button>
        {onCancel && (
          <button class="btn btn-ghost" type="button" onClick={onCancel}>Cancel</button>
        )}
      </div>
    </div>
  );
}
