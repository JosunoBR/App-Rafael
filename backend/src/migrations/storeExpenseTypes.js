function ensureStoreExpenseTypes(db) {
  const definition = db.exec("SELECT sql FROM sqlite_master WHERE type='table' AND name='store_daily_expenses'")[0].values[0][0];
  if (definition.includes("'vale_funcionario'")) return;
  const hasMovementType = db.exec('PRAGMA table_info(store_daily_expenses)')[0].values.some(column => column[1] === 'movementType');
  if (!hasMovementType) {
    db.run("ALTER TABLE store_daily_expenses ADD COLUMN movementType TEXT NOT NULL DEFAULT 'despesa' CHECK(movementType IN ('despesa','deposito','vale_funcionario'))");
    return;
  }
  const dependentObjects = db.exec("SELECT sql FROM sqlite_master WHERE tbl_name='store_daily_expenses' AND type IN ('index','trigger') AND sql IS NOT NULL")[0]?.values || [];
  db.run('BEGIN TRANSACTION');
  try {
    db.run(`CREATE TABLE store_daily_expenses_updated (
      id TEXT PRIMARY KEY,
      closingId TEXT NOT NULL REFERENCES store_daily_closings(id),
      description TEXT NOT NULL,
      amountCents INTEGER NOT NULL CHECK(amountCents > 0),
      financialEntryId TEXT UNIQUE,
      movementType TEXT NOT NULL DEFAULT 'despesa' CHECK(movementType IN ('despesa','deposito','vale_funcionario'))
    );
    INSERT INTO store_daily_expenses_updated SELECT id,closingId,description,amountCents,financialEntryId,movementType FROM store_daily_expenses;
    DROP TABLE store_daily_expenses;
    ALTER TABLE store_daily_expenses_updated RENAME TO store_daily_expenses;`);
    for (const [sql] of dependentObjects) db.run(sql);
    db.run('COMMIT');
  } catch (error) {
    db.run('ROLLBACK');
    throw error;
  }
}

module.exports = { ensureStoreExpenseTypes };
