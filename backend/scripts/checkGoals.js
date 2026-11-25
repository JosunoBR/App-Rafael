const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const checkDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mega12-goals-'));
process.env.DB_DIR = checkDir;
process.env.DB_FILENAME = 'goals-check.db';
process.env.NODE_ENV = 'test';
const { execute, queryAll, queryOne, flushDatabaseToDisk, dbPath } = require('../src/config/database');
const repository = require('../src/repositories/goalsRepository');
const service = require('../src/services/goals.service');
const seed = require('../src/data/goalsWorkbookSeed.json');
const express = require('express');
const jwt = require('jsonwebtoken');
const config = require('../src/config/environment');
const storeNames = ['Irati Centro', 'Trajano', 'Teixeira Soares', 'Castro', 'Javert', 'Imbituva', 'Ivaí', 'Prudentópolis', 'Nova Rússia', 'Santa Paula', 'Tibagi', 'Imbaú', 'Reserva', 'Guarapuava', 'Rio Azul', 'Mallet', 'Campo Largo', 'Rebouças', 'Ipiranga', 'Ponta Grossa Centro'];
const closeServer = server => new Promise(resolve => server.close(resolve));
let apiServer;
(async () => {
  try {
    for (const [index, name] of storeNames.entries()) await execute('INSERT INTO stores(id,name,shortName,cluster,defaultWeight,active) VALUES(?,?,?,?,?,1)', [`fixture_${index}`, name, name, 'A', 1]);
    const first = await repository.importWorkbook(seed, 'fixture-admin');
    assert.equal(first.imported, true);
    assert.equal((await repository.importWorkbook(seed)).imported, false, 'Importação repetida deve ser idempotente.');
    assert.equal((await queryOne('SELECT COUNT(*) AS count FROM goal_imports')).count, 1);
    assert.equal((await queryOne('SELECT COUNT(*) AS count FROM goal_store_links')).count, 20);
    assert.equal((await queryOne('SELECT COUNT(*) AS count FROM goal_store_links WHERE storeId IS NULL')).count, 0, 'Os nomes conhecidos devem usar IDs reais do cadastro.');
    assert.equal((await queryOne('SELECT COUNT(*) AS count FROM goal_monthly_baselines')).count, 235);
    assert.equal((await queryOne('SELECT COUNT(*) AS count FROM goal_sales_history')).count, 1410);
    assert.equal((await queryOne('SELECT COUNT(*) AS count FROM goal_profit_history')).count, 1140);
    assert.equal((await queryOne('SELECT COUNT(*) AS count FROM goal_source_sheets')).count, Object.keys(seed.sourceSheets).length);
    assert.deepEqual(await queryAll('PRAGMA foreign_key_check'), []);
    assert.deepEqual(await repository.getSourceSheet('VENDAS ANUAL'), seed.sourceSheets['VENDAS ANUAL']);
    const read = await repository.findWorkbook();
    for (const [month, data] of Object.entries(seed.months)) {
      for (const original of data.stores) {
        const restored = read.months[month].stores.find(store => store.id === original.id);
        for (const key of Object.keys(original)) assert.deepEqual(restored[key], original[key], `${original.name} ${month} ${key}`);
      }
    }
    assert.deepEqual(read.profitSheets, seed.profitSheets);
    assert.equal(read.goalHistory.find(goal => goal.storeId === 'fixture_0' && goal.year === 2026 && goal.month === 1).amount, seed.months['01'].stores.find(store => store.id === 'irati_centro').spreadsheetGoal);
    assert.equal(read.goalHistory.some(goal => goal.year === 2025), false, 'A meta importada confirmada como 2026 não pode ser atribuída a 2025.');
    await execute('UPDATE stores SET name = ? WHERE id = ?', ['Irati Centro Atualizada', 'fixture_0']);
    await execute('INSERT INTO stores(id,name,shortName,cluster,defaultWeight,active) VALUES(?,?,?,?,?,1)', ['new_dynamic', 'Nova Loja Dinâmica', 'Nova Loja', 'B', 1]);
    const dynamic = await repository.findWorkbook();
    assert.equal(dynamic.registeredStores.length, 21);
    assert.equal(dynamic.registeredStores.find(store => store.id === 'fixture_0').name, 'Irati Centro Atualizada');
    assert.equal(dynamic.storeLinks.find(link => link.sourceKey === 'irati_centro').storeId, 'fixture_0', 'Renomear não pode perder o relacionamento.');
    await assert.rejects(() => repository.linkStore(seed.sha256, 'irati_centro', 'fixture_1', 'admin'), error => error.status === 409);
    const allRegistered = await queryAll('SELECT * FROM stores');
    await require('../src/repositories/fiscalRepository').updateStores(allRegistered.filter(store => store.id !== 'fixture_2'));
    assert.equal((await queryOne('SELECT active FROM stores WHERE id = ?', ['fixture_2'])).active, 0, 'Loja com histórico deve ser inativada, preservando os vínculos.');
    const save = await repository.savePlans(2026, 1, [{ storeId: 'fixture_0', amount: 111778.92, version: 0 }], 'fixture-admin');
    assert.equal(save[0].version, 1);
    assert.equal((await repository.getPlans(2026, 1))[0].amount, 111778.92);
    assert.ok((await repository.findWorkbook()).goalHistory.some(goal => goal.storeId === 'fixture_0' && goal.year === 2026 && goal.month === 1 && goal.amount === 140000), 'O comparativo deve mostrar a coluna 10 da planilha; a meta planejada continua salva separadamente.');
    await assert.rejects(() => repository.savePlans(2026, 1, [{ storeId: 'fixture_1', amount: 123, version: 0 }, { storeId: 'fixture_0', amount: 99, version: 0 }], 'other'), error => error.status === 409);
    assert.equal((await repository.getPlans(2026, 1)).length, 1, 'Conflito deve desfazer o lote inteiro.');
    await repository.savePlans(2026, 2, [{ storeId: 'fixture_0', amount: 0, version: 0 }], 'fixture-admin');
    assert.equal((await repository.getPlans(2026, 2))[0].amount, 0);
    assert.equal((await repository.getPlans(2026, 1))[0].amount, 111778.92, 'Meses independentes.');
    await repository.savePlans(2026, 2, [{ storeId: 'fixture_0', amount: null, version: 1 }], 'fixture-admin');
    assert.equal((await repository.getPlans(2026, 2))[0].version, 2, 'Restaurar deve preservar revisão e auditoria.');
    for (const amount of [-1, '12', Number.NaN, Number.POSITIVE_INFINITY, undefined]) assert.throws(() => service.validatePlans({ year: 2026, month: 1, plans: [{ storeId: 'fixture_0', amount, version: 1 }] }));
    assert.throws(() => service.validatePlans({ year: 2026, month: 13, plans: [] }));
    assert.ok((await queryOne('SELECT COUNT(*) AS count FROM store_goal_audit')).count >= 4);
    // Preserva o vínculo ao importar uma nova versão, mesmo após mudar nome e abreviação.
    await execute('UPDATE stores SET shortName = ? WHERE id = ?', ['Unidade Atual', 'fixture_0']);
    const nextSeed = { ...seed, sha256: 'f'.repeat(64) };
    await repository.importWorkbook(nextSeed, 'fixture-admin');
    assert.equal((await repository.findWorkbook()).storeLinks.find(link => link.sourceKey === 'irati_centro').storeId, 'fixture_0');
    const invalidSeed = { ...seed, sha256: 'd'.repeat(64), costs: [...seed.costs, seed.costs[0]] };
    await assert.rejects(() => repository.importWorkbook(invalidSeed, 'fixture-admin'));
    assert.equal((await repository.findWorkbook()).sha256, nextSeed.sha256, 'Falha de importação deve preservar a versão ativa anterior.');
    assert.equal((await queryOne('SELECT COUNT(*) AS count FROM goal_imports')).count, 2);
    // A reimportação e a migração não substituem metas planejadas.
    await service.ensureSeed();
    assert.equal((await repository.getPlans(2026, 1))[0].amount, 111778.92);
    assert.ok((await repository.findWorkbook()).goalHistory.some(goal => goal.storeId === 'fixture_0' && goal.year === 2026 && goal.month === 1 && goal.amount === 111778.92));
    flushDatabaseToDisk();
    assert.ok(fs.statSync(dbPath).size > 0);
    const SQL = await require('sql.js')();
    const disk = new SQL.Database(fs.readFileSync(dbPath));
    assert.equal(disk.exec("SELECT amountCents FROM store_goals WHERE storeId='fixture_0' AND month=1")[0].values[0][0], 11177892);
    disk.close();
    const testPassword = require('bcryptjs').hashSync('test-only', 4);
    for (const [id, role, permissions] of [['fixture-admin','diretoria',{}], ['fixture-reader','deposito',{'nav:goals':true}]]) {
      await execute('INSERT INTO users(id,nome,email,senha,role,ativo,permissions,createdAt,updatedAt) VALUES(?,?,?,?,?,1,?,?,?)', [id,id,id+'@example.invalid',testPassword,role,JSON.stringify(permissions),new Date().toISOString(),new Date().toISOString()]);
    }
    const app = express();
    app.use(require('cors')());
    app.use(express.json());
    app.use('/api/goals', require('../src/routes/goals.routes'));
    apiServer = app.listen(0, '127.0.0.1');
    await new Promise(resolve => apiServer.once('listening', resolve));
    const apiBase = `http://127.0.0.1:${apiServer.address().port}/api`;
    const token = jwt.sign({ id: 'fixture-admin', role: 'diretoria' }, config.JWT_SECRET, { expiresIn: '5m' });
    const reader = jwt.sign({ id: 'fixture-reader', role: 'deposito', permissions: { 'nav:goals': true } }, config.JWT_SECRET, { expiresIn: '5m' });
    const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
    assert.equal((await fetch(`${apiBase}/goals/workbook`)).status, 401);
    assert.equal((await fetch(`${apiBase}/goals/workbook`, { headers: { Authorization: `Bearer ${reader}` } })).status, 200);
    assert.equal((await fetch(`${apiBase}/goals/plans`, { method: 'PUT', headers: { Authorization: `Bearer ${reader}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ year: 2026, month: 1, plans: [{ storeId: 'fixture_0', amount: 10, version: 1 }] }) })).status, 403);
    assert.equal((await fetch(`${apiBase}/goals/plans?year=2026&month=99`, { headers })).status, 400);
    assert.equal((await fetch(`${apiBase}/goals/plans`, { method: 'PUT', headers, body: JSON.stringify({ year: 2026, month: 1, plans: [{ storeId: 'fixture_0', amount: -5, version: 1 }] }) })).status, 400);
    assert.equal((await fetch(`${apiBase}/goals/plans`, { method: 'PUT', headers, body: JSON.stringify({ year: 2026, month: 1, plans: [{ storeId: 'fixture_0', amount: 10, version: 0 }] }) })).status, 409);
    assert.equal((await repository.findWorkbook()).goalHistory.some(goal => goal.month === 12 && goal.year === 2026), false, 'Nova planilha sem confirmação do ano não deve herdar a atribuição da versão anterior.');
    if (process.env.GOALS_PLAYWRIGHT_PATH) {
      await execute('UPDATE goal_imports SET active=0 WHERE active=1');
      await execute('UPDATE goal_imports SET active=1 WHERE id=?', [seed.sha256]);
      await checkBrowser(apiBase, token);
      await execute('UPDATE goal_imports SET active=0 WHERE active=1');
      await execute('UPDATE goal_imports SET active=1 WHERE id=?', [nextSeed.sha256]);
    }
    const dynamicSeed = structuredClone(seed);
    dynamicSeed.sha256 = 'a'.repeat(64);
    dynamicSeed.months['01'].stores.push({ ...dynamicSeed.months['01'].stores[0], id: 'future_unit', name: 'Nova Unidade Automática', profitSheet: null, costName: 'Nova Unidade Automática' });
    await repository.importWorkbook(dynamicSeed, 'test');
    assert.equal((await repository.findWorkbook()).storeLinks.find(link => link.sourceKey === 'future_unit').storeId, null);
    await execute('INSERT INTO stores(id,name,shortName,cluster,defaultWeight,active) VALUES(?,?,?,?,?,1)', ['new_auto_id', 'Nova Unidade Automática', 'Nova Auto', 'B', 1]);
    const automatic = await repository.findWorkbook();
    assert.equal(automatic.storeLinks.find(link => link.sourceKey === 'future_unit').storeId, 'new_auto_id', 'Novo cadastro deve vincular histórico automaticamente, sem seletor manual.');
    assert.ok(automatic.registeredStores.some(store => store.id === 'new_auto_id'));
    console.log('SQLite/metas: importação, relacionamentos dinâmicos, persistência em disco, auditoria, atomicidade, autenticação e conflitos verificados em banco temporário.');
  } finally {
    if (apiServer) await closeServer(apiServer);
    flushDatabaseToDisk();
    console.log(`Banco de teste isolado: ${dbPath}`);
  }
})().catch(error => { console.error(error); process.exitCode = 1; });

async function checkBrowser(apiBase, token) {
  const { createServer } = await import(pathToFileURL(path.resolve(__dirname, '../../web/node_modules/vite/dist/node/index.js')).href);
  const { chromium } = require(process.env.GOALS_PLAYWRIGHT_PATH);
  const webDir = path.resolve(__dirname, '../../web');
  const fixture = `import React from 'react';
    import { createRoot } from 'react-dom/client';
    import '/src/index.css';
    import { GoalsExecutivePage } from '/src/modules/goalsExecutive/pages/GoalsExecutivePage.tsx';
    import { StoresHistoryPage } from '/src/modules/unitsManagement/pages/StoresHistoryPage.tsx';
    const user = { id: 'fixture-admin', role: 'diretoria', nome: 'Teste local', token: ${JSON.stringify(token)} };
    localStorage.setItem('mega12_user', JSON.stringify(user));
    createRoot(document.getElementById('root')).render(React.createElement(location.pathname === '/__history-check' ? StoresHistoryPage : GoalsExecutivePage, { currentUser: user }));`;
  const vite = await createServer({ root: webDir, define: { 'import.meta.env.VITE_API_URL': JSON.stringify(apiBase) }, server: { host: '127.0.0.1', port: 0 }, plugins: [{ name: 'goals-local-check', transform(code, id) { if (id.replaceAll('\\', '/').endsWith('/src/utils/config.ts')) return { code: `export const API_BASE_URL = ${JSON.stringify(apiBase)}; export const API_HOST = ${JSON.stringify(apiBase.replace('/api', ''))};`, map: null }; }, resolveId(id) { if (id === '/__goals-check.js') return '\0goals-fixture'; }, load(id) { if (id === '\0goals-fixture') return fixture; }, configureServer(server) {
    server.middlewares.use(async (req, res, next) => {
      if (['/__goals-check', '/__history-check'].includes(req.url)) { res.setHeader('Content-Type', 'text/html'); return res.end(await server.transformIndexHtml('/__goals-check', '<html><body><div id="root"></div><script type="module" src="/__goals-check.js"></script></body></html>')); }
      next();
    });
  } }] });
  let browser;
  try {
    await vite.listen();
    const browserPort = vite.httpServer.address().port;
    browser = await chromium.launch({ channel: 'msedge', headless: true });
    const context = await browser.newContext({ viewport: { width: 1500, height: 1000 } });
    await context.route('**/*', route => {
      const hostname = new URL(route.request().url()).hostname;
      return ['127.0.0.1', 'localhost'].includes(hostname) ? route.continue() : route.abort();
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => { errors.push(error.message); console.error('[browser]', error.message); });
    page.on('console', message => { if (message.type() === 'error') console.error('[browser-console]', message.text().slice(0, 600)); });
    await page.goto(`http://127.0.0.1:${browserPort}/__goals-check`);
    await page.getByRole('heading', { name: 'Painel Executivo de Metas' }).waitFor({ timeout: 15000 }).catch(async error => { console.error((await page.locator('body').innerText()).slice(0, 1500)); throw error; });
    await page.getByLabel('Ano da meta').selectOption('2026');
    await page.getByLabel('Mês da meta').selectOption('01');
    const input = page.getByRole('textbox', { name: 'Meta planejada Irati Centro Atualizada', exact: true });
    await input.waitFor();
    await page.waitForFunction(() => { const input = document.querySelector('input[aria-label="Meta planejada Irati Centro Atualizada"]'); return input && !input.disabled; });
    assert.equal((await input.inputValue()).replace(/\s/g, ' '), 'R$ 111.778,92');
    await page.getByLabel('Mês da meta').selectOption('02');
    const februaryRow = input.locator('xpath=ancestor::tr');
    assert.equal((await februaryRow.locator('td').nth(0).locator('span').nth(1).innerText()).replace(/\s/g, ' '), 'Meta: R$ 140.000,00', 'Mês anterior deve usar a coluna 10 da planilha de janeiro/2026.');
    assert.equal((await februaryRow.locator('td').nth(1).locator('span').nth(1).innerText()).replace(/\s/g, ' '), 'Meta: —', 'Ano anterior sem meta não deve herdar a meta de 2026.');
    await page.getByLabel('Ano da meta').selectOption('2027');
    await page.getByLabel('Mês da meta').selectOption('01');
    const nextJanuaryRow = input.locator('xpath=ancestor::tr');
    const sourceDecemberGoal = seed.months['12'].stores.find(store => store.id === 'irati_centro').spreadsheetGoal;
    assert.equal((await nextJanuaryRow.locator('td').nth(0).locator('span').nth(1).innerText()).replace(/\s/g, ' '), `Meta: ${sourceDecemberGoal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }).replace(/\s/g, ' ')}`, 'Janeiro deve consultar a meta de dezembro do ano anterior.');
    assert.equal((await nextJanuaryRow.locator('td').nth(1).locator('span').nth(1).innerText()).replace(/\s/g, ' '), 'Meta: R$ 140.000,00', 'Mesmo mês do ano anterior deve usar a coluna 10 de janeiro/2026.');
    await page.getByLabel('Ano da meta').selectOption('2026');
    await page.getByLabel('Mês da meta').selectOption('01');
    const metricSelect = page.getByLabel('Visão do comparativo de metas', { exact: true });
    assert.equal(await metricSelect.inputValue(), 'sales');
    assert.equal(await page.getByRole('columnheader', { name: /Média de evolução/ }).count(), 0, 'A evolução deve ficar somente no histórico.');
    const headers = page.locator('thead th');
    assert.equal(await headers.count(), 8, 'A tabela deve mostrar apenas mês anterior e ano anterior entre as referências.');
    await page.getByRole('columnheader', { name: 'Dias úteis do mês', exact: true }).waitFor();
    assert.equal(await input.locator('xpath=ancestor::tr').locator('td[data-column="workingDays"]').innerText(), '26');
    const resizeHeader = headers.nth(1);
    const resizeHandle = resizeHeader.getByRole('separator');
    const previousSort = await resizeHeader.getAttribute('aria-sort');
    const originalWidth = (await resizeHeader.boundingBox()).width;
    const grip = await resizeHandle.boundingBox();
    await page.mouse.move(grip.x + grip.width/2, grip.y + grip.height/2);
    await page.mouse.down(); await page.mouse.move(grip.x + grip.width/2 + 80, grip.y + grip.height/2, { steps: 8 }); await page.mouse.up();
    assert.ok(Math.abs((await resizeHeader.boundingBox()).width - originalWidth - 80) < 2, 'Arrastar a borda deve aumentar a largura.');
    await resizeHandle.focus(); await resizeHandle.press('ArrowLeft');
    const savedColumnWidth = (await resizeHeader.boundingBox()).width;
    assert.ok(Math.abs(savedColumnWidth - originalWidth - 70) < 2, 'Setas devem permitir ajustar a largura.');
    assert.equal(await resizeHeader.getAttribute('aria-sort'), previousSort, 'Redimensionar não deve ordenar a tabela.');

    await page.getByRole('columnheader', { name: /Faturamento · mês anterior Dezembro 2025/ }).waitFor();
    assert.equal(await page.getByRole('columnheader', { name: /Faturamento 202[34]/ }).count(), 0);
    const moneyText = value => value === null ? '—' : value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }).replace(/\s/g, ' ');
    const januaryRow = input.locator('xpath=ancestor::tr');
    const previousMonthRevenue = seed.months['12'].stores.find(store => store.name === 'IRATI CENTRO').sales.find(item => item.year === 2025).value;
    assert.equal((await januaryRow.locator(':scope > td, :scope > th').nth(1).locator('[data-comparison-value]').innerText()).replace(/\s/g, ' '), moneyText(previousMonthRevenue));
    const cellsBefore = await januaryRow.locator(':scope > td, :scope > th').allTextContents();
    const totalsBefore = await page.locator('tfoot tr > *').allTextContents();
    await headers.nth(1).dragTo(headers.nth(0));
    assert.deepEqual(await headers.evaluateAll(elements => elements.map(element => element.dataset.column)), ['previousMonth', 'name', 'previousYear', 'suggestion', 'workingDays', 'daily', 'plan', 'superGoal']);
    assert.deepEqual(await januaryRow.locator(':scope > td, :scope > th').allTextContents(), [cellsBefore[1], cellsBefore[0], ...cellsBefore.slice(2)], 'Arrastar deve mover também os valores.');
    assert.deepEqual(await page.locator('tfoot tr > *').allTextContents(), [totalsBefore[1], totalsBefore[0], ...totalsBefore.slice(2)], 'Os totais devem acompanhar as colunas.');
    assert.equal(await headers.locator('[aria-sort="ascending"]').count(), 0);
    await headers.nth(0).getByRole('button').click();
    assert.equal(await headers.nth(0).getAttribute('aria-sort'), 'ascending', 'Clique simples deve continuar ordenando.');
    await headers.nth(0).getByRole('button').press('Alt+ArrowRight');
    assert.equal(await headers.nth(0).getAttribute('data-column'), 'name', 'O teclado também deve permitir mover a coluna.');
    await headers.nth(1).dragTo(headers.nth(0));
    const meanPercentage = (a, b, c) => ((b - a) / Math.abs(a) * 100 + (c - b) / Math.abs(b) * 100) / 2;
    const formatPercentage = value => `${value > 0 ? '+' : ''}${value.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%`;
    const revenuePercentage = meanPercentage(80534, 104527.76, 103499);

    await metricSelect.selectOption('profit');
    await page.getByRole('columnheader', { name: 'Lucro líquido 2025 Mesmo mês do ano anterior', exact: true }).waitFor();
    const decemberProfit = seed.profitSheets['IRATI CENTRO']['12'];
    const decemberProfitValue = decemberProfit.sales.find(item => item.year === 2025).value > 0 ? decemberProfit.profits.find(item => item.year === 2025).value : null;
    assert.equal((await januaryRow.locator(':scope > td, :scope > th').nth(0).innerText()).replace(/\s/g, ' '), moneyText(decemberProfitValue), 'O mês anterior deve acompanhar a visão de lucro.');
    const profitPercentage = meanPercentage(8538.88, 16226.24, 4147.68);
    assert.notEqual(formatPercentage(revenuePercentage), formatPercentage(profitPercentage));

    assert.equal((await input.inputValue()).replace(/\s/g, ' '), 'R$ 111.778,92');
    await metricSelect.selectOption('sales');

    assert.ok((await input.locator('xpath=ancestor::tr').textContent()).includes('111.778,92'));
    await input.fill('R$ 120.000,55');
    await page.getByRole('button', { name: 'Salvar metas no sistema', exact: true }).click();
    await page.getByText('Metas de 2026-01 salvas no banco de dados do sistema.', { exact: true }).waitFor();
    assert.equal((await repository.getPlans(2026, 1)).find(plan => plan.storeId === 'fixture_0').amount, 120000.55);
    assert.ok((await input.locator('xpath=ancestor::tr').textContent()).includes('132.000,61'), 'Supermeta deve acompanhar a meta salva acrescida de 10%.');

    await page.reload();
    await page.locator('thead th[data-column="previousMonth"]').waitFor();
    assert.equal(await page.locator('thead th').first().getAttribute('data-column'), 'previousMonth', 'A posição deve ser mantida ao reabrir.');
    assert.ok(Math.abs((await page.locator('thead th').first().boundingBox()).width - savedColumnWidth) < 2, 'A largura deve acompanhar a coluna reorganizada e persistir ao reabrir.');
    await page.getByLabel('Ano da meta').selectOption('2026');
    await page.getByLabel('Mês da meta').selectOption('01');
    await page.waitForFunction(() => document.querySelector('input[aria-label="Meta planejada Irati Centro Atualizada"]')?.value.replace(/\s/g, ' ') === 'R$ 120.000,55');
    await page.getByLabel('Buscar loja').fill('Nova Loja Dinâmica');
    assert.ok((await page.locator('tbody').first().textContent()).includes('Sem histórico'));
    await page.getByRole('button', { name: 'Limpar busca', exact: true }).click();
    await page.getByRole('button', { name: 'Irati Centro Atualizada', exact: true }).click();
    await page.getByRole('heading', { name: 'Lucro líquido do mesmo mês · IRATI CENTRO', exact: true }).waitFor();
    const artifacts = path.resolve(webDir, '../.artifacts/goals');
    fs.mkdirSync(artifacts, { recursive: true });
    await page.screenshot({ path: path.join(artifacts, 'goals-light.png'), fullPage: true });
    await page.evaluate(() => document.documentElement.classList.add('dark'));
    await page.screenshot({ path: path.join(artifacts, 'goals-dark.png'), fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.evaluate(() => { document.querySelectorAll('div.overflow-x-auto').forEach(element => { element.scrollLeft = 0; }); });
    await page.locator('thead').first().scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(artifacts, 'goals-mobile-viewport.png') });
    await page.screenshot({ path: path.join(artifacts, 'goals-mobile.png'), fullPage: true });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'Tabela deve rolar dentro do painel, sem estourar a página no celular.');
    await page.getByLabel('Ano da meta').selectOption('2027');
    await page.getByLabel('Mês da meta').selectOption('11');
    assert.ok((await page.locator('tbody').first().textContent()).includes('Sem histórico'));
    const emptyPlan = page.getByLabel('Meta planejada Irati Centro Atualizada', { exact: true });
    assert.equal(await emptyPlan.inputValue(), '');
    assert.equal(await emptyPlan.getAttribute('placeholder'), '');

    await page.setViewportSize({ width: 1500, height: 1000 });
    await page.goto(`http://127.0.0.1:${browserPort}/__history-check`);
    await page.getByRole('heading', { name: 'Histórico de Vendas', exact: true }).waitFor();
    await page.getByLabel('Mês do histórico', { exact: true }).selectOption('01');
    await page.getByLabel('Buscar loja no histórico', { exact: true }).fill('Irati Centro');
    assert.ok((await page.locator('tbody').first().textContent()).includes('103.499,00'));
    const historyEvolutionHeader = page.locator('thead th').last();
    const historyGrip = historyEvolutionHeader.getByRole('separator');
    const historyOriginalWidth = (await historyEvolutionHeader.boundingBox()).width;
    await historyGrip.focus(); await historyGrip.press('Shift+ArrowRight');
    assert.ok(Math.abs((await historyEvolutionHeader.boundingBox()).width - historyOriginalWidth - 30) < 2, 'A última coluna do histórico também deve permitir ajuste.');
    await historyGrip.press('Home');
    assert.equal(await page.locator('table').first().getAttribute('data-column-widths'), null, 'Home deve restaurar a largura automática.');

    assert.ok((await historyEvolutionHeader.textContent()).includes('Média de evolução do faturamento'));
    const historyPercentage = page.locator('tbody tr').first().locator('td').last().locator('span[tabindex="0"]');
    assert.equal(await historyPercentage.innerText(), formatPercentage(revenuePercentage));
    assert.ok((await historyPercentage.getAttribute('title')).includes('variações de faturamento'));
    await historyEvolutionHeader.getByRole('button').click();
    assert.equal(await historyEvolutionHeader.getAttribute('aria-sort'), 'ascending');
    await historyEvolutionHeader.getByRole('button').click();
    assert.equal(await historyEvolutionHeader.getAttribute('aria-sort'), 'descending');

    await page.getByLabel('Informação do histórico', { exact: true }).selectOption('profit');
    assert.ok((await page.locator('tbody').first().textContent()).includes('4.147,68'));
    assert.ok((await historyEvolutionHeader.textContent()).includes('Média de evolução do lucro'));
    assert.equal(await historyPercentage.innerText(), formatPercentage(profitPercentage));
    assert.ok((await historyPercentage.getAttribute('title')).includes('variações de lucro'));
    await page.getByLabel('Informação do histórico', { exact: true }).selectOption('salesDaily');
    assert.ok((await historyEvolutionHeader.textContent()).includes('faturamento médio diário'));
    await page.getByLabel('Informação do histórico', { exact: true }).selectOption('profit');

    await page.getByRole('button', { name: 'Limpar busca', exact: true }).click();
    await page.getByLabel('Mês do histórico', { exact: true }).selectOption('all');
    assert.equal(await page.locator('tbody').first().locator('tr').count(), 21);
    await page.screenshot({ path: path.join(artifacts, 'history-dark.png'), fullPage: true });
    await page.route('**/goals/plans?**', route => route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'Falha de teste ao consultar metas.' }) }));
    await page.goto(`http://127.0.0.1:${browserPort}/__goals-check`);
    await page.getByRole('alert').filter({ hasText: 'Falha de teste ao consultar metas.' }).waitFor();
    assert.equal(await page.locator('input[aria-label^="Meta planejada "]').first().isDisabled(), true, 'Falha de leitura deve alertar e impedir sobrescrita de metas desconhecidas.');
    await page.unroute('**/goals/plans?**');
    assert.deepEqual(errors, []);
    console.log('Navegador local: ano/mês, lojas dinâmicas, consulta ao SQLite, gravação/reabertura, busca, detalhes e temas claro/escuro e celular verificados.');
  } finally { if (browser) await browser.close(); await vite.close(); }
}
