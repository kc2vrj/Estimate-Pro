#!/bin/sh

# Create data directory if it doesn't exist
mkdir -p /app/data

# Initialize the database
node scripts/init-db.js

# Start the application
exec npm start -- -p 3000
