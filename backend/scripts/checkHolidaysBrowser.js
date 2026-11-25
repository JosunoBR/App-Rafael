const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const { pathToFileURL } = require('node:url');

module.exports = async function checkHolidaysBrowser(base, tokens) {
  const { createServer } = await import(pathToFileURL(path.resolve(__dirname, '../../web/node_modules/vite/dist/node/index.js')).href);
  const { chromium } = require(process.env.GOALS_PLAYWRIGHT_PATH);
  const users = {
    a: { id: 'holiday_a', role: 'unidade', storeId: 'holiday_a', nome: 'Operador A', token: tokens.a },
    b: { id: 'holiday_b', role: 'unidade', storeId: 'holiday_b', nome: 'Operador B', token: tokens.b },
    root: { id: 'usr_root', role: 'root', nome: 'Root', token: tokens.root },
  };
  const fixture = `import React from 'react'; import { createRoot } from 'react-dom/client'; import '/src/index.css';
    import { StorePortalPage } from '/src/modules/storePortal/pages/StorePortalPage.tsx';
    import { UnitsCalendarPage } from '/src/modules/unitsManagement/pages/UnitsCalendarPage.tsx';
    import { UnitsManagementPage } from '/src/modules/unitsManagement/pages/UnitsManagementPage.tsx';
    import { GoalsExecutivePage } from '/src/modules/goalsExecutive/pages/GoalsExecutivePage.tsx';
    import { StoresHistoryPage } from '/src/modules/unitsManagement/pages/StoresHistoryPage.tsx';
    const query = new URLSearchParams(location.search), user = ${JSON.stringify(users)}[query.get('user') || 'root'];
    localStorage.setItem('mega12_user', JSON.stringify(user));
    const component = { portal: StorePortalPage, conference: UnitsManagementPage, calendar: UnitsCalendarPage, goals: GoalsExecutivePage, history: StoresHistoryPage }[query.get('view')];
    createRoot(document.getElementById('root')).render(React.createElement(component, { currentUser: user, unitName: user.id === 'holiday_a' ? 'Castro' : 'Imbaú' }));`;
  const vite = await createServer({ root: path.resolve(__dirname, '../../web'), server: { host: '127.0.0.1', port: 0 }, plugins: [{
    name: 'holiday-local-browser-test',
    transform(code, id) { if (id.replaceAll('\\','/').endsWith('/src/utils/config.ts')) return { code: `export const API_BASE_URL=${JSON.stringify(base)}; export const API_HOST=${JSON.stringify(base)};`, map: null }; },
    resolveId(id) { if (id === '/holiday-fixture.js') return '\0holiday-fixture'; },
    load(id) { if (id === '\0holiday-fixture') return fixture; },
    configureServer(server) { server.middlewares.use(async (req,res,next) => {
      if (req.url.startsWith('/holiday-test?')) { res.setHeader('Content-Type', 'text/html'); res.end(await server.transformIndexHtml('/holiday-test', '<html><body><div id="root"></div><script type="module" src="/holiday-fixture.js"></script></body></html>')); } else next();
    }); },
  }] });
  let browser;
  try {
    await vite.listen();
    const origin = `http://127.0.0.1:${vite.httpServer.address().port}/holiday-test`;
    browser = await chromium.launch({ channel: 'msedge', headless: true });
    const errors = [];
    const newPage = async () => {
      const context = await browser.newContext({ viewport: { width: 1500, height: 1000 } });
      await context.route('**/*', route => ['localhost','127.0.0.1'].includes(new URL(route.request().url()).hostname) ? route.continue() : route.abort());
      const page = await context.newPage();
      page.on('pageerror', error => errors.push(error.message));
      return page;
    };
    const a = await newPage();
    await a.clock.install({ time: new Date('2026-11-25T15:00:00Z') });
    const open = (page, view, user = 'root') => page.goto(`${origin}?view=${view}&user=${user}`);
    const expectDays = (page, count) => page.getByText(`Jornada de Metas do Mês • ${count} dias úteis`, { exact: true }).waitFor();
    await open(a, 'portal', 'a'); await expectDays(a, 23);
    await a.getByRole('button', { name: 'Solicitar feriado em 2026-11-26', exact: true }).click();
    await a.getByLabel('Nome do feriado da unidade').fill('Municipal UI');
    await a.getByRole('button', { name: 'Solicitar feriado', exact: true }).click();
    await a.getByText(/26\/11\/2026 · Municipal UI/).waitFor(); await expectDays(a, 23);
    const central = await newPage();
    await central.clock.install({ time: new Date('2026-11-25T15:00:00Z') });
    await open(central, 'calendar');
    await central.getByRole('button', { name: 'Aprovar feriado', exact: true }).click();
    await central.getByRole('button', { name: 'Aprovar feriado', exact: true }).waitFor({ state: 'hidden' });
    await a.reload(); await expectDays(a, 22);
    const b = await newPage(); await b.clock.install({ time: new Date('2026-11-25T15:00:00Z') });
    await open(b, 'portal', 'b'); await expectDays(b, 23);
    await central.getByRole('button', { name: 'Cadastrar ou consultar feriado em 2026-11-27', exact: true }).click();
    await central.getByRole('dialog').getByLabel('Nome do feriado', { exact: true }).fill('Rede UI');
    await central.getByRole('button', { name: 'Salvar feriado', exact: true }).click();
    await central.getByRole('dialog').waitFor({ state: 'hidden' });
    await a.reload(); await expectDays(a, 21); await b.reload(); await expectDays(b, 22);
    const goals = await newPage(); await goals.clock.install({ time: new Date('2026-11-25T15:00:00Z') });
    await open(goals, 'goals');
    const plan = goals.getByLabel('Meta planejada Castro', { exact: true }); await plan.waitFor();
    assert.equal(await plan.locator('xpath=ancestor::tr').locator('td[title^="21 dias úteis"]').count(), 1, 'Meta diária deve usar calendário local + rede.');
    await open(goals, 'history');
    await goals.getByLabel('Mês do histórico').selectOption('11');
    await goals.getByLabel('Informação do histórico').selectOption('salesDaily');
    const castro = goals.locator('tbody tr').filter({ has: goals.getByRole('rowheader', { name: 'Castro', exact: true }) });
    await castro.waitFor();
    assert.ok((await castro.innerText()).includes('47,62'), 'Histórico deve dividir os R$ 1.000 aprovados pelos 21 dias úteis.');
    await central.getByRole('button', { name: 'Cadastrar ou consultar feriado em 2026-11-27', exact: true }).click();
    await central.getByRole('dialog').getByRole('button', { name: 'Cancelar feriado', exact: true }).click();
    await central.getByRole('dialog').getByText('Rede UI', { exact: true }).waitFor({ state: 'hidden' });
    await central.getByRole('button', { name: 'Fechar cadastro de feriado', exact: true }).click();
    await a.reload(); await expectDays(a, 22); await b.reload(); await expectDays(b, 23);
    // Cadastro parcial pelo calendário: somente Castro, sem afetar Imbaú.
    await central.getByRole('button', { name: 'Cadastrar ou consultar feriado em 2026-11-28', exact: true }).click();
    await central.getByLabel('Nome do feriado', { exact: true }).fill('Selecionadas UI');
    await central.getByRole('radio', { name: 'Selecione a unidade', exact: true }).check();
    await central.getByRole('checkbox', { name: 'Castro', exact: true }).check();
    await central.getByRole('button', { name: 'Salvar feriado', exact: true }).click();
    await central.getByRole('dialog').waitFor({ state: 'hidden' });
    await a.reload(); await expectDays(a, 21); await b.reload(); await expectDays(b, 23);
    await central.getByLabel('Unidade do calendário').selectOption('holiday_b');
    assert.equal((await central.locator('[data-date="2026-11-28"]').innerText()).includes('Selecionadas UI'), false);
    await central.getByLabel('Unidade do calendário').selectOption('holiday_a');
    assert.ok((await central.locator('[data-date="2026-11-28"]').innerText()).includes('Selecionadas UI'));
    await central.getByLabel('Unidade do calendário').selectOption('all');
    const unitOptions = central.getByLabel('Unidade do calendário').locator('option');
    assert.equal(await unitOptions.count(), 4, 'Todas as lojas e as três unidades cadastradas devem aparecer.');
    await require('../src/config/database').execute('INSERT INTO stores(id,name,shortName,cluster,defaultWeight,active) VALUES(?,?,?,?,?,1)', ['calendar_dynamic','Unidade adicionada agora','Nova','A',1]);
    await central.route(`${base}/holidays`, route => route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ error: 'Erro HTTP 404' }) }));
    await central.getByRole('button', { name: 'Atualizar calendário', exact: true }).click();
    await central.getByRole('alert').filter({ hasText: 'Reinicie o backend' }).waitFor();
    assert.equal(await unitOptions.count(), 5, 'Uma falha nos feriados não pode impedir a atualização das unidades.');
    assert.ok((await unitOptions.allTextContents()).includes('Unidade adicionada agora'));
    await central.unroute(`${base}/holidays`);
    await central.getByRole('button', { name: 'Atualizar calendário', exact: true }).click();
    await central.getByRole('alert').waitFor({ state: 'hidden' });
    const artifacts = path.resolve(__dirname, '../../.artifacts/holidays'); fs.mkdirSync(artifacts, { recursive: true });
    await a.screenshot({ path: path.join(artifacts, 'unit-approved-holiday.png'), fullPage: true });
    assert.equal(await central.getByRole('alert').count(), 0, 'A conferência deve carregar fechamentos e feriados sem erro.');
    await central.evaluate(() => document.documentElement.classList.add('dark'));
    await central.screenshot({ path: path.join(artifacts, 'central-calendar-dark.png'), fullPage: true });
    await central.setViewportSize({ width: 390, height: 844 });
    assert.equal(await central.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await central.screenshot({ path: path.join(artifacts, 'central-calendar-mobile.png'), fullPage: true });
    assert.deepEqual(errors, []);
    console.log('Navegador local: solicitação, aprovação, isolamento de unidades, feriado geral, metas, histórico diário e cancelamento com recálculo verificados.');
  } finally { if (browser) await browser.close(); await vite.close(); }
};
