import type { JSX } from "preact";
import { useEffect, useRef } from "preact/hooks";
import { route, appState, navigate, showToast, save } from "../store/appStore";
import { NREMT_DATA } from "../data/sheets";
import { ReferenceView } from "./drills/ReferenceView";
import { NotesView } from "./drills/NotesView";
import { NotFoundView } from "./NotFoundView";
import type { Route, Sheet, SheetTab } from "../types";

const MASTERY_RUNS = 3;

// ─── Tab label helpers ──────────────────────────────────────────────────────

function orderLabel(sheet: Sheet): string {
  const state = appState.value;
  const rec = state.drills?.secorder?.[sheet.id];
  if (rec?.mastered) return "Order Drill ✓";
  if (rec && rec.streak > 0) return `Order Drill (${rec.streak}/${MASTERY_RUNS})`;
  return "Order Drill";
}

function stepLabel(sheet: Sheet): string {
  const state = appState.value;
  const drillable = sheet.sections.filter((s) => s.steps.length >= 2);
  const recs = state.drills?.stepseq?.[sheet.id] || {};
  const mastered = drillable.filter((s) => recs[s.name]?.mastered).length;
  if (drillable.length > 0 && mastered === drillable.length) return "Step Drill ✓";
  if (mastered > 0) return `Step Drill (${mastered}/${drillable.length})`;
  return "Step Drill";
}

function whatNextLabel(sheet: Sheet): string {
  const state = appState.value;
  const rec = state.drills?.whatnext?.[sheet.id];
  if (rec?.mastered) return "What's Next? ✓";
  if (rec && rec.streak > 0) return `What's Next? (${rec.streak}/${MASTERY_RUNS})`;
  return "What's Next?";
}

function recallLabel(sheet: Sheet): string {
  const state = appState.value;
  const rec = state.drills?.blankrecall?.[sheet.id];
  if (rec && rec.bestPct > 0) return `Blank Recall (${rec.bestPct}%)`;
  return "Blank Recall";
}

function scriptLabel(sheet: Sheet): string {
  const state = appState.value;
  const rec = state.drills?.spokenscript?.[sheet.id];
  if (rec?.mastered) return "Spoken Script ✓";
  if (rec && rec.streak > 0) return `Spoken Script (${rec.streak}/${MASTERY_RUNS})`;
  return "Spoken Script";
}

// ─── Tab bar ────────────────────────────────────────────────────────────────

function TabBar({ sheet, current }: { sheet: Sheet; current: SheetTab }) {
  const tabs: Array<{ id: SheetTab; label: string }> = [
    ...(sheet.sections.length > 1 ? [{ id: "order" as SheetTab, label: orderLabel(sheet) }] : []),
    { id: "steps", label: stepLabel(sheet) },
    { id: "whatnext", label: whatNextLabel(sheet) },
    { id: "recall", label: recallLabel(sheet) },
    { id: "script", label: scriptLabel(sheet) },
    { id: "mnemonics", label: "Mnemonics" },
    { id: "sheet", label: "Full sheet" },
    { id: "notes", label: "Notes" },
    { id: "chat", label: "Chat" },
  ];

  return (
    <div class="tabs">
      {tabs.map((t) => (
        <button
          key={t.id}
          class={current === t.id ? "active" : ""}
          onClick={() => navigate({ view: "sheet", sheetId: sheet.id, tab: t.id })}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

// ─── Legacy tab view (drills not yet ported) ────────────────────────────────

interface LegacyTabCtx {
  state: unknown;
  route: Route;
  navigate: (r: Route) => void;
  refresh: () => void;
  toast: (m: string) => void;
  save: () => void;
}

function LegacyTabView({ tab, sheet }: { tab: SheetTab; sheet: Sheet }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const legacyCtx: LegacyTabCtx = {
      state: appState.value,
      get route() { return route.value; },
      navigate,
      refresh: () => { route.value = { ...route.value }; },
      toast: showToast,
      save,
    };
    const fnMap: Record<string, string> = {
      order: "sectionOrderDrill",
      steps: "stepSeqDrill",
      whatnext: "whatNextDrill",
      recall: "blankRecall",
      script: "spokenScript",
      mnemonics: "mnemonics",
      chat: "chat",
    };
    const fnName = fnMap[tab];
    if (!fnName) return;
    try {
      const fn = (window.Views as unknown as Record<string, (ctx: LegacyTabCtx, sheet: Sheet) => HTMLElement>)[fnName];
      if (!fn) return;
      const el = fn(legacyCtx, sheet);
      ref.current.innerHTML = "";
      ref.current.appendChild(el);
    } catch (err) {
      console.error("LegacyTabView render error:", err);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // remounted via key in SheetView when tab/sheetId changes

  return <div ref={ref} style={{ display: "contents" }} />;
}

// ─── Main SheetView ─────────────────────────────────────────────────────────

export function SheetView() {
  const r = route.value;
  const sheet = NREMT_DATA.sheets.find((s) => s.id === r.sheetId);
  if (!sheet) return <NotFoundView />;

  const tab: SheetTab = r.tab ?? "sheet";

  let tabContent: JSX.Element | null;
  if (tab === "sheet") {
    tabContent = <ReferenceView sheet={sheet} />;
  } else if (tab === "notes") {
    tabContent = <NotesView sheet={sheet} />;
  } else {
    tabContent = <LegacyTabView key={`${sheet.id}:${tab}`} tab={tab} sheet={sheet} />;
  }

  return (
    <div>
      <div class="crumbs">
        <button class="btn-link" onClick={() => navigate({ view: "home" })}>← All sheets</button>
      </div>
      <div class="sheet-header">
        <div>
          <h1>{sheet.title}</h1>
          <div class="meta">
            {sheet.id.toUpperCase()} · {sheet.category} · {sheet.totalPoints} possible points
            {sheet.timeLimit ? ` · time limit ${sheet.timeLimit}` : ""}
          </div>
        </div>
      </div>
      <TabBar sheet={sheet} current={tab} />
      {tabContent}
    </div>
  );
}
