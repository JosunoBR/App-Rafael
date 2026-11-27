const fs = require('node:fs');

function ensureStoreCashReferences(db, importPath) {
  db.run(`CREATE TABLE IF NOT EXISTS store_cash_references (
    storeId TEXT NOT NULL REFERENCES stores(id), effectiveDate TEXT NOT NULL,
    amountCents INTEGER NOT NULL CHECK(amountCents >= 0), source TEXT NOT NULL,
    recordedAt TEXT NOT NULL, PRIMARY KEY(storeId,effectiveDate)
  );`);
  if (!importPath || !fs.existsSync(importPath)) return;
  const report = JSON.parse(fs.readFileSync(importPath, 'utf8'));
  if (!/^\d{4}-\d{2}-\d{2}$/.test(report.effectiveDate) || !report.source || !Array.isArray(report.balances)
    || new Set(report.balances.map(row => row.storeId)).size !== report.balances.length
    || report.balances.some(row => typeof row.storeId !== 'string' || !Number.isSafeInteger(row.amountCents) || row.amountCents < 0)
    || report.balances.reduce((sum,row) => sum + row.amountCents, 0) !== report.totalCents) {
    throw new Error('Relatório de saldos de caixa inválido.');
  }
  db.run('BEGIN TRANSACTION');
  try {
    for (const row of report.balances) {
      const existing = db.exec('SELECT amountCents,source FROM store_cash_references WHERE storeId=? AND effectiveDate=?',[row.storeId,report.effectiveDate])[0]?.values[0];
      if (existing && (existing[0] !== row.amountCents || existing[1] !== report.source)) throw new Error('Já existe um saldo diferente para a unidade e data do relatório.');
      db.run('INSERT OR IGNORE INTO store_cash_references(storeId,effectiveDate,amountCents,source,recordedAt) VALUES(?,?,?,?,?)', [row.storeId,report.effectiveDate,row.amountCents,report.source,new Date().toISOString()]);
    }
    db.run('COMMIT');
  } catch (error) { db.run('ROLLBACK'); throw error; }
}

module.exports = { ensureStoreCashReferences };
