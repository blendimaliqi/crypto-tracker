FROM node:16-alpine

WORKDIR /app

# Install dependencies first (better caching)
COPY package*.json ./
RUN npm install

# Copy application code
COPY . .

# Create data directory
RUN mkdir -p /app/data

# Set environment variable for Node.js to report uncaught exceptions
ENV NODE_ENV=production

# Add a healthcheck to verify the application is running
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 CMD node -e "try { require('fs').statSync('/app/data/listings.json'); process.exit(0); } catch(e) { process.exit(1); }"

# Command to run the application
CMD ["node", "index.js"] 