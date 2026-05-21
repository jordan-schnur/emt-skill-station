import type { AppState, Chat, ChatMessage, Sheet } from "../types";

const AI_CONFIG_KEY = "nremt.aiconfig";

const OPENAI_CHAT_FILTER = /^(gpt-|o\d)/;
const OPENAI_CHAT_EXCLUDE = /realtime|audio|instruct|tts|whisper|dall-e|embed|search|preview-/;

export interface AIConfig {
  provider: "openai" | "anthropic";
  model: string;
  apiKey: string;
}

export interface ModelOption {
  id: string;
  label: string;
}

function anthropicHeaders(apiKey: string): Record<string, string> {
  return {
    "Content-Type": "application/json",
    "x-api-key": apiKey,
    "anthropic-version": "2023-06-01",
    "anthropic-dangerous-direct-browser-access": "true",
  };
}

export function getConfig(): AIConfig {
  try {
    const raw = localStorage.getItem(AI_CONFIG_KEY);
    if (!raw) return { provider: "openai", model: "gpt-4o", apiKey: "" };
    return JSON.parse(raw) as AIConfig;
  } catch {
    return { provider: "openai", model: "gpt-4o", apiKey: "" };
  }
}

export function saveConfig(cfg: AIConfig): void {
  localStorage.setItem(AI_CONFIG_KEY, JSON.stringify(cfg));
}

export function clearConfig(): void {
  localStorage.removeItem(AI_CONFIG_KEY);
}

export async function fetchModels(provider: string, apiKey: string): Promise<ModelOption[]> {
  if (provider === "anthropic") {
    const res = await fetch("https://api.anthropic.com/v1/models", { headers: anthropicHeaders(apiKey) });
    if (!res.ok) {
      const err = await res.json().catch(() => ({})) as { error?: { message?: string } };
      throw new Error(err.error?.message || `Anthropic error ${res.status}`);
    }
    const data = await res.json() as { data?: { id: string; display_name?: string }[] };
    return (data.data || []).map((m) => ({ id: m.id, label: m.display_name || m.id }));
  }
  const res = await fetch("https://api.openai.com/v1/models", {
    headers: { "Authorization": `Bearer ${apiKey}` },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: { message?: string } };
    throw new Error(err.error?.message || `OpenAI error ${res.status}`);
  }
  const data = await res.json() as { data?: { id: string }[] };
  return (data.data || [])
    .filter((m) => OPENAI_CHAT_FILTER.test(m.id) && !OPENAI_CHAT_EXCLUDE.test(m.id))
    .sort((a, b) => b.id.localeCompare(a.id))
    .map((m) => ({ id: m.id, label: m.id }));
}

function ensureChats(state: AppState): void {
  if (!state.chats) state.chats = {};
}

export function createChat(state: AppState, { mode, sheetId }: { mode?: string; sheetId?: string | null }): string {
  ensureChats(state);
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const now = new Date().toISOString();
  state.chats[id] = {
    id,
    title: "",
    mode: (mode || "chat") as Chat["mode"],
    sheetId: sheetId || null,
    messages: [],
  };
  return id;
}

export function getChat(state: AppState, chatId: string): Chat | null {
  ensureChats(state);
  return state.chats[chatId] || null;
}

export function addMessage(state: AppState, chatId: string, { role, content }: Pick<ChatMessage, "role" | "content">): void {
  ensureChats(state);
  const chat = state.chats[chatId];
  if (!chat) return;
  const msg: ChatMessage = { role, content, ts: new Date().toISOString() };
  chat.messages.push(msg);
  if (!chat.title && role === "user") {
    chat.title = content.slice(0, 60).replace(/\s+/g, " ").trim();
    if (content.length > 60) chat.title += "…";
  }
}

export function listChats(state: AppState): Chat[] {
  ensureChats(state);
  return Object.values(state.chats).sort(
    (a, b) => new Date(b.messages.at(-1)?.ts ?? "").getTime() - new Date(a.messages.at(-1)?.ts ?? "").getTime(),
  );
}

export function deleteChat(state: AppState, chatId: string): void {
  ensureChats(state);
  delete state.chats[chatId];
}

function buildStepList(sheet: Sheet): string {
  const lines: string[] = [];
  let n = 1;
  for (const section of sheet.sections || []) {
    lines.push(`\n[${section.name}]`);
    for (const step of section.steps || []) {
      lines.push(`${n}. ${step.text}`);
      n++;
      for (const sub of step.substeps || []) {
        lines.push(`   - ${sub.text}`);
      }
    }
  }
  return lines.join("\n");
}

function buildCriticalList(sheet: Sheet): string {
  if (!sheet.criticalCriteria?.length) return "";
  return sheet.criticalCriteria.map((c, i) => `${i + 1}. ${c}`).join("\n");
}

export function buildSystemPrompt(mode: string, sheet: Sheet | null, userNotes: string): string {
  if (mode === "examiner") {
    const sheetName = sheet ? sheet.title : "the skill station";
    const steps = sheet ? buildStepList(sheet) : "";
    const critical = sheet ? buildCriticalList(sheet) : "";
    return [
      `You are an NREMT psychomotor examiner conducting a skill assessment at the EMT-Basic level.`,
      sheet ? `You are evaluating the candidate on: ${sheetName}` : "",
      steps ? `\nComplete skill sheet (what the candidate must perform):\n${steps}` : "",
      critical ? `\nCritical Criteria (automatic failure if any are missed):\n${critical}` : "",
      `\nInstructions:`,
      `- Begin by saying "Begin the ${sheetName} station."`,
      `- As the candidate narrates each action they would take, check it against the skill sheet.`,
      `- Respond with brief evaluative feedback: "Good.", "Continue.", or ask a clarifying question if something is unclear.`,
      `- If the candidate skips a step, you may give a subtle cue but do not give away the answer.`,
      `- After the candidate says they are done, or after all steps are addressed, provide a debrief: list steps performed correctly, steps missed, and whether any Critical Criteria were missed.`,
      `- Maintain examiner character throughout — be professional and neutral.`,
    ].filter(Boolean).join("\n");
  }
  const lines = [
    "You are an expert NREMT study assistant helping an EMT student prepare for the psychomotor skills exam.",
    "Be concise, accurate, and encouraging.",
  ];
  if (sheet) {
    lines.push(`\nThe student is currently studying: "${sheet.title}"`);
    const steps = buildStepList(sheet);
    if (steps) lines.push(`\nSkill sheet steps:\n${steps}`);
    const critical = buildCriticalList(sheet);
    if (critical) lines.push(`\nCritical Criteria (auto-fail):\n${critical}`);
  }
  if (userNotes) lines.push(`\nStudent notes for this sheet:\n${userNotes}`);
  return lines.join("\n");
}

async function callOpenAI(chatMessages: ChatMessage[], systemPrompt: string, model: string, apiKey: string): Promise<string> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        ...chatMessages.map((m) => ({ role: m.role, content: m.content })),
      ],
    }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({})) as { error?: { message?: string } };
    throw new Error(err.error?.message || `OpenAI error ${response.status}`);
  }
  const data = await response.json() as { choices: [{ message: { content: string } }] };
  return data.choices[0].message.content;
}

async function callAnthropic(chatMessages: ChatMessage[], systemPrompt: string, model: string, apiKey: string): Promise<string> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: anthropicHeaders(apiKey),
    body: JSON.stringify({
      model,
      max_tokens: 1024,
      system: systemPrompt,
      messages: chatMessages.map((m) => ({ role: m.role, content: m.content })),
    }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({})) as { error?: { message?: string } };
    throw new Error(err.error?.message || `Anthropic error ${response.status}`);
  }
  const data = await response.json() as { content: [{ text: string }] };
  return data.content[0].text;
}

export async function sendMessage(chatMessages: ChatMessage[], systemPrompt: string, config: AIConfig): Promise<string> {
  const { provider, model, apiKey } = config;
  if (!apiKey) throw new Error("No API key configured. Add one in Settings → AI Chat.");
  if (provider === "anthropic") return callAnthropic(chatMessages, systemPrompt, model, apiKey);
  return callOpenAI(chatMessages, systemPrompt, model, apiKey);
}

export const ChatStore = {
  getConfig, saveConfig, clearConfig, fetchModels,
  createChat, getChat, addMessage, listChats, deleteChat,
  buildSystemPrompt, sendMessage,
};
