#!/bin/bash

# This script installs Playwright browsers if they don't exist

echo "Checking for Playwright browsers..."
BROWSER_PATH="${PLAYWRIGHT_BROWSERS_PATH:-/app/.playwright-browsers}"

if [ ! -d "$BROWSER_PATH" ] || [ -z "$(ls -A $BROWSER_PATH)" ]; then
  echo "Playwright browsers not found in $BROWSER_PATH. Installing..."
  # Install Playwright browsers - only install chromium for faster installation
  npx playwright install chromium --with-deps
  echo "Browser installation completed."
else
  echo "Playwright browsers already installed in $BROWSER_PATH"
  ls -la "$BROWSER_PATH"
fi

# List installed browsers
echo "Available browser executables:"
find $BROWSER_PATH -type f -executable -not -path "*/\.*" | grep -v "\.so" | head -10 