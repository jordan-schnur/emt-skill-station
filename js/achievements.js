/**
 * achievements.js – achievement definitions and unlock tracking.
 *
 * window.Achievements = { check(state) -> newlyUnlocked[], getAll(state) -> all[] }
 * Unlocked achievements stored in state.achievements = { [id]: timestampMs }
 */
(function (global) {
  const DEFS = [
    {
      id: "first_review",
      name: "First Responder",
      desc: "Complete your first card review",
      icon: "🚑",
      check: (s) => s.stats.totalReviews >= 1,
    },
    {
      id: "ten_reviews",
      name: "Getting Started",
      desc: "Complete 10 card reviews",
      icon: "📚",
      check: (s) => s.stats.totalReviews >= 10,
    },
    {
      id: "fifty_reviews",
      name: "Building Momentum",
      desc: "Complete 50 card reviews",
      icon: "⚡",
      check: (s) => s.stats.totalReviews >= 50,
    },
    {
      id: "hundred_reviews",
      name: "Dedicated Student",
      desc: "Complete 100 card reviews",
      icon: "🎯",
      check: (s) => s.stats.totalReviews >= 100,
    },
    {
      id: "five_hundred_reviews",
      name: "Study Machine",
      desc: "Complete 500 card reviews — you mean business",
      icon: "🔥",
      check: (s) => s.stats.totalReviews >= 500,
    },
    {
      id: "first_card_deep",
      name: "Locked In",
      desc: "Get any card to a 7+ day review interval",
      icon: "🧠",
      check: (s) => Object.values(s.srs).some((r) => r.interval >= 7),
    },
    {
      id: "all_cards_seen",
      name: "Full Survey",
      desc: "Study every card at least once",
      icon: "📋",
      check: (s) => {
        const data = global.NREMT_DATA;
        if (!data || !data.sheets.length) return false;
        for (const sheet of data.sheets) {
          for (const card of sheet.cards) {
            const r = s.srs[card.id];
            if (!r || !r.reps) return false;
          }
        }
        return true;
      },
    },
    {
      id: "first_drill_mastered",
      name: "Drill Sergeant",
      desc: "Master any drill on any sheet",
      icon: "🎖️",
      check: (s) => {
        for (const type of ["secorder", "stepseq", "whatnext", "spokenscript"]) {
          for (const rec of Object.values(s.drills[type] || {})) {
            if (rec.mastered) return true;
          }
        }
        return false;
      },
    },
    {
      id: "good_recall",
      name: "Memory Champion",
      desc: "Score 80%+ on blank recall for any sheet",
      icon: "🏆",
      check: (s) => {
        for (const rec of Object.values(s.drills.blankrecall || {})) {
          if ((rec.bestPct || 0) >= 80) return true;
        }
        return false;
      },
    },
    {
      id: "perfect_recall",
      name: "Total Recall",
      desc: "Score 100% on blank recall for any sheet",
      icon: "💯",
      check: (s) => {
        for (const rec of Object.values(s.drills.blankrecall || {})) {
          if (rec.bestPct === 100) return true;
        }
        return false;
      },
    },
    {
      id: "spoken_script_pass",
      name: "Verbal Fluency",
      desc: "Pass the spoken script drill (80%+) on any sheet",
      icon: "🎤",
      check: (s) => {
        for (const rec of Object.values(s.drills.spokenscript || {})) {
          if ((rec.lastScore || 0) >= 0.8) return true;
        }
        return false;
      },
    },
    {
      id: "streak_3",
      name: "Consistent",
      desc: "Use the app 3 days in a row",
      icon: "📅",
      check: (s) => (s.stats.longestStreak || 0) >= 3,
    },
    {
      id: "streak_7",
      name: "Week Warrior",
      desc: "Use the app 7 days in a row",
      icon: "🗓️",
      check: (s) => (s.stats.longestStreak || 0) >= 7,
    },
    {
      id: "all_drills_one_sheet",
      name: "Complete Package",
      desc: "Master all 5 drill types on a single sheet",
      icon: "🏅",
      check: (s) => {
        const data = global.NREMT_DATA;
        if (!data) return false;
        const streakTypes = ["secorder", "stepseq", "whatnext", "spokenscript"];
        for (const sheet of data.sheets) {
          const allStreakMastered = streakTypes.every((t) => {
            const rec = (s.drills[t] || {})[sheet.id];
            return rec && rec.mastered;
          });
          const recallRec = (s.drills.blankrecall || {})[sheet.id];
          if (allStreakMastered && recallRec && (recallRec.bestPct || 0) >= 80) return true;
        }
        return false;
      },
    },
    {
      id: "thousand_reviews",
      name: "On the Clock",
      desc: "Complete 1,000 card reviews",
      icon: "⏱️",
      check: (s) => s.stats.totalReviews >= 1000,
    },
    {
      id: "all_sheets_started",
      name: "Survey Complete",
      desc: "Study at least one card on every skill sheet",
      icon: "🗺️",
      check: (s) => {
        const data = global.NREMT_DATA;
        if (!data || !data.sheets.length) return false;
        for (const sheet of data.sheets) {
          const hasAny = sheet.cards.some((c) => {
            const r = s.srs[c.id];
            return r && r.reps >= 1;
          });
          if (!hasAny) return false;
        }
        return true;
      },
    },
    {
      id: "streak_14",
      name: "Two-Week Grind",
      desc: "Use the app 14 days in a row",
      icon: "📆",
      check: (s) => (s.stats.longestStreak || 0) >= 14,
    },
    {
      id: "med_quiz_first",
      name: "First Diagnosis",
      desc: "Complete your first Medical Conditions quiz session",
      icon: "🩺",
      check: (s) => ((s.drills || {}).medcondquiz || {}).sessionCount >= 1,
    },
    {
      id: "med_quiz_pass",
      name: "Clinical Eye",
      desc: "Score 70%+ on the Medical Conditions quiz",
      icon: "🔬",
      check: (s) => ((s.drills || {}).medcondquiz || {}).bestScore >= 0.7,
    },
    {
      id: "med_quiz_ace",
      name: "Sharp Clinician",
      desc: "Score 90%+ on the Medical Conditions quiz",
      icon: "🏥",
      check: (s) => ((s.drills || {}).medcondquiz || {}).bestScore >= 0.9,
    },
  ];

  function check(state) {
    if (!state.achievements) state.achievements = {};
    const now = Date.now();
    const newlyUnlocked = [];
    for (const def of DEFS) {
      if (state.achievements[def.id]) continue;
      try {
        if (def.check(state)) {
          state.achievements[def.id] = now;
          newlyUnlocked.push(def);
        }
      } catch (_) {
        // silently skip broken checks
      }
    }
    return newlyUnlocked;
  }

  function getAll(state) {
    if (!state.achievements) state.achievements = {};
    return DEFS.map((def) => ({
      id: def.id,
      name: def.name,
      desc: def.desc,
      icon: def.icon,
      unlockedAt: state.achievements[def.id] || null,
    }));
  }

  global.Achievements = { check, getAll, DEFS };
})(window);
