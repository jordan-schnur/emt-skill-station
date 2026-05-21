import type { SRSRecord } from "../types";

const DAY = 24 * 60 * 60 * 1000;

export function defaultRecord(): SRSRecord {
  return { ease: 2.5, interval: 0, reps: 0, due: 0, lastGrade: null, lapses: 0, lastReviewed: null };
}

export function grade(record: SRSRecord, gradeName: "again" | "hard" | "good" | "easy", now = Date.now()): SRSRecord {
  const rec = { ...record };
  rec.lastGrade = gradeName;
  rec.lastReviewed = String(now);
  if (gradeName === "again") {
    rec.lapses += 1; rec.reps = 0; rec.interval = 0;
    rec.ease = Math.max(1.3, rec.ease - 0.2);
    rec.due = now + 60_000;
    return rec;
  }
  if (rec.reps === 0)      rec.interval = 1;
  else if (rec.reps === 1) rec.interval = 6;
  else {
    const mult = gradeName === "hard" ? 1.2 : gradeName === "easy" ? rec.ease * 1.3 : rec.ease;
    rec.interval = rec.interval * mult;
  }
  if (gradeName === "hard") rec.ease = Math.max(1.3, rec.ease - 0.15);
  if (gradeName === "easy") rec.ease = rec.ease + 0.15;
  if (rec.interval > 365 * 4) rec.interval = 365 * 4;
  rec.reps += 1;
  rec.due = now + rec.interval * DAY;
  return rec;
}

export function describeDue(rec: SRSRecord | undefined, now = Date.now()): string {
  if (!rec || !rec.due) return "new";
  const diff = rec.due - now;
  if (diff <= 0) return "due now";
  const days = diff / DAY;
  if (days < 1) return `due in ${Math.round(diff / (60 * 60 * 1000))}h`;
  if (days < 30) return `due in ${Math.round(days)}d`;
  return `due in ${Math.round(days / 30)}mo`;
}
