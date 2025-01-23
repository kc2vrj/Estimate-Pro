const User = require('../models/User');
const Quote = require('../models/Quote');
const path = require('path');
const fs = require('fs');

// Ensure the database directory exists
function ensureDatabaseDirectory(dbPath) {
  const dbDirectory = path.dirname(dbPath);
  if (!fs.existsSync(dbDirectory)) {
    fs.mkdirSync(dbDirectory, { recursive: true });
  }
}

async function initializeDatabase() {
  try {
    // Use environment variable or fallback to default path
    const databasePath = process.env.DATABASE_PATH || path.join(__dirname, '../data/estimates.db');
    
    // Ensure the directory exists
    ensureDatabaseDirectory(databasePath);

    // Set the database path for User and Quote models
    User.setDatabasePath(databasePath);
    Quote.setDatabasePath(databasePath);

    await User.initialize();
    await Quote.initialize();
    
    console.log('Database initialized successfully');
    console.log('Database path:', databasePath);
  } catch (error) {
    console.error('Error initializing database:', error);
    process.exit(1);
  }
}

initializeDatabase();
