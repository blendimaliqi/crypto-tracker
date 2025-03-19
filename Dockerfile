FROM node:16

WORKDIR /app

# Add Chrome repository and install Chrome
RUN apt-get update && apt-get install -y \
    apt-transport-https \
    ca-certificates \
    curl \
    gnupg \
    wget \
    --no-install-recommends \
    && curl -sSL https://dl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && echo "deb [arch=amd64] https://dl.google.com/linux/chrome/deb/ stable main" > /etc/apt/sources.list.d/google-chrome.list \
    && apt-get update \
    && apt-get install -y \
    google-chrome-stable \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Install common dependencies for both Chrome and Playwright
RUN apt-get update && apt-get install -y \
    libglib2.0-0 \
    libnss3 \
    libnspr4 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libdbus-1-3 \
    libxcb1 \
    libxkbcommon0 \
    libx11-6 \
    libxcomposite1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libpango-1.0-0 \
    libcairo2 \
    libasound2 \
    fonts-liberation \
    libappindicator3-1 \
    xdg-utils \
    xvfb \
    procps \
    && rm -rf /var/lib/apt/lists/*

# Set up Chrome paths and environment
ENV CHROME_PATH=/usr/bin/google-chrome-stable
ENV CHROME_EXECUTABLE_PATH=/usr/bin/google-chrome-stable
RUN echo "export CHROME_PATH=/usr/bin/google-chrome-stable" >> /root/.bashrc
RUN echo "export CHROME_EXECUTABLE_PATH=/usr/bin/google-chrome-stable" >> /root/.bashrc

# Verify Chrome installation
RUN google-chrome-stable --version || echo "Chrome not found but continuing"

# Copy package files first for better layer caching
COPY package*.json ./

# Install dependencies
RUN npm install

# Create persistent browser directory in both possible locations
RUN mkdir -p /app/data /app/.playwright-browsers /root/.cache/ms-playwright
RUN chmod -R 777 /app/.playwright-browsers /root/.cache/ms-playwright /app/data

# Set environment variable for Playwright browsers to both locations
ENV PLAYWRIGHT_BROWSERS_PATH=/app/.playwright-browsers
ENV PW_BROWSERS_PATH_CACHE=/root/.cache/ms-playwright
ENV NODE_ENV=production

# DISPLAY for Chrome
ENV DISPLAY=:99

# Copy application code
COPY . .

# Make the installation script executable
RUN chmod +x /app/install-browsers.sh

# Build TypeScript code
RUN npm run build

# Add startup script to ensure environment is properly configured
RUN echo '#!/bin/bash\n\
echo "===== CRYPTO TRACKER STARTUP ===="\n\
echo "CHROME_PATH=$CHROME_PATH"\n\
echo "CHROME_EXECUTABLE_PATH=$CHROME_EXECUTABLE_PATH"\n\
echo "PLAYWRIGHT_BROWSERS_PATH=$PLAYWRIGHT_BROWSERS_PATH"\n\
echo "PW_BROWSERS_PATH_CACHE=$PW_BROWSERS_PATH_CACHE"\n\
\n\
# Setup Xvfb for headless browser\n\
echo "Starting Xvfb..."\n\
Xvfb :99 -screen 0 1280x720x16 &\n\
export DISPLAY=:99\n\
sleep 2\n\
\n\
# Verify display is working\n\
echo "Checking if DISPLAY is available..."\n\
if xdpyinfo -display :99 >/dev/null 2>&1; then\n\
  echo "✅ Xvfb is running correctly on display :99"\n\
else\n\
  echo "❌ Xvfb failed to start properly on :99"\n\
fi\n\
\n\
# Check Chrome installation\n\
echo "Chrome version:"\n\
if [ -n "$CHROME_EXECUTABLE_PATH" ] && [ -x "$CHROME_EXECUTABLE_PATH" ]; then\n\
  $CHROME_EXECUTABLE_PATH --version --headless || echo "Chrome version check failed"\n\
  echo "Chrome executable exists and is executable"\n\
else\n\
  echo "Chrome executable path not valid: $CHROME_EXECUTABLE_PATH"\n\
  # Try to find Chrome\n\
  CHROME_CANDIDATES=$(find / -name chrome -o -name chromium -o -name "google-chrome" -o -name "chromium-browser" -type f 2>/dev/null)\n\
  if [ -n "$CHROME_CANDIDATES" ]; then\n\
    echo "Found potential Chrome binaries:"\n\
    echo "$CHROME_CANDIDATES"\n\
    CHROME_PICK=$(echo "$CHROME_CANDIDATES" | head -n 1)\n\
    echo "Setting CHROME_EXECUTABLE_PATH=$CHROME_PICK"\n\
    export CHROME_EXECUTABLE_PATH=$CHROME_PICK\n\
  else\n\
    echo "No Chrome binaries found!"\n\
  fi\n\
fi\n\
\n\
# Run installer script to ensure browsers are available\n\
echo "Running browser installer script..."\n\
/app/install-browsers.sh\n\
\n\
# Show current working directory and start app\n\
echo "Current directory: $PWD"\n\
ls -la $PWD\n\
echo "===== STARTING APP ====="\n\
exec node dist/index.js' > /app/startup.sh
RUN chmod +x /app/startup.sh

# Set environment variable for Node.js to report uncaught exceptions
ENV NODE_ENV=production

# Create a volume for persistent data storage
# But don't make it override the browser installation
VOLUME ["/app/data"]

# Add a healthcheck to verify the application is running
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 CMD node -e "try { require('fs').statSync('/app/data/listings.json'); process.exit(0); } catch(e) { process.exit(1); }"

# Command to run the application via the startup script
CMD ["/app/startup.sh"] 