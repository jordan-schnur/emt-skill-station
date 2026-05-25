import { useState, useEffect, useRef } from "preact/hooks";
import { appState, mutateState, save, navigate } from "../store/appStore";
import { getConfig } from "../lib/chat";
import {
  createSession, buildScenarioPrompt, buildExaminerSystemPrompt,
  callExaminerAI, parseAIResponse, computeDebrief,
  getActiveSession, getPreSession,
  BIG5_ITEMS,
} from "../lib/examiner";
import type { ExaminerSession, Sheet, Big5Item, CritItem } from "../types";

// ─── Helper ───────────────────────────────────────────────────────────────────

function fmtTime(sec: number): string {
  const m = Math.floor(sec / 60).toString().padStart(2, "0");
  const s = (sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function msgId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

// ─── Pre-phase card ───────────────────────────────────────────────────────────

function PreCard({ sheet, onBegin, loading }: { sheet: Sheet; onBegin: () => void; loading: boolean }) {
  const cfg = getConfig();
  const hasKey = !!(cfg?.apiKey);
  const tl = sheet.timeLimit ?? "untimed";

  if (!hasKey) {
    return (
      <div class="examiner-pre-card">
        <div class="examiner-eyebrow">AI Examiner</div>
        <div class="examiner-pre-title">API key required</div>
        <p class="examiner-pre-body">
          The examiner uses an AI model to roleplay as your NREMT PA examiner and track your performance in real time.
          Add an Anthropic or OpenAI API key to get started.
        </p>
        <p class="examiner-privacy">
          🔒 Your conversation is sent directly to the AI provider (Anthropic or OpenAI) to generate responses.
          It is never stored by or transmitted to this app.
        </p>
        <button class="btn btn-primary" onClick={() => navigate({ view: "settings" })}>Go to Settings →</button>
      </div>
    );
  }

  return (
    <div class="examiner-pre-card">
      <div class="examiner-eyebrow critical-eyebrow">⚠ Live exam simulation</div>
      <div class="examiner-pre-title">Ready when you are.</div>
      <p class="examiner-pre-body">
        Claude acts as your PA NREMT examiner. Press Begin to receive a randomized dispatch and patient presentation.
      </p>
      <p class="examiner-privacy">
        🔒 Your messages go to {cfg.provider === "anthropic" ? "Anthropic's" : "OpenAI's"} API to generate responses — never stored by or shared with us.
      </p>
      <div class="examiner-pre-dispatch blurred">Pending. The radio will go off when you press Begin.</div>
      <div class="examiner-pre-meta">
        <div class="examiner-meta-tile"><div class="label">Station</div><div class="value">{sheet.id.toUpperCase()}</div></div>
        <div class="examiner-meta-tile"><div class="label">Time limit</div><div class="value">{tl}</div></div>
        <div class="examiner-meta-tile"><div class="label">Patient</div><div class="value blurred">Unknown</div></div>
      </div>
      <button class="btn btn-primary examiner-begin-btn" onClick={onBegin} disabled={loading}>
        {loading ? "Generating scenario…" : "Begin scenario →"}
      </button>
    </div>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

function VitalsGrid({ vitals, revealed }: {
  vitals: ExaminerSession["scenario"] extends null ? never : NonNullable<ExaminerSession["scenario"]>["vitals"] | null;
  revealed: ExaminerSession["vitalsRevealed"];
}) {
  const items: Array<{ key: keyof ExaminerSession["vitalsRevealed"]; label: string }> = [
    { key: "hr", label: "HR" },
    { key: "bp", label: "BP" },
    { key: "rr", label: "RR" },
    { key: "spo2", label: "SpO₂" },
    { key: "gcs", label: "GCS" },
  ];
  return (
    <div class="examiner-vitals-grid">
      {items.map(({ key, label }) => (
        <div key={key} class={`examiner-vital-tile${revealed[key] ? " revealed" : ""}`}>
          <div class="vital-label">{label}</div>
          <div class="vital-value">
            {revealed[key] && vitals ? vitals[key] : <span class="vital-hidden">—</span>}
          </div>
        </div>
      ))}
    </div>
  );
}

function Big5List({ items }: { items: Big5Item[] }) {
  return (
    <ul class="examiner-big5-list">
      {items.map(item => (
        <li key={item.id} class={`examiner-big5-item${item.done ? " done" : ""}`}>
          <span class="big5-check">{item.done ? "✓" : "○"}</span>
          <span class="big5-what">{item.what}</span>
          {!item.done && <span class="big5-quote">"{item.quote}"</span>}
        </li>
      ))}
    </ul>
  );
}

function CritList({ crits }: { crits: CritItem[] }) {
  const violated = crits.filter(c => c.violated);
  return (
    <div class="examiner-crit-list">
      {crits.map(c => (
        <div key={c.idx} class={`examiner-crit-item${c.violated ? " violated" : " blurred-crit"}`}>
          {c.violated && <span class="crit-violation-label">Auto-fail triggered</span>}
          <span class="crit-body">{c.body}</span>
        </div>
      ))}
      <div class="crit-footer">
        {crits.length} criteria monitored · {violated.length === 0 ? "hidden so this isn't a cheat sheet" : `${violated.length} violated`}
      </div>
    </div>
  );
}

function Sidebar({ session }: { session: ExaminerSession }) {
  const sc = session.scenario;
  return (
    <aside class="examiner-sidebar">
      <div class="side-block">
        <h5 class="side-title">Scenario</h5>
        {sc && <div class="examiner-dispatch-text">{sc.dispatch}</div>}
        <VitalsGrid vitals={sc?.vitals ?? null} revealed={session.vitalsRevealed} />
      </div>
      <div class="side-block">
        <h5 class="side-title">The Big 5 <span class="side-count">{session.big5.filter(b => b.done).length}/5</span></h5>
        <Big5List items={session.big5} />
      </div>
      <div class="side-block">
        <h5 class="side-title">Critical criteria <span class="side-count">{session.crits.filter(c => c.violated).length} violations</span></h5>
        <CritList crits={session.crits} />
      </div>
    </aside>
  );
}

// ─── Chat thread ──────────────────────────────────────────────────────────────

function ChatThread({ messages, typing }: { messages: ExaminerSession["messages"]; typing: boolean }) {
  const bottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, typing]);

  return (
    <div class="examiner-thread">
      {messages.map(m => (
        <div key={m.id} class={`examiner-msg examiner-msg-${m.role}`}>
          <span class="msg-avatar">{m.role === "examiner" ? "EX" : m.role === "user" ? "YOU" : "·"}</span>
          <div class="msg-bubble">
            {m.text.split(/(\*[^*]+\*)/).map((part, i) =>
              part.startsWith("*") && part.endsWith("*")
                ? <em key={i}>{part.slice(1, -1)}</em>
                : part
            )}
          </div>
        </div>
      ))}
      {typing && (
        <div class="examiner-msg examiner-msg-examiner">
          <span class="msg-avatar">EX</span>
          <div class="msg-bubble typing-indicator"><span /><span /><span /></div>
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  );
}

function Composer({ onSend, onEnd, disabled }: { onSend: (text: string) => void; onEnd: () => void; disabled: boolean }) {
  const [text, setText] = useState("");
  const taRef = useRef<HTMLTextAreaElement>(null);

  function handleKey(e: KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  function submit() {
    const t = text.trim();
    if (!t || disabled) return;
    setText("");
    onSend(t);
    setTimeout(() => taRef.current?.focus(), 0);
  }

  return (
    <div class="examiner-composer-area">
      <div class="examiner-composer">
        <textarea
          ref={taRef}
          class="examiner-composer-input"
          placeholder="Verbalize your next action… e.g. 'I am taking BSI precautions. Is the scene safe?'"
          value={text}
          onInput={(e) => setText((e.target as HTMLTextAreaElement).value)}
          onKeyDown={handleKey}
          disabled={disabled}
          rows={2}
        />
        <button class="btn btn-primary examiner-send-btn" onClick={submit} disabled={disabled || !text.trim()}>
          Send ⏎
        </button>
      </div>
      <div class="examiner-end-row">
        <button class="btn btn-danger examiner-end-scenario-btn" onClick={onEnd}>
          End scenario &amp; get score →
        </button>
      </div>
    </div>
  );
}

// ─── Debrief ──────────────────────────────────────────────────────────────────

function DebriefScreen({ session, sheet, onRetry }: {
  session: ExaminerSession;
  sheet: Sheet;
  onRetry: () => void;
}) {
  const d = computeDebrief(session);
  const pass = d.verdict === "pass";

  return (
    <div class="examiner-debrief">
      <div class="debrief-eyebrow">Debrief · {sheet.id.toUpperCase()}</div>
      <div class="debrief-title">{sheet.title}</div>
      <div class={`debrief-verdict ${pass ? "verdict-pass" : "verdict-fail"}`}>
        {pass ? "Pass — would score" : "Needs work"}
      </div>
      {!pass && d.reasons.length > 0 && (
        <ul class="debrief-reasons">
          {d.reasons.map((r, i) => <li key={i}>{r}</li>)}
        </ul>
      )}

      <div class="debrief-score-row">
        <div class="debrief-score-tile">
          <div class="score-n">{d.big5Done}/{d.big5Total}</div>
          <div class="score-label">Big 5</div>
        </div>
        <div class="debrief-score-tile">
          <div class="score-n">{d.critHit}/{d.critTotal}</div>
          <div class="score-label">Criteria monitored</div>
        </div>
        <div class={`debrief-score-tile${d.violationCount > 0 ? " score-danger" : ""}`}>
          <div class="score-n">{d.violationCount}</div>
          <div class="score-label">Auto-fail violations</div>
        </div>
        <div class="debrief-score-tile">
          <div class="score-n">{fmtTime(d.elapsedSec)}</div>
          <div class="score-label">Time elapsed</div>
        </div>
      </div>

      <div class="debrief-breakdown">
        <section class="debrief-section">
          <h4>The Big 5</h4>
          <div class="breakdown-grid">
            {session.big5.map(b => (
              <div key={b.id} class={`breakdown-item ${b.done ? "item-pass" : "item-fail"}`}>
                <span class="item-glyph">{b.done ? "✓" : "✗"}</span>
                <div>
                  <div class="item-label">{b.what}</div>
                  {!b.done && <div class="item-hint">Example: "{b.quote}"</div>}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section class="debrief-section">
          <h4>Critical Criteria</h4>
          <div class="breakdown-grid">
            {session.crits.map(c => (
              <div key={c.idx} class={`breakdown-item ${c.violated ? "item-fail" : "item-safe"}`}>
                <span class="item-glyph">{c.violated ? "✗" : "✓"}</span>
                <div class="item-label">{c.body}</div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div class="debrief-actions">
        <button class="btn" onClick={onRetry}>Retry (new scenario)</button>
        <button class="btn btn-primary" onClick={() => navigate({ view: "sheet", sheetId: sheet.id, tab: "sheet" })}>
          Back to {sheet.shortTitle}
        </button>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ExaminerView({ sheet }: { sheet: Sheet }) {
  const state = appState.value;

  const activeSession = getActiveSession(state, sheet.id);
  const preSession = getPreSession(state, sheet.id);
  const currentSession = activeSession ?? preSession ?? null;

  const [sessionId, setSessionId] = useState<string | null>(currentSession?.id ?? null);
  const [typing, setTyping] = useState(false);
  const [loadingBegin, setLoadingBegin] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [elapsed, setElapsed] = useState(0);

  const session: ExaminerSession | null = sessionId
    ? (appState.value.examinerSessions?.[sessionId] ?? null)
    : null;

  useEffect(() => {
    if (!currentSession) {
      let newId = "";
      mutateState(draft => {
        const s = createSession(sheet.id, sheet.criticalCriteria);
        draft.examinerSessions = draft.examinerSessions ?? {};
        draft.examinerSessions[s.id] = s;
        newId = s.id;
      });
      save();
      setSessionId(newId);
    }
  }, [sheet.id]);

  useEffect(() => {
    if (session?.status === "active" && session.startedAt) {
      timerRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - session.startedAt!) / 1000));
      }, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [session?.status, session?.startedAt]);

  async function handleBegin() {
    if (!session) return;
    setLoadingBegin(true);
    setError(null);
    const cfg = getConfig();
    try {
      const { system, user } = buildScenarioPrompt(sheet);
      const raw = await callExaminerAI([{ role: "user", content: user }], system, cfg);
      let scenario: ExaminerSession["scenario"];
      try {
        const jsonStart = raw.indexOf("{");
        const jsonEnd = raw.lastIndexOf("}");
        scenario = JSON.parse(raw.slice(jsonStart, jsonEnd + 1)) as ExaminerSession["scenario"];
        const tlMatch = (sheet.timeLimit ?? "").match(/(\d+)/);
        scenario!.timeLimitSec = tlMatch ? parseInt(tlMatch[1]) * 60 : 0;
      } catch {
        throw new Error("Scenario generation failed — try again.");
      }

      const startedAt = Date.now();
      const systemPrompt = buildExaminerSystemPrompt({ ...session, scenario: scenario!, startedAt }, sheet);

      const openingRaw = await callExaminerAI(
        [{ role: "user", content: `Dispatch: ${scenario!.dispatch} Begin.` }],
        systemPrompt,
        cfg,
      );
      const parsed = parseAIResponse(openingRaw);

      mutateState(draft => {
        const s = draft.examinerSessions[session.id];
        s.scenario = scenario!;
        s.status = "active";
        s.startedAt = startedAt;
        s.messages.push({
          id: msgId(),
          role: "system",
          text: `Dispatch: ${scenario!.dispatch}`,
          ts: new Date().toISOString(),
        });
        s.messages.push({
          id: msgId(),
          role: "examiner",
          text: parsed.reply || openingRaw,
          ts: new Date().toISOString(),
        });
      });
      save();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Check your API key.");
    } finally {
      setLoadingBegin(false);
    }
  }

  async function handleSend(text: string) {
    if (!session || session.status !== "active") return;
    setTyping(true);
    setError(null);

    mutateState(draft => {
      draft.examinerSessions[session.id].messages.push({
        id: msgId(), role: "user", text, ts: new Date().toISOString(),
      });
    });
    save();

    const cfg = getConfig();
    try {
      const latestSession = appState.value.examinerSessions[session.id];
      const systemPrompt = buildExaminerSystemPrompt(latestSession, sheet);
      const history = latestSession.messages
        .filter(m => m.role !== "system")
        .map(m => ({ role: m.role === "examiner" ? "assistant" as const : "user" as const, content: m.text }));

      const raw = await callExaminerAI(history, systemPrompt, cfg);
      const parsed = parseAIResponse(raw);

      mutateState(draft => {
        const s = draft.examinerSessions[session.id];
        parsed.big5Detected.forEach(id => {
          const item = s.big5.find(b => b.id === id);
          if (item) item.done = true;
        });
        parsed.vitalsRevealed.forEach(key => { s.vitalsRevealed[key] = true; });
        parsed.violations.forEach(idx => {
          const crit = s.crits.find(c => c.idx === idx);
          if (crit) crit.violated = true;
        });
        parsed.violations.forEach(idx => {
          const crit = s.crits.find(c => c.idx === idx);
          if (crit) {
            s.messages.push({
              id: msgId(),
              role: "system",
              text: `⚠ Auto-fail behavior flagged: ${crit.body}`,
              ts: new Date().toISOString(),
            });
          }
        });
        s.messages.push({
          id: msgId(), role: "examiner", text: parsed.reply || raw, ts: new Date().toISOString(),
        });
      });
      save();
    } catch (err) {
      setError(err instanceof Error ? err.message : "API error — try again.");
    } finally {
      setTyping(false);
    }
  }

  function handleEnd() {
    if (!session) return;
    mutateState(draft => {
      const s = draft.examinerSessions[session.id];
      s.status = "debrief";
      s.endedAt = Date.now();
    });
    save();
  }

  function handleRetry() {
    let newId = "";
    mutateState(draft => {
      const s = createSession(sheet.id, sheet.criticalCriteria);
      draft.examinerSessions = draft.examinerSessions ?? {};
      draft.examinerSessions[s.id] = s;
      newId = s.id;
    });
    save();
    setSessionId(newId);
    setElapsed(0);
    setError(null);
  }

  if (!session) return <div class="loading">Loading…</div>;

  if (session.status === "debrief") {
    return <DebriefScreen session={session} sheet={sheet} onRetry={handleRetry} />;
  }

  if (session.status === "pre") {
    return (
      <div class="examiner-container examiner-pre">
        <PreCard sheet={sheet} onBegin={handleBegin} loading={loadingBegin} />
        {error && <div class="examiner-error">{error}</div>}
      </div>
    );
  }

  const timeLimitSec = session.scenario?.timeLimitSec ?? 0;
  const isUntimed = timeLimitSec === 0;
  const timeLeft = isUntimed ? null : Math.max(0, timeLimitSec - elapsed);

  return (
    <div class="examiner-container examiner-active">
      <div class="examiner-header">
        <div class="examiner-header-left">
          <span class="examiner-sheet-label">{sheet.id.toUpperCase()} — {sheet.shortTitle}</span>
        </div>
        <div class="examiner-header-right">
          {!isUntimed && (
            <span class={`examiner-timer${timeLeft !== null && timeLeft < 60 ? " timer-warning" : ""}`}>
              <span class={`timer-dot${session.status === "active" ? " timer-dot-active" : ""}`} />
              {timeLeft !== null ? fmtTime(timeLeft) : fmtTime(elapsed)}
            </span>
          )}
        </div>
      </div>
      {error && <div class="examiner-error">{error}</div>}
      <div class="examiner-body">
        <div class="examiner-chat-col">
          <ChatThread messages={session.messages} typing={typing} />
          <Composer onSend={handleSend} onEnd={handleEnd} disabled={typing} />
        </div>
        <Sidebar session={session} />
      </div>
    </div>
  );
}
