import { MarkdownEditor } from "../../components/ui/MarkdownEditor";
import { getStepNote, setStepNote, getSheetNote, setSheetNote } from "../../lib/notes";
import { appState, save, mutateState, showToast } from "../../store/appStore";
import type { Sheet } from "../../types";

interface Props {
  sheet: Sheet;
}

export function NotesView({ sheet }: Props) {
  const state = appState.value;
  const sheetText = getSheetNote(state, sheet.id);

  const stepNotes = sheet.cards
    .map((card) => ({ card, note: getStepNote(state, card.id) }))
    .filter((x) => x.note);

  function handleSheetSave(val: string) {
    mutateState((draft) => setSheetNote(draft, sheet.id, val));
    save();
    showToast(val.trim() ? "Note saved" : "Note removed");
  }

  function handleStepSave(cardId: string) {
    return (val: string) => {
      mutateState((draft) => setStepNote(draft, cardId, val));
      save();
      showToast(val.trim() ? "Note saved" : "Note removed");
    };
  }

  return (
    <div>
      <p class="muted">
        Supports Markdown — use **bold**, _italic_, - lists. Click into the Full sheet tab to attach notes to specific steps.
      </p>

      {/* Sheet-level note */}
      <div class="notes-block">
        <div class="target">
          <strong>General note for this sheet</strong>
        </div>
        <MarkdownEditor
          value={sheetText}
          placeholder="Notes about this sheet as a whole…"
          saveLabel="Save"
          onSave={handleSheetSave}
        />
      </div>

      <h3>Per-step notes ({stepNotes.length})</h3>

      {stepNotes.length === 0 ? (
        <p class="muted">
          None yet. Open the Full sheet tab and click the &quot;+ note&quot; chip next to any row to add one.
        </p>
      ) : (
        stepNotes.map(({ card, note }) => (
          <div key={card.id} class="notes-block">
            <div class="target">
              {card.section}:{" "}
              <strong>{card.parent ? `${card.parent} → ${card.text}` : card.text}</strong>
            </div>
            <MarkdownEditor
              value={note}
              saveLabel="Save"
              onSave={handleStepSave(card.id)}
            />
          </div>
        ))
      )}
    </div>
  );
}
