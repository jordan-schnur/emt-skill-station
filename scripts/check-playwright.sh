#!/bin/bash
# Check if Playwright browsers are installed
# If not, provide helpful instructions

CHROMIUM_PATH="$HOME/Library/Caches/ms-playwright/chromium_headless_shell-*/chrome-headless-shell-mac-arm64/chrome-headless-shell"

if ls $CHROMIUM_PATH 2>/dev/null | grep -q .; then
  echo "✓ Playwright browsers are installed"
  npx playwright test
else
  echo "⚠ Playwright browsers are not installed"
  echo ""
  echo "To install browsers, run:"
  echo "  npm run test:playwright:install"
  echo ""
  echo "Or run directly:"
  echo "  npx playwright install"
  echo ""
  echo "Note: This requires internet access to download browser binaries."
  exit 1
fi
