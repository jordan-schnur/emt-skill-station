# Test Suite for NREMT Study Tool

This directory contains comprehensive tests for the NREMT Skill Sheet Trainer to catch regressions and ensure reliability as you add new features.

## Files

- **setup.js** – Jest configuration and global mocks (localStorage, DOM, Blob)
- **fixtures.js** – Reusable test data: mock sheets, states, context objects
- **srs.test.js** – Unit tests for the SM-2 spaced repetition algorithm (core feature)
- **storage.test.js** – Tests for localStorage, export/import, data persistence
- **notes.test.js** – Tests for per-step and per-sheet note management
- **views.test.js** – Tests for DOM rendering, no UI regressions
- **workflows.e2e.test.js** – End-to-end tests for complete user journeys
- **preprocess.test.py** – Tests for PDF reading and data validation

## Quick Commands

```bash
# Install once
npm install

# Run all tests
npm test

# Watch mode (re-run on file change)
npm run test:watch

# Run specific test suite
npm run test:srs           # SRS algorithm only
npm run test:storage       # Storage only
npm run test:views         # Views only
npm run test:e2e           # End-to-end only

# Verbose output + coverage
npm run test:all
```

## Test Coverage

| Feature | Type | File | Status |
|---------|------|------|--------|
| SRS algorithm | Unit | srs.test.js | ✓ Complete |
| Grading (again/hard/good/easy) | Unit | srs.test.js | ✓ Complete |
| Interval scheduling | Unit | srs.test.js | ✓ Complete |
| Mastery calculation | Unit | srs.test.js | ✓ Complete |
| localStorage save/load | Unit | storage.test.js | ✓ Complete |
| Export/import | Unit | storage.test.js | ✓ Complete |
| Data migration | Unit | storage.test.js | ✓ Complete |
| Step notes | Unit | notes.test.js | ✓ Complete |
| Sheet notes | Unit | notes.test.js | ✓ Complete |
| Home view | Integration | views.test.js | ✓ Complete |
| Flashcard study | Integration | views.test.js | ✓ Complete |
| Reference sheet | Integration | views.test.js | ✓ Complete |
| User workflows | E2E | workflows.e2e.test.js | ✓ Complete |
| Data validation | Unit | preprocess.test.py | ✓ Complete |

## How to Use Tests When Adding Features

### Scenario 1: Adding a new drill mode (e.g., Critical Fail Mode)

1. **Write a test first** (`tests/views.test.js` or `tests/workflows.e2e.test.js`):
   ```javascript
   describe("Critical Fail Drill", () => {
     it("should display only critical criteria cards", () => {
       const ctx = createMockContext();
       const sheet = createMockSheet();
       const view = Views.criticalFailDrill(ctx, sheet);
       // assert it only shows critical cards
     });
   });
   ```

2. **Implement the feature** in `js/views.js`

3. **Run tests** to verify:
   ```bash
   npm run test:views
   ```

4. **Check for regressions** in the complete suite:
   ```bash
   npm test
   ```

### Scenario 2: Modifying the SRS algorithm

1. **Write test cases** for the new behavior (`tests/srs.test.js`):
   ```javascript
   it("should cap interval at 4 years", () => {
     let rec = SRS.defaultRecord();
     for (let i = 0; i < 50; i++) {
       rec = SRS.grade(rec, "easy");
     }
     expect(rec.interval).toBeLessThanOrEqual(365 * 4);
   });
   ```

2. **Implement in `js/srs.js`**

3. **Run SRS tests only** (faster iteration):
   ```bash
   npm run test:srs
   ```

4. **Run full suite before committing**:
   ```bash
   npm test
   ```

### Scenario 3: Adding a new storage field

1. **Add tests** for the new field in `storage.test.js`:
   ```javascript
   it("should backfill missing practiceMetrics field", () => {
     const old = { version: 1, srs: {}, notes: {} };
     localStorage.getItem.mockReturnValue(JSON.stringify(old));
     
     const loaded = Storage.load();
     
     expect(loaded.practiceMetrics).toBeDefined();
   });
   ```

2. **Update `js/storage.js`**:
   - Add to `empty()`
   - Add backfill logic to `load()` and `importFromFile()`

3. **Verify with tests**:
   ```bash
   npm run test:storage
   ```

## Understanding the Fixtures

The `fixtures.js` file provides helpers to reduce boilerplate:

```javascript
// Create a mock sheet (3 cards in this example)
const sheet = createMockSheet();

// Create empty state (no progress)
const state = createEmptyState();

// Create state with SRS progress already recorded
const state = createStateWithSRS();

// Create state with user notes
const state = createStateWithNotes();

// Create mock context for passing to views
const ctx = createMockContext(state);

// Set up global NREMT_DATA
setupMockNREMTData();
```

## Common Test Patterns

### Testing SRS algorithm

```javascript
it("should schedule next review for 1 day", () => {
  const now = Date.now();
  const rec = SRS.grade(SRS.defaultRecord(), "good", now);
  
  expect(rec.interval).toBe(1);
  expect(rec.due).toBeCloseTo(now + 1 * DAY, -3); // within 1 second
});
```

### Testing view rendering

```javascript
it("should display sheet metadata", () => {
  const ctx = createMockContext();
  const sheet = createMockSheet();
  const view = Views.reference(ctx, sheet);
  
  expect(view.textContent).toContain(sheet.title);
  expect(view.querySelectorAll(".ref-section")).toHaveLength(sheet.sections.length);
});
```

### Testing user interactions

```javascript
it("should grade a card on button click", () => {
  const ctx = createMockContext();
  const sheet = createMockSheet();
  
  const view = Views.study(ctx, sheet);
  const revealBtn = view.querySelector("button:contains('Show answer')");
  revealBtn.click();
  
  const goodBtn = view.querySelector(".grade.good");
  goodBtn.click();
  
  expect(ctx.save).toHaveBeenCalled();
  expect(ctx.state.stats.totalReviews).toBe(1);
});
```

### Testing data persistence

```javascript
it("should survive export/import round-trip", async () => {
  const original = createStateWithSRS();
  const file = new File([JSON.stringify(original)], "backup.json");
  
  const imported = await Storage.importFromFile(file);
  
  expect(imported.srs).toEqual(original.srs);
});
```

## Debugging Failing Tests

### Run a single test

```javascript
it.only("should debug this specific test", () => {
  // Only this test will run
});
```

### Print debug output

```bash
npm test -- --verbose
```

Or add console.log in your test:
```javascript
it("debug test", () => {
  const result = someFunction();
  console.log("Debug:", result);  // Shows when running with --verbose
  expect(result).toBe("expected");
});
```

### Check what the DOM looks like

```javascript
it("debug DOM structure", () => {
  const view = Views.home(ctx);
  console.log(view.outerHTML);  // Print the rendered HTML
});
```

## Coverage Goals

- **SRS (srs.js)**: 95%+ – critical algorithm
- **Storage (storage.js)**: 90%+ – user data
- **Notes (notes.js)**: 100% – simple but important
- **Views (views.js)**: 80%+ – large module, some branches hard to test
- **Overall**: 70%+ – good baseline

Check current coverage:
```bash
npm test -- --coverage
```

## Regression Testing

Before releasing a new feature:

1. **Run full test suite**:
   ```bash
   npm test
   ```

2. **Check coverage hasn't dropped**:
   ```bash
   npm test -- --coverage
   ```

3. **Run manually** to verify UI looks right (tests catch logic, not aesthetics)

4. **Test in-browser** with real data to catch edge cases

## Adding Tests for New Modules

When you create a new module (e.g., `js/newfeature.js`):

1. Create `tests/newfeature.test.js`
2. Load your module: `require("../js/newfeature.js")`
3. Write test cases: `describe()` and `it()`
4. Run `npm test` to auto-discover

Jest will automatically find and run it.

## Future Test Ideas

As you add features, consider testing:

- **Critical Fail Mode**: Drill only critical criteria cards
- **Blank Sheet Recall**: User types from memory, compare to expected steps
- **Timed Simulation**: Track completion time and accuracy
- **Section Order Drill**: Drag-to-order sections, streak tracking
- **Step Sequence Drill**: Drag-to-order steps within section
- **Mobile UI**: Ensure drags work with touch events
- **Accessibility**: Keyboard navigation, screen reader support

## Resources

- [Jest docs](https://jestjs.io/)
- [DOM Testing Library](https://testing-library.com/)
- [SM-2 algorithm](https://en.wikipedia.org/wiki/SuperMemo#SM-2_algorithm)
- [NREMT official](https://www.nremt.org/)

---

**Test suite created**: 2026-05-16  
**Maintainer**: Development team  
**Status**: Ready to use
