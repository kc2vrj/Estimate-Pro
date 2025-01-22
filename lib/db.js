const Database = require('better-sqlite3');
const path = require('path');

let db;

// Initialize database
function getDb() {
  if (!db) {
    db = new Database(path.join(process.cwd(), 'estimates.db'), { verbose: console.log });
    
    // Create tables if they don't exist
    db.exec(`
      CREATE TABLE IF NOT EXISTS estimates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT,
        number TEXT,
        po TEXT,
        salesRep TEXT,
        billToAddress TEXT,
        workShipAddress TEXT,
        scopeOfWork TEXT,
        exclusions TEXT,
        subtotal REAL,
        salesTax REAL,
        total REAL,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS line_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        estimateId INTEGER,
        quantity REAL,
        description TEXT,
        cost REAL,
        price REAL,
        total REAL,
        FOREIGN KEY (estimateId) REFERENCES estimates(id)
      );
    `);
  }
  return db;
}

// Helper functions for database operations
const dbOperations = {
  saveEstimate: (estimate) => {
    const db = getDb();
    const { rows, ...estimateData } = estimate;
    
    try {
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
        }
        
        return estimateId;
      })(estimateData, rows);
    } catch (error) {
      console.error('Database error:', error);
      throw new Error(`Failed to save estimate: ${error.message}`);
    }
  },

  getEstimate: (id) => {
    const db = getDb();
    try {
      const estimate = db.prepare('SELECT * FROM estimates WHERE id = ?').get(id);
      if (!estimate) return null;
      
      const lineItems = db.prepare('SELECT * FROM line_items WHERE estimateId = ?').all(id);
      return {
        ...estimate,
        rows: lineItems,
        totals: {
          subtotal: estimate.subtotal,
          salesTax: estimate.salesTax,
          total: estimate.total
        }
      };
    } catch (error) {
      console.error('Database error:', error);
      throw new Error(`Failed to get estimate: ${error.message}`);
    }
  },

  getAllEstimates: () => {
    const db = getDb();
    try {
      return db.prepare('SELECT * FROM estimates ORDER BY createdAt DESC').all();
    } catch (error) {
      console.error('Database error:', error);
      throw new Error(`Failed to get estimates: ${error.message}`);
    }
  },

  updateEstimate: (id, estimate) => {
    const db = getDb();
    const { rows, ...estimateData } = estimate;
    
    try {
      // Start a transaction
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
          WHERE id = ?
        `);
        
        stmt.run(estimate, id);
        
        // Delete existing line items
        db.prepare('DELETE FROM line_items WHERE estimateId = ?').run(id);
        
        // Insert updated line items
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
              estimateId: id,
              quantity: Number(item.quantity) || 0,
              description: item.description || '',
              cost: Number(item.cost) || 0,
              price: Number(item.price) || 0,
              total: Number(item.total) || 0
            };
            insertItem.run(itemData);
          }
        }
        
        return id;
      })(id, estimateData, rows);
    } catch (error) {
      console.error('Database error:', error);
      throw new Error(`Failed to update estimate: ${error.message}`);
    }
  }
};

module.exports = dbOperations;
