import React, { useEffect, useMemo, useState } from 'react';
import { TrendingUp, Calendar, RefreshCw } from 'lucide-react';
import type { User } from '../../../shared/types';
import { apiFetch } from '../../../utils/api';
import { DirectorBiCharts } from '../components/DirectorBiCharts';
import { buildUnitsBi } from '../utils/unitsBiCalculations';
import type { UnitsBiResponse } from '../utils/unitsBiCalculations';
const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
interface StoresBiPageProps { currentUser?: User; showToast?: (message: string, type: 'success' | 'error' | 'info') => void }
const select = 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold';
export const StoresBiPage: React.FC<StoresBiPageProps> = ({ currentUser }) => {
  const [selectedPeriod, setSelectedPeriod] = useState('');
  const [response, setResponse] = useState<UnitsBiResponse | null>(null);
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    const update = () => setRefresh(value => value + 1);
    const timer = window.setInterval(update, 15000);
    window.addEventListener('focus', update);
    return () => { window.clearInterval(timer); window.removeEventListener('focus', update); };
  }, []);
  useEffect(() => {
    let active = true;
    apiFetch(`/units-bi${selectedPeriod ? `?month=${selectedPeriod}` : ''}`).then(result => result.json()).then((data: UnitsBiResponse) => { if (active) { setResponse(data); setError(''); } }).catch(error => { if (active) setError(error.message || 'Não foi possível carregar o BI das unidades.'); });
    return () => { active = false; };
  }, [currentUser?.id, selectedPeriod, refresh]);
  const visible = response && (!selectedPeriod || response.period === selectedPeriod) ? response : null;
  const analysis = useMemo(() => visible ? buildUnitsBi(visible) : null, [visible]);
  const period = selectedPeriod || response?.period || '';
  const [year, month] = period.split('-');
  const years = response ? [...new Set([...response.history.years, Number(response.latestPeriod.slice(0, 4)), Number(year)])].filter(Number.isFinite).sort((a, b) => a - b) : [];
  return <div className="max-w-[1800px] mx-auto p-4 sm:p-6 space-y-6 pb-14 text-slate-900 dark:text-slate-100">
    <header className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#0B132B] border border-slate-200 dark:border-slate-800 shadow-sm"><div className="flex flex-wrap justify-between gap-4 items-center"><div className="flex gap-3 items-center"><span className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"><TrendingUp size={24} /></span><div><h1 className="text-2xl font-black">BI das Unidades</h1><p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Histórico mensal, comparação entre os anos e metas por unidade.</p></div></div>
      <div className="flex flex-wrap items-center gap-2">{response && <><Calendar size={16} className="text-emerald-500" /><select aria-label="Mês do BI" className={select} value={month} onChange={event => setSelectedPeriod(`${year}-${event.target.value}`)}>{MONTHS.map((name, index) => <option key={name} value={String(index + 1).padStart(2, '0')}>{name}</option>)}</select><select aria-label="Ano do BI" className={select} value={year} onChange={event => setSelectedPeriod(`${event.target.value}-${month}`)}>{years.map(year => <option key={year}>{year}</option>)}</select></>}<button onClick={() => { setError(''); setRefresh(value => value + 1); }} className="px-3 py-2 flex items-center gap-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold"><RefreshCw size={14} /> Atualizar BI</button></div>
    </div>{response && <p className="text-xs text-slate-500 dark:text-slate-400 mt-4">{response.history.registeredStores?.length ?? 0} unidades do cadastro SQLite · Base {response.history.years[0]}–{response.history.years.at(-1)} · {MONTHS[Number(month) - 1]} / {year}{!selectedPeriod ? ' · último período com dados disponíveis' : ''}</p>}</header>
    {error && <div role="alert" className="p-4 rounded-xl bg-amber-500/10 text-amber-800 dark:text-amber-300">{error} Use “Atualizar BI” para tentar novamente.</div>}
    {analysis ? <><p className="text-xs text-slate-500 dark:text-slate-400">“—” indica informação ausente. O comparativo entre anos usa o mesmo mês. A evolução percentual compara apenas unidades com faturamento informado nos dois anos. Totais mensais importados e fechamentos diários não são somados entre si.</p>{analysis.sales === null && <p role="status" className="p-4 rounded-xl bg-amber-500/10 text-amber-800 dark:text-amber-300 text-sm">Sem faturamento informado para o período selecionado. Consulte os outros anos no comparativo ou altere o período.</p>}<DirectorBiCharts analysis={analysis} /></> : !error && <div role="status" className="animate-pulse space-y-4"><p className="text-sm text-slate-500">Carregando histórico do BI...</p><div className="h-28 bg-slate-200 dark:bg-slate-800 rounded-3xl" /><div className="h-64 bg-slate-200 dark:bg-slate-800 rounded-3xl" /></div>}
  </div>;
};
