const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

let db;

// Initialize database
function getDb() {
  if (!db) {
    try {
      // Create data directory if it doesn't exist
      const dataDir = path.join(process.cwd(), 'data');
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      // Check directory permissions
      try {
        fs.accessSync(dataDir, fs.constants.R_OK | fs.constants.W_OK);
        console.log('[DB] Directory permissions OK');
      } catch (error) {
        console.error('[DB] Directory permission error:', error);
        throw error;
      }

      const dbPath = path.join(dataDir, 'estimates.db');
      console.log('[DB] Database path:', dbPath);

      // If database doesn't exist in data dir but exists in root, copy it
      if (!fs.existsSync(dbPath) && fs.existsSync('estimates.db')) {
        console.log('[DB] Copying existing database from root to data directory');
        fs.copyFileSync('estimates.db', dbPath);
      }

      db = new Database(dbPath, { 
        verbose: console.log,
        fileMustExist: false
      });

      // Enable foreign keys
      db.pragma('foreign_keys = ON');
      
      // Create tables if they don't exist
      db.exec(`
        CREATE TABLE IF NOT EXISTS estimates (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          date TEXT NOT NULL,
          number TEXT UNIQUE NOT NULL,
          po TEXT,
          salesRep TEXT NOT NULL,
          billToAddress TEXT,
          workShipAddress TEXT,
          scopeOfWork TEXT,
          exclusions TEXT,
          subtotal REAL DEFAULT 0,
          salesTax REAL DEFAULT 0,
          total REAL DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS line_items (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          estimateId INTEGER NOT NULL,
          quantity REAL DEFAULT 0,
          description TEXT,
          cost REAL DEFAULT 0,
          price REAL DEFAULT 0,
          total REAL DEFAULT 0,
          FOREIGN KEY (estimateId) REFERENCES estimates(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_estimates_number ON estimates(number);
        CREATE INDEX IF NOT EXISTS idx_estimates_date ON estimates(date);
        CREATE INDEX IF NOT EXISTS idx_line_items_estimate_id ON line_items(estimateId);
      `);

      // Verify tables exist
      const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
      console.log('[DB] Existing tables:', tables.map(t => t.name));
    } catch (error) {
      console.error('[DB] Failed to initialize database:', error);
      console.error('[DB] Error stack:', error.stack);
      throw error;
    }
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
      
      // Start a transaction
      return db.transaction((estimate, items) => {
        // Insert estimate
        const stmt = db.prepare(`
          INSERT INTO estimates (
            date, number, po, salesRep, billToAddress, workShipAddress,
            scopeOfWork, exclusions, subtotal, salesTax, total
          ) VALUES (
            @date, @number, @po, @salesRep, @billToAddress, @workShipAddress,
            @scopeOfWork, @exclusions, @subtotal, @salesTax, @total
          )
        `);
        
        const result = stmt.run(estimate);
        const estimateId = result.lastInsertRowid;
        console.log('[DB] Created estimate with id:', estimateId);
        
        // Insert line items
        if (Array.isArray(items)) {
          const insertItem = db.prepare(`
            INSERT INTO line_items (
              estimateId, quantity, description, cost, price, total
            ) VALUES (
              @estimateId, @quantity, @description, @cost, @price, @total
            )
          `);
          
          for (const item of items) {
            const itemData = {
              estimateId,
              quantity: Number(item.quantity) || 0,
              description: item.description || '',
              cost: Number(item.cost) || 0,
              price: Number(item.price) || 0,
              total: Number(item.total) || 0
            };
            insertItem.run(itemData);
          }
          console.log('[DB] Added', items.length, 'items to estimate');
        }
        
        return estimateId;
      })(estimateData, rows);
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
      
      return db.transaction((id, estimate, items) => {
        // Update estimate
        const stmt = db.prepare(`
          UPDATE estimates SET
            date = @date,
            number = @number,
            po = @po,
            salesRep = @salesRep,
            billToAddress = @billToAddress,
            workShipAddress = @workShipAddress,
            scopeOfWork = @scopeOfWork,
            exclusions = @exclusions,
            subtotal = @subtotal,
            salesTax = @salesTax,
            total = @total
          WHERE id = @id
        `);
        
        const result = stmt.run({
          ...estimate,
          id: Number(id),
          subtotal: Number(estimate.subtotal) || 0,
          salesTax: Number(estimate.salesTax) || 0,
          total: Number(estimate.total) || 0
        });
        
        if (result.changes === 0) {
          throw new Error(`Estimate with ID ${id} not found`);
        }
        
        // Replace line items
        db.prepare('DELETE FROM line_items WHERE estimateId = ?').run(id);
        
        if (Array.isArray(items)) {
          const insertItem = db.prepare(`
            INSERT INTO line_items (
              estimateId, quantity, description, cost, price, total
            ) VALUES (
              @estimateId, @quantity, @description, @cost, @price, @total
            )
          `);
          
          for (const item of items) {
            const itemData = {
              estimateId: Number(id),
              quantity: Number(item.quantity) || 0,
              description: item.description || '',
              cost: Number(item.cost) || 0,
              price: Number(item.price) || 0,
              total: Number(item.total) || 0
            };
            insertItem.run(itemData);
          }
          console.log('[DB] Updated', items.length, 'items for estimate');
        }
        
        return id;
      })(id, estimateData, rows);
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
      
      // Line items will be deleted automatically due to ON DELETE CASCADE
      const result = db.prepare('DELETE FROM estimates WHERE id = ?').run(id);
      console.log('[DB] Delete result:', result);
      
      return result;
    } catch (error) {
      console.error('[DB] Error deleting estimate:', error);
      console.error('[DB] Error stack:', error.stack);
      throw error;
    }
  }
};

module.exports = dbOperations;
