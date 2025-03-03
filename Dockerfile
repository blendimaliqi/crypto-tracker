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
    && rm -rf /var/lib/apt/lists/*

# Copy package files first for better layer caching
COPY package*.json ./

# Install dependencies
RUN npm install

# Create persistent browser directory in /app instead of /root
# This is more likely to be preserved across container restarts
RUN mkdir -p /app/data /app/.playwright-browsers
RUN chmod -R 777 /app/.playwright-browsers

# Set environment variable for Playwright browsers - make it permanent
ENV PLAYWRIGHT_BROWSERS_PATH=/app/.playwright-browsers

# Install Playwright browsers in the persistent location
RUN PLAYWRIGHT_BROWSERS_PATH=/app/.playwright-browsers npx playwright install chromium --with-deps

# Verify browser installation and output detailed info
RUN ls -la /app/.playwright-browsers
RUN find /app/.playwright-browsers -type f -name "headless_shell" -o -name "chrome" -o -name "chrome.exe" | xargs -r ls -la || echo "No browser binaries found with exact names, listing all executables:"
RUN find /app/.playwright-browsers -type f -executable | grep -v ".so" | xargs -r ls -la || echo "No executable files found"

# Copy application code
COPY . .

# Add startup script to ensure environment is properly configured
RUN echo '#!/bin/bash\necho "PLAYWRIGHT_BROWSERS_PATH=$PLAYWRIGHT_BROWSERS_PATH"\necho "Listing browser files:"\nfind /app/.playwright-browsers -type f -executable -not -path "*/\.*" | head -10\nexec node index.js' > /app/startup.sh
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