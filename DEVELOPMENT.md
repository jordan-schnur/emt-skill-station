# Development Guide for NREMT Study Tool

This document outlines the development workflow and testing requirements for this project.

## Core Development Principle

**No feature is considered "done" until tests pass.**

## Testing Workflow

### 1. Write Tests First
For any new feature, you MUST write tests BEFORE or ALONGSIDE implementation:

- **Unit Tests** (Jest): `tests/*.test.js` for logic, functions, state management
- **E2E Tests** (Playwright): `tests/e2e/*.spec.js` for user workflows and UI interactions

### 2. Run Tests Locally
Before claiming a feature is complete, you MUST:

```bash
# Run all unit tests
npm test

# Run specific test suite
npm test tests/views.test.js

# Watch mode during development
npm run test:watch

# Run E2E tests (requires browsers installed)
npm run test:e2e:browser

# Full CI test suite
npm run test:ci
```

### 3. Verify Test Results
- ✅ All tests pass with green checkmarks
- ✅ No console errors or warnings (unless intentional)
- ✅ Test output shows expected behavior

**Do NOT mark a feature as done if:**
- ❌ Tests are failing
- ❌ New features have no test coverage
- ❌ Existing tests were broken by changes
- ❌ You haven't run the tests yourself

## Test-Driven Development Checklist

When implementing a new feature:

- [ ] Write unit tests for the function/module (`tests/`)
- [ ] Write E2E tests for user workflows (`tests/e2e/`)
- [ ] Implement the feature
- [ ] Run `npm test` and verify all tests pass
- [ ] Run `npm run test:e2e:browser` and verify E2E tests pass
- [ ] Check test coverage is adequate (aim for >70% on new code)
- [ ] Update this DEVELOPMENT.md if adding new test patterns

## Running Tests with Computer Use

If you need to visually verify tests or interact with the browser, you can use computer use:

```bash
# Start the dev server
npm run serve

# In another terminal, run E2E tests with visual feedback
npm run test:e2e:browser
```

Then use computer use to:
1. Take screenshots of test results
2. Navigate to the app and verify behavior manually
3. Debug failing tests by inspecting the browser console

## Test Organization

### Unit Tests (Jest)
```
tests/
├── fixtures.js          # Shared mock data
├── setup.js            # Jest configuration
├── srs.test.js         # Spaced repetition tests
├── storage.test.js     # Storage/localStorage tests
├── views.test.js       # UI component tests
├── notes.test.js       # Notes feature tests
└── workflows.e2e.test.js  # Multi-step workflow tests
```

### E2E Tests (Playwright)
```
tests/e2e/
├── navigation.spec.js        # Navigation and page flow
├── data-persistence.spec.js  # Storage across sessions
└── flashcards.spec.js        # Flashcard study workflow
```

## Common Test Patterns

### Writing Jest Tests
```javascript
describe("Feature Name", () => {
  beforeEach(() => {
    // Setup before each test
  });

  it("should do something specific", () => {
    // Arrange
    const input = createMockData();
    
    // Act
    const result = functionToTest(input);
    
    // Assert
    expect(result).toBe(expected);
  });
});
```

### Writing Playwright Tests
```javascript
test("should perform user action", async ({ page }) => {
  // Navigate
  await page.goto("/");
  
  // Interact
  await page.locator(".sheet-card").first().click();
  
  // Verify
  await expect(page).toHaveURL(/.*sheet.*/);
  await expect(page.locator("h1")).toContainText("Expected Title");
});
```

## Coverage Thresholds

This project enforces test coverage thresholds:

- **Statements**: 70%
- **Branches**: 60%
- **Functions**: 70%
- **Lines**: 70%

View coverage report:
```bash
npm test
# Coverage summary prints at end of test run
```

## Debugging Failing Tests

### Debug Jest Tests
```bash
# Run with verbose output
npm run test:all

# Run specific test file
npm test tests/views.test.js

# Watch mode with rerun
npm run test:watch
```

### Debug E2E Tests
1. Check `test-results/results.json` for detailed failure info
2. View video recordings: `test-results/*/video.webm`
3. View screenshots: `test-results/*/screenshot.png`
4. Use Playwright Inspector:
   ```bash
   PWDEBUG=1 npm run test:e2e:browser
   ```

## Test Maintenance

When tests fail:

1. **Read the error message** - Most failures are clear about what went wrong
2. **Check the test logic** - Is the test asserting the right thing?
3. **Check the implementation** - Did the feature break or did the test expectation change?
4. **Update both** - Fix the code AND the tests together
5. **Run tests again** - Verify the fix actually works

## Quick Reference

| Command | Purpose |
|---------|---------|
| `npm test` | Run all unit tests |
| `npm run test:watch` | Watch mode for development |
| `npm run test:all` | Verbose test output with coverage |
| `npm run test:e2e` | Jest-based E2E tests |
| `npm run test:e2e:browser` | Playwright browser E2E tests |
| `npm run test:ci` | Full CI pipeline (unit + E2E) |
| `npm run test:playwright:install` | Install browser binaries for Playwright |

## CI/CD Pipeline

This project uses automated testing:

- **Local**: Run `npm test` before committing
- **Pre-commit**: Consider adding a git hook with `npm test`
- **CI**: GitHub Actions (or configured CI/CD) runs full test suite
- **Deployment**: Only deploy when all tests pass

## Questions?

If you're unsure whether something is "done":
1. Do all tests pass? → Not done
2. Did you write tests? → Not done
3. Is coverage adequate? → Check and fix if needed
4. Does the feature work as expected? → Run it and verify

When in doubt, **write more tests** - they catch regressions and document expected behavior.
