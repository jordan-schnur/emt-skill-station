# CI/CD Setup – GitHub Actions Testing

Automated testing on every commit and pull request to main branch.

## What's Automated

### On Every Push to Main
✅ Unit & Integration tests (Jest)  
✅ Browser E2E tests (Playwright)  
✅ Python data validation tests  
✅ Coverage reporting  
✅ Cross-browser testing (Chrome, Firefox, Safari)  
✅ Mobile testing (iOS, Android)  

### On Every Pull Request
✅ All the above, PLUS  
✅ PR comment with test results  
✅ Artifact upload on failure  
✅ Block merge if tests fail  

## Workflow Configuration

File: `.github/workflows/test.yml`

### Jobs

1. **unit-tests** (2-3 minutes)
   - Runs on Node 16.x and 18.x
   - Executes all Jest tests with coverage
   - Uploads to Codecov

2. **browser-tests** (5-10 minutes)
   - Installs Playwright browsers
   - Runs E2E tests in Chrome, Firefox, Safari
   - Tests mobile viewports
   - Uploads failure artifacts

3. **python-tests** (1-2 minutes)
   - Validates data structure
   - Ensures totalPoints calculations correct
   - Verifies PDF preprocessing works

4. **code-quality** (1-2 minutes)
   - Checks coverage thresholds
   - Displays coverage summary

5. **results** – Final status check
6. **report** – Posts comment on PR with results

## Viewing Test Results

### In GitHub
1. Go to your repository
2. Click "Actions" tab
3. Click on a workflow run
4. See test results for each job

### PR Comments
When you open a PR, a comment appears showing:
- Test suite status (✅ or ❌)
- Unit test results
- Browser test results
- Data validation results

### Artifacts on Failure
If tests fail, artifacts are uploaded:
- Playwright report (screenshots, videos)
- Coverage reports
- Test results JSON

Download by clicking "Artifacts" in the workflow run.

## Running Tests Locally First

Before pushing, run tests locally to catch issues early:

```bash
# All Jest tests
npm test

# Browser E2E tests
npm run test:e2e:browser

# Everything (like CI)
npm run test:ci

# Watch mode during development
npm run test:watch
```

## CI/CD Status Badges

Add to your README.md to show build status:

```markdown
![Tests](https://github.com/YOUR_USERNAME/nremt/actions/workflows/test.yml/badge.svg)
```

## Environment Variables

If you need secrets (API keys, tokens), add to GitHub:

1. Go to Settings → Secrets and variables → Actions
2. Click "New repository secret"
3. Add variables for:
   - Codecov token (for coverage uploads)
   - API keys if needed

Reference in workflow:
```yaml
- name: Upload coverage
  env:
    CODECOV_TOKEN: ${{ secrets.CODECOV_TOKEN }}
  run: # ...
```

## Troubleshooting CI Failures

### Tests pass locally but fail in CI

Common causes:

1. **Timing issues**
   ```javascript
   // Add waits for async operations
   await page.waitForLoadState('networkidle');
   await page.waitForTimeout(500);
   ```

2. **Different environment**
   ```bash
   # Test locally with CI conditions
   npm test -- --watchAll=false  # No watch mode
   npm test -- --coverage         # With coverage
   ```

3. **Browser differences**
   ```bash
   # Test on Firefox (not just Chrome)
   npx playwright test --project=firefox
   ```

4. **Port conflicts**
   CI uses port 8000. If tests are trying to use same port, change it in `playwright.config.js`

### Node version mismatch

CI tests on Node 16.x and 18.x. Make sure code works on both:

```bash
# Install specific Node version
nvm install 16
npm test

nvm install 18
npm test
```

### Coverage drops below threshold

Jest is configured to fail if coverage drops below 70%. To fix:

1. Add tests for the new uncovered code
2. Run locally: `npm test -- --coverage`
3. Check `coverage/` directory for report

## Skipping CI (Not Recommended)

If you absolutely must skip CI (emergency hotfix):

```bash
git commit --no-verify
git push  # Still runs CI, just locally
```

Or in commit message:
```
[skip ci] Emergency hotfix - fix typo

CI will skip if message contains [skip ci]
```

## Secrets Management

### Codecov Token (Optional)

To enable coverage tracking on Codecov:

1. Go to https://codecov.io
2. Connect your GitHub repository
3. Copy token
4. Add to GitHub Secrets: `CODECOV_TOKEN`

Workflow will then upload coverage automatically.

## Monitoring Test Health

### View Test Trends

GitHub Actions shows historical test data:

1. Go to Actions → workflows/test.yml
2. Scroll down to see historical runs
3. Click "Analyze" to see trends

### Set Up Notifications

Configure GitHub to notify on CI failures:

1. Settings → Notifications
2. Enable "Include your own updates"
3. Choose email for CI notifications

## CI/CD Best Practices

### Before Committing

```bash
# 1. Run all local tests
npm test

# 2. Run browser tests
npm run test:e2e:browser

# 3. Check code style (optional, if using linter)
npm run lint

# 4. Verify data generation
python3 preprocess.py
```

### In Commit Messages

Include test information:

```
Add Critical Fail Mode feature

- New view for drilling critical criteria
- Added tests for new functionality
- All existing tests passing
```

### Before Merging PR

- ✅ All tests passing in CI
- ✅ Coverage maintained or improved
- ✅ Browser tests passed (Chrome, Firefox)
- ✅ Playwright report has no failures
- ✅ Code review approved

## GitHub Branch Protection

To prevent merging without passing tests:

1. Go to Settings → Branches
2. Add rule for `main`
3. Enable "Require status checks to pass"
4. Select:
   - `unit-tests` (all Node versions)
   - `browser-tests`
   - `python-tests`

Now PRs can only merge if all CI tests pass.

## Speeding Up CI

### Parallel Jobs
CI already runs jobs in parallel (unit, browser, python).

### Skip Slow Tests
In `.github/workflows/test.yml`, you can:

```yaml
- name: Run tests
  run: npm test -- --maxWorkers=2  # Use fewer workers
```

Or skip mobile tests:
```javascript
// In playwright.config.js
projects: [
  { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  // Skip mobile for faster CI
],
```

## Rollback Failed Deployment

If a breaking change is merged:

```bash
git revert <commit-hash>
git push origin main
```

GitHub will re-run tests on the revert commit.

## Local CI Simulation

To run CI tests locally before pushing:

```bash
# Install dependencies
npm install

# Run all tests like CI does
npm test -- --watchAll=false --coverage
npx playwright install
npx playwright test
python -m pytest tests/preprocess.test.py -v
```

## Workflow Customization

### Adding More Checks

You can add additional jobs to `.github/workflows/test.yml`:

```yaml
- name: Lint code
  run: npm run lint

- name: Type checking
  run: npm run typecheck

- name: Security audit
  run: npm audit
```

### Conditional Execution

Only run tests for JavaScript changes:

```yaml
on:
  push:
    branches: [main]
    paths:
      - 'js/**'
      - 'tests/**'
      - 'package.json'
```

### Scheduled Tests

Run tests on a schedule (daily, hourly):

```yaml
on:
  schedule:
    - cron: '0 2 * * *'  # Daily at 2 AM UTC
```

## Documentation

- [GitHub Actions Docs](https://docs.github.com/en/actions)
- [Workflow Syntax](https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions)
- [Codecov Integration](https://docs.codecov.io/)

## Support

If CI fails:

1. **Check the logs** – Click job name to see detailed output
2. **Run locally** – Reproduce the issue locally first
3. **Check environment** – CI may have different versions/dependencies
4. **Review changes** – Check what changed since last passing build

## Summary

You now have:

✅ **Automatic testing** on every commit to main  
✅ **PR comments** showing test results  
✅ **Cross-browser testing** (Chrome, Firefox, Safari)  
✅ **Mobile testing** (iPhone, Android)  
✅ **Coverage tracking** (to Codecov)  
✅ **Artifact uploads** on failure  
✅ **Fast feedback** (results in ~15 minutes)  

This prevents bugs from reaching production and gives you confidence when refactoring or adding features.

---

**Setup**: 2026-05-16  
**Framework**: GitHub Actions  
**Total test coverage**: 200+ test cases across Jest and Playwright
