const path = require('path');
const sqlite3 = require('better-sqlite3');

class Quote {
  static getDb() {
    const dbPath = path.join(process.cwd(), 'data', 'estimates.db');
    return sqlite3(dbPath);
  }

  static async initialize() {
    const db = Quote.getDb();
    
    // First check if table exists
    const tableExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='quotes'").get();
    
    if (!tableExists) {
      // Create new table
      db.exec(`
        CREATE TABLE quotes (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          customer_name TEXT NOT NULL,
          customer_email TEXT,
          customer_phone TEXT,
          description TEXT,
          total_amount DECIMAL(10,2),
          status TEXT DEFAULT 'pending',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          user_id INTEGER,
          FOREIGN KEY(user_id) REFERENCES users(id)
        )
      `);
      console.log('Quotes table created successfully');
    }
  }

  static async create(quoteData) {
    const db = Quote.getDb();
    const { lastInsertRowid } = db.prepare(`
      INSERT INTO quotes (
        customer_name, customer_email, customer_phone, 
        description, total_amount, status, user_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      quoteData.customer_name,
      quoteData.customer_email,
      quoteData.customer_phone,
      quoteData.description,
      quoteData.total_amount,
      quoteData.status || 'pending',
      quoteData.user_id
    );

    return Quote.findById(lastInsertRowid);
  }

  static async findById(id) {
    const db = Quote.getDb();
    return db.prepare('SELECT * FROM quotes WHERE id = ?').get(id);
  }

  static async findAll() {
    const db = Quote.getDb();
    return db.prepare('SELECT * FROM quotes ORDER BY created_at DESC').all();
  }

  static async update(id, updates) {
    const db = Quote.getDb();
    const fields = Object.keys(updates)
      .filter(key => key !== 'id')
      .map(key => `${key} = ?`)
      .join(', ');
    
    const values = Object.keys(updates)
      .filter(key => key !== 'id')
      .map(key => updates[key]);

    const query = `UPDATE quotes SET ${fields}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
    db.prepare(query).run(...values, id);
    
    return Quote.findById(id);
  }

  static async delete(id) {
    const db = Quote.getDb();
    const result = db.prepare('DELETE FROM quotes WHERE id = ?').run(id);
    return result.changes > 0;
  }
}

module.exports = Quote;
