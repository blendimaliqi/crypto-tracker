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

# Install browsers as root
RUN npx playwright install chromium
RUN npx playwright install-deps chromium

# Copy application code
COPY . .

# Create data directory
RUN mkdir -p /app/data

# Set browser cache permissions for all users
RUN mkdir -p /root/.cache && chmod -R 777 /root/.cache
RUN mkdir -p /app/.cache && chmod -R 777 /app/.cache
RUN mkdir -p /.cache && chmod -R 777 /.cache

# Set environment variable for Node.js to report uncaught exceptions
ENV NODE_ENV=production

# Create a volume for persistent data storage
VOLUME ["/app/data"]

# Add a healthcheck to verify the application is running
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 CMD node -e "try { require('fs').statSync('/app/data/listings.json'); process.exit(0); } catch(e) { process.exit(1); }"

# Command to run the application
CMD ["node", "index.js"] 