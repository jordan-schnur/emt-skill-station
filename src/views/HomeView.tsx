import { appState, navigate } from "../store/appStore";
import { NREMT_DATA } from "../data/sheets";
import { sheetMasteryPct } from "../lib/drillHelpers";
import type { AppState, Sheet, SheetTab } from "../types";

// ─── Next-mode suggestion ─────────────────────────────────────────────────────

function suggestNextModeForSheet(state: AppState, sheet: Sheet): { tab: SheetTab; label: string } {
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
  return { tab: "sheet", label: "Full sheet review" };
}

// ─── MasteryRing ──────────────────────────────────────────────────────────────

export function MasteryRing({ pct, size = 52, stroke = 5 }: { pct: number; size?: number; stroke?: number }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const fill = (pct / 100) * circ;
  const color =
    pct >= 85 ? "var(--good)" :
    pct >= 50 ? "var(--accent)" :
    pct >= 20 ? "var(--hard)" :
    "var(--text-mute)";

  return (
    <div class="mastery-ring" style={{ width: size, height: size }} aria-label={`${Math.round(pct)}% mastery`}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border)" strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={`${fill} ${circ}`} strokeLinecap="round"
        />
      </svg>
      <span class="mastery-ring-label" style={{ color, fontSize: size > 60 ? 15 : 11 }}>
        {Math.round(pct)}<sup>%</sup>
      </span>
    </div>
  );
}

// ─── Today hero ───────────────────────────────────────────────────────────────

function TodayHero() {
  const state = appState.value;
  const sheets = NREMT_DATA.sheets;

  let target = sheets[0];
  let targetPct = 101;
  for (const s of sheets) {
    const p = sheetMasteryPct(state, s);
    if (p < targetPct) { targetPct = p; target = s; }
  }
  const nextMode = suggestNextModeForSheet(state, target);

  const overallPct = Math.round(sheets.reduce((a, s) => a + sheetMasteryPct(state, s), 0) / sheets.length);
  const masteredCount = sheets.filter((s) => sheetMasteryPct(state, s) >= 80).length;

  const dateLabel = new Date().toLocaleDateString("en-US", {
    weekday: "long", month: "short", day: "numeric",
  }).toUpperCase();

  const rawLog = (state.stats as unknown as Record<string, unknown> & { dailyReviewLog?: Record<string, number> }).dailyReviewLog;
  const weekBars: number[] = (() => {
    if (!rawLog) return Array(7).fill(0) as number[];
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today); d.setDate(d.getDate() - (6 - i));
      return rawLog[d.toISOString().slice(0, 10)] ?? 0;
    });
  })();
  const weekMax = Math.max(...weekBars, 1);
  const weekTotal = weekBars.reduce((a, b) => a + b, 0);
  const dayLetters = ["M", "T", "W", "T", "F", "S", "S"];
  const todayDow = (new Date().getDay() + 6) % 7;

  const headline = masteredCount === sheets.length
    ? "All sheets mastered. Keep practicing to stay sharp."
    : masteredCount === 0
    ? <>Let's get started. Begin with <strong>{target.shortTitle || target.title}</strong>.</>
    : <>{masteredCount} of {sheets.length} sheets at 80%+. Next: <strong>{target.shortTitle || target.title}</strong>.</>;

  return (
    <div class="today-row">
      <div class="today-card">
        <div class="today-eyebrow">{dateLabel}</div>
        <h1 class="today-headline">{headline}</h1>
        <p class="today-suggestion">
          Suggested: <strong>{nextMode.label}</strong>.
        </p>
        <div class="today-actions">
          <button
            class="btn btn-primary btn-large"
            onClick={() => navigate({ view: "sheet", sheetId: target.id, tab: nextMode.tab })}
          >
            ▶ Start now
          </button>
          <button
            class="btn btn-ghost"
            onClick={() => navigate({ view: "skills" })}
          >
            Browse sheets
          </button>
        </div>
      </div>

      <div class="today-stats">
        <div class="today-stats-card">
          <MasteryRing pct={overallPct} size={64} stroke={6} />
          <div>
            <div class="today-stats-label">OVERALL MASTERY</div>
            <div class="today-stats-value">{masteredCount} of {sheets.length} sheets ≥ 80%</div>
          </div>
        </div>
        <div class="today-stats-card today-stats-week">
          <div class="today-stats-label">THIS WEEK</div>
          <div class="today-week-bars">
            {weekBars.map((n, i) => {
              const dow = (todayDow - (6 - i) + 7) % 7;
              return (
                <div class="today-week-col" key={i}>
                  <div
                    class={`today-week-bar${i === 6 ? " is-today" : ""}`}
                    style={{ height: `${Math.max(3, Math.round(n / weekMax * 56))}px` }}
                  />
                  <div class="today-week-label">{dayLetters[dow]}</div>
                </div>
              );
            })}
          </div>
          <div class="today-stats-value">
            {weekTotal > 0 ? `${weekTotal} reviews this week` : `${state.stats.totalReviews} total reviews`}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── HomeView ─────────────────────────────────────────────────────────────────

export function HomeView() {
  return (
    <div>
      <TodayHero />
    </div>
  );
}
