/**
 * storage.js – tiny localStorage wrapper with a single root key.
 *
 * Schema (single key "nremt.state.v1"):
 *   {
 *     version: 1,
 *     srs: { [cardId]: { ease, interval, reps, due, lastGrade, lapses, lastReviewed } },
 *     notes: {
 *       step: { [cardId]: "text" },
 *       sheet: { [sheetId]: "text" }
 *     },
 *     stats: { totalReviews, lastReviewedAt }
 *   }
 */
(function (global) {
  const KEY = "nremt.state.v1";

  const empty = () => ({
    version: 1,
    srs: {},
    notes: { step: {}, sheet: {} },
    stats: { totalReviews: 0, lastReviewedAt: null },
    drills: { secorder: {}, stepseq: {}, whatnext: {}, blankrecall: {} },
  });

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return empty();
      const parsed = JSON.parse(raw);
      // Backfill missing branches in case of old shape.
      const fresh = empty();
      return {
        ...fresh,
        ...parsed,
        notes: { ...fresh.notes, ...(parsed.notes || {}) },
        stats: { ...fresh.stats, ...(parsed.stats || {}) },
        srs: parsed.srs || {},
        drills: {
          ...fresh.drills,
          ...(parsed.drills || {}),
          secorder:    (parsed.drills && parsed.drills.secorder)    ? { ...parsed.drills.secorder }    : {},
          stepseq:     (parsed.drills && parsed.drills.stepseq)     ? { ...parsed.drills.stepseq }     : {},
          whatnext:    (parsed.drills && parsed.drills.whatnext)    ? { ...parsed.drills.whatnext }    : {},
          blankrecall: (parsed.drills && parsed.drills.blankrecall) ? { ...parsed.drills.blankrecall } : {},
        },
      };
    } catch (err) {
      console.error("Failed to load state", err);
      return empty();
    }
  }

  function save(state) {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch (err) {
      console.error("Failed to save state", err);
    }
  }

  function reset() {
    localStorage.removeItem(KEY);
  }

  function exportToFile(state) {
    const blob = new Blob([JSON.stringify(state, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const stamp = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `nremt-progress-${stamp}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  async function importFromFile(file) {
    const text = await file.text();
    const parsed = JSON.parse(text);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Invalid file");
    const fresh = empty();
    return {
      ...fresh,
      ...parsed,
      notes: { ...fresh.notes, ...(parsed.notes || {}) },
      stats: { ...fresh.stats, ...(parsed.stats || {}) },
      srs: parsed.srs || {},
      drills: {
        ...fresh.drills,
        ...(parsed.drills || {}),
        secorder:    (parsed.drills && parsed.drills.secorder)    ? { ...parsed.drills.secorder }    : {},
        stepseq:     (parsed.drills && parsed.drills.stepseq)     ? { ...parsed.drills.stepseq }     : {},
        whatnext:    (parsed.drills && parsed.drills.whatnext)    ? { ...parsed.drills.whatnext }    : {},
        blankrecall: (parsed.drills && parsed.drills.blankrecall) ? { ...parsed.drills.blankrecall } : {},
      },
    };
  }

  global.Storage = { load, save, reset, exportToFile, importFromFile, KEY };
})(window);
