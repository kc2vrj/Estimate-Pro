const User = require('../models/User');
const Quote = require('../models/Quote');

async function initializeDatabase() {
  try {
    await User.initialize();
    await Quote.initialize();
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    process.exit(1);
  }
}

initializeDatabase();
