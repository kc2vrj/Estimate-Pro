const sqlite = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

let db = null;
const SCHEMA_VERSION = 2; // Increment this when schema changes

async function migrateData(oldDb, newDb) {
  console.log('[DB] Starting data migration...');
  
  try {
    // Begin transaction in new database
    newDb.transaction(() => {
      // Migrate estimates
      const estimates = oldDb.prepare('SELECT * FROM estimates').all() || [];
      console.log(`[DB] Migrating ${estimates.length} estimates`);
      
      if (estimates.length > 0) {
        const insertEstimate = newDb.prepare(`
          INSERT INTO estimates (
            id, number, date, po, customer_name, customer_email, customer_phone,
            salesRep, billToAddress, workShipAddress, scopeOfWork, exclusions,
            salesTax, total_amount, created_at, updated_at
          ) VALUES (
            @id, @number, @date, @po, @customer_name, @customer_email, @customer_phone,
            @salesRep, @billToAddress, @workShipAddress, @scopeOfWork, @exclusions,
            @salesTax, @total_amount, @created_at, @updated_at
          )
        `);

        for (const estimate of estimates) {
          insertEstimate.run({
            ...estimate,
            customer_name: estimate.customer_name || '',
            customer_email: estimate.customer_email || '',
            customer_phone: estimate.customer_phone || '',
            po: estimate.po || '',
            exclusions: estimate.exclusions || 'M-F 8-5\nAny item not on quote',
            salesTax: estimate.salesTax || 0,
            total_amount: estimate.total_amount || estimate.total || 0
          });
        }

        // Migrate line items
        const lineItems = oldDb.prepare('SELECT * FROM line_items').all() || [];
        console.log(`[DB] Migrating ${lineItems.length} line items`);
        
        if (lineItems.length > 0) {
          const insertLineItem = newDb.prepare(`
            INSERT INTO line_items (
              id, estimateId, quantity, description, price, total
            ) VALUES (
              @id, @estimateId, @quantity, @description, @price, @total
            )
          `);

          for (const item of lineItems) {
            insertLineItem.run({
              ...item,
              price: item.price || 0,
              total: item.total || (item.price * item.quantity) || 0
            });
          }
        }
      }
    })();
    console.log('[DB] Data migration completed successfully');
  } catch (error) {
    console.error('[DB] Error during migration:', error);
    throw error;
  }
}

async function closeDb() {
  if (db) {
    try {
      await db.close();
      db = null;
      console.log('[DB] Database connection closed');
    } catch (error) {
      console.error('[DB] Error closing database:', error);
    }
  }
}

async function getDb() {
  try {
    if (db) return db;

    const dbPath = path.join(process.cwd(), 'data', 'estimates.db');
    const dbDir = path.dirname(dbPath);

    // Ensure directory exists
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    console.log('[DB] Database path:', dbPath);

    // Create new database if it doesn't exist
    if (!fs.existsSync(dbPath)) {
      console.log('[DB] Creating new database');
      db = new sqlite(dbPath, { verbose: console.log });
      db.pragma('journal_mode = WAL');
      db.pragma('foreign_keys = ON');
      await initializeSchema(db);
      return db;
    }

    // Open existing database
    db = new sqlite(dbPath, { verbose: console.log });
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');

    // Check schema version
    const version = db.prepare('PRAGMA user_version').get()?.user_version || 0;
    if (version < SCHEMA_VERSION) {
      console.log('[DB] Updating schema from version', version, 'to', SCHEMA_VERSION);
      await updateSchema(db, version);
    }

    return db;
  } catch (error) {
    console.error('[DB] Error in getDb:', error);
    throw error;
  }
}

async function initializeSchema(db) {
  // Create tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS estimates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      number TEXT UNIQUE NOT NULL,
      date TEXT NOT NULL,
      po TEXT,
      customer_name TEXT,
      customer_email TEXT,
      customer_phone TEXT,
      salesRep TEXT NOT NULL,
      billToAddress TEXT NOT NULL,
      workShipAddress TEXT NOT NULL,
      scopeOfWork TEXT NOT NULL,
      exclusions TEXT,
      salesTax REAL DEFAULT 0,
      total_amount REAL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS line_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      estimateId INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      description TEXT NOT NULL,
      price REAL NOT NULL,
      total REAL NOT NULL,
      FOREIGN KEY (estimateId) REFERENCES estimates(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_estimates_number ON estimates(number);
    CREATE INDEX IF NOT EXISTS idx_line_items_estimateId ON line_items(estimateId);
  `);

  // Set initial schema version
  db.exec(`PRAGMA user_version = ${SCHEMA_VERSION}`);
}

async function updateSchema(db, currentVersion) {
  // Begin transaction for schema update
  db.transaction(() => {
    // Backup existing data
    const estimates = db.prepare('SELECT * FROM estimates').all();
    const lineItems = db.prepare('SELECT * FROM line_items').all();

    // Drop existing tables
    db.exec(`
      DROP TABLE IF EXISTS line_items;
      DROP TABLE IF EXISTS estimates;
    `);

    // Create new schema
    initializeSchema(db);

    // Restore data
    if (estimates && estimates.length > 0) {
      const insertEstimate = db.prepare(`
        INSERT INTO estimates (
          id, number, date, po, customer_name, customer_email, customer_phone,
          salesRep, billToAddress, workShipAddress, scopeOfWork, exclusions,
          salesTax, total_amount, created_at, updated_at
        ) VALUES (
          @id, @number, @date, @po, @customer_name, @customer_email, @customer_phone,
          @salesRep, @billToAddress, @workShipAddress, @scopeOfWork, @exclusions,
          @salesTax, @total_amount, @created_at, @updated_at
        )
      `);

      for (const estimate of estimates) {
        insertEstimate.run({
          ...estimate,
          customer_name: estimate.customer_name || '',
          customer_email: estimate.customer_email || '',
          customer_phone: estimate.customer_phone || '',
          po: estimate.po || '',
          exclusions: estimate.exclusions || 'M-F 8-5\nAny item not on quote',
          salesTax: estimate.salesTax || 0,
          total_amount: estimate.total_amount || estimate.total || 0
        });
      }
    }

    if (lineItems && lineItems.length > 0) {
      const insertLineItem = db.prepare(`
        INSERT INTO line_items (
          id, estimateId, quantity, description, price, total
        ) VALUES (
          @id, @estimateId, @quantity, @description, @price, @total
        )
      `);

      for (const item of lineItems) {
        insertLineItem.run({
          ...item,
          price: item.price || 0,
          total: item.total || (item.price * item.quantity) || 0
        });
      }
    }
  })();
}

// Helper functions for database operations
const dbOperations = {
  async saveEstimate(estimate) {
    const db = await getDb();
    try {
      return db.transaction(() => {
        // Insert estimate
        const result = db.prepare(`
          INSERT INTO estimates (
            number, date, po, customer_name, customer_email, customer_phone,
            salesRep, billToAddress, workShipAddress, scopeOfWork,
            exclusions, salesTax, total_amount
          ) VALUES (
            @number, @date, @po, @customer_name, @customer_email, @customer_phone,
            @salesRep, @billToAddress, @workShipAddress, @scopeOfWork,
            @exclusions, @salesTax, @total_amount
          )
        `).run({
          number: estimate.number,
          date: estimate.date,
          po: estimate.po || '',
          customer_name: estimate.customer_name || '',
          customer_email: estimate.customer_email || '',
          customer_phone: estimate.customer_phone || '',
          salesRep: estimate.salesRep,
          billToAddress: estimate.billToAddress,
          workShipAddress: estimate.workShipAddress,
          scopeOfWork: estimate.scopeOfWork,
          exclusions: estimate.exclusions || '',
          salesTax: estimate.salesTax || 0,
          total_amount: estimate.total_amount || 0
        });

        const estimateId = result.lastInsertRowid;

        // Insert line items
        if (estimate.items && estimate.items.length > 0) {
          const insertItem = db.prepare(`
            INSERT INTO line_items (
              estimateId, quantity, description, price, total
            ) VALUES (?, ?, ?, ?, ?)
          `);

          for (const item of estimate.items) {
            insertItem.run(
              estimateId,
              item.quantity,
              item.description,
              item.price,
              item.total
            );
          }
        }

        return estimateId;
      })();
    } catch (error) {
      console.error('[DB] Error saving estimate:', error);
      throw error;
    }
  },

  async getEstimate(id) {
    const db = await getDb();
    try {
      const estimate = db.prepare('SELECT * FROM estimates WHERE id = ?').get(id);
      if (!estimate) return null;

      const items = db.prepare('SELECT * FROM line_items WHERE estimateId = ?').all(id);
      return { ...estimate, items };
    } catch (error) {
      console.error('[DB] Error getting estimate:', error);
      throw error;
    }
  },

  async getAllEstimates() {
    const db = await getDb();
    try {
      return db.prepare(`
        SELECT * FROM estimates 
        ORDER BY date DESC, number DESC
      `).all();
    } catch (error) {
      console.error('[DB] Error getting all estimates:', error);
      throw error;
    }
  },

  async updateEstimate(id, estimate) {
    const db = await getDb();
    try {
      return db.transaction(() => {
        // Update estimate
        const result = db.prepare(`
          UPDATE estimates SET
            number = @number,
            date = @date,
            po = @po,
            customer_name = @customer_name,
            customer_email = @customer_email,
            customer_phone = @customer_phone,
            salesRep = @salesRep,
            billToAddress = @billToAddress,
            workShipAddress = @workShipAddress,
            scopeOfWork = @scopeOfWork,
            exclusions = @exclusions,
            salesTax = @salesTax,
            total_amount = @total_amount,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = @id
        `).run({
          id,
          number: estimate.number,
          date: estimate.date,
          po: estimate.po || '',
          customer_name: estimate.customer_name || '',
          customer_email: estimate.customer_email || '',
          customer_phone: estimate.customer_phone || '',
          salesRep: estimate.salesRep,
          billToAddress: estimate.billToAddress,
          workShipAddress: estimate.workShipAddress,
          scopeOfWork: estimate.scopeOfWork,
          exclusions: estimate.exclusions || '',
          salesTax: estimate.salesTax || 0,
          total_amount: estimate.total_amount || 0
        });

        // Delete existing line items
        db.prepare('DELETE FROM line_items WHERE estimateId = ?').run(id);

        // Insert new line items
        if (estimate.items && estimate.items.length > 0) {
          const insertItem = db.prepare(`
            INSERT INTO line_items (
              estimateId, quantity, description, price, total
            ) VALUES (?, ?, ?, ?, ?)
          `);

          for (const item of estimate.items) {
            insertItem.run(
              id,
              item.quantity,
              item.description,
              item.price,
              item.total
            );
          }
        }

        return result.changes > 0;
      })();
    } catch (error) {
      console.error('[DB] Error updating estimate:', error);
      throw error;
    }
  },

  async deleteEstimate(id) {
    const db = await getDb();
    try {
      return db.transaction(() => {
        // Delete line items first (should cascade, but just to be safe)
        db.prepare('DELETE FROM line_items WHERE estimateId = ?').run(id);
        
        // Delete estimate
        const result = db.prepare('DELETE FROM estimates WHERE id = ?').run(id);
        
        return result.changes > 0;
      })();
    } catch (error) {
      console.error('[DB] Error deleting estimate:', error);
      throw error;
    }
  },

  async getLatestEstimateNumber(year) {
    const db = await getDb();
    try {
      // Find the highest estimate number for the given year
      const pattern = `${year}-%`;
      const result = db.prepare(
        'SELECT number FROM estimates WHERE number LIKE ? ORDER BY number DESC LIMIT 1'
      ).get(pattern);

      if (!result) {
        return `${year}-001`;
      }

      // Extract the numeric portion and increment
      const currentNumber = parseInt(result.number.split('-')[1]);
      const nextNumber = (currentNumber + 1).toString().padStart(3, '0');
      return `${year}-${nextNumber}`;
    } catch (error) {
      console.error('[DB] Error getting latest estimate number:', error);
      throw error;
    }
  }
};

// Ensure database is closed when the process exits
process.on('exit', async () => {
  await closeDb();
});

process.on('SIGINT', async () => {
  await closeDb();
  process.exit();
});

module.exports = dbOperations;
