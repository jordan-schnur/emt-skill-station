import { useState, useEffect, useRef } from "preact/hooks";
import { appState, mutateState, save, navigate, route, showToast } from "../store/appStore";
import {
  getConfig, listChats, createChat, getChat, addMessage, deleteChat,
  buildSystemPrompt, sendMessage,
} from "../lib/chat";
import { NREMT_DATA } from "../data/sheets";
import type { Chat, Sheet } from "../types";

// ─── helpers ─────────────────────────────────────────────────────────────────

function relTime(iso: string | undefined): string {
  if (!iso) return "";
  const diff = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.round(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.round(diff / 3600)}h ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function sheetById(id: string | null): Sheet | undefined {
  return id ? NREMT_DATA.sheets.find(s => s.id === id) : undefined;
}

// ─── Chat list ────────────────────────────────────────────────────────────────

function ChatList({ sheetCtx }: { sheetCtx?: Sheet }) {
  const cfg = getConfig();
  const hasKey = !!(cfg?.apiKey);
  const state = appState.value;
  const allChats = listChats(state);
  const chats = sheetCtx ? allChats.filter(c => c.sheetId === sheetCtx.id) : allChats;

  if (!hasKey) {
    return (
      <div class="chat-no-key">
        <div class="big">🔑</div>
        <p>No API key configured.</p>
        <p class="muted">Add an OpenAI or Anthropic API key in Backup &amp; Settings → AI Chat to get started.</p>
        <button class="btn btn-primary" onClick={() => navigate({ view: "settings" })}>Go to Settings</button>
      </div>
    );
  }

  function startNewChat(mode: "chat" | "examiner") {
    let chatId: string;
    mutateState(draft => { chatId = createChat(draft, { mode, sheetId: sheetCtx?.id ?? null }); });
    save();
    navigate({ view: "chat", chatId: chatId! });
  }

  return (
    <>
      <div class="chat-list-header">
        <h2>{sheetCtx ? `Chat — ${sheetCtx.title}` : "AI Chat"}</h2>
        <button class="btn btn-primary" onClick={() => startNewChat("chat")}>+ New chat</button>
      </div>
      {chats.length === 0 ? (
        <div class="empty-state">
          <p>No conversations yet.</p>
          <p class="muted">{sheetCtx ? "Start a new chat to ask questions or run an examiner simulation for this sheet." : "Start a new chat to ask questions about any skill sheet."}</p>
        </div>
      ) : (
        <div class="chat-list">
          {chats.map(chat => {
            const lastMsg = chat.messages[chat.messages.length - 1];
            const sheetName = sheetById(chat.sheetId)?.title;
            return (
              <div key={chat.id} class="chat-list-item" onClick={() => navigate({ view: "chat", chatId: chat.id })}>
                <div class="chat-list-meta">
                  <span class={`chat-mode-badge chat-mode-${chat.mode}`}>{chat.mode === "examiner" ? "Examiner" : "Chat"}</span>
                  {sheetName && <span class="chat-sheet-badge">{sheetName}</span>}
                </div>
                <div class="chat-list-title">{chat.title}</div>
                {lastMsg && <div class="chat-list-preview muted">{relTime(lastMsg.ts)}</div>}
                <button
                  class="chat-delete-btn"
                  type="button"
                  title="Delete conversation"
                  onClick={e => {
                    e.stopPropagation();
                    mutateState(draft => deleteChat(draft, chat.id));
                    save();
                  }}
                >✕</button>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

// ─── Chat detail ──────────────────────────────────────────────────────────────

function ChatDetail({ chatId, sheetCtx }: { chatId: string; sheetCtx?: Sheet }) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const chat: Chat | null = getChat(appState.value, chatId);
  const sheet = sheetCtx ?? sheetById(chat?.sheetId ?? null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chat?.messages.length]);

  if (!chat) return (
    <div class="empty-state">
      <p>Conversation not found.</p>
      <button class="btn" onClick={() => navigate({ view: "chat" })}>← Back</button>
    </div>
  );

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    setError(null);
    setLoading(true);
    mutateState(draft => addMessage(draft, chatId, { role: "user", content: text }));
    save();
    try {
      const cfg = getConfig();
      const notes = sheet ? (appState.value.notes?.sheet?.[sheet.id] ?? "") : "";
      const systemPrompt = buildSystemPrompt(chat?.mode ?? "chat", sheet ?? null, notes);
      const msgs = getChat(appState.value, chatId)?.messages ?? [];
      const reply = await sendMessage(msgs.filter(m => m.role !== "system"), systemPrompt, cfg);
      mutateState(draft => addMessage(draft, chatId, { role: "assistant", content: reply }));
      save();
    } catch (err: unknown) {
      setError((err as Error).message ?? "Request failed");
      showToast("Chat error: " + (err as Error).message);
    }
    setLoading(false);
  }

  const isSheetTab = !!(sheetCtx);

  return (
    <div class="chat-view">
      <div class="chat-detail-header">
        <button class="btn-link" onClick={() => navigate(isSheetTab ? { view: "sheet", sheetId: sheetCtx!.id, tab: "chat" } : { view: "chat" })}>← Back</button>
        <span class={`chat-mode-badge chat-mode-${chat.mode}`}>{chat.mode === "examiner" ? "Examiner" : "Chat"}</span>
        <span class="chat-detail-title">{chat.title}</span>
      </div>
      <div class="chat-messages">
        {chat.messages.filter(m => m.role !== "system").map((msg, i) => (
          <div key={i} class={`chat-msg chat-msg-${msg.role}`}>
            <div class="chat-msg-bubble">{msg.content}</div>
          </div>
        ))}
        {loading && <div class="chat-msg chat-msg-assistant"><div class="chat-msg-bubble chat-typing">…</div></div>}
        {error && <div class="chat-error">{error}</div>}
        <div ref={bottomRef} />
      </div>
      <div class="chat-input-row">
        <textarea
          class="chat-input"
          rows={2}
          placeholder="Type a message…"
          value={input}
          onInput={e => setInput((e.target as HTMLTextAreaElement).value)}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
          disabled={loading}
        />
        <button class="btn btn-primary" onClick={send} disabled={loading || !input.trim()}>
          {loading ? "…" : "Send"}
        </button>
      </div>
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export function ChatView({ sheetCtx }: { sheetCtx?: Sheet } = {}) {
  const r = route.value as { chatId?: string };

  useEffect(() => {
    if (!sheetCtx || r.chatId) return;
    const cfg = getConfig();
    if (!cfg?.apiKey) return;
    const state = appState.value;
    const allChats = listChats(state);
    const existing = allChats.find(c => c.sheetId === sheetCtx.id && c.mode === "examiner");
    if (existing) {
      navigate({ view: "chat", chatId: existing.id });
      return;
    }
    let chatId!: string;
    mutateState(draft => { chatId = createChat(draft, { mode: "examiner", sheetId: sheetCtx.id }); });
    save();
    navigate({ view: "chat", chatId });
  }, [sheetCtx?.id]);

  if (r.chatId) return <ChatDetail chatId={r.chatId} sheetCtx={sheetCtx} />;
  if (sheetCtx) {
    const cfg = getConfig();
    if (cfg?.apiKey) return null;
    return (
      <div class="chat-view">
        <ChatList sheetCtx={sheetCtx} />
      </div>
    );
  }
  return (
    <div class="chat-view">
      <ChatList sheetCtx={sheetCtx} />
    </div>
  );
}
