#!/bin/bash

# This script installs system Chrome and sets up Playwright fallbacks

echo "Setting up browser environment for headless scraping..."
APP_BROWSER_PATH="/app/.playwright-browsers"
ROOT_BROWSER_PATH="/root/.cache/ms-playwright"

# Make sure both directories exist
mkdir -p $APP_BROWSER_PATH
mkdir -p $ROOT_BROWSER_PATH
mkdir -p /app/data

# Set permissions to ensure we can write to these directories
chmod -R 777 $APP_BROWSER_PATH $ROOT_BROWSER_PATH /app/data

# Display current environment
echo "Current environment:"
echo "NODE_ENV: $NODE_ENV"
echo "PLAYWRIGHT_BROWSERS_PATH: $PLAYWRIGHT_BROWSERS_PATH"
echo "PW_BROWSERS_PATH_CACHE: $PW_BROWSERS_PATH_CACHE"

# Export paths in proper order of preference
export PLAYWRIGHT_BROWSERS_PATH=$APP_BROWSER_PATH
export PW_BROWSERS_PATH_CACHE=$ROOT_BROWSER_PATH

# Set up Xvfb for headless browser
echo "Setting up Xvfb for headless browser..."
if ! pgrep -x "Xvfb" > /dev/null; then
  echo "Starting Xvfb on display :99..."
  Xvfb :99 -screen 0 1920x1080x24 &
  echo "Xvfb started with PID $!"
  # Wait a moment for Xvfb to start
  sleep 2
else
  echo "Xvfb is already running"
fi

# Export DISPLAY for browsers
export DISPLAY=:99
echo "export DISPLAY=:99" >> /root/.bashrc
echo "export DISPLAY=:99" >> ~/.bashrc

# Install system Chrome (most reliable option)
echo "Installing system Chrome as primary browser..."
apt-get update -y
apt-get install -y wget gnupg2 apt-transport-https
wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add -
echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" > /etc/apt/sources.list.d/google-chrome.list
apt-get update -y

# Install both Chrome and Chromium for redundancy
apt-get install -y google-chrome-stable chromium-browser

# Check if browsers installed correctly
echo "Verifying browser installations..."
if which google-chrome-stable >/dev/null; then
  echo "✅ Google Chrome installed successfully: $(google-chrome-stable --version)"
  export CHROME_EXECUTABLE_PATH=$(which google-chrome-stable)
  echo "export CHROME_EXECUTABLE_PATH=$CHROME_EXECUTABLE_PATH" >> /root/.bashrc
  echo "export CHROME_EXECUTABLE_PATH=$CHROME_EXECUTABLE_PATH" >> ~/.bashrc
else
  echo "❌ Google Chrome installation failed"
fi

if which chromium-browser >/dev/null; then
  echo "✅ Chromium Browser installed successfully: $(chromium-browser --version)"
  if [ -z "$CHROME_EXECUTABLE_PATH" ]; then
    export CHROME_EXECUTABLE_PATH=$(which chromium-browser)
    echo "export CHROME_EXECUTABLE_PATH=$CHROME_EXECUTABLE_PATH" >> /root/.bashrc
    echo "export CHROME_EXECUTABLE_PATH=$CHROME_EXECUTABLE_PATH" >> ~/.bashrc
  fi
else
  echo "❌ Chromium Browser installation failed"
fi

# If system browsers failed, try using npx playwright to install
if [ -z "$CHROME_EXECUTABLE_PATH" ]; then
  echo "System browser installation failed, trying Playwright browser installation..."
  
  # Install browser using playwright
  echo "Installing browsers with Playwright..."
  NODE_PATH=$(which node)
  echo "Node.js path: $NODE_PATH"
  
  echo "Installing browsers with explicit command..."
  npx playwright install chromium --with-deps
  
  echo "Browser installation completed"
  
  # Check installation directories
  echo "Checking installation directories..."
  ls -la $APP_BROWSER_PATH || echo "No browser in APP_BROWSER_PATH"
  ls -la $ROOT_BROWSER_PATH || echo "No browser in ROOT_BROWSER_PATH"
  
  # Find the browser executable in Playwright directories
  echo "Looking for browser executables in Playwright directories..."
  FOUND_BROWSERS=$(find $APP_BROWSER_PATH $ROOT_BROWSER_PATH -name "chrome" -o -name "chromium" 2>/dev/null)
  
  if [ -n "$FOUND_BROWSERS" ]; then
    echo "Found browsers in Playwright directories:"
    echo "$FOUND_BROWSERS"
    # Use the first found browser
    PLAYWRIGHT_CHROME=$(echo "$FOUND_BROWSERS" | head -n 1)
    echo "Using Playwright browser: $PLAYWRIGHT_CHROME"
    export CHROME_EXECUTABLE_PATH=$PLAYWRIGHT_CHROME
    echo "export CHROME_EXECUTABLE_PATH=$CHROME_EXECUTABLE_PATH" >> /root/.bashrc
    echo "export CHROME_EXECUTABLE_PATH=$CHROME_EXECUTABLE_PATH" >> ~/.bashrc
  else
    echo "No browser found in Playwright directories"
  fi
fi

# Create symlinks between directories for compatibility
echo "Creating symlinks for browser compatibility..."
if [ -d "$APP_BROWSER_PATH" ] && [ -d "$ROOT_BROWSER_PATH" ]; then
  echo "Linking browsers between directories..."
  ln -sf $APP_BROWSER_PATH/* $ROOT_BROWSER_PATH/ 2>/dev/null || echo "Failed to create symlink from APP to ROOT"
  ln -sf $ROOT_BROWSER_PATH/* $APP_BROWSER_PATH/ 2>/dev/null || echo "Failed to create symlink from ROOT to APP"
fi

# Final verification and output
echo "Browser environment setup complete."
echo "Available Chrome/Chromium executables:"
find / -name chrome -o -name chromium -o -name "google-chrome" -o -name "chromium-browser" 2>/dev/null | xargs -r ls -la 2>/dev/null || echo "No Chrome binaries found"

echo "Current PLAYWRIGHT_BROWSERS_PATH: $PLAYWRIGHT_BROWSERS_PATH"
echo "Current PW_BROWSERS_PATH_CACHE: $PW_BROWSERS_PATH_CACHE"
echo "Current CHROME_EXECUTABLE_PATH: $CHROME_EXECUTABLE_PATH"
echo "Current DISPLAY: $DISPLAY"

# Test browser launches
echo "Testing browser launch..."
if [ -n "$CHROME_EXECUTABLE_PATH" ]; then
  echo "Testing $CHROME_EXECUTABLE_PATH with --version flag..."
  $CHROME_EXECUTABLE_PATH --version --headless || echo "Browser version check failed"
else 
  echo "No Chrome executable path set, cannot test browser launch"
fi 