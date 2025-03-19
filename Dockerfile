FROM node:16

WORKDIR /app

# Install Playwright dependencies
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
    wget \
    curl \
    unzip \
    procps \
    && rm -rf /var/lib/apt/lists/*

# Copy package files first for better layer caching
COPY package*.json ./

# Install dependencies
RUN npm install

# Create persistent browser directory in both possible locations
RUN mkdir -p /app/data /app/.playwright-browsers /root/.cache/ms-playwright
RUN chmod -R 777 /app/.playwright-browsers /root/.cache/ms-playwright

# Set environment variable for Playwright browsers to both locations
ENV PLAYWRIGHT_BROWSERS_PATH=/app/.playwright-browsers
ENV PW_BROWSERS_PATH_CACHE=/root/.cache/ms-playwright
ENV NODE_ENV=production

# Install Playwright browsers in both locations for redundancy
RUN npx playwright install chromium --with-deps

# Also symlink the directory to handle both paths
RUN ln -s /app/.playwright-browsers/* /root/.cache/ms-playwright/ || true

# Verify browser installation and output detailed info
RUN ls -la /app/.playwright-browsers || echo "No browsers in /app directory"
RUN ls -la /root/.cache/ms-playwright || echo "No browsers in /root directory"
RUN find /app -name "chrome" -type f | xargs -r ls -la || echo "No chrome found in /app"
RUN find /root -name "chrome" -type f | xargs -r ls -la || echo "No chrome found in /root"

# Find and set Chrome executable path if possible
RUN CHROME_PATH=$(find /app -name "chrome" -type f | head -n 1) && \
    if [ -n "$CHROME_PATH" ]; then \
      echo "export CHROME_EXECUTABLE_PATH=$CHROME_PATH" >> /root/.bashrc && \
      echo "Found Chrome at: $CHROME_PATH"; \
    fi

# Copy application code
COPY . .

# Make the installation script executable
RUN chmod +x /app/install-browsers.sh

# Build TypeScript code
RUN npm run build

# Add startup script to ensure environment is properly configured
RUN echo '#!/bin/bash\necho "PLAYWRIGHT_BROWSERS_PATH=$PLAYWRIGHT_BROWSERS_PATH"\necho "PW_BROWSERS_PATH_CACHE=$PW_BROWSERS_PATH_CACHE"\necho "CHROME_EXECUTABLE_PATH=$CHROME_EXECUTABLE_PATH"\necho "Checking Playwright browser locations:"\nfind /app -name "chrome" -type f | xargs -r ls -la || echo "No chrome found in /app"\nfind /root -name "chrome" -type f | xargs -r ls -la || echo "No chrome found in /root"\nLS_PWD="$(ls -la $PWD)"\necho "Current directory: $PWD"\necho "$LS_PWD"\nexec node dist/index.js' > /app/startup.sh
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