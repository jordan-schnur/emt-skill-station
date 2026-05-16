# Testing Guide – NREMT Skill Sheet Trainer

This document describes the testing suite for the NREMT study tool, including how to run tests, what they cover, and how to add new tests as features are added.

## Overview

The test suite uses **Jest** for unit, integration, and end-to-end testing of both the frontend JavaScript and the backend Python data pipeline.

### Coverage by Layer

| Layer | Tool | Files | Focus |
|-------|------|-------|-------|
| **SRS Algorithm** | Jest | `srs.test.js` | SM-2 spaced repetition correctness |
| **Storage & Persistence** | Jest | `storage.test.js` | localStorage, export/import, data migration |
| **Notes Management** | Jest | `notes.test.js` | CRUD on step and sheet notes |
| **View Rendering** | Jest | `views.test.js` | DOM generation, UI logic, no regressions |
| **User Workflows** | Jest | `workflows.e2e.test.js` | Complete user journeys |
| **Data Pipeline** | pytest | `preprocess.test.py` | PDF reading, data validation, JSON generation |

## Quick Start

### Install dependencies

```bash
npm install
```

### Run all tests

```bash
npm test
```

### Run tests with watch mode (re-run on file change)

```bash
npm run test:watch
```

### Run specific test files

```bash
# Just SRS tests
npm run test:srs

# Just storage tests
npm run test:storage

# Just view tests
npm run test:views

# E2E workflows
npm run test:e2e

# All with verbose output
npm run test:all
```

### View test coverage

```bash
npm test -- --coverage
```

Coverage reports are generated in `coverage/` directory.

## Test Organization

```
tests/
├── setup.js                 # Jest setup: mocks, globals, DOM
├── fixtures.js              # Reusable mock data (sheets, state, etc.)
├── srs.test.js              # Unit tests for SM-2 algorithm
├── storage.test.js          # Tests for localStorage wrapper
├── notes.test.js            # Tests for note management
├── views.test.js            # Tests for DOM rendering
├── workflows.e2e.test.js    # End-to-end user journey tests
└── preprocess.test.py       # Tests for data pipeline
```

## What Each Test Suite Covers

### `srs.test.js` – Spaced Repetition Algorithm

**Why this matters:** The SRS is the core learning mechanism. Any bug here makes the app useless.

**Tests:**
- Card record creation and defaults
- Grading logic for all four grades (again, hard, good, easy)
- Interval scheduling (1 day, 6 days, ease-based)
- Ease factor adjustment (floor 1.3, ceiling 4.0)
- Lapse tracking
- Queue building (due cards first, overdue sorted earliest-first)
- Mastery calculation (weighted by interval and reps)
- Due count and time-to-next-review descriptions

**To add a new SRS feature:**
1. Add a test case describing the desired behavior
2. Implement the feature in `js/srs.js`
3. Run `npm run test:srs` to verify

**Example:**
```javascript
it("should reduce ease by 0.2 when graded 'again'", () => {
  const before = { ...SRS.defaultRecord(), ease: 2.5 };
  const after = SRS.grade(before, "again");
  expect(after.ease).toBe(2.3);
});
```

### `storage.test.js` – Persistence and Export/Import

**Why this matters:** User progress must never be lost. Data migration between schema versions is critical.

**Tests:**
- Load from empty localStorage (return default state)
- Save to localStorage
- Load with missing fields (forward compatibility)
- Parse errors (graceful fallback)
- Export to file with correct filename format
- Import from file with validation
- Round-trip: save → export → import → load
- Storage key is versioned (`nremt.state.v1`)

**To add a new storage field:**
1. Define default in `empty()`
2. Add backfill logic in `load()` and `importFromFile()`
3. Add test cases for old→new migration

**Example:**
```javascript
it("should backfill missing drills field from old state", () => {
  const old = { version: 1, srs: {}, notes: {} };
  localStorage.getItem.mockReturnValue(JSON.stringify(old));
  
  const loaded = Storage.load();
  
  expect(loaded.drills).toEqual({ secorder: {}, stepseq: {} });
});
```

### `notes.test.js` – Per-Step and Per-Sheet Notes

**Why this matters:** Users rely on notes for context; they should never be lost.

**Tests:**
- Get/set step notes
- Get/set sheet notes
- Delete empty or whitespace notes
- Count notes on a sheet
- Handle missing note objects gracefully
- Separate step and sheet notes
- Note text is preserved with whitespace

**To add a new note type (e.g., section notes):**
1. Add getters/setters in `js/notes.js`
2. Add test cases for CRUD
3. Update `countSheetNotes()` if needed

### `views.test.js` – DOM Rendering and UI

**Why this matters:** UI regressions break the user experience and are hard to catch otherwise.

**Tests:**
- h() hyperscript helper works correctly
- Home view renders all sheets
- Sheet detail view renders with correct tabs
- Flashcard study view (reveal button, grading, navigation)
- Reference sheet view with critical criteria
- Notes view and edit UI
- Mastery percentage and progress bars display correctly
- Drill progress badges appear when expected
- Navigation between views works
- DOM structure is valid and interactive

**To add a new view or modify existing views:**
1. Write tests that describe the expected DOM structure
2. Implement the view in `js/views.js`
3. Run `npm run test:views` to ensure no regressions

**Example:**
```javascript
it("should show four grade buttons after revealing", () => {
  const view = Views.study(ctx, sheet);
  reveal.click();
  const grades = view.querySelectorAll(".grade");
  expect(grades.length).toBe(4);
});
```

### `workflows.e2e.test.js` – End-to-End User Journeys

**Why this matters:** Real user workflows can expose integration bugs that unit tests miss.

**Workflows tested:**
- First-time user: open sheet → reveal card → grade → move to next
- Add notes during review
- Review progress (mastery %, due count)
- Export and import progress
- Navigate between views
- Data persistence across simulated reload
- Error handling for corrupted state

**To test a new feature:**
1. Write a workflow test that uses the feature
2. Implement the feature
3. Run `npm run test:e2e` to verify

**Example:**
```javascript
describe("Workflow: User grades a card", () => {
  it("should update SRS state and move to next card", () => {
    // Open study view
    const view = Views.study(ctx, sheet);
    // Reveal
    reveal.click();
    // Grade good
    goodBtn.click();
    // Verify state
    expect(ctx.state.srs[cardId].reps).toBe(1);
    // Verify navigation
    expect(view.textContent).toContain("Card 2 of");
  });
});
```

### `preprocess.test.py` – Data Pipeline Validation

**Why this matters:** Bad input data propagates through the entire app. PDF validation prevents user confusion.

**Tests:**
- SHEETS structure is valid (all required fields present)
- Sheet IDs are unique
- totalPoints matches sum of step points
- All points are positive integers
- No empty step text or section names
- No duplicate step text within a section
- Critical criteria exist for all sheets
- No overlapping card IDs across sheets
- JSON serialization works (data is exportable)
- JSON round-trip preserves data

**To update sheet data:**
1. Modify `SHEETS` in `preprocess.py`
2. Run `python -m pytest tests/preprocess.test.py -v`
3. Fix any validation errors before running `python3 preprocess.py`

## Running Tests in CI/CD

The test suite is designed to run in continuous integration. Add this to your CI pipeline:

```yaml
test:
  script:
    - npm install
    - npm test -- --coverage
  coverage: '/Lines\s*:\s*(\d+\.\d+)%/'
```

## Best Practices

### When Adding a Feature

1. **Write tests first** (TDD):
   - Describe the feature in a test
   - Implement the feature
   - Verify tests pass

2. **Use fixtures for setup:**
   - Reuse `createMockSheet()`, `createEmptyState()`, etc.
   - Don't repeat boilerplate in every test

3. **Test behavior, not implementation:**
   ```javascript
   // Good: tests the contract
   expect(mastery).toBeGreaterThan(0);
   
   // Bad: tests internal details
   expect(state.srs['card1'].ease).toBe(2.65);
   ```

4. **Group related tests with `describe`:**
   ```javascript
   describe("Grading – 'good'", () => {
     it("should increment reps", () => { ... });
     it("should not change ease", () => { ... });
   });
   ```

### When Modifying Existing Code

1. **Run tests first** to establish baseline
2. **Make changes**
3. **Run tests again** to catch regressions

If a test fails:
- Check if the test is correct (is it testing the right behavior?)
- Fix the code or update the test
- Never disable a test without understanding why it failed

### Coverage Targets

| Module | Target | Current |
|--------|--------|---------|
| `srs.js` | 95%+ | ~ |
| `storage.js` | 90%+ | ~ |
| `notes.js` | 100% | ~ |
| `views.js` | 80%+ | ~ |
| **Overall** | **70%+** | ~ |

Run `npm test -- --coverage` to see actual coverage.

## Debugging Tests

### Print debug info

```javascript
it("should do something", () => {
  const result = someFunction();
  console.log("Result:", result);  // Shows in test output with --verbose
  expect(result).toBe("expected");
});
```

### Run a single test

```javascript
it.only("should focus on this test", () => {
  // Only this test will run
});
```

### Skip a test temporarily

```javascript
it.skip("should skip this for now", () => {
  // This test won't run
});
```

### Verbose output

```bash
npm test -- --verbose
```

## Mocking Strategy

### DOM and localStorage

`tests/setup.js` provides mocks for:
- `localStorage.getItem()`, `setItem()`, `removeItem()`
- `document.body.innerHTML`
- `window.location.hash`
- `Blob` and `URL.createObjectURL()`

### Global NREMT_DATA

Use `setupMockNREMTData()` from fixtures to set up:
```javascript
global.NREMT_DATA = {
  sheets: [/* mock sheets */],
  totalCards: 100,
};
```

### Context object

Use `createMockContext()` to create a minimal context with spied methods:
```javascript
const ctx = createMockContext();
// ctx.navigate, ctx.save, ctx.toast are jest.fn()
```

## Troubleshooting

### "data.js failed to load"

The tests mock `window.NREMT_DATA`. If you see this error, ensure `setupMockNREMTData()` is called in your test.

### "localStorage is not defined"

This is mocked in `setup.js`. Ensure Jest is configured with `testEnvironment: "jsdom"` in `jest.config.js`.

### "Cannot find module 'js/srs.js'"

Tests load modules with `require()` or ES6 imports. The path is relative to the project root.

### Test fails in watch mode but passes in CI

This often means test state isn't being cleaned up. Check that `beforeEach()` clears mocks:
```javascript
beforeEach(() => {
  localStorage.getItem.mockClear();
  document.body.innerHTML = "";
});
```

## Adding New Test Files

When adding a test for a new module:

1. Create `tests/module.test.js` or `tests/module.spec.js`
2. Load your module: `require("../js/module.js")`
3. Import fixtures: `import { createMockSheet } from "./fixtures.js"`
4. Write test blocks with `describe()` and `it()`
5. Run `npm test` to auto-discover and run

Jest auto-discovers files matching `*.test.js` or `*.spec.js`.

## Further Reading

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [DOM Testing Library](https://testing-library.com/)
- [SpacedRepetition Algorithm (SM-2)](https://en.wikipedia.org/wiki/SuperMemo#SM-2_algorithm)

---

**Last updated:** 2026-05-16  
**Test suite version:** 1.0
