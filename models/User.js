const sqlite3 = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

class User {
  static async initialize() {
    console.log('Starting database initialization...');
    const dbPath = path.join(process.cwd(), 'data', 'estimates.db');
    console.log('Database path:', dbPath);
    const db = sqlite3(dbPath);
    
    // First check if table exists
    const tableExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='users'").get();
    console.log('Table exists:', !!tableExists);
    
    if (!tableExists) {
      console.log('Creating users table...');
      // Create new table with all columns
      db.exec(`
        CREATE TABLE users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          email TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          name TEXT,
          role TEXT DEFAULT 'user',
          is_approved BOOLEAN DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('Users table created successfully');
    } else {
      // Add new columns if they don't exist
      const columns = db.prepare("PRAGMA table_info(users)").all();
      const columnNames = columns.map(col => col.name);
      
      if (!columnNames.includes('role')) {
        db.exec("ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user'");
      }
      if (!columnNames.includes('is_approved')) {
        db.exec("ALTER TABLE users ADD COLUMN is_approved BOOLEAN DEFAULT 0");
      }
    }
    
    // Create admin user if it doesn't exist
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    
    const admin = db.prepare('SELECT * FROM users WHERE email = ?').get(adminEmail);
    console.log('Existing admin:', admin ? 'Found' : 'Not found');
    
    if (!admin) {
      console.log('Creating admin user...');
      const hashedPassword = await bcrypt.hash(adminPassword, 10);
      console.log('Generated hash length:', hashedPassword.length);
      
      // Verify the hash works
      const verifyHash = await bcrypt.compare(adminPassword, hashedPassword);
      console.log('Verified hash works:', verifyHash);
      
      db.prepare(
        'INSERT INTO users (email, password, name, role, is_approved) VALUES (?, ?, ?, ?, ?)'
      ).run(adminEmail, hashedPassword, 'Admin', 'admin', 1);
      console.log('Admin user created successfully');
    } else {
      // Ensure existing admin has correct role and approval
      db.prepare(
        'UPDATE users SET role = ?, is_approved = ? WHERE email = ?'
      ).run('admin', 1, adminEmail);
    }
    
    db.close();
  }

  static async findByEmail(email) {
    const dbPath = path.join(process.cwd(), 'data', 'estimates.db');
    const db = sqlite3(dbPath);
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    db.close();
    return user;
  }

  static async findById(id) {
    const dbPath = path.join(process.cwd(), 'data', 'estimates.db');
    const db = sqlite3(dbPath);
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    db.close();
    return user;
  }

  static async create({ email, password, name }) {
    const dbPath = path.join(process.cwd(), 'data', 'estimates.db');
    const db = sqlite3(dbPath);
    const hashedPassword = await bcrypt.hash(password, 10);
    try {
      const result = db.prepare(
        'INSERT INTO users (email, password, name, role, is_approved) VALUES (?, ?, ?, ?, ?)'
      ).run(email, hashedPassword, name, 'user', 0);
      db.close();
      return result.lastInsertRowid;
    } catch (error) {
      db.close();
      throw error;
    }
  }

  static async validatePassword(user, password) {
    console.log('Validating password for user:', user.email);
    console.log('Stored password hash length:', user.password.length);
    console.log('Input password length:', password.length);
    const isValid = await bcrypt.compare(password, user.password);
    console.log('Password validation result:', isValid);
    return isValid;
  }

  static async authenticate(email, password) {
    console.log('Attempting authentication for email:', email);
    const user = await User.findByEmail(email);
    console.log('User found:', !!user);
    
    if (!user) {
      console.log('User not found');
      return null;
    }
    
    const isValid = await User.validatePassword(user, password);
    console.log('Password valid:', isValid);
    
    if (!isValid) {
      console.log('Invalid password');
      return null;
    }

    if (!user.is_approved) {
      console.log('User not approved');
      throw new Error('Account is pending approval');
    }

    console.log('Authentication successful');
    return user;
  }

  static async getAllPendingUsers() {
    const dbPath = path.join(process.cwd(), 'data', 'estimates.db');
    const db = sqlite3(dbPath);
    const users = db.prepare('SELECT id, email, name, created_at FROM users WHERE is_approved = 0 AND role = ?').all('user');
    db.close();
    return users;
  }

  static async approveUser(userId) {
    const dbPath = path.join(process.cwd(), 'data', 'estimates.db');
    const db = sqlite3(dbPath);
    try {
      const result = db.prepare('UPDATE users SET is_approved = 1 WHERE id = ? AND role = ?').run(userId, 'user');
      if (result.changes === 0) {
        throw new Error('User not found or already approved');
      }
      db.close();
      return true;
    } catch (error) {
      db.close();
      throw error;
    }
  }

  static async denyUser(userId) {
    const dbPath = path.join(process.cwd(), 'data', 'estimates.db');
    const db = sqlite3(dbPath);
    try {
      const result = db.prepare('DELETE FROM users WHERE id = ? AND role = ? AND is_approved = 0').run(userId, 'user');
      if (result.changes === 0) {
        throw new Error('User not found or already approved');
      }
      db.close();
      return true;
    } catch (error) {
      db.close();
      throw error;
    }
  }

  static async getAllUsers() {
    const dbPath = path.join(process.cwd(), 'data', 'estimates.db');
    const db = sqlite3(dbPath);
    const users = db.prepare('SELECT id, email, name, role, is_approved, created_at FROM users').all();
    db.close();
    return users;
  }

  static async updateUser(userId, { name, email, role, is_approved }) {
    const dbPath = path.join(process.cwd(), 'data', 'estimates.db');
    const db = sqlite3(dbPath);
    try {
      // Don't allow changing admin's role or approval status
      const user = db.prepare('SELECT role FROM users WHERE id = ?').get(userId);
      if (user.role === 'admin' && role !== 'admin') {
        throw new Error('Cannot change admin role');
      }

      const result = db.prepare(`
        UPDATE users 
        SET name = ?, email = ?, role = ?, is_approved = ?
        WHERE id = ?
      `).run(name, email, role, is_approved ? 1 : 0, userId);

      if (result.changes === 0) {
        throw new Error('User not found');
      }
      db.close();
      return true;
    } catch (error) {
      db.close();
      throw error;
    }
  }

  static async deleteUser(userId) {
    const dbPath = path.join(process.cwd(), 'data', 'estimates.db');
    const db = sqlite3(dbPath);
    try {
      // Check if this is an admin user
      const user = db.prepare('SELECT role FROM users WHERE id = ?').get(userId);
      if (user?.role === 'admin') {
        // Count remaining admin users
        const adminCount = db.prepare('SELECT COUNT(*) as count FROM users WHERE role = ?').get('admin');
        if (adminCount.count <= 1) {
          throw new Error('Cannot delete last admin user');
        }
      }

      const result = db.prepare('DELETE FROM users WHERE id = ?').run(userId);
      if (result.changes === 0) {
        throw new Error('User not found');
      }
      db.close();
      return true;
    } catch (error) {
      db.close();
      throw error;
    }
  }

  static async setUserRole(userId, role) {
    const dbPath = path.join(process.cwd(), 'data', 'estimates.db');
    const db = sqlite3(dbPath);
    try {
      // Don't allow changing admin's role
      const user = db.prepare('SELECT role FROM users WHERE id = ?').get(userId);
      if (user.role === 'admin') {
        throw new Error('Cannot change admin role');
      }

      const result = db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, userId);
      if (result.changes === 0) {
        throw new Error('User not found');
      }
      db.close();
      return true;
    } catch (error) {
      db.close();
      throw error;
    }
  }
}

module.exports = User;
