const path = require('path');
const Database = require('better-sqlite3');
const fs = require('fs');

class Quote {
  static _dbPath = null;

  static setDatabasePath(dbPath) {
    // Ensure the directory exists
    const directory = path.dirname(dbPath);
    if (!fs.existsSync(directory)) {
      fs.mkdirSync(directory, { recursive: true });
    }
    this._dbPath = dbPath;
  }

  static getDatabasePath() {
    return this._dbPath || process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'estimates.db');
  }

  static getDb() {
    const dbPath = this.getDatabasePath();
    
    // Ensure directory exists
    const directory = path.dirname(dbPath);
    if (!fs.existsSync(directory)) {
      fs.mkdirSync(directory, { recursive: true });
    }

    const db = new Database(dbPath);
    
    // Enable foreign keys
    db.pragma('foreign_keys = ON');
    
    return db;
  }

  static initialize() {
    const db = this.getDb();
    const stmt = db.prepare(`
      CREATE TABLE IF NOT EXISTS quotes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_name TEXT,
        customer_email TEXT,
        customer_phone TEXT,
        description TEXT,
        items TEXT,
        total_amount REAL,
        status TEXT,
        user_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    stmt.run();
    db.close();
  }

  static create(data) {
    const db = this.getDb();
    const stmt = db.prepare(`
      INSERT INTO quotes (
        customer_name,
        customer_email,
        customer_phone,
        description,
        items,
        total_amount,
        status,
        user_id
      ) VALUES (
        @customer_name,
        @customer_email,
        @customer_phone,
        @description,
        @items,
        @total_amount,
        @status,
        @user_id
      )
    `);
    
    const result = stmt.run(data);
    db.close();
    return { id: result.lastInsertRowid, ...data };
  }

  static findAll() {
    const db = this.getDb();
    const stmt = db.prepare('SELECT * FROM quotes ORDER BY created_at DESC');
    const quotes = stmt.all();
    db.close();
    return quotes.map(quote => ({
      ...quote,
      items: JSON.parse(quote.items || '[]')
    }));
  }

  static findById(id) {
    const db = this.getDb();
    const stmt = db.prepare('SELECT * FROM quotes WHERE id = ?');
    const quote = stmt.get(id);
    db.close();
    if (!quote) return null;
    return {
      ...quote,
      items: JSON.parse(quote.items || '[]')
    };
  }

  static update(id, data) {
    const db = this.getDb();
    const stmt = db.prepare(`
      UPDATE quotes
      SET customer_name = ?,
          customer_email = ?,
          customer_phone = ?,
          description = ?,
          items = ?,
          total_amount = ?,
          status = ?
      WHERE id = ?
    `);

    stmt.run(
      data.customer_name,
      data.customer_email,
      data.customer_phone,
      data.description,
      JSON.stringify(data.items || []),
      data.total_amount,
      data.status,
      id
    );
    db.close();
    return { id, ...data };
  }

  static delete(id) {
    const db = this.getDb();
    const stmt = db.prepare('DELETE FROM quotes WHERE id = ?');
    const result = stmt.run(id);
    db.close();
    return result;
  }
}

module.exports = Quote;
