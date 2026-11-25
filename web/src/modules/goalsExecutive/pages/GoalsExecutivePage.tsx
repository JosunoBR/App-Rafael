import React, { useEffect, useMemo, useState } from 'react';
import { Calendar, Target, Search, Save, RotateCcw } from 'lucide-react';
import type { User } from '../../../shared/types';
import type { GoalsWorkbook } from '../types/goalsSpreadsheet.types';
import { hasPermission } from '../../../shared/permissions';
import { fetchGoalPlans, saveGoalPlans } from '../utils/goalsApi';
import { buildGoalRows, workingDays } from '../utils/goalsCalculations';
import { useStoreHistory } from '../utils/useStoreHistory';
import { GoalsComparisonTable } from '../components/GoalsComparisonTable';
import { money } from '../utils/goalsFormat';

interface GoalsExecutivePageProps {
  currentUser?: User;
  showToast?: (message: string, type: 'success' | 'error' | 'info') => void;
}
const MONTH_NAMES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const panel = 'rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B132B]';
const button = 'px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer disabled:opacity-50 disabled:cursor-default focus-visible:outline-2 focus-visible:outline-emerald-500';
const selectClass = 'rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-700 dark:text-slate-200';

export const GoalsExecutivePage: React.FC<GoalsExecutivePageProps> = props => {
  const { workbook, error, reload } = useStoreHistory(props.currentUser?.id);
  if (!workbook) return <div className="p-6">{error ? <div role="alert" className="text-amber-700 dark:text-amber-300">{error}<button onClick={() => void reload()} className={`${button} mt-3 bg-slate-100 dark:bg-slate-800`}>Tentar novamente</button></div> : <div role="status" className="animate-pulse space-y-4"><p>Carregando histórico e lojas do sistema...</p><div className="h-28 rounded-2xl bg-slate-200 dark:bg-slate-800" /><div className="h-64 rounded-2xl bg-slate-200 dark:bg-slate-800" /></div>}</div>;
  return <>{error && <p role="alert" className="p-4 text-amber-700 dark:text-amber-300">Não foi possível atualizar os dados: {error}</p>}<GoalsExecutiveContent key={`${props.currentUser?.id}:${workbook.sha256}`} {...props} workbook={workbook} /></>;
};

function GoalsExecutiveContent({ currentUser, showToast, workbook: GOALS_WORKBOOK }: GoalsExecutivePageProps & { workbook: GoalsWorkbook }) {
  const today = new Date();
  const years = Array.from({ length: Math.max(today.getFullYear(), Math.max(...GOALS_WORKBOOK.years)) + 1 - Math.min(...GOALS_WORKBOOK.years) + 1 }, (_, index) => Math.min(...GOALS_WORKBOOK.years) + index);
  const [targetYear, setTargetYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(String(today.getMonth() + 1).padStart(2, '0'));
  const [search, setSearch] = useState('');
  const [drafts, setDrafts] = useState<Record<string, Record<string, number>>>({});
  const [saved, setSaved] = useState<Record<string, Record<string, number>>>({});
  const [versions, setVersions] = useState<Record<string, Record<string, number>>>({});
  const [saving, setSaving] = useState(false);
  const [planErrors, setPlanErrors] = useState<Record<string, boolean>>({});
  const [notice, setNotice] = useState<{ message: string; error: boolean } | null>(null);
  const period = `${targetYear}-${month}`;
  const plans = drafts[period] ?? {};
  const dirty = [...new Set([...Object.keys(plans), ...Object.keys(saved[period] ?? {})])].some(id => plans[id] !== saved[period]?.[id]);
  const plansError = planErrors[period] ?? false;
  const loadingPlans = !versions[period] && !plansError;
  const canManage = hasPermission(currentUser, 'goals:manage');
  const anyDirty = Object.keys(drafts).some(key => [...new Set([...Object.keys(drafts[key]), ...Object.keys(saved[key] ?? {})])].some(id => drafts[key][id] !== saved[key]?.[id]));
  useEffect(() => {
    if (!anyDirty) return;
    const protectDraft = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', protectDraft);
    return () => window.removeEventListener('beforeunload', protectDraft);
  }, [anyDirty]);
  useEffect(() => {
    if (versions[period]) return;
    let active = true;
    fetchGoalPlans(targetYear, Number(month)).then(values => {
      if (!active) return;
      const amounts = Object.fromEntries(values.filter(value => value.amount !== null).map(value => [value.storeId, value.amount as number]));
      setDrafts(previous => ({ ...previous, [period]: amounts }));
      setSaved(previous => ({ ...previous, [period]: amounts }));
      setVersions(previous => ({ ...previous, [period]: Object.fromEntries(values.map(value => [value.storeId, value.version])) }));
    }).catch(error => { if (active) { setPlanErrors(previous => ({ ...previous, [period]: true })); setNotice({ message: error.message || 'Não foi possível carregar as metas salvas.', error: true }); } });
    return () => { active = false; };
  }, [period, targetYear, month, versions]);
  const rows = useMemo(() => buildGoalRows(GOALS_WORKBOOK, month, targetYear), [GOALS_WORKBOOK, month, targetYear]);
  const filtered = rows.filter(row => row.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().includes(search.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase()));
  const currentDays = workingDays(targetYear, Number(month), GOALS_WORKBOOK.calendarClosures);
  const previousDays = workingDays(targetYear - 1, Number(month), GOALS_WORKBOOK.calendarClosures);
  const comparable = rows.filter(row => row.suggestion !== null);
  const totalSuggestion = comparable.length ? comparable.reduce((sum, row) => sum + (row.suggestion ?? 0), 0) : null;
  const totalPrevious = comparable.length ? comparable.reduce((sum, row) => sum + (row.previousSales ?? 0), 0) : null;
  const dailyComparable = comparable.filter(row => row.dailySuggestion !== null);
  const averageDailySuggestion = dailyComparable.length ? dailyComparable.reduce((sum, row) => sum + (row.dailySuggestion ?? 0), 0) / dailyComparable.length : null;
  const previousMonth = Number(month) === 1 ? 12 : Number(month) - 1;
  const previousYear = Number(month) === 1 ? targetYear - 1 : targetYear;
  const previousRows = useMemo(() => buildGoalRows(GOALS_WORKBOOK, String(previousMonth).padStart(2, '0'), previousYear), [GOALS_WORKBOOK, previousMonth, previousYear]);
  const previousPeriod = { year: previousYear, label: `${MONTH_NAMES[previousMonth - 1]} ${previousYear}` };
  const report = GOALS_WORKBOOK.months[month];
  const announce = (message: string, error = false) => { setNotice({ message, error }); showToast?.(message, error ? 'error' : 'success'); };
  const updatePlan = (id: string, value: number | null) => setDrafts(previous => {
    const entries = { ...previous[period] };
    if (value === null) delete entries[id]; else entries[id] = value;
    const next = { ...previous };
    if (Object.keys(entries).length) next[period] = entries; else delete next[period];
    return next;
  });
  const saveDraft = async () => {
    if (saving || loadingPlans || plansError) return;
    const savingPeriod = period;
    const snapshot = { ...plans };
    const changed = [...new Set([...Object.keys(snapshot), ...Object.keys(saved[period] ?? {})])].filter(id => snapshot[id] !== saved[period]?.[id]);
    if (!changed.length) return;
    setSaving(true);
    try {
      const values = await saveGoalPlans(targetYear, Number(month), changed.map(storeId => ({ storeId, amount: snapshot[storeId] ?? null, version: versions[period]?.[storeId] ?? 0 })));
      const persisted = { ...snapshot };
      values.forEach(value => { if (value.amount === null) delete persisted[value.storeId]; else persisted[value.storeId] = value.amount; });
      setSaved(previous => ({ ...previous, [savingPeriod]: persisted }));
      setDrafts(previous => ({ ...previous, [savingPeriod]: persisted }));
      setVersions(previous => ({ ...previous, [savingPeriod]: { ...previous[savingPeriod], ...Object.fromEntries(values.map(value => [value.storeId, value.version])) } }));
      announce(`Metas de ${savingPeriod} salvas no banco de dados do sistema.`);
    } catch (error) { announce(error instanceof Error ? error.message : 'Não foi possível salvar as metas. Seus ajustes continuam nesta tela.', true); }
    finally { setSaving(false); }
  };
  return <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1800px] mx-auto text-slate-900 dark:text-slate-100">
    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
      <div><span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider rounded-full px-2.5 py-1 bg-amber-500/15 text-amber-700 dark:text-amber-400"><Target size={12} /> Diretoria Executiva</span>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight mt-2">Painel Executivo de Metas</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Base: Histórico de Vendas · {GOALS_WORKBOOK.filename} · {GOALS_WORKBOOK.years[0]}–{GOALS_WORKBOOK.years.at(-1)}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2"><Calendar size={18} className="text-emerald-500" />
        <label className="sr-only" htmlFor="goals-month">Mês da meta</label><select id="goals-month" value={month} onChange={event => setMonth(event.target.value)} className={selectClass}>{MONTH_NAMES.map((name, index) => <option key={name} value={String(index + 1).padStart(2, '0')}>{name}</option>)}</select>
        <label className="sr-only" htmlFor="goals-year">Ano da meta</label><select id="goals-year" value={targetYear} onChange={event => setTargetYear(Number(event.target.value))} className={selectClass}>{years.map(year => <option key={year} value={year}>{year}</option>)}</select>
        <button onClick={saveDraft} disabled={!canManage || !dirty || saving || loadingPlans || plansError} className={`${button} bg-emerald-600 hover:bg-emerald-500 text-white`}><Save size={14} /> {saving ? 'Salvando...' : 'Salvar metas no sistema'}</button>
      </div>
    </div>
    {notice && <div role={notice.error ? 'alert' : 'status'} className={`p-3 rounded-xl text-sm ${notice.error ? 'bg-amber-500/10 text-amber-800 dark:text-amber-300' : 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-300'}`}>{notice.message}</div>}

    <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {[
        { label: 'Sugestão de meta da rede', value: money(totalSuggestion), detail: `${comparable.length}/${rows.length} lojas com base em ${targetYear - 1} · soma das sugestões de +8%` },
        { label: `Faturamento base · ${targetYear - 1}`, value: money(totalPrevious), detail: `${MONTH_NAMES[Number(month) - 1]} · mesmo mês do ano anterior` },
        { label: `Dias úteis · ${targetYear - 1} → ${targetYear}`, value: `${previousDays.count} → ${currentDays.count}`, detail: `Segunda a sábado · ${currentDays.count - previousDays.count > 0 ? '+' : ''}${currentDays.count - previousDays.count} dias de diferença` },
        { label: `Média da meta diária · ${targetYear}`, value: money(averageDailySuggestion), detail: `Média por unidade · ${comparable.length}/${rows.length} unidades com histórico para sugerir a meta` },
      ].map(card => <div key={card.label} className={`${panel} p-5`}><p className="text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400">{card.label}</p><strong className="block text-2xl font-black mt-2 text-emerald-700 dark:text-emerald-400">{card.value}</strong><p className="text-xs text-slate-500 dark:text-slate-400 mt-2">{card.detail}</p></div>)}
    </div>
    <section className={`${panel} p-4 text-xs space-y-3`} aria-label="Regras e calendário da meta">
      <p><strong>Sugestão de meta:</strong> faturamento do mesmo mês de {targetYear - 1} × 1,08. A quantidade de dias úteis não altera os 8%; a meta diária é a sugestão dividida pelos dias úteis da unidade em {targetYear}.</p>
      <div><strong>Feriados e fechamentos da rede fora dos dias úteis · {targetYear}</strong><p className="mt-1 text-slate-500 dark:text-slate-400">{currentDays.holidays.length ? currentDays.holidays.map(holiday => `${holiday.date.slice(8)}/${holiday.date.slice(5, 7)} ${holiday.name}${holiday.alreadySunday ? ' (domingo, já excluído)' : ''}`).join(' · ') : 'Nenhum feriado ou fechamento da rede neste mês.'}</p></div>
      <p className="text-slate-500 dark:text-slate-400">Dias úteis: segunda a sábado, sem domingos, feriados nacionais e fechamentos aprovados. O card compara o calendário da rede; cada unidade também desconta seus feriados locais aprovados. Carnaval e Corpus Christi só são descontados quando há fechamento aprovado. Consciência Negra entra como feriado nacional a partir de 2024. <a href="https://agenciagov.ebc.com.br/noticias/202512/confira-o-calendario-oficial-de-feriados-nacionais-e-pontos-facultativos-em-2026" target="_blank" rel="noreferrer" className="underline">Calendário oficial</a>.</p>
    </section>
    <section className="space-y-3" aria-label="Comparação e sugestões por loja">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-base font-bold">{MONTH_NAMES[Number(month) - 1]} · comparativo por loja</h2><p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Clique na loja para consultar lucros, metas e custos originais. Arraste a tabela para ver todas as colunas.</p></div>
        <div className="flex flex-wrap gap-2 items-center"><label className={`${panel} flex items-center gap-2 px-3 py-2`}><Search size={14} className="text-slate-400" /><input aria-label="Buscar loja" value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar loja..." className="text-xs bg-transparent outline-none w-36" /></label>
          <button disabled={!canManage || saving || loadingPlans || plansError || !rows.some(row => row.suggestion !== null && plans[row.id] === undefined)} onClick={() => setDrafts(previous => { const entries = { ...previous[period] }; rows.forEach(row => { if (row.suggestion !== null && entries[row.id] === undefined) entries[row.id] = row.suggestion; }); return { ...previous, [period]: entries }; })} className={`${button} bg-emerald-500/10 text-emerald-700 dark:text-emerald-300`}>Preencher metas sem valor com +8%</button>
          {search && <button onClick={() => setSearch('')} className={`${button} bg-slate-100 dark:bg-slate-800`}>Limpar busca</button>}
          <button disabled={!canManage || saving || loadingPlans || plansError || !Object.keys(plans).length} onClick={() => setDrafts(previous => { const next = { ...previous }; delete next[period]; return next; })} className={`${button} bg-slate-100 dark:bg-slate-800`}><RotateCcw size={14} /> Restaurar sugestão do mês</button></div>
      </div>
      {!dirty && !Object.keys(plans).length && !loadingPlans && !plansError && <p className="text-xs text-slate-500 dark:text-slate-400">Nenhuma meta salva neste mês. Digite a meta planejada ou clique em “Preencher metas sem valor com +8%” para habilitar o salvamento. A supermeta é calculada automaticamente com mais 10%.</p>}
      <GoalsComparisonTable key={period} rows={filtered} previousRows={previousRows} previousPeriod={previousPeriod} storageKey={`goals-columns:v1:${currentUser?.id ?? "default"}`} targetYear={targetYear} plans={plans} onPlanChange={updatePlan} readOnly={!canManage || loadingPlans || plansError || saving} />
      <p className="text-xs text-slate-500 dark:text-slate-400">{filtered.length}/{rows.length} lojas · {report.stores.length} registros originais neste mês. Metas planejadas são salvas no SQLite por loja, mês e ano; a sugestão de +8% permanece fixa.{dirty && <strong className="text-amber-700 dark:text-amber-400"> Há ajustes ainda não salvos.</strong>}</p>
    </section>

  </div>;
}
