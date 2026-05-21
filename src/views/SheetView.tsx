import type { JSX } from "preact";
import { route, appState, navigate } from "../store/appStore";
import { NREMT_DATA } from "../data/sheets";
import { ReferenceView } from "./drills/ReferenceView";
import { NotesView } from "./drills/NotesView";
import { WhatNextDrill } from "./drills/WhatNextDrill";
import { BlankRecallView } from "./drills/BlankRecallView";
import { SpokenScriptView } from "./drills/SpokenScriptView";
import { SectionOrderDrill } from "./drills/SectionOrderDrill";
import { StepSeqDrill } from "./drills/StepSeqDrill";
import { MnemonicsView } from "./drills/MnemonicsView";
import { ChatView } from "./ChatView";
import { NotFoundView } from "./NotFoundView";
import type { Sheet, SheetTab } from "../types";

const MASTERY_RUNS = 3;

function orderLabel(sheet: Sheet): string {
  const rec = appState.value.drills?.secorder?.[sheet.id];
  if (rec?.mastered) return "Order Drill ✓";
  if (rec && rec.streak > 0) return `Order Drill (${rec.streak}/${MASTERY_RUNS})`;
  return "Order Drill";
}
function stepLabel(sheet: Sheet): string {
  const drillable = sheet.sections.filter(s => s.steps.length >= 2);
  const recs = appState.value.drills?.stepseq?.[sheet.id] || {};
  const mastered = drillable.filter(s => recs[s.name]?.mastered).length;
  if (drillable.length > 0 && mastered === drillable.length) return "Step Drill ✓";
  if (mastered > 0) return `Step Drill (${mastered}/${drillable.length})`;
  return "Step Drill";
}
function whatNextLabel(sheet: Sheet): string {
  const rec = appState.value.drills?.whatnext?.[sheet.id];
  if (rec?.mastered) return "What's Next? ✓";
  if (rec && rec.streak > 0) return `What's Next? (${rec.streak}/${MASTERY_RUNS})`;
  return "What's Next?";
}
function recallLabel(sheet: Sheet): string {
  const rec = appState.value.drills?.blankrecall?.[sheet.id];
  if (rec && rec.bestPct > 0) return `Blank Recall (${rec.bestPct}%)`;
  return "Blank Recall";
}
function scriptLabel(sheet: Sheet): string {
  const rec = appState.value.drills?.spokenscript?.[sheet.id];
  if (rec?.mastered) return "Spoken Script ✓";
  if (rec && rec.streak > 0) return `Spoken Script (${rec.streak}/${MASTERY_RUNS})`;
  return "Spoken Script";
}

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
      {tabs.map(t => (
        <button
          key={t.id}
          class={current === t.id ? "active" : ""}
          onClick={() => navigate({ view: "sheet", sheetId: sheet.id, tab: t.id })}
        >{t.label}</button>
      ))}
    </div>
  );
}

export function SheetView() {
  const r = route.value;
  const sheet = NREMT_DATA.sheets.find(s => s.id === r.sheetId);
  if (!sheet) return <NotFoundView />;

  const tab: SheetTab = r.tab ?? "sheet";

  let tabContent: JSX.Element | null;
  if (tab === "sheet")       tabContent = <ReferenceView sheet={sheet} />;
  else if (tab === "notes")   tabContent = <NotesView sheet={sheet} />;
  else if (tab === "whatnext") tabContent = <WhatNextDrill key={`${sheet.id}:whatnext`} sheet={sheet} />;
  else if (tab === "recall")  tabContent = <BlankRecallView key={`${sheet.id}:recall`} sheet={sheet} />;
  else if (tab === "script")  tabContent = <SpokenScriptView key={`${sheet.id}:script`} sheet={sheet} />;
  else if (tab === "order")   tabContent = <SectionOrderDrill key={`${sheet.id}:order`} sheet={sheet} />;
  else if (tab === "steps")   tabContent = <StepSeqDrill key={`${sheet.id}:steps`} sheet={sheet} />;
  else if (tab === "mnemonics") tabContent = <MnemonicsView key={`${sheet.id}:mnemonics`} sheet={sheet} />;
  else if (tab === "chat")    tabContent = <ChatView key={`${sheet.id}:chat`} sheetCtx={sheet} />;
  else tabContent = null;

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
      <div class="tab-content">{tabContent}</div>
    </div>
  );
}
