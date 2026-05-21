import type { AppState, Sheet } from "../types";
import { NREMT_DATA } from "../data/sheets";

interface AchievementDef {
  id: string;
  name: string;
  desc: string;
  icon: string;
  check: (s: AppState) => boolean;
}

export interface Achievement {
  id: string;
  name: string;
  desc: string;
  icon: string;
  unlockedAt: number | null;
}

function sheetFullyMastered(s: AppState, sheet: Sheet): boolean {
  const orderRec = (s.drills.secorder || {})[sheet.id];
  const orderOk = !orderRec || orderRec.mastered;

  const stepseqSheetRec = (s.drills.stepseq || {})[sheet.id] || {};
  const drillableSections = sheet.sections
    ? sheet.sections.filter((sec) => sec.steps && sec.steps.length >= 2)
    : [];
  const stepseqOk =
    drillableSections.length === 0 ||
    drillableSections.every(
      (sec) => stepseqSheetRec[sec.name] && stepseqSheetRec[sec.name].mastered,
    );

  const whatnextRec = (s.drills.whatnext || {})[sheet.id];
  const whatnextOk = whatnextRec && whatnextRec.mastered;

  const recallRec = (s.drills.blankrecall || {})[sheet.id];
  const recallOk = recallRec && (recallRec.bestPct || 0) >= 80;

  const spokenRec = (s.drills.spokenscript || {})[sheet.id];
  const spokenOk = spokenRec && spokenRec.mastered;

  return orderOk && stepseqOk && whatnextOk && recallOk && spokenOk;
}

const DEFS: AchievementDef[] = [
  { id: "first_review",        name: "First Responder",    desc: "Submit your first drill attempt",                   icon: "🚑", check: (s) => (s.stats.totalReviews || 0) >= 1 },
  { id: "ten_reviews",         name: "Getting Started",    desc: "Submit 10 drill attempts",                          icon: "📚", check: (s) => (s.stats.totalReviews || 0) >= 10 },
  { id: "fifty_reviews",       name: "Building Momentum",  desc: "Submit 50 drill attempts",                          icon: "⚡", check: (s) => (s.stats.totalReviews || 0) >= 50 },
  { id: "hundred_reviews",     name: "Dedicated Student",  desc: "Submit 100 drill attempts",                         icon: "🎯", check: (s) => (s.stats.totalReviews || 0) >= 100 },
  { id: "five_hundred_reviews",name: "Study Machine",      desc: "Submit 500 drill attempts — you mean business",     icon: "🔥", check: (s) => (s.stats.totalReviews || 0) >= 500 },
  { id: "first_note",          name: "Note Taker",         desc: "Write your first step note",                        icon: "📝", check: (s) => Object.keys((s.notes?.step) || {}).length >= 1 },
  { id: "ten_notes",           name: "Detailed Notes",     desc: "Write 10 step notes",                               icon: "📓", check: (s) => Object.keys((s.notes?.step) || {}).length >= 10 },
  {
    id: "first_drill_mastered", name: "Drill Sergeant", desc: "Master any drill on any sheet", icon: "🎖️",
    check: (s) => {
      for (const type of ["secorder", "stepseq", "whatnext", "spokenscript"] as const) {
        for (const rec of Object.values(s.drills[type] || {})) {
          if ((rec as { mastered?: boolean }).mastered) return true;
          if (typeof rec === "object" && !Array.isArray(rec)) {
            for (const inner of Object.values(rec as Record<string, { mastered?: boolean }>)) {
              if (inner && inner.mastered) return true;
            }
          }
        }
      }
      return false;
    },
  },
  { id: "order_mastered_first",  name: "In Order",       desc: "Master section order on any sheet",              icon: "🔢", check: (s) => Object.values(s.drills.secorder || {}).some((r) => r.mastered) },
  {
    id: "stepseq_mastered_first", name: "Step by Step", desc: "Master step sequence in any section", icon: "👣",
    check: (s) => {
      for (const sheetRec of Object.values(s.drills.stepseq || {})) {
        for (const secRec of Object.values(sheetRec || {})) {
          if (secRec && secRec.mastered) return true;
        }
      }
      return false;
    },
  },
  { id: "whatnext_mastered_first", name: "What Comes Next",   desc: "Master the What's Next? drill on any sheet",                  icon: "➡️",  check: (s) => Object.values(s.drills.whatnext || {}).some((r) => r.mastered) },
  { id: "first_recall_attempt",    name: "From Memory",       desc: "Complete your first blank recall attempt",                     icon: "🧠",  check: (s) => Object.values(s.drills.blankrecall || {}).some((r) => (r.attempts || 0) >= 1) },
  { id: "good_recall",             name: "Memory Champion",   desc: "Score 80%+ on blank recall for any sheet",                     icon: "🏆",  check: (s) => Object.values(s.drills.blankrecall || {}).some((r) => (r.bestPct || 0) >= 80) },
  { id: "perfect_recall",          name: "Total Recall",      desc: "Score 100% on blank recall for any sheet",                     icon: "💯",  check: (s) => Object.values(s.drills.blankrecall || {}).some((r) => r.bestPct === 100) },
  { id: "recall_three_sheets",     name: "Recall Ace",        desc: "Score 80%+ on blank recall for 3 different sheets",            icon: "🃏",  check: (s) => Object.values(s.drills.blankrecall || {}).filter((r) => (r.bestPct || 0) >= 80).length >= 3 },
  {
    id: "spoken_script_pass", name: "Verbal Fluency", desc: "Pass the spoken script drill (80%+) on any sheet", icon: "🎤",
    check: (s) => {
      for (const rec of Object.values(s.drills.spokenscript || {})) {
        const score = rec.lastScore;
        if (score && score.pct >= 80) return true;
      }
      return false;
    },
  },
  { id: "spoken_script_mastered", name: "Script Master",     desc: "Master the spoken script drill (3 passing runs) on any sheet",  icon: "📢",  check: (s) => Object.values(s.drills.spokenscript || {}).some((r) => r.mastered) },
  { id: "streak_3",               name: "Consistent",        desc: "Use the app 3 days in a row",                                   icon: "📅",  check: (s) => (s.stats.longestStreak || 0) >= 3 },
  { id: "streak_7",               name: "Week Warrior",      desc: "Use the app 7 days in a row",                                   icon: "🗓️", check: (s) => (s.stats.longestStreak || 0) >= 7 },
  { id: "streak_30",              name: "Monthly Scholar",   desc: "Use the app 30 days in a row",                                  icon: "🌟",  check: (s) => (s.stats.longestStreak || 0) >= 30 },
  {
    id: "all_drills_one_sheet", name: "Complete Package", desc: "Master all 5 drill types on a single sheet", icon: "🏅",
    check: (s) => NREMT_DATA.sheets.some((sheet) => sheetFullyMastered(s, sheet)),
  },
  {
    id: "all_drills_three_sheets", name: "Triple Threat", desc: "Master all 5 drill types on 3 different sheets", icon: "🥇",
    check: (s) => NREMT_DATA.sheets.filter((sheet) => sheetFullyMastered(s, sheet)).length >= 3,
  },
  { id: "thousand_reviews",   name: "On the Clock",      desc: "Complete 1,000 card reviews",                        icon: "⏱️", check: (s) => s.stats.totalReviews >= 1000 },
  {
    id: "all_sheets_started", name: "Survey Complete", desc: "Study at least one card on every skill sheet", icon: "🗺️",
    check: (s) => {
      if (!NREMT_DATA.sheets.length) return false;
      for (const sheet of NREMT_DATA.sheets) {
        const hasAny = sheet.cards.some((c) => { const r = s.srs[c.id]; return r && r.reps >= 1; });
        if (!hasAny) return false;
      }
      return true;
    },
  },
  { id: "streak_14",     name: "Two-Week Grind",   desc: "Use the app 14 days in a row",                      icon: "📆", check: (s) => (s.stats.longestStreak || 0) >= 14 },
  { id: "med_quiz_first", name: "First Diagnosis", desc: "Complete your first Medical Conditions quiz session", icon: "🩺", check: (s) => ((s.drills as unknown as Record<string, Record<string, number>>)["medcondquiz"] || {})["sessionCount"] >= 1 },
  { id: "med_quiz_pass",  name: "Clinical Eye",    desc: "Score 70%+ on the Medical Conditions quiz",          icon: "🔬", check: (s) => ((s.drills as unknown as Record<string, Record<string, number>>)["medcondquiz"] || {})["bestScore"] >= 0.7 },
  { id: "med_quiz_ace",   name: "Sharp Clinician", desc: "Score 90%+ on the Medical Conditions quiz",          icon: "🏥", check: (s) => ((s.drills as unknown as Record<string, Record<string, number>>)["medcondquiz"] || {})["bestScore"] >= 0.9 },
];

export function check(state: AppState): AchievementDef[] {
  if (!state.achievements) state.achievements = {};
  const now = Date.now();
  const newlyUnlocked: AchievementDef[] = [];
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

export function getAll(state: AppState): Achievement[] {
  if (!state.achievements) state.achievements = {};
  return DEFS.map((def) => ({
    id: def.id,
    name: def.name,
    desc: def.desc,
    icon: def.icon,
    unlockedAt: state.achievements[def.id] || null,
  }));
}

export const Achievements = { check, getAll, DEFS };
