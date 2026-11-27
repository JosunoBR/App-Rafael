const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const folder = fs.mkdtempSync(path.join(os.tmpdir(),'mega12-cash-reference-'));
fs.copyFileSync(path.resolve(__dirname,'../data/mega12.db'),path.join(folder,'test.db'));
fs.copyFileSync(path.resolve(__dirname,'../data/cash-balance-import.json'),path.join(folder,'cash-balance-import.json'));
process.env.DB_DIR = folder;
process.env.DB_FILENAME = 'test.db';

(async () => {
  const report = JSON.parse(fs.readFileSync(path.join(folder,'cash-balance-import.json'),'utf8'));
  const SQL = await require('sql.js')();
  const beforeDb = new SQL.Database(fs.readFileSync(path.join(folder,'test.db')));
  const originalClosings = beforeDb.exec('SELECT * FROM store_daily_closings ORDER BY id')[0]?.values;
  const originalEntries = beforeDb.exec('SELECT * FROM financial_entries ORDER BY id')[0]?.values;
  beforeDb.close();
  const database = require('../src/config/database');
  const db = await database.getDatabase();
  const {ensureStoreCashReferences} = require('../src/migrations/storeCashReferences');
  ensureStoreCashReferences(db,path.join(folder,'cash-balance-import.json'));
  const references = await database.queryAll('SELECT * FROM store_cash_references WHERE effectiveDate=?',[report.effectiveDate]);
  assert.equal(references.length,20);
  assert.equal(references.reduce((sum,row)=>sum+row.amountCents,0),27038755);
  assert.deepEqual(db.exec('SELECT * FROM store_daily_closings ORDER BY id')[0]?.values,originalClosings);
  assert.deepEqual(db.exec('SELECT * FROM financial_entries ORDER BY id')[0]?.values,originalEntries);
  const {balanceAtDateSql} = require('../src/services/storeCashBalance.service');
  for (const row of report.balances) {
    const balance = await database.queryOne(`SELECT ${balanceAtDateSql('s.id',"'2026-11-26'")} AS amount FROM stores s WHERE s.id=?`,[row.storeId]);
    assert.equal(balance.amount,row.amountCents,row.storeId);
  }
  const previous = await database.queryOne(`SELECT ${balanceAtDateSql("'nova_russia'","'2026-11-25'")} AS amount`);
  assert.equal(previous.amount,741500,'A referência de 26/11 não pode alterar o saldo de 25/11.');
  const next = await database.queryOne(`SELECT ${balanceAtDateSql("'nova_russia'","'2026-11-27'",false)} AS amount`);
  assert.equal(next.amount,1749400,'O saldo anterior de 27/11 deve ser exatamente a referência de 26/11.');
  await database.execute("INSERT INTO stores(id,name,shortName,cluster,defaultWeight,active) VALUES('reference_test','Referência teste','Teste','A',1,1)");
  await database.execute("INSERT INTO store_cash_references VALUES('reference_test','2026-11-26',10000,'Teste',?)",[new Date().toISOString()]);
  for (const [date,status,cash] of [['2026-11-25','aprovado',99900],['2026-11-27','aprovado',5000],['2026-11-28','devolvido',7000]]) {
    await database.execute('INSERT INTO store_daily_closings(id,storeId,closingDate,status,salesCents,cashCents,createdAt,updatedAt) VALUES(?,?,?,?,?,?,?,?)', [date,'reference_test',date,status,cash,cash,new Date().toISOString(),new Date().toISOString()]);
  }
  const testBalance = await database.queryOne(`SELECT ${balanceAtDateSql("'reference_test'","'2026-11-30'")} AS amount`);
  assert.equal(testBalance.amount,15000,'A referência substitui o acumulado anterior, soma movimentos novos uma vez e ignora devolvidos.');
  const express = require('express'),jwt = require('jsonwebtoken'),config=require('../src/config/environment');
  const app=express();app.use('/closings',require('../src/routes/storeClosings.routes'));
  const server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));
  try {
    const headers={Authorization:'Bearer '+jwt.sign({id:'usr_root'},config.JWT_SECRET,{expiresIn:'2m'})};
    const response=await fetch(`http://127.0.0.1:${server.address().port}/closings/cash-balances?month=2026-11`,{headers});
    assert.equal(response.status,200);const rows=await response.json();
    assert.equal(rows.find(row=>row.storeId==='reference_test').balanceCents,15000);
  } finally {await new Promise(resolve=>server.close(resolve));}
  console.log('Referência de caixa: 20 unidades, R$ 270.387,55 em 26/11, importação idempotente, histórico preservado, movimentos posteriores sem duplicação e API verificados em cópia isolada.');
})().catch(error=>{console.error(error);process.exitCode=1;});
