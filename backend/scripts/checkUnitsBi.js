const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
process.env.DB_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'mega12-units-bi-'));
process.env.DB_FILENAME = 'bi-check.db';
const { execute, flushDatabaseToDisk } = require('../src/config/database');
const repository = require('../src/repositories/goalsRepository');
const seed = require('../src/data/goalsWorkbookSeed.json');
const { getUnitsBi, latestHistoryPeriod } = require('../src/services/unitsBi.service');
const express = require('express');
const jwt = require('jsonwebtoken');
const config = require('../src/config/environment');
let server;
(async () => {
  try {
    const identities = new Map();
    Object.values(seed.months).forEach(month => month.stores.forEach(store => identities.set(store.id, store)));
    for (const store of identities.values()) await execute('INSERT INTO stores(id,name,shortName,cluster,defaultWeight,active) VALUES(?,?,?,?,?,1)', [`db_${store.id}`, store.name, store.name, 'A', 1]);
    await repository.importWorkbook(seed, 'test-bi');
    const history = await repository.findWorkbook();
    assert.equal(latestHistoryPeriod(history, '2026-11'), '2026-10');
    const data = await getUnitsBi('2025-11');
    assert.equal(data.period, '2025-11');
    assert.equal(data.history.registeredStores.length, 20);
    assert.equal(data.closings.length, 0);
    assert.ok(data.history.months['11'].stores.find(store => store.name === 'IRATI CENTRO').sales.find(sale => sale.year === 2025).value > 0);
    assert.deepEqual(data.history.costs, []);
    await assert.rejects(() => getUnitsBi('2026-13'), error => error.status === 400);
    const now = new Date().toISOString();
    for (const [id, status] of [['approved', 'aprovado'], ['pending', 'aguardando'], ['returned', 'devolvido']]) {
      await execute('INSERT INTO store_daily_closings(id,storeId,closingDate,status,salesCents,createdAt,updatedAt) VALUES(?,?,?,?,?,?,?)', [id, 'db_irati_centro', `2026-11-0${id === 'approved' ? 1 : id === 'pending' ? 2 : 3}`, status, 10000, now, now]);
    }
    const withClosing = await getUnitsBi('2026-11');
    assert.equal(withClosing.closings.length, 1, 'Somente fechamentos aprovados devem entrar no BI.');
    assert.equal(withClosing.closings[0].salesCents, 10000);
    assert.equal(Object.hasOwn(withClosing.closings[0], 'submittedBy'), false);
    await repository.savePlans(2026, 11, [{ storeId: 'db_irati_centro', amount: 123456.78, version: 0 }], 'test-bi');
    assert.equal((await getUnitsBi('2026-11')).plans[0].amount, 123456.78);
    const app = express();
    app.use(require('cors')());
    app.use('/api/units-bi', require('../src/routes/unitsBi.routes'));
    server = app.listen(0, '127.0.0.1');
    await new Promise(resolve => server.once('listening', resolve));
    const apiBase = `http://127.0.0.1:${server.address().port}/api`;
    const token = jwt.sign({ id: 'usr_root' }, config.JWT_SECRET, { expiresIn: '5m' });
    const headers = { Authorization: `Bearer ${token}` };
    assert.equal((await fetch(`${apiBase}/units-bi`)).status, 401);
    await execute('INSERT INTO users(id,nome,email,senha,role,ativo,createdAt,updatedAt) VALUES(?,?,?,?,?,1,?,?)', ['bi-no-access', 'Sem acesso BI', 'bi-denied@example.invalid', 'unused-test-password', 'deposito', now, now]);
    const denied = jwt.sign({ id: 'bi-no-access', role: 'deposito' }, config.JWT_SECRET, { expiresIn: '5m' });
    assert.equal((await fetch(`${apiBase}/units-bi`, { headers: { Authorization: `Bearer ${denied}` } })).status, 403);
    assert.equal((await fetch(`${apiBase}/units-bi?month=2026-13`, { headers })).status, 400);
    const passwordHash = require('bcryptjs').hashSync('BI isolated test account', 4);
    await execute('INSERT INTO users(id,nome,email,senha,role,ativo,permissions,createdAt,updatedAt) VALUES(?,?,?,?,?,1,?,?,?)', ['bi-reader', 'Leitor BI', 'bi-reader@example.invalid', passwordHash, 'deposito', JSON.stringify({ 'nav:units_bi': true }), now, now]);
    const biReader = jwt.sign({ id: 'bi-reader' }, config.JWT_SECRET, { expiresIn: '5m' });
    assert.equal((await fetch(`${apiBase}/units-bi?month=2025-01`, { headers: { Authorization: `Bearer ${biReader}` } })).status, 200, 'Permissão exclusiva do BI deve permitir consultar a análise, sem exigir acesso à tela de metas.');
    const result = await fetch(`${apiBase}/units-bi?month=2026-11`, { headers });
    assert.equal(result.status, 200);
    assert.equal((await result.json()).closings.length, 1);
    if (process.env.GOALS_PLAYWRIGHT_PATH) await checkBrowser(apiBase, token);
    console.log('API BI: consulta ao SQLite, período, vínculos, metas, fechamento aprovado e autorização verificados em banco temporário.');
  } finally { if (server) await new Promise(resolve => server.close(resolve)); flushDatabaseToDisk(); }
})().catch(error => { console.error(error); process.exitCode = 1; });

async function checkBrowser(apiBase, token) {
  const { pathToFileURL } = require('node:url');
  const { createServer } = await import(pathToFileURL(path.resolve(__dirname, '../../web/node_modules/vite/dist/node/index.js')).href);
  const { chromium } = require(process.env.GOALS_PLAYWRIGHT_PATH);
  const webDir = path.resolve(__dirname, '../../web');
  const fixture = `import React from 'react'; import { createRoot } from 'react-dom/client'; import '/src/index.css'; import { StoresBiPage } from '/src/modules/unitsManagement/pages/StoresBiPage.tsx';
    const user = { id: 'usr_root', role: 'diretoria', nome: 'Teste BI', token: ${JSON.stringify(token)} }; localStorage.setItem('mega12_user', JSON.stringify(user)); createRoot(document.getElementById('root')).render(React.createElement(StoresBiPage, { currentUser: user }));`;
  const vite = await createServer({ root: webDir, server: { host: '127.0.0.1', port: 0 }, plugins: [{ name: 'bi-local-check',
    transform(code, id) { if (id.replaceAll('\\', '/').endsWith('/src/utils/config.ts')) return { code: `export const API_BASE_URL = ${JSON.stringify(apiBase)}; export const API_HOST = ${JSON.stringify(apiBase.replace('/api', ''))};`, map: null }; },
    resolveId(id) { if (id === '/__bi-check.js') return '\0bi-fixture'; }, load(id) { if (id === '\0bi-fixture') return fixture; },
    configureServer(server) { server.middlewares.use(async (req, res, next) => { if (req.url === '/__bi-check') { res.setHeader('Content-Type', 'text/html'); return res.end(await server.transformIndexHtml('/__bi-check', '<html><body><div id="root"></div><script type="module" src="/__bi-check.js"></script></body></html>')); } next(); }); },
  }] });
  let browser;
  try {
    await vite.listen();
    browser = await chromium.launch({ channel: 'msedge', headless: true });
    const page = await browser.newPage({ viewport: { width: 1500, height: 1000 } });
    await page.route('**/*', route => ['localhost', '127.0.0.1'].includes(new URL(route.request().url()).hostname) ? route.continue() : route.abort());
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`http://127.0.0.1:${vite.httpServer.address().port}/__bi-check`);
    await page.getByLabel('Ano do BI').selectOption('2026');
    await page.getByLabel('Mês do BI').selectOption('01');
    await page.getByRole('region', { name: 'Desempenho das unidades' }).getByRole('heading', { name: 'Desempenho por unidade · Janeiro / 2026', exact: true }).waitFor();
    assert.ok((await page.locator('body').innerText()).includes('1.835.132,00'));
    const table = page.getByRole('table', { name: 'Faturamento, evolução, lucro e metas de cada unidade', exact: true });
    await table.getByRole('button', { name: 'Unidade', exact: true }).click();
    assert.equal(await table.locator('tbody tr th').first().innerText(), 'CAMPO LARGO');
    await table.getByRole('button', { name: 'Unidade', exact: true }).click();
    assert.equal(await table.locator('tbody tr th').first().innerText(), 'TIBAGI');
    await table.getByRole('button', { name: 'Faturamento 2026', exact: true }).click();
    assert.equal(await table.getByRole('columnheader', { name: 'Faturamento 2026', exact: true }).getAttribute('aria-sort'), 'ascending');
    assert.equal(await table.locator('tbody tr th').last().innerText(), 'P.G CENTRO');

    await page.getByLabel('Ano do BI').selectOption('2025');
    await page.getByRole('heading', { name: 'Desempenho por unidade · Janeiro / 2025', exact: true }).waitFor();
    assert.ok((await page.locator('body').innerText()).includes('1.092.798,00'));
    assert.ok((await page.locator('body').innerText()).includes('Sem fechamentos diários aprovados'));
    const artifacts = path.resolve(webDir, '../.artifacts/units-bi');
    fs.mkdirSync(artifacts, { recursive: true });
    await page.screenshot({ path: path.join(artifacts, 'bi-light.png'), fullPage: true });
    await page.evaluate(() => document.documentElement.classList.add('dark'));
    await page.screenshot({ path: path.join(artifacts, 'bi-dark.png'), fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: path.join(artifacts, 'bi-mobile.png'), fullPage: true });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.getByLabel('Ano do BI').selectOption('2026');
    await page.getByLabel('Mês do BI').selectOption('11');
    await page.getByRole('heading', { name: 'Desempenho por unidade · Novembro / 2026', exact: true }).waitFor();
    assert.ok((await page.locator('body').innerText()).includes('1 fechamentos no período'));
    await page.route('**/units-bi?month=2026-12', route => route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'Falha de consulta no teste do BI.' }) }));
    await page.getByLabel('Mês do BI').selectOption('12');
    await page.getByRole('alert').filter({ hasText: 'Falha de consulta no teste do BI.' }).waitFor();
    assert.equal(await page.getByRole('region', { name: 'Desempenho das unidades' }).count(), 0, 'Não apresentar os dados do mês anterior como se fossem do mês cuja consulta falhou.');
    assert.deepEqual(errors, []);
    console.log('BI no navegador: histórico, mudança de ano/mês, fechamentos, pagamentos, ausência de dados, temas e tela móvel verificados localmente.');
  } finally { if (browser) await browser.close(); await vite.close(); }
}
