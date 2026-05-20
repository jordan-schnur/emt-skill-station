#!/bin/bash
# Run Playwright E2E tests
# Handles both local and CI environments (macOS, Linux, Windows)

set -e

echo "🧪 Running Playwright E2E tests..."

# Check if we're in CI environment
if [ -n "$CI" ] || [ -n "$GITHUB_ACTIONS" ]; then
  echo "📍 Running in CI environment (browsers already installed)"
else
  echo "📍 Running locally - checking Playwright browsers..."

  # Try to detect if browsers are installed
  PLAYWRIGHT_BROWSERS_PATH="${PLAYWRIGHT_BROWSERS_PATH:-./.playwright}"

  if [ ! -d "$PLAYWRIGHT_BROWSERS_PATH" ]; then
    echo "⚠️  Playwright browsers not found"
    echo "Installing browsers (this may take a minute)..."
    npx playwright install --with-deps
  fi
fi

# Run the tests
npx playwright test --reporter=list
