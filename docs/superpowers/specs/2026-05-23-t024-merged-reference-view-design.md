# T-024: Merged Reference View Design

**Date:** 2026-05-23  
**Issues:** T-024 (#60), T-025 (#61), T-026 (#62), T-027 (#63)  
**Approach:** New `reference` route with three child mode components

---

## Summary

Consolidate `EmsMnemonicsView`, `MedConditionsView`, and `BlsMedsView` into a single `ReferenceView` with a tab switcher. Shared `ReferenceToolbar` component (search + category pills) consumed by all three modes. Old routes redirect to new `/reference/<tab>` URLs. Compare sub-tab removed from conditions; replaced with inline compare modal.

---

## File Structure

```
src/
  views/
    ReferenceView.tsx                    ← new shell: tab bar only
    reference/
      ConditionsMode.tsx                 ← extracted from MedConditionsView
      MnemonicsMode.tsx                  ← extracted from EmsMnemonicsView
      MedsMode.tsx                       ← extracted from BlsMedsView
  components/
    ReferenceToolbar.tsx                 ← new shared toolbar
    ConditionCompareModal.tsx            ← new compare modal
```

Old top-level view files (`EmsMnemonicsView.tsx`, `MedConditionsView.tsx`, `BlsMedsView.tsx`) become thin redirect shims, cleaned up in T-034.

---

## Routing

### Type Changes (`src/types/index.ts`)

- Add `"reference"` to `RouteView`
- Add `referenceTab?: "conditions" | "mnemonics" | "meds"` to `Route`
- Add `referenceCardId?: string` to `Route` (for mnemonics quiz deep-link)

### Router (`src/router/router.ts`)

| Incoming path | Result |
|---|---|
| `/reference` | `{ view: "reference", referenceTab: "conditions" }` |
| `/reference/conditions` | `{ view: "reference", referenceTab: "conditions" }` |
| `/reference/mnemonics` | `{ view: "reference", referenceTab: "mnemonics" }` |
| `/reference/mnemonics/quiz/<id>` | `{ view: "reference", referenceTab: "mnemonics", referenceCardId: id }` |
| `/reference/meds` | `{ view: "reference", referenceTab: "meds" }` |
| `/mnemonics` (old) | redirect → `/reference/mnemonics` |
| `/medconditions` (old) | redirect → `/reference/conditions` |
| `/blsmeds` (old) | redirect → `/reference/meds` |

`writePath` for `reference`: `/reference/<tab>` (default tab: `conditions`).

### App.tsx

- Add `reference: () => <ReferenceView />` to `VIEWS`
- `mnemonics`, `medconditions`, `blsmeds` entries stay in router parse for redirect purposes only

### Nav (`index.html`)

Change the Reference nav button:
```html
<!-- before -->
<button data-nav="medconditions" type="button">Reference</button>
<!-- after -->
<button data-nav="reference" type="button">Reference</button>
```

---

## ReferenceView Shell (`src/views/ReferenceView.tsx`)

- Renders a tab pill row: **Conditions | Mnemonics | Meds**
- Active tab determined by `route.value.referenceTab` (default: `"conditions"`)
- Tab click calls `navigate({ view: "reference", referenceTab: tab })`
- Renders the active mode component below the tab bar
- No other chrome — each mode owns its header, toolbar, and list

---

## ReferenceToolbar Component (`src/components/ReferenceToolbar.tsx`)

```tsx
interface ReferenceToolbarProps {
  query: string;
  onQueryChange: (q: string) => void;
  categories: string[];           // ["All", ...domain-specific cats]
  activeCategory: string;
  onCategoryChange: (c: string) => void;
  placeholder?: string;
}
```

- Text input: live filter (no submit), clears with × button
- Horizontal scrollable category pills: single-select, "All" resets
- All three modes consume this component with their own category lists

---

## Mode Components

### ConditionsMode (`src/views/reference/ConditionsMode.tsx`)

Extracted from `MedConditionsView`. Changes:
- Remove the "Compare" sub-tab entirely
- Add `⇄ Compare` button on cards where `cond.compareWith` is non-empty
- Clicking opens `ConditionCompareModal`
- Use `ReferenceToolbar` for search + category filter

### MnemonicsMode (`src/views/reference/MnemonicsMode.tsx`)

Extracted from `EmsMnemonicsView`. Changes:
- Quiz deep-link URL becomes `/reference/mnemonics/quiz/<cardId>`
- Use `ReferenceToolbar` for search + category filter
- Browse/quiz toggle stays as internal state (not URL sub-tab)

### MedsMode (`src/views/reference/MedsMode.tsx`)

Extracted from `BlsMedsView`. Changes:
- Internal sub-tabs (reference / scenarios / drill) stay as local state
- Use `ReferenceToolbar` for search on the reference sub-tab
- Category pills use medication class/type as categories

---

## T-027: ConditionCompareModal

### Data Change (`src/data/medical_conditions.ts`)

Add optional field to `MedicalCondition`:
```ts
compareWith?: string[];   // array of condition IDs/names that are confusable
```

### ConditionCompareModal (`src/components/ConditionCompareModal.tsx`)

- Props: `condA: MedicalCondition`, `condB: MedicalCondition`, `onClose: () => void`
- Renders side-by-side table: Signs & Symptoms | Distinguishing Features | Critical Findings | Treatment
- Uses existing Modal component / portal pattern from `src/components/ui/Modal.tsx`
- Triggered by a modal signal (similar to `openConfirmModal`)

### Inline Link on Condition Cards

- Cards with `compareWith` show a small `⇄ Compare with <name>` chip
- Clicking opens the compare modal; does NOT navigate

---

## Testing

### Unit Tests

- `tests/referenceToolbar.test.tsx` — live filter, category pill single-select, "All" reset
- `tests/referenceView.test.tsx` — tab switching updates route, URL sync, default tab is conditions

### Router Tests

- `tests/router.test.ts` (existing) — add cases for `/reference/<tab>`, redirect for old routes

### E2E Tests

- Navigate to `/reference/conditions`, switch to meds tab, verify URL is `/reference/meds`
- Verify `/mnemonics` redirects to `/reference/mnemonics`
- Open a condition card with compareWith, click compare, verify modal appears
- Verify search filters condition list live

---

## Acceptance Criteria (from issues)

- [ ] Tab switch updates URL
- [ ] Browser back/forward navigates between tabs
- [ ] Direct link to `/reference/meds` opens meds tab
- [ ] All three tabs share the same toolbar markup and behavior
- [ ] Searching narrows visible items live (no submit)
- [ ] Categories are exclusive single-select pills; "All" is default
- [ ] Compare sub-tab is gone
- [ ] Conditions with confusable counterparts show inline compare link
- [ ] Modal renders side-by-side comparison data
