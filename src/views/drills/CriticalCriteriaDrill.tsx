import { useState, useEffect } from "preact/hooks";
import { appState, mutateState, save } from "../../store/appStore";
import {
  buildQueue,
  gradeCard,
  reinsertCard,
  SESSION_DAY_MS,
} from "../../lib/criticalSrs";
import type { Sheet, CriticalGrade } from "../../types";

export function CriticalCriteriaDrill({ sheet }: { sheet: Sheet }) {
  const criteriaIds = sheet.criticalCriteria.map((_, i) => String(i));

  const [queue, setQueue] = useState<string[]>(() => {
    const records = appState.value.drills?.critical?.[sheet.id] ?? {};
    return buildQueue(criteriaIds, records);
  });
  const [queueIndex, setQueueIndex] = useState(0);
  const [sessionDone, setSessionDone] = useState(false);

  const records = appState.value.drills?.critical?.[sheet.id] ?? {};
  const knownCold = criteriaIds.filter(
    (id) => records[id]?.grade === "know"
  ).length;

  function grade(g: Exclude<CriticalGrade, null>) {
    const currentId = queue[queueIndex];
    mutateState((draft) => {
      if (!draft.drills.critical[sheet.id]) {
        draft.drills.critical[sheet.id] = {};
      }
      draft.drills.critical[sheet.id][currentId] = gradeCard(
        draft.drills.critical[sheet.id][currentId],
        g
      );
      draft.stats.totalReviews = (draft.stats.totalReviews || 0) + 1;
    });
    save();

    if (g === "know") {
      if (queueIndex + 1 >= queue.length) {
        setSessionDone(true);
      } else {
        setQueueIndex(queueIndex + 1);
      }
    } else {
      const newQueue = reinsertCard(queue, currentId, g, queueIndex);
      setQueue(newQueue);
      setQueueIndex(queueIndex + 1);
    }
  }

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;
      if (e.key === "1") grade("fail");
      else if (e.key === "2") grade("close");
      else if (e.key === "3") grade("know");
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  });

  if (queue.length === 0 && !sessionDone) {
    const minNext = Object.values(records).reduce<number>((min, r) => {
      const t = r.lastSeenAt + SESSION_DAY_MS;
      return t < min ? t : min;
    }, Infinity);
    const hoursUntil =
      minNext === Infinity
        ? null
        : Math.max(1, Math.ceil((minNext - Date.now()) / 3_600_000));
    return (
      <div class="drill-pane">
        <div class="critical-state-screen">
          <div class="critical-state-icon">✓</div>
          <h2 class="critical-state-title">All caught up</h2>
          {hoursUntil !== null && (
            <p class="critical-state-sub">
              Next session available in {hoursUntil} hour
              {hoursUntil !== 1 ? "s" : ""}.
            </p>
          )}
          <button
            class="btn btn-primary"
            onClick={() => {
              setQueue(criteriaIds);
              setQueueIndex(0);
            }}
          >
            Drill all {criteriaIds.length} criteria anyway
          </button>
        </div>
      </div>
    );
  }

  if (sessionDone) {
    const failCount = criteriaIds.filter(
      (id) => records[id]?.grade === "fail"
    ).length;
    const closeCount = criteriaIds.filter(
      (id) => records[id]?.grade === "close"
    ).length;
    return (
      <div class="drill-pane">
        <div class="critical-state-screen">
          <div class="critical-state-icon">🎯</div>
          <h2 class="critical-state-title">Session complete</h2>
          <div class="critical-summary">
            <div class="critical-summary-item critical-summary-know">
              <span class="critical-summary-count">{knownCold}</span> known cold
            </div>
            <div class="critical-summary-item critical-summary-close">
              <span class="critical-summary-count">{closeCount}</span> close calls
            </div>
            <div class="critical-summary-item critical-summary-fail">
              <span class="critical-summary-count">{failCount}</span> would fail
            </div>
          </div>
          <button
            class="btn btn-primary"
            onClick={() => {
              setQueue(criteriaIds);
              setQueueIndex(0);
              setSessionDone(false);
            }}
          >
            Start new session
          </button>
        </div>
      </div>
    );
  }

  const currentId = queue[queueIndex];
  const criterionText = sheet.criticalCriteria[parseInt(currentId)];

  return (
    <div class="drill-pane">
      <div class="drill-header">
        <div class="drill-title-row">
          <h2 class="drill-title">
            {sheet.id.toUpperCase()} — Critical Criteria
          </h2>
          <span class="critical-known-tile">
            {knownCold}/{criteriaIds.length} known cold
          </span>
        </div>
        <div class="critical-progress-bar">
          <div
            class="critical-progress-fill"
            style={{ width: `${Math.round((queueIndex / queue.length) * 100)}%` }}
          />
        </div>
      </div>

      <div class="critical-card">
        <div class="critical-card-text">{criterionText}</div>
        <details class="critical-pearl">
          <summary class="critical-pearl-summary">Why this matters →</summary>
          <p class="critical-pearl-body">Coming soon.</p>
        </details>
      </div>

      <div class="critical-buttons">
        <button class="btn critical-btn critical-btn-fail" onClick={() => grade("fail")}>
          Would fail <kbd>1</kbd>
        </button>
        <button class="btn critical-btn critical-btn-close" onClick={() => grade("close")}>
          Close call <kbd>2</kbd>
        </button>
        <button class="btn critical-btn critical-btn-know" onClick={() => grade("know")}>
          Know it cold <kbd>3</kbd>
        </button>
      </div>

      <div class="critical-mini-list">
        {criteriaIds.map((id) => {
          const g = records[id]?.grade ?? null;
          const isCurrent = id === currentId;
          return (
            <div
              key={id}
              class={[
                "critical-chip",
                g === "fail" ? "critical-chip-fail" : "",
                g === "close" ? "critical-chip-close" : "",
                g === "know" ? "critical-chip-know" : "",
                isCurrent ? "critical-chip-current" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {parseInt(id) + 1}.{" "}
              {sheet.criticalCriteria[parseInt(id)].length > 45
                ? sheet.criticalCriteria[parseInt(id)].slice(0, 45) + "…"
                : sheet.criticalCriteria[parseInt(id)]}
            </div>
          );
        })}
      </div>
    </div>
  );
}
