import { useColumnOrder } from '../../../shared/useColumnOrder';
import { useTableSort } from '../../../shared/useTableSort';
import { SortHeader } from '../../../shared/components/SortHeader';
import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { GoalAnalysisRow } from '../utils/goalsCalculations';
import { operatingProfitForYear, salesEvolution, superGoal, valueForYear } from '../utils/goalsCalculations';

import { money } from '../utils/goalsFormat';
const percent = (value: number | null) => value === null ? 'Sem comparativo' : `${value > 0 ? '+' : ''}${value.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%`;
const cell = 'px-4 py-3 text-right whitespace-nowrap tabular-nums';
function evolutionExplanation(evolution: GoalAnalysisRow['evolution'], metricLabel: string) {
  const comparisons = evolution.history.flatMap(current => {
    const previous = evolution.history.find(item => item.year === current.year - 1);
    if (current.value === null || previous?.value === null || previous?.value === undefined || previous.value === 0) return [];
    const variation = (current.value - previous.value) / Math.abs(previous.value) * 100;
    return [`${previous.year} → ${current.year}: ${metricLabel} de ${money(previous.value)} para ${money(current.value)} (${percent(variation)}).`];
  });
  return comparisons.length
    ? `Média das variações de ${metricLabel} no mesmo mês.\n${comparisons.join('\n')}\n${comparisons.length === 1 ? 'Há apenas uma comparação válida; o percentual corresponde a essa variação.' : `A porcentagem exibida é a média dessas ${comparisons.length} variações.`} Anos sem dados válidos ficam fora do cálculo.`
    : `Não há dois anos consecutivos com ${metricLabel} válido para calcular a variação percentual.`;
}


export function GoalsComparisonTable({ rows, previousRows, previousPeriod, targetYear, plans, onPlanChange, storageKey, readOnly = false }: {
  rows: GoalAnalysisRow[]; previousRows: GoalAnalysisRow[]; previousPeriod: { year: number; label: string }; targetYear: number; storageKey: string;
  readOnly?: boolean; plans: Record<string, number>; onPlanChange: (id: string, value: number | null) => void;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [metric, setMetric] = useState<'sales' | 'profit'>('sales');
  const columns = useColumnOrder(['name', 'previousMonth', 'previousYear', 'profit', 'suggestion', 'daily', 'plan', 'superGoal'], storageKey);
  const previousById = new Map(previousRows.map(row => [row.id, row]));
  const metricLabel = metric === 'sales' ? 'faturamento' : 'lucro';
  const comparisonRows = rows.map(row => ({ ...row,
    comparisonHistory: metric === 'sales' ? row.sales : row.evolution.history,
    previousMonthValue: metric === 'sales' ? previousById.get(row.id)?.currentSales ?? null : operatingProfitForYear(previousById.get(row.id)?.profit, previousPeriod.year),
    comparisonEvolution: metric === 'sales' ? salesEvolution(row.sales, targetYear) : row.evolution,
  }));
  const sorting = useTableSort(comparisonRows, (row, key) => {
    if (key === 'previousYear') return valueForYear(row.comparisonHistory, targetYear - 1);
    if (key === 'previousMonth') return row.previousMonthValue;
    if (key === 'profit') return row.comparisonEvolution.averagePercent;
    if (key === 'superGoal') return superGoal(plans[row.id] ?? null);
    if (key === 'plan') return plans[row.id] ?? null;
    return ({ name: row.name, suggestion: row.suggestion, daily: row.dailySuggestion })[key];
  });
  return <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B132B]">
    <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center gap-3 text-xs"><label className="font-semibold">Comparar <select aria-label="Visão do comparativo de metas" value={metric} onChange={event => setMetric(event.target.value as 'sales' | 'profit')} className="ml-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 px-3 py-2"><option value="sales">Faturamento</option><option value="profit">Lucro líquido</option></select></label><span className="text-slate-500 dark:text-slate-400">A sugestão de meta e as metas diárias usam sempre o faturamento.</span></div>
    <table className="w-full text-xs text-slate-700 dark:text-slate-200">
      <caption className="sr-only">Comparativo com o mês anterior e o mesmo mês do ano anterior, evolução de {metricLabel} e sugestão de meta para {targetYear}</caption>
      <thead className="bg-slate-50 dark:bg-slate-900 text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400">
        <tr>{columns.order.map(column => {
          const labels: Record<string, React.ReactNode> = {
            name: 'Loja / detalhes',
            previousMonth: <>{metric === 'sales' ? 'Faturamento' : 'Lucro líquido'} · mês anterior<br /><span className="normal-case">{previousPeriod.label}</span></>,
            previousYear: <>{metric === 'sales' ? 'Faturamento' : 'Lucro líquido'} {targetYear - 1}<br /><span className="normal-case">Mesmo mês do ano anterior</span></>,
            profit: `Média de evolução do ${metricLabel}`,
            suggestion: 'Sugestão de meta +8%',
            daily: `Meta diária ${targetYear}`,
            plan: 'Meta planejada',
            superGoal: 'Supermeta +10%',
          };
          const dragProps = columns.headerProps(column);
          const color = column === 'suggestion' ? 'text-emerald-700 dark:text-emerald-400' : column === 'superGoal' ? 'text-amber-700 dark:text-amber-400' : '';
          return <SortHeader key={column} data-column={column} {...dragProps} sort={sorting} column={column} className={`${column === 'name' ? 'px-4 py-4 text-left min-w-48' : cell} ${color} ${dragProps.className}`}>{labels[column]}</SortHeader>;
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
                previousMonth: <td className={cell}>{money(row.previousMonthValue)}</td>,
                previousYear: <td className={`${cell} font-bold`}>{money(valueForYear(row.comparisonHistory, targetYear - 1))}</td>,
                profit: <td className={cell}>
              <span tabIndex={0} title={evolutionExplanation(row.comparisonEvolution, metricLabel)} aria-label={`${percent(row.comparisonEvolution.averagePercent)}. ${evolutionExplanation(row.comparisonEvolution, metricLabel)}`} className={row.comparisonEvolution.averagePercent !== null && row.comparisonEvolution.averagePercent < 0 ? 'text-rose-600 dark:text-rose-400 font-bold' : 'font-bold'}>{percent(row.comparisonEvolution.averagePercent)}</span>
              <span className="block text-[10px] text-slate-500 dark:text-slate-400">{money(row.comparisonEvolution.averageChange)} / ano · {row.comparisonEvolution.comparisons} comparações</span>
            </td>,
                suggestion: <td className={`${cell} font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-500/5`}>{row.suggestion === null ? <span className="font-normal text-slate-500 dark:text-slate-400">Sem histórico</span> : money(row.suggestion)}</td>,
                daily: <td className={cell}>{money(row.dailySuggestion)}</td>,
                plan: <td className={cell}><input disabled={readOnly} type="text" inputMode="numeric" aria-label={`Meta planejada ${row.name}`} value={plans[row.id] === undefined ? '' : money(plans[row.id])} placeholder="" onChange={event => {
              const digits = event.target.value.replace(/\D/g, '');
              const value = digits === '' ? null : Number(digits) / 100;
              if (value === null || (Number.isFinite(value) && value >= 0 && value <= 1e12)) onPlanChange(row.id, value);
            }} className="w-44 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent p-2 text-right focus:outline-2 focus:outline-emerald-500" /></td>,
                superGoal: <td className={`${cell} font-bold text-amber-700 dark:text-amber-400`}>{money(superGoal(plans[row.id] ?? null))}</td>,
              };
          return <React.Fragment key={row.id}>
          <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
            {columns.order.map(column => <React.Fragment key={column}>{cells[column]}</React.Fragment>)}
          </tr>
          {expanded === row.id && <tr id={`details-${row.id}`}><td colSpan={columns.order.length} className="px-6 py-5 bg-slate-50 dark:bg-slate-900/60">
            <div className="grid lg:grid-cols-2 gap-6 whitespace-normal">
              <div><h3 className="font-bold mb-2">Lucro líquido do mesmo mês · {row.profitSheet ?? 'Sem aba correspondente'}</h3>
                {row.profit ? <><div className="flex flex-wrap gap-4">{row.evolution.history.map(item => <div key={item.year}><span className="text-slate-500 dark:text-slate-400">{item.year}</span><strong className="block">{money(item.value)}</strong></div>)}</div>
                  <p className="text-slate-500 dark:text-slate-400 mt-3">Média aritmética das variações de lucro entre anos consecutivos de {targetYear - 3} a {targetYear - 1}. Percentual: diferença ÷ valor absoluto do lucro anterior. Base zero entra apenas na média em reais. Anos sem faturamento ou com faturamento zero na aba de lucro não entram no cálculo.</p>
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
        if (column === 'previousMonth' || column === 'previousYear') {
          const values = comparisonRows.map(row => column === 'previousMonth' ? row.previousMonthValue : valueForYear(row.comparisonHistory, targetYear - 1)).filter(value => value !== null);
          return <td key={column} className={cell}>{money(values.length ? values.reduce((sum, value) => sum + value, 0) : null)}<span className="block text-[10px] font-normal text-slate-500">{values.length}/{rows.length} com dados</span></td>;
        }
        const totals: Record<string, number | null> = {
          profit: null,
          suggestion: rows.some(row => row.suggestion !== null) ? rows.reduce((sum, row) => sum + (row.suggestion ?? 0), 0) : null,
          daily: rows.some(row => row.dailySuggestion !== null) ? rows.reduce((sum, row) => sum + (row.dailySuggestion ?? 0), 0) : null,
          plan: rows.some(row => plans[row.id] !== undefined) ? rows.reduce((sum, row) => sum + (plans[row.id] ?? 0), 0) : null,
          superGoal: rows.some(row => plans[row.id] !== undefined) ? rows.reduce((sum, row) => sum + (superGoal(plans[row.id] ?? null) ?? 0), 0) : null,
        };
        return <td key={column} className={`${cell} ${column === 'superGoal' ? 'text-amber-700 dark:text-amber-400' : column === 'suggestion' ? 'text-emerald-600 dark:text-emerald-400' : ''}`}>{money(totals[column])}</td>;
      })}</tr></tfoot>}
    </table>
  </div>;
}

