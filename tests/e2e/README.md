# Browser E2E Tests (Playwright)

Full browser-based end-to-end testing using Playwright. These tests run in real browsers (Chrome, Firefox, Safari) and test the actual UI as a user would interact with it.

## What's Tested

### navigation.spec.js (30+ test cases)
- Home page loads with title and sheet cards
- Sheet metadata displays correctly
- Navigation between views works
- Tabs switch correctly
- Responsive design (mobile, tablet, desktop)
- Keyboard navigation
- Footer displays and updates

### flashcards.spec.js (25+ test cases)
- Flashcard reveals on button click
- Grade buttons appear after reveal
- Navigation to next card after grading
- Keyboard shortcuts work (Space to reveal, 1-4 to grade)
- Session completion
- Card metadata displays correctly
- Notes can be added during review
- All four grades (Again, Hard, Good, Easy) work

### data-persistence.spec.js (20+ test cases)
- Progress persists across page reloads
- Mastery percentages update correctly
- Due counts decrease as cards are reviewed
- Notes persist across sessions
- Multiple sheets maintain independent progress
- localStorage contains correct state structure
- Review counter increments

## Quick Start

### Install Playwright

```bash
npm install @playwright/test
npx playwright install
```

### Run Browser Tests

```bash
npm run test:e2e:browser
```

### Run in specific browser

```bash
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
```

### Run specific test file

```bash
npx playwright test tests/e2e/navigation.spec.js
```

### Run with headed browser (see what's happening)

```bash
npx playwright test --headed
```

### Run with UI mode (interactive)

```bash
npx playwright test --ui
```

## Test Structure

Each test file follows this pattern:

```javascript
import { test, expect } from "@playwright/test";

test.describe("Feature Group", () => {
  test.beforeEach(async ({ page }) => {
    // Setup before each test
    await page.goto("/");
  });

  test("should do something", async ({ page }) => {
    // Test code
    await page.locator("button").click();
    await expect(page.locator("text=Result")).toBeVisible();
  });
});
```

## Selectors Used

- `.class-name` – CSS class selectors
- `button:has-text('text')` – Find button with specific text
- `.sheet-card` – Sheet cards on home
- `.grade` – Grade buttons (again, hard, good, easy)
- `.card-prompt` – Flashcard question
- `.card-answer` – Flashcard answer
- `text=...` – Find by text content
- `.study-meta` – Card position and stats

## Understanding Test Output

### Passing tests
```
✓ should display all sheet cards (2.5s)
```

### Failing tests
```
✗ should show 4 grade buttons (5.2s)
  Error: expected element to be visible
  at navigation.spec.js:45:12
```

## Debugging Failed Tests

### 1. See what the page looks like

Add to any test:
```javascript
await page.screenshot({ path: 'debug.png' });
```

Screenshot will be saved to `debug.png`.

### 2. Pause execution

```javascript
await page.pause();  // Opens inspector, press resume to continue
```

### 3. Print page content

```javascript
const content = await page.content();
console.log(content);
```

### 4. Check element visibility

```javascript
const isVisible = await page.locator(".my-element").isVisible();
console.log("Element visible:", isVisible);
```

### 5. Run single test with headed mode

```bash
npx playwright test tests/e2e/navigation.spec.js --headed
```

This opens a browser window so you can see what's happening.

## Common Issues & Solutions

### "Port 8000 already in use"
Another process is using port 8000. Either:
```bash
# Kill the process
lsof -ti:8000 | xargs kill -9

# Or use a different port
npx playwright test --webServer.port=8001
```

### "Timeout waiting for element"
Element didn't appear or took too long:
```javascript
// Increase timeout for slow pages
await expect(element).toBeVisible({ timeout: 10000 });

// Or wait for specific condition
await page.waitForFunction(
  () => document.querySelectorAll('.grade').length === 4
);
```

### "Element not interactive"
Element isn't visible or enabled:
```javascript
// Check visibility first
await expect(button).toBeVisible();

// Check if enabled
const isEnabled = await button.isEnabled();

// Scroll into view if needed
await button.scrollIntoViewIfNeeded();
```

### Tests pass locally but fail in CI
Common causes:
- Timing issues – add `await page.waitForLoadState('networkidle')`
- Viewport differences – CI may use different screen size
- Browser differences – test on same browsers (Chrome, Firefox, Safari)

Solution:
```bash
# Test on same browsers as CI
npx playwright test --project=chromium --project=firefox
```

## Browser Comparison

Playwright tests run on three browsers to catch cross-browser issues:

| Browser | Desktop | Mobile |
|---------|---------|--------|
| Chrome | ✓ | ✓ (Pixel 5) |
| Firefox | ✓ | - |
| Safari | ✓ | ✓ (iPhone 12) |

Mobile tests ensure the UI works on phones and tablets.

## Performance Tips

- Tests run in parallel by default (faster)
- Use `test.serial()` only for tests that must run sequentially
- Keep tests focused and fast (< 3s each)
- Reuse navigation: start tests at specific URL instead of from home

Example:
```javascript
// Fast: go directly to sheet
test("should study E201", async ({ page }) => {
  await page.goto("/#sheet/e201/study");
  // ... test code
});

// Slow: navigate from home
test("should study E201", async ({ page }) => {
  await page.goto("/");
  await page.locator(".sheet-card").first().click();
  // ... test code
});
```

## Continuous Integration

Tests run in CI on every PR and commit to main. See `.github/workflows/test.yml` for the workflow.

### CI advantages
- Runs on clean Linux environment
- Tests all three browsers
- Generates HTML report
- Uploads artifacts on failure

### Viewing CI results
1. Go to GitHub PR
2. Click "Details" next to test status
3. View test results and screenshots

## Integration with Jest Tests

Playwright E2E tests complement Jest unit tests:

| Jest Tests | Playwright Tests |
|-----------|------------------|
| Fast (< 1s) | Slower (1-3s each) |
| No real browser | Real browser |
| Mocked localStorage | Real localStorage |
| Test logic | Test UI interactions |
| Test algorithms | Test workflows |

Run both:
```bash
npm test                  # Jest tests
npm run test:e2e:browser  # Playwright tests
npm run test:ci           # All tests
```

## Test Report

After running tests, view the HTML report:

```bash
npx playwright show-report
```

Opens an interactive report with:
- Test results
- Execution time
- Screenshots
- Video recordings (on failure)
- Trace files (for debugging)

## Adding New Browser Tests

1. Create new file in `tests/e2e/` with `.spec.js` suffix
2. Import Playwright:
   ```javascript
   import { test, expect } from "@playwright/test";
   ```
3. Write test cases:
   ```javascript
   test("should do something", async ({ page }) => {
     await page.goto("/");
     await page.locator("button").click();
     await expect(page.locator("text=Result")).toBeVisible();
   });
   ```
4. Run: `npx playwright test`

Jest will auto-discover and run it.

## Playwright Docs

- [Playwright Docs](https://playwright.dev/)
- [Locators](https://playwright.dev/docs/locators)
- [Actions](https://playwright.dev/docs/input)
- [Assertions](https://playwright.dev/docs/test-assertions)
- [Debugging](https://playwright.dev/docs/debug)

---

**Created**: 2026-05-16  
**Framework**: Playwright 1.40+  
**Coverage**: 75+ test cases across 3 test files
