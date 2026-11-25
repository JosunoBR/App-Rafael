const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const XLSX = require('../backend/node_modules/xlsx');
const SOURCE = path.resolve(__dirname, '../VENDAS ANUAL ALS.xlsx');
const MONTHS = ['JANEIRO', 'FEVEREIRO', 'MARCO', 'ABRIL', 'MAIO', 'JUNHO', 'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'];
const normalize = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toUpperCase();
// Only confirmed naming variations. PORTO UNIAO is deliberately not mapped to GUARAPUAVA.
const DETAIL_SHEETS = { 'IRATI TRAJANO': 'IRATI DEP.', TEIXEIRA: 'TEXAS', 'CASTRO BAIRRO': 'JAVERT' };
const COST_NAMES = { 'IRATI TRAJANO': 'IRATI DEPOSITO', TEIXEIRA: 'TEXAS', 'CASTRO BAIRRO': 'CASTRO JAVERT', PRUDE: 'PRUDENTOPOLIS' };
const numeric = value => typeof value === 'number' && Number.isFinite(value) ? value : null;
const idFor = name => normalize(name).toLowerCase().replace(/[^a-z0-9]+/g, '_');

function readGoalsWorkbook(source = SOURCE, includeSourceSheets = false) {
  const bytes = fs.readFileSync(source);
  const workbook = XLSX.read(bytes, { type: 'buffer' });
  const rowsFor = name => XLSX.utils.sheet_to_json(workbook.Sheets[name], { header: 1, defval: null });
  if (!workbook.Sheets['VENDAS ANUAL'] || !workbook.Sheets['CUSTOS POR LOJA']) throw new Error('Abas obrigatórias ausentes.');
  const annual = rowsFor('VENDAS ANUAL');
  const years = annual[1].map((value, column) => ({ year: numeric(value), column })).filter(({ year }) => year >= 2000 && year <= 2100);
  if (!years.length) throw new Error('Anos de faturamento não encontrados.');
  const history = (row, columns) => columns.map(({ year, column }) => ({ year, value: numeric(row?.[column]) }));
  const months = {};
  let activeMonth = null;
  for (let index = 2; index < annual.length; index++) {
    const row = annual[index];
    const name = normalize(row[0]);
    if (name.startsWith('MEDIA DE VENDA')) break;
    if (MONTHS.includes(name)) {
      activeMonth = String(MONTHS.indexOf(name) + 1).padStart(2, '0');
      months[activeMonth] = { sourceRow: index + 1, reportedTotals: history(row, years), stores: [] };
    } else if (activeMonth && name && !name.startsWith('TOTAL')) {
      months[activeMonth].stores.push({
        id: idFor(name), name: String(row[0]).trim(), sourceRow: index + 1,
        sales: history(row, years), breakEven: numeric(row[1]),
        spreadsheetGoal: numeric(row[9]), spreadsheetSuperGoal: numeric(row[10]),
        commission: numeric(row[11]), superCommission: numeric(row[12]),
        profitSheet: DETAIL_SHEETS[name] || (workbook.Sheets[String(row[0]).trim()] ? String(row[0]).trim() : null),
        costName: COST_NAMES[name] || name,
      });
    }
  }
  if (Object.keys(months).length !== 12) throw new Error('A importação precisa conter os 12 meses.');
  const profitSheets = {};
  for (const sheetName of workbook.SheetNames.filter(name => !['VENDAS ANUAL', 'CUSTOS POR LOJA'].includes(name))) {
    const rows = rowsFor(sheetName);
    const sheetMonths = {};
    for (let index = 0; index < rows.length; index++) {
      for (const offset of [0, 7]) {
        const month = MONTHS.indexOf(normalize(rows[index][offset]));
        if (month < 0 || numeric(rows[index][offset + 1]) !== 2021) continue;
        const columns = rows[index].map((value, column) => ({ year: numeric(value), column }))
          .filter(({ year, column }) => column > offset && column <= offset + 5 && year >= 2000 && year <= 2100);
        let profitRow;
        for (let next = index + 2; next < Math.min(index + 12, rows.length); next++) {
          if (normalize(rows[next][offset]) === 'LUCRO LIQUIDO') profitRow = next;
        }
        if (profitRow === undefined) throw new Error(`Lucro não encontrado: ${sheetName}, mês ${month + 1}.`);
        sheetMonths[String(month + 1).padStart(2, '0')] = {
          sourceRow: profitRow + 1, sales: history(rows[index + 1], columns), profits: history(rows[profitRow], columns),
        };
      }
    }
    profitSheets[sheetName] = sheetMonths;
  }
  const costs = [];
  const costRows = rowsFor('CUSTOS POR LOJA');
  for (let index = 0; index < costRows.length - 1; index++) {
    for (const offset of [0, 3]) {
      if (normalize(costRows[index + 1][offset]) !== 'DESPESA') continue;
      const name = normalize(costRows[index][offset]);
      if (!name) continue;
      const items = [];
      let reportedTotal = null;
      for (let next = index + 2; next < costRows.length; next++) {
        const label = normalize(costRows[next][offset]);
        if (label === 'TOTAL') { reportedTotal = numeric(costRows[next][offset + 1]); break; }
        if (label) items.push({ name: label, value: numeric(costRows[next][offset + 1]) });
      }
      costs.push({ name, sourceRow: index + 1, items, reportedTotal });
    }
  }
  return { filename: path.basename(source), sha256: crypto.createHash('sha256').update(bytes).digest('hex'), years: years.map(({ year }) => year), months, profitSheets, costs,
    ...(includeSourceSheets ? { sourceSheets: Object.fromEntries(workbook.SheetNames.map(name => [name, rowsFor(name)])) } : {}),
  };
}

if (require.main === module) {
  const data = readGoalsWorkbook(SOURCE, true);
  const output = path.resolve(__dirname, '../backend/src/data/goalsWorkbookSeed.json');
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, JSON.stringify(data) + '\n');
  console.log(`Importados ${Object.keys(data.months).length} meses, ${Object.values(data.months).reduce((sum, month) => sum + month.stores.length, 0)} registros mensais e ${Object.keys(data.profitSheets).length} abas de lucro.`);
}
module.exports = { readGoalsWorkbook };
