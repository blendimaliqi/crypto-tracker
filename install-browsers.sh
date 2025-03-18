#!/bin/bash

# This script installs Playwright browsers if they don't exist

echo "Checking for Playwright browsers..."
APP_BROWSER_PATH="/app/.playwright-browsers"
ROOT_BROWSER_PATH="/root/.cache/ms-playwright"

# Make sure both directories exist
mkdir -p $APP_BROWSER_PATH
mkdir -p $ROOT_BROWSER_PATH

# Set permissions to ensure we can write to these directories
chmod -R 777 $APP_BROWSER_PATH $ROOT_BROWSER_PATH

# Check if browsers are installed in either location
if [ ! -d "$APP_BROWSER_PATH/chromium-*" ] && [ ! -d "$ROOT_BROWSER_PATH/chromium-*" ]; then
  echo "Playwright browsers not found in either location. Installing..."
  
  # Set the environment variable to use our app directory
  export PLAYWRIGHT_BROWSERS_PATH=$APP_BROWSER_PATH
  
  # Install Playwright browsers with all dependencies
  npx playwright install chromium --with-deps
  
  echo "Browser installation completed in $APP_BROWSER_PATH"
  
  # Create a symbolic link to make browsers available in both locations
  if [ -d "$APP_BROWSER_PATH" ] && [ "$(ls -A $APP_BROWSER_PATH)" ]; then
    echo "Creating symbolic link from $APP_BROWSER_PATH to $ROOT_BROWSER_PATH"
    ln -sf $APP_BROWSER_PATH/* $ROOT_BROWSER_PATH/ || echo "Failed to create symbolic link"
  fi
else
  echo "Playwright browsers already installed"
  echo "APP_BROWSER_PATH contents:"
  ls -la $APP_BROWSER_PATH
  echo "ROOT_BROWSER_PATH contents:"
  ls -la $ROOT_BROWSER_PATH
fi

# List installed browsers in both locations
echo "Available browser executables in APP_BROWSER_PATH:"
find $APP_BROWSER_PATH -type f -name "headless_shell" -o -name "chrome" | xargs -r ls -la 2>/dev/null || echo "No browser binaries found in $APP_BROWSER_PATH"

echo "Available browser executables in ROOT_BROWSER_PATH:"
find $ROOT_BROWSER_PATH -type f -name "headless_shell" -o -name "chrome" | xargs -r ls -la 2>/dev/null || echo "No browser binaries found in $ROOT_BROWSER_PATH"

echo "Current PLAYWRIGHT_BROWSERS_PATH: $PLAYWRIGHT_BROWSERS_PATH" 