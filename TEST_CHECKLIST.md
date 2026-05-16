# Test Checklist for New Features

Use this checklist when adding a new feature to ensure comprehensive test coverage and no regressions.

## Before You Start

- [ ] Read the TESTING.md guide
- [ ] Review relevant existing test files (srs, storage, views, etc.)
- [ ] Understand the test fixtures available in `tests/fixtures.js`

## While Implementing

### 1. Add Unit Tests First (TDD)

For algorithm/logic changes:
- [ ] Add test cases to describe expected behavior
- [ ] Run tests to see them fail
- [ ] Implement feature
- [ ] Run tests again to see them pass

Example: Adding a new SRS feature
```javascript
// tests/srs.test.js
describe("New feature", () => {
  it("should do X", () => {
    // Setup
    const before = SRS.defaultRecord();
    // Call function
    const after = SRS.someNewFunction(before);
    // Assert
    expect(after.property).toBe(expectedValue);
  });
});
```

### 2. Test DOM Rendering (if UI changes)

For any view changes:
- [ ] Add test for the view exists
- [ ] Test DOM structure is correct
- [ ] Test that interactive elements are present
- [ ] Test event handlers are wired up

Example: Adding a new view
```javascript
// tests/views.test.js
describe("Views.newFeature", () => {
  it("should render without crashing", () => {
    const ctx = createMockContext();
    expect(() => Views.newFeature(ctx)).not.toThrow();
  });
  
  it("should display expected content", () => {
    const ctx = createMockContext();
    const view = Views.newFeature(ctx);
    expect(view.textContent).toContain("Expected title");
  });
  
  it("should be interactive", () => {
    const ctx = createMockContext();
    const view = Views.newFeature(ctx);
    const button = view.querySelector("button");
    expect(button.onclick).toBeTruthy();
  });
});
```

### 3. Test User Workflows (if feature affects workflows)

For cross-feature integration:
- [ ] Add workflow test that uses the new feature
- [ ] Test before and after state changes
- [ ] Test navigation still works
- [ ] Test data persists

Example: Feature that affects flashcard review
```javascript
// tests/workflows.e2e.test.js
describe("Workflow: New feature interaction", () => {
  it("should work within flashcard review", () => {
    const ctx = createMockContext();
    const sheet = createMockSheet();
    
    // User opens flashcard
    const view = Views.study(ctx, sheet);
    
    // Uses new feature
    const newFeatureBtn = view.querySelector(".new-feature-btn");
    newFeatureBtn.click();
    
    // Should still be able to grade the card
    const goodBtn = view.querySelector(".grade.good");
    goodBtn.click();
    
    // State should be consistent
    expect(ctx.state.stats.totalReviews).toBe(1);
  });
});
```

### 4. Test Error Handling

For any input processing:
- [ ] Test with null/undefined inputs
- [ ] Test with invalid data
- [ ] Test with edge cases (empty arrays, zero values, etc.)
- [ ] Verify graceful degradation

Example:
```javascript
it("should handle invalid input gracefully", () => {
  expect(() => someFunction(null)).not.toThrow();
  expect(() => someFunction(undefined)).not.toThrow();
  expect(() => someFunction({})).not.toThrow();
});
```

### 5. Test Data Persistence (if state is stored)

For any localStorage changes:
- [ ] Add test for new field in `empty()`
- [ ] Add backfill logic for old states
- [ ] Add tests for migration from v1 to new version
- [ ] Test export/import round-trip

Example:
```javascript
// tests/storage.test.js
it("should backfill missing newFeatureData", () => {
  const old = { version: 1, srs: {} }; // no newFeatureData
  localStorage.getItem.mockReturnValue(JSON.stringify(old));
  
  const loaded = Storage.load();
  
  expect(loaded.newFeatureData).toBeDefined();
  expect(loaded.newFeatureData).toEqual(expectedDefault);
});
```

## Before Committing

### Run Tests

```bash
# Run all tests
npm test

# Or specific suites
npm run test:srs
npm run test:views
npm run test:e2e

# Check coverage
npm test -- --coverage
```

### Review Checklist

- [ ] All new tests pass
- [ ] No existing tests were broken
- [ ] Coverage didn't decrease significantly
- [ ] Tests are well-organized in appropriate file
- [ ] Tests use fixtures to avoid boilerplate
- [ ] Test descriptions clearly explain what's being tested
- [ ] No console.log() or debugging code left in tests

### Code Review Checklist

- [ ] Feature works as intended (tested manually)
- [ ] No TypeErrors or console errors in browser
- [ ] Edge cases are handled
- [ ] Code is readable and follows existing patterns
- [ ] Comments added for complex logic

## Examples by Feature Type

### Adding an Algorithm Change (e.g., new SRS grade)

1. Create test in `tests/srs.test.js`:
   ```javascript
   describe("grade – new grade type", () => {
     it("should calculate interval correctly", () => { ... });
     it("should update ease properly", () => { ... });
   });
   ```

2. Implement in `js/srs.js`

3. Run: `npm run test:srs`

4. Update views that use this grade in `js/views.js`

5. Add view tests in `tests/views.test.js`

6. Run: `npm test`

### Adding a New View/Tab

1. Create test in `tests/views.test.js`:
   ```javascript
   describe("Views.newTab", () => {
     it("should render without crashing", () => { ... });
     it("should display expected content", () => { ... });
     it("should handle user interaction", () => { ... });
   });
   ```

2. Implement in `js/views.js`

3. Add to router in `js/app.js` (no test needed for router currently)

4. Add workflow test in `tests/workflows.e2e.test.js`:
   ```javascript
   describe("Workflow: Using new tab", () => {
     it("should navigate to new tab and use features", () => { ... });
   });
   ```

5. Run: `npm run test:views` then `npm test`

### Adding a New Drill Mode

1. Create tests in `tests/views.test.js` for the drill view
2. Add integration test in `tests/workflows.e2e.test.js` for the complete workflow
3. If storing progress, add tests in `tests/storage.test.js` for new state field
4. Run full test suite: `npm test`

### Changing Data Structure

1. Update test fixtures in `tests/fixtures.js` to match new structure
2. Add migration tests in `tests/storage.test.js`
3. Update relevant tests in other files to use new structure
4. Run: `npm test` (all tests should still pass after migration)

## Common Mistakes to Avoid

❌ **Don't test implementation details**
```javascript
// BAD - tests internal variable
expect(state.srs['card1'].ease).toBe(2.65);
```

✅ **Do test behavior**
```javascript
// GOOD - tests observable behavior
const mastery = SRS.masteryFor(state, sheet);
expect(mastery).toBeGreaterThan(0);
```

---

❌ **Don't skip error cases**
```javascript
// BAD - only tests happy path
it("should load state", () => {
  const state = Storage.load();
  expect(state).toBeDefined();
});
```

✅ **Do include error cases**
```javascript
// GOOD - tests happy path and errors
it("should load state from valid JSON", () => { ... });
it("should handle parse errors", () => { ... });
it("should backfill missing fields", () => { ... });
```

---

❌ **Don't use magic numbers in tests**
```javascript
// BAD - unclear what 2.5 means
expect(rec.ease).toBe(2.5);
```

✅ **Do make tests self-documenting**
```javascript
// GOOD - clear what we're testing
const DEFAULT_EASE = 2.5;
expect(rec.ease).toBe(DEFAULT_EASE);
```

---

❌ **Don't leave debugg code in**
```javascript
// BAD
it("should do something", () => {
  console.log("DEBUG"); // Remove this!
  debugger;              // Remove this!
  expect(result).toBe("ok");
});
```

✅ **Do clean up before committing**
```javascript
// GOOD - clean test
it("should do something", () => {
  expect(result).toBe("ok");
});
```

## Performance Tips

- Use `npm run test:watch` during development for faster feedback
- Run specific test file while working: `npm test srs.test.js`
- Run full suite only before committing
- Keep tests focused and fast (< 5s total)

## Getting Help

If a test is confusing:
1. Check `tests/README.md` for patterns
2. Look at similar tests in the same file
3. Read `TESTING.md` for philosophy and best practices
4. Check test fixtures to understand available test data

## Quick Reference: Test File Locations

- **SRS/Algorithm tests**: `tests/srs.test.js`
- **Storage/Data persistence tests**: `tests/storage.test.js`
- **Notes tests**: `tests/notes.test.js`
- **View rendering tests**: `tests/views.test.js`
- **End-to-end workflow tests**: `tests/workflows.e2e.test.js`
- **Data validation tests**: `tests/preprocess.test.py`
- **Test setup/mocks**: `tests/setup.js`
- **Reusable test data**: `tests/fixtures.js`

---

**Last updated**: 2026-05-16  
**For**: Feature developers and maintainers
