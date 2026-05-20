import { useState } from "preact/hooks";
import { appState, navigate, mutateState, save } from "../../store/appStore";
import { HelpIcon } from "../../components/ui/HelpIcon";
import { DraggableList } from "../../components/ui/DraggableList";
import { shuffle } from "../../lib/drillHelpers";
import type { Sheet } from "../../types";

const MASTERY_RUNS = 3;

export function SectionOrderDrill({ sheet }: { sheet: Sheet }) {
  const correctOrder = sheet.sections.map((s) => s.name);

  if (correctOrder.length <= 1) {
    return (
      <div class="empty-state">
        <div class="big">—</div>
        <p>This sheet has a single continuous sequence.</p>
        <p class="muted">
          Section Order Drill works for sheets with multiple named sections. Use the Full Sheet tab to review the steps.
        </p>
        <p>
          <button
            class="btn btn-primary"
            onClick={() => navigate({ view: "sheet", sheetId: sheet.id, tab: "sheet" })}
          >
            View Full Sheet →
          </button>
        </p>
      </div>
    );
  }

  const [items, setItems] = useState<string[]>(() => shuffle(correctOrder));
  const [submitted, setSubmitted] = useState(false);
  const [correctness, setCorrectness] = useState<boolean[]>([]);

  const mastery = appState.value.drills?.secorder?.[sheet.id] ?? { streak: 0, attempts: 0, mastered: false };

  function reorder(from: number, to: number) {
    setItems((prev) => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  }

  function moveItem(idx: number, dir: number) {
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= items.length) return;
    setItems((prev) => {
      const next = [...prev];
      [next[idx], next[newIdx]] = [next[newIdx], next[idx]];
      return next;
    });
  }

  function checkOrder() {
    const newCorrectness = items.map((name, idx) => name === correctOrder[idx]);
    const allCorrect = newCorrectness.every(Boolean);
    mutateState((draft) => {
      if (!draft.drills.secorder) draft.drills.secorder = {};
      if (!draft.drills.secorder[sheet.id]) {
        draft.drills.secorder[sheet.id] = { streak: 0, attempts: 0, mastered: false };
      }
      const r = draft.drills.secorder[sheet.id];
      r.attempts += 1;
      if (allCorrect) {
        r.streak += 1;
        if (r.streak >= MASTERY_RUNS) r.mastered = true;
      } else {
        r.streak = 0;
      }
      draft.stats.totalReviews = (draft.stats.totalReviews || 0) + 1;
    });
    save();
    setCorrectness(newCorrectness);
    setSubmitted(true);
  }

  function reshuffle() {
    setItems(shuffle(correctOrder));
    setSubmitted(false);
    setCorrectness([]);
  }

  const allCorrect = submitted && correctness.every(Boolean);
  const latestMastery = appState.value.drills?.secorder?.[sheet.id] ?? mastery;

  return (
    <div class="drill-pane">
      <div class="drill-header">
        <div class="drill-title-row">
          <h2 class="drill-title">Section Order Drill</h2>
          {latestMastery.mastered && <span class="mastered-badge">✓ Mastered</span>}
          <HelpIcon
            title="Section Order Drill"
            bodyHTML={`<p>The major sections of this sheet are shuffled. Drag them into the correct exam order (tap ↑↓ to nudge one step at a time).</p>
              <p>Hit <strong>Check my order</strong> to submit. If you're wrong, the correct order is revealed.</p>
              <p><strong>Mastery</strong> = 3 correct runs in a row. Any wrong answer resets your streak to 0.</p>`}
          />
        </div>
        <p class="drill-sub muted">
          {latestMastery.mastered
            ? "Keep your skills sharp — drag or use ↑↓ to put the sections back in exam order."
            : `Arrange the sections in the order they appear on the skill sheet. Hit ${MASTERY_RUNS} in a row to master.`}
        </p>
        <div class="streak-row">
          <span class="streak-label">Streak </span>
          {Array.from({ length: MASTERY_RUNS }, (_, i) => (
            <span key={i} class={"streak-pip" + (i < latestMastery.streak ? " filled" : "")} />
          ))}
          <span class="muted">
            {" "}{latestMastery.streak}/{MASTERY_RUNS}
            {latestMastery.attempts ? ` · ${latestMastery.attempts} attempt${latestMastery.attempts === 1 ? "" : "s"}` : ""}
          </span>
        </div>
        <p class="drill-hint muted">Drag to reorder · tap ↑↓ to nudge</p>
      </div>

      <DraggableList
        items={items}
        onReorder={reorder}
        submitted={submitted}
        itemClass={(item, idx) =>
          "order-item" + (submitted ? (correctness[idx] ? " correct" : " wrong") : "")
        }
        renderRight={(item, idx) =>
          submitted ? (
            <span class="order-check">
              {correctness[idx] ? "✓" : `✗ · should be #${correctOrder.indexOf(item) + 1}`}
            </span>
          ) : (
            <div class="order-arrows">
              <button
                class="arrow-btn"
                disabled={idx === 0}
                aria-label="Move up"
                onClick={(e) => { e.stopPropagation(); moveItem(idx, -1); }}
              >↑</button>
              <button
                class="arrow-btn"
                disabled={idx === items.length - 1}
                aria-label="Move down"
                onClick={(e) => { e.stopPropagation(); moveItem(idx, 1); }}
              >↓</button>
            </div>
          )
        }
      />

      {!submitted ? (
        <div class="drill-actions">
          <button class="btn btn-primary" onClick={checkOrder}>Check my order</button>
          <button class="btn btn-ghost" onClick={reshuffle}>Reshuffle</button>
        </div>
      ) : (
        <>
          <div class={"drill-result " + (allCorrect ? "result-pass" : "result-fail")}>
            <div class="result-icon">{allCorrect ? "✓" : "✗"}</div>
            {allCorrect ? (
              <div>
                <strong>{latestMastery.mastered ? "Section order mastered!" : "Correct order!"}</strong>
                <p>{latestMastery.mastered
                  ? "You've locked in the exam flow for this sheet."
                  : `Streak: ${latestMastery.streak} / ${MASTERY_RUNS} — keep it up!`}
                </p>
              </div>
            ) : (
              <div>
                <strong>Not quite — check corrections above.</strong>
                <p>Streak reset to 0. Review the order and try again.</p>
              </div>
            )}
            <div class="drill-actions">
              <button class="btn btn-primary" onClick={reshuffle}>Try again</button>
              <button
                class="btn"
                onClick={() => navigate({ view: "sheet", sheetId: sheet.id, tab: "sheet" })}
              >
                View full sheet
              </button>
            </div>
          </div>
          {!allCorrect && (
            <details class="hint-details">
              <summary class="muted">Show correct order</summary>
              <ol class="correct-order-list">
                {correctOrder.map((name) => <li key={name}>{name}</li>)}
              </ol>
            </details>
          )}
        </>
      )}
    </div>
  );
}
