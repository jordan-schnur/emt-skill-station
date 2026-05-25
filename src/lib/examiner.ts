import type { AppState, Big5Item, CritItem, ExaminerMessage, ExaminerSession, GeneratedScenario, Sheet, VitalsRevealed } from "../types";
import type { AIConfig } from "./chat";

// ─── Seed data ────────────────────────────────────────────────────────────────

export const SHEET_SEEDS: Record<string, { timeLimit: string; chiefComplaintHints: string; typicalVitalsNote: string }> = {
  e201: {
    timeLimit: "10 minutes",
    chiefComplaintHints: "trauma mechanisms: MVC, fall from height, industrial accident, assault, sports injury, penetrating trauma",
    typicalVitalsNote: "vitals may show tachycardia, hypotension, or tachypnea depending on injury severity",
  },
  e202: {
    timeLimit: "15 minutes",
    chiefComplaintHints: "medical emergencies: chest pain, shortness of breath, abdominal pain, altered mental status, syncope, weakness, allergic reaction",
    typicalVitalsNote: "vitals should reflect the chosen chief complaint (e.g., tachycardia + hypotension for shock, SpO2 drop for respiratory)",
  },
  e203: {
    timeLimit: "untimed",
    chiefComplaintHints: "unresponsive adult requiring BVM ventilation — apneic or agonal breathing",
    typicalVitalsNote: "no spontaneous respiratory rate; HR may be present or absent; SpO2 low",
  },
  e204: {
    timeLimit: "untimed",
    chiefComplaintHints: "respiratory distress requiring high-flow oxygen via non-rebreather mask",
    typicalVitalsNote: "SpO2 below 94%, tachypnea (RR 20-28), may have tachycardia",
  },
  e211: {
    timeLimit: "untimed",
    chiefComplaintHints: "trauma patient found seated (e.g., in vehicle) with possible spinal injury",
    typicalVitalsNote: "vitals stable or mildly abnormal; GCS 14-15; patient ambulatory or seated",
  },
  e212: {
    timeLimit: "untimed",
    chiefComplaintHints: "trauma patient found supine with possible spinal injury",
    typicalVitalsNote: "vitals may show neurogenic shock (bradycardia + hypotension) or be stable",
  },
  e213: {
    timeLimit: "untimed",
    chiefComplaintHints: "significant bleeding and/or signs of shock from trauma",
    typicalVitalsNote: "tachycardia, hypotension, tachypnea, pale/cool/diaphoretic skin",
  },
  e215: {
    timeLimit: "untimed",
    chiefComplaintHints: "cardiac arrest — unresponsive, apneic, pulseless",
    typicalVitalsNote: "no spontaneous HR, BP, RR, or SpO2 reading; GCS 3",
  },
  e216: {
    timeLimit: "untimed",
    chiefComplaintHints: "isolated extremity injury requiring joint immobilization (ankle, wrist, knee, shoulder)",
    typicalVitalsNote: "vitals normal; pain score 4-8/10; neurovascular status varies",
  },
  e217: {
    timeLimit: "untimed",
    chiefComplaintHints: "long bone fracture requiring splinting (femur, tibia, fibula, humerus, radius/ulna)",
    typicalVitalsNote: "vitals normal to mildly abnormal; pain score 5-9/10",
  },
};

// ─── Big 5 constant ───────────────────────────────────────────────────────────

export const BIG5_ITEMS: Omit<Big5Item, "done">[] = [
  { id: "scene_safety", what: "Scene safety", quote: "Is the scene safe to enter?" },
  { id: "bsi",          what: "BSI precautions", quote: "I am taking BSI precautions." },
  { id: "patients",     what: "Number of patients", quote: "I see one patient." },
  { id: "moi",          what: "MOI / NOI", quote: "Mechanism of injury is…" },
  { id: "resources",    what: "Additional resources", quote: "Do I need additional resources?" },
];

// ─── Session factory ──────────────────────────────────────────────────────────

export function createSession(sheetId: string, crits: string[]): ExaminerSession {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    sheetId,
    createdAt: new Date().toISOString(),
    status: "pre",
    scenario: null,
    messages: [],
    big5: BIG5_ITEMS.map(b => ({ ...b, done: false })),
    crits: crits.map((body, idx) => ({ idx, body, violated: false })),
    vitalsRevealed: { hr: false, bp: false, rr: false, spo2: false, gcs: false },
    startedAt: null,
    endedAt: null,
  };
}

// ─── Prompt builders ──────────────────────────────────────────────────────────

export function buildScenarioPrompt(sheet: Sheet): { system: string; user: string } {
  const seed = SHEET_SEEDS[sheet.id] ?? {
    timeLimit: sheet.timeLimit ?? "untimed",
    chiefComplaintHints: "appropriate emergency for this skill station",
    typicalVitalsNote: "vitals appropriate to the chief complaint",
  };
  const system = [
    `You generate realistic NREMT PA psychomotor skill evaluation scenarios.`,
    `Return ONLY a JSON object with no markdown, no code fences, no extra text.`,
    `The JSON must exactly match this schema:`,
    `{"dispatch":"<1-sentence radio dispatch>","patient":{"age":<number>,"sex":"M" or "F","chiefComplaint":"<brief CC 4-10 words>","history":"<2-3 sentences: SAMPLE history relevant to CC>"},"vitals":{"hr":"<number> bpm","bp":"<systolic>/<diastolic> mmHg","rr":"<number> breaths/min","spo2":"<number>% RA","gcs":"<number>"}}`,
    `Constraints:`,
    `- Skill station: ${sheet.title} (${sheet.id.toUpperCase()})`,
    `- Time limit: ${seed.timeLimit}`,
    `- Chief complaint options: ${seed.chiefComplaintHints}`,
    `- Vitals guidance: ${seed.typicalVitalsNote}`,
    `- Vary age (18-85), sex, and specific presentation each call — never repeat the same scenario twice.`,
    `- History must be medically accurate and internally consistent with the vitals and chief complaint.`,
    `- Do not include treatment decisions or outcomes in the scenario.`,
  ].join("\n");
  return { system, user: "Generate a scenario now." };
}

export function buildExaminerSystemPrompt(session: ExaminerSession, sheet: Sheet): string {
  const sc = session.scenario!;
  const timeLine = sc.timeLimitSec > 0
    ? `Time limit: ${Math.floor(sc.timeLimitSec / 60)} minutes.`
    : "This station is untimed.";
  const critList = session.crits.map((c, i) => `${i + 1}. ${c.body}`).join("\n");

  return [
    `You are a Pennsylvania NREMT PA examiner conducting a live psychomotor skills evaluation.`,
    `Skill station: ${sheet.title} (${sheet.id.toUpperCase()})`,
    `${timeLine}`,
    ``,
    `Patient: ${sc.patient.age}-year-old ${sc.patient.sex === "M" ? "male" : "female"}`,
    `Chief complaint: ${sc.patient.chiefComplaint}`,
    `History (reveal ONLY if candidate explicitly asks): ${sc.patient.history}`,
    ``,
    `Vitals (reveal ONLY the specific vital(s) the candidate explicitly requests):`,
    `  HR: ${sc.vitals.hr}`,
    `  BP: ${sc.vitals.bp}`,
    `  RR: ${sc.vitals.rr}`,
    `  SpO2: ${sc.vitals.spo2}`,
    `  GCS: ${sc.vitals.gcs}`,
    ``,
    `Critical criteria being monitored — DO NOT reveal to candidate:`,
    critList,
    ``,
    `RESPONSE FORMAT — you MUST follow this exactly on every reply:`,
    `Line 1: A JSON object (no spaces, no line breaks within it):`,
    `{"big5_detected":["scene_safety","bsi","patients","moi","resources"],"vitals_revealed":["hr","bp","rr","spo2","gcs"],"violations":[<criterion index numbers starting at 0>]}`,
    `Line 2+: Your examiner reply (plain text, ≤ 70 words).`,
    ``,
    `JSON rules:`,
    `- big5_detected: list ONLY the Big 5 items the candidate verbalized in their CURRENT message. Items: "scene_safety" (is scene safe), "bsi" (PPE/gloves/BSI), "patients" (number of patients), "moi" (mechanism/nature of illness), "resources" (additional resources needed).`,
    `- vitals_revealed: list which vitals the candidate explicitly asked for in their current message.`,
    `- violations: list the 0-based index of any critical criterion that was violated by the candidate's action in this message. Only flag clear violations (e.g., administering nitro to hypotensive patient = criterion index for "dangerous intervention").`,
    `- Use empty arrays [] when nothing applies.`,
    ``,
    `Examiner character rules:`,
    `- Speak as the examiner/patient in the scenario. Stay in character.`,
    `- Use *italics* (asterisks) for objective observations (e.g., *patient appears diaphoretic*).`,
    `- Be concise and realistic. Examiners say "Continue." or give brief acknowledgments.`,
    `- If candidate asks for vitals: provide ONLY what they asked for, narrating it naturally.`,
    `- Never coach or hint at missed steps.`,
    `- Open the first message naturally continuing from the dispatch.`,
  ].join("\n");
}

// ─── AI integration ───────────────────────────────────────────────────────────

export interface ParsedAIResponse {
  reply: string;
  big5Detected: Big5Item["id"][];
  vitalsRevealed: (keyof VitalsRevealed)[];
  violations: number[];
}

export function parseAIResponse(raw: string): ParsedAIResponse {
  const empty: ParsedAIResponse = { reply: raw.trim(), big5Detected: [], vitalsRevealed: [], violations: [] };
  if (!raw) return empty;

  // Find first { and matching }
  const start = raw.indexOf("{");
  if (start === -1) return empty;

  // Walk forward to find matching closing brace
  let depth = 0;
  let end = -1;
  for (let i = start; i < raw.length; i++) {
    if (raw[i] === "{") depth++;
    else if (raw[i] === "}") { depth--; if (depth === 0) { end = i; break; } }
  }
  if (end === -1) return empty;

  try {
    const jsonStr = raw.slice(start, end + 1);
    const parsed = JSON.parse(jsonStr) as {
      big5_detected?: string[];
      vitals_revealed?: string[];
      violations?: number[];
    };
    const validBig5Ids = new Set(["scene_safety", "bsi", "patients", "moi", "resources"]);
    const validVitalKeys = new Set(["hr", "bp", "rr", "spo2", "gcs"]);
    return {
      reply: raw.slice(end + 1).trim(),
      big5Detected: (parsed.big5_detected ?? []).filter(id => validBig5Ids.has(id)) as Big5Item["id"][],
      vitalsRevealed: (parsed.vitals_revealed ?? []).filter(k => validVitalKeys.has(k)) as (keyof VitalsRevealed)[],
      violations: (parsed.violations ?? []).filter(v => typeof v === "number"),
    };
  } catch {
    return empty;
  }
}

export async function callExaminerAI(
  messages: Array<{ role: "user" | "assistant"; content: string }>,
  systemPrompt: string,
  config: AIConfig,
): Promise<string> {
  if (config.provider === "anthropic") {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": config.apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model: config.model,
        max_tokens: 400,
        system: systemPrompt,
        messages,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({})) as { error?: { message?: string } };
      throw new Error(err.error?.message ?? `API error ${res.status}`);
    }
    const data = await res.json() as { content: Array<{ text: string }> };
    return data.content[0]?.text ?? "";
  }
  // OpenAI
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${config.apiKey}` },
    body: JSON.stringify({
      model: config.model,
      max_tokens: 400,
      messages: [{ role: "system", content: systemPrompt }, ...messages],
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: { message?: string } };
    throw new Error(err.error?.message ?? `API error ${res.status}`);
  }
  const data = await res.json() as { choices: Array<{ message: { content: string } }> };
  return data.choices[0]?.message?.content ?? "";
}

// ─── Debrief computation ──────────────────────────────────────────────────────

export interface DebriefResult {
  verdict: "pass" | "fail";
  big5Done: number;
  big5Total: number;
  critHit: number;
  critTotal: number;
  violationCount: number;
  elapsedSec: number;
  reasons: string[];
}

export function computeDebrief(session: ExaminerSession): DebriefResult {
  const big5Done = session.big5.filter(b => b.done).length;
  const violationCount = session.crits.filter(c => c.violated).length;
  const critTotal = session.crits.length;
  const critHit = critTotal - violationCount;
  const elapsedSec = session.startedAt && session.endedAt
    ? Math.floor((session.endedAt - session.startedAt) / 1000)
    : 0;

  const reasons: string[] = [];
  if (big5Done < 5) reasons.push(`${5 - big5Done} of the Big 5 were not verbalized`);
  if (violationCount > 0) reasons.push(`${violationCount} critical criterion violation${violationCount > 1 ? "s" : ""}`);

  return {
    verdict: big5Done === 5 && violationCount === 0 ? "pass" : "fail",
    big5Done,
    big5Total: 5,
    critHit,
    critTotal,
    violationCount,
    elapsedSec,
    reasons,
  };
}

// ─── AppState helpers ─────────────────────────────────────────────────────────

export function getActiveSession(state: AppState, sheetId: string): ExaminerSession | null {
  const sessions = Object.values(state.examinerSessions ?? {})
    .filter(s => s.sheetId === sheetId && s.status !== "pre" && s.status !== "debrief");
  if (sessions.length === 0) return null;
  return sessions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
}

export function getPreSession(state: AppState, sheetId: string): ExaminerSession | null {
  const sessions = Object.values(state.examinerSessions ?? {})
    .filter(s => s.sheetId === sheetId && s.status === "pre");
  if (sessions.length === 0) return null;
  return sessions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
}

export function getPastSessions(state: AppState, sheetId: string): ExaminerSession[] {
  return Object.values(state.examinerSessions ?? {})
    .filter(s => s.sheetId === sheetId && s.status === "debrief")
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}
