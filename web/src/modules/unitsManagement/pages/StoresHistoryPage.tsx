import { useTableSort } from '../../../shared/useTableSort';
import { SortHeader } from '../../../shared/components/SortHeader';
import React, { useMemo, useState } from 'react';
import { FileSpreadsheet, Search, RefreshCw } from 'lucide-react';
import type { User } from '../../../shared/types';
import { useStoreHistory } from '../../goalsExecutive/utils/useStoreHistory';
import { buildGoalRows, operatingProfitForYear, roundMoney, valueForYear } from '../../goalsExecutive/utils/goalsCalculations';
import { money } from '../../goalsExecutive/utils/goalsFormat';
import { HistorySourceSheet } from '../components/HistorySourceSheet';
const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const panel = 'rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B132B]';
const select = 'rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm';
interface StoresHistoryPageProps { currentUser?: User; showToast?: (message: string, type: 'success' | 'error' | 'info') => void }

export const StoresHistoryPage: React.FC<StoresHistoryPageProps> = ({ currentUser }) => {
  const { workbook, error, reload } = useStoreHistory(currentUser?.id);
  const [month, setMonth] = useState(String(new Date().getMonth() + 1).padStart(2, '0'));
  const [search, setSearch] = useState('');
  const [metric, setMetric] = useState<'sales' | 'profit'>('sales');
  const [showOriginal, setShowOriginal] = useState(false);
  const rows = useMemo(() => workbook ? (month === 'all' ? MONTHS.map((_, index) => String(index + 1).padStart(2, '0')) : [month]).flatMap(key => buildGoalRows(workbook, key, Math.max(...workbook.years) + 1).map(row => ({ ...row, month: key }))) : [], [workbook, month]);
  const displayRows = useMemo(() => {
    const grouped = new Map<string, { row: typeof rows[number]; periods: typeof rows }>();
    rows.forEach(row => {
      const key = month === 'all' ? row.id : `${row.id}-${row.month}`;
      const entry = grouped.get(key);
      if (entry) entry.periods.push(row);
      else grouped.set(key, { row, periods: [row] });
    });
    return [...grouped.values()];
  }, [rows, month]);
  const term = search.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
  const filtered = displayRows.filter(({ row }) => row.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().includes(term));
  const sorting = useTableSort(filtered, ({ row, periods }, key) => {
    if (key === 'name') return row.name;
    const values = periods.map(period => metric === 'sales' ? valueForYear(period.sales, Number(key)) : operatingProfitForYear(period.profit, Number(key))).filter(value => value !== null);
    return values.length ? roundMoney(values.reduce((sum, value) => sum + value, 0)) : null;
  });
  return <div className="max-w-[1800px] mx-auto p-4 sm:p-6 space-y-5 text-slate-900 dark:text-slate-100">
    <header className={`${panel} p-6`}><div className="flex flex-wrap items-start justify-between gap-4"><div className="flex gap-3 items-center"><span className="p-3 rounded-2xl bg-indigo-600 text-white"><FileSpreadsheet size={24} /></span><div><h1 className="text-2xl font-black">Histórico de Vendas</h1><p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Faturamento e lucro do mesmo mês ao longo dos anos, por loja.</p></div></div><button onClick={() => void reload()} className="flex gap-2 items-center px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold"><RefreshCw size={14} /> Atualizar histórico</button></div>
      <p className="text-sm mt-4">Este histórico é a base consultada pela página de metas. Janeiro é comparado com janeiro dos outros anos; o mesmo vale para cada mês.</p>
      {workbook && <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">{workbook.registeredStores?.length ?? 0} lojas do cadastro SQLite · {workbook.years[0]}–{workbook.years.at(-1)} · {Object.values(workbook.months).reduce((sum, month) => sum + month.stores.length, 0)} registros mensais importados de {workbook.filename}</p>}
    </header>
    {error && <p role="alert" className="p-4 rounded-xl bg-amber-500/10 text-amber-800 dark:text-amber-300">{error}</p>}
    {!workbook ? !error && <div role="status" className="h-64 animate-pulse bg-slate-200 dark:bg-slate-800 rounded-2xl p-6">Carregando histórico do banco de dados...</div> : <>
      <div className="flex flex-wrap items-center gap-3"><label className="text-xs font-bold flex items-center gap-2">Mês <select aria-label="Mês do histórico" className={select} value={month} onChange={event => setMonth(event.target.value)}><option value="all">Todos os meses</option>{MONTHS.map((name, index) => <option key={name} value={String(index + 1).padStart(2, '0')}>{name}</option>)}</select></label>
        <label className="text-xs font-bold flex items-center gap-2">Informação <select aria-label="Informação do histórico" value={metric} onChange={event => setMetric(event.target.value as 'sales' | 'profit')} className={select}><option value="sales">Faturamento</option><option value="profit">Lucro líquido</option></select></label>
        <label className={`${panel} px-3 py-2 flex gap-2 items-center`}><Search size={14} className="text-slate-400" /><input aria-label="Buscar loja no histórico" placeholder="Buscar loja..." value={search} onChange={event => setSearch(event.target.value)} className="text-xs bg-transparent outline-none" /></label>
        {search && <button onClick={() => setSearch('')} className="text-xs font-bold px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800">Limpar busca</button>}
      </div>
      {month === 'all' && <p className="text-xs text-slate-500 dark:text-slate-400">Total anual por unidade: soma dos meses com dados disponíveis em cada ano. Anos incompletos representam apenas os meses informados.</p>}
      <div className={`${panel} overflow-x-auto`}><table className="w-full text-xs"><caption className="sr-only">{metric === 'sales' ? 'Faturamento' : 'Lucro líquido'} por unidade, {month === 'all' ? 'total anual dos meses disponíveis' : MONTHS[Number(month) - 1]}, comparado entre os anos</caption><thead className="bg-slate-50 dark:bg-slate-900 uppercase text-slate-500 dark:text-slate-400"><tr><SortHeader sort={sorting} column="name" className="p-4 text-left">Unidade</SortHeader>{workbook.years.map(year => <SortHeader sort={sorting} column={String(year)} key={year} className="p-4 text-right">{year}</SortHeader>)}</tr></thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">{sorting.rows.map(({ row, periods }) => <tr key={`${row.id}-${row.month}`} className="hover:bg-slate-50 dark:hover:bg-slate-800/40"><th scope="row" className="p-4 text-left whitespace-nowrap">{row.name}{!row.active && <span className="block text-[10px] font-normal text-slate-500">Inativa</span>}</th>{workbook.years.map(year => {
          const values = periods.map(period => metric === 'sales' ? valueForYear(period.sales, year) : operatingProfitForYear(period.profit, year)).filter(value => value !== null);
          const value = values.length ? roundMoney(values.reduce((sum, amount) => sum + amount, 0)) : null;
          const withoutRevenue = month !== 'all' && metric === 'profit' && value === null && valueForYear(row.profit?.profits ?? [], year) !== null;
          return <td key={year} className="p-4 text-right whitespace-nowrap tabular-nums" title={withoutRevenue ? 'Sem faturamento neste período. O custo calculado automaticamente pela planilha não é considerado prejuízo nem entra na evolução do lucro.' : undefined}>{money(value)}</td>;
        })}</tr>)}
          {!filtered.length && <tr><td colSpan={workbook.years.length + 1} className="p-8 text-center">Nenhuma loja encontrada.</td></tr>}
        </tbody></table></div>
      <p className="text-xs text-slate-500 dark:text-slate-400">“—” indica informação ausente. Meses sem faturamento ou com faturamento zero não geram lucro ou prejuízo no comparativo e ficam fora da evolução usada nas metas. Prejuízos de meses com faturamento são mantidos. Os valores originais da planilha permanecem disponíveis para conferência abaixo.</p>
      <details className={`${panel} p-4`} onToggle={event => setShowOriginal(event.currentTarget.open)}><summary className="cursor-pointer text-sm font-bold">Todos os registros originais da planilha · vendas, lucros, custos e metas</summary><div className="mt-4">{showOriginal && <HistorySourceSheet names={workbook.sourceSheetNames ?? []} />}</div></details>
    </>}
  </div>;
};
