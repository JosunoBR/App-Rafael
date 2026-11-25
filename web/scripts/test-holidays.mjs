import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { createServer } from 'vite';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const server = await createServer({ root: fileURLToPath(new URL('..', import.meta.url)), server: { middlewareMode: true }, appType: 'custom' });
try {
  const { workingDays, buildGoalRows } = await server.ssrLoadModule('/src/modules/goalsExecutive/utils/goalsCalculations.ts');
  const { calculateMonthWorkingDays, getStoreDayStatus } = await server.ssrLoadModule('/src/modules/storePortal/utils/storeCalendarUtils.ts');
  const seed = require('../../backend/src/data/goalsWorkbookSeed.json');
  const unit = buildGoalRows(seed, '11', 2026).find(row => row.previousSales > 0);
  const closures = [
    { id: 'global', storeId: null, date: '2026-11-03', name: 'Rede' },
    { id: 'local', storeId: unit.id, date: '2026-11-04', name: 'Local' },
    { id: 'overlap', storeId: null, date: '2026-11-20', name: 'Sobreposição nacional' },
    { id: 'sunday', storeId: unit.id, date: '2026-11-08', name: 'Domingo' },
  ];
  assert.equal(workingDays(2026, 11).count, 23);
  assert.equal(workingDays(2026, 11, closures).count, 22);
  assert.equal(workingDays(2026, 11, closures, unit.id).count, 21);
  assert.equal(workingDays(2026, 11, closures, 'other').count, 22);
  const updated = buildGoalRows({ ...seed, calendarClosures: closures }, '11', 2026).find(row => row.id === unit.id);
  assert.equal(updated.workingDays, 21);
  assert.equal(updated.suggestion, unit.suggestion, 'Feriados não alteram a sugestão mensal de +8%.');
  assert.equal(updated.dailySuggestion, Math.round((updated.suggestion / 21 + Number.EPSILON) * 100) / 100);
  const marked = Object.fromEntries(closures.map(row => [row.date, { date: row.date, holidayName: row.name, status: 'aprovado' }]));
  const portal = calculateMonthWorkingDays('2026-11', '2026-11-01', marked);
  assert.equal(portal.totalWorkingDays, 21);
  assert.equal(portal.remainingWorkingDays, 21, 'A data de referência deve ser respeitada, independente do relógio do teste.');
  assert.equal(calculateMonthWorkingDays('2026-11', '2026-12-01', marked).remainingWorkingDays, 0);
  assert.equal(getStoreDayStatus('2026-11-04', { '2026-11-04': { ...marked['2026-11-04'], status: 'declarado' } }).isWorkingDay, true, 'Solicitação não aprovada não desconta o dia.');
  assert.equal(getStoreDayStatus('2027-03-26').isWorkingDay, false, 'Data móvel deve funcionar em outros anos.');
  for (let year = 2021; year <= 2035; year++) for (let month = 1; month <= 12; month++) {
    const key = `${year}-${String(month).padStart(2,'0')}`;
    assert.equal(calculateMonthWorkingDays(key, `${key}-01`).totalWorkingDays, workingDays(year, month).count, `Calendários devem concordar em ${key}.`);
  }
  const fullMonth = Array.from({ length: 30 }, (_, index) => ({ id: `day-${index}`, storeId: unit.id, date: `2026-11-${String(index+1).padStart(2,'0')}`, name: 'Fechamento' }));
  assert.equal(buildGoalRows({ ...seed, calendarClosures: fullMonth }, '11', 2026).find(row => row.id === unit.id).dailySuggestion, null, 'Mês sem dias úteis não pode produzir infinito.');
  console.log('Calendário: domingos, feriados móveis, sobreposições, escopos, meta diária por unidade, pendências, zero dias e concordância entre metas e portal de 2021 a 2035 verificados.');
} finally { await server.close(); }
