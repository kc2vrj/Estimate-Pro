#!/bin/sh

# Create data directory if it doesn't exist
mkdir -p /app/data

# Setup SSL Certificates
chmod +x scripts/setup-ssl.sh
./scripts/setup-ssl.sh

# Initialize the database
node scripts/init-db.js

# Start the application
exec npm start -- -p 3000
