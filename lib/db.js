const sqlite = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

let db = null;
const SCHEMA_VERSION = 2; // Increment this when schema changes

function migrateData(oldDb, newDb) {
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

function getDb() {
  if (db) return db;

  const dbPath = path.join(process.cwd(), 'data', 'estimates.db');
  const dbDir = path.dirname(dbPath);

  // Ensure directory exists
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  console.log('[DB] Database path:', dbPath);

  // Check if we need to recreate the database
  let shouldRecreate = false;
  let oldDb = null;
  
  if (fs.existsSync(dbPath)) {
    try {
      oldDb = new sqlite(dbPath);
      const version = oldDb.prepare('PRAGMA user_version').get()?.user_version || 0;
      shouldRecreate = version < SCHEMA_VERSION;
      if (shouldRecreate) {
        console.log('[DB] Current schema version:', version, 'needs update to:', SCHEMA_VERSION);
      }
    } catch (error) {
      console.log('[DB] Error checking schema version:', error);
      shouldRecreate = true;
    }
  } else {
    shouldRecreate = true;
  }

  // Recreate database if needed
  if (shouldRecreate) {
    console.log('[DB] Recreating database with new schema');
    
    // Create backup of old database if it exists
    if (fs.existsSync(dbPath)) {
      const backupPath = dbPath + '.backup';
      fs.copyFileSync(dbPath, backupPath);
      console.log('[DB] Created backup at:', backupPath);
    }

    // Create new database
    if (oldDb) {
      oldDb.close();
    }

    // Delete existing database
    if (fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath);
    }

    // Create new database
    db = new sqlite(dbPath);
    
    // Enable WAL mode and foreign keys
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');

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
      CREATE INDEX IF NOT EXISTS idx_estimates_date ON estimates(date);
      CREATE INDEX IF NOT EXISTS idx_line_items_estimate_id ON line_items(estimateId);
    `);

    // Set schema version
    db.prepare('PRAGMA user_version = ?').run(SCHEMA_VERSION);

    // Migrate data from old database if it exists
    if (oldDb) {
      try {
        migrateData(oldDb, db);
      } catch (error) {
        console.error('[DB] Migration error:', error);
      } finally {
        oldDb.close();
      }
    }
  } else {
    db = new sqlite(dbPath);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
  }

  return db;
}

// Helper functions for database operations
const dbOperations = {
  saveEstimate: (estimate) => {
    const db = getDb();
    const { rows, ...estimateData } = estimate;
    
    try {
      console.log('[DB] Saving estimate:', estimateData);
      
      // Begin transaction
      const transaction = db.transaction(() => {
        // Insert estimate
        const stmt = db.prepare(`
          INSERT INTO estimates (
            date, number, po, customer_name, customer_email, customer_phone, salesRep, billToAddress, workShipAddress,
            scopeOfWork, exclusions, salesTax, total_amount
          ) VALUES (
            @date, @number, @po, @customer_name, @customer_email, @customer_phone, @salesRep, @billToAddress, @workShipAddress,
            @scopeOfWork, @exclusions, @salesTax, @total_amount
          )
        `);
        
        const result = stmt.run(estimateData);
        const estimateId = result.lastInsertRowid;
        console.log('[DB] Created estimate with id:', estimateId);
        
        // Insert line items
        if (Array.isArray(rows)) {
          const insertItem = db.prepare(`
            INSERT INTO line_items (
              estimateId, quantity, description, price, total
            ) VALUES (
              @estimateId, @quantity, @description, @price, @total
            )
          `);
          
          for (const item of rows) {
            const itemData = {
              estimateId,
              quantity: Number(item.quantity) || 0,
              description: item.description || '',
              price: Number(item.price) || 0,
              total: Number(item.total) || 0
            };
            insertItem.run(itemData);
          }
          console.log('[DB] Added', rows.length, 'items to estimate');
        }
        
        return estimateId;
      });

      // Run the transaction
      return transaction();
    } catch (error) {
      console.error('[DB] Error saving estimate:', error);
      console.error('[DB] Error stack:', error.stack);
      throw error;
    }
  },

  getEstimate: (id) => {
    try {
      console.log('[DB] Getting estimate:', id);
      const db = getDb();
      
      const estimate = db.prepare('SELECT * FROM estimates WHERE id = ?').get(id);
      if (estimate) {
        estimate.rows = db.prepare('SELECT * FROM line_items WHERE estimateId = ?').all(id);
      }
      
      return estimate;
    } catch (error) {
      console.error('[DB] Error getting estimate:', error);
      console.error('[DB] Error stack:', error.stack);
      throw error;
    }
  },

  getAllEstimates: () => {
    try {
      console.log('[DB] Getting all estimates');
      const db = getDb();
      
      const estimates = db.prepare('SELECT * FROM estimates ORDER BY date DESC, number DESC').all();
      for (const estimate of estimates) {
        estimate.rows = db.prepare('SELECT * FROM line_items WHERE estimateId = ?').all(estimate.id);
      }
      
      console.log('[DB] Found estimates:', estimates?.length);
      return estimates;
    } catch (error) {
      console.error('[DB] Error getting all estimates:', error);
      console.error('[DB] Error stack:', error.stack);
      throw error;
    }
  },

  updateEstimate: (id, estimate) => {
    const db = getDb();
    const { rows, ...estimateData } = estimate;
    
    try {
      console.log('[DB] Updating estimate:', id, estimateData);
      
      return db.transaction(() => {
        // Update estimate
        const stmt = db.prepare(`
          UPDATE estimates SET
            date = @date,
            number = @number,
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
            total_amount = @total_amount
          WHERE id = @id
        `);
        
        const result = stmt.run({
          ...estimate,
          id: Number(id),
          salesTax: Number(estimate.salesTax) || 0,
          total_amount: Number(estimate.total_amount) || 0
        });
        
        if (result.changes === 0) {
          throw new Error(`Estimate with ID ${id} not found`);
        }
        
        // Replace line items
        db.prepare('DELETE FROM line_items WHERE estimateId = ?').run(id);
        
        if (Array.isArray(rows)) {
          const insertItem = db.prepare(`
            INSERT INTO line_items (
              estimateId, quantity, description, price, total
            ) VALUES (
              @estimateId, @quantity, @description, @price, @total
            )
          `);
          
          for (const item of rows) {
            const itemData = {
              estimateId: Number(id),
              quantity: Number(item.quantity) || 0,
              description: item.description || '',
              price: Number(item.price) || 0,
              total: Number(item.total) || 0
            };
            insertItem.run(itemData);
          }
          console.log('[DB] Updated', rows.length, 'items for estimate');
        }
        
        return id;
      })();
    } catch (error) {
      console.error('[DB] Error updating estimate:', error);
      console.error('[DB] Error stack:', error.stack);
      throw error;
    }
  },

  deleteEstimate: (id) => {
    try {
      console.log('[DB] Deleting estimate:', id);
      const db = getDb();
      
      return db.transaction(() => {
        // First check if estimate exists
        const estimate = db.prepare('SELECT id FROM estimates WHERE id = ?').get(id);
        if (!estimate) {
          throw new Error('Estimate not found');
        }
        
        // Delete line items first (although ON DELETE CASCADE should handle this)
        db.prepare('DELETE FROM line_items WHERE estimateId = ?').run(id);
        
        // Then delete the estimate
        const result = db.prepare('DELETE FROM estimates WHERE id = ?').run(id);
        console.log('[DB] Delete result:', result);
        
        if (result.changes === 0) {
          throw new Error('Failed to delete estimate');
        }
        
        return result;
      })();
    } catch (error) {
      console.error('[DB] Error deleting estimate:', error);
      console.error('[DB] Error stack:', error.stack);
      throw error;
    }
  },

  getLatestEstimateNumber: (year) => {
    try {
      console.log('[DB] Getting latest estimate number for year:', year);
      const db = getDb();
      
      // First check if estimates table exists
      const tableExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='estimates'").get();
      console.log('[DB] Estimates table exists:', !!tableExists);
      
      if (!tableExists) {
        console.log('[DB] Creating estimates table...');
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
          )
        `);
      }
      
      const pattern = `${year}-%`;
      console.log('[DB] Searching for pattern:', pattern);
      
      // Get the latest estimate number for the given year
      const result = db.prepare(`
        SELECT number 
        FROM estimates 
        WHERE number LIKE ? 
        ORDER BY number DESC 
        LIMIT 1
      `).get(pattern);
      
      console.log('[DB] Query result:', result);
      console.log('[DB] Latest estimate number:', result?.number);
      
      return result?.number;
    } catch (error) {
      console.error('[DB] Error getting latest estimate number:', error);
      console.error('[DB] Error stack:', error.stack);
      throw error;
    }
  }
};

module.exports = dbOperations;
