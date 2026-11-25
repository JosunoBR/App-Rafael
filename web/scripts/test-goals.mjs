import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import { createServer } from 'vite';
const require = createRequire(import.meta.url);
const webDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { readGoalsWorkbook } = require('../../scripts/generateGoalsData.js');
const XLSX = require('xlsx');
const source = path.resolve(webDir, '../VENDAS ANUAL ALS.xlsx');
const seed = require('../../backend/src/data/goalsWorkbookSeed.json');
const { sourceSheets, ...prepared } = seed;
const workbook = fs.existsSync(source) ? XLSX.readFile(source) : null;
const parsed = workbook ? readGoalsWorkbook(source) : prepared;
const server = await createServer({ root: webDir, server: { middlewareMode: true }, appType: 'custom' });
try {
  const calculations = await server.ssrLoadModule('/src/modules/goalsExecutive/utils/goalsCalculations.ts');
  const generated = prepared;
  const { valueForYear, superGoal, salesEvolution, suggestGoal, workingDays, nationalHolidays, profitEvolution, operatingProfitForYear, buildGoalRows } = calculations;
  assert.deepEqual(JSON.parse(JSON.stringify(generated)), parsed, 'Dados gerados devem corresponder ao arquivo atual; execute a importação novamente se a planilha mudou.');
  assert.equal(Object.keys(parsed.months).length, 12);
  assert.equal(Object.values(parsed.months).reduce((sum, month) => sum + month.stores.length, 0), 235);
  for (const month of Object.values(parsed.months)) {
    assert.equal(new Set(month.stores.map(store => store.id)).size, month.stores.length);
    for (const store of month.stores) {
      const goalCell = workbook ? workbook.Sheets['VENDAS ANUAL'][XLSX.utils.encode_cell({ r: store.sourceRow - 1, c: 9 })]?.v : sourceSheets['VENDAS ANUAL'][store.sourceRow - 1][9];
      assert.equal(store.spreadsheetGoal, typeof goalCell === 'number' ? goalCell : null, `Meta da coluna 10: ${store.name}, linha ${store.sourceRow}`);
      for (const { year, value } of store.sales) {
        const column = parsed.years.indexOf(year) + 2;
        const original = workbook ? workbook.Sheets['VENDAS ANUAL'][XLSX.utils.encode_cell({ r: store.sourceRow - 1, c: column })]?.v : sourceSheets['VENDAS ANUAL'][store.sourceRow - 1][column];
        assert.equal(value, typeof original === 'number' ? original : null, `Faturamento ${store.name}/${store.sourceRow}/${year}`);
      }
    }
  }
  assert.equal(superGoal(100000), 110000);
  assert.equal(superGoal(120000.55), 132000.61);
  assert.equal(superGoal(0), 0);
  assert.equal(superGoal(null), null);
  assert.equal(suggestGoal(103499), 111778.92);
  assert.equal(suggestGoal(1234.56), 1333.32);
  assert.equal(suggestGoal(0), 0, 'Zero informado deve continuar sendo zero.');
  assert.equal(suggestGoal(null), null, 'Célula vazia não deve receber meta inventada.');
  assert.equal(workingDays(2026, 11).count, 23); // 30 - 5 Sundays - Nov2 - Nov20; Nov15 already Sunday.
  assert.equal(workingDays(2025, 11).count, 23); // Nov15 and Nov20 excluded; Nov2 already Sunday.
  assert.equal(workingDays(2026, 4).count, 24); // Good Friday and Tiradentes.
  assert.equal(workingDays(2025, 4).count, 24); // Good Friday Apr18 and Tiradentes.
  assert.equal(workingDays(2026, 2).count, 24, 'Carnaval permanece na contagem.');
  assert.equal(workingDays(2026, 6).count, 26, 'Corpus Christi permanece na contagem.');
  assert.equal(workingDays(2024, 2).count, 25, 'Ano bissexto.');
  assert.equal(workingDays(2023, 11).count, 24, 'Consciência Negra ainda não era nacional.');
  assert.equal(workingDays(2024, 11).count, 23);
  assert.equal(workingDays(2021, 5).count, 25, 'Feriado no sábado também excluído.');
  assert.equal(nationalHolidays(2027)['03-26'], 'Sexta-feira Santa');
  assert.equal(nationalHolidays(2024)['03-29'], 'Sexta-feira Santa');
  assert.throws(() => workingDays(2026, 13));
  const january = buildGoalRows(parsed, '01', 2026);
  assert.equal(january.length, 20, 'Loja ausente no mês deve permanecer visível com indicação de ausência.');
  const irati = january.find(row => row.name === 'IRATI CENTRO');
  assert.equal(irati.previousSales, 103499);
  assert.equal(irati.suggestion, 111778.92);
  assert.equal(irati.currentSales, 143682);
  assert.equal(irati.dailySuggestion, Math.round(111778.92 / workingDays(2026, 1).count * 100) / 100);
  assert.equal(irati.profit.profits.find(item => item.year === 2025).value, sourceSheets['IRATI CENTRO'][12][5]);
  assert.equal(irati.evolution.comparisons, 2);
  const january2027 = buildGoalRows(parsed, '01', 2027).find(row => row.name === 'IRATI CENTRO');
  assert.equal(january2027.suggestion, 155176.56, 'Mudar ano deve mudar a base para o ano imediatamente anterior.');
  const november2027 = buildGoalRows(parsed, '11', 2027).find(row => row.name === 'IRATI CENTRO');
  assert.equal(november2027.suggestion, null, 'Não substituir base 2026 ausente por 2025.');
  assert.equal(january.find(row => row.name === 'P.G CENTRO').source, undefined);
  assert.equal(january.find(row => row.name === 'GUARAPUAVA').profit, undefined, 'Porto União não pode ser associado a outra loja por suposição.');
  assert.equal(parsed.costs.find(cost => cost.name === 'MALLET').reportedTotal, 18480);
  const sample = (sales, profits) => ({ sourceRow: 1, sales: sales.map(([year, value]) => ({ year, value })), profits: profits.map(([year, value]) => ({ year, value })) });
  const losses = profitEvolution(sample([[2021, 10], [2022, 20], [2023, 30]], [[2021, -100], [2022, -50], [2023, 50]]), 2024);
  assert.equal(losses.averageChange, 75);
  assert.equal(losses.averagePercent, 125, 'Melhora de prejuízo usa módulo da base.');
  const zeros = profitEvolution(sample([[2021, 10], [2022, 20]], [[2021, 0], [2022, 100]]), 2023);
  assert.equal(zeros.averageChange, 100);
  assert.equal(zeros.averagePercent, null, 'Divisão por zero não recebe percentual fictício.');
  const gaps = profitEvolution(sample([[2021, 10], [2022, null], [2023, 30]], [[2021, 100], [2022, -100], [2023, 300]]), 2024);
  assert.equal(gaps.comparisons, 0, 'Não comparar anos não consecutivos nem lucro calculado sobre receita ausente.');
  assert.equal(profitEvolution(irati.profit, 2023).history.length, 2, 'Análise histórica não pode usar lucros futuros.');
  const campoLargoNovember = parsed.profitSheets['CAMPO LARGO']['11'];
  for (const year of [2021, 2022, 2023, 2024]) {
    assert.equal(valueForProfit(year), null, `Campo Largo sem operação em novembro/${year} não deve exibir prejuízo.`);
  }
  function valueForProfit(year) { return operatingProfitForYear(campoLargoNovember, year); }
  assert.equal(operatingProfitForYear(campoLargoNovember, 2025), campoLargoNovember.profits.find(item => item.year === 2025).value);
  assert.ok(operatingProfitForYear(parsed.profitSheets['CASTRO CENTRO']['11'], 2021) < 0, 'Prejuízo com faturamento real deve permanecer.');
  const notOperating = sample([[2021, 0], [2022, null], [2023, 100]], [[2021, -30000], [2022, -30000], [2023, 1000]]);
  assert.equal(operatingProfitForYear(notOperating, 2021), null, 'Faturamento zero não gera prejuízo de operação inexistente.');
  assert.equal(profitEvolution(notOperating, 2024).comparisons, 0, 'Não usar o custo artificial antes da operação para calcular evolução.');

  const novaRussia = profitEvolution(parsed.profitSheets['NOVA RUSSIA']['12'], 2026);
  assert.equal(novaRussia.comparisons, 1);
  assert.ok(Math.abs(novaRussia.averagePercent - ((35374.08 - 37225.12) / 37225.12 * 100)) < 0.000001, 'Média usa somente os três anos anteriores exibidos, sem incluir 2022 nem preencher lucro de 2025 ausente.');
  const castroSales = parsed.months['12'].stores.find(store => store.name === 'CASTRO CENTRO').sales;
  const revenueEvolution = salesEvolution(castroSales, 2026);
  assert.equal(revenueEvolution.comparisons, 2);
  assert.ok(Math.abs(revenueEvolution.averagePercent - (((194418 - 79396.65) / 79396.65 * 100 + (195544 - 194418) / 194418 * 100) / 2)) < 0.000001);
  assert.notEqual(revenueEvolution.averagePercent, profitEvolution(parsed.profitSheets['CASTRO CENTRO']['12'], 2026).averagePercent);
  const goalsWorkbook = { ...parsed, goalHistory: [
    { storeId: 'irati_centro', year: 2025, month: 12, amount: 140000 },
    { storeId: 'irati_centro', year: 2024, month: 12, amount: 0 },
    { storeId: 'irati_centro', year: 2025, month: 11, amount: 999 },
    { storeId: 'castro_centro', year: 2025, month: 12, amount: 888 },
  ] };
  const periodGoals = buildGoalRows(goalsWorkbook, '12', 2026).find(row => row.id === 'irati_centro').goals;
  assert.equal(valueForYear(periodGoals, 2025), 140000, 'A meta deve pertencer à mesma unidade, mês e ano.');
  assert.equal(valueForYear(periodGoals, 2024), 0, 'Meta zero deve ser preservada.');
  assert.equal(valueForYear(periodGoals, 2023), null, 'Não usar a sugestão nem repetir a meta de outro ano.');
  const { getStoreDayStatus, calculateMonthWorkingDays } = await server.ssrLoadModule('/src/modules/storePortal/utils/storeCalendarUtils.ts');
  assert.equal(getStoreDayStatus('2026-12-25').isWorkingDay, false);
  assert.equal(getStoreDayStatus('2026-12-27').isWorkingDay, false);
  assert.equal(getStoreDayStatus('2026-12-26').isWorkingDay, true);
  assert.equal(getStoreDayStatus('2026-04-03').isWorkingDay, false);
  assert.equal(calculateMonthWorkingDays('2026-12').totalWorkingDays, workingDays(2026, 12).count);
  console.log('Metas: importação integral, células de origem, anos, +8%, lucros, feriados verificados.');
} finally { await server.close(); }

