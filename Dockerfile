# Use Node.js LTS version
FROM node:20-slim

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
RUN npm install

# Copy the rest of the application
COPY . .

# Create data directory
RUN mkdir -p data

# Initialize the database
RUN node scripts/init-db.js

# Build the Next.js application
RUN npm run build

# Expose the port the app runs on
EXPOSE 3000

# Start the application with the new port
CMD ["sh", "-c", "npm start -- -p 3000"]
