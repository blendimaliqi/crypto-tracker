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

# Install dependencies first (better caching)
COPY package*.json ./
RUN npm install
RUN npx playwright install chromium --with-deps

# Configure Playwright for Docker environment
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
ENV PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/app/node_modules/playwright/.local-browsers/chromium-*/chrome-linux/chrome

# Copy application code
COPY . .

# Create data directory and ensure proper permissions
RUN mkdir -p /app/data && chown -R node:node /app/data

# Set environment variable for Node.js to report uncaught exceptions
ENV NODE_ENV=production

# Create a volume for persistent data storage
VOLUME ["/app/data"]

# Add a healthcheck to verify the application is running
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 CMD node -e "try { require('fs').statSync('/app/data/listings.json'); process.exit(0); } catch(e) { process.exit(1); }"

# Switch to non-root user for better security
USER node

# Command to run the application
CMD ["node", "index.js"] 