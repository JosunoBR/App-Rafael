const assert = require('node:assert/strict');
const { ensureStoreExpenseTypes } = require('../src/migrations/storeExpenseTypes');

(async () => {
  const SQL = await require('sql.js')();
  for (const legacy of [false, true]) {
    const db = new SQL.Database();
    try {
      db.run(`PRAGMA foreign_keys=ON;
        CREATE TABLE store_daily_closings(id TEXT PRIMARY KEY);
        INSERT INTO store_daily_closings VALUES('closing');
        CREATE TABLE store_daily_expenses(
          id TEXT PRIMARY KEY,closingId TEXT NOT NULL REFERENCES store_daily_closings(id),
          description TEXT NOT NULL,amountCents INTEGER NOT NULL CHECK(amountCents>0),financialEntryId TEXT UNIQUE
          ${legacy ? ",movementType TEXT NOT NULL DEFAULT 'despesa' CHECK(movementType IN ('despesa','deposito'))" : ''}
        );
        CREATE INDEX idx_expense_test ON store_daily_expenses(closingId);
        INSERT INTO store_daily_expenses(id,closingId,description,amountCents,financialEntryId) VALUES('expense','closing','Despesa existente',5000,'entry');`);
      const before = db.exec('SELECT id,closingId,description,amountCents,financialEntryId FROM store_daily_expenses')[0].values;
      ensureStoreExpenseTypes(db);
      ensureStoreExpenseTypes(db);
      assert.deepEqual(db.exec('SELECT id,closingId,description,amountCents,financialEntryId FROM store_daily_expenses')[0].values, before);
      assert.equal(db.exec('SELECT movementType FROM store_daily_expenses')[0].values[0][0], 'despesa');
      assert.equal(db.exec("SELECT COUNT(*) FROM sqlite_master WHERE name='idx_expense_test'")[0].values[0][0], 1);
      db.run("INSERT INTO store_daily_expenses VALUES('vale','closing','Vale funcionário',10000,NULL,'vale_funcionario')");
      assert.throws(() => db.run("INSERT INTO store_daily_expenses VALUES('invalid','closing','Inválido',100,NULL,'outro')"));
      assert.throws(() => db.run("INSERT INTO store_daily_expenses VALUES('orphan','missing','Inválido',100,NULL,'vale_funcionario')"));
      assert.equal(db.exec('PRAGMA foreign_key_check').length, 0);
    } finally { db.close(); }
  }
  console.log('Tipos de saída: migração preserva registros, vínculos e índices, aceita vale funcionário, mantém restrições e pode ser repetida.');
})().catch(error => { console.error(error); process.exitCode = 1; });
