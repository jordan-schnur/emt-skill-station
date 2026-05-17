/**
 * Unit tests for chat.js – ChatStore
 */

require("../js/chat.js");

import { createEmptyState, createMockSheet } from "./fixtures.js";

const ChatStore = window.ChatStore;
const AI_CONFIG_KEY = "nremt.aiconfig";

// ---- helpers --------------------------------------------------------

function stateWithChats() {
  const s = createEmptyState();
  s.chats = {};
  return s;
}

// ---- Config ---------------------------------------------------------

describe("ChatStore – config", () => {
  it("returns defaults when nothing is stored", () => {
    localStorage.getItem.mockReturnValue(null);
    const cfg = ChatStore.getConfig();
    expect(cfg.provider).toBe("openai");
    expect(cfg.model).toBe("gpt-4o");
    expect(cfg.apiKey).toBe("");
  });

  it("returns stored config", () => {
    const stored = { provider: "anthropic", model: "claude-sonnet-4-6", apiKey: "sk-ant-test" };
    localStorage.getItem.mockReturnValue(JSON.stringify(stored));
    const cfg = ChatStore.getConfig();
    expect(cfg.provider).toBe("anthropic");
    expect(cfg.model).toBe("claude-sonnet-4-6");
    expect(cfg.apiKey).toBe("sk-ant-test");
  });

  it("handles corrupt stored config gracefully", () => {
    localStorage.getItem.mockReturnValue("not-json{{");
    const cfg = ChatStore.getConfig();
    expect(cfg.provider).toBe("openai");
  });

  it("saveConfig writes to localStorage", () => {
    const cfg = { provider: "openai", model: "gpt-4o-mini", apiKey: "sk-test" };
    ChatStore.saveConfig(cfg);
    expect(localStorage.setItem).toHaveBeenCalledWith(AI_CONFIG_KEY, JSON.stringify(cfg));
  });

  it("clearConfig removes key from localStorage", () => {
    ChatStore.clearConfig();
    expect(localStorage.removeItem).toHaveBeenCalledWith(AI_CONFIG_KEY);
  });
});

describe("ChatStore – fetchModels", () => {
  beforeEach(() => { global.fetch = jest.fn(); });
  afterEach(() => { delete global.fetch; });

  it("returns filtered OpenAI chat models", async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [
          { id: "gpt-4o" },
          { id: "gpt-4o-mini" },
          { id: "whisper-1" },        // excluded: matches exclude regex
          { id: "text-embedding-ada" }, // excluded
          { id: "dall-e-3" },           // excluded
          { id: "o1-preview" },
        ],
      }),
    });
    const models = await ChatStore.fetchModels("openai", "sk-test");
    const ids = models.map((m) => m.id);
    expect(ids).toContain("gpt-4o");
    expect(ids).toContain("gpt-4o-mini");
    expect(ids).not.toContain("whisper-1");
    expect(ids).not.toContain("text-embedding-ada");
    expect(ids).not.toContain("dall-e-3");
  });

  it("returns Anthropic models with display names", async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [
          { id: "claude-sonnet-4-6", display_name: "Claude Sonnet 4.6" },
          { id: "claude-haiku-4-5",  display_name: "Claude Haiku 4.5" },
        ],
      }),
    });
    const models = await ChatStore.fetchModels("anthropic", "sk-ant-test");
    expect(models).toHaveLength(2);
    expect(models[0].label).toBe("Claude Sonnet 4.6");
    expect(global.fetch).toHaveBeenCalledWith(
      "https://api.anthropic.com/v1/models",
      expect.objectContaining({ headers: expect.objectContaining({ "x-api-key": "sk-ant-test" }) })
    );
  });

  it("throws on non-OK response", async () => {
    global.fetch.mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ error: { message: "Invalid API key" } }),
    });
    await expect(ChatStore.fetchModels("openai", "bad-key")).rejects.toThrow("Invalid API key");
  });
});

// ---- Chat CRUD ------------------------------------------------------

describe("ChatStore – createChat", () => {
  it("creates a chat entry in state.chats", () => {
    const state = stateWithChats();
    const chatId = ChatStore.createChat(state, { mode: "chat", sheetId: "e201" });
    expect(chatId).toBeTruthy();
    expect(state.chats[chatId]).toBeDefined();
    expect(state.chats[chatId].mode).toBe("chat");
    expect(state.chats[chatId].sheetId).toBe("e201");
    expect(state.chats[chatId].messages).toEqual([]);
  });

  it("defaults sheetId to null when not provided", () => {
    const state = stateWithChats();
    const chatId = ChatStore.createChat(state, { mode: "examiner" });
    expect(state.chats[chatId].sheetId).toBeNull();
  });

  it("defaults mode to 'chat'", () => {
    const state = stateWithChats();
    const chatId = ChatStore.createChat(state, {});
    expect(state.chats[chatId].mode).toBe("chat");
  });

  it("initializes state.chats if missing", () => {
    const state = createEmptyState();
    delete state.chats;
    const chatId = ChatStore.createChat(state, { mode: "chat" });
    expect(state.chats).toBeDefined();
    expect(state.chats[chatId]).toBeDefined();
  });
});

describe("ChatStore – addMessage", () => {
  it("appends a message to the chat", () => {
    const state = stateWithChats();
    const chatId = ChatStore.createChat(state, { mode: "chat" });
    ChatStore.addMessage(state, chatId, { role: "user", content: "Hello" });
    expect(state.chats[chatId].messages).toHaveLength(1);
    expect(state.chats[chatId].messages[0].role).toBe("user");
    expect(state.chats[chatId].messages[0].content).toBe("Hello");
  });

  it("updates updatedAt when a message is added", () => {
    const state = stateWithChats();
    const chatId = ChatStore.createChat(state, { mode: "chat" });
    const before = state.chats[chatId].updatedAt;
    // Advance Date by mocking toISOString on the next call
    const realDate = global.Date;
    const later = new Date(new Date(before).getTime() + 1000);
    jest.spyOn(global, "Date").mockImplementationOnce(() => later);
    ChatStore.addMessage(state, chatId, { role: "user", content: "Hi" });
    global.Date = realDate;
    expect(state.chats[chatId].updatedAt).not.toBe(before);
  });

  it("auto-sets title from first user message", () => {
    const state = stateWithChats();
    const chatId = ChatStore.createChat(state, { mode: "chat" });
    ChatStore.addMessage(state, chatId, { role: "user", content: "What is scene safety?" });
    expect(state.chats[chatId].title).toBe("What is scene safety?");
  });

  it("truncates long titles with ellipsis", () => {
    const state = stateWithChats();
    const chatId = ChatStore.createChat(state, { mode: "chat" });
    const longMsg = "A".repeat(80);
    ChatStore.addMessage(state, chatId, { role: "user", content: longMsg });
    expect(state.chats[chatId].title.length).toBeLessThanOrEqual(63);
    expect(state.chats[chatId].title.endsWith("…")).toBe(true);
  });

  it("does not overwrite title on subsequent messages", () => {
    const state = stateWithChats();
    const chatId = ChatStore.createChat(state, { mode: "chat" });
    ChatStore.addMessage(state, chatId, { role: "user", content: "First message" });
    ChatStore.addMessage(state, chatId, { role: "assistant", content: "Reply" });
    ChatStore.addMessage(state, chatId, { role: "user", content: "Second message" });
    expect(state.chats[chatId].title).toBe("First message");
  });

  it("does nothing for unknown chatId", () => {
    const state = stateWithChats();
    expect(() => {
      ChatStore.addMessage(state, "nonexistent", { role: "user", content: "Hi" });
    }).not.toThrow();
  });
});

describe("ChatStore – listChats", () => {
  it("returns empty array when no chats", () => {
    const state = stateWithChats();
    expect(ChatStore.listChats(state)).toEqual([]);
  });

  it("returns chats sorted by updatedAt descending", () => {
    const state = stateWithChats();
    const id1 = ChatStore.createChat(state, { mode: "chat" });
    state.chats[id1].updatedAt = "2024-01-01T10:00:00.000Z";
    const id2 = ChatStore.createChat(state, { mode: "examiner" });
    state.chats[id2].updatedAt = "2024-01-02T10:00:00.000Z";
    const id3 = ChatStore.createChat(state, { mode: "chat" });
    state.chats[id3].updatedAt = "2024-01-01T15:00:00.000Z";

    const result = ChatStore.listChats(state);
    expect(result[0].id).toBe(id2);
    expect(result[1].id).toBe(id3);
    expect(result[2].id).toBe(id1);
  });
});

describe("ChatStore – getChat", () => {
  it("returns the chat by id", () => {
    const state = stateWithChats();
    const chatId = ChatStore.createChat(state, { mode: "examiner" });
    const chat = ChatStore.getChat(state, chatId);
    expect(chat).not.toBeNull();
    expect(chat.mode).toBe("examiner");
  });

  it("returns null for unknown id", () => {
    const state = stateWithChats();
    expect(ChatStore.getChat(state, "nope")).toBeNull();
  });
});

describe("ChatStore – deleteChat", () => {
  it("removes the chat from state", () => {
    const state = stateWithChats();
    const chatId = ChatStore.createChat(state, { mode: "chat" });
    ChatStore.deleteChat(state, chatId);
    expect(state.chats[chatId]).toBeUndefined();
  });
});

// ---- System prompts -------------------------------------------------

describe("ChatStore – buildSystemPrompt", () => {
  const sheet = createMockSheet();

  it("chat mode includes sheet title and steps", () => {
    const prompt = ChatStore.buildSystemPrompt("chat", sheet, "");
    expect(prompt).toContain(sheet.title);
    expect(prompt).toContain("PPE");
    expect(prompt).toContain("SCENE SIZE-UP");
  });

  it("chat mode includes user notes when provided", () => {
    const prompt = ChatStore.buildSystemPrompt("chat", sheet, "Remember BSI first");
    expect(prompt).toContain("Remember BSI first");
  });

  it("chat mode works without a sheet", () => {
    const prompt = ChatStore.buildSystemPrompt("chat", null, "");
    expect(prompt).toContain("NREMT");
    expect(prompt).not.toContain("undefined");
  });

  it("examiner mode includes 'Begin' instruction", () => {
    const prompt = ChatStore.buildSystemPrompt("examiner", sheet, "");
    expect(prompt).toContain("Begin");
    expect(prompt).toContain("examiner");
  });

  it("examiner mode includes critical criteria", () => {
    const prompt = ChatStore.buildSystemPrompt("examiner", sheet, "");
    expect(prompt).toContain("Failure to take appropriate PPE precautions");
  });

  it("examiner mode with no sheet uses generic station name", () => {
    const prompt = ChatStore.buildSystemPrompt("examiner", null, "");
    expect(prompt).toContain("skill station");
    expect(prompt).not.toContain("undefined");
  });
});

// ---- API calls (mocked fetch) ---------------------------------------

describe("ChatStore – sendMessage", () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    delete global.fetch;
  });

  it("throws when apiKey is missing", async () => {
    await expect(
      ChatStore.sendMessage([], "system", { provider: "openai", model: "gpt-4o", apiKey: "" })
    ).rejects.toThrow(/API key/i);
  });

  it("calls OpenAI endpoint for openai provider", async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: "OK" } }] }),
    });
    const result = await ChatStore.sendMessage(
      [{ role: "user", content: "Hi" }],
      "system prompt",
      { provider: "openai", model: "gpt-4o", apiKey: "sk-test" }
    );
    expect(result).toBe("OK");
    expect(global.fetch).toHaveBeenCalledWith(
      "https://api.openai.com/v1/chat/completions",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("calls Anthropic endpoint for anthropic provider", async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ content: [{ text: "Claude here" }] }),
    });
    const result = await ChatStore.sendMessage(
      [{ role: "user", content: "Hi" }],
      "system prompt",
      { provider: "anthropic", model: "claude-sonnet-4-6", apiKey: "sk-ant-test" }
    );
    expect(result).toBe("Claude here");
    expect(global.fetch).toHaveBeenCalledWith(
      "https://api.anthropic.com/v1/messages",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("throws on non-OK OpenAI response", async () => {
    global.fetch.mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ error: { message: "Unauthorized" } }),
    });
    await expect(
      ChatStore.sendMessage(
        [{ role: "user", content: "Hi" }],
        "system",
        { provider: "openai", model: "gpt-4o", apiKey: "sk-bad" }
      )
    ).rejects.toThrow("Unauthorized");
  });

  it("throws on non-OK Anthropic response", async () => {
    global.fetch.mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({ error: { message: "Forbidden" } }),
    });
    await expect(
      ChatStore.sendMessage(
        [{ role: "user", content: "Hi" }],
        "system",
        { provider: "anthropic", model: "claude-sonnet-4-6", apiKey: "sk-ant-bad" }
      )
    ).rejects.toThrow("Forbidden");
  });

  it("includes system prompt as first message for OpenAI", async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: "OK" } }] }),
    });
    await ChatStore.sendMessage(
      [{ role: "user", content: "Hello" }],
      "You are a helpful NREMT assistant.",
      { provider: "openai", model: "gpt-4o", apiKey: "sk-test" }
    );
    const body = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(body.messages[0].role).toBe("system");
    expect(body.messages[0].content).toBe("You are a helpful NREMT assistant.");
    expect(body.messages[1].role).toBe("user");
  });
});
