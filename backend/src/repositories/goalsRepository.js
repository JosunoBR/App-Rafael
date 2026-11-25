const { randomUUID } = require('node:crypto');
const { queryAll, queryOne, execute, withTransaction } = require('../config/database');
const importMetadata = require('../data/goalsImportMetadata.json');
const normalize = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/gi, '').toUpperCase();
const SOURCE_ALIASES = {
  'IRATI TRAJANO': ['TRAJANO'], TEIXEIRA: ['TEIXEIRA SOARES'], 'CASTRO CENTRO': ['CASTRO'],
  'CASTRO BAIRRO': ['JAVERT'], PRUDE: ['PRUDENTOPOLIS'], 'P.G CENTRO': ['PONTA GROSSA CENTRO', 'PG CENTRO'],
};
function matchStore(sourceName, stores) {
  const candidates = [sourceName, ...(SOURCE_ALIASES[sourceName] || [])].map(normalize);
  const matches = stores.filter(store => [store.name, store.shortName].some(name => name && candidates.includes(normalize(name))));
  if (matches.length > 1) throw fail('Nomes de unidades ambíguos no cadastro. Corrija o cadastro para permitir a vinculação automática.', 409);
  return matches.length === 1 ? matches[0].id : null;
}
const fail = (message, status = 400) => Object.assign(new Error(message), { status });
async function audit(action, actor, storeId, year, month, before, after) {
  await execute('INSERT INTO store_goal_audit(id,action,actorId,storeId,year,month,beforeJson,afterJson,createdAt) VALUES(?,?,?,?,?,?,?,?,?)',
    [randomUUID(), action, actor, storeId, year, month, JSON.stringify(before), JSON.stringify(after), new Date().toISOString()]);
}

async function importWorkbook(data, actorId = 'system:goals-import') {
  return withTransaction(async () => {
    const existing = await queryOne('SELECT id FROM goal_imports WHERE id = ?', [data.sha256]);
    if (existing) return { imported: false, id: existing.id };
    const stores = await queryAll('SELECT id,name,shortName FROM stores');
    const previousLinks = await queryAll('SELECT l.sourceKey,l.storeId FROM goal_store_links l JOIN goal_imports i ON i.id = l.importId WHERE i.active = 1');
    await execute('UPDATE goal_imports SET active = 0 WHERE active = 1');
    await execute('INSERT INTO goal_imports(id,filename,importedAt,importedBy,yearsJson,active) VALUES(?,?,?,?,?,1)',
      [data.sha256, data.filename, new Date().toISOString(), actorId, JSON.stringify(data.years)]);
    for (const [sheetName, rows] of Object.entries(data.sourceSheets || {})) {
      await execute('INSERT INTO goal_source_sheets(importId,sheetName,rowsJson) VALUES(?,?,?)', [data.sha256, sheetName, JSON.stringify(rows)]);
    }
    const identities = new Map();
    Object.values(data.months).forEach(month => month.stores.forEach(store => identities.set(store.id, store)));
    for (const store of identities.values()) {
      const previousStoreId = previousLinks.find(link => link.sourceKey === store.id)?.storeId;
      const storeId = stores.some(registered => registered.id === previousStoreId) ? previousStoreId : matchStore(store.name, stores);
      await execute('INSERT INTO goal_store_links(importId,sourceKey,sourceName,storeId,profitSheet,costName) VALUES(?,?,?,?,?,?)',
        [data.sha256, store.id, store.name, storeId, store.profitSheet, store.costName]);
    }
    for (const [month, values] of Object.entries(data.months)) {
      for (const total of values.reportedTotals) {
        await execute('INSERT INTO goal_monthly_totals(importId,month,year,amount,sourceRow) VALUES(?,?,?,?,?)', [data.sha256, Number(month), total.year, total.value, values.sourceRow]);
      }
      for (const store of values.stores) {
        await execute('INSERT INTO goal_monthly_baselines(importId,sourceKey,month,sourceRow,breakEven,spreadsheetGoal,spreadsheetSuperGoal,commission,superCommission) VALUES(?,?,?,?,?,?,?,?,?)',
          [data.sha256, store.id, Number(month), store.sourceRow, store.breakEven, store.spreadsheetGoal, store.spreadsheetSuperGoal, store.commission, store.superCommission]);
        for (const sale of store.sales) {
          await execute('INSERT INTO goal_sales_history(importId,sourceKey,month,year,amount,sourceRow) VALUES(?,?,?,?,?,?)', [data.sha256, store.id, Number(month), sale.year, sale.value, store.sourceRow]);
        }
      }
    }
    for (const [sheetName, months] of Object.entries(data.profitSheets)) {
      for (const [month, values] of Object.entries(months)) {
        for (const profit of values.profits) {
          const sales = values.sales.find(value => value.year === profit.year)?.value ?? null;
          await execute('INSERT INTO goal_profit_history(importId,sheetName,month,year,amount,salesAmount,sourceRow) VALUES(?,?,?,?,?,?,?)', [data.sha256, sheetName, Number(month), profit.year, profit.value, sales, values.sourceRow]);
        }
      }
    }
    for (const cost of data.costs) {
      await execute('INSERT INTO goal_cost_centers(importId,name,sourceRow,reportedTotal) VALUES(?,?,?,?)', [data.sha256, cost.name, cost.sourceRow, cost.reportedTotal]);
      for (const item of cost.items) {
        await execute('INSERT INTO goal_cost_items(importId,costName,itemName,amount) VALUES(?,?,?,?)', [data.sha256, cost.name, item.name, item.value]);
      }
    }
    await audit('import', actorId, null, null, null, null, { importId: data.sha256, monthlyRecords: Object.values(data.months).reduce((sum, month) => sum + month.stores.length, 0) });
    return { imported: true, id: data.sha256 };
  });
}

async function reconcileStoreLinks() {
  return withTransaction(async () => {
    const stores = await queryAll('SELECT id,name,shortName FROM stores');
    const links = await queryAll('SELECT l.* FROM goal_store_links l JOIN goal_imports i ON i.id=l.importId WHERE i.active=1');
    const occupied = new Set(links.filter(link => link.storeId).map(link => link.storeId));
    for (const link of links.filter(item => !item.storeId)) {
      const storeId = matchStore(link.sourceName, stores);
      if (!storeId) continue;
      if (occupied.has(storeId)) throw fail('Mais de um registro de histórico corresponde à mesma unidade. Revise os nomes no cadastro de unidades.', 409);
      await execute('UPDATE goal_store_links SET storeId=? WHERE importId=? AND sourceKey=?', [storeId, link.importId, link.sourceKey]);
      occupied.add(storeId);
      await audit('automatic-store-link', 'system:store-registry', storeId, null, null, null, { sourceKey: link.sourceKey });
    }
  });
}

async function findWorkbook() {
  return withTransaction(async () => {
    await reconcileStoreLinks();
    const imported = await queryOne('SELECT * FROM goal_imports WHERE active = 1');
    if (!imported) return null;
    const params = [imported.id];
    const registeredStores = await queryAll('SELECT id,name,shortName,active FROM stores ORDER BY name');
    const links = await queryAll('SELECT * FROM goal_store_links WHERE importId = ?', params);
    const linkMap = new Map(links.map(link => [link.sourceKey, link]));
    const sales = await queryAll('SELECT * FROM goal_sales_history WHERE importId = ? ORDER BY year', params);
    const baselines = await queryAll('SELECT * FROM goal_monthly_baselines WHERE importId = ? ORDER BY sourceRow', params);
    const totals = await queryAll('SELECT * FROM goal_monthly_totals WHERE importId = ? ORDER BY year', params);
    const months = {};
    for (let month = 1; month <= 12; month++) {
      const key = String(month).padStart(2, '0');
      const monthTotals = totals.filter(total => total.month === month);
      months[key] = { sourceRow: monthTotals[0]?.sourceRow ?? 0, reportedTotals: monthTotals.map(total => ({ year: total.year, value: total.amount })), stores: baselines.filter(row => row.month === month).map(row => {
        const link = linkMap.get(row.sourceKey);
        return { id: row.sourceKey, name: link.sourceName, storeId: link.storeId, sourceRow: row.sourceRow,
          sales: sales.filter(sale => sale.month === month && sale.sourceKey === row.sourceKey).map(sale => ({ year: sale.year, value: sale.amount })),
          breakEven: row.breakEven, spreadsheetGoal: row.spreadsheetGoal, spreadsheetSuperGoal: row.spreadsheetSuperGoal,
          commission: row.commission, superCommission: row.superCommission, profitSheet: link.profitSheet, costName: link.costName };
      }) };
    }
    // Fechamentos aprovados substituem a estimativa importada no mesmo mês/ano.
    const actualSales = await queryAll(`SELECT storeId,substr(closingDate,1,4) AS year,
      CAST(substr(closingDate,6,2) AS INTEGER) AS month,SUM(salesCents) AS amountCents
      FROM store_daily_closings WHERE status='aprovado'
      GROUP BY storeId,substr(closingDate,1,7)`);
    const years = new Set(JSON.parse(imported.yearsJson));
    for (const actual of actualSales) {
      const key = String(actual.month).padStart(2, '0');
      let store = months[key].stores.find(item => item.storeId === actual.storeId);
      if (!store) {
        const registered = registeredStores.find(item => item.id === actual.storeId);
        if (!registered) continue;
        store = { id: `live:${actual.storeId}`, name: registered.name, storeId: actual.storeId,
          sourceRow: 0, sales: [], breakEven: null, spreadsheetGoal: null,
          spreadsheetSuperGoal: null, commission: null, superCommission: null,
          profitSheet: null, costName: '' };
        months[key].stores.push(store);
      }
      store.sales = store.sales.filter(item => item.year !== Number(actual.year));
      store.sales.push({ year: Number(actual.year), value: actual.amountCents / 100 });
      years.add(Number(actual.year));
    }
    const profits = await queryAll('SELECT * FROM goal_profit_history WHERE importId = ? ORDER BY year', params);
    const profitSheets = {};
    for (const profit of profits) {
      const sheet = profitSheets[profit.sheetName] ??= {};
      const entry = sheet[String(profit.month).padStart(2, '0')] ??= { sourceRow: profit.sourceRow, sales: [], profits: [] };
      entry.sales.push({ year: profit.year, value: profit.salesAmount });
      entry.profits.push({ year: profit.year, value: profit.amount });
    }
    const centers = await queryAll('SELECT * FROM goal_cost_centers WHERE importId = ?', params);
    const items = await queryAll('SELECT * FROM goal_cost_items WHERE importId = ?', params);
    const costs = centers.map(center => ({ name: center.name, sourceRow: center.sourceRow, reportedTotal: center.reportedTotal,
      items: items.filter(item => item.costName === center.name).map(item => ({ name: item.itemName, value: item.amount })) }));
    const sourceSheetNames = (await queryAll('SELECT sheetName FROM goal_source_sheets WHERE importId = ? ORDER BY sheetName', params)).map(row => row.sheetName);
    // The annual sheet has no year on its goal column. Its 2026 attribution was
    // confirmed by the owner and applies only to this exact imported file.
    const goalYear = importMetadata[imported.id]?.goalYear;
    const goalsByPeriod = new Map();
    for (const goal of await queryAll('SELECT storeId,year,month,amountCents FROM store_goals ORDER BY year,month,storeId')) {
      goalsByPeriod.set(`${goal.storeId}:${goal.year}:${goal.month}`, { storeId: goal.storeId, year: goal.year, month: goal.month, amount: goal.amountCents === null ? null : goal.amountCents / 100 });
    }
    // Historical comparisons use column 10 of the imported sheet for its confirmed year.
    if (Number.isInteger(goalYear)) for (const baseline of baselines) {
      const storeId = linkMap.get(baseline.sourceKey)?.storeId;
      if (!storeId || baseline.spreadsheetGoal === null) continue;
      goalsByPeriod.set(`${storeId}:${goalYear}:${baseline.month}`, { storeId, year: goalYear, month: baseline.month, amount: baseline.spreadsheetGoal });
    }
    const goalHistory = [...goalsByPeriod.values()];
    return { filename: imported.filename, sha256: imported.id, importedAt: imported.importedAt, years: [...years].sort((a,b) => a-b), months, profitSheets, costs, registeredStores, goalHistory,
      calendarClosures: await queryAll("SELECT id,storeId,holidayDate AS date,name FROM store_holidays WHERE status='aprovado' AND action='fechar' ORDER BY holidayDate"),
      sourceSheetNames, storeLinks: links.map(link => ({ sourceKey: link.sourceKey, sourceName: link.sourceName, storeId: link.storeId })) };
  });
}

async function savePlans(year, month, plans, actor) {
  return withTransaction(async () => {
    const saved = [];
    for (const plan of plans) {
      const store = await queryOne('SELECT id FROM stores WHERE id = ?', [plan.storeId]);
      if (!store) throw fail('Loja não encontrada no cadastro.');
      const previous = await queryOne('SELECT * FROM store_goals WHERE storeId = ? AND year = ? AND month = ?', [plan.storeId, year, month]);
      if ((previous?.version ?? 0) !== plan.version) throw fail('Esta meta foi alterada por outro usuário. Recarregue os valores antes de salvar novamente.', 409);
      const cents = plan.amount === null ? null : Math.round((plan.amount + Number.EPSILON) * 100);
      const nextVersion = (previous?.version ?? 0) + 1;
      await execute(`INSERT INTO store_goals(storeId,year,month,amountCents,version,updatedBy,updatedAt) VALUES(?,?,?,?,?,?,?)
        ON CONFLICT(storeId,year,month) DO UPDATE SET amountCents=excluded.amountCents,version=excluded.version,updatedBy=excluded.updatedBy,updatedAt=excluded.updatedAt`,
      [plan.storeId, year, month, cents, nextVersion, actor, new Date().toISOString()]);
      await audit('save-goal', actor, plan.storeId, year, month, previous?.amountCents ?? null, cents);
      saved.push({ storeId: plan.storeId, amount: cents === null ? null : cents / 100, version: nextVersion });
    }
    return saved;
  });
}
async function getPlans(year, month) {
  const rows = await queryAll('SELECT storeId,amountCents,version FROM store_goals WHERE year = ? AND month = ?', [year, month]);
  return rows.map(row => ({ storeId: row.storeId, amount: row.amountCents === null ? null : row.amountCents / 100, version: row.version }));
}
async function linkStore(importId, sourceKey, storeId, actor) {
  return withTransaction(async () => {
    const source = await queryOne('SELECT * FROM goal_store_links WHERE importId = ? AND sourceKey = ?', [importId, sourceKey]);
    if (!source) throw fail('Registro da planilha não encontrado.', 404);
    if (storeId !== null && !await queryOne('SELECT id FROM stores WHERE id = ?', [storeId])) throw fail('Loja não encontrada.');
    if (storeId !== null && await queryOne('SELECT sourceKey FROM goal_store_links WHERE importId = ? AND storeId = ? AND sourceKey != ?', [importId, storeId, sourceKey])) throw fail('Esta loja já está vinculada a outro registro da planilha.', 409);
    await execute('UPDATE goal_store_links SET storeId = ? WHERE importId = ? AND sourceKey = ?', [storeId, importId, sourceKey]);
    await audit('link-store', actor, storeId, null, null, { sourceKey, storeId: source.storeId }, { sourceKey, storeId });
  });
}
async function getSourceSheet(name) {
  const row = await queryOne('SELECT rowsJson FROM goal_source_sheets s JOIN goal_imports i ON i.id = s.importId WHERE i.active = 1 AND s.sheetName = ?', [name]);
  if (!row) throw fail('Aba do histórico não encontrada.', 404);
  return JSON.parse(row.rowsJson);
}
module.exports = { importWorkbook, findWorkbook, savePlans, getPlans, linkStore, matchStore, getSourceSheet };
