const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
process.env.DB_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'mega12-holidays-'));
process.env.DB_FILENAME = 'test.db';
process.env.NODE_ENV = 'test';
const db = require('../src/config/database');
const express = require('express');
const jwt = require('jsonwebtoken');
const config = require('../src/config/environment');
const repository = require('../src/repositories/goalsRepository');

async function main() {
  for (const id of ['holiday_a','holiday_b']) {
    await db.execute('INSERT INTO stores(id,name,shortName,cluster,defaultWeight,active) VALUES(?,?,?,?,?,1)', [id,id === 'holiday_a' ? 'Castro' : 'Imbaú',id,'A',1]);
    await db.execute('INSERT INTO users(id,nome,email,senha,role,storeId,createdAt,updatedAt) VALUES(?,?,?,?,?,?,?,?)', [id, id, `${id}@example.test`, 'unused-test-password', 'unidade', id, new Date().toISOString(), new Date().toISOString()]);
  }
  await repository.importWorkbook(require('../src/data/goalsWorkbookSeed.json'), 'usr_root');
  const app = express(); app.use(require('cors')()); app.use(express.json());
  app.use('/holidays', require('../src/routes/holidays.routes'));
  app.use('/store-closings', require('../src/routes/storeClosings.routes'));
  app.use('/closings', require('../src/routes/storeClosings.routes'));
  app.use('/goals', require('../src/routes/goals.routes'));
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const call = async (actor, url, method = 'GET', body) => {
    const response = await fetch(`http://127.0.0.1:${server.address().port}${url}`, { method, headers: { Authorization: `Bearer ${jwt.sign({ id: actor }, config.JWT_SECRET, { expiresIn: '5m' })}`, 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
    return { status: response.status, data: await response.json() };
  };
  const close = (actor, data) => call(actor, '/holidays/requests', 'POST', { date: '2026-11-04', name: 'Feriado municipal', ...data });
  const review = (id, decision, note = '') => call('usr_root', `/holidays/${id}/review`, 'POST', { decision, note });
  try {
    const forged = await close('holiday_a', { storeId: 'holiday_b' }); assert.equal(forged.status, 403);
    assert.equal((await close('holiday_a', { date: '2026-02-30' })).status, 400);
    assert.equal((await call('holiday_a', '/holidays/global', 'POST', { date: '2026-11-03', name: 'Rede' })).status, 403);
    let request = await close('holiday_a'); assert.equal(request.status, 200, JSON.stringify(request)); const localId = request.data.id;
    assert.equal((await close('holiday_a')).status, 409);
    assert.equal((await repository.findWorkbook()).calendarClosures.length, 0, 'Pendente não altera calendário.');
    assert.equal((await call('holiday_b', '/holidays')).data.some(row => row.id === localId), false);
    assert.equal((await call('holiday_b', '/holidays?storeId=holiday_a')).status, 403);
    assert.equal((await call('holiday_a', `/holidays/${localId}/review`, 'POST', { decision: 'aprovado' })).status, 403);
    const decisions = await Promise.all([review(localId, 'aprovado'), review(localId, 'aprovado')]);
    assert.deepEqual(decisions.map(result => result.status).sort(), [200,409], 'Revisões concorrentes não podem duplicar aprovação.');
    assert.equal((await repository.findWorkbook()).calendarClosures[0].storeId, 'holiday_a');
    const payload = { vendaTotal: 100, meiosPagamento: { dinheiro: 100 }, despesas: [], memorando: '' };
    assert.equal((await call('holiday_a', '/closings/holiday_a/2026-11-04', 'PUT', payload)).status, 409);
    assert.equal((await call('holiday_b', '/closings/holiday_b/2026-11-04', 'PUT', payload)).status, 200, 'Feriado local não bloqueia outra unidade.');
    request = await close('holiday_a', { action: 'reabrir' }); assert.equal(request.status, 200);
    assert.equal((await repository.findWorkbook()).calendarClosures.length, 1, 'Pedido de reabertura não muda nada antes da aprovação.');
    assert.equal((await review(request.data.id, 'aprovado')).status, 200);
    assert.equal((await repository.findWorkbook()).calendarClosures.length, 0);
    const refused = await close('holiday_a', { date: '2026-11-05' });
    assert.equal((await review(refused.data.id, 'recusado')).status, 400, 'Recusa exige motivo.');
    assert.equal((await review(refused.data.id, 'recusado', 'Expediente normal confirmado')).status, 200);
    assert.equal((await repository.findWorkbook()).calendarClosures.length, 0);
    const global = await call('usr_root', '/holidays/global', 'POST', { date: '2026-11-03', name: 'Fechamento da rede' });
    assert.equal(global.status, 200, JSON.stringify(global));
    for (const actor of ['holiday_a','holiday_b']) assert.equal((await call(actor, '/holidays')).data.some(row => row.id === global.data.id), true);
    assert.equal((await close('holiday_a', { date: '2026-11-03', action: 'reabrir' })).status, 409, 'Unidade não pode reabrir feriado da rede.');
    await db.execute('INSERT INTO stores(id,name,shortName,cluster,defaultWeight,active) VALUES(?,?,?,?,?,1)', ['holiday_new','Nova unidade','Nova','A',1]);
    const newer = await require('../src/services/holidays.service').list({ storeId: 'holiday_new' });
    assert.ok(newer.some(row => row.id === global.data.id), 'Unidade cadastrada depois deve herdar feriados gerais.');
    assert.equal((await call('usr_root', '/holidays/global', 'POST', { date: '2026-11-03', name: 'Duplicado' })).status, 409);
    assert.equal((await call('usr_root', '/holidays/global', 'POST', { date: '2026-11-04', name: 'Conflito caixa enviado' })).status, 409);
    assert.equal((await review(global.data.id, 'cancelado')).status, 200);
    assert.equal((await repository.findWorkbook()).calendarClosures.length, 0);
    assert.ok((await db.queryOne('SELECT COUNT(*) AS n FROM store_holiday_audit')).n >= 8);
    assert.deepEqual(await db.queryAll('PRAGMA foreign_key_check'), []);
    if (process.env.GOALS_PLAYWRIGHT_PATH) {
      const closing = await call('holiday_a', '/closings/holiday_a/2026-11-25', 'PUT', { ...payload, vendaTotal: 1000, meiosPagamento: { dinheiro: 1000 } });
      assert.equal(closing.status, 200);
      assert.equal((await call('usr_root', `/closings/${closing.data.id}/review`, 'POST', { decision: 'aprovado', note: '' })).status, 200);
      const tokens = Object.fromEntries([['a','holiday_a'],['b','holiday_b'],['root','usr_root']].map(([key,id]) => [key,jwt.sign({ id },config.JWT_SECRET,{ expiresIn: '10m' })]));
      await require('./checkHolidaysBrowser')(`http://127.0.0.1:${server.address().port}`, tokens);
    }
    console.log('Feriados: escopos rede/unidade, unidades futuras, permissões, validações, concorrência, aprovação/recusa/reabertura/cancelamento, conflitos com caixa, integração com histórico e auditoria verificados em banco temporário.');
  } finally { await new Promise(resolve => server.close(resolve)); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
