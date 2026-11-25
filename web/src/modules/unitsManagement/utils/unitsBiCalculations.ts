import type { GoalsWorkbook } from '../../goalsExecutive/types/goalsSpreadsheet.types';
import type { SavedGoal } from '../../goalsExecutive/utils/goalsApi';
import { buildGoalRows, operatingProfitForYear, roundMoney } from '../../goalsExecutive/utils/goalsCalculations';

export interface BiClosing {
  storeId: string; closingDate: string; salesCents: number; salesCount: number | null;
  cashCents: number; pixKaisCents: number; pixStoneCents: number; pixCnpjCents: number; debitCents: number; creditCents: number;
}
export interface UnitsBiResponse { period: string; latestPeriod: string; history: GoalsWorkbook; plans: SavedGoal[]; closings: BiClosing[] }
export const sumKnown = (values: (number | null)[]) => values.some(value => value !== null) ? roundMoney(values.reduce<number>((sum, value) => sum + (value ?? 0), 0)) : null;
export const changePercent = (current: number | null, previous: number | null) => current === null || previous === null || previous === 0 ? null : (current - previous) / Math.abs(previous) * 100;

export function buildUnitsBi(data: UnitsBiResponse) {
  const [year, month] = data.period.split('-').map(Number);
  const monthKey = String(month).padStart(2, '0');
  const registered = new Set(data.history.registeredStores?.map(store => store.id));
  const closings = data.closings.filter(closing => closing.closingDate.startsWith(`${data.period}-`) && registered.has(closing.storeId));
  const rows = buildGoalRows(data.history, monthKey, year).map(row => {
    const approved = closings.filter(closing => closing.storeId === row.id);
    // Historical monthly totals and daily closings can describe the same sales.
    // Prefer the monthly record; never add the two sources together.
    const sales = row.currentSales ?? (approved.length ? roundMoney(approved.reduce((sum, closing) => sum + closing.salesCents, 0) / 100) : null);
    const savedGoal = data.plans.find(plan => plan.storeId === row.id)?.amount ?? null;
    const goal = savedGoal ?? row.suggestion;
    return { ...row, sales, salesSource: row.currentSales !== null ? 'Histórico mensal' : approved.length ? 'Fechamentos aprovados' : null,
      profitValue: operatingProfitForYear(row.profit, year), goal, goalSource: savedGoal !== null ? 'Meta salva' : row.suggestion !== null ? 'Sugestão +8%' : null,
      growth: changePercent(sales, row.previousSales), achievement: sales !== null && goal !== null && goal > 0 ? sales / goal * 100 : null };
  }).sort((a, b) => a.sales === null ? b.sales === null ? a.name.localeCompare(b.name, 'pt-BR') : 1 : b.sales === null ? -1 : b.sales - a.sales || a.name.localeCompare(b.name, 'pt-BR'));
  const matched = rows.filter(row => row.sales !== null && row.previousSales !== null);
  const goalMatched = rows.filter(row => row.sales !== null && row.goal !== null && row.goal > 0);
  const goalMatchedSales = sumKnown(goalMatched.map(row => row.sales));
  const goalMatchedTotal = sumKnown(goalMatched.map(row => row.goal));
  const comparison = data.history.years.map(comparisonYear => {
    const values = comparisonYear === year ? rows.map(row => row.sales) : buildGoalRows(data.history, monthKey, comparisonYear).map(row => row.currentSales);
    return { year: comparisonYear, total: sumKnown(values), coverage: values.filter(value => value !== null).length };
  });
  const annual = Array.from({ length: 12 }, (_, index) => {
    const values = index + 1 === month ? rows.map(row => row.sales) : buildGoalRows(data.history, String(index + 1).padStart(2, '0'), year).map(row => row.currentSales);
    return { month: index + 1, total: sumKnown(values), coverage: values.filter(value => value !== null).length };
  });
  const dailyMap = new Map<string, number>();
  closings.forEach(closing => dailyMap.set(closing.closingDate, (dailyMap.get(closing.closingDate) ?? 0) + closing.salesCents));
  let accumulatedCents = 0;
  const daily = [...dailyMap].sort(([a], [b]) => a.localeCompare(b)).map(([date, cents]) => {
    accumulatedCents += cents;
    return { date, sales: cents / 100, accumulated: accumulatedCents / 100 };
  });
  const paymentFields = [
    { key: 'cashCents', label: 'Dinheiro', color: 'bg-emerald-500' },
    { key: 'pixKaisCents', label: 'Pix Kais', color: 'bg-teal-500' },
    { key: 'pixStoneCents', label: 'Pix Stone', color: 'bg-cyan-500' },
    { key: 'pixCnpjCents', label: 'Pix CNPJ', color: 'bg-sky-500' },
    { key: 'debitCents', label: 'Cartão de débito', color: 'bg-indigo-500' },
    { key: 'creditCents', label: 'Cartão de crédito', color: 'bg-purple-500' },
  ] as const;
  const paymentTotal = closings.reduce((sum, closing) => sum + paymentFields.reduce((value, field) => value + closing[field.key], 0), 0);
  const payments = paymentFields.map(field => { const cents = closings.reduce((sum, closing) => sum + closing[field.key], 0); return { ...field, value: cents / 100, percent: paymentTotal > 0 ? cents / paymentTotal * 100 : null }; });
  return { year, month, rows, comparison, annual, daily, payments, closingCount: closings.length,
    sales: sumKnown(rows.map(row => row.sales)), profit: sumKnown(rows.map(row => row.profitValue)), goal: sumKnown(rows.map(row => row.goal)),
    salesCoverage: rows.filter(row => row.sales !== null).length, profitCoverage: rows.filter(row => row.profitValue !== null).length,
    goalCoverage: rows.filter(row => row.goal !== null).length, matchedCoverage: matched.length,
    growth: changePercent(sumKnown(matched.map(row => row.sales)), sumKnown(matched.map(row => row.previousSales))),
    achievement: goalMatchedSales !== null && goalMatchedTotal !== null && goalMatchedTotal > 0 ? goalMatchedSales / goalMatchedTotal * 100 : null,
    achievementCoverage: goalMatched.length,
  };
}
export type UnitsBiAnalysis = ReturnType<typeof buildUnitsBi>;
