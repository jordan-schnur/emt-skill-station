import { appState, navigate } from "../store/appStore";
import { NREMT_DATA } from "../data/sheets";
import { suggestNextMode, computeTodayContext, reviewsThisWeek } from "../lib/todayContext";

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

  const ctx = computeTodayContext(state, sheets);
  const target = ctx.lowestMasterySheet;
  const nextMode = suggestNextMode(state, target);
  const weekBars = reviewsThisWeek(state.stats.dailyReviewLog);

  const overallPct = ctx.overallMasteryPct;
  const masteredCount = ctx.sheetsAbove80;

  const dateLabel = new Date().toLocaleDateString("en-US", {
    weekday: "long", month: "short", day: "numeric",
  }).toUpperCase();
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
