# Build stage
FROM node:20-slim AS builder

RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm ci
RUN npm install react-hot-toast date-fns

COPY . .
RUN npm run build

# Production stage
FROM node:20-slim

# Install required runtime dependencies for better-sqlite3
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files first
COPY --from=builder /app/package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/scripts ./scripts
COPY .env* ./

# Create data directory with correct permissions
RUN mkdir -p /app/data && chown -R node:node /app/data

# Set environment variables for NextAuth
ENV NEXTAUTH_SECRET=estimatepro_secret_key_123
ENV NODE_ENV=production

# Switch to non-root user
USER node

# Expose the port the app runs on
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

CMD ["/bin/sh", "./scripts/start.sh"]