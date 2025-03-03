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

# Create directories for Playwright
RUN mkdir -p /app/data /root/.cache
RUN chmod -R 777 /root/.cache

# Install Playwright browsers properly
ENV PLAYWRIGHT_BROWSERS_PATH=/root/.cache/ms-playwright
RUN npx playwright install chromium --with-deps

# Verify browser installation
RUN ls -la /root/.cache/ms-playwright
RUN find /root/.cache/ms-playwright -name "headless_shell" -o -name "chrome" -o -name "chrome.exe" | xargs -r ls -la || echo "No browser binaries found"

# Copy application code
COPY . .

# Create data directory
RUN mkdir -p /app/data

# Ensure browser cache permissions are set correctly
RUN chmod -R 777 /root/.cache/ms-playwright

# Set environment variable for Node.js to report uncaught exceptions
ENV NODE_ENV=production

# Create a volume for persistent data storage
VOLUME ["/app/data"]

# Add a healthcheck to verify the application is running
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 CMD node -e "try { require('fs').statSync('/app/data/listings.json'); process.exit(0); } catch(e) { process.exit(1); }"

# Command to run the application
CMD ["node", "index.js"] 