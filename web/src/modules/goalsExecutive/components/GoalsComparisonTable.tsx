import { ResizableTable } from '../../../shared/components/ResizableTable';
import { useColumnOrder } from '../../../shared/useColumnOrder';
import { useTableSort } from '../../../shared/useTableSort';
import { SortHeader } from '../../../shared/components/SortHeader';
import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { GoalAnalysisRow } from '../utils/goalsCalculations';
import { goalShortfall, operatingProfitForYear, superGoal, valueForYear } from '../utils/goalsCalculations';

import { money } from '../utils/goalsFormat';
const cell = 'px-4 py-3 text-right whitespace-nowrap tabular-nums';
function HistoricalGoal({ sales, goal, periodLabel }: { sales: number | null; goal: number | null; periodLabel: string }) {
  const reached = sales !== null && goal !== null ? sales >= goal : null;
  const color = reached === null ? 'text-slate-500 dark:text-slate-400' : reached ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400';
  const status = reached === null ? 'Sem dados para comparar' : reached ? 'Meta atingida' : 'Meta não atingida';
  return <span className={`block mt-1 text-[10px] font-normal ${color}`} title={`Meta definida para ${periodLabel} · ${status}`}>Meta: {money(goal)}</span>;
}



export function GoalsComparisonTable({ rows, previousRows, previousPeriod, targetYear, plans, onPlanChange, storageKey, readOnly = false }: {
  rows: GoalAnalysisRow[]; previousRows: GoalAnalysisRow[]; previousPeriod: { year: number; label: string }; targetYear: number; storageKey: string;
  readOnly?: boolean; plans: Record<string, number>; onPlanChange: (id: string, value: number | null) => void;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [metric, setMetric] = useState<'sales' | 'profit'>('sales');
  const columns = useColumnOrder(['name', 'previousMonth', 'previousYear', 'suggestion', 'workingDays', 'daily', 'plan', 'superGoal', 'shortfall'], storageKey);
  const previousById = new Map(previousRows.map(row => [row.id, row]));
  const metricLabel = metric === 'sales' ? 'faturamento' : 'lucro';
  const comparisonRows = rows.map(row => {
    const previous = previousById.get(row.id);
    const previousMonthGoal = valueForYear(previous?.goals ?? [], previousPeriod.year);
    return { ...row,
      shortfall: goalShortfall(previousMonthGoal, previous?.currentSales ?? null, previous?.workingDays ?? 0),
      previousMonthWorkingDays: previous?.workingDays ?? null,
      comparisonHistory: metric === 'sales' ? row.sales : row.evolution.history,
      previousMonthValue: metric === 'sales' ? previous?.currentSales ?? null : operatingProfitForYear(previous?.profit, previousPeriod.year),
      previousMonthGoal,
      previousYearGoal: valueForYear(row.goals, targetYear - 1),
    };
  });
  const sorting = useTableSort(comparisonRows, (row, key) => {
    if (key === 'previousYear') return valueForYear(row.comparisonHistory, targetYear - 1);
    if (key === 'previousMonth') return row.previousMonthValue;
    if (key === 'superGoal') return superGoal(plans[row.id] ?? null);
    if (key === 'plan') return plans[row.id] ?? null;
    if (key === 'shortfall') return row.shortfall.amount;
    return ({ name: row.name, suggestion: row.suggestion, workingDays: row.workingDays, daily: row.dailySuggestion })[key];
  });
  return <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B132B]">
    <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center gap-3 text-xs"><label className="font-semibold">Comparar <select aria-label="Visão do comparativo de metas" value={metric} onChange={event => setMetric(event.target.value as 'sales' | 'profit')} className="ml-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 px-3 py-2"><option value="sales">Faturamento</option><option value="profit">Lucro líquido</option></select></label><span className="text-slate-500 dark:text-slate-400">A sugestão, as metas diárias e a diferença para a meta usam sempre o faturamento.</span></div>
    <ResizableTable resizeId="modules/goalsExecutive/components/GoalsComparisonTable:1" className="w-full text-xs text-slate-700 dark:text-slate-200">
      <caption className="sr-only">Comparativo com o mês anterior e o mesmo mês do ano anterior, {metricLabel} e sugestão de meta para {targetYear}</caption>
      <thead className="bg-slate-50 dark:bg-slate-900 text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400">
        <tr>{columns.order.map(column => {
          const labels: Record<string, React.ReactNode> = {
            name: 'Loja / detalhes',
            previousMonth: <>{metric === 'sales' ? 'Faturamento' : 'Lucro líquido'} · mês anterior<br /><span className="normal-case">{previousPeriod.label}</span></>,
            previousYear: <>{metric === 'sales' ? 'Faturamento' : 'Lucro líquido'} {targetYear - 1}<br /><span className="normal-case">Mesmo mês do ano anterior</span></>,
            suggestion: 'Sugestão de meta +8%',
            workingDays: 'Dias úteis do mês',
            daily: `Meta diária ${targetYear}`,
            plan: 'Meta planejada',
            superGoal: 'Supermeta +10%',
            shortfall: <>Faltou para a meta<br /><span className="normal-case">Mês anterior</span></>,
          };
          const dragProps = columns.headerProps(column);
          const color = column === 'suggestion' ? 'text-emerald-700 dark:text-emerald-400' : column === 'superGoal' ? 'text-amber-700 dark:text-amber-400' : '';
          return <SortHeader key={column} data-column={column} {...dragProps} sort={sorting} column={column} className={`${column === 'name' ? 'px-4 py-4 text-left min-w-48' : 'px-4 py-3 text-right tabular-nums'} whitespace-normal break-words [&_button]:whitespace-normal [&_button_span]:min-w-0 [&_button_span]:whitespace-normal [&_button_span]:break-words ${color} ${dragProps.className}`}>{labels[column]}</SortHeader>;
        })}</tr>
      </thead>
      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
        {sorting.rows.map(row => {
          const cells: Record<string, React.ReactNode> = {
                name: <th scope="row" className="px-4 py-3 bg-white dark:bg-[#0B132B] text-left font-semibold">
              <button onClick={() => setExpanded(expanded === row.id ? null : row.id)} aria-expanded={expanded === row.id} aria-controls={`details-${row.id}`} className="flex items-center gap-2 text-left cursor-pointer hover:text-emerald-600 focus-visible:outline-2 focus-visible:outline-emerald-500 rounded">
                {expanded === row.id ? <ChevronDown size={14} /> : <ChevronRight size={14} />} {row.name}
              </button>
              {!row.active && <span className="block text-[10px] text-slate-500 font-normal">Loja inativa</span>}{!row.source && <span className="block mt-1 text-[10px] text-amber-600 dark:text-amber-400 font-normal">Sem registro neste mês</span>}
            </th>,
                previousMonth: <td className={cell}><span data-comparison-value>{money(row.previousMonthValue)}</span>{metric === 'sales' && <HistoricalGoal sales={row.previousMonthValue} goal={row.previousMonthGoal} periodLabel={previousPeriod.label} />}</td>,
                previousYear: <td className={`${cell} font-bold`}><span data-comparison-value>{money(valueForYear(row.comparisonHistory, targetYear - 1))}</span>{metric === 'sales' && <HistoricalGoal sales={valueForYear(row.comparisonHistory, targetYear - 1)} goal={row.previousYearGoal} periodLabel={`mesmo mês de ${targetYear - 1}`} />}</td>,
                suggestion: <td className="p-0 text-right whitespace-nowrap tabular-nums font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-500/5">{row.suggestion === null ? <span className="block px-4 py-3 font-normal text-slate-500 dark:text-slate-400">Sem histórico</span> : <button type="button" disabled={readOnly} aria-label={`Aplicar sugestão de meta para ${row.name}`} aria-pressed={plans[row.id] === row.suggestion} title={plans[row.id] === row.suggestion ? 'Limpar a meta planejada da unidade' : 'Aplicar este valor na meta planejada da unidade'} onClick={() => onPlanChange(row.id, plans[row.id] === row.suggestion ? null : row.suggestion)} className="block w-full px-4 py-3 text-right font-bold cursor-pointer hover:bg-emerald-500/15 focus-visible:outline-2 focus-visible:outline-emerald-500 focus-visible:outline-offset-[-2px] disabled:cursor-default disabled:opacity-60 transition-colors">{money(row.suggestion)}</button>}</td>,
                workingDays: <td data-column="workingDays" className={cell} title="Dias úteis da unidade no mês selecionado, descontando domingos, feriados nacionais e fechamentos aprovados.">{row.workingDays}</td>,
                daily: <td className={cell} title={`${row.workingDays} dias úteis para esta unidade, descontando domingos, feriados nacionais e fechamentos aprovados.`}>{money(row.dailySuggestion)}</td>,
                plan: <td className={cell}><input disabled={readOnly} type="text" inputMode="numeric" aria-label={`Meta planejada ${row.name}`} value={plans[row.id] === undefined ? '' : money(plans[row.id])} placeholder="" onChange={event => {
              const digits = event.target.value.replace(/\D/g, '');
              const value = digits === '' ? null : Number(digits) / 100;
              if (value === null || (Number.isFinite(value) && value >= 0 && value <= 1e12)) onPlanChange(row.id, value);
            }} className="w-44 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent p-2 text-right focus:outline-2 focus:outline-emerald-500" /></td>,
                superGoal: <td className={`${cell} font-bold text-amber-700 dark:text-amber-400`}>{money(superGoal(plans[row.id] ?? null))}</td>,
                shortfall: <td data-column="shortfall" className={cell} title={`Meta menos vendas de ${previousPeriod.label}. Diferença dividida pelos ${row.previousMonthWorkingDays ?? 0} dias úteis daquele mês.`}>
                  <span className={row.shortfall.amount === 0 ? 'font-bold text-emerald-700 dark:text-emerald-400' : 'font-semibold'}>{money(row.shortfall.amount)}</span>
                  <span className="block mt-1 text-[10px] font-normal text-slate-500 dark:text-slate-400">{row.previousMonthGoal === null ? 'Meta não informada' : row.shortfall.amount === null ? 'Sem faturamento informado' : row.shortfall.dailyAmount === null ? 'Sem dias úteis no mês' : `${money(row.shortfall.dailyAmount)}/dia`}</span>
                </td>,
              };
          return <React.Fragment key={row.id}>
          <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
            {columns.order.map(column => <React.Fragment key={column}>{cells[column]}</React.Fragment>)}
          </tr>
          {expanded === row.id && <tr id={`details-${row.id}`}><td colSpan={columns.order.length} className="px-6 py-5 bg-slate-50 dark:bg-slate-900/60">
            <div className="grid lg:grid-cols-2 gap-6 whitespace-normal">
              <div><h3 className="font-bold mb-2">Lucro líquido do mesmo mês · {row.profitSheet ?? 'Sem aba correspondente'}</h3>
                {row.profit ? <><div className="flex flex-wrap gap-4">{row.evolution.history.map(item => <div key={item.year}><span className="text-slate-500 dark:text-slate-400">{item.year}</span><strong className="block">{money(item.value)}</strong></div>)}</div>
                </> : <p className="text-amber-700 dark:text-amber-400">A planilha não contém uma aba de lucro identificada para esta loja. Nenhum lucro foi estimado.</p>}
                {row.sourceName === 'GUARAPUAVA' && <p className="mt-2 text-amber-700 dark:text-amber-400">Existe uma aba P.UNIAO identificada como Porto União. Ela está disponível nos dados adicionais e não foi vinculada a Guarapuava.</p>}
              </div>
              <div><h3 className="font-bold mb-2">Valores originais da planilha</h3>
                <dl className="grid grid-cols-2 gap-2"><dt>Meta registrada</dt><dd>{money(row.source?.spreadsheetGoal ?? null)}</dd><dt>Supermeta registrada</dt><dd>{money(row.source?.spreadsheetSuperGoal ?? null)}</dd><dt>Ponto de equilíbrio</dt><dd>{money(row.source?.breakEven ?? null)}</dd><dt>Comissão / supermeta</dt><dd>{money(row.source?.commission ?? null)} / {money(row.source?.superCommission ?? null)}</dd></dl>

              </div>
            </div>
          </td></tr>}
        </React.Fragment>; })}
        {!rows.length && <tr><td colSpan={columns.order.length} className="p-8 text-center text-slate-500">Nenhuma loja encontrada. Limpe a busca para ver todos os registros.</td></tr>}
      </tbody>
      {!!rows.length && <tfoot className="bg-slate-50 dark:bg-slate-900 font-bold"><tr>{columns.order.map(column => {
        if (column === 'name') return <th key={column} scope="row" className="px-4 py-4 text-left">Total das lojas exibidas</th>;
        if (column === 'workingDays') return <td key={column} className={cell}>—</td>;
        if (column === 'shortfall') {
          const shortfalls = comparisonRows.map(row => row.shortfall).filter(item => item.amount !== null);
          const totalRemaining = shortfalls.length ? shortfalls.reduce((sum, item) => sum + (item.amount ?? 0), 0) : null;
          const totalDaily = shortfalls.length && shortfalls.every(item => item.dailyAmount !== null) ? shortfalls.reduce((sum, item) => sum + (item.dailyAmount ?? 0), 0) : null;
          return <td key={column} className={cell} title="Total que faltou no mês anterior e soma das diferenças diárias das unidades com meta informada.">{money(totalRemaining)}<span className="block mt-1 text-[10px] font-normal text-slate-500 dark:text-slate-400">{totalDaily === null ? '—' : `${money(totalDaily)}/dia`}</span></td>;
        }
        if (column === 'previousMonth' || column === 'previousYear') {
          const values = comparisonRows.map(row => column === 'previousMonth' ? row.previousMonthValue : valueForYear(row.comparisonHistory, targetYear - 1)).filter(value => value !== null);
          return <td key={column} className={cell}>{money(values.length ? values.reduce((sum, value) => sum + value, 0) : null)}<span className="block text-[10px] font-normal text-slate-500">{values.length}/{rows.length} com dados</span></td>;
        }
        const totals: Record<string, number | null> = {
          suggestion: rows.some(row => row.suggestion !== null) ? rows.reduce((sum, row) => sum + (row.suggestion ?? 0), 0) : null,
          daily: rows.some(row => row.dailySuggestion !== null) ? rows.reduce((sum, row) => sum + (row.dailySuggestion ?? 0), 0) : null,
          plan: rows.some(row => plans[row.id] !== undefined) ? rows.reduce((sum, row) => sum + (plans[row.id] ?? 0), 0) : null,
          superGoal: rows.some(row => plans[row.id] !== undefined) ? rows.reduce((sum, row) => sum + (superGoal(plans[row.id] ?? null) ?? 0), 0) : null,
        };
        return <td key={column} className={`${cell} ${column === 'superGoal' ? 'text-amber-700 dark:text-amber-400' : column === 'suggestion' ? 'text-emerald-600 dark:text-emerald-400' : ''}`}>{money(totals[column])}</td>;
      })}</tr></tfoot>}
    </ResizableTable>
  </div>;
}

