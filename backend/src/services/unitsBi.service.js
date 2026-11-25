const { withTransaction, queryAll } = require('../config/database');
const goals = require('../repositories/goalsRepository');
const { ensureSeed } = require('./goals.service');

function latestHistoryPeriod(history, currentPeriod) {
  const periods = [];
  for (const [month, data] of Object.entries(history.months)) {
    for (const store of data.stores) {
      if (!store.storeId) continue;
      for (const sale of store.sales) {
        const period = `${sale.year}-${month}`;
        if (sale.value !== null && period <= currentPeriod) periods.push(period);
      }
    }
  }
  return periods.sort().at(-1) ?? currentPeriod;
}
async function getUnitsBi(requestedPeriod) {
  if (requestedPeriod !== undefined && (typeof requestedPeriod !== 'string' || !/^20\d{2}-(0[1-9]|1[0-2])$/.test(requestedPeriod))) {
    throw Object.assign(new Error('Informe um mês e ano válidos.'), { status: 400 });
  }
  await ensureSeed();
  return withTransaction(async () => {
    const history = await goals.findWorkbook();
    const today = new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Sao_Paulo' }).format(new Date());
    const latestClosing = await queryAll("SELECT MAX(substr(closingDate,1,7)) AS period FROM store_daily_closings WHERE status='aprovado' AND closingDate <= ?", [today]);
    const latestHistory = latestHistoryPeriod(history, today.slice(0, 7));
    const latestPeriod = [latestHistory, latestClosing[0]?.period].filter(Boolean).sort().at(-1);
    const period = requestedPeriod ?? latestPeriod;
    const [year, month] = period.split('-').map(Number);
    const plans = await goals.getPlans(year, month);
    const closings = await queryAll(`SELECT storeId,closingDate,salesCents,salesCount,cashCents,pixKaisCents,pixStoneCents,pixCnpjCents,debitCents,creditCents
      FROM store_daily_closings WHERE status='aprovado' AND closingDate LIKE ? ORDER BY closingDate,storeId`, [`${period}-%`]);
    return { period, latestPeriod, history: { ...history, costs: [], sourceSheetNames: [] }, plans, closings };
  });
}
module.exports = { getUnitsBi, latestHistoryPeriod };
