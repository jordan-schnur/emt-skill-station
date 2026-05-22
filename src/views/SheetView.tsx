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
import { ChatView } from "./ChatView";
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

// ─── Mode row ─────────────────────────────────────────────────────────────────

type ModeRowState = "done" | "active" | "progress" | "empty";

interface ModeRowProps {
  label: string;
  desc: string;
  tab?: SheetTab;
  rowState: ModeRowState;
  badge?: string;
  disabled?: boolean;
  critical?: boolean;
  sheetId: string;
}

function ModeRow({ label, desc, tab, rowState, badge, disabled, critical, sheetId }: ModeRowProps) {
  const cls = [
    "mode-row",
    rowState === "done" ? "is-done" : "",
    rowState === "active" ? "is-active" : "",
    rowState === "progress" ? "is-progress" : "",
    disabled ? "is-disabled" : "",
    critical ? "is-critical" : "",
  ].filter(Boolean).join(" ");

  return (
    <button
      class={cls}
      disabled={disabled}
      onClick={!disabled && tab ? () => navigate({ view: "sheet", sheetId, tab }) : undefined}
    >
      <div class="mode-row-pill" />
      <div class="mode-row-text">
        <div class="mode-row-label">{label}</div>
        <div class="mode-row-desc">{desc}</div>
      </div>
      {badge != null && <span class="mode-row-badge">{badge}</span>}
    </button>
  );
}

// ─── Mode buckets ─────────────────────────────────────────────────────────────

function ModeBuckets({ sheet, currentTab }: { sheet: Sheet; currentTab: SheetTab }) {
  const state = appState.value;

  // Compute badge values
  const secRec = state.drills?.secorder?.[sheet.id];
  const orderBadge = secRec?.mastered ? "✓"
    : secRec && secRec.streak > 0 ? `${secRec.streak}/${MASTERY_RUNS}`
    : undefined;
  const orderState: ModeRowState = currentTab === "order" ? "active"
    : secRec?.mastered ? "done"
    : secRec && secRec.streak > 0 ? "progress"
    : "empty";

  const drillable = sheet.sections.filter((s) => s.steps.length >= 2);
  const seqRecs = state.drills?.stepseq?.[sheet.id] ?? {};
  const stepsMastered = drillable.filter((s) => seqRecs[s.name]?.mastered).length;
  const stepsBadge = drillable.length === 0 ? undefined
    : stepsMastered === drillable.length && drillable.length > 0 ? "✓"
    : `${stepsMastered}/${drillable.length}`;
  const stepsState: ModeRowState = currentTab === "steps" ? "active"
    : stepsMastered === drillable.length && drillable.length > 0 ? "done"
    : stepsMastered > 0 ? "progress"
    : "empty";

  const wnRec = state.drills?.whatnext?.[sheet.id];
  const wnBadge = wnRec?.mastered ? "✓"
    : wnRec && wnRec.streak > 0 ? `${wnRec.streak}/${MASTERY_RUNS}`
    : undefined;
  const wnState: ModeRowState = currentTab === "whatnext" ? "active"
    : wnRec?.mastered ? "done"
    : wnRec && wnRec.streak > 0 ? "progress"
    : "empty";

  const brRec = state.drills?.blankrecall?.[sheet.id];
  const brBadge = brRec && brRec.bestPct > 0 ? `${brRec.bestPct}%` : undefined;
  const brState: ModeRowState = currentTab === "recall" ? "active"
    : (brRec?.bestPct ?? 0) >= 90 ? "done"
    : (brRec?.bestPct ?? 0) > 0 ? "progress"
    : "empty";

  const ssRec = state.drills?.spokenscript?.[sheet.id];
  const ssBadge = ssRec?.mastered ? "✓"
    : ssRec && ssRec.streak > 0 ? `${ssRec.streak}/${MASTERY_RUNS}`
    : undefined;
  const ssState: ModeRowState = currentTab === "script" ? "active"
    : ssRec?.mastered ? "done"
    : ssRec && ssRec.streak > 0 ? "progress"
    : "empty";

  const learnActive = ["sheet", "mnemonics", "script"].includes(currentTab);
  const drillActive = ["order", "steps", "whatnext"].includes(currentTab);
  const proveActive = ["recall", "notes", "chat"].includes(currentTab);

  return (
    <div class="mode-buckets">
      {/* Column 1 — Learn */}
      <div class={`mode-bucket${learnActive ? " is-active" : ""}`}>
        <div class="mode-bucket-head">
          <div class="mode-bucket-icon">📖</div>
          <div>
            <div class="mode-bucket-step">STEP 1</div>
            <div class="mode-bucket-name">Learn the sheet</div>
          </div>
        </div>
        <ModeRow
          label="Full Sheet"
          desc="Read every step and section"
          tab="sheet"
          rowState={currentTab === "sheet" ? "active" : "empty"}
          sheetId={sheet.id}
        />
        <ModeRow
          label="Mnemonics"
          desc="AI-generated memory hooks"
          tab="mnemonics"
          rowState={currentTab === "mnemonics" ? "active" : "empty"}
          sheetId={sheet.id}
        />
        <ModeRow
          label="Spoken Script"
          desc="Verbalize what you'd say aloud"
          tab="script"
          rowState={ssState}
          badge={ssBadge}
          sheetId={sheet.id}
        />
      </div>

      {/* Column 2 — Drill */}
      <div class={`mode-bucket${drillActive ? " is-active" : ""}`}>
        <div class="mode-bucket-head">
          <div class="mode-bucket-icon">🔁</div>
          <div>
            <div class="mode-bucket-step">STEP 2</div>
            <div class="mode-bucket-name">Drill until automatic</div>
          </div>
        </div>
        {sheet.sections.length > 1 && (
          <ModeRow
            label="Section Order"
            desc="Drag sections into correct exam order"
            tab="order"
            rowState={orderState}
            badge={orderBadge}
            sheetId={sheet.id}
          />
        )}
        <ModeRow
          label="Step Sequence"
          desc="Drag steps into correct order per section"
          tab="steps"
          rowState={stepsState}
          badge={stepsBadge}
          sheetId={sheet.id}
        />
        <ModeRow
          label="What's Next?"
          desc="4-choice: pick the step that follows"
          tab="whatnext"
          rowState={wnState}
          badge={wnBadge}
          sheetId={sheet.id}
        />
        <ModeRow
          label="Critical Criteria"
          desc="Auto-fail behaviors — must be reflexes"
          tab="sheet"
          rowState={currentTab === "sheet" ? "empty" : "empty"}
          badge={sheet.criticalCriteria.length > 0 ? `${sheet.criticalCriteria.length} items` : undefined}
          critical
          disabled
          sheetId={sheet.id}
        />
      </div>

      {/* Column 3 — Prove */}
      <div class={`mode-bucket${proveActive ? " is-active" : ""}`}>
        <div class="mode-bucket-head">
          <div class="mode-bucket-icon">🎯</div>
          <div>
            <div class="mode-bucket-step">STEP 3</div>
            <div class="mode-bucket-name">Prove mastery</div>
          </div>
        </div>
        <ModeRow
          label="Blank Recall"
          desc="Type every step from memory"
          tab="recall"
          rowState={brState}
          badge={brBadge}
          sheetId={sheet.id}
        />
        <ModeRow
          label="Timed Simulation"
          desc="Full station run with countdown"
          rowState="empty"
          badge="soon"
          disabled
          sheetId={sheet.id}
        />
        <ModeRow
          label="Notes"
          desc="Free-form study notes"
          tab="notes"
          rowState={currentTab === "notes" ? "active" : "empty"}
          sheetId={sheet.id}
        />
        <ModeRow
          label="AI Chat"
          desc="Q&A or examiner role-play"
          tab="chat"
          rowState={currentTab === "chat" ? "active" : "empty"}
          sheetId={sheet.id}
        />
      </div>
    </div>
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

  const tabs: Array<{ id: SheetTab; label: string; cond?: boolean }> = [
    { id: "sheet", label: "Full sheet" },
    { id: "notes", label: "Notes" },
    { id: "mnemonics", label: "Mnemonics" },
    ...(sheet.sections.length > 1 ? [{ id: "order" as SheetTab, label: orderLabel() }] : []),
    { id: "steps", label: stepLabel() },
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

  let tabContent: JSX.Element | null;
  if (tab === "sheet")         tabContent = <ReferenceView sheet={sheet} />;
  else if (tab === "notes")    tabContent = <NotesView sheet={sheet} />;
  else if (tab === "whatnext") tabContent = <WhatNextDrill key={`${sheet.id}:whatnext`} sheet={sheet} />;
  else if (tab === "recall")   tabContent = <BlankRecallView key={`${sheet.id}:recall`} sheet={sheet} />;
  else if (tab === "script")   tabContent = <SpokenScriptView key={`${sheet.id}:script`} sheet={sheet} />;
  else if (tab === "order")    tabContent = <SectionOrderDrill key={`${sheet.id}:order`} sheet={sheet} />;
  else if (tab === "steps")    tabContent = <StepSeqDrill key={`${sheet.id}:steps`} sheet={sheet} />;
  else if (tab === "mnemonics") tabContent = <MnemonicsView key={`${sheet.id}:mnemonics`} sheet={sheet} />;
  else if (tab === "chat")     tabContent = <ChatView key={`${sheet.id}:chat`} sheetCtx={sheet} />;
  else tabContent = null;

  return (
    <div>
      <div class="crumbs">
        <button class="btn-link" onClick={() => navigate({ view: "home" })}>← All sheets</button>
      </div>
      <SheetHero sheet={sheet} tab={tab} />
      <ModeBuckets sheet={sheet} currentTab={tab} />
      <QuickJump sheet={sheet} current={tab} />
      <VideosSection sheet={sheet} />
      <div class="tab-content">{tabContent}</div>
    </div>
  );
}
