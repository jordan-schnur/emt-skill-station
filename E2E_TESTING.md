# E2E Testing Guide

## Running Playwright E2E Tests

The project includes Playwright-based end-to-end browser tests located in `tests/e2e/`.

### Prerequisites

Playwright requires browser binaries to be installed locally. This requires **internet access**.

### Installation

1. **Install Playwright browsers:**
   ```bash
   npm run test:playwright:install
   # or directly:
   npx playwright install
   ```

2. **Verify installation:**
   ```bash
   npm run test:e2e:browser
   ```

### Running E2E Tests

Once browsers are installed, run:

```bash
npm run test:e2e:browser
```

This will:
- Start a Python HTTP server on port 8000
- Launch Chromium (and other browsers in CI)
- Run all `.spec.js` files in `tests/e2e/`
- Generate HTML reports in `playwright-report/`

### Unit Tests (No Browser Required)

Jest unit tests don't require browsers and can be run in any environment:

```bash
npm test              # Run all unit tests
npm run test:watch   # Watch mode
npm run test:all     # Verbose output
```

### CI/CD

In CI environments, use:
```bash
npm run test:ci
```

This runs:
1. All unit tests (Jest)
2. Installs Playwright browsers
3. Runs E2E tests (Playwright)

### Troubleshooting

**Error: "Executable doesn't exist"**
- Browsers aren't installed. Run: `npm run test:playwright:install`

**Error: "Connection blocked by network allowlist"**
- Your network blocks Playwright CDN. You'll need to:
  - Use a different network with internet access
  - Run in a cloud CI/CD environment
  - Skip E2E tests and use unit tests only

**Error: "Port 8000 already in use"**
- Kill the existing process: `lsof -ti:8000 | xargs kill -9`
- Or specify a different port in `playwright.config.js`

### Current Setup

- **Local testing:** Runs only Chromium in headless mode for speed
- **CI testing:** Runs multiple browsers (Chrome, Firefox, Safari)
- **Timeout:** 30 seconds for server startup, 60s global (120s in CI)

### Browser Coverage

- ✅ Chromium (Headless) - Local & CI
- ✅ Firefox - CI only
- ✅ WebKit (Safari) - CI only
- ❌ Mobile browsers - Disabled for faster testing

To enable more browsers locally, edit `playwright.config.js` and remove the CI check around additional browsers.
