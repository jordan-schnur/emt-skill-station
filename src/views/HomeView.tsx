import { appState, navigate } from "../store/appStore";
import { NREMT_DATA } from "../data/sheets";
import { computeTodayContext } from "../lib/todayContext";
import { recommendNext } from "../lib/recommendNext";
import { reviewsLast14Days } from "../lib/activity";
import { ActivityStrip } from "../components/ActivityStrip";

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

function TodayHero() {
  const state = appState.value;
  const sheets = NREMT_DATA.sheets;

  const ctx = computeTodayContext(state, sheets);
  const rec = recommendNext(state, sheets);
  const bars14 = reviewsLast14Days(state.stats.dailyReviewLog);
  const total14 = bars14.reduce((a, b) => a + b, 0);

  const overallPct = ctx.overallMasteryPct;
  const masteredCount = ctx.sheetsAbove80;

  const dateLabel = new Date().toLocaleDateString("en-US", {
    weekday: "long", month: "short", day: "numeric",
  }).toUpperCase();

  const headline = masteredCount === sheets.length
    ? "All sheets mastered. Keep practicing to stay sharp."
    : masteredCount === 0
    ? <>Let's get started. Begin with <strong>{rec.sheet.shortTitle || rec.sheet.title}</strong>.</>
    : <>{masteredCount} of {sheets.length} sheets at 80%+. Next: <strong>{rec.sheet.shortTitle || rec.sheet.title}</strong>.</>;

  return (
    <div class="today-row">
      <div class="today-card">
        <div class="today-eyebrow">{dateLabel}</div>
        <h1 class="today-headline">{headline}</h1>
        <p class="today-suggestion">{rec.justification}</p>
        <div class="today-actions">
          <button
            class="btn btn-primary btn-large"
            onClick={() => navigate({ view: "sheet", sheetId: rec.sheet.id, tab: rec.tab })}
          >
            ▶ Start {rec.label}
          </button>
          <button
            class="btn btn-ghost"
            onClick={() => navigate({ view: "skills" })}
          >
            Browse sheets
          </button>
        </div>
        <div class="today-meta">About {rec.durationMin} minutes.</div>
        {ctx.criticalAlertSheets.length > 0 && (
          <div class="today-critical">
            ⚠ {ctx.criticalAlertSheets.length} sheet{ctx.criticalAlertSheets.length > 1 ? "s" : ""} have critical criteria not yet mastered.
            <button
              class="btn btn-ghost btn-sm"
              onClick={() => navigate({ view: "sheet", sheetId: ctx.criticalAlertSheets[0].id, tab: "critical" })}
            >
              Drill now
            </button>
          </div>
        )}
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
          <div class="today-stats-label">LAST 14 DAYS</div>
          <ActivityStrip log={state.stats.dailyReviewLog} />
          <div class="today-stats-value">
            {total14 > 0 ? `${total14} reviews in the last 14 days` : `${state.stats.totalReviews} total reviews`}
          </div>
        </div>
      </div>
    </div>
  );
}

export function HomeView() {
  return (
    <div>
      <TodayHero />
    </div>
  );
}
