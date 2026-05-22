// ─── Data shapes (from data.json / preprocess.py) ───────────────────────────

export interface Step {
  text: string;
  points: number;
  spokenScript?: string;
  substeps?: Step[];
  examinerNote?: string;
  note?: string;
  mnemonic?: string;
}

export interface Section {
  name: string;
  header: boolean;
  steps: Step[];
}

export interface Card {
  id: string;
  sheetId: string;
  section: string;
  sectionHeader: boolean;
  parent: string | null;
  stepIndex: number;
  subIndex: number | null;
  text: string;
  points: number;
}

export interface Sheet {
  id: string;
  title: string;
  shortTitle: string;
  category: string;
  totalPoints: number;
  timeLimit?: string;
  sections: Section[];
  criticalCriteria: string[];
  cards: Card[];
}

export interface NremtData {
  version?: number;
  totalCards: number;
  sheets: Sheet[];
}

// ─── App state (stored in localStorage "nremt.state.v1") ─────────────────────

export interface Stats {
  totalReviews: number;
  lastReviewedAt: string | null;
  dailyStreak: number;
  longestStreak: number;
  lastStreakDay: string | null;
}

export interface DrillRecord {
  streak: number;
  attempts: number;
  mastered: boolean;
}

export interface BlankRecallScore {
  matched: number;
  missed: number;
  total: number;
  pct: number;
}

export interface BlankRecallRecord {
  attempts: number;
  lastAttemptAt: string | null;
  lastScore: BlankRecallScore | null;
  bestPct: number;
}

export interface SpokenScriptScore {
  correct: number;
  total: number;
  pct: number;
}

export interface SpokenScriptRecord {
  streak: number;
  mastered: boolean;
  attempts: number;
  lastScore: SpokenScriptScore | null;
}

export interface MedCondQuizRecord {
  sessionCount: number;
  bestScore: number;
  lastScore: number;
  totalAttempts: number;
  totalCorrect: number;
}

export interface Drills {
  secorder: Record<string, DrillRecord>;
  stepseq: Record<string, Record<string, DrillRecord>>;
  whatnext: Record<string, DrillRecord>;
  blankrecall: Record<string, BlankRecallRecord>;
  spokenscript: Record<string, SpokenScriptRecord>;
  medcondquiz?: MedCondQuizRecord;
}

export interface Notes {
  step: Record<string, string>;
  sheet: Record<string, string>;
}

export interface MnemonicData {
  sections?: string;
  steps?: Record<string, string>;
}

export interface MnemonicLetter {
  letter: string;
  stand: string;
  detail: string;
}

export interface ClinicalMnemonic {
  id: string;
  acronym: string;
  title: string;
  category: string;
  note: string | null;
  letters: MnemonicLetter[];
  sources?: string[];
}

export interface MedicalCondition {
  id: string;
  name: string;
  category: string;
  compareGroup: string;
  onset: string;
  keyDifferentiator: string;
  signs: string[];
  distinguishing: string[];
  criticalFindings: string[];
  treatment: string[];
  compareDimensions: Record<string, string>;
}

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
  ts: string;
}

export interface Chat {
  id: string;
  title: string;
  mode: "chat" | "examiner";
  sheetId: string | null;
  messages: ChatMessage[];
}

export interface SRSRecord {
  ease: number;
  interval: number;
  reps: number;
  due: number;
  lastGrade: string | null;
  lapses: number;
  lastReviewed: string | null;
}

export interface AppState {
  version: 1;
  srs: Record<string, SRSRecord>;
  notes: Notes;
  stats: Stats;
  drills: Drills;
  achievements: Record<string, number>;
  mnemonics: Record<string, MnemonicData>;
  chats: Record<string, Chat>;
  emsSrs: Record<string, SRSRecord>;
  medcondSrs: Record<string, SRSRecord>;
  updatedAt?: string;
  lastSyncedAt?: string;
}

// ─── Routing ──────────────────────────────────────────────────────────────────

export type RouteView =
  | "home"
  | "sheet"
  | "stats"
  | "settings"
  | "guide"
  | "examday"
  | "sources"
  | "chat"
  | "mnemonics"
  | "medconditions"
  | "notFound";

export type SheetTab =
  | "sheet"
  | "notes"
  | "order"
  | "steps"
  | "whatnext"
  | "recall"
  | "script"
  | "mnemonics"
  | "chat";

export interface Route {
  view: RouteView;
  sheetId?: string;
  tab?: SheetTab;
  chatId?: string;
  mnemonicsTab?: string;
  mnemonicsCardId?: string;
  medcondTab?: string;
}
