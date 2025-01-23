# Use Node.js LTS version
FROM node:20-slim AS builder

# Install required system dependencies for better-sqlite3
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy the rest of the application
COPY . .

# Build the Next.js application
RUN npm run build

# Production image
FROM node:20-slim

# Install required runtime dependencies for better-sqlite3
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy from builder
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/scripts ./scripts

# Make the startup script executable
RUN chmod +x scripts/start.sh

# Create data directory with correct permissions
RUN mkdir -p data && chown -R node:node data

# Switch to non-root user
USER node

# Expose the port the app runs on
EXPOSE 3000

# Start the application using the startup script
CMD ["./scripts/start.sh"]
