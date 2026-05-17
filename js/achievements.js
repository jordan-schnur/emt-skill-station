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
      id: "sheet_mastery_75",
      name: "Sheet Expert",
      desc: "Get any skill sheet to 75%+ mastery",
      icon: "⭐",
      check: (s) => {
        const data = global.NREMT_DATA;
        const SRS = global.SRS;
        if (!data || !SRS) return false;
        for (const sheet of data.sheets) {
          if (SRS.masteryFor(s, sheet) >= 0.75) return true;
        }
        return false;
      },
    },
    {
      id: "halfway_overall",
      name: "Halfway There",
      desc: "Reach 50%+ average mastery across all sheets",
      icon: "🌟",
      check: (s) => {
        const data = global.NREMT_DATA;
        const SRS = global.SRS;
        if (!data || !SRS || !data.sheets.length) return false;
        let sum = 0;
        for (const sheet of data.sheets) sum += SRS.masteryFor(s, sheet);
        return sum / data.sheets.length >= 0.5;
      },
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
