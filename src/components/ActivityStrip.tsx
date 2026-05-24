import { reviewsLast14Days } from "../lib/activity";

interface Props {
  log: Record<string, number> | undefined;
}

export function ActivityStrip({ log }: Props) {
  const bars = reviewsLast14Days(log);
  const maxVal = Math.max(...bars, 1);
  const todayDow = (new Date().getDay() + 6) % 7;
  const dayLetters = ["M", "T", "W", "T", "F", "S", "S"];

  return (
    <div class="today-week-bars">
      {bars.map((n, i) => {
        const daysAgo = 13 - i;
        const dow = (todayDow - daysAgo % 7 + 7) % 7;
        const isToday = i === 13;
        return (
          <div class="today-week-col" key={i}>
            <div
              class={`today-week-bar${isToday ? " is-today" : ""}`}
              style={{ height: `${Math.max(3, Math.round(n / maxVal * 56))}px` }}
            />
            <div class="today-week-label">{isToday ? dayLetters[todayDow] : dayLetters[dow]}</div>
          </div>
        );
      })}
    </div>
  );
}
