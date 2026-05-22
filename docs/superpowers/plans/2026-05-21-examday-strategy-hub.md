# Exam Day Strategy Hub Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an Exam Day page with examiner-sourced strategy tips and a scenario hub linking to practice sheets, and enhance the examiner chat mode to simulate a realistic exam opening.

**Architecture:** New `ExamDayView` component registered at `#examday` route; nav button in `.topbar-menu-pop` dropdown in `index.html`; `buildSystemPrompt` in `src/lib/chat.ts` gains dispatch/equipment/Big5/hospital behaviours via two new constants. No new app state keys.

**Tech Stack:** Preact + TypeScript, Vite, Vitest, Playwright, GitHub CLI (`gh`)

---

## File map

| File | Action | What changes |
|---|---|---|
| `src/types/index.ts` | Modify | Add `"examday"` to `RouteView` union |
| `src/router/hashRouter.ts` | Modify | Handle `#examday` in `parseHash` |
| `src/views/ExamDayView.tsx` | Create | New pure render component |
| `css/styles.css` | Modify | Add styles for examday classes |
| `src/App.tsx` | Modify | Import + register `ExamDayView` in `VIEWS` |
| `index.html` | Modify | Add Exam Day button to cog menu |
| `src/lib/chat.ts` | Modify | Add `SHEET_DISPATCH`, `SHEET_EQUIPMENT`; update examiner prompt |
| `tests/lib/chat.test.ts` | Modify | Update broken test + add 6 new prompt tests |
| `tests/e2e/navigation.spec.js` | Modify | Add `#examday` smoke tests |

---

### Task 1: Add `"examday"` to the route type and router

**Files:**
- Modify: `src/types/index.ts:190-199`
- Modify: `src/router/hashRouter.ts:18-19`

- [ ] **Step 1: Add the view name to the RouteView union**

In `src/types/index.ts`, change:

```ts
export type RouteView =
  | "home"
  | "sheet"
  | "stats"
  | "settings"
  | "guide"
  | "chat"
  | "mnemonics"
  | "medconditions"
  | "notFound";
```

to:

```ts
export type RouteView =
  | "home"
  | "sheet"
  | "stats"
  | "settings"
  | "guide"
  | "examday"
  | "chat"
  | "mnemonics"
  | "medconditions"
  | "notFound";
```

- [ ] **Step 2: Handle `#examday` in `parseHash`**

In `src/router/hashRouter.ts`, change:

```ts
  if ((["home", "stats", "settings", "guide"] as string[]).includes(parts[0])) {
    return { view: parts[0] as RouteView };
  }
```

to:

```ts
  if ((["home", "stats", "settings", "guide", "examday"] as string[]).includes(parts[0])) {
    return { view: parts[0] as RouteView };
  }
```

(`writeHash` already handles `examday` via the `else if (r.view !== "home") h = r.view;` fallthrough — no change needed there.)

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 4: Commit**

```bash
git add src/types/index.ts src/router/hashRouter.ts
git commit -m "feat: add examday to RouteView and hash router"
```

---

### Task 2: Create `ExamDayView.tsx` + styles

**Files:**
- Create: `src/views/ExamDayView.tsx`
- Modify: `css/styles.css` (append at end, before last closing comment if any)

- [ ] **Step 1: Write the view component**

Create `src/views/ExamDayView.tsx`:

```tsx
import { navigate } from "../store/appStore";

const BIG_FIVE = [
  { num: 1, label: "Scene safe?", script: '"Is the scene safe to enter?"' },
  { num: 2, label: "BSI", script: '"I am taking BSI precautions." (gloves, eye protection)' },
  { num: 3, label: "Number of patients", script: '"I see one patient."' },
  { num: 4, label: "MOI / NOI", script: '"Mechanism of injury is…" or "Nature of illness is…"' },
  { num: 5, label: "Additional resources", script: '"Do I need additional resources?"' },
];

type Scenario = {
  name: string;
  equipment: string;
  sheetId: string | null;
  issueUrl: string | null;
};

const SCENARIOS: Scenario[] = [
  { name: "O2 Administration", equipment: "Non-rebreather mask, O2 cylinder, regulator", sheetId: "e204", issueUrl: null },
  { name: "CPR / AED", equipment: "AED, CPR barrier, gloves", sheetId: "e215", issueUrl: null },
  { name: "Tourniquet / Bleeding Control", equipment: "Tourniquet, trauma dressings, gloves", sheetId: "e213", issueUrl: null },
  { name: "Joint Immobilization", equipment: "SAM splints, padding, bandaging", sheetId: "e216", issueUrl: null },
  { name: "Long Bone Immobilization", equipment: "Traction splint or board splints", sheetId: "e217", issueUrl: null },
  { name: "OPA / BVM Ventilation", equipment: "BVM, OPA set, O2 source", sheetId: "e203", issueUrl: null },
  { name: "CPAP", equipment: "CPAP mask, manometer, O2 source", sheetId: null, issueUrl: null },
  { name: "12-Lead ECG", equipment: "12-lead monitor, leads, electrodes", sheetId: null, issueUrl: null },
  { name: "Suction", equipment: "Suction unit, yankauer catheter", sheetId: null, issueUrl: null },
  { name: "Vitals (Pulse, BP, RR)", equipment: "BP cuff, stethoscope, watch", sheetId: null, issueUrl: null },
];

export function ExamDayView() {
  return (
    <div class="examday-view">
      <h1>Exam Day</h1>
      <p class="examday-intro">Tips from a PA NREMT examiner. Know these before you walk in the room.</p>

      <section class="examday-section">
        <h2>Dispatch strategy</h2>
        <p class="examday-callout">Dispatches are vague — write down what you hear immediately.</p>
        <ul class="examday-list">
          <li>Listen for age, chief complaint, and mechanism of injury.</li>
          <li>Don't assume the scenario from the dispatch alone.</li>
          <li>Note-taking on arrival is expected and professional.</li>
        </ul>
      </section>

      <section class="examday-section">
        <h2>Read the room</h2>
        <p class="examday-callout">Equipment in the room is a clue — look before you approach.</p>
        <ul class="examday-list">
          <li>The equipment set up in the station often signals the scenario type.</li>
          <li>Example: CPAP mask + O2 cylinder → CPAP station. BP cuff + stethoscope → Vitals.</li>
          <li>If O2 is already assembled, leave it assembled.</li>
          <li>Do a quick visual scan before beginning.</li>
        </ul>
      </section>

      <section class="examday-section">
        <h2>The Big 5</h2>
        <p class="examday-section-desc">Always verbalize these before beginning any skill. The examiner scores only what they hear.</p>
        <div class="big-five-list">
          {BIG_FIVE.map((item) => (
            <div key={item.num} class="big-five-card">
              <span class="big-five-num">{item.num}</span>
              <div class="big-five-body">
                <strong class="big-five-label">{item.label}</strong>
                <div class="big-five-script">{item.script}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section class="examday-section">
        <h2>During the station</h2>
        <ul class="examday-list">
          <li>Talk to the patient. Talk to family members. Announce every action to the examiner.</li>
          <li>Request all information — vital signs, patient history, allergies.</li>
          <li><strong>Silence = not done.</strong> The examiner can only score what they hear.</li>
        </ul>
      </section>

      <section class="examday-section">
        <h2>Wrap-up: hospital transport</h2>
        <ul class="examday-list">
          <li>At the end the examiner may ask: <em>"Where would you transport this patient?"</em></li>
          <li>Know trauma center vs. stroke center vs. STEMI center criteria for your region.</li>
          <li>If unsure: say "the nearest appropriate facility" and briefly justify why.</li>
        </ul>
      </section>

      <section class="examday-section">
        <h2>Logistics</h2>
        <ul class="examday-list">
          <li>Pennsylvania uses a <strong>single-scenario format</strong> — not the older multi-station rotation.</li>
          <li>You can often <strong>retry the same night</strong> if you fail — ask the examiner immediately after the debrief.</li>
          <li>Do not leave the testing site before asking about a re-attempt.</li>
        </ul>
      </section>

      <section class="examday-section">
        <h2>Possible scenarios (PA format)</h2>
        <p class="examday-section-desc">Click a linked card to jump straight to that skill sheet.</p>
        <div class="scenario-grid">
          {SCENARIOS.map((s) => (
            <div
              key={s.name}
              class={`scenario-card${s.sheetId ? " scenario-card--linked" : " scenario-card--soon"}`}
              role={s.sheetId ? "button" : undefined}
              tabIndex={s.sheetId ? 0 : undefined}
              onClick={s.sheetId ? () => navigate({ view: "sheet", sheetId: s.sheetId!, tab: "sheet" }) : undefined}
              onKeyDown={s.sheetId ? (e) => {
                if (e.key === "Enter" || e.key === " ") navigate({ view: "sheet", sheetId: s.sheetId!, tab: "sheet" });
              } : undefined}
            >
              <div class="scenario-name">{s.name}</div>
              <div class="scenario-equipment">{s.equipment}</div>
              {s.sheetId
                ? <span class="scenario-badge scenario-badge--go">Practice →</span>
                : <span class="scenario-badge scenario-badge--soon">Coming soon</span>
              }
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
```

- [ ] **Step 2: Add CSS for examday classes**

Append to the end of `css/styles.css`:

```css
/* ─── Exam Day view ──────────────────────────────────────────────────────── */
.examday-view { max-width: 760px; }
.examday-intro {
  color: var(--text-dim);
  margin-bottom: 28px;
  max-width: 640px;
  line-height: 1.6;
}
.examday-section {
  margin-bottom: 32px;
}
.examday-section h2 {
  font-size: 16px;
  font-weight: 700;
  color: var(--text);
  margin: 0 0 10px;
}
.examday-callout {
  background: var(--bg-elev);
  border: 1px solid var(--border);
  border-left: 3px solid var(--accent);
  border-radius: var(--radius-sm);
  padding: 9px 14px;
  margin-bottom: 10px;
  font-size: 14px;
  color: var(--text-dim);
  font-style: italic;
}
.examday-section-desc {
  font-size: 14px;
  color: var(--text-dim);
  margin-bottom: 12px;
}
.examday-list {
  margin: 0;
  padding-left: 20px;
  color: var(--text-dim);
  font-size: 14px;
  line-height: 1.7;
}
.examday-list li { margin: 3px 0; }
.examday-list strong { color: var(--text); }
.examday-list em { color: var(--text); }

.big-five-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.big-five-card {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  background: var(--bg-elev);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 10px 14px;
}
.big-five-num {
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--accent);
  color: #fff;
  font-size: 13px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}
.big-five-body { flex: 1; }
.big-five-label {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
  margin-bottom: 2px;
}
.big-five-script {
  font-size: 13px;
  color: var(--text-dim);
  font-style: italic;
}

.scenario-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 10px;
}
.scenario-card {
  background: var(--bg-elev);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.scenario-card--linked {
  cursor: pointer;
  transition: border-color 0.15s, transform 0.1s;
}
.scenario-card--linked:hover { border-color: var(--accent); transform: translateY(-1px); }
.scenario-card--linked:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
.scenario-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
}
.scenario-equipment {
  font-size: 12px;
  color: var(--text-dim);
  line-height: 1.4;
}
.scenario-badge {
  display: inline-block;
  font-size: 11px;
  font-weight: 600;
  padding: 2px 7px;
  border-radius: 10px;
  align-self: flex-start;
  margin-top: auto;
}
.scenario-badge--go {
  background: color-mix(in srgb, var(--accent) 15%, transparent);
  color: var(--accent);
}
.scenario-badge--soon {
  background: var(--bg-elev-2);
  color: var(--text-mute);
}

@media (max-width: 600px) {
  .scenario-grid { grid-template-columns: 1fr 1fr; }
  .big-five-card { padding: 8px 10px; }
}
```

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 4: Run unit tests**

```bash
npm test
```

Expected: 229 tests passing (new view has no unit tests — it's a pure render with no logic).

- [ ] **Step 5: Commit**

```bash
git add src/views/ExamDayView.tsx css/styles.css
git commit -m "feat: add ExamDayView with strategy tips, Big 5, and scenario hub"
```

---

### Task 3: Wire up the route in App.tsx and index.html

**Files:**
- Modify: `src/App.tsx:1-28`
- Modify: `index.html:42-46`

- [ ] **Step 1: Register the view in App.tsx**

In `src/App.tsx`, add the import after the existing view imports:

```ts
import { ExamDayView } from "./views/ExamDayView";
```

Then add `examday` to the `VIEWS` map:

```ts
const VIEWS: Partial<Record<Route["view"], () => JSX.Element | null>> = {
  home:          () => <HomeView />,
  sheet:         () => <SheetView />,
  stats:         () => <StatsView />,
  guide:         () => <GuideView />,
  examday:       () => <ExamDayView />,
  settings:      () => <SettingsView />,
  mnemonics:     () => <EmsMnemonicsView />,
  medconditions: () => <MedConditionsView />,
  chat:          () => <ChatView />,
};
```

- [ ] **Step 2: Add Exam Day button to the cog dropdown in index.html**

In `index.html`, change:

```html
        <div class="topbar-menu-pop" role="menu">
          <button data-nav="stats" type="button">Stats</button>
          <button data-nav="settings" type="button">Backup &amp; sync</button>
          <button data-nav="guide" type="button">Guide</button>
        </div>
```

to:

```html
        <div class="topbar-menu-pop" role="menu">
          <button data-nav="stats" type="button">Stats</button>
          <button data-nav="settings" type="button">Backup &amp; sync</button>
          <button data-nav="guide" type="button">Guide</button>
          <button data-nav="examday" type="button">Exam Day</button>
        </div>
```

- [ ] **Step 3: Add link to Exam Day from GuideView**

In `src/views/GuideView.tsx`, find the closing `</div>` of the `GuideView` return and add a tip before it (after the `guide-upcoming` section):

```tsx
      <div class="guide-tip" style={{ marginTop: "24px" }}>
        <strong>Exam Day tips: </strong>
        Going to the exam soon?{" "}
        <button
          class="link-btn"
          type="button"
          onClick={() => navigate({ view: "examday" })}
        >
          Read the Exam Day guide
        </button>
        {" "}for dispatcher strategy, the Big 5, and a map of all PA scenarios.
      </div>
```

Add the `navigate` import at the top of `GuideView.tsx`:

```ts
import { navigate } from "../store/appStore";
```

Also add a CSS rule for `.link-btn` (append to `css/styles.css` examday block):

```css
.link-btn {
  background: none;
  border: none;
  color: var(--accent);
  cursor: pointer;
  font: inherit;
  padding: 0;
  text-decoration: underline;
}
```

- [ ] **Step 4: Type-check**

```bash
npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 5: Run tests**

```bash
npm test
```

Expected: all 229 passing.

- [ ] **Step 6: Commit**

```bash
git add src/App.tsx index.html src/views/GuideView.tsx css/styles.css
git commit -m "feat: register #examday route, add cog menu button and Guide link"
```

---

### Task 4: Enhance the examiner chat system prompt

**Files:**
- Modify: `src/lib/chat.ts:138-156`

- [ ] **Step 1: Add the dispatch and equipment constants above `buildSystemPrompt`**

In `src/lib/chat.ts`, insert directly above the `export function buildSystemPrompt` line:

```ts
const SHEET_DISPATCH: Record<string, string> = {
  e201: "You are responding to a 28-year-old male — reported fall from a ladder.",
  e202: "You are responding to a 67-year-old female — difficulty breathing.",
  e203: "You are responding to an unresponsive adult — bystander CPR in progress.",
  e204: "You are responding to a 72-year-old male — shortness of breath.",
  e211: "You are responding to a 45-year-old female — MVC, ambulatory at scene.",
  e212: "You are responding to a 33-year-old male — MVC, found supine.",
  e213: "You are responding to a 19-year-old male — laceration to the thigh.",
  e215: "You are responding to a 58-year-old male — found unresponsive.",
  e216: "You are responding to a 40-year-old female — twisted ankle.",
  e217: "You are responding to a 25-year-old male — reported arm injury.",
};

const SHEET_EQUIPMENT: Record<string, string> = {
  e201: "You notice a cervical collar, long spine board, and trauma dressings set up in the room.",
  e202: "You notice a stethoscope, pulse oximeter, and blood pressure cuff set up in the room.",
  e203: "You notice a bag-valve mask, OPA set, and O2 source set up in the room.",
  e204: "You notice a non-rebreather mask and O2 cylinder with regulator set up in the room.",
  e211: "You notice a cervical collar and short spine board (KED) set up in the room.",
  e212: "You notice a cervical collar, long spine board, and straps set up in the room.",
  e213: "You notice a tourniquet, trauma dressings, and gloves set up in the room.",
  e215: "You notice an AED, CPR barrier device, and gloves set up in the room.",
  e216: "You notice SAM splints, padding, and bandaging material set up in the room.",
  e217: "You notice board splints and padding set up in the room.",
};
```

- [ ] **Step 2: Replace the examiner branch of `buildSystemPrompt`**

Replace the existing examiner branch (lines 139–156 in `src/lib/chat.ts`):

```ts
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
```

with:

```ts
  if (mode === "examiner") {
    const sheetName = sheet ? sheet.title : "the skill station";
    const steps = sheet ? buildStepList(sheet) : "";
    const critical = sheet ? buildCriticalList(sheet) : "";
    const dispatch = sheet
      ? (SHEET_DISPATCH[sheet.id] ?? "You are responding to a patient who needs assistance.")
      : "You are responding to a patient who needs assistance.";
    const equipment = sheet ? (SHEET_EQUIPMENT[sheet.id] ?? "") : "";
    return [
      `You are an NREMT psychomotor examiner conducting a skill assessment at the EMT-Basic level.`,
      sheet ? `You are evaluating the candidate on: ${sheetName}` : "",
      steps ? `\nComplete skill sheet (what the candidate must perform):\n${steps}` : "",
      critical ? `\nCritical Criteria (automatic failure if any are missed):\n${critical}` : "",
      `\nInstructions:`,
      `- Open with this exact dispatch followed by the equipment hint: "Dispatch: ${dispatch} Scene is secure. Begin when ready."`,
      equipment ? `- Immediately after the dispatch line, add: "${equipment}"` : "",
      `- BEFORE evaluating any skill steps, the candidate must verbalize the Big 5: (1) scene safety, (2) BSI precautions, (3) number of patients, (4) mechanism of injury or nature of illness, (5) whether additional resources are needed. If the candidate skips these and jumps directly to treatment, respond: "You've entered the scene — what do you want to establish first?"`,
      `- As the candidate narrates each action they would take, check it against the skill sheet.`,
      `- Respond with brief evaluative feedback: "Good.", "Continue.", or ask a clarifying question if something is unclear.`,
      `- If the candidate skips a step, you may give a subtle cue but do not give away the answer.`,
      `- After the candidate says they are done, or after all steps are addressed, provide a debrief: list steps performed correctly, steps missed, and whether any Critical Criteria were missed.`,
      `- After the debrief, ask: "Where would you transport this patient, and why?" Accept any answer that names an appropriate facility type with a brief justification.`,
      `- If any Critical Criteria were missed, end with: "You may request a re-attempt from the testing coordinator."`,
      `- Maintain examiner character throughout — be professional and neutral.`,
    ].filter(Boolean).join("\n");
  }
```

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/chat.ts
git commit -m "feat: enhance examiner prompt with dispatch, equipment hint, Big 5 gate, hospital Q"
```

---

### Task 5: Update and add tests for `buildSystemPrompt`

**Files:**
- Modify: `tests/lib/chat.test.ts:232-248`

- [ ] **Step 1: Confirm the existing failing test**

Run:

```bash
npm test -- --reporter=verbose 2>&1 | grep -A 3 "buildSystemPrompt"
```

The test `examiner mode with no sheet uses generic station name` will fail because the old "skill station" phrasing no longer appears in the examiner prompt when there's no sheet. (The `sheetName` variable is still set to `"the skill station"` but the old `"Begin the ${sheetName} station."` instruction is gone.)

- [ ] **Step 2: Fix the broken test and add new ones**

Replace the entire `describe("ChatStore – buildSystemPrompt", ...)` block (lines 211–248) in `tests/lib/chat.test.ts`:

```ts
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

  it("examiner mode includes dispatch opening", () => {
    const prompt = buildSystemPrompt("examiner", sheet, "");
    expect(prompt).toContain("Dispatch:");
    expect(prompt).toContain("Begin when ready");
  });

  it("examiner mode includes equipment hint when sheet has one", () => {
    // createMockSheet() returns id "e201" — verify the equipment map covers it
    const prompt = buildSystemPrompt("examiner", sheet, "");
    // The prompt instructs the AI to describe the room
    expect(prompt).toMatch(/cervical collar|spine board|non-rebreather|BVM|AED|SAM splint|tourniquet/i);
  });

  it("examiner mode includes Big 5 gate instruction", () => {
    const prompt = buildSystemPrompt("examiner", sheet, "");
    expect(prompt).toContain("Big 5");
    expect(prompt).toContain("You've entered the scene");
  });

  it("examiner mode includes hospital transport question", () => {
    const prompt = buildSystemPrompt("examiner", sheet, "");
    expect(prompt).toContain("Where would you transport");
  });

  it("examiner mode includes re-attempt note", () => {
    const prompt = buildSystemPrompt("examiner", sheet, "");
    expect(prompt).toContain("re-attempt");
  });

  it("examiner mode includes critical criteria", () => {
    const prompt = buildSystemPrompt("examiner", sheet, "");
    expect(prompt).toContain("Failure to take appropriate PPE precautions");
  });

  it("examiner mode with no sheet omits sheet-specific content", () => {
    const prompt = buildSystemPrompt("examiner", null, "");
    expect(prompt).not.toContain("undefined");
    expect(prompt).toContain("Dispatch:");
  });
});
```

- [ ] **Step 3: Check what ID `createMockSheet()` returns**

Run:

```bash
grep -n "createMockSheet\|id:" /Users/jschnur/dev/nremt/tests/vitest.fixtures.ts | head -15
```

If the mock sheet's `id` is not one of the keys in `SHEET_EQUIPMENT` (e201–e217), the equipment hint test will fail because `SHEET_EQUIPMENT[sheet.id]` will be `undefined` and the equipment line will be filtered out. In that case, update the equipment hint test to check for the generic fallback instead:

```ts
  it("examiner mode includes equipment hint instruction when sheet has mapping", () => {
    const prompt = buildSystemPrompt("examiner", sheet, "");
    // Either a known equipment description or the dispatch line is present
    expect(prompt).toContain("Dispatch:");
  });
```

- [ ] **Step 4: Run the tests**

```bash
npm test
```

Expected: all tests passing (count increases by number of new tests added).

- [ ] **Step 5: Commit**

```bash
git add tests/lib/chat.test.ts
git commit -m "test: update examiner prompt tests for dispatch/Big5/hospital/retry behaviours"
```

---

### Task 6: Add E2E smoke tests for `#examday`

**Files:**
- Modify: `tests/e2e/navigation.spec.js`

- [ ] **Step 1: Append examday tests to navigation.spec.js**

At the end of `tests/e2e/navigation.spec.js`, before the final closing `});` of the describe block (or as a new describe block if the file structure warrants it), add:

```js
test.describe("Exam Day view", () => {
  test("navigates to Exam Day via cog menu", async ({ page }) => {
    await page.goto(".");
    await page.locator("#topbar-menu-btn").click();
    await page.locator('[data-nav="examday"]').click();
    await expect(page).toHaveURL(/#examday/);
    await expect(page.locator("h1")).toContainText("Exam Day");
  });

  test("navigates to Exam Day via direct hash", async ({ page }) => {
    await page.goto("./#examday");
    await expect(page.locator("h1")).toContainText("Exam Day");
  });

  test("displays 5 Big 5 cards", async ({ page }) => {
    await page.goto("./#examday");
    const cards = page.locator(".big-five-card");
    await expect(cards).toHaveCount(5);
  });

  test("scenario cards for linked sheets navigate to sheet view", async ({ page }) => {
    await page.goto("./#examday");
    const linkedCard = page.locator(".scenario-card--linked").first();
    await linkedCard.click();
    await expect(page).toHaveURL(/.*sheet.*/);
  });

  test("coming-soon scenario cards do not navigate", async ({ page }) => {
    await page.goto("./#examday");
    const soonCard = page.locator(".scenario-card--soon").first();
    await soonCard.click();
    await expect(page).toHaveURL(/#examday/);
  });
});
```

- [ ] **Step 2: Run the E2E tests**

```bash
npm run test:e2e:browser
```

Expected: all existing tests pass; new examday tests pass.

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/navigation.spec.js
git commit -m "test(e2e): add smoke tests for #examday route and scenario cards"
```

---

### Task 7: File GitHub issues for missing scenario sheets

**Files:** GitHub (remote only)

- [ ] **Step 1: File the CPAP issue**

```bash
gh issue create \
  --repo jordan-schnur/emt-skill-station \
  --title "Add CPAP scenario skill sheet" \
  --body "$(cat <<'EOF'
## Context

The PA NREMT exam uses a single-scenario format. CPAP is one of the 10 possible scenarios but has no skill sheet in the app.

This is tracked in the Exam Day strategy hub (`src/views/ExamDayView.tsx`), where CPAP appears as a "Coming soon" card.

## Work needed

- Source the NREMT CPAP psychomotor skill sheet (check NREMT.org or state-specific PDFs)
- Add the step data to `preprocess.py` as a new entry in `SHEETS`
- Re-run `python3 preprocess.py` to regenerate `data.json` and `js/data.js`
- Update the `CPAP` scenario card in `ExamDayView.tsx` — set `sheetId` to the new sheet ID and clear `issueUrl`

## Equipment in room
CPAP mask, manometer, O2 source

## Related spec
`docs/superpowers/specs/2026-05-21-examday-strategy-hub-design.md`
EOF
)"
```

Note the issue number returned (e.g. `#42`).

- [ ] **Step 2: File the 12-Lead ECG issue**

```bash
gh issue create \
  --repo jordan-schnur/emt-skill-station \
  --title "Add 12-Lead ECG scenario skill sheet" \
  --body "$(cat <<'EOF'
## Context

The PA NREMT exam uses a single-scenario format. 12-Lead ECG is one of the 10 possible scenarios but has no skill sheet in the app.

This is tracked in the Exam Day strategy hub (`src/views/ExamDayView.tsx`), where 12-Lead ECG appears as a "Coming soon" card.

## Work needed

- Source the NREMT 12-Lead ECG psychomotor skill sheet
- Add step data to `preprocess.py`
- Re-run `python3 preprocess.py`
- Update the `12-Lead ECG` scenario card in `ExamDayView.tsx`

## Equipment in room
12-lead monitor, leads, electrodes

## Related spec
`docs/superpowers/specs/2026-05-21-examday-strategy-hub-design.md`
EOF
)"
```

- [ ] **Step 3: File the Suction issue**

```bash
gh issue create \
  --repo jordan-schnur/emt-skill-station \
  --title "Add Suction scenario skill sheet" \
  --body "$(cat <<'EOF'
## Context

The PA NREMT exam uses a single-scenario format. Suctioning is one of the 10 possible scenarios but has no skill sheet in the app.

This is tracked in the Exam Day strategy hub (`src/views/ExamDayView.tsx`), where Suction appears as a "Coming soon" card.

## Work needed

- Source the NREMT Suctioning psychomotor skill sheet
- Add step data to `preprocess.py`
- Re-run `python3 preprocess.py`
- Update the `Suction` scenario card in `ExamDayView.tsx`

## Equipment in room
Suction unit, rigid yankauer catheter

## Related spec
`docs/superpowers/specs/2026-05-21-examday-strategy-hub-design.md`
EOF
)"
```

- [ ] **Step 4: File the Vitals issue**

```bash
gh issue create \
  --repo jordan-schnur/emt-skill-station \
  --title "Add Vitals scenario skill sheet (Pulse, BP, RR)" \
  --body "$(cat <<'EOF'
## Context

The PA NREMT exam uses a single-scenario format. Vitals assessment (pulse, blood pressure, respiratory rate) is one of the 10 possible scenarios but has no dedicated skill sheet in the app.

This is tracked in the Exam Day strategy hub (`src/views/ExamDayView.tsx`), where Vitals appears as a "Coming soon" card.

## Work needed

- Source the NREMT Vitals psychomotor skill sheet
- Add step data to `preprocess.py`
- Re-run `python3 preprocess.py`
- Update the `Vitals (Pulse, BP, RR)` scenario card in `ExamDayView.tsx`

## Equipment in room
BP cuff, stethoscope, watch

## Related spec
`docs/superpowers/specs/2026-05-21-examday-strategy-hub-design.md`
EOF
)"
```

- [ ] **Step 5: Update issueUrl in ExamDayView.tsx**

After the four issues are created, note their URLs (printed by `gh issue create`). Update the four "Coming soon" entries in `src/views/ExamDayView.tsx`'s `SCENARIOS` array:

```ts
  { name: "CPAP", equipment: "CPAP mask, manometer, O2 source", sheetId: null, issueUrl: "https://github.com/jordan-schnur/emt-skill-station/issues/XX" },
  { name: "12-Lead ECG", equipment: "12-lead monitor, leads, electrodes", sheetId: null, issueUrl: "https://github.com/jordan-schnur/emt-skill-station/issues/XX" },
  { name: "Suction", equipment: "Suction unit, yankauer catheter", sheetId: null, issueUrl: "https://github.com/jordan-schnur/emt-skill-station/issues/XX" },
  { name: "Vitals (Pulse, BP, RR)", equipment: "BP cuff, stethoscope, watch", sheetId: null, issueUrl: "https://github.com/jordan-schnur/emt-skill-station/issues/XX" },
```

(Replace `XX` with the actual issue numbers.)

Also update the `scenario-card--soon` click handler in `ExamDayView.tsx` to open the issue URL when `issueUrl` is set:

```tsx
              onClick={s.sheetId
                ? () => navigate({ view: "sheet", sheetId: s.sheetId!, tab: "sheet" })
                : s.issueUrl
                  ? () => window.open(s.issueUrl!, "_blank", "noopener")
                  : undefined}
```

- [ ] **Step 6: Type-check and run tests**

```bash
npx tsc --noEmit && npm test
```

Expected: zero errors, all tests passing.

- [ ] **Step 7: Commit**

```bash
git add src/views/ExamDayView.tsx
git commit -m "feat: link coming-soon scenario cards to GitHub issues"
```

---

### Task 8: Final verification

- [ ] **Step 1: Run the full test suite**

```bash
npm run test:ci
```

Expected: unit tests + type check pass. E2E tests pass.

- [ ] **Step 2: Manual smoke test in the browser**

```bash
npm run dev
```

Check:
- Open the cog menu (⚙) — "Exam Day" button appears
- Click it → `#examday` route loads, `<h1>Exam Day</h1>` visible
- Scroll through all 6 sections (Dispatch, Read the room, Big 5, During, Hospital, Logistics)
- Big 5 shows 5 numbered cards
- Scenario grid: 6 linked cards (hover shows accent border + pointer), 4 "Coming soon" cards (muted, no cursor)
- Click "O2 Administration" card → navigates to `#sheet/e204/sheet`
- Navigate back (`#examday`), click a "Coming soon" card → stays on Exam Day (or opens GitHub issue if URLs updated)
- Open Guide (`#guide`) → "Exam Day guide" link appears at the bottom; click it → `#examday`
- Open an examiner chat on any sheet → first AI message contains "Dispatch:" and equipment description
- Type something other than the Big 5 first → examiner prompts "You've entered the scene — what do you want to establish first?"

- [ ] **Step 3: Final commit if any fixes were needed**

```bash
git add -p
git commit -m "fix: address issues found during manual smoke test"
```
