import { nationalHolidays } from '../../../shared/nationalHolidays';
export { nationalHolidays } from '../../../shared/nationalHolidays';
import type { AnnualValue, GoalsWorkbook, ProfitMonth, SpreadsheetStore } from '../types/goalsSpreadsheet.types';

export const roundMoney = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;
export const valueForYear = (history: AnnualValue[], year: number): number | null => history.find(item => item.year === year)?.value ?? null;
export const superGoal = (goal: number | null): number | null => goal === null ? null : roundMoney(goal * 1.10);
export const suggestGoal = (previousSales: number | null): number | null => previousSales === null ? null : roundMoney(previousSales * 1.08);

// Calendar dedicated to executive planning. The store portal has a different rule
// (operator-approved closures), so it must not be reused for this calculation.
// Official calendar: https://agenciagov.ebc.com.br/noticias/202512/confira-o-calendario-oficial-de-feriados-nacionais-e-pontos-facultativos-em-2026

export function workingDays(year: number, month: number) {
  if (!Number.isInteger(year) || year < 1900 || year > 2100 || !Number.isInteger(month) || month < 1 || month > 12) throw new Error('Período inválido.');
  const holidays = nationalHolidays(year);
  const days = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const excludedHolidays: { date: string; name: string; alreadySunday: boolean }[] = [];
  let count = 0;
  for (let day = 1; day <= days; day++) {
    const date = new Date(Date.UTC(year, month - 1, day));
    const isoDate = date.toISOString().slice(0, 10);
    const holiday = holidays[isoDate.slice(5)];
    const sunday = date.getUTCDay() === 0;
    if (holiday) excludedHolidays.push({ date: isoDate, name: holiday, alreadySunday: sunday });
    if (!sunday && !holiday) count++;
  }
  return { count, holidays: excludedHolidays };
}

export function operatingProfitForYear(profit: ProfitMonth | undefined, year: number): number | null {
  const sales = valueForYear(profit?.sales ?? [], year);
  return sales === null || sales <= 0 ? null : valueForYear(profit?.profits ?? [], year);
}

export function profitEvolution(profit: ProfitMonth | undefined, targetYear: number) {
  return annualEvolution((profit?.profits ?? []).map(item => ({ ...item, value: operatingProfitForYear(profit, item.year) })), targetYear);
}

export function salesEvolution(sales: AnnualValue[], targetYear: number) {
  return annualEvolution(sales.map(item => ({ ...item, value: item.value !== null && item.value > 0 ? item.value : null })), targetYear);
}

function annualEvolution(values: AnnualValue[], targetYear: number) {
  const history = values.filter(item => item.year >= targetYear - 3 && item.year < targetYear);
  const differences: number[] = [];
  const percentages: number[] = [];
  for (const current of history) {
    const previous = valueForYear(history, current.year - 1);
    if (current.value === null || previous === null) continue;
    differences.push(current.value - previous);
    if (previous !== 0) percentages.push((current.value - previous) / Math.abs(previous) * 100);
  }
  return {
    history,
    averageChange: differences.length ? roundMoney(differences.reduce((sum, value) => sum + value, 0) / differences.length) : null,
    averagePercent: percentages.length ? percentages.reduce((sum, value) => sum + value, 0) / percentages.length : null,
    comparisons: differences.length,
    percentComparisons: percentages.length,
  };
}

export function buildGoalRows(workbook: GoalsWorkbook, month: string, targetYear: number) {
  const currentDays = workingDays(targetYear, Number(month));
  const previousDays = workingDays(targetYear - 1, Number(month));
  // Use the union so a new store introduced in a later month remains visible,
  // while missing monthly records remain explicitly absent rather than zero.
  const allStores = new Map<string, SpreadsheetStore>();
  Object.values(workbook.months).forEach(period => period.stores.forEach(store => allStores.set(store.id, store)));
  const identities = workbook.registeredStores ? workbook.registeredStores.map(registered => {
    const original = [...allStores.values()].find(store => store.storeId === registered.id);
    return { ...(original ?? { id: registered.id, name: registered.name, sourceRow: 0, sales: [], breakEven: null, spreadsheetGoal: null, spreadsheetSuperGoal: null, commission: null, superCommission: null, profitSheet: null, costName: '' }),
      id: registered.id, name: registered.name, sourceKey: original?.id ?? null, sourceName: original?.name ?? null, active: registered.active };
  }) : [...allStores.values()].map(store => ({ ...store, sourceKey: store.id, sourceName: store.name, active: true }));
  return identities.map(identity => {
    const source = workbook.months[month]?.stores.find(store => store.id === identity.sourceKey);
    const sales = source?.sales ?? [];
    const previousSales = valueForYear(sales, targetYear - 1);
    const suggestion = suggestGoal(previousSales);
    const profit = identity.profitSheet ? workbook.profitSheets[identity.profitSheet]?.[month] : undefined;
    return {
      ...identity, source, sales, previousSales, suggestion,
      currentSales: valueForYear(sales, targetYear),
      dailySuggestion: suggestion === null ? null : roundMoney(suggestion / currentDays.count),
      previousDailySales: previousSales === null ? null : roundMoney(previousSales / previousDays.count),
      profit, evolution: profitEvolution(profit, targetYear),
    };
  });
}
export type GoalAnalysisRow = ReturnType<typeof buildGoalRows>[number];
