# AI Examiner Redesign — Design Spec
**Date:** 2026-05-24  
**Status:** Approved  
**Scope:** AI Examiner in ExaminerView.tsx — replaces the current sheet "chat" tab examiner experience

---

## Why

The current `ChatView` examiner mode is stateless — it primes a system prompt but does nothing to track what the student has verbalized, what vitals have been revealed, or whether any auto-fail behaviors have been triggered. The V2 prototype (index.html in the zip) shows a complete real-time simulation with:
- Big 5 sidebar tracking
- Progressive vital reveal
- Blurred critical criteria (unblur on violation)
- Debrief with pass/fail verdict

This spec replaces that with a proper implementation in the Preact/TypeScript codebase, using Claude's structured JSON output for behavior detection.

---

## Architecture

### New file: `src/views/ExaminerView.tsx`
Replaces the current "chat" tab on `SheetView`. Renders all three phases internally:
- **Pre** — centered pre-scenario card, Begin CTA
- **Active** — 2-column layout: chat thread (left) + sidebar (right), timer in header
- **Debrief** — pass/fail verdict, score row, step breakdown, read-only

### New file: `src/lib/examiner.ts`
All examiner-specific logic:
- `buildScenarioPrompt(sheet)` — generates the AI scenario-generation call
- `buildExaminerSystemPrompt(session, sheet)` — main system prompt for active roleplay
- `parseAIResponse(raw)` — extracts JSON + reply text from Claude output
- `createSession(sheetId, sheetTitle)` — returns a fresh `ExaminerSession`
- `computeDebrief(session)` — returns `{verdict, big5Done, critHit, violations, elapsed}`
- `SHEET_SEEDS` — minimal per-sheet seed data (timeLimit, typical chief complaint hint)
- `BIG5_ITEMS` — canonical Big 5 definitions (id, what, quote)

### State schema additions (`src/types/index.ts`)

```ts
interface ExaminerSession {
  id: string;
  sheetId: string;
  createdAt: string;
  status: 'pre' | 'active' | 'debrief';
  scenario: GeneratedScenario | null;       // null until Begin
  messages: ExaminerMessage[];
  big5: Big5Item[];
  crits: CritItem[];
  vitalsRevealed: VitalsRevealed;
  startedAt: number | null;                 // Date.now() when active begins
  endedAt: number | null;                   // Date.now() when debrief begins
}

interface GeneratedScenario {
  dispatch: string;
  patient: { age: number; sex: 'M' | 'F'; chiefComplaint: string; history: string };
  vitals: { hr: string; bp: string; rr: string; spo2: string; gcs: string };
  timeLimitSec: number;                     // from sheet.timeLimit (or 0 = untimed)
}

interface ExaminerMessage {
  id: string;
  role: 'user' | 'examiner' | 'system';
  text: string;
  ts: string;
}

interface Big5Item {
  id: 'scene_safety' | 'bsi' | 'patients' | 'moi' | 'resources';
  what: string;
  quote: string;
  done: boolean;
}

interface CritItem {
  idx: number;
  body: string;
  violated: boolean;
}

interface VitalsRevealed {
  hr: boolean; bp: boolean; rr: boolean; spo2: boolean; gcs: boolean;
}
```

`AppState` gains: `examinerSessions: Record<string, ExaminerSession>` (keyed by session id).  
Version stays at 2 — new key is additive; old clients ignore it.

---

## AI Protocol

### Scenario generation (on Begin)

System prompt (scenario role):
```
You are generating a realistic NREMT PA skill evaluation scenario for sheet: {sheet.title} ({sheet.id}).
Return ONLY valid JSON matching this exact schema:
{
  "dispatch": "<1-sentence radio dispatch>",
  "patient": { "age": <number>, "sex": "M"|"F", "chiefComplaint": "<brief CC>", "history": "<2-3 sentence SAMPLE history>" },
  "vitals": { "hr": "<value>", "bp": "<systolic/diastolic>", "rr": "<value>", "spo2": "<value>%", "gcs": "<number>" }
}
Constraints from seed: {SHEET_SEEDS[sheet.id]}
Vary demographics, chief complaint, and vitals each call — no two scenarios should be identical.
Keep vitals appropriate to the chief complaint and age. Do not include treatment decisions.
```

### Examiner roleplay (each user message)

System prompt (full, set at scenario start):
```
You are a Pennsylvania NREMT PA examiner conducting a live skills evaluation.
Sheet: {sheet.title} | Time limit: {timeLimitDisplay}
Patient: {age}{sex}, CC: {chiefComplaint}
Vitals (reveal ONLY what student explicitly requests):
  HR {hr}, BP {bp}, RR {rr}, SpO2 {spo2}, GCS {gcs}
History (reveal ONLY if student asks): {history}

Critical criteria being monitored (do NOT reveal to student):
{criticalCriteria list, numbered}

Big 5 being tracked: scene safety, BSI, number of patients, MOI/NOI, additional resources.

Rules:
- Speak only as examiner/patient — concise (≤60 words per reply)
- Use *italics* for objective observations (e.g., *patient appears diaphoretic*)
- Reveal vitals only when student asks for them by name
- Evaluate each student message for: which Big 5 items were verbalized, which vitals were requested, any critical criteria violations

ALWAYS return a JSON block followed by your reply:
{"big5_detected": ["scene_safety","bsi",...], "vitals_revealed": ["hr","bp",...], "violations": [<criterion index>,...]}

Then your examiner reply text.
```

`parseAIResponse(raw)` splits on the first `}` after the JSON block to extract both parts.  
Fallback: if JSON parse fails, treat as plain text reply with empty detection arrays.

### No API key state
ExaminerView checks for a configured API key before rendering the Begin button. If none:
- Shows a "🔑 API key required" card with link to Settings
- Includes privacy note: "Your conversation is sent to Anthropic's API to generate responses. It is never stored by or transmitted to us."

---

## UI Design

### Pre phase
Centered card (max 480px):
- Red eyebrow: `⚠ Live exam simulation`
- Title: "Ready when you are."
- Body: "Claude acts as your NREMT PA examiner. Your conversation goes directly to Anthropic's API — never stored by or shared with us."
- Blurred dispatch placeholder
- Sheet code + time limit tiles (2 cols)
- `Begin scenario →` primary button (triggers scenario generation, shows spinner)

### Active phase
Two-column layout (`1fr 320px`), collapses to single column on mobile:

**Left — chat thread:**
- Messages: EX (red avatar) / YOU (blue avatar) / system (dashed, italic)
- Typing indicator (3 dots pulse) while awaiting AI
- Composer: auto-grow textarea, Enter to send, Shift+Enter = newline
- "End scenario" red button (bottom right)
- Timer top-right: pulsing green dot + MM:SS; turns gray if untimed

**Right — sidebar (examiner mode only):**
1. Scenario block: dispatch text + 5-tile vitals grid
   - Hidden tiles: italic muted "not taken"
   - Revealed tiles: bold monospace value
2. Big 5 checklist: 5 items with quote examples; checked items get strikethrough + green ✓
3. Critical criteria: blurred with `filter: blur(4px)` + `user-select: none`
   - `X criteria monitored · hidden so this isn't a cheat sheet` footer
   - On violation: specific row unblurs, turns red, `Auto-fail behavior triggered` label added

### Debrief phase
- Eyebrow: `Debrief · {sheet.id}`
- Verdict badge: `Pass — would score` (green) or `Needs work` (red)
  - Pass = all 5 Big 5 verbalized AND zero violations
- Score row (4 tiles): Big 5 (N/5), Critical behaviors, Violations (red if >0), Time elapsed
- Breakdown:
  - Big 5: ✓ done / ✗ missed (with example quote to improve)
  - Critical criteria: ✓ monitored-safe / ○ missed / ✗ violated
- Actions: `Retry (new scenario)` · `Back to {sheet.title}` (primary)
- Session is **read-only** — no composer, no re-enter

---

## Routing

- `SheetView.tsx` "chat" tab: `<ExaminerView sheetId={sheet.id} sheet={sheet} />`
- On mount: find most-recent active session for this sheet, OR create new 'pre' session
- "Retry" creates a new session (old debrief session preserved in `examinerSessions`)
- Past sessions accessible via a "Past sessions" small link (shows list with timestamp + pass/fail badge)

---

## Session Lifecycle

```
createSession() → status:'pre'
  ↓ Begin pressed + AI generates scenario
status:'active' + scenario populated
  ↓ User sends messages, AI updates big5/vitals/crits
  ↓ Timer counts up
  ↓ "End scenario" OR time limit hit
status:'debrief' + endedAt set
  → Read-only. Can view, cannot send messages.
  → "Retry" → createSession() for same sheet
```

Only one session can be `status:'active'` per sheet at a time. On Begin, if another active session exists for the sheet it's moved to debrief.

---

## Testing

- Unit tests: `tests/examiner.test.ts` — `createSession`, `computeDebrief`, `parseAIResponse` (with sample JSON strings)
- E2E: Not required for this PR (requires AI key)
- Manual verification: Start scenario, send Big 5 verbalizations, request vitals, trigger a violation, end → check debrief score matches what was tracked
- Type check: `npx tsc --noEmit` must pass
- `npm test` must pass (unit tests green, coverage not regressed)

---

## Files Changed

| Action | File |
|--------|------|
| Create | `src/views/ExaminerView.tsx` |
| Create | `src/lib/examiner.ts` |
| Modify | `src/types/index.ts` — add ExaminerSession + related types |
| Modify | `src/store/appStore.ts` — add examinerSessions to AppState init + selectors |
| Modify | `src/views/SheetView.tsx` — "chat" tab renders ExaminerView |
| Create | `tests/examiner.test.ts` |
| Modify | `src/styles/` — examiner-specific CSS |
