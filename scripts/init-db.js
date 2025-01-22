const User = require('../models/User');

async function initializeDatabase() {
  try {
    await User.initialize();
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Failed to initialize database:', error);
    process.exit(1);
  }
}

initializeDatabase();
