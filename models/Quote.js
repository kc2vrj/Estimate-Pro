const db = require('../lib/db');

class Quote {
  static initialize() {
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
  }

  static create(data) {
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
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      data.customer_name,
      data.customer_email,
      data.customer_phone,
      data.description,
      JSON.stringify(data.items),
      data.total_amount,
      data.status,
      data.user_id
    );

    return { id: result.lastInsertRowid, ...data };
  }

  static findAll() {
    const stmt = db.prepare('SELECT * FROM quotes ORDER BY created_at DESC');
    const quotes = stmt.all();
    return quotes.map(quote => ({
      ...quote,
      items: JSON.parse(quote.items || '[]')
    }));
  }

  static findById(id) {
    const stmt = db.prepare('SELECT * FROM quotes WHERE id = ?');
    const quote = stmt.get(id);
    if (!quote) return null;
    return {
      ...quote,
      items: JSON.parse(quote.items || '[]')
    };
  }

  static update(id, data) {
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
      JSON.stringify(data.items),
      data.total_amount,
      data.status,
      id
    );

    return { id, ...data };
  }

  static delete(id) {
    const stmt = db.prepare('DELETE FROM quotes WHERE id = ?');
    return stmt.run(id);
  }
}

module.exports = Quote;
