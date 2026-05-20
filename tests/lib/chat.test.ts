import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { getConfig, saveConfig, clearConfig, fetchModels, createChat, addMessage, listChats, getChat, deleteChat, buildSystemPrompt } from "../../src/lib/chat";
import { createEmptyState, createMockSheet } from "../vitest.fixtures";
import type { AppState } from "../../src/types";

const AI_CONFIG_KEY = "nremt.aiconfig";

function stateWithChats(): AppState {
  const s = createEmptyState();
  s.chats = {};
  return s;
}

describe("ChatStore – config", () => {
  it("returns defaults when nothing is stored", () => {
    const cfg = getConfig();
    expect(cfg.provider).toBe("openai");
    expect(cfg.model).toBe("gpt-4o");
    expect(cfg.apiKey).toBe("");
  });

  it("returns stored config", () => {
    const stored = { provider: "anthropic", model: "claude-sonnet-4-6", apiKey: "sk-ant-test" };
    localStorage.setItem(AI_CONFIG_KEY, JSON.stringify(stored));
    const cfg = getConfig();
    expect(cfg.provider).toBe("anthropic");
    expect(cfg.model).toBe("claude-sonnet-4-6");
    expect(cfg.apiKey).toBe("sk-ant-test");
  });

  it("handles corrupt stored config gracefully", () => {
    localStorage.setItem(AI_CONFIG_KEY, "not-json{{");
    const cfg = getConfig();
    expect(cfg.provider).toBe("openai");
  });

  it("saveConfig writes to localStorage", () => {
    const cfg = { provider: "openai" as const, model: "gpt-4o-mini", apiKey: "sk-test" };
    saveConfig(cfg);
    expect(localStorage.getItem(AI_CONFIG_KEY)).toBe(JSON.stringify(cfg));
  });

  it("clearConfig removes key from localStorage", () => {
    localStorage.setItem(AI_CONFIG_KEY, "{}");
    clearConfig();
    expect(localStorage.getItem(AI_CONFIG_KEY)).toBeNull();
  });
});

describe("ChatStore – fetchModels", () => {
  beforeEach(() => { global.fetch = vi.fn() as unknown as typeof fetch; });
  afterEach(() => { delete (global as Record<string, unknown>)["fetch"]; });

  it("returns filtered OpenAI chat models", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [
          { id: "gpt-4o" }, { id: "gpt-4o-mini" },
          { id: "whisper-1" }, { id: "text-embedding-ada" },
          { id: "dall-e-3" }, { id: "o1-preview" },
        ],
      }),
    });
    const models = await fetchModels("openai", "sk-test");
    const ids = models.map((m) => m.id);
    expect(ids).toContain("gpt-4o");
    expect(ids).toContain("gpt-4o-mini");
    expect(ids).not.toContain("whisper-1");
    expect(ids).not.toContain("text-embedding-ada");
    expect(ids).not.toContain("dall-e-3");
  });

  it("fetches Anthropic models using the CORS browser header", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [
          { id: "claude-sonnet-4-6", display_name: "Claude Sonnet 4.6" },
          { id: "claude-haiku-4-5", display_name: "Claude Haiku 4.5" },
        ],
      }),
    });
    const models = await fetchModels("anthropic", "sk-ant-test");
    expect(models).toHaveLength(2);
    expect(models[0].label).toBe("Claude Sonnet 4.6");
    expect(global.fetch).toHaveBeenCalledWith(
      "https://api.anthropic.com/v1/models",
      expect.objectContaining({
        headers: expect.objectContaining({
          "anthropic-dangerous-direct-browser-access": "true",
          "x-api-key": "sk-ant-test",
        }),
      }),
    );
  });

  it("throws on non-OK response", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false, status: 401,
      json: async () => ({ error: { message: "Invalid API key" } }),
    });
    await expect(fetchModels("openai", "bad-key")).rejects.toThrow("Invalid API key");
  });
});

describe("ChatStore – createChat", () => {
  it("creates a chat entry in state.chats", () => {
    const state = stateWithChats();
    const chatId = createChat(state, { mode: "chat", sheetId: "e201" });
    expect(chatId).toBeTruthy();
    expect(state.chats[chatId]).toBeDefined();
    expect(state.chats[chatId].mode).toBe("chat");
    expect(state.chats[chatId].sheetId).toBe("e201");
    expect(state.chats[chatId].messages).toEqual([]);
  });

  it("defaults sheetId to null when not provided", () => {
    const state = stateWithChats();
    const chatId = createChat(state, { mode: "examiner" });
    expect(state.chats[chatId].sheetId).toBeNull();
  });

  it("defaults mode to 'chat'", () => {
    const state = stateWithChats();
    const chatId = createChat(state, {});
    expect(state.chats[chatId].mode).toBe("chat");
  });

  it("initializes state.chats if missing", () => {
    const state = createEmptyState();
    delete (state as Partial<AppState>).chats;
    const chatId = createChat(state, { mode: "chat" });
    expect(state.chats).toBeDefined();
    expect(state.chats[chatId]).toBeDefined();
  });
});

describe("ChatStore – addMessage", () => {
  it("appends a message to the chat", () => {
    const state = stateWithChats();
    const chatId = createChat(state, { mode: "chat" });
    addMessage(state, chatId, { role: "user", content: "Hello" });
    expect(state.chats[chatId].messages).toHaveLength(1);
    expect(state.chats[chatId].messages[0].role).toBe("user");
    expect(state.chats[chatId].messages[0].content).toBe("Hello");
  });

  it("auto-sets title from first user message", () => {
    const state = stateWithChats();
    const chatId = createChat(state, { mode: "chat" });
    addMessage(state, chatId, { role: "user", content: "What is scene safety?" });
    expect(state.chats[chatId].title).toBe("What is scene safety?");
  });

  it("truncates long titles with ellipsis", () => {
    const state = stateWithChats();
    const chatId = createChat(state, { mode: "chat" });
    const longMsg = "A".repeat(80);
    addMessage(state, chatId, { role: "user", content: longMsg });
    expect(state.chats[chatId].title.length).toBeLessThanOrEqual(63);
    expect(state.chats[chatId].title.endsWith("…")).toBe(true);
  });

  it("does not overwrite title on subsequent messages", () => {
    const state = stateWithChats();
    const chatId = createChat(state, { mode: "chat" });
    addMessage(state, chatId, { role: "user", content: "First message" });
    addMessage(state, chatId, { role: "assistant", content: "Reply" });
    addMessage(state, chatId, { role: "user", content: "Second message" });
    expect(state.chats[chatId].title).toBe("First message");
  });

  it("does nothing for unknown chatId", () => {
    const state = stateWithChats();
    expect(() => addMessage(state, "nonexistent", { role: "user", content: "Hi" })).not.toThrow();
  });
});

describe("ChatStore – listChats", () => {
  it("returns empty array when no chats", () => {
    const state = stateWithChats();
    expect(listChats(state)).toEqual([]);
  });
});

describe("ChatStore – getChat", () => {
  it("returns the chat by id", () => {
    const state = stateWithChats();
    const chatId = createChat(state, { mode: "examiner" });
    const chat = getChat(state, chatId);
    expect(chat).not.toBeNull();
    expect(chat?.mode).toBe("examiner");
  });

  it("returns null for unknown id", () => {
    const state = stateWithChats();
    expect(getChat(state, "nope")).toBeNull();
  });
});

describe("ChatStore – deleteChat", () => {
  it("removes the chat from state", () => {
    const state = stateWithChats();
    const chatId = createChat(state, { mode: "chat" });
    deleteChat(state, chatId);
    expect(state.chats[chatId]).toBeUndefined();
  });
});

describe("ChatStore – buildSystemPrompt", () => {
  const sheet = createMockSheet();

  it("chat mode includes sheet title and steps", () => {
    const prompt = buildSystemPrompt("chat", sheet, "");
    expect(prompt).toContain(sheet.title);
    expect(prompt).toContain("PPE");
    expect(prompt).toContain("SCENE SIZE-UP");
  });

  it("chat mode includes user notes when provided", () => {
    const prompt = buildSystemPrompt("chat", sheet, "Remember BSI first");
    expect(prompt).toContain("Remember BSI first");
  });

  it("chat mode works without a sheet", () => {
    const prompt = buildSystemPrompt("chat", null, "");
    expect(prompt).toContain("NREMT");
    expect(prompt).not.toContain("undefined");
  });

  it("examiner mode includes 'Begin' instruction", () => {
    const prompt = buildSystemPrompt("examiner", sheet, "");
    expect(prompt).toContain("Begin");
    expect(prompt).toContain("examiner");
  });

  it("examiner mode includes critical criteria", () => {
    const prompt = buildSystemPrompt("examiner", sheet, "");
    expect(prompt).toContain("Failure to take appropriate PPE precautions");
  });

  it("examiner mode with no sheet uses generic station name", () => {
    const prompt = buildSystemPrompt("examiner", null, "");
    expect(prompt).toContain("skill station");
    expect(prompt).not.toContain("undefined");
  });
});
