# T-024 Merged Reference View Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Consolidate `EmsMnemonicsView`, `MedConditionsView`, and `BlsMedsView` into a single `ReferenceView` at `/reference/<tab>` with shared search/filter toolbar, keeping old routes as redirects.

**Architecture:** New `"reference"` route with `referenceTab` sub-tab field. `ReferenceView.tsx` renders one of three mode components. `ReferenceToolbar` is a shared search+category-pills component consumed by all three modes. Old routes redirect at the router layer. Compare sub-tab removed; replaced with inline modal.

**Tech Stack:** Preact + TypeScript + `@preact/signals`, Vitest + `@testing-library/preact`, Playwright for E2E.

**Parallelism note:** Tasks 1–3 must be done sequentially. Tasks 4, 5, 6 can be dispatched in parallel after Task 3. Task 7 requires Task 4. Task 8 requires Tasks 3–6.

---

## File Map

| Action | File |
|--------|------|
| Modify | `src/types/index.ts` |
| Modify | `src/router/router.ts` |
| Modify | `src/App.tsx` |
| Modify | `index.html` |
| Create | `src/views/ReferenceView.tsx` |
| Create | `src/views/reference/ConditionsMode.tsx` |
| Create | `src/views/reference/MnemonicsMode.tsx` |
| Create | `src/views/reference/MedsMode.tsx` |
| Create | `src/components/ReferenceToolbar.tsx` |
| Create | `src/components/ConditionCompareModal.tsx` |
| Modify | `src/data/medical_conditions.ts` (add `compareWith` field to conditions) |
| Create | `tests/components/ReferenceToolbar.test.tsx` |
| Create | `tests/views/ReferenceView.test.tsx` |
| Modify | `tests/lib/hashRouter.test.ts` |
| Create | `tests/e2e/reference.spec.js` |

---

## Task 1: Types + Router

**Files:**
- Modify: `src/types/index.ts`
- Modify: `src/router/router.ts`
- Modify: `tests/lib/hashRouter.test.ts`

### Step 1.1: Add router tests (they will fail until Step 1.3)

Open `tests/lib/hashRouter.test.ts` and append this block at the end of the file:

```ts
describe("router — reference route", () => {
  beforeEach(() => {
    window.location.hash = "";
  });

  it("parses /reference with no tab as conditions", () => {
    window.location.hash = "#reference";
    const route = parseHash();
    expect(route).toMatchObject({ view: "reference", referenceTab: "conditions" });
  });

  it("parses /reference/mnemonics", () => {
    window.location.hash = "#reference/mnemonics";
    const route = parseHash();
    expect(route).toMatchObject({ view: "reference", referenceTab: "mnemonics" });
  });

  it("parses /reference/meds", () => {
    window.location.hash = "#reference/meds";
    const route = parseHash();
    expect(route).toMatchObject({ view: "reference", referenceTab: "meds" });
  });

  it("parses /reference/mnemonics/quiz/<id>", () => {
    window.location.hash = "#reference/mnemonics/quiz/opqrst";
    const route = parseHash();
    expect(route).toMatchObject({
      view: "reference",
      referenceTab: "mnemonics",
      referenceCardId: "opqrst",
    });
  });

  it("redirects old /mnemonics to reference/mnemonics", () => {
    window.location.hash = "#mnemonics";
    const route = parseHash();
    expect(route).toMatchObject({ view: "reference", referenceTab: "mnemonics" });
  });

  it("redirects old /medconditions to reference/conditions", () => {
    window.location.hash = "#medconditions";
    const route = parseHash();
    expect(route).toMatchObject({ view: "reference", referenceTab: "conditions" });
  });

  it("redirects old /blsmeds to reference/meds", () => {
    window.location.hash = "#blsmeds";
    const route = parseHash();
    expect(route).toMatchObject({ view: "reference", referenceTab: "meds" });
  });
});

describe("writePath — reference route", () => {
  it("writes /reference/conditions for conditions tab", () => {
    const calls: string[] = [];
    const orig = window.history.pushState.bind(window.history);
    window.history.pushState = (_: unknown, __: string, url: string) => { calls.push(url); orig(_, __, url); };
    writeHash({ view: "reference", referenceTab: "conditions" });
    expect(calls.at(-1)).toContain("/reference/conditions");
    window.history.pushState = orig;
  });

  it("writes /reference/mnemonics for mnemonics tab", () => {
    const calls: string[] = [];
    const orig = window.history.pushState.bind(window.history);
    window.history.pushState = (_: unknown, __: string, url: string) => { calls.push(url); orig(_, __, url); };
    writeHash({ view: "reference", referenceTab: "mnemonics" });
    expect(calls.at(-1)).toContain("/reference/mnemonics");
    window.history.pushState = orig;
  });

  it("writes /reference/mnemonics/quiz/<id> when referenceCardId set", () => {
    const calls: string[] = [];
    const orig = window.history.pushState.bind(window.history);
    window.history.pushState = (_: unknown, __: string, url: string) => { calls.push(url); orig(_, __, url); };
    writeHash({ view: "reference", referenceTab: "mnemonics", referenceCardId: "opqrst" });
    expect(calls.at(-1)).toContain("/reference/mnemonics/quiz/opqrst");
    window.history.pushState = orig;
  });

  it("writes /reference/meds for meds tab", () => {
    const calls: string[] = [];
    const orig = window.history.pushState.bind(window.history);
    window.history.pushState = (_: unknown, __: string, url: string) => { calls.push(url); orig(_, __, url); };
    writeHash({ view: "reference", referenceTab: "meds" });
    expect(calls.at(-1)).toContain("/reference/meds");
    window.history.pushState = orig;
  });
});
```

- [ ] **Step 1.2: Run tests to verify they fail**

```bash
npm test -- --reporter=verbose tests/lib/hashRouter.test.ts
```

Expected: new `reference route` and `writePath` describe blocks fail.

- [ ] **Step 1.3: Update `src/types/index.ts`**

Replace the `RouteView` type and the `Route` interface:

```ts
export type RouteView =
  | "home"
  | "sheet"
  | "stats"
  | "settings"
  | "guide"
  | "examday"
  | "sources"
  | "chat"
  | "reference"
  | "mnemonics"
  | "medconditions"
  | "blsmeds"
  | "skills"
  | "notFound";

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
```

Also add `compareWith?: string[]` to the `MedicalCondition` interface:

```ts
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
```

- [ ] **Step 1.4: Update `src/router/router.ts`**

Replace the `parseParts` function and the `writePath` function with:

```ts
function parseParts(parts: string[]): Route | null {
  if (parts[0] === "sheet" && parts[1]) {
    return { view: "sheet", sheetId: parts[1], tab: (parts[2] || "sheet") as SheetTab };
  }
  if (parts[0] === "chat") {
    return { view: "chat", chatId: parts[1] || undefined };
  }
  // New unified reference route
  if (parts[0] === "reference") {
    const tab = (parts[1] as "conditions" | "mnemonics" | "meds") || "conditions";
    if (tab === "mnemonics" && parts[2] === "quiz" && parts[3]) {
      return { view: "reference", referenceTab: "mnemonics", referenceCardId: parts[3] };
    }
    return { view: "reference", referenceTab: tab };
  }
  // Old routes — redirect to reference
  if (parts[0] === "mnemonics") {
    const cardId = parts[1] === "quiz" && parts[2] ? parts[2] : undefined;
    return { view: "reference", referenceTab: "mnemonics", ...(cardId ? { referenceCardId: cardId } : {}) };
  }
  if (parts[0] === "medconditions") {
    return { view: "reference", referenceTab: "conditions" };
  }
  if (parts[0] === "blsmeds") {
    return { view: "reference", referenceTab: "meds" };
  }
  if ((["home", "stats", "settings", "guide", "examday", "sources", "skills"] as string[]).includes(parts[0])) {
    return { view: parts[0] as RouteView };
  }
  return null;
}

export function writePath(r: Route, method: "push" | "replace" = "push"): void {
  let path = "";
  if (r.view === "sheet") path = `sheet/${r.sheetId}/${r.tab || "sheet"}`;
  else if (r.view === "chat") path = r.chatId ? `chat/${r.chatId}` : "chat";
  else if (r.view === "reference") {
    const tab = r.referenceTab ?? "conditions";
    if (tab === "mnemonics" && r.referenceCardId) {
      path = `reference/mnemonics/quiz/${r.referenceCardId}`;
    } else {
      path = `reference/${tab}`;
    }
  }
  else if (r.view !== "home") path = r.view;
  const url = path ? `${BASE}/${path}` : `${BASE}/`;
  if (method === "push") {
    window.history.pushState(null, "", url);
  } else {
    window.history.replaceState(null, "", url);
  }
}
```

- [ ] **Step 1.5: Run router tests to verify they pass**

```bash
npm test -- --reporter=verbose tests/lib/hashRouter.test.ts
```

Expected: all tests pass including new `reference route` blocks.

- [ ] **Step 1.6: Type-check**

```bash
npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 1.7: Commit**

```bash
git add src/types/index.ts src/router/router.ts tests/lib/hashRouter.test.ts
git commit -m "feat(T-024): add reference route type + router parsing/redirect"
```

---

## Task 2: ReferenceToolbar Component

**Files:**
- Create: `src/components/ReferenceToolbar.tsx`
- Create: `tests/components/ReferenceToolbar.test.tsx`

- [ ] **Step 2.1: Write the failing test**

Create `tests/components/ReferenceToolbar.test.tsx`:

```tsx
import { render, screen, fireEvent } from "@testing-library/preact";
import { describe, it, expect, vi } from "vitest";
import { ReferenceToolbar } from "../../src/components/ReferenceToolbar";

describe("ReferenceToolbar", () => {
  const cats = ["All", "Cardiac", "Respiratory"];

  it("renders a search input", () => {
    render(
      <ReferenceToolbar
        query=""
        onQueryChange={vi.fn()}
        categories={cats}
        activeCategory="All"
        onCategoryChange={vi.fn()}
      />
    );
    expect(screen.getByRole("searchbox")).toBeInTheDocument();
  });

  it("renders all category pills", () => {
    render(
      <ReferenceToolbar
        query=""
        onQueryChange={vi.fn()}
        categories={cats}
        activeCategory="All"
        onCategoryChange={vi.fn()}
      />
    );
    expect(screen.getByText("All")).toBeInTheDocument();
    expect(screen.getByText("Cardiac")).toBeInTheDocument();
    expect(screen.getByText("Respiratory")).toBeInTheDocument();
  });

  it("marks activeCategory pill with 'active' class", () => {
    const { container } = render(
      <ReferenceToolbar
        query=""
        onQueryChange={vi.fn()}
        categories={cats}
        activeCategory="Cardiac"
        onCategoryChange={vi.fn()}
      />
    );
    const activeBtn = container.querySelector(".ref-filter-chip.active");
    expect(activeBtn?.textContent).toBe("Cardiac");
  });

  it("calls onQueryChange when typing in search", () => {
    const onChange = vi.fn();
    render(
      <ReferenceToolbar
        query=""
        onQueryChange={onChange}
        categories={cats}
        activeCategory="All"
        onCategoryChange={vi.fn()}
      />
    );
    fireEvent.input(screen.getByRole("searchbox"), { target: { value: "cardiac" } });
    expect(onChange).toHaveBeenCalledWith("cardiac");
  });

  it("calls onCategoryChange when a pill is clicked", () => {
    const onCat = vi.fn();
    render(
      <ReferenceToolbar
        query=""
        onQueryChange={vi.fn()}
        categories={cats}
        activeCategory="All"
        onCategoryChange={onCat}
      />
    );
    fireEvent.click(screen.getByText("Cardiac"));
    expect(onCat).toHaveBeenCalledWith("Cardiac");
  });

  it("shows clear button when query is non-empty", () => {
    const { container } = render(
      <ReferenceToolbar
        query="test"
        onQueryChange={vi.fn()}
        categories={cats}
        activeCategory="All"
        onCategoryChange={vi.fn()}
      />
    );
    expect(container.querySelector(".ref-search-clear")).toBeInTheDocument();
  });

  it("does not show clear button when query is empty", () => {
    const { container } = render(
      <ReferenceToolbar
        query=""
        onQueryChange={vi.fn()}
        categories={cats}
        activeCategory="All"
        onCategoryChange={vi.fn()}
      />
    );
    expect(container.querySelector(".ref-search-clear")).not.toBeInTheDocument();
  });

  it("clear button calls onQueryChange with empty string", () => {
    const onChange = vi.fn();
    const { container } = render(
      <ReferenceToolbar
        query="test"
        onQueryChange={onChange}
        categories={cats}
        activeCategory="All"
        onCategoryChange={vi.fn()}
      />
    );
    fireEvent.click(container.querySelector(".ref-search-clear")!);
    expect(onChange).toHaveBeenCalledWith("");
  });
});
```

- [ ] **Step 2.2: Run tests to verify they fail**

```bash
npm test -- --reporter=verbose tests/components/ReferenceToolbar.test.tsx
```

Expected: all tests fail with "Cannot find module".

- [ ] **Step 2.3: Create `src/components/ReferenceToolbar.tsx`**

```tsx
interface ReferenceToolbarProps {
  query: string;
  onQueryChange: (q: string) => void;
  categories: string[];
  activeCategory: string;
  onCategoryChange: (c: string) => void;
  placeholder?: string;
}

export function ReferenceToolbar({
  query,
  onQueryChange,
  categories,
  activeCategory,
  onCategoryChange,
  placeholder = "Search…",
}: ReferenceToolbarProps) {
  return (
    <div class="ref-toolbar">
      <div class="ref-search-wrap">
        <input
          class="ref-search-input"
          type="search"
          role="searchbox"
          value={query}
          placeholder={placeholder}
          autocomplete="off"
          autocorrect="off"
          autocapitalize="off"
          spellcheck={false}
          onInput={e => onQueryChange((e.target as HTMLInputElement).value)}
        />
        {query && (
          <button
            class="ref-search-clear"
            type="button"
            aria-label="Clear search"
            onClick={() => onQueryChange("")}
          >×</button>
        )}
      </div>
      <div class="ref-filter-row">
        {categories.map(cat => (
          <button
            key={cat}
            class={`ref-filter-chip${cat === activeCategory ? " active" : ""}`}
            type="button"
            onClick={() => onCategoryChange(cat)}
          >{cat}</button>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2.4: Run tests to verify they pass**

```bash
npm test -- --reporter=verbose tests/components/ReferenceToolbar.test.tsx
```

Expected: all 8 tests pass.

- [ ] **Step 2.5: Commit**

```bash
git add src/components/ReferenceToolbar.tsx tests/components/ReferenceToolbar.test.tsx
git commit -m "feat(T-026): ReferenceToolbar shared search + category pills component"
```

---

## Task 3: ReferenceView Shell

**Files:**
- Create: `src/views/ReferenceView.tsx`
- Create: `tests/views/ReferenceView.test.tsx`

- [ ] **Step 3.1: Write the failing tests**

Create `tests/views/ReferenceView.test.tsx`:

```tsx
import { render, screen, fireEvent } from "@testing-library/preact";
import { signal } from "@preact/signals";
import { describe, it, expect, vi, beforeEach } from "vitest";

const navigateMock = vi.fn();
const routeSignal = signal({ view: "reference", referenceTab: "conditions" } as Record<string, unknown>);

vi.mock("../../src/store/appStore", async () => {
  const storage = await import("../../src/lib/storage");
  const { signal: sig } = await import("@preact/signals");
  return {
    appState: sig(storage.createEmptyState()),
    route: routeSignal,
    navigate: navigateMock,
    save: vi.fn(),
    mutateState: vi.fn(),
    showToast: vi.fn(),
  };
});

vi.mock("../../src/views/reference/ConditionsMode", () => ({
  ConditionsMode: () => <div data-testid="conditions-mode">Conditions</div>,
}));
vi.mock("../../src/views/reference/MnemonicsMode", () => ({
  MnemonicsMode: () => <div data-testid="mnemonics-mode">Mnemonics</div>,
}));
vi.mock("../../src/views/reference/MedsMode", () => ({
  MedsMode: () => <div data-testid="meds-mode">Meds</div>,
}));

import { ReferenceView } from "../../src/views/ReferenceView";

describe("ReferenceView", () => {
  beforeEach(() => {
    navigateMock.mockClear();
    routeSignal.value = { view: "reference", referenceTab: "conditions" };
  });

  it("renders the Conditions tab as active by default", () => {
    const { container } = render(<ReferenceView />);
    const activeTab = container.querySelector(".ref-tab-btn.active");
    expect(activeTab?.textContent).toBe("Conditions");
  });

  it("renders ConditionsMode when referenceTab is conditions", () => {
    render(<ReferenceView />);
    expect(screen.getByTestId("conditions-mode")).toBeInTheDocument();
  });

  it("renders MnemonicsMode when referenceTab is mnemonics", () => {
    routeSignal.value = { view: "reference", referenceTab: "mnemonics" };
    render(<ReferenceView />);
    expect(screen.getByTestId("mnemonics-mode")).toBeInTheDocument();
  });

  it("renders MedsMode when referenceTab is meds", () => {
    routeSignal.value = { view: "reference", referenceTab: "meds" };
    render(<ReferenceView />);
    expect(screen.getByTestId("meds-mode")).toBeInTheDocument();
  });

  it("clicking Mnemonics tab calls navigate with referenceTab mnemonics", () => {
    render(<ReferenceView />);
    fireEvent.click(screen.getByText("Mnemonics"));
    expect(navigateMock).toHaveBeenCalledWith({ view: "reference", referenceTab: "mnemonics" });
  });

  it("clicking Meds tab calls navigate with referenceTab meds", () => {
    render(<ReferenceView />);
    fireEvent.click(screen.getByText("Meds"));
    expect(navigateMock).toHaveBeenCalledWith({ view: "reference", referenceTab: "meds" });
  });

  it("renders all three tab buttons", () => {
    render(<ReferenceView />);
    expect(screen.getByText("Conditions")).toBeInTheDocument();
    expect(screen.getByText("Mnemonics")).toBeInTheDocument();
    expect(screen.getByText("Meds")).toBeInTheDocument();
  });
});
```

- [ ] **Step 3.2: Run tests to verify they fail**

```bash
npm test -- --reporter=verbose tests/views/ReferenceView.test.tsx
```

Expected: all tests fail with "Cannot find module".

- [ ] **Step 3.3: Create the mode stubs so imports don't fail**

Create `src/views/reference/ConditionsMode.tsx` (stub — replaced in Task 4):

```tsx
export function ConditionsMode() {
  return <div>Conditions (stub)</div>;
}
```

Create `src/views/reference/MnemonicsMode.tsx` (stub — replaced in Task 5):

```tsx
export function MnemonicsMode() {
  return <div>Mnemonics (stub)</div>;
}
```

Create `src/views/reference/MedsMode.tsx` (stub — replaced in Task 6):

```tsx
export function MedsMode() {
  return <div>Meds (stub)</div>;
}
```

- [ ] **Step 3.4: Create `src/views/ReferenceView.tsx`**

```tsx
import { route, navigate } from "../store/appStore";
import { ConditionsMode } from "./reference/ConditionsMode";
import { MnemonicsMode } from "./reference/MnemonicsMode";
import { MedsMode } from "./reference/MedsMode";

type RefTab = "conditions" | "mnemonics" | "meds";

const TABS: { id: RefTab; label: string }[] = [
  { id: "conditions", label: "Conditions" },
  { id: "mnemonics", label: "Mnemonics" },
  { id: "meds", label: "Meds" },
];

export function ReferenceView() {
  const tab = (route.value.referenceTab as RefTab) ?? "conditions";

  return (
    <div class="ref-wrap">
      <div class="ref-tab-strip">
        {TABS.map(t => (
          <button
            key={t.id}
            class={`ref-tab-btn${tab === t.id ? " active" : ""}`}
            type="button"
            onClick={() => navigate({ view: "reference", referenceTab: t.id })}
          >{t.label}</button>
        ))}
      </div>
      {tab === "conditions" && <ConditionsMode />}
      {tab === "mnemonics" && <MnemonicsMode />}
      {tab === "meds" && <MedsMode />}
    </div>
  );
}
```

- [ ] **Step 3.5: Run tests to verify they pass**

```bash
npm test -- --reporter=verbose tests/views/ReferenceView.test.tsx
```

Expected: all 7 tests pass.

- [ ] **Step 3.6: Type-check**

```bash
npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 3.7: Commit**

```bash
git add src/views/ReferenceView.tsx src/views/reference/ tests/views/ReferenceView.test.tsx
git commit -m "feat(T-025): ReferenceView shell with tab switcher + mode stubs"
```

---

## Task 4: ConditionsMode (T-025 + T-027 partial)

> This task can be run in **parallel** with Tasks 5 and 6.

**Files:**
- Modify: `src/views/reference/ConditionsMode.tsx` (replace the stub)
- Modify: `src/data/medical_conditions.ts` (add `compareWith` fields)

- [ ] **Step 4.1: Add `compareWith` to medical_conditions.ts**

In `src/data/medical_conditions.ts`, add `compareWith` to each condition that has known confusables. Only add to conditions that have a `compareGroup` — use the other conditions in the same group as the `compareWith` values:

For `hypoglycemia`: `"compareWith": ["hyperglycemia"]`
For `hyperglycemia`: `"compareWith": ["hypoglycemia"]`
For `ami`: `"compareWith": ["chf"]`
For `chf`: `"compareWith": ["ami"]`
For `copd`: `"compareWith": ["asthma"]`
For `asthma`: `"compareWith": ["copd"]`
For `pulmonary_embolism`: `"compareWith": ["pneumothorax", "pneumonia"]`
For `pneumothorax`: `"compareWith": ["pulmonary_embolism", "pneumonia"]`
For `pneumonia`: `"compareWith": ["pulmonary_embolism", "pneumothorax"]`
For `stroke`: `"compareWith": ["tia", "seizure"]`
For `tia`: `"compareWith": ["stroke", "seizure"]`
For `seizure`: `"compareWith": ["stroke", "tia"]`
For `allergic_reaction`: `"compareWith": ["anaphylaxis"]`
For `anaphylaxis`: `"compareWith": ["allergic_reaction"]`
For `hypovolemic_shock`: `"compareWith": ["cardiogenic_shock", "septic_shock", "neurogenic_shock"]`
For `cardiogenic_shock`: `"compareWith": ["hypovolemic_shock", "septic_shock", "neurogenic_shock"]`
For `septic_shock`: `"compareWith": ["hypovolemic_shock", "cardiogenic_shock", "neurogenic_shock"]`
For `neurogenic_shock`: `"compareWith": ["hypovolemic_shock", "cardiogenic_shock", "septic_shock"]`

Add each `compareWith` field as a sibling to the existing `compareDimensions` field. Example for hypoglycemia:

```json
"compareDimensions": { ... },
"compareWith": ["hyperglycemia"]
```

- [ ] **Step 4.2: Replace `src/views/reference/ConditionsMode.tsx` with full implementation**

```tsx
import { useState } from "preact/hooks";
import { appState, mutateState, save, navigate, route } from "../../store/appStore";
import { MEDICAL_CONDITIONS } from "../../data/medical_conditions";
import { ReferenceToolbar } from "../../components/ReferenceToolbar";
import { ConditionCompareModal } from "../../components/ConditionCompareModal";
import type { MedicalCondition } from "../../types";

// ─── Compare groups (used by inline modal) ───────────────────────────────────

const COMPARE_GROUPS: Record<string, { label: string; dimensions: string[] }> = {
  diabetic:        { label: "Diabetic Emergencies", dimensions: ["onset", "skin", "breath", "respirations", "keySign", "history"] },
  cardiac_dyspnea: { label: "Cardiac (AMI vs CHF)", dimensions: ["onset", "dyspnea", "skin", "edema", "keySign", "history"] },
  obstructive:     { label: "Asthma vs COPD", dimensions: ["onset", "breathSounds", "skin", "cough", "keySign", "smokingHistory", "reversibility"] },
  pulmonary_acute: { label: "PE vs Pneumothorax vs Pneumonia", dimensions: ["onset", "breathSounds", "fever", "cough", "keySign", "breathSoundsSymmetry"] },
  neuro:           { label: "Stroke / TIA / Seizure", dimensions: ["onset", "symptomDuration", "FASTexam", "headache", "keySign", "urgency"] },
  allergic:        { label: "Allergic Reaction vs Anaphylaxis", dimensions: ["onset", "airway", "bloodPressure", "skinFindings", "shockSigns", "keySign", "epinephrine"] },
  shock:           { label: "Shock Types", dimensions: ["cause", "heartRate", "skin", "lungsounds", "JVD", "keySign"] },
};

// ─── CondCard ────────────────────────────────────────────────────────────────

function CondCard({ cond, onCompare }: { cond: MedicalCondition; onCompare: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const sections = [
    { label: "Key Signs & Symptoms", items: cond.signs, cls: "medcond-signs" },
    { label: "Distinguishing Features", items: cond.distinguishing, cls: "medcond-distinguishing" },
    { label: "Critical Findings", items: cond.criticalFindings, cls: "medcond-critical" },
    { label: "EMT Treatment Priority", items: cond.treatment, cls: "medcond-treatment" },
  ];
  const compareNames = cond.compareWith
    ?.map(id => MEDICAL_CONDITIONS.find(c => c.id === id)?.name)
    .filter(Boolean)
    .join(", ");

  return (
    <div class={`medcond-card${open ? " expanded" : ""}`}>
      <div class="medcond-card-header" onClick={() => setOpen(o => !o)}>
        <div class="medcond-card-left">
          <span class="medcond-name">{cond.name}</span>
          <span class="medcond-key-diff">{cond.keyDifferentiator}</span>
        </div>
        <div class="medcond-card-right">
          <span class="medcond-cat-badge">{cond.category}</span>
          <span class="medcond-expand-icon">▾</span>
        </div>
      </div>
      {open && (
        <div class="medcond-card-body">
          {sections.map(sec => sec.items?.length ? (
            <div key={sec.cls} class={`medcond-section ${sec.cls}`}>
              <div class="medcond-section-label">{sec.label}</div>
              <ul class="medcond-list">{sec.items.map((it, i) => <li key={i}>{it}</li>)}</ul>
            </div>
          ) : null)}
          {cond.onset && <div class="medcond-onset"><strong>Onset: </strong>{cond.onset}</div>}
          {compareNames && (
            <button
              class="medcond-compare-inline-btn btn"
              type="button"
              onClick={e => { e.stopPropagation(); onCompare(cond.id); }}
            >⇄ Compare with {compareNames}</button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Quiz helpers ─────────────────────────────────────────────────────────────

interface Question {
  condId: string;
  answer: string;
  clue: string;
  category: string;
  options: string[];
  explanation: string | null;
  status: "new" | "due" | "review";
}

function srsUpdate(record: { interval: number; ease: number; reps: number } | undefined, correct: boolean) {
  const r = record ?? { interval: 1, ease: 2.5, reps: 0 };
  let { interval, ease, reps } = r;
  if (correct) { reps++; interval = reps <= 1 ? 1 : reps === 2 ? 4 : Math.round(interval * ease); ease = Math.min(3.0, ease + 0.1); }
  else { reps = 0; interval = 1; ease = Math.max(1.3, ease - 0.2); }
  return { interval, ease, reps, due: Date.now() + interval * 86400000 };
}

function buildQuestions(srsData: Record<string, { due: number }>, count: number): Question[] {
  const now = Date.now();
  const due = MEDICAL_CONDITIONS.filter(c => srsData[c.id] && srsData[c.id].due <= now).sort(() => Math.random() - 0.5);
  const unseen = MEDICAL_CONDITIONS.filter(c => !srsData[c.id]).sort(() => Math.random() - 0.5);
  const upcoming = MEDICAL_CONDITIONS.filter(c => srsData[c.id] && srsData[c.id].due > now).sort((a, b) => srsData[a.id].due - srsData[b.id].due);
  const ordered = [...due, ...unseen, ...upcoming];
  const questions: Question[] = [];
  for (const cond of ordered) {
    if (questions.length >= count) break;
    if (!cond.keyDifferentiator) continue;
    const sameGroup = MEDICAL_CONDITIONS.filter(c => c.compareGroup === cond.compareGroup && c.id !== cond.id);
    const otherGroup = MEDICAL_CONDITIONS.filter(c => c.compareGroup !== cond.compareGroup).sort(() => Math.random() - 0.5);
    const distractors: MedicalCondition[] = [];
    for (const d of [...sameGroup, ...otherGroup]) {
      if (distractors.length >= 3) break;
      if (!distractors.find(x => x.id === d.id)) distractors.push(d);
    }
    if (distractors.length < 3) continue;
    const rec = srsData[cond.id];
    questions.push({
      condId: cond.id, answer: cond.name, clue: cond.keyDifferentiator,
      category: cond.category, explanation: cond.distinguishing?.[0] ?? null,
      options: [cond.name, ...distractors.map(d => d.name)].sort(() => Math.random() - 0.5),
      status: !rec ? "new" : rec.due <= now ? "due" : "review",
    });
  }
  return questions;
}

// ─── Browse ──────────────────────────────────────────────────────────────────

function BrowseTab({ onCompare }: { onCompare: (condId: string) => void }) {
  const cats = ["All", ...Array.from(new Set(MEDICAL_CONDITIONS.map(c => c.category)))];
  const [activeCat, setActiveCat] = useState("All");
  const [query, setQuery] = useState("");

  const filtered = MEDICAL_CONDITIONS.filter(c => {
    const matchesCat = activeCat === "All" || c.category === activeCat;
    const q = query.toLowerCase();
    const matchesQuery = !q ||
      c.name.toLowerCase().includes(q) ||
      c.keyDifferentiator?.toLowerCase().includes(q);
    return matchesCat && matchesQuery;
  });

  return (
    <>
      <div class="medcond-header">
        <h1>Medical Conditions Reference</h1>
        <p class="subtitle">Signs, symptoms, and distinguishing features for common EMT medical emergencies. Click a condition to expand.</p>
      </div>
      <ReferenceToolbar
        query={query}
        onQueryChange={setQuery}
        categories={cats}
        activeCategory={activeCat}
        onCategoryChange={setActiveCat}
        placeholder="Search conditions…"
      />
      <div class="medcond-grid">
        {filtered.map(c => <CondCard key={c.id} cond={c} onCompare={onCompare} />)}
        {filtered.length === 0 && <p class="muted">No conditions match.</p>}
      </div>
    </>
  );
}

// ─── Quiz ─────────────────────────────────────────────────────────────────────

function QuizTab() {
  const srsData = appState.value.medcondSrs ?? {};
  const [questions] = useState(() => buildQuestions(srsData as Record<string, { due: number }>, 10));
  const [idx, setIdx] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [correct, setCorrect] = useState(0);
  const [done, setDone] = useState(false);

  if (!questions.length) return <p class="muted">Could not build quiz questions.</p>;

  const now = Date.now();
  const totalDue = MEDICAL_CONDITIONS.filter(c => (srsData as Record<string, { due: number }>)[c.id]?.due <= now).length;
  const totalNew = MEDICAL_CONDITIONS.filter(c => !(srsData as Record<string, { due: number }>)[c.id]).length;

  if (done) {
    const pct = Math.round((correct / questions.length) * 100);
    const gradeMsg = pct >= 90 ? "Excellent!" : pct >= 70 ? "Good job!" : pct >= 50 ? "Keep studying!" : "Keep at it!";
    const gradeClass = pct >= 90 ? "medcond-grade-great" : pct >= 70 ? "medcond-grade-good" : "medcond-grade-low";
    const newSrsData = appState.value.medcondSrs ?? {};
    const newDue = MEDICAL_CONDITIONS.filter(c => (newSrsData as Record<string, { due: number }>)[c.id]?.due <= Date.now()).length;
    return (
      <div class="medcond-results">
        <div class="medcond-results-icon">{pct >= 70 ? "🏥" : "📋"}</div>
        <div class={`medcond-results-score ${gradeClass}`}>{pct}%</div>
        <div class="medcond-results-grade">{gradeMsg}</div>
        <div class="medcond-results-detail">{correct} / {questions.length} correct</div>
        <div class="medcond-results-detail">{newDue > 0 ? `${newDue} card${newDue === 1 ? "" : "s"} due for review` : "All caught up!"}</div>
        <button class="btn btn-primary" onClick={() => navigate({ view: "reference", referenceTab: "conditions" })}>Continue Studying</button>
        <button class="btn" onClick={() => navigate({ view: "reference", referenceTab: "conditions" })}>Browse Conditions</button>
      </div>
    );
  }

  const q = questions[idx];

  function choose(opt: string) {
    if (answered) return;
    setAnswered(true);
    setSelected(opt);
    const isCorrect = opt === q.answer;
    if (isCorrect) setCorrect(c => c + 1);
    mutateState(draft => {
      if (!draft.medcondSrs) draft.medcondSrs = {};
      (draft.medcondSrs as Record<string, ReturnType<typeof srsUpdate>>)[q.condId] = srsUpdate(
        (draft.medcondSrs as Record<string, { interval: number; ease: number; reps: number }>)[q.condId],
        isCorrect
      );
    });
    save();
  }

  function next() {
    if (idx + 1 >= questions.length) setDone(true);
    else { setIdx(i => i + 1); setAnswered(false); setSelected(null); }
  }

  return (
    <>
      <div class="medcond-quiz-header">
        <div class="medcond-quiz-counter">Question {idx + 1} of {questions.length}</div>
        <div class="medcond-quiz-srs-info">
          {totalDue > 0 && <span class="medcond-srs-count medcond-srs-count-due">{totalDue} due</span>}
          {totalNew > 0 && <span class="medcond-srs-count medcond-srs-count-new">{totalNew} new</span>}
        </div>
      </div>
      <div class="medcond-quiz-card">
        <div class="medcond-quiz-card-header">
          <div class="medcond-quiz-srs-status">
            {q.status === "new" && <span class="medcond-srs-badge medcond-srs-new">New</span>}
            {q.status === "due" && <span class="medcond-srs-badge medcond-srs-due">Review</span>}
          </div>
        </div>
        <div class="medcond-quiz-question">
          <div class="medcond-quiz-label muted">Which condition does this describe?</div>
          <div class="medcond-quiz-clue">{q.clue}</div>
          {q.category && <div class="medcond-quiz-hint muted">Category: {q.category}</div>}
        </div>
        <div class="medcond-quiz-options">
          {q.options.map(opt => (
            <button
              key={opt}
              class={`medcond-option btn${answered && opt === q.answer ? " correct" : answered && opt === selected && opt !== q.answer ? " wrong" : ""}`}
              type="button"
              disabled={answered}
              onClick={() => choose(opt)}
            >{opt}</button>
          ))}
        </div>
        {answered && (
          <div class="medcond-quiz-feedback">
            {selected === q.answer
              ? <div class="medcond-feedback-correct">Correct!</div>
              : <div class="medcond-feedback-wrong">Incorrect — the answer is <strong>{q.answer}</strong></div>}
            {q.explanation && <div class="medcond-feedback-detail muted">{q.explanation}</div>}
          </div>
        )}
        {answered && (
          <button class="btn btn-primary medcond-quiz-next" type="button" onClick={next}>Next →</button>
        )}
      </div>
    </>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────

type CondTab = "browse" | "quiz";

export function ConditionsMode() {
  const r = route.value as { medcondTab?: string };
  const tab = (r.medcondTab as CondTab) ?? "browse";
  const [compareGroupId, setCompareGroupId] = useState<string | null>(null);

  function handleCompare(condId: string) {
    const cond = MEDICAL_CONDITIONS.find(c => c.id === condId);
    if (cond?.compareGroup) setCompareGroupId(cond.compareGroup);
  }

  const compareGroup = compareGroupId ? COMPARE_GROUPS[compareGroupId] : null;
  const compareGroupConds = compareGroupId
    ? MEDICAL_CONDITIONS.filter(c => c.compareGroup === compareGroupId)
    : [];

  return (
    <div class="medcond-wrap">
      <div class="medcond-tab-strip">
        <button
          class={`medcond-tab-btn${tab === "browse" ? " active" : ""}`}
          type="button"
          onClick={() => navigate({ view: "reference", referenceTab: "conditions" })}
        >Browse</button>
        <button
          class={`medcond-tab-btn${tab === "quiz" ? " active" : ""}`}
          type="button"
          onClick={() => navigate({ view: "reference", referenceTab: "conditions" })}
        >Quiz</button>
      </div>
      {tab === "browse" && <BrowseTab onCompare={handleCompare} />}
      {tab === "quiz" && <QuizTab />}
      {compareGroup && (
        <ConditionCompareModal
          group={compareGroup}
          conditions={compareGroupConds}
          onClose={() => setCompareGroupId(null)}
        />
      )}
    </div>
  );
}
```

**Note on the internal tab strip in ConditionsMode:** The browse/quiz toggle in ConditionsMode still uses a local `medcondTab` convention, but navigation calls now use `view: "reference"`. The quiz tab button wiring is simplified here — both just go to conditions; the sub-tab URL sync for quiz within conditions is left as local state (the existing pattern). If you need quiz to be URL-driven, add `medcondTab` query param support, but it's not required by the issue spec.

- [ ] **Step 4.3: Run all tests**

```bash
npm test
```

Expected: all tests pass. If `ConditionCompareModal` import fails, create the stub first (Task 7 creates it fully — for now create a placeholder):

```tsx
// src/components/ConditionCompareModal.tsx (temporary stub)
export function ConditionCompareModal(_props: {
  group: { label: string; dimensions: string[] };
  conditions: import("../types").MedicalCondition[];
  onClose: () => void;
}) {
  return null;
}
```

- [ ] **Step 4.4: Type-check**

```bash
npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 4.5: Commit**

```bash
git add src/views/reference/ConditionsMode.tsx src/data/medical_conditions.ts src/components/ConditionCompareModal.tsx
git commit -m "feat(T-025,T-027): ConditionsMode — extract from MedConditionsView, add compare inline btn, ReferenceToolbar"
```

---

## Task 5: MnemonicsMode

> This task can be run in **parallel** with Tasks 4 and 6.

**Files:**
- Modify: `src/views/reference/MnemonicsMode.tsx` (replace stub with full implementation)

- [ ] **Step 5.1: Replace `src/views/reference/MnemonicsMode.tsx` with full implementation**

```tsx
import { useState, useRef } from "preact/hooks";
import { appState, mutateState, save, navigate, route } from "../../store/appStore";
import { EMS_CLINICAL_MNEMONICS } from "../../data/ems_clinical_mnemonics";
import { defaultRecord, grade, describeDue } from "../../lib/emsSrs";
import { suggestGrade, getNonConnectorLetters, quizMatchesAnswer } from "../../lib/emsMnemonicsHelpers";
import { ReferenceToolbar } from "../../components/ReferenceToolbar";
import type { ClinicalMnemonic, SRSRecord } from "../../types";

type Grade = "again" | "hard" | "good" | "easy";

// ─── Browse card ─────────────────────────────────────────────────────────────

function EmsCard({ mnemonic, srsRec }: { mnemonic: ClinicalMnemonic; srsRec: SRSRecord | undefined }) {
  const [open, setOpen] = useState(false);
  const due = describeDue(srsRec);

  function practiceCard(e: Event) {
    e.stopPropagation();
    navigate({ view: "reference", referenceTab: "mnemonics", referenceCardId: mnemonic.id });
  }

  return (
    <div class={`ems-card${open ? " expanded" : ""}`} onClick={() => setOpen(o => !o)}>
      <div class="ems-card-header">
        <div class="ems-card-left">
          <span class="ems-acronym">{mnemonic.acronym}</span>
          <span class="ems-card-title">{mnemonic.title}</span>
        </div>
        <div class="ems-card-right">
          <span class="ems-category-tag">{mnemonic.category}</span>
          <span class={`ems-due-badge${!srsRec || srsRec.due <= Date.now() ? " due" : ""}`}>{due}</span>
          <button class="ems-practice-icon" title="Practice this card" onClick={practiceCard}>▶</button>
          <span class="ems-expand-icon">▾</span>
        </div>
      </div>
      {open && (
        <div class="ems-card-body">
          {mnemonic.note && <div class="ems-card-note">{mnemonic.note}</div>}
          <div class="ems-letter-table">
            {mnemonic.letters.filter(l => l.stand !== "(connector)").map((l, i) => (
              <div class="ems-letter-row" key={i}>
                <span class="ems-letter-badge">{l.letter}</span>
                <div class="ems-letter-content">
                  <strong>{l.stand}</strong>
                  {l.detail && <div class="ems-letter-detail muted">{l.detail}</div>}
                </div>
              </div>
            ))}
          </div>
          {mnemonic.sources && mnemonic.sources.length > 0 && (
            <div class="ems-card-sources muted">
              Sources: {mnemonic.sources.join(" · ")}
            </div>
          )}
          <button class="btn ems-practice-body-btn" onClick={practiceCard}>Practice this card</button>
        </div>
      )}
    </div>
  );
}

// ─── Browse mode ──────────────────────────────────────────────────────────────

function BrowseMode() {
  const categories = ["All", ...Array.from(new Set(EMS_CLINICAL_MNEMONICS.map(m => m.category)))];
  const [activeCat, setActiveCat] = useState("All");
  const [query, setQuery] = useState("");
  const srsStore = appState.value.emsSrs ?? {};
  const now = Date.now();
  const dueCount = EMS_CLINICAL_MNEMONICS.filter(m => {
    const rec = srsStore["ems::" + m.id];
    return !rec || rec.due <= now;
  }).length;

  const filtered = EMS_CLINICAL_MNEMONICS.filter(m => {
    const matchesCat = activeCat === "All" || m.category === activeCat;
    const q = query.toLowerCase();
    const matchesQuery = !q ||
      m.acronym.toLowerCase().includes(q) ||
      m.title.toLowerCase().includes(q);
    return matchesCat && matchesQuery;
  });

  return (
    <>
      <h1>EMS Mnemonics &amp; Acronyms</h1>
      <p class="subtitle">Clinical assessment and treatment acronyms used throughout EMS. Tap a card to expand, or use Quiz mode for spaced repetition.</p>
      <ReferenceToolbar
        query={query}
        onQueryChange={setQuery}
        categories={categories}
        activeCategory={activeCat}
        onCategoryChange={setActiveCat}
        placeholder="Search acronyms…"
      />
      <button
        class="btn btn-primary ems-quiz-btn"
        type="button"
        onClick={() => navigate({ view: "reference", referenceTab: "mnemonics", referenceCardId: undefined })}
      >
        {dueCount > 0 ? `Quiz — ${dueCount} card${dueCount === 1 ? "" : "s"} due` : "Quiz — all caught up"}
      </button>
      <div class="ems-mnemonic-grid">
        {filtered.map(m => (
          <EmsCard key={m.id} mnemonic={m} srsRec={srsStore["ems::" + m.id]} />
        ))}
        {filtered.length === 0 && <p class="muted">No mnemonics match.</p>}
      </div>
    </>
  );
}

// ─── Per-letter quiz card ─────────────────────────────────────────────────────

interface LetterResult {
  letter: string;
  stand: string;
  correct: boolean;
  given: string;
}

type QuizPhase = "front" | "quizzing" | "summary";

function PerLetterQuiz({ mnemonic, rec, remaining, onGrade }: {
  mnemonic: ClinicalMnemonic;
  rec: SRSRecord;
  remaining: number;
  onGrade: (g: Grade) => void;
}) {
  const letters = getNonConnectorLetters(mnemonic.letters);
  const [phase, setPhase] = useState<QuizPhase>("front");
  const [letterIdx, setLetterIdx] = useState(0);
  const [answer, setAnswer] = useState("");
  const [letterResult, setLetterResult] = useState<{ correct: boolean; stand: string } | null>(null);
  const [results, setResults] = useState<LetterResult[]>([]);
  const [chosenGrade, setChosenGrade] = useState<Grade | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const suggested = suggestGrade(results.filter(r => r.correct).length, results.length);

  function submitAnswer() {
    const current = letters[letterIdx];
    const correct = quizMatchesAnswer(answer.trim(), current.stand);
    const result: LetterResult = { letter: current.letter, stand: current.stand, correct, given: answer.trim() };
    setLetterResult({ correct, stand: current.stand });
    setResults(prev => [...prev, result]);
  }

  function advance() {
    const next = letterIdx + 1;
    if (next >= letters.length) {
      setPhase("summary");
    } else {
      setLetterIdx(next);
      setAnswer("");
      setLetterResult(null);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }

  if (phase === "front") {
    return (
      <div class="ems-quiz-card">
        <div class="ems-quiz-front">
          <div class="ems-quiz-acronym">{mnemonic.acronym}</div>
          <div class="ems-quiz-title">{mnemonic.title}</div>
          <div class="ems-quiz-category">{mnemonic.category}</div>
        </div>
        <button class="btn btn-primary ems-reveal-btn" onClick={() => {
          setPhase("quizzing");
          setTimeout(() => inputRef.current?.focus(), 0);
        }}>Begin Quiz</button>
      </div>
    );
  }

  if (phase === "quizzing") {
    const current = letters[letterIdx];
    return (
      <div class="ems-quiz-card">
        <div class="ems-quiz-letter-prompt">
          <span class="ems-quiz-acronym-sm">{mnemonic.acronym}</span>
          {" — what does "}
          <strong>{current.letter}</strong>
          {" stand for?"}
        </div>
        <div class="ems-quiz-progress muted">{letterIdx + 1} / {letters.length}</div>
        {letterResult === null ? (
          <div class="ems-quiz-input-row">
            <input
              ref={inputRef}
              class="ems-quiz-input"
              type="text"
              value={answer}
              placeholder="Type your answer…"
              autocomplete="off"
              autocorrect="off"
              autocapitalize="off"
              spellcheck={false}
              onInput={e => setAnswer((e.target as HTMLInputElement).value)}
              onKeyDown={e => { if (e.key === "Enter" && answer.trim()) submitAnswer(); }}
            />
            <button
              class="btn btn-primary"
              disabled={!answer.trim()}
              onClick={submitAnswer}
            >Submit</button>
          </div>
        ) : (
          <div class="ems-quiz-result">
            <div class={`ems-quiz-verdict ${letterResult.correct ? "correct" : "incorrect"}`}>
              {letterResult.correct ? "✓ Correct" : "✗ Incorrect"}
            </div>
            <div class="ems-quiz-correct-ans">
              <strong>{current.letter}</strong> = {letterResult.stand}
            </div>
            <button class="btn btn-primary" onClick={advance}>
              {letterIdx + 1 < letters.length ? "Next →" : "See Results"}
            </button>
          </div>
        )}
      </div>
    );
  }

  const correctCount = results.filter(r => r.correct).length;
  const finalGrade = chosenGrade ?? suggested;
  const gradeLabels: Record<Grade, string> = { again: "Again", hard: "Hard", good: "Good", easy: "Easy" };

  return (
    <div class="ems-quiz-card">
      <div class="ems-quiz-summary-title">{mnemonic.acronym} — Results</div>
      <div class="ems-quiz-score">{correctCount} / {results.length} correct</div>
      <div class="ems-quiz-result-list">
        {results.map((r, i) => (
          <div key={i} class={`ems-quiz-result-row ${r.correct ? "correct" : "incorrect"}`}>
            <span class="ems-letter-badge">{r.letter}</span>
            <span class="ems-quiz-result-stand">{r.stand}</span>
            {!r.correct && r.given && <span class="ems-quiz-result-given muted">you wrote: {r.given}</span>}
          </div>
        ))}
      </div>
      <div class="ems-quiz-grade-section">
        <div class="muted">Suggested: <strong>{gradeLabels[suggested]}</strong></div>
        <div class="ems-grade-row">
          {(["again", "hard", "good", "easy"] as Grade[]).map((g, i) => (
            <button
              key={g}
              class={`btn ${g === finalGrade ? (i === 0 ? "btn-danger" : i === 2 || i === 3 ? "btn-primary" : "") + " ems-grade-selected" : ""}`}
              onClick={() => setChosenGrade(g)}
            >
              {gradeLabels[g]}
            </button>
          ))}
        </div>
        <button class="btn btn-primary" onClick={() => onGrade(finalGrade)}>Confirm →</button>
      </div>
    </div>
  );
}

// ─── Quiz mode ────────────────────────────────────────────────────────────────

function QuizMode() {
  const srsStore = appState.value.emsSrs ?? {};
  const now = Date.now();
  const pinnedId = route.value.referenceCardId;

  const due = EMS_CLINICAL_MNEMONICS
    .filter(m => { const r = srsStore["ems::" + m.id]; return r && r.due <= now; })
    .sort((a, b) => (srsStore["ems::" + a.id]?.due ?? 0) - (srsStore["ems::" + b.id]?.due ?? 0))
    .map(m => ({ m, rec: srsStore["ems::" + m.id] }));

  const fresh = EMS_CLINICAL_MNEMONICS
    .filter(m => !srsStore["ems::" + m.id])
    .map(m => ({ m, rec: defaultRecord() }));

  const fullQueue = [...due, ...fresh];

  const initialQueue = pinnedId
    ? (() => {
        const found = EMS_CLINICAL_MNEMONICS.find(m => m.id === pinnedId);
        if (!found) return fullQueue;
        return [{ m: found, rec: srsStore["ems::" + found.id] ?? defaultRecord() }];
      })()
    : fullQueue;

  const [queue, setQueue] = useState(initialQueue);
  const [idx, setIdx] = useState(0);
  const [done, setDone] = useState(false);

  if (done || queue.length === 0) {
    return (
      <div class="empty-state">
        <div class="big">✓</div>
        <p>{pinnedId ? "Done!" : queue.length === 0 ? "All caught up! Come back later." : "Session complete!"}</p>
        <button class="btn" onClick={() => navigate({ view: "reference", referenceTab: "mnemonics" })}>← Back to mnemonics</button>
      </div>
    );
  }

  const { m, rec } = queue[idx];
  const remaining = queue.length - idx;

  function applyGrade(g: Grade) {
    const cardId = "ems::" + m.id;
    const updated = grade(rec, g);
    mutateState(draft => {
      if (!draft.emsSrs) draft.emsSrs = {};
      draft.emsSrs[cardId] = updated;
    });
    save();

    if (g === "again") {
      setQueue(q => [...q, { m, rec: updated }]);
    }
    if (idx + 1 >= queue.length + (g === "again" ? 1 : 0)) {
      setDone(true);
    } else {
      setIdx(i => i + 1);
    }
  }

  return (
    <>
      <div class="crumbs">
        <button class="btn-link" onClick={() => navigate({ view: "reference", referenceTab: "mnemonics" })}>← Back to EMS Mnemonics &amp; Acronyms</button>
      </div>
      <div class="ems-quiz-header">
        <span class="ems-quiz-counter">{remaining} card{remaining === 1 ? "" : "s"} remaining</span>
      </div>
      <PerLetterQuiz
        key={m.id + "-" + idx}
        mnemonic={m}
        rec={rec}
        remaining={remaining}
        onGrade={applyGrade}
      />
    </>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export function MnemonicsMode() {
  const hasCardId = !!route.value.referenceCardId;
  const isQuiz = hasCardId;

  return (
    <div class="ems-mnemonics">
      {isQuiz ? <QuizMode /> : <BrowseMode />}
    </div>
  );
}
```

- [ ] **Step 5.2: Run all tests**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 5.3: Type-check**

```bash
npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 5.3b: Fix MnemonicsMode quiz toggle**

The `isQuiz = !!route.value.referenceCardId` check only triggers quiz for deep-linked cards. The general "Quiz" button also needs to start quiz mode. Use local state for the browse/quiz toggle:

Replace the `MnemonicsMode` export and `BrowseMode` quiz button with this pattern:

```tsx
// At the top of the file, add:
// BrowseMode accepts onQuiz callback
function BrowseMode({ onQuiz }: { onQuiz: () => void }) {
  // ... same as before but replace the quiz button onClick:
  // onClick={() => navigate({ view: "reference", referenceTab: "mnemonics", referenceCardId: undefined })}
  // becomes:
  // onClick={onQuiz}
}

// QuizMode back button uses callback:
function QuizMode({ onBack }: { onBack: () => void }) {
  // ... same as before but replace:
  // navigate({ view: "reference", referenceTab: "mnemonics" })
  // with:
  // onBack()
}

// MnemonicsMode root:
export function MnemonicsMode() {
  const [isQuiz, setIsQuiz] = useState(!!route.value.referenceCardId);
  return (
    <div class="ems-mnemonics">
      {isQuiz
        ? <QuizMode onBack={() => setIsQuiz(false)} />
        : <BrowseMode onQuiz={() => setIsQuiz(true)} />}
    </div>
  );
}
```

- [ ] **Step 5.4: Commit**

```bash
git add src/views/reference/MnemonicsMode.tsx
git commit -m "feat(T-025): MnemonicsMode — extract from EmsMnemonicsView, update navigate calls to reference route"
```

---

## Task 6: MedsMode

> This task can be run in **parallel** with Tasks 4 and 5.

**Files:**
- Modify: `src/views/reference/MedsMode.tsx` (replace stub with full implementation)

- [ ] **Step 6.1: Replace `src/views/reference/MedsMode.tsx` with full implementation**

```tsx
import { useState } from "preact/hooks";
import { route, navigate, appState, mutateState, save } from "../../store/appStore";
import { BLS_MEDICATIONS } from "../../data/bls_medications";
import { defaultRecord, grade } from "../../lib/emsSrs";
import { ReferenceToolbar } from "../../components/ReferenceToolbar";
import type { BLSMedication, BLSScenario, BLSFollowUp, SRSRecord } from "../../types";

type BlsTab = "reference" | "scenarios" | "drill";

function MedCard({ med }: { med: BLSMedication }) {
  const [open, setOpen] = useState(false);
  return (
    <div class={`blsmed-card${open ? " expanded" : ""}`} onClick={() => setOpen((o) => !o)}>
      <div class="blsmed-card-header">
        <div class="blsmed-card-left">
          <span class="blsmed-name">{med.name}</span>
          {med.genericName && med.genericName !== med.name && (
            <span class="blsmed-generic muted">{med.genericName}</span>
          )}
        </div>
        <div class="blsmed-card-right">
          <span class="blsmed-expand-icon">{open ? "▴" : "▾"}</span>
        </div>
      </div>
      {!open && <div class="blsmed-mechanism-preview muted">{med.mechanism}</div>}
      {open && (
        <div class="blsmed-card-body">
          <div class="blsmed-mechanism">{med.mechanism}</div>
          <div class="blsmed-section blsmed-indications">
            <div class="blsmed-section-label">Indications</div>
            <ul class="blsmed-list">{med.indications.map((i, idx) => <li key={idx}>{i}</li>)}</ul>
          </div>
          <div class="blsmed-section blsmed-contraindications">
            <div class="blsmed-section-label">Contraindications</div>
            <ul class="blsmed-list">{med.contraindications.map((c, idx) => <li key={idx}>{c}</li>)}</ul>
          </div>
          <div class="blsmed-section">
            <div class="blsmed-section-label">Dose</div>
            <div><strong>Adult:</strong> {med.dose.adult}</div>
            {med.dose.pediatric && <div class="muted"><strong>Pediatric:</strong> {med.dose.pediatric}</div>}
            {med.dose.notes && <div class="muted">{med.dose.notes}</div>}
          </div>
          <div class="blsmed-section">
            <div class="blsmed-section-label">Route</div>
            <ul class="blsmed-list">{med.route.map((r, idx) => <li key={idx}>{r}</li>)}</ul>
          </div>
          <div class="blsmed-section">
            <div class="blsmed-section-label">Onset</div>
            <div>{med.onset}{med.duration ? ` · Duration: ${med.duration}` : ""}</div>
          </div>
          <div class="blsmed-section">
            <div class="blsmed-section-label">Side Effects</div>
            <ul class="blsmed-list">{med.sideEffects.map((s, idx) => <li key={idx}>{s}</li>)}</ul>
          </div>
          <div class="blsmed-section blsmed-pearls">
            <div class="blsmed-section-label">Clinical Pearls</div>
            <ul class="blsmed-list">{med.clinicalPearls.map((p, idx) => <li key={idx}>{p}</li>)}</ul>
          </div>
        </div>
      )}
    </div>
  );
}

function ReferenceSubTab() {
  const categories = ["All", ...Array.from(new Set(BLS_MEDICATIONS.map((m) => m.category)))];
  const [activeCat, setActiveCat] = useState("All");
  const [query, setQuery] = useState("");

  const filtered = BLS_MEDICATIONS.filter((m) => {
    const matchesCat = activeCat === "All" || m.category === activeCat;
    const q = query.toLowerCase();
    const matchesQuery = !q ||
      m.name.toLowerCase().includes(q) ||
      (m.genericName?.toLowerCase().includes(q) ?? false);
    return matchesCat && matchesQuery;
  });

  return (
    <div class="blsmed-reference">
      <ReferenceToolbar
        query={query}
        onQueryChange={setQuery}
        categories={categories}
        activeCategory={activeCat}
        onCategoryChange={setActiveCat}
        placeholder="Search medications…"
      />
      <div class="blsmed-card-grid">
        {filtered.map((med) => <MedCard key={med.id} med={med} />)}
        {filtered.length === 0 && <p class="muted">No medications match.</p>}
      </div>
    </div>
  );
}

function buildScenarioQueue() {
  const srsStore = appState.value.blsMedsSrs ?? {};
  const now = Date.now();
  const all: Array<{ scenario: BLSScenario; medId: string; rec: SRSRecord }> = [];
  for (const med of BLS_MEDICATIONS) {
    for (const s of med.scenarios) {
      const key = `blsmed::${med.id}::${s.id}`;
      const rec = srsStore[key] ?? defaultRecord();
      all.push({ scenario: s, medId: med.id, rec });
    }
  }
  const due = all.filter((x) => x.rec.due && x.rec.due <= now).sort((a, b) => a.rec.due - b.rec.due);
  const fresh = all.filter((x) => !x.rec.due || x.rec.due === 0);
  const upcoming = all.filter((x) => x.rec.due && x.rec.due > now).sort((a, b) => a.rec.due - b.rec.due);
  return [...due, ...fresh, ...upcoming].slice(0, 10);
}

function ScenariosTab() {
  const [queue] = useState(() => buildScenarioQueue());
  const [idx, setIdx] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [deepMode, setDeepMode] = useState(false);
  const [followUpIdx, setFollowUpIdx] = useState(0);
  const [followUpAnswered, setFollowUpAnswered] = useState(false);
  const [followUpSelected, setFollowUpSelected] = useState<string | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [done, setDone] = useState(false);

  if (done || queue.length === 0) {
    const pct = queue.length > 0 ? Math.round((correctCount / Math.min(idx, queue.length)) * 100) : 0;
    return (
      <div class="blsmed-scenarios-done">
        <div class="blsmed-done-score">{pct}%</div>
        <div class="blsmed-done-detail">{correctCount} / {Math.min(idx, queue.length)} correct</div>
        <button class="btn btn-primary" type="button" onClick={() => navigate({ view: "reference", referenceTab: "meds" })}>
          ← Back to Reference
        </button>
      </div>
    );
  }

  const { scenario, medId, rec } = queue[idx];
  const isCorrect = answered && selectedAnswer === scenario.answer;
  const hasFollowUps = scenario.followUps.length > 0;
  const currentFollowUp: BLSFollowUp | undefined = scenario.followUps[followUpIdx];

  function chooseAnswer(ans: string) {
    if (answered) return;
    setAnswered(true);
    setSelectedAnswer(ans);
    const wasCorrect = ans === scenario.answer;
    if (wasCorrect) setCorrectCount((c) => c + 1);
    const key = `blsmed::${medId}::${scenario.id}`;
    const updated = grade(rec, wasCorrect ? "good" : "again");
    mutateState((draft) => {
      if (!draft.blsMedsSrs) draft.blsMedsSrs = {};
      draft.blsMedsSrs[key] = updated;
      if (!draft.drills.blsmedsquiz) draft.drills.blsmedsquiz = { scenariosCompleted: 0, lastSessionAt: null };
      draft.drills.blsmedsquiz.scenariosCompleted += 1;
      draft.drills.blsmedsquiz.lastSessionAt = new Date().toISOString();
    });
    save();
  }

  function advance() {
    if (idx + 1 >= queue.length) setDone(true);
    else {
      setIdx((i) => i + 1);
      setAnswered(false);
      setSelectedAnswer(null);
      setDeepMode(false);
      setFollowUpIdx(0);
      setFollowUpAnswered(false);
      setFollowUpSelected(null);
    }
  }

  function chooseFollowUp(opt: string) {
    if (followUpAnswered) return;
    setFollowUpAnswered(true);
    setFollowUpSelected(opt);
  }

  function nextFollowUp() {
    if (followUpIdx + 1 >= scenario.followUps.length) {
      setDeepMode(false);
      advance();
    } else {
      setFollowUpIdx((i) => i + 1);
      setFollowUpAnswered(false);
      setFollowUpSelected(null);
    }
  }

  return (
    <div class="blsmed-scenarios">
      <div class="blsmed-scenarios-header">
        <span class="blsmed-progress">{idx + 1} / {queue.length}</span>
        <span class="blsmed-score muted">{correctCount} correct</span>
      </div>
      {!deepMode ? (
        <div class="blsmed-scenario-card">
          <div class="blsmed-vignette">{scenario.vignette}</div>
          <div class="blsmed-prompt">{scenario.prompt}</div>
          {!answered && scenario.format === "give-withhold" && (
            <div class="blsmed-gw-row">
              <button class="btn btn-primary" type="button" onClick={() => chooseAnswer("give")}>Give</button>
              <button class="btn btn-danger" type="button" onClick={() => chooseAnswer("withhold")}>Withhold</button>
            </div>
          )}
          {answered && (
            <>
              <div class={`blsmed-feedback ${isCorrect ? "blsmed-feedback-correct" : "blsmed-feedback-wrong"}`}>
                {isCorrect ? "Correct!" : `Incorrect — answer is ${scenario.answer.charAt(0).toUpperCase() + scenario.answer.slice(1)}`}
              </div>
              <div class="blsmed-explanation muted">{scenario.explanation}</div>
              <div class="blsmed-actions">
                {hasFollowUps && <button class="btn" type="button" onClick={() => setDeepMode(true)}>Go Deeper →</button>}
                <button class="btn btn-primary" type="button" onClick={advance}>Next →</button>
              </div>
            </>
          )}
        </div>
      ) : (
        currentFollowUp && (
          <div class="blsmed-followup-card">
            <div class="blsmed-followup-label muted">Deep Mode — Follow-up</div>
            <div class="blsmed-followup-question">{currentFollowUp.question}</div>
            <div class="blsmed-followup-options">
              {currentFollowUp.options.map((opt) => (
                <button
                  key={opt}
                  class={`blsmed-option btn${
                    followUpAnswered && opt === currentFollowUp.answer
                      ? " correct"
                      : followUpAnswered && opt === followUpSelected && opt !== currentFollowUp.answer
                      ? " wrong"
                      : ""
                  }`}
                  type="button"
                  disabled={followUpAnswered}
                  onClick={() => chooseFollowUp(opt)}
                >{opt}</button>
              ))}
            </div>
            {followUpAnswered && (
              <button class="btn btn-primary" type="button" onClick={nextFollowUp}>Next →</button>
            )}
          </div>
        )
      )}
    </div>
  );
}

type CardType = "dose" | "indications" | "contraindications" | "route";

const CARD_TYPES: CardType[] = ["dose", "indications", "contraindications", "route"];
const CARD_LABELS: Record<CardType, string> = {
  dose: "Dose", indications: "Indications", contraindications: "Contraindications", route: "Route",
};
const CARD_QUESTIONS: Record<CardType, string> = {
  dose: "What is the adult dose?",
  indications: "When is it indicated?",
  contraindications: "When should you withhold it?",
  route: "How is it administered?",
};

function buildDrillQueue(srsStore: Record<string, SRSRecord>) {
  const now = Date.now();
  const all: Array<{ med: BLSMedication; type: CardType; key: string; rec: SRSRecord }> = [];
  for (const med of BLS_MEDICATIONS) {
    for (const type of CARD_TYPES) {
      const key = `blsmed::${med.id}::${type}`;
      const rec = srsStore[key] ?? defaultRecord();
      all.push({ med, type, key, rec });
    }
  }
  const due = all.filter((x) => x.rec.due > 0 && x.rec.due <= now).sort((a, b) => a.rec.due - b.rec.due);
  const fresh = all.filter((x) => !x.rec.due || x.rec.due === 0);
  return [...due, ...fresh];
}

function DrillTab() {
  const srsStore = appState.value.blsMedsSrs ?? {};
  const [revealed, setRevealed] = useState(false);
  const [done, setDone] = useState(false);
  const [queue] = useState(() => buildDrillQueue(srsStore));
  const [idx, setIdx] = useState(0);

  if (done || queue.length === 0) {
    return (
      <div class="blsmed-drill-done">
        <p>{queue.length === 0 ? "All caught up! Check back later." : "Session complete!"}</p>
        <button class="btn" type="button" onClick={() => navigate({ view: "reference", referenceTab: "meds" })}>
          ← Back to Reference
        </button>
      </div>
    );
  }

  const { med, type, key, rec } = queue[idx];

  function applyGrade(g: "again" | "hard" | "good" | "easy") {
    const updated = grade(rec, g);
    mutateState((draft) => {
      if (!draft.blsMedsSrs) draft.blsMedsSrs = {};
      draft.blsMedsSrs[key] = updated;
    });
    save();
    if (idx + 1 >= queue.length) setDone(true);
    else { setIdx((i) => i + 1); setRevealed(false); }
  }

  const answerItems =
    type === "indications" ? med.indications :
    type === "contraindications" ? med.contraindications :
    type === "route" ? med.route : null;
  const answerText =
    type === "dose"
      ? med.dose.adult + (med.dose.pediatric ? ` · Peds: ${med.dose.pediatric}` : "")
      : null;

  return (
    <div class="blsmed-drill">
      <div class="blsmed-drill-header">
        <span class="blsmed-drill-counter">{queue.length - idx} card{queue.length - idx === 1 ? "" : "s"} remaining</span>
      </div>
      <div class="blsmed-drill-card">
        <div class="blsmed-drill-card-front">
          <div class="blsmed-drill-cat">{CARD_LABELS[type]}</div>
          <div class="blsmed-drill-name">{med.name}</div>
          <div class="blsmed-drill-question">{CARD_QUESTIONS[type]}</div>
        </div>
        {revealed && (
          <div class="blsmed-drill-card-back">
            {answerItems ? (
              <ul class="blsmed-list">{answerItems.map((item, i) => <li key={i}>{item}</li>)}</ul>
            ) : (
              <div class="blsmed-drill-text-answer">{answerText}</div>
            )}
          </div>
        )}
        {!revealed ? (
          <button class="btn btn-primary" type="button" onClick={() => setRevealed(true)}>Reveal</button>
        ) : (
          <div class="blsmed-grade-row">
            {(["again", "hard", "good", "easy"] as const).map((g, i) => (
              <button
                key={g}
                class={`btn ${i === 0 ? "btn-danger" : i === 2 ? "btn-primary" : ""}`}
                type="button"
                onClick={() => applyGrade(g)}
              >
                {g.charAt(0).toUpperCase() + g.slice(1)}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function MedsMode() {
  const r = route.value as { blsmedsTab?: string };
  const tab = (r.blsmedsTab as BlsTab) ?? "reference";
  const srsStore = appState.value.blsMedsSrs ?? {};
  const now = Date.now();
  const drillDue = CARD_TYPES.reduce((count, type) =>
    count + BLS_MEDICATIONS.filter((m) => {
      const rec = srsStore[`blsmed::${m.id}::${type}`];
      return rec && rec.due > 0 && rec.due <= now;
    }).length, 0);

  return (
    <div class="blsmed-wrap">
      <h1 class="blsmed-title">BLS Medications</h1>
      <div class="blsmed-tab-strip">
        {([["reference", "Reference"], ["scenarios", "Scenarios"], ["drill", `Drill${drillDue > 0 ? ` (${drillDue})` : ""}`]] as [BlsTab, string][]).map(([id, label]) => (
          <button
            key={id}
            class={`blsmed-tab-btn${tab === id ? " active" : ""}`}
            type="button"
            onClick={() => navigate({ view: "reference", referenceTab: "meds" })}
          >{label}</button>
        ))}
      </div>
      {tab === "reference" && <ReferenceSubTab />}
      {tab === "scenarios" && <ScenariosTab />}
      {tab === "drill" && <DrillTab />}
    </div>
  );
}
```

**Note on MedsMode internal tabs:** The internal reference/scenarios/drill tabs in MedsMode are toggled via local state (`blsmedsTab` on the route). The tab buttons currently both navigate to `reference/meds` — which resets the tab. To preserve sub-tab navigation, change the tab button onClick to use local state instead: extract `tab` into useState and drop the navigate calls for internal tabs. Here's the corrected tab strip for MedsMode:

```tsx
export function MedsMode() {
  const [tab, setTab] = useState<BlsTab>("reference");
  const srsStore = appState.value.blsMedsSrs ?? {};
  const now = Date.now();
  const drillDue = CARD_TYPES.reduce((count, type) =>
    count + BLS_MEDICATIONS.filter((m) => {
      const rec = srsStore[`blsmed::${m.id}::${type}`];
      return rec && rec.due > 0 && rec.due <= now;
    }).length, 0);

  return (
    <div class="blsmed-wrap">
      <h1 class="blsmed-title">BLS Medications</h1>
      <div class="blsmed-tab-strip">
        {([["reference", "Reference"], ["scenarios", "Scenarios"], ["drill", `Drill${drillDue > 0 ? ` (${drillDue})` : ""}`]] as [BlsTab, string][]).map(([id, label]) => (
          <button
            key={id}
            class={`blsmed-tab-btn${tab === id ? " active" : ""}`}
            type="button"
            onClick={() => setTab(id)}
          >{label}</button>
        ))}
      </div>
      {tab === "reference" && <ReferenceSubTab />}
      {tab === "scenarios" && <ScenariosTab />}
      {tab === "drill" && <DrillTab />}
    </div>
  );
}
```

Use this corrected version for `MedsMode`.

- [ ] **Step 6.2: Run all tests**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 6.3: Type-check**

```bash
npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 6.4: Commit**

```bash
git add src/views/reference/MedsMode.tsx
git commit -m "feat(T-025): MedsMode — extract from BlsMedsView, add ReferenceToolbar, update navigate calls"
```

---

## Task 7: ConditionCompareModal (T-027)

> Depends on Task 4 being committed.

**Files:**
- Modify: `src/components/ConditionCompareModal.tsx` (replace stub with full implementation)

- [ ] **Step 7.1: Replace `src/components/ConditionCompareModal.tsx` with the full modal**

```tsx
import type { MedicalCondition } from "../types";

const DIM_LABELS: Record<string, string> = {
  onset: "Onset", skin: "Skin", breath: "Breath Odor", respirations: "Respirations",
  keySign: "Key Finding", history: "History", dyspnea: "Dyspnea", edema: "Peripheral Edema",
  breathSounds: "Breath Sounds", cough: "Cough", smokingHistory: "Smoking History",
  reversibility: "Reversibility", fever: "Fever", breathSoundsSymmetry: "Breath Sound Symmetry",
  symptomDuration: "Duration", FASTexam: "FAST Exam", headache: "Headache", urgency: "Urgency",
  airway: "Airway", bloodPressure: "Blood Pressure", skinFindings: "Skin Findings",
  shockSigns: "Shock Signs", epinephrine: "Epinephrine", cause: "Cause",
  heartRate: "Heart Rate", lungsounds: "Lung Sounds", JVD: "JVD",
};

interface Props {
  group: { label: string; dimensions: string[] };
  conditions: MedicalCondition[];
  onClose: () => void;
}

export function ConditionCompareModal({ group, conditions, onClose }: Props) {
  if (!conditions.length) return null;

  return (
    <div class="compare-modal-overlay" onClick={onClose}>
      <div class="compare-modal" onClick={e => e.stopPropagation()}>
        <div class="compare-modal-header">
          <h2 class="compare-modal-title">{group.label}</h2>
          <button class="compare-modal-close btn" type="button" onClick={onClose} aria-label="Close">×</button>
        </div>
        <div class="compare-modal-body">
          <div class="medcond-compare-table" style={`--cols: ${conditions.length}`}>
            <div class="medcond-th medcond-dim-label" />
            {conditions.map(c => <div key={c.id} class="medcond-th">{c.name}</div>)}
            {group.dimensions.map((dim, ri) => (
              <>
                <div key={`label-${dim}`} class={`medcond-td medcond-dim-label${ri % 2 === 1 ? " medcond-row-stripe" : ""}`}>
                  {DIM_LABELS[dim] ?? dim}
                </div>
                {conditions.map(c => (
                  <div
                    key={`${c.id}-${dim}`}
                    class={`medcond-td${dim === "keySign" ? " medcond-key-row" : ri % 2 === 1 ? " medcond-row-stripe" : ""}`}
                  >
                    {c.compareDimensions?.[dim] ?? "—"}
                  </div>
                ))}
              </>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
```

Add these styles to `css/styles.css` (append at the end):

```css
/* ── ConditionCompareModal ──────────────────────────────────────────────── */
.compare-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
  padding: 1rem;
}
.compare-modal {
  background: var(--surface);
  border-radius: 12px;
  max-width: 90vw;
  max-height: 85vh;
  overflow: auto;
  width: 100%;
}
.compare-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--border);
  position: sticky;
  top: 0;
  background: var(--surface);
}
.compare-modal-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
}
.compare-modal-close {
  font-size: 1.25rem;
  line-height: 1;
  padding: 0.25rem 0.5rem;
}
.compare-modal-body {
  padding: 1rem;
  overflow-x: auto;
}

/* ── ReferenceToolbar ───────────────────────────────────────────────────── */
.ref-toolbar {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1rem;
}
.ref-search-wrap {
  position: relative;
  display: flex;
  align-items: center;
}
.ref-search-input {
  width: 100%;
  padding: 0.5rem 2rem 0.5rem 0.75rem;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface);
  font-size: 0.875rem;
}
.ref-search-clear {
  position: absolute;
  right: 0.5rem;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1rem;
  color: var(--muted);
  padding: 0;
  line-height: 1;
}
.ref-filter-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
}
.ref-filter-chip {
  padding: 0.25rem 0.75rem;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: var(--surface);
  font-size: 0.8125rem;
  cursor: pointer;
  white-space: nowrap;
}
.ref-filter-chip.active {
  background: var(--primary);
  border-color: var(--primary);
  color: #fff;
}

/* ── ReferenceView tab strip ────────────────────────────────────────────── */
.ref-wrap {
  max-width: 800px;
  margin: 0 auto;
  padding: 0 1rem 4rem;
}
.ref-tab-strip {
  display: flex;
  gap: 0.25rem;
  margin-bottom: 1.5rem;
  border-bottom: 2px solid var(--border);
  padding-bottom: 0;
}
.ref-tab-btn {
  padding: 0.5rem 1rem;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  margin-bottom: -2px;
  font-size: 0.9375rem;
  font-weight: 500;
  cursor: pointer;
  color: var(--muted);
}
.ref-tab-btn.active {
  color: var(--primary);
  border-bottom-color: var(--primary);
}

/* ── Inline compare button ──────────────────────────────────────────────── */
.medcond-compare-inline-btn {
  margin-top: 0.75rem;
  font-size: 0.8125rem;
}
```

- [ ] **Step 7.2: Run all tests**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 7.3: Type-check**

```bash
npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 7.4: Commit**

```bash
git add src/components/ConditionCompareModal.tsx css/styles.css
git commit -m "feat(T-027): ConditionCompareModal — inline compare replaces Compare sub-tab"
```

---

## Task 8: App.tsx + index.html Wiring

> Depends on Tasks 3–6 being committed.

**Files:**
- Modify: `src/App.tsx`
- Modify: `index.html`

- [ ] **Step 8.1: Update `src/App.tsx`**

Add the import for ReferenceView and add `reference` to the VIEWS map. Replace the existing imports block that includes `EmsMnemonicsView`, `MedConditionsView`, `BlsMedsView` — keep them if they still exist as old files, but ensure the reference view is added:

```tsx
import { ReferenceView } from "./views/ReferenceView";
```

Add to the `VIEWS` map:

```tsx
const VIEWS: Partial<Record<Route["view"], () => JSX.Element | null>> = {
  home:          () => <HomeView />,
  sheet:         () => <SheetView />,
  stats:         () => <StatsView />,
  guide:         () => <GuideView />,
  settings:      () => <SettingsView />,
  reference:     () => <ReferenceView />,
  mnemonics:     () => <ReferenceView />,      // old route redirected by router
  medconditions: () => <ReferenceView />,      // old route redirected by router
  blsmeds:       () => <ReferenceView />,      // old route redirected by router
  chat:          () => <ChatView />,
  examday:       () => <ExamDayView />,
  sources:       () => <SourcesView />,
  skills:        () => <SkillsView />,
};
```

- [ ] **Step 8.2: Update `index.html` nav button**

In `index.html`, change the Reference nav button from `data-nav="medconditions"` to `data-nav="reference"`:

```html
<button data-nav="reference" type="button">Reference</button>
```

- [ ] **Step 8.3: Run all tests**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 8.4: Type-check**

```bash
npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 8.5: Commit**

```bash
git add src/App.tsx index.html
git commit -m "feat(T-024): wire ReferenceView into App.tsx, update nav to reference route"
```

---

## Task 9: E2E Tests

> Depends on Task 8 being committed and the dev server running.

**Files:**
- Create: `tests/e2e/reference.spec.js`

- [ ] **Step 9.1: Create `tests/e2e/reference.spec.js`**

```js
import { test, expect } from "@playwright/test";

test.describe("Reference view — tab navigation", () => {
  test("navigating to /reference shows Conditions tab active", async ({ page }) => {
    await page.goto("./reference");
    const activeTab = page.locator(".ref-tab-btn.active");
    await expect(activeTab).toHaveText("Conditions");
  });

  test("clicking Mnemonics tab navigates to /reference/mnemonics", async ({ page }) => {
    await page.goto("./reference");
    await page.click("text=Mnemonics");
    await expect(page).toHaveURL(/reference\/mnemonics/);
    const activeTab = page.locator(".ref-tab-btn.active");
    await expect(activeTab).toHaveText("Mnemonics");
  });

  test("clicking Meds tab navigates to /reference/meds", async ({ page }) => {
    await page.goto("./reference");
    await page.click("text=Meds");
    await expect(page).toHaveURL(/reference\/meds/);
    const activeTab = page.locator(".ref-tab-btn.active");
    await expect(activeTab).toHaveText("Meds");
  });

  test("direct link /reference/meds opens meds tab", async ({ page }) => {
    await page.goto("./reference/meds");
    const activeTab = page.locator(".ref-tab-btn.active");
    await expect(activeTab).toHaveText("Meds");
  });

  test("direct link /reference/mnemonics opens mnemonics tab", async ({ page }) => {
    await page.goto("./reference/mnemonics");
    const activeTab = page.locator(".ref-tab-btn.active");
    await expect(activeTab).toHaveText("Mnemonics");
  });

  test("back button after tab switch returns to conditions", async ({ page }) => {
    await page.goto("./reference");
    await page.click("text=Meds");
    await expect(page).toHaveURL(/reference\/meds/);
    await page.goBack();
    await expect(page).toHaveURL(/reference\/conditions/);
    const activeTab = page.locator(".ref-tab-btn.active");
    await expect(activeTab).toHaveText("Conditions");
  });
});

test.describe("Reference view — old route redirects", () => {
  test("/mnemonics redirects to /reference/mnemonics", async ({ page }) => {
    await page.goto("./mnemonics");
    await expect(page).toHaveURL(/reference\/mnemonics/);
  });

  test("/medconditions redirects to /reference/conditions", async ({ page }) => {
    await page.goto("./medconditions");
    await expect(page).toHaveURL(/reference\/conditions/);
  });

  test("/blsmeds redirects to /reference/meds", async ({ page }) => {
    await page.goto("./blsmeds");
    await expect(page).toHaveURL(/reference\/meds/);
  });
});

test.describe("Reference view — search filters", () => {
  test("typing in search narrows conditions list", async ({ page }) => {
    await page.goto("./reference/conditions");
    const cards = page.locator(".medcond-card");
    const initialCount = await cards.count();
    await page.fill(".ref-search-input", "hypoglycemia");
    const filteredCount = await cards.count();
    expect(filteredCount).toBeLessThan(initialCount);
    expect(filteredCount).toBeGreaterThan(0);
  });

  test("typing in search narrows mnemonics list", async ({ page }) => {
    await page.goto("./reference/mnemonics");
    const cards = page.locator(".ems-card");
    const initialCount = await cards.count();
    await page.fill(".ref-search-input", "OPQRST");
    const filteredCount = await cards.count();
    expect(filteredCount).toBeLessThan(initialCount);
    expect(filteredCount).toBeGreaterThan(0);
  });
});

test.describe("Reference view — compare modal", () => {
  test("condition card with compareWith shows compare button when expanded", async ({ page }) => {
    await page.goto("./reference/conditions");
    // Expand Hypoglycemia card
    await page.click("text=Hypoglycemia");
    await expect(page.locator(".medcond-compare-inline-btn")).toBeVisible();
  });

  test("clicking compare button opens the compare modal", async ({ page }) => {
    await page.goto("./reference/conditions");
    await page.click("text=Hypoglycemia");
    await page.click(".medcond-compare-inline-btn");
    await expect(page.locator(".compare-modal")).toBeVisible();
  });

  test("compare modal close button dismisses the modal", async ({ page }) => {
    await page.goto("./reference/conditions");
    await page.click("text=Hypoglycemia");
    await page.click(".medcond-compare-inline-btn");
    await page.click(".compare-modal-close");
    await expect(page.locator(".compare-modal")).not.toBeVisible();
  });
});
```

- [ ] **Step 9.2: Run E2E tests**

```bash
npm run test:e2e:browser -- tests/e2e/reference.spec.js
```

Expected: all tests pass. If redirect tests fail (URL doesn't update in the browser because the router uses `pushState` rather than redirect), verify `parseParts` correctly maps old routes to the `reference` view and that `writePath` is called on navigation.

**Note on redirect E2E tests:** The old routes are handled at the router parse layer — the URL will not change automatically to `/reference/mnemonics` when you navigate to `/mnemonics` unless you also call `writePath` after parsing. Update `src/App.tsx` or `src/store/appStore.ts` to call `writePath(..., "replace")` when a parsed route has `view: "reference"` but the current path doesn't start with `/reference`. A simpler approach: update `parseRoute()` in `router.ts` to call `writePath` as a side-effect when redirecting:

```ts
export function parseRoute(): Route | null {
  const r = parsePath() ?? parseHash();
  if (!r) return null;
  // Rewrite old paths to new reference URL
  if (r.view === "reference" && !window.location.pathname.includes("/reference")) {
    writePath(r, "replace");
  }
  return r;
}
```

Add this side-effect to `parseRoute` in `src/router/router.ts`. Re-run `npx tsc --noEmit` to confirm no type errors.

- [ ] **Step 9.3: Commit**

```bash
git add tests/e2e/reference.spec.js src/router/router.ts
git commit -m "test(T-024): E2E tests for reference view tabs, redirects, search, compare modal"
```

---

## Task 10: Final Verification + PR

- [ ] **Step 10.1: Run full test suite**

```bash
npm run test:ci
```

Expected: Vitest unit tests pass with coverage thresholds met; Playwright E2E passes.

- [ ] **Step 10.2: Type-check**

```bash
npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 10.3: Visual smoke test**

```bash
npm run dev
```

Open browser. Verify:
- Clicking "Reference" in nav goes to `/reference/conditions`
- Conditions tab shows medical condition cards with search bar and category pills
- Switching to Mnemonics tab shows mnemonics list
- Switching to Meds tab shows BLS medications list
- Expanding a condition card (e.g., Hypoglycemia) shows "⇄ Compare with Hyperglycemia" button
- Clicking compare opens the modal with the side-by-side table
- Clicking × closes the modal
- Old URLs `/mnemonics`, `/medconditions`, `/blsmeds` all redirect to `/reference/<tab>`

- [ ] **Step 10.4: Push branch and open PR**

```bash
git push origin fix-video-inline-embed
gh pr create --title "feat(T-024,T-025,T-026,T-027): Merged Reference view — Conditions / Mnemonics / Meds" \
  --body "## Summary

Consolidates three separate reference views into a single \`ReferenceView\` at \`/reference/<tab>\`.

### Changes
- **T-025:** \`ReferenceView\` shell with tab switcher (Conditions | Mnemonics | Meds), URL-synced sub-tab
- **T-026:** Shared \`ReferenceToolbar\` component (search + category pills) used across all three modes
- **T-027:** Removed Compare sub-tab; added inline ⇄ Compare button on condition cards, opening \`ConditionCompareModal\`
- Old routes \`/mnemonics\`, \`/medconditions\`, \`/blsmeds\` redirect to new \`/reference/<tab>\` URLs
- Nav 'Reference' button updated to point to \`reference\` route

### Files
- New: \`src/views/ReferenceView.tsx\`, \`src/views/reference/{Conditions,Mnemonics,Meds}Mode.tsx\`
- New: \`src/components/ReferenceToolbar.tsx\`, \`src/components/ConditionCompareModal.tsx\`
- Modified: \`src/types/index.ts\`, \`src/router/router.ts\`, \`src/App.tsx\`, \`index.html\`
- Tests: \`tests/components/ReferenceToolbar.test.tsx\`, \`tests/views/ReferenceView.test.tsx\`, \`tests/e2e/reference.spec.js\`

Closes #60, #61, #62, #63

🤖 Generated with [Claude Code](https://claude.com/claude-code)"
```

- [ ] **Step 10.5: Ask user whether to deploy to stage**

After pushing and creating the PR, ask: "PR is open. Would you like me to push to stage?"
