/**
 * srs.js – simplified SM-2 spaced repetition.
 *
 * Each card record:
 *   { ease, interval, reps, due, lastGrade, lapses, lastReviewed }
 *
 *   ease       – ease factor (default 2.5, floor 1.3)
 *   interval   – days until next review (real number; we round when scheduling)
 *   reps       – count of consecutive successful reviews (Hard/Good/Easy)
 *   due        – ms-epoch when this card is next due
 *   lastGrade  – "again" | "hard" | "good" | "easy"
 *   lapses     – count of "again" grades
 *
 * New cards have an interval of 0 and are due immediately.
 */
(function (global) {
  const DAY = 24 * 60 * 60 * 1000;

  const defaultRecord = () => ({
    ease: 2.5,
    interval: 0,
    reps: 0,
    due: 0, // due immediately
    lastGrade: null,
    lapses: 0,
    lastReviewed: null,
  });

  function getRecord(state, cardId) {
    return state.srs[cardId] || defaultRecord();
  }

  /** Grade names → numeric for SM-2 family. */
  const GRADES = {
    again: { q: 0 },
    hard:  { q: 3 },
    good:  { q: 4 },
    easy:  { q: 5 },
  };

  /**
   * Apply a grade to a card's record. Returns the new record + the scheduled
   * "due" timestamp so callers can display it.
   */
  function grade(record, gradeName, now = Date.now()) {
    const rec = { ...record };
    rec.lastGrade = gradeName;
    rec.lastReviewed = now;

    if (gradeName === "again") {
      rec.lapses += 1;
      rec.reps = 0;
      rec.interval = 0; // see again very soon (within session ideally)
      rec.ease = Math.max(1.3, rec.ease - 0.2);
      rec.due = now + 60 * 1000; // 1 minute – will show again in this session
      return rec;
    }

    // First successful review of a new card → 1 day
    // Second successful review → 6 days
    // Otherwise → interval *= ease (Good) or with multipliers for Hard/Easy
    if (rec.reps === 0) {
      rec.interval = 1;
    } else if (rec.reps === 1) {
      rec.interval = 6;
    } else {
      const mult = gradeName === "hard" ? 1.2 : gradeName === "easy" ? rec.ease * 1.3 : rec.ease;
      rec.interval = rec.interval * mult;
    }

    if (gradeName === "hard") rec.ease = Math.max(1.3, rec.ease - 0.15);
    if (gradeName === "easy") rec.ease = rec.ease + 0.15;

    // Cap interval so users don't see "due in 18 years" on Easy spam.
    if (rec.interval > 365 * 4) rec.interval = 365 * 4;

    rec.reps += 1;
    rec.due = now + rec.interval * DAY;
    return rec;
  }

  /** Build the queue of due cards for a sheet, freshest-due first. */
  function buildQueue(state, sheet, now = Date.now()) {
    const due = [];
    const fresh = [];
    for (const card of sheet.cards) {
      const rec = state.srs[card.id];
      if (!rec || rec.due <= 0) {
        fresh.push({ card, rec: rec || defaultRecord() });
      } else if (rec.due <= now) {
        due.push({ card, rec });
      }
    }
    // Earliest due first; new cards last so users always see what's overdue.
    due.sort((a, b) => a.rec.due - b.rec.due);
    return [...due, ...fresh];
  }

  /** Aggregate mastery 0..1 for a sheet (mean of normalised ease+reps). */
  function masteryFor(state, sheet) {
    if (!sheet.cards.length) return 0;
    let sum = 0;
    for (const card of sheet.cards) {
      const rec = state.srs[card.id];
      if (!rec || !rec.reps) continue;
      // 0 → unreviewed, 1 → "easy" several times with long interval.
      const intervalScore = Math.min(1, rec.interval / 30);
      const repScore = Math.min(1, rec.reps / 4);
      sum += (intervalScore * 0.6) + (repScore * 0.4);
    }
    return sum / sheet.cards.length;
  }

  /** Count cards due "now" for a sheet. New cards count as due. */
  function dueCount(state, sheet, now = Date.now()) {
    let n = 0;
    for (const card of sheet.cards) {
      const rec = state.srs[card.id];
      if (!rec || rec.due <= now) n += 1;
    }
    return n;
  }

  function describeDue(rec, now = Date.now()) {
    if (!rec || !rec.due) return "new";
    const diff = rec.due - now;
    if (diff <= 0) return "due now";
    const days = diff / DAY;
    if (days < 1) {
      const hours = Math.round(diff / (60 * 60 * 1000));
      return `due in ${hours}h`;
    }
    if (days < 30) return `due in ${Math.round(days)}d`;
    return `due in ${Math.round(days / 30)}mo`;
  }

  global.SRS = {
    GRADES,
    DAY,
    defaultRecord,
    getRecord,
    grade,
    buildQueue,
    masteryFor,
    dueCount,
    describeDue,
  };
})(window);
