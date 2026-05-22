import type { CriticalRecord, CriticalGrade } from "../types";

export const REINSERT_FAIL = 2;
export const REINSERT_CLOSE = 5;
export const SESSION_DAY_MS = 86_400_000;

export function isDue(record: CriticalRecord): boolean {
  if (record.grade === null) return true;
  return Date.now() - record.lastSeenAt >= SESSION_DAY_MS;
}

export function buildQueue(
  criteriaIds: string[],
  records: Record<string, CriticalRecord>
): string[] {
  return criteriaIds.filter(id => {
    const r = records[id];
    return !r || isDue(r);
  });
}

export function gradeCard(
  record: CriticalRecord | undefined,
  grade: Exclude<CriticalGrade, null>
): CriticalRecord {
  const prev = record ?? { grade: null, lastSeenAt: 0, streakKnown: 0, attempts: 0 };
  return {
    grade,
    lastSeenAt: Date.now(),
    streakKnown: grade === 'know' ? prev.streakKnown + 1 : 0,
    attempts: prev.attempts + 1,
  };
}

export function reinsertCard(
  queue: string[],
  cardId: string,
  grade: 'fail' | 'close',
  currentIndex: number
): string[] {
  const offset = grade === 'fail' ? REINSERT_FAIL : REINSERT_CLOSE;
  const result = [...queue];
  result.splice(Math.min(currentIndex + offset, result.length), 0, cardId);
  return result;
}
