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
    finance: { id: 'memo_finance_ui', role: 'faturamento', nome: 'Financeiro', token: tokens.finance },
    root: { id: 'usr_root', role: 'root', nome: 'Root', token: tokens.root },
  };
  const fixture = `import React from 'react'; import { createRoot } from 'react-dom/client'; import '/src/index.css';
    import { StoresCashPage } from '/src/modules/unitsManagement/pages/StoresCashPage.tsx';
    import { StorePortalPage } from '/src/modules/storePortal/pages/StorePortalPage.tsx';
    import { StoreCashRegisterModal } from '/src/modules/storePortal/components/StoreCashRegisterModal.tsx';
    import { UnitsCalendarPage } from '/src/modules/unitsManagement/pages/UnitsCalendarPage.tsx';
    import { UnitsManagementPage } from '/src/modules/unitsManagement/pages/UnitsManagementPage.tsx';
    import { GoalsExecutivePage } from '/src/modules/goalsExecutive/pages/GoalsExecutivePage.tsx';
    import { StoresHistoryPage } from '/src/modules/unitsManagement/pages/StoresHistoryPage.tsx';
    const query = new URLSearchParams(location.search), user = ${JSON.stringify(users)}[query.get('user') || 'root'];
    localStorage.setItem('mega12_user', JSON.stringify(user));
    const component = { portal: StorePortalPage, cash: StoresCashPage, conference: UnitsManagementPage, calendar: UnitsCalendarPage, goals: GoalsExecutivePage, history: StoresHistoryPage }[query.get('view')];
    createRoot(document.getElementById('root')).render(query.get('view') === 'cash-form'
      ? React.createElement(StoreCashRegisterModal, { isOpen: true, dateStr: '2026-11-25', onClose: () => {}, onSave: async () => true })
      : React.createElement(component, { currentUser: user, unitName: user.id === 'holiday_a' ? 'Castro' : 'Imbaú', showToast: message => { document.body.dataset.toast = message; } }));`;
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
    const cashForm = await newPage();
    await open(cashForm, 'cash-form', 'a');
    await cashForm.getByRole('button', { name: 'Adicionar saída', exact: true }).click();
    await cashForm.getByLabel('Tipo da saída 1', {exact:true}).selectOption({label:'Vale funcionário'});
    await cashForm.getByPlaceholder('Descrição do vale funcionário').fill('Vale de teste');
    assert.equal(await cashForm.getByLabel('Tipo da saída 1', {exact:true}).inputValue(),'vale_funcionario');
    await cashForm.close();
    const rejectedClosing = await newPage();
    await rejectedClosing.clock.install({time:new Date('2026-11-25T15:00:00Z')});
    let rejectionMessage = 'Tipo de saída inválido. Selecione Despesa ou Depósito.';
    await rejectedClosing.route('**/store-closings/holiday_b/2026-11-24', async route => {
      assert.equal(route.request().method(),'PUT');
      assert.equal(route.request().postDataJSON().memorando,'','Memorando vazio deve ser enviado sem exigir preenchimento.');
      await route.fulfill({status:400,contentType:'application/json',body:JSON.stringify({error:rejectionMessage})});
    });
    await open(rejectedClosing,'portal','b');
    await rejectedClosing.locator('[data-date="2026-11-24"]').click();
    await rejectedClosing.locator('input[required]').fill('100,00');
    await rejectedClosing.getByRole('button',{name:'Adicionar saída',exact:true}).click();
    await rejectedClosing.getByLabel('Tipo da saída 1',{exact:true}).selectOption('vale_funcionario');
    await rejectedClosing.getByPlaceholder('Descrição do vale funcionário').fill('Vale preservado');
    await rejectedClosing.getByRole('button',{name:'Enviar Fechamento',exact:true}).click();
    await rejectedClosing.waitForFunction(()=>document.body.dataset.toast?.includes('Reinicie o backend'));
    assert.equal(await rejectedClosing.getByPlaceholder('Descrição do vale funcionário').inputValue(),'Vale preservado');
    rejectionMessage = 'O valor da saída deve ser maior que zero.';
    await rejectedClosing.getByRole('button',{name:'Enviar Fechamento',exact:true}).click();
    await rejectedClosing.waitForFunction(()=>document.body.dataset.toast==='O valor da saída deve ser maior que zero.');
    await rejectedClosing.close();
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
    await central.getByRole('button', { name: 'Fechar detalhes do dia', exact: true }).click();
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

    // Diretoria: memorando por unidade/data, consulta posterior e proteção de rascunhos.
    await central.getByLabel('Unidade do calendário').selectOption('holiday_a');
    await central.getByRole('button', { name: 'Cadastrar ou consultar feriado em 2026-11-03', exact: true }).click();
    const memo = central.getByLabel('Memorando de avaliação do dia');
    await central.waitForFunction(() => { const field=document.querySelector('textarea[aria-label="Memorando de avaliação do dia"]'); return field && !field.disabled; });
    await memo.fill('Avaliação de Castro: atendimento e exposição avaliados neste dia.');
    await central.getByRole('button', { name: 'Salvar memorando', exact: true }).click();
    await central.getByText('Memorando salvo para esta unidade e data.', { exact: true }).waitFor();
    await central.getByRole('button', { name: 'Fechar detalhes do dia', exact: true }).click();
    assert.ok((await central.locator('[data-date="2026-11-03"]').innerText()).includes('Memorando'));
    await central.reload();
    await central.getByLabel('Unidade do calendário').selectOption('holiday_a');
    await central.getByRole('button', { name: 'Cadastrar ou consultar feriado em 2026-11-03', exact: true }).click();
    await central.waitForFunction(() => document.querySelector('textarea[aria-label="Memorando de avaliação do dia"]')?.value === 'Avaliação de Castro: atendimento e exposição avaliados neste dia.');
    await central.getByRole('button', { name: 'Fechar detalhes do dia', exact: true }).click();
    await central.getByLabel('Unidade do calendário').selectOption('holiday_b');
    assert.equal((await central.locator('[data-date="2026-11-03"]').innerText()).includes('Memorando'), false);
    await central.getByRole('button', { name: 'Cadastrar ou consultar feriado em 2026-11-03', exact: true }).click();
    await central.waitForFunction(() => {const field=document.querySelector('textarea[aria-label="Memorando de avaliação do dia"]');return field && !field.disabled;});
    assert.equal(await memo.inputValue(),'');
    await memo.fill('Rascunho exclusivo de Imbaú');
    await central.getByLabel('Unidade do memorando').selectOption('holiday_a');
    await central.waitForFunction(() => document.querySelector('textarea[aria-label="Memorando de avaliação do dia"]')?.value.startsWith('Avaliação de Castro:'));
    await central.getByLabel('Unidade do memorando').selectOption('holiday_b');
    assert.equal(await memo.inputValue(),'Rascunho exclusivo de Imbaú');
    await central.getByRole('button', { name: 'Fechar detalhes do dia', exact: true }).click();
    await central.getByRole('button', { name: 'Cadastrar ou consultar feriado em 2026-11-03', exact: true }).click();
    assert.equal(await memo.inputValue(),'Rascunho exclusivo de Imbaú');
    await central.getByRole('button', { name: 'Descartar rascunho e recarregar', exact: true }).click();
    await central.waitForFunction(() => {const field=document.querySelector('textarea[aria-label="Memorando de avaliação do dia"]');return field && !field.disabled && field.value==='';});
    await central.getByLabel('Unidade do memorando').selectOption('holiday_a');
    await central.waitForFunction(() => {const field=document.querySelector('textarea[aria-label="Memorando de avaliação do dia"]');return field && !field.disabled && field.value.startsWith('Avaliação de Castro:');});
    const changed = await fetch(`${base}/calendar-memos/holiday_a/2026-11-03`, {method:'PUT',headers:{Authorization:`Bearer ${tokens.root}`,'Content-Type':'application/json'},body:JSON.stringify({content:'Avaliação atualizada por outra pessoa',version:1})});
    assert.equal(changed.status,200);
    await memo.fill('Minha avaliação ainda não salva');
    await central.getByRole('button', { name: 'Salvar memorando', exact: true }).click();
    await central.getByRole('alert').filter({hasText:'alterado por outra pessoa'}).waitFor();
    assert.equal(await memo.inputValue(),'Minha avaliação ainda não salva');
    await central.getByRole('button', { name: 'Descartar rascunho e recarregar', exact: true }).click();
    await central.waitForFunction(() => document.querySelector('textarea[aria-label="Memorando de avaliação do dia"]')?.value === 'Avaliação atualizada por outra pessoa');
    await central.getByRole('button', { name: 'Fechar detalhes do dia', exact: true }).click();
    const finance = await newPage(); await finance.clock.install({time:new Date('2026-11-25T15:00:00Z')});
    await open(finance,'calendar','finance');
    await finance.getByRole('button', { name: 'Cadastrar ou consultar feriado em 2026-11-03', exact: true }).click();
    assert.equal(await finance.getByRole('tab', { name:'Memorando',exact:true }).count(),0,'Financeiro não pode visualizar avaliações exclusivas da diretoria.');
    await a.reload(); await expectDays(a,21); await b.reload(); await expectDays(b,23);
    await central.getByLabel('Unidade do calendário').selectOption('all');
    const artifacts = path.resolve(__dirname, '../../.artifacts/holidays'); fs.mkdirSync(artifacts, { recursive: true });
    await a.screenshot({ path: path.join(artifacts, 'unit-approved-holiday.png'), fullPage: true });
    assert.equal(await central.getByRole('alert').count(), 0, 'A conferência deve carregar fechamentos e feriados sem erro.');
    await central.evaluate(() => document.documentElement.classList.add('dark'));
    await central.screenshot({ path: path.join(artifacts, 'central-calendar-dark.png'), fullPage: true });
    await central.getByRole('button', { name: 'Cadastrar ou consultar feriado em 2026-11-03', exact: true }).click();
    await central.getByLabel('Memorando de avaliação do dia').waitFor();
    await central.screenshot({path:path.join(artifacts,'calendar-memo-dark.png'),fullPage:true});
    await central.getByRole('button', { name: 'Fechar detalhes do dia', exact: true }).click();
    await central.setViewportSize({ width: 390, height: 844 });
    assert.equal(await central.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await central.screenshot({ path: path.join(artifacts, 'central-calendar-mobile.png'), fullPage: true });

    const cashClosingResponse = await fetch(`${base}/store-closings/holiday_a/2026-11-24`, {method:'PUT',headers:{Authorization:`Bearer ${tokens.root}`,'Content-Type':'application/json'},body:JSON.stringify({vendaTotal:1000,meiosPagamento:{dinheiro:500,pixKais:500},despesas:[{descricao:'Limpeza teste',valor:50,tipo:'despesa'},{descricao:'Depósito teste',valor:100,tipo:'deposito'}],memorando:''})});
    assert.equal(cashClosingResponse.status,200); const cashClosing=await cashClosingResponse.json();
    assert.equal((await fetch(`${base}/store-closings/${cashClosing.id}/review`,{method:'POST',headers:{Authorization:`Bearer ${tokens.root}`,'Content-Type':'application/json'},body:JSON.stringify({decision:'aprovado',note:''})})).status,200);
    const laterClosingResponse=await fetch(`${base}/store-closings/holiday_a/2026-11-30`,{method:'PUT',headers:{Authorization:`Bearer ${tokens.root}`,'Content-Type':'application/json'},body:JSON.stringify({vendaTotal:700,meiosPagamento:{dinheiro:700},despesas:[],memorando:''})});assert.equal(laterClosingResponse.status,200);const laterClosing=await laterClosingResponse.json();
    assert.equal((await fetch(`${base}/store-closings/${laterClosing.id}/review`,{method:'POST',headers:{Authorization:`Bearer ${tokens.root}`,'Content-Type':'application/json'},body:JSON.stringify({decision:'aprovado',note:''})})).status,200);
    const cashPage = await newPage();await cashPage.clock.install({time:new Date('2026-11-25T15:00:00Z')});
    await open(cashPage,'cash');
    const cashRow=cashPage.locator('tbody tr').filter({has:cashPage.getByText('Castro',{exact:true})});
    await cashRow.waitFor();
    const cashValue=await cashRow.locator('td').nth(4).innerText();assert.ok(cashValue.includes('1.875,00'));
    const conference=await newPage();await conference.clock.install({time:new Date('2026-11-25T15:00:00Z')});
    await open(conference,'conference');
    await conference.getByText('Castro',{exact:true}).click();
    const balanceSummary=conference.locator('[data-summary="cash-balance"]');
    await conference.waitForFunction(()=>document.querySelector('[data-summary="cash-balance"]')?.textContent.includes('1.175,00'));
    assert.ok((await balanceSummary.textContent()).includes('Saldo declarado'));
    await conference.getByText('3. Vale funcionário: Vale funcionário do dia', {exact:true}).waitFor();
    assert.ok((await conference.locator('[data-summary="sales-total"]').innerText()).includes('1.000,00'),'O saldo acumulado deve ser diferente do faturamento do fechamento.');
    assert.equal((await balanceSummary.innerText()).includes('Ticket Médio'),false,'Ticket e quantidade de vendas pertencem somente ao faturamento.');
    assert.ok((await balanceSummary.innerText()).includes('1.175,00'),'Saldo anterior (350) mais dinheiro do dia (1.000), menos despesa (50), depósito (100) e vale funcionário (25), excluindo o dia posterior aprovado.');
    assert.ok(cashValue.includes('1.875,00'),'O saldo mensal do Caixa inclui o dia posterior, enquanto a conferência respeita a data do fechamento.');
    for(let refresh=0;refresh<2;refresh++){await conference.reload();await conference.getByText('Castro',{exact:true}).click();await conference.waitForFunction(()=>document.querySelector('[data-summary="cash-balance"]')?.textContent.includes('1.175,00'));}
    assert.ok((await balanceSummary.innerText()).includes('1.175,00'),'Reabrir e atualizar não podem acumular o valor novamente.');
    assert.deepEqual(errors, []);
    console.log('Navegador local: solicitação, aprovação, isolamento de unidades, feriado geral, metas, histórico diário e cancelamento com recálculo verificados.');
  } finally { if (browser) await browser.close(); await vite.close(); }
};
