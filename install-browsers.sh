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

# Display current environment
echo "Current environment:"
echo "NODE_ENV: $NODE_ENV"
echo "PLAYWRIGHT_BROWSERS_PATH: $PLAYWRIGHT_BROWSERS_PATH"
echo "PW_BROWSERS_PATH_CACHE: $PW_BROWSERS_PATH_CACHE"

# Export paths in proper order of preference
export PLAYWRIGHT_BROWSERS_PATH=$APP_BROWSER_PATH
export PW_BROWSERS_PATH_CACHE=$ROOT_BROWSER_PATH

# Check if browsers are installed in either location
if [ ! -d "$APP_BROWSER_PATH/chromium-*" ] && [ ! -d "$ROOT_BROWSER_PATH/chromium-*" ]; then
  echo "Playwright browsers not found in either location. Installing..."
  
  # Install Playwright browsers with all dependencies
  echo "Running Playwright installation with PLAYWRIGHT_BROWSERS_PATH=$PLAYWRIGHT_BROWSERS_PATH"
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

# Find browser executables and store reference to Chrome executable
CHROME_EXEC=$(find $APP_BROWSER_PATH -name "chrome" -type f | head -n 1)
if [ -n "$CHROME_EXEC" ]; then
  echo "Found Chrome executable: $CHROME_EXEC"
  export CHROME_EXECUTABLE_PATH=$CHROME_EXEC
  echo "export CHROME_EXECUTABLE_PATH=$CHROME_EXEC" >> /root/.bashrc
else
  echo "No Chrome executable found in $APP_BROWSER_PATH"
  # Try finding in the other location
  CHROME_EXEC=$(find $ROOT_BROWSER_PATH -name "chrome" -type f | head -n 1)
  if [ -n "$CHROME_EXEC" ]; then
    echo "Found Chrome executable in root cache: $CHROME_EXEC" 
    export CHROME_EXECUTABLE_PATH=$CHROME_EXEC
    echo "export CHROME_EXECUTABLE_PATH=$CHROME_EXEC" >> /root/.bashrc
  fi
fi

# List installed browsers in both locations
echo "Available browser executables in APP_BROWSER_PATH:"
find $APP_BROWSER_PATH -type f -name "headless_shell" -o -name "chrome" | xargs -r ls -la 2>/dev/null || echo "No browser binaries found in $APP_BROWSER_PATH"

echo "Available browser executables in ROOT_BROWSER_PATH:"
find $ROOT_BROWSER_PATH -type f -name "headless_shell" -o -name "chrome" | xargs -r ls -la 2>/dev/null || echo "No browser binaries found in $ROOT_BROWSER_PATH"

echo "Current PLAYWRIGHT_BROWSERS_PATH: $PLAYWRIGHT_BROWSERS_PATH"
echo "Current PW_BROWSERS_PATH_CACHE: $PW_BROWSERS_PATH_CACHE"
echo "Current CHROME_EXECUTABLE_PATH: $CHROME_EXECUTABLE_PATH"

# Try to use apt to install chromium as a backup if playwright install failed
if [ ! -f "$CHROME_EXECUTABLE_PATH" ]; then
  echo "No Chrome executable found, trying to install system Chromium as fallback..."
  apt-get update && apt-get install -y chromium chromium-browser
  SYSTEM_CHROME=$(which chromium || which chromium-browser)
  if [ -n "$SYSTEM_CHROME" ]; then
    echo "Found system Chrome at: $SYSTEM_CHROME"
    export CHROME_EXECUTABLE_PATH=$SYSTEM_CHROME
    echo "export CHROME_EXECUTABLE_PATH=$SYSTEM_CHROME" >> /root/.bashrc
  fi
fi 