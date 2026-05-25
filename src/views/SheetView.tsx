import type { JSX } from "preact";
import { route, appState, navigate } from "../store/appStore";
import { NREMT_DATA } from "../data/sheets";
import { sheetMasteryPct } from "../lib/drillHelpers";
import { ReferenceView } from "./drills/ReferenceView";
import { NotesView } from "./drills/NotesView";
import { WhatNextDrill } from "./drills/WhatNextDrill";
import { BlankRecallView } from "./drills/BlankRecallView";
import { SpokenScriptView } from "./drills/SpokenScriptView";
import { SectionOrderDrill } from "./drills/SectionOrderDrill";
import { StepSeqDrill } from "./drills/StepSeqDrill";
import { MnemonicsView } from "./drills/MnemonicsView";
import { CriticalCriteriaDrill } from "./drills/CriticalCriteriaDrill";
import { DrillView } from "./drills/DrillView";
import { ChatView } from "./ChatView";
import { ExaminerView } from "./ExaminerView";
import { NotFoundView } from "./NotFoundView";
import { MasteryRing } from "./HomeView";
import type { Sheet, SheetTab } from "../types";
import { VideoCard } from "../components/VideoCard";

const MASTERY_RUNS = 3;

// ─── Suggest next mode ────────────────────────────────────────────────────────

function suggestNextMode(sheet: Sheet): { tab: SheetTab; label: string } | null {
  const state = appState.value;
  const drillable = sheet.sections.filter((s) => s.steps.length >= 2);
  const seqRecs = state.drills?.stepseq?.[sheet.id] ?? {};
  if (sheet.sections.length > 1 && !state.drills?.secorder?.[sheet.id]?.mastered) {
    return { tab: "order", label: "Section Order Drill" };
  }
  const nextSec = drillable.find((s) => !seqRecs[s.name]?.mastered);
  if (nextSec) return { tab: "steps", label: `Step Drill — ${nextSec.name}` };
  if ((state.drills?.blankrecall?.[sheet.id]?.bestPct ?? 0) < 90) {
    return { tab: "recall", label: "Blank Recall" };
  }
  if (!state.drills?.whatnext?.[sheet.id]?.mastered) {
    return { tab: "whatnext", label: "What's Next?" };
  }
  if (!state.drills?.spokenscript?.[sheet.id]?.mastered) {
    return { tab: "script", label: "Spoken Script" };
  }
  return null;
}

// ─── Sheet hero ───────────────────────────────────────────────────────────────

function SheetHero({ sheet, tab }: { sheet: Sheet; tab: SheetTab }) {
  const state = appState.value;
  const pct = sheetMasteryPct(state, sheet);
  const next = suggestNextMode(sheet);

  return (
    <div class="sheet-hero">
      <MasteryRing pct={pct} size={72} stroke={6} />
      <div class="sheet-hero-text">
        <div class="sheet-hero-eyebrow">
          {sheet.id.toUpperCase()} · {sheet.category}
        </div>
        <h1 class="sheet-hero-title">{sheet.title}</h1>
        <div class="sheet-hero-meta">
          {sheet.totalPoints} possible points
          {sheet.timeLimit ? ` · ${sheet.timeLimit} station` : ""}
        </div>
      </div>
      {next && next.tab !== tab && (
        <div class="sheet-hero-suggest">
          <div class="sheet-hero-suggest-eyebrow">↳ DO THIS NEXT</div>
          <div class="sheet-hero-suggest-text">
            Try <strong>{next.label}</strong>.
          </div>
          <button
            class="btn btn-primary btn-sm"
            onClick={() => navigate({ view: "sheet", sheetId: sheet.id, tab: next.tab })}
          >
            Open
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Scroll helper ────────────────────────────────────────────────────────────

function scrollToContent() {
  requestAnimationFrame(() => {
    document.getElementById("tab-content")?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

// ─── Mode card ────────────────────────────────────────────────────────────────

type ModeRowState = "done" | "active" | "progress" | "empty";

interface ModeCardProps {
  num: string;
  label: string;
  desc: string;
  tab: SheetTab;
  statusLine: string;
  cardState: ModeRowState;
  critical?: boolean;
  sheetId: string;
}

function ModeCard({ num, label, desc, tab, statusLine, cardState, critical, sheetId }: ModeCardProps) {
  const cls = [
    "mode-card",
    cardState === "done" ? "is-done" : "",
    cardState === "active" ? "is-active" : "",
    critical ? "is-critical" : "",
  ].filter(Boolean).join(" ");

  return (
    <div class={cls} onClick={() => { navigate({ view: "sheet", sheetId, tab }); scrollToContent(); }}>
      <div class="mode-card-num">{num}</div>
      <h4>{label}</h4>
      <p>{desc}</p>
      <div class="mode-card-go">
        <span>{statusLine}</span>
        <span class="arrow">→</span>
      </div>
    </div>
  );
}

// ─── Secondary card ───────────────────────────────────────────────────────────

function SecCard({ title, desc, tab, sheetId, isActive }: { title: string; desc: string; tab: SheetTab; sheetId: string; isActive?: boolean }) {
  const cls = ["sec-card", isActive ? "is-active" : ""].filter(Boolean).join(" ");
  return (
    <div class={cls} onClick={() => { navigate({ view: "sheet", sheetId, tab }); scrollToContent(); }}>
      <div class="sec-card-title">{title}</div>
      <div class="sec-card-desc">{desc}</div>
    </div>
  );
}

// ─── Modes grid ───────────────────────────────────────────────────────────────

function ModesGrid({ sheet, currentTab }: { sheet: Sheet; currentTab: SheetTab }) {
  const state = appState.value;

  const totalSteps = sheet.sections.reduce((acc, s) => acc + s.steps.length, 0);

  const secRec = state.drills?.secorder?.[sheet.id];
  const drillable = sheet.sections.filter((s) => s.steps.length >= 2);
  const seqRecs = state.drills?.stepseq?.[sheet.id] ?? {};
  const stepsMastered = drillable.filter((s) => seqRecs[s.name]?.mastered).length;
  const wnRec = state.drills?.whatnext?.[sheet.id];

  const drillAllMastered =
    (secRec?.mastered || sheet.sections.length <= 1) &&
    (drillable.length === 0 || stepsMastered === drillable.length) &&
    wnRec?.mastered === true;
  const drillAnyProgress =
    (secRec && secRec.streak > 0) ||
    stepsMastered > 0 ||
    (wnRec && wnRec.streak > 0);

  const drillCardState: ModeRowState =
    ["order", "steps", "whatnext"].includes(currentTab) ? "active"
    : drillAllMastered ? "done"
    : drillAnyProgress ? "progress"
    : "empty";

  let drillStatusLine = "Start drilling";
  if (secRec && secRec.streak > 0 && !secRec.mastered) {
    drillStatusLine = `Order ${secRec.streak}/${MASTERY_RUNS}`;
  } else if (stepsMastered > 0 && stepsMastered < drillable.length) {
    drillStatusLine = `Steps ${stepsMastered}/${drillable.length}`;
  } else if (drillAllMastered) {
    drillStatusLine = "All drills mastered";
  }

  const critRecs = state.drills?.critical?.[sheet.id] ?? {};
  const critKnown = sheet.criticalCriteria.filter(
    (_c, i) => critRecs[String(i)]?.grade === "know"
  ).length;
  const critTotal = sheet.criticalCriteria.length;
  const critCardState: ModeRowState =
    currentTab === "critical" ? "active"
    : critKnown === critTotal && critTotal > 0 ? "done"
    : critKnown > 0 ? "progress"
    : "empty";

  const learnCardState: ModeRowState =
    ["sheet", "mnemonics"].includes(currentTab) ? "active" : "empty";

  const noteCount = Object.keys(state.notes?.step ?? {}).filter(k => k.startsWith(sheet.id + ":")).length;

  return (
    <>
      <div class="modes-grid">
        <ModeCard
          num="01 · Foundation"
          label="Learn"
          desc="Read the full sheet and study each step. Mnemonics available."
          tab="sheet"
          statusLine={`${totalSteps} steps`}
          cardState={learnCardState}
          sheetId={sheet.id}
        />
        <ModeCard
          num="02 · Recall"
          label="Drill"
          desc="Adaptive sequence drill — rotates section order, step order, and what's next based on what you've missed."
          tab="order"
          statusLine={drillStatusLine}
          cardState={drillCardState}
          sheetId={sheet.id}
        />
        <ModeCard
          num="03 · Exam-critical"
          label="Critical Criteria"
          desc="Just the auto-fail behaviors. Any one of these fails you on the NREMT — regardless of everything else."
          tab="critical"
          statusLine={`${critTotal} criteria · ${critKnown} known cold`}
          cardState={critCardState}
          critical
          sheetId={sheet.id}
        />
      </div>
      <div class="section-head" style="margin-top: 32px;">
        <h3>Reference</h3>
        <span class="section-meta">No drilling — just look things up</span>
      </div>
      <div class="secondary-grid">
        <SecCard
          title="Full sheet"
          desc="All sections, steps, points, and critical criteria in one scrollable view."
          tab="sheet"
          sheetId={sheet.id}
          isActive={currentTab === "sheet"}
        />
        <SecCard
          title="My notes"
          desc={`${noteCount} note${noteCount === 1 ? "" : "s"} attached to steps on this sheet.`}
          tab="notes"
          sheetId={sheet.id}
          isActive={currentTab === "notes"}
        />
        <SecCard
          title="Practice with examiner"
          desc="AI roleplay of the station for this sheet."
          tab="chat"
          sheetId={sheet.id}
          isActive={currentTab === "chat"}
        />
      </div>
    </>
  );
}

// ─── Quick-jump strip ─────────────────────────────────────────────────────────

function QuickJump({ sheet, current }: { sheet: Sheet; current: SheetTab }) {
  const state = appState.value;

  function orderLabel(): string {
    const rec = state.drills?.secorder?.[sheet.id];
    if (rec?.mastered) return "Order ✓";
    if (rec && rec.streak > 0) return `Order ${rec.streak}/${MASTERY_RUNS}`;
    return "Order";
  }
  function stepLabel(): string {
    const drillable = sheet.sections.filter((s) => s.steps.length >= 2);
    const recs = state.drills?.stepseq?.[sheet.id] ?? {};
    const mastered = drillable.filter((s) => recs[s.name]?.mastered).length;
    if (drillable.length > 0 && mastered === drillable.length) return "Steps ✓";
    if (mastered > 0) return `Steps ${mastered}/${drillable.length}`;
    return "Steps";
  }
  function criticalLabel(): string {
    const critRecs = state.drills?.critical?.[sheet.id] ?? {};
    const known = sheet.criticalCriteria.filter(
      (_, i) => critRecs[String(i)]?.grade === "know"
    ).length;
    const total = sheet.criticalCriteria.length;
    if (total === 0) return "Crit";
    if (known === total) return "Crit ✓";
    if (known > 0) return `Crit (${known}/${total})`;
    return "Crit";
  }

  const tabs: Array<{ id: SheetTab; label: string; cond?: boolean }> = [
    { id: "sheet", label: "Full sheet" },
    { id: "notes", label: "Notes" },
    { id: "mnemonics", label: "Mnemonics" },
    { id: "drill", label: "Adaptive Drill" },
    ...(sheet.sections.length > 1 ? [{ id: "order" as SheetTab, label: orderLabel() }] : []),
    { id: "steps", label: stepLabel() },
    ...(sheet.criticalCriteria.length > 0
      ? [{ id: "critical" as SheetTab, label: criticalLabel() }]
      : []),
    { id: "whatnext", label: "What's Next?" },
    { id: "recall", label: "Recall" },
    { id: "script", label: "Script" },
    { id: "chat", label: "Chat" },
  ];

  return (
    <div class="quickjump">
      {tabs.map((t) => (
        <button
          key={t.id}
          class={current === t.id ? "is-active" : ""}
          onClick={() => navigate({ view: "sheet", sheetId: sheet.id, tab: t.id })}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

// ─── Videos section ───────────────────────────────────────────────────────────

function VideosSection({ sheet }: { sheet: Sheet }) {
  if (!sheet.videos || sheet.videos.length === 0) return null;
  return (
    <div class="videos-section">
      <div class="videos-section-head">
        <h3>Watch how it's done</h3>
        <span class="videos-section-meta">External videos · opens YouTube</span>
      </div>
      <div class="videos-grid">
        {sheet.videos.map((v) => (
          <VideoCard key={v.videoId} video={v} />
        ))}
      </div>
    </div>
  );
}

// ─── SheetView ────────────────────────────────────────────────────────────────

export function SheetView() {
  const r = route.value;
  const sheet = NREMT_DATA.sheets.find((s) => s.id === r.sheetId);
  if (!sheet) return <NotFoundView />;

  const tab: SheetTab = r.tab ?? "sheet";

  const TAB_LABELS: Partial<Record<SheetTab, string>> = {
    sheet: "Full sheet",
    notes: "My notes",
    chat: "Practice with examiner",
    order: "Section order drill",
    steps: "Step sequence drill",
    whatnext: "What's next?",
    recall: "Blank recall",
    script: "Spoken script",
    mnemonics: "Mnemonics",
    critical: "Critical criteria",
    drill: "Adaptive drill",
  };

  let tabContent: JSX.Element | null;
  if (tab === "sheet")         tabContent = <ReferenceView sheet={sheet} />;
  else if (tab === "notes")    tabContent = <NotesView sheet={sheet} />;
  else if (tab === "whatnext") tabContent = <WhatNextDrill key={`${sheet.id}:whatnext`} sheet={sheet} />;
  else if (tab === "recall")   tabContent = <BlankRecallView key={`${sheet.id}:recall`} sheet={sheet} />;
  else if (tab === "script")   tabContent = <SpokenScriptView key={`${sheet.id}:script`} sheet={sheet} />;
  else if (tab === "order")    tabContent = <SectionOrderDrill key={`${sheet.id}:order`} sheet={sheet} />;
  else if (tab === "steps")    tabContent = <StepSeqDrill key={`${sheet.id}:steps`} sheet={sheet} />;
  else if (tab === "mnemonics") tabContent = <MnemonicsView key={`${sheet.id}:mnemonics`} sheet={sheet} />;
  else if (tab === "chat")     tabContent = <ExaminerView key={`${sheet.id}:chat`} sheet={sheet} />;
  else if (tab === "critical")  tabContent = <CriticalCriteriaDrill key={`${sheet.id}:critical`} sheet={sheet} />;
  else if (tab === "drill")    tabContent = <DrillView key={`${sheet.id}:drill`} sheet={sheet} />;
  else tabContent = null;

  return (
    <div>
      <div class="crumbs">
        <button class="btn-link" onClick={() => navigate({ view: "home" })}>← All sheets</button>
      </div>
      <SheetHero sheet={sheet} tab={tab} />
      {sheet.sheetType === "station-guide" && (
        <div class="station-guide-banner">
          <span class="station-guide-icon">📋</span>
          <div class="station-guide-text">
            <strong>Station guide</strong> — This is not an official NREMT skill sheet.
            You may be tested on this skill during your practical exam — know it cold.
          </div>
        </div>
      )}
      <ModesGrid sheet={sheet} currentTab={tab} />
      <QuickJump sheet={sheet} current={tab} />
      <VideosSection sheet={sheet} />
      <div id="tab-content" class="tab-content">
        {tabContent && (
          <div class="tab-content-label">{TAB_LABELS[tab] ?? tab}</div>
        )}
        {tabContent}
      </div>
    </div>
  );
}
