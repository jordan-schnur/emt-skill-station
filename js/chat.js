/**
 * chat.js – AI chatbot state management and API integration.
 *
 * API config (provider, model, apiKey) is stored in a separate localStorage
 * key ("nremt.aiconfig") and is NEVER included in state or cloud sync.
 *
 * Chat histories live in state.chats and sync via Firestore like all other data.
 */
(function (global) {
  const AI_CONFIG_KEY = "nremt.aiconfig";

  // Regexes for filtering OpenAI model list to chat-capable models only
  const OPENAI_CHAT_FILTER = /^(gpt-|o\d)/;
  const OPENAI_CHAT_EXCLUDE = /realtime|audio|instruct|tts|whisper|dall-e|embed|search|preview-/;

  // Anthropic's /v1/models endpoint blocks browser CORS, so we maintain a
  // curated list. These are the current production models as of mid-2025.
  const ANTHROPIC_MODELS = [
    { id: "claude-opus-4-7",           label: "Claude Opus 4.7" },
    { id: "claude-sonnet-4-6",         label: "Claude Sonnet 4.6" },
    { id: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5" },
    { id: "claude-3-5-sonnet-20241022", label: "Claude 3.5 Sonnet" },
    { id: "claude-3-5-haiku-20241022",  label: "Claude 3.5 Haiku" },
    { id: "claude-3-opus-20240229",     label: "Claude 3 Opus" },
  ];

  // ---- Config (localStorage only, never synced) -----------------------

  function getConfig() {
    try {
      const raw = localStorage.getItem(AI_CONFIG_KEY);
      if (!raw) return { provider: "openai", model: "gpt-4o", apiKey: "" };
      return JSON.parse(raw);
    } catch {
      return { provider: "openai", model: "gpt-4o", apiKey: "" };
    }
  }

  function saveConfig(cfg) {
    localStorage.setItem(AI_CONFIG_KEY, JSON.stringify(cfg));
  }

  function clearConfig() {
    localStorage.removeItem(AI_CONFIG_KEY);
  }

  async function fetchModels(provider, apiKey) {
    // Anthropic's models endpoint blocks browser CORS requests, so we validate
    // the key by sending a minimal message and return the curated model list.
    if (provider === "anthropic") {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 1,
          messages: [{ role: "user", content: "hi" }],
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error?.message || `Anthropic error ${res.status}`);
      }
      return ANTHROPIC_MODELS;
    }
    // OpenAI — their API supports CORS from browsers
    const res = await fetch("https://api.openai.com/v1/models", {
      headers: { "Authorization": `Bearer ${apiKey}` },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `OpenAI error ${res.status}`);
    }
    const data = await res.json();
    return (data.data || [])
      .filter((m) => OPENAI_CHAT_FILTER.test(m.id) && !OPENAI_CHAT_EXCLUDE.test(m.id))
      .sort((a, b) => b.id.localeCompare(a.id))
      .map((m) => ({ id: m.id, label: m.id }));
  }

  // ---- Chat CRUD (stored in state.chats, synced via Firestore) --------

  function ensureChats(state) {
    if (!state.chats) state.chats = {};
  }

  function createChat(state, { mode, sheetId }) {
    ensureChats(state);
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const now = new Date().toISOString();
    state.chats[id] = {
      id,
      title: "",
      mode: mode || "chat",
      sheetId: sheetId || null,
      createdAt: now,
      updatedAt: now,
      messages: [],
    };
    return id;
  }

  function getChat(state, chatId) {
    ensureChats(state);
    return state.chats[chatId] || null;
  }

  function addMessage(state, chatId, { role, content }) {
    ensureChats(state);
    const chat = state.chats[chatId];
    if (!chat) return;
    const msg = { role, content, ts: new Date().toISOString() };
    chat.messages.push(msg);
    chat.updatedAt = msg.ts;
    // Auto-title from first user message
    if (!chat.title && role === "user") {
      chat.title = content.slice(0, 60).replace(/\s+/g, " ").trim();
      if (content.length > 60) chat.title += "…";
    }
  }

  function listChats(state) {
    ensureChats(state);
    return Object.values(state.chats).sort(
      (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)
    );
  }

  function deleteChat(state, chatId) {
    ensureChats(state);
    delete state.chats[chatId];
  }

  // ---- System prompt builders -----------------------------------------

  function buildStepList(sheet) {
    if (!sheet) return "";
    const lines = [];
    let n = 1;
    for (const section of sheet.sections || []) {
      lines.push(`\n[${section.name}]`);
      for (const step of section.steps || []) {
        lines.push(`${n}. ${step.text}`);
        n++;
        for (const sub of step.subSteps || []) {
          lines.push(`   - ${sub.text}`);
        }
      }
    }
    return lines.join("\n");
  }

  function buildCriticalList(sheet) {
    if (!sheet || !sheet.criticalCriteria || !sheet.criticalCriteria.length) return "";
    return sheet.criticalCriteria.map((c, i) => `${i + 1}. ${c}`).join("\n");
  }

  function buildSystemPrompt(mode, sheet, userNotes) {
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

    // Chat mode
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
    if (userNotes) {
      lines.push(`\nStudent notes for this sheet:\n${userNotes}`);
    }
    return lines.join("\n");
  }

  // ---- API callers ----------------------------------------------------

  async function callOpenAI(chatMessages, systemPrompt, model, apiKey) {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          ...chatMessages.map((m) => ({ role: m.role, content: m.content })),
        ],
      }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error?.message || `OpenAI error ${response.status}`);
    }
    const data = await response.json();
    return data.choices[0].message.content;
  }

  async function callAnthropic(chatMessages, systemPrompt, model, apiKey) {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: 1024,
        system: systemPrompt,
        messages: chatMessages.map((m) => ({ role: m.role, content: m.content })),
      }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error?.message || `Anthropic error ${response.status}`);
    }
    const data = await response.json();
    return data.content[0].text;
  }

  async function sendMessage(chatMessages, systemPrompt, config) {
    const { provider, model, apiKey } = config;
    if (!apiKey) throw new Error("No API key configured. Add one in Settings → AI Chat.");
    if (provider === "anthropic") {
      return callAnthropic(chatMessages, systemPrompt, model, apiKey);
    }
    return callOpenAI(chatMessages, systemPrompt, model, apiKey);
  }

  global.ChatStore = {
    // Config
    getConfig,
    saveConfig,
    clearConfig,
    fetchModels,
    // Chat CRUD
    createChat,
    getChat,
    addMessage,
    listChats,
    deleteChat,
    // Prompts + API
    buildSystemPrompt,
    sendMessage,
  };
})(window);
