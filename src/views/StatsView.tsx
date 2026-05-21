import { appState, navigate } from "../store/appStore";
import { NREMT_DATA } from "../data/sheets";
import { getAll as getAllAchievements } from "../lib/achievements";
import { countSheetNotes } from "../lib/notes";
import type { AppState, Sheet } from "../types";

// ─── Helpers ───────────────────────────────────────────────────────────────

interface DrillSummaryEntry {
  key: string;
  label: string;
  icon: string;
  mastered: number;
  isPct?: boolean;
}

function computeDrillSummary(state: AppState, sheets: Sheet[]): DrillSummaryEntry[] {
  return [
    {
      key: "secorder",
      label: "Section Order",
      icon: "🔢",
      mastered: sheets.filter((sh) => {
        const rec = (state.drills.secorder || {})[sh.id];
        return rec && rec.mastered;
      }).length,
    },
    {
      key: "stepseq",
      label: "Step Sequence",
      icon: "👣",
      mastered: sheets.filter((sh) => {
        const sheetRec = (state.drills.stepseq || {})[sh.id] || {};
        const drillable = sh.sections ? sh.sections.filter((s) => s.steps && s.steps.length >= 2) : [];
        return drillable.length > 0 && drillable.every((s) => sheetRec[s.name] && sheetRec[s.name].mastered);
      }).length,
    },
    {
      key: "whatnext",
      label: "What's Next?",
      icon: "➡️",
      mastered: sheets.filter((sh) => {
        const rec = (state.drills.whatnext || {})[sh.id];
        return rec && rec.mastered;
      }).length,
    },
    {
      key: "blankrecall",
      label: "Blank Recall ≥80%",
      icon: "🧠",
      mastered: sheets.filter((sh) => {
        const rec = (state.drills.blankrecall || {})[sh.id];
        return rec && (rec.bestPct || 0) >= 80;
      }).length,
      isPct: true,
    },
    {
      key: "spokenscript",
      label: "Spoken Script",
      icon: "🎤",
      mastered: sheets.filter((sh) => {
        const rec = (state.drills.spokenscript || {})[sh.id];
        return rec && rec.mastered;
      }).length,
    },
  ];
}

function computeSheetsComplete(state: AppState, sheets: Sheet[], drillSummary: DrillSummaryEntry[]): number {
  return sheets.filter((sh) =>
    drillSummary.every((d) => {
      if (d.key === "secorder") {
        const rec = (state.drills.secorder || {})[sh.id];
        const hasMultiple = sh.sections && sh.sections.filter((s) => s.header).length > 1;
        return !hasMultiple || (rec && rec.mastered);
      }
      if (d.key === "stepseq") {
        const sheetRec = (state.drills.stepseq || {})[sh.id] || {};
        const drillable = sh.sections ? sh.sections.filter((s) => s.steps && s.steps.length >= 2) : [];
        return drillable.length === 0 || drillable.every((s) => sheetRec[s.name] && sheetRec[s.name].mastered);
      }
      if (d.key === "blankrecall") {
        const rec = (state.drills.blankrecall || {})[sh.id];
        return rec && (rec.bestPct || 0) >= 80;
      }
      const rec = (state.drills[d.key as keyof typeof state.drills] || {}) as Record<string, { mastered?: boolean }>;
      return rec[sh.id] && rec[sh.id].mastered;
    })
  ).length;
}

// ─── Sub-components ────────────────────────────────────────────────────────

function StatCard({ icon, num, label }: { icon: string; num: string | number; label: string }) {
  return (
    <div class="stat-card">
      <div class="stat-card-icon">{icon}</div>
      <div class="num">{String(num)}</div>
      <div class="label">{label}</div>
    </div>
  );
}

function DrillBadge({ state, sheet, drillKey, label, isPct }: {
  state: AppState;
  sheet: Sheet;
  drillKey: string;
  label: string;
  isPct?: boolean;
}) {
  let cls = "drill-badge drill-none";
  let displayLabel = label;

  if (drillKey === "stepseq") {
    const sheetRec = (state.drills.stepseq || {})[sheet.id] || {};
    const drillable = sheet.sections ? sheet.sections.filter((s) => s.steps && s.steps.length >= 2) : [];
    if (drillable.length > 0) {
      const masteredCount = drillable.filter((s) => sheetRec[s.name] && sheetRec[s.name].mastered).length;
      const anyStarted = drillable.some((s) => sheetRec[s.name] && (sheetRec[s.name].attempts || 0) > 0);
      if (masteredCount === drillable.length) {
        cls = "drill-badge drill-good";
        displayLabel = label + " ✓";
      } else if (anyStarted) {
        cls = "drill-badge drill-mid";
        displayLabel = label + " " + masteredCount + "/" + drillable.length;
      }
    }
  } else if (isPct) {
    const rec = (state.drills.blankrecall || {})[sheet.id];
    if (rec && rec.attempts > 0) {
      const bp = Math.round(rec.bestPct || 0);
      cls = bp >= 80 ? "drill-badge drill-good" : bp >= 40 ? "drill-badge drill-mid" : "drill-badge drill-low";
      displayLabel = label + " " + bp + "%";
    }
  } else {
    const drillMap = state.drills[drillKey as keyof typeof state.drills] as Record<string, { mastered?: boolean; streak?: number }> | undefined;
    const rec = drillMap?.[sheet.id];
    if (rec && rec.mastered) {
      cls = "drill-badge drill-good";
      displayLabel = label + " ✓";
    } else if (rec && (rec.streak || 0) > 0) {
      cls = "drill-badge drill-mid";
      displayLabel = label + " " + rec.streak + "/3";
    }
  }

  return <span class={cls}>{displayLabel}</span>;
}

// ─── Main view ─────────────────────────────────────────────────────────────

export function StatsView() {
  const state = appState.value;
  const sheets = NREMT_DATA.sheets;
  const sheetCount = sheets.length;

  const streak = state.stats.dailyStreak || 0;
  const longestStreak = state.stats.longestStreak || 0;
  const totalReviews = state.stats.totalReviews || 0;
  const totalNotes = Object.keys((state.notes && state.notes.step) || {}).length;

  const allAchs = getAllAchievements(state);
  const unlockedCount = allAchs.filter((a) => a.unlockedAt).length;

  const drillSummary = computeDrillSummary(state, sheets);
  const sheetsComplete = computeSheetsComplete(state, sheets, drillSummary);

  const medQuiz = (state.drills as unknown as Record<string, Record<string, number>>)["medcondquiz"];
  const streakIcon = streak >= 7 ? "🔥" : "📅";

  const drillDefs = [
    { key: "secorder",    label: "Order" },
    { key: "stepseq",     label: "Steps" },
    { key: "whatnext",    label: "Next?" },
    { key: "blankrecall", label: "Recall", isPct: true },
    { key: "spokenscript", label: "Spoken" },
  ];

  return (
    <div>
      {/* Hero banner */}
      <div class="stats-hero">
        <div class="hero-block">
          <div class="hero-icon-big">{streakIcon}</div>
          <div class="hero-num">{streak}</div>
          <div class="hero-label">day streak</div>
        </div>
        <div class="hero-block">
          <div class="hero-icon-big">🏅</div>
          <div class="hero-num">{unlockedCount}/{allAchs.length}</div>
          <div class="hero-label">achievements</div>
        </div>
        <div class="hero-block">
          <div class="hero-icon-big">📝</div>
          <div class="hero-num">{totalNotes}</div>
          <div class="hero-label">notes written</div>
        </div>
        <div class="hero-block">
          <div class="hero-icon-big">✅</div>
          <div class="hero-num">{sheetsComplete}/{sheetCount}</div>
          <div class="hero-label">sheets complete</div>
        </div>
      </div>

      {/* Key numbers */}
      <div class="stat-grid">
        <StatCard icon="🏋️" num={totalReviews} label="Drill Attempts" />
        <StatCard icon="📖" num={NREMT_DATA.totalCards} label="Total Cards" />
        <StatCard icon="🗓️" num={longestStreak + (longestStreak === 1 ? " day" : " days")} label="Best Streak" />
        {medQuiz && medQuiz["sessionCount"] >= 1 && (
          <StatCard icon="🩺" num={Math.round((medQuiz["bestScore"] || 0) * 100) + "%"} label="Med Quiz Best" />
        )}
      </div>

      {/* Drill mastery overview */}
      <h2>Drill Mastery</h2>
      <div class="drill-mastery-table">
        {drillSummary.map((d) => {
          const pct = sheetCount > 0 ? (d.mastered / sheetCount) * 100 : 0;
          const barCls = pct >= 80 ? "drill-bar-fill good" : pct >= 40 ? "drill-bar-fill mid" : "drill-bar-fill";
          return (
            <div key={d.key} class="drill-mastery-row">
              <div class="drill-mastery-label">
                <span class="drill-mastery-icon">{d.icon}</span>
                <span>{d.label}</span>
              </div>
              <div class="drill-mastery-bar-wrap">
                <div class="drill-mastery-bar">
                  <div class={barCls} style={{ width: `${pct}%` }} />
                </div>
              </div>
              <div class="drill-mastery-count">{d.mastered}/{sheetCount}</div>
            </div>
          );
        })}
      </div>

      {/* Achievements */}
      <h2>
        Achievements{" "}
        <span class="ach-count-badge">{unlockedCount}/{allAchs.length}</span>
      </h2>
      <div class="ach-grid">
        {allAchs.map((ach) => {
          const unlocked = !!ach.unlockedAt;
          return (
            <div key={ach.id} class={`ach-card${unlocked ? " ach-unlocked" : " ach-locked"}`}>
              <div class="ach-icon">{ach.icon}</div>
              <div class="ach-body">
                <div class="ach-name">{ach.name}</div>
                <div class="ach-desc">{unlocked ? ach.desc : "???"}</div>
                {unlocked && (
                  <div class="ach-date">
                    Unlocked {new Date(ach.unlockedAt!).toLocaleDateString()}
                  </div>
                )}
              </div>
              {unlocked && <div class="ach-check">✓</div>}
            </div>
          );
        })}
      </div>

      {/* Progress by sheet */}
      <h2>Progress by Sheet</h2>
      <div class="sheet-progress-list">
        {sheets.map((sheet) => {
          const notesCount = countSheetNotes(state, sheet);
          return (
            <div key={sheet.id} class="sheet-progress-card">
              <div class="spc-header">
                <button
                  class="btn-link spc-title"
                  onClick={() => navigate({ view: "sheet", sheetId: sheet.id, tab: "sheet" })}
                >
                  {sheet.title}
                </button>
                <div class="spc-meta">
                  {notesCount > 0 && (
                    <span class="spc-notes">{notesCount} note{notesCount !== 1 ? "s" : ""}</span>
                  )}
                </div>
              </div>
              <div class="spc-drills">
                {drillDefs.map((d) => (
                  <DrillBadge
                    key={d.key}
                    state={state}
                    sheet={sheet}
                    drillKey={d.key}
                    label={d.label}
                    isPct={d.isPct}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Medical Conditions Quiz progress */}
      {medQuiz && medQuiz["sessionCount"] >= 1 ? (
        <div>
          <h2>Medical Conditions Quiz</h2>
          <div class="stat-grid">
            <StatCard icon="🩺" num={medQuiz["sessionCount"]} label="Sessions" />
            <StatCard icon="🎯" num={Math.round((medQuiz["bestScore"] || 0) * 100) + "%"} label="Best Score" />
            <StatCard
              icon="📊"
              num={(medQuiz["totalAttempts"] > 0 ? Math.round((medQuiz["totalCorrect"] / medQuiz["totalAttempts"]) * 100) : 0) + "%"}
              label="Overall Accuracy"
            />
            <StatCard icon="📝" num={medQuiz["totalAttempts"]} label="Questions Answered" />
          </div>
          <button
            class="btn btn-primary"
            type="button"
            onClick={() => navigate({ view: "medconditions", medcondTab: "quiz" })}
          >
            Take Medical Conditions Quiz →
          </button>
        </div>
      ) : (
        <div class="medcond-stats-cta">
          <p>Haven't tried the Medical Conditions Quiz yet?</p>
          <button
            class="btn btn-primary"
            type="button"
            onClick={() => navigate({ view: "medconditions", medcondTab: "quiz" })}
          >
            Try Medical Conditions Quiz →
          </button>
        </div>
      )}
    </div>
  );
}
