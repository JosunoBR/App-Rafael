function ensureGoalsSchema(db) {
  db.run(`
    CREATE TABLE IF NOT EXISTS goal_imports (
      id TEXT PRIMARY KEY, filename TEXT NOT NULL, importedAt TEXT NOT NULL, importedBy TEXT,
      yearsJson TEXT NOT NULL, active INTEGER NOT NULL DEFAULT 0 CHECK(active IN (0,1))
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_goal_active_import ON goal_imports(active) WHERE active = 1;
    CREATE TABLE IF NOT EXISTS goal_source_sheets (
      importId TEXT NOT NULL REFERENCES goal_imports(id), sheetName TEXT NOT NULL, rowsJson TEXT NOT NULL,
      PRIMARY KEY(importId, sheetName)
    );
    CREATE TABLE IF NOT EXISTS goal_store_links (
      importId TEXT NOT NULL REFERENCES goal_imports(id), sourceKey TEXT NOT NULL, sourceName TEXT NOT NULL,
      storeId TEXT REFERENCES stores(id) ON DELETE SET NULL, profitSheet TEXT, costName TEXT NOT NULL,
      PRIMARY KEY(importId, sourceKey), UNIQUE(importId, storeId)
    );
    CREATE TABLE IF NOT EXISTS goal_sales_history (
      importId TEXT NOT NULL, sourceKey TEXT NOT NULL, month INTEGER NOT NULL CHECK(month BETWEEN 1 AND 12),
      year INTEGER NOT NULL CHECK(year BETWEEN 1900 AND 2100), amount REAL, sourceRow INTEGER NOT NULL,
      PRIMARY KEY(importId, sourceKey, month, year),
      FOREIGN KEY(importId, sourceKey) REFERENCES goal_store_links(importId, sourceKey)
    );
    CREATE TABLE IF NOT EXISTS goal_monthly_baselines (
      importId TEXT NOT NULL, sourceKey TEXT NOT NULL, month INTEGER NOT NULL CHECK(month BETWEEN 1 AND 12),
      sourceRow INTEGER NOT NULL, breakEven REAL, spreadsheetGoal REAL, spreadsheetSuperGoal REAL,
      commission REAL, superCommission REAL,
      PRIMARY KEY(importId, sourceKey, month),
      FOREIGN KEY(importId, sourceKey) REFERENCES goal_store_links(importId, sourceKey)
    );
    CREATE TABLE IF NOT EXISTS goal_profit_history (
      importId TEXT NOT NULL REFERENCES goal_imports(id), sheetName TEXT NOT NULL,
      month INTEGER NOT NULL CHECK(month BETWEEN 1 AND 12), year INTEGER NOT NULL CHECK(year BETWEEN 1900 AND 2100),
      amount REAL, salesAmount REAL, sourceRow INTEGER NOT NULL,
      PRIMARY KEY(importId, sheetName, month, year)
    );
    CREATE TABLE IF NOT EXISTS goal_cost_centers (
      importId TEXT NOT NULL REFERENCES goal_imports(id), name TEXT NOT NULL, sourceRow INTEGER NOT NULL, reportedTotal REAL,
      PRIMARY KEY(importId, name)
    );
    CREATE TABLE IF NOT EXISTS goal_cost_items (
      importId TEXT NOT NULL, costName TEXT NOT NULL, itemName TEXT NOT NULL, amount REAL,
      PRIMARY KEY(importId, costName, itemName),
      FOREIGN KEY(importId, costName) REFERENCES goal_cost_centers(importId, name)
    );
    CREATE TABLE IF NOT EXISTS goal_monthly_totals (
      importId TEXT NOT NULL REFERENCES goal_imports(id), month INTEGER NOT NULL CHECK(month BETWEEN 1 AND 12),
      year INTEGER NOT NULL, amount REAL, sourceRow INTEGER NOT NULL, PRIMARY KEY(importId, month, year)
    );
    CREATE TABLE IF NOT EXISTS store_goals (
      storeId TEXT NOT NULL REFERENCES stores(id), year INTEGER NOT NULL CHECK(year BETWEEN 1900 AND 2100),
      month INTEGER NOT NULL CHECK(month BETWEEN 1 AND 12), amountCents INTEGER CHECK(amountCents >= 0),
      version INTEGER NOT NULL DEFAULT 1, updatedBy TEXT NOT NULL, updatedAt TEXT NOT NULL,
      PRIMARY KEY(storeId, year, month)
    );
    CREATE TABLE IF NOT EXISTS store_goal_audit (
      id TEXT PRIMARY KEY, action TEXT NOT NULL, actorId TEXT NOT NULL, storeId TEXT REFERENCES stores(id),
      year INTEGER, month INTEGER, beforeJson TEXT, afterJson TEXT, createdAt TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_goal_links_store ON goal_store_links(storeId);
    CREATE INDEX IF NOT EXISTS idx_store_goals_period ON store_goals(year, month);
  `);
}
module.exports = { ensureGoalsSchema };
