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

export interface CriticalCriterion {
  text: string;
  pearl: string | null;
}

export interface Sheet {
  id: string;
  title: string;
  shortTitle: string;
  category: string;
  totalPoints: number;
  timeLimit?: string;
  sections: Section[];
  criticalCriteria: CriticalCriterion[];
  cards: Card[];
  videos?: Video[];
  sheetType?: "station-guide";
}

export interface NremtData {
  version?: number;
  totalCards: number;
  sheets: Sheet[];
}

export interface Video {
  videoId: string;
  title: string;
  channel: string;
  duration?: string;
  url: string;
  note?: string;
}

// ─── App state (stored in localStorage "nremt.state.v1") ─────────────────────

export interface Stats {
  totalReviews: number;
  lastReviewedAt: string | null;
  dailyStreak: number;
  longestStreak: number;
  lastStreakDay: string | null;
  dailyReviewLog?: Record<string, number>;
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

export type CriticalGrade = 'fail' | 'close' | 'know' | null;

export interface CriticalRecord {
  grade: CriticalGrade;
  lastSeenAt: number;
  streakKnown: number;
  attempts: number;
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
  critical: Record<string, Record<string, CriticalRecord>>;
  medcondquiz?: MedCondQuizRecord;
  blsmedsquiz?: BlsMedsQuizRecord;
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
  compareWith?: string[];
}

export interface BLSMedDose {
  adult: string;
  pediatric?: string;
  notes?: string;
}

export interface BLSFollowUp {
  question: string;
  type: "dose" | "route" | "contraindication-check" | "reassessment";
  answer: string;
  options: string[]; // always 4 choices
}

export interface BLSScenario {
  id: string;
  vignette: string;
  prompt: string;
  format: "give-withhold" | "pick-drug";
  answer: string; // "give" | "withhold" | medId
  explanation: string;
  followUps: BLSFollowUp[];
}

export interface BLSMedication {
  id: string;
  name: string;
  genericName?: string;
  brandName?: string;
  category: string;
  mechanism: string;
  indications: string[];
  contraindications: string[];
  dose: BLSMedDose;
  route: string[];
  onset: string;
  duration?: string;
  sideEffects: string[];
  clinicalPearls: string[];
  scenarios: BLSScenario[];
}

export interface BlsMedsQuizRecord {
  scenariosCompleted: number;
  lastSessionAt: string | null;
}

export interface MedicationDosage {
  id: string;
  name: string;
  section: string;
  adultDose: string;
  route: string;
  indication: string;
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

// ─── Examiner session types ───────────────────────────────────────────────────

export interface VitalsRevealed {
  hr: boolean;
  bp: boolean;
  rr: boolean;
  spo2: boolean;
  gcs: boolean;
}

export interface Big5Item {
  id: "scene_safety" | "bsi" | "patients" | "moi" | "resources";
  what: string;
  quote: string;
  done: boolean;
}

export interface CritItem {
  idx: number;
  body: string;
  violated: boolean;
}

export interface ExaminerMessage {
  id: string;
  role: "user" | "examiner" | "system";
  text: string;
  ts: string;
}

export interface GeneratedScenario {
  dispatch: string;
  patient: {
    age: number;
    sex: "M" | "F";
    chiefComplaint: string;
    history: string;
  };
  vitals: {
    hr: string;
    bp: string;
    rr: string;
    spo2: string;
    gcs: string;
  };
  timeLimitSec: number;
}

export interface ExaminerSession {
  id: string;
  sheetId: string;
  createdAt: string;
  status: "pre" | "active" | "debrief";
  scenario: GeneratedScenario | null;
  messages: ExaminerMessage[];
  debriefMessages: ExaminerMessage[];
  big5: Big5Item[];
  crits: CritItem[];
  vitalsRevealed: VitalsRevealed;
  startedAt: number | null;
  endedAt: number | null;
}

export interface AppState {
  version: 2;
  srs: Record<string, SRSRecord>;
  notes: Notes;
  stats: Stats;
  drills: Drills;
  achievements: Record<string, number>;
  mnemonics: Record<string, MnemonicData>;
  examinerSessions: Record<string, ExaminerSession>;
  chats: Record<string, Chat>;
  emsSrs: Record<string, SRSRecord>;
  medcondSrs: Record<string, SRSRecord>;
  blsMedsSrs: Record<string, SRSRecord>;
  updatedAt?: string;
  lastSyncedAt?: string;
}

// ─── Routing ──────────────────────────────────────────────────────────────────

export type RouteView =
  | "home"
  | "sheet"
  | "settings"
  | "examday"
  | "sources"
  | "chat"
  | "reference"
  | "mnemonics"
  | "medconditions"
  | "blsmeds"
  | "skills"
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
  | "chat"
  | "critical"
  | "drill";

export interface Route {
  view: RouteView;
  sheetId?: string;
  tab?: SheetTab;
  chatId?: string;
  mnemonicsTab?: string;
  mnemonicsCardId?: string;
  medcondTab?: string;
  blsmedsTab?: string;
  referenceTab?: "conditions" | "mnemonics" | "meds";
  referenceCardId?: string;
}
