import React, { useCallback, useEffect, useRef, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, RefreshCw, X } from 'lucide-react';
import { apiFetch, ApiError } from '../../../utils/api';
import { businessDate } from '../../../shared/businessDate';
import { nationalHolidays } from '../../../shared/nationalHolidays';
import type { StoreHolidayRequest } from '../types/unitsManagement.types';

type CalendarStore = { id: string; name: string; active: boolean | number };
const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const panel = 'rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B132B]';
const inputClass = 'rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm';
const buttonClass = 'rounded-lg px-3 py-2 text-xs font-bold cursor-pointer disabled:opacity-50 disabled:cursor-default focus-visible:outline-2 focus-visible:outline-emerald-500';
const networkColor = 'bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/20';
const localColor = 'bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/20';

export function UnitsCalendarPage() {
  const today = businessDate();
  const [period, setPeriod] = useState(today.slice(0,7));
  const [storeId, setStoreId] = useState('all');
  const [stores, setStores] = useState<CalendarStore[]>([]);
  const [holidays, setHolidays] = useState<StoreHolidayRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const mutationLock = useRef(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [scope, setScope] = useState<'rede' | 'unidades'>('rede');
  const [selectedStores, setSelectedStores] = useState<string[]>([]);
  const [reasons, setReasons] = useState<Record<string,string>>({});
  const [year, month] = period.split('-').map(Number);
  const reload = useCallback(async () => {
    const [events, units] = await Promise.allSettled([
      apiFetch('/holidays').then(response => response.json()),
      apiFetch('/config/stores').then(response => response.json()),
    ]);
    const errors: string[] = [];
    if (units.status === 'fulfilled') setStores(units.value);
    else errors.push('Não foi possível atualizar a lista de lojas cadastradas.');
    if (events.status === 'fulfilled') setHolidays(events.value);
    else errors.push(events.reason instanceof ApiError && events.reason.status === 404
      ? 'A consulta de feriados ainda não está disponível no servidor. Reinicie o backend para carregar a versão atualizada.'
      : 'Não foi possível atualizar os feriados do calendário.');
    setLoadError(errors.join(' ')); setLoading(false);
    if (errors.length) throw new Error(errors.join(' '));
  }, []);
  useEffect(() => {
    let active = true;
    const refresh = () => { if (active) void reload().catch(failure => { if (active) { setLoadError(failure.message || 'Não foi possível carregar o calendário.'); setLoading(false); } }); };
    refresh();
    const timer = window.setInterval(refresh, 15000);
    window.addEventListener('focus', refresh);
    return () => { active = false; window.clearInterval(timer); window.removeEventListener('focus', refresh); };
  }, [reload]);
  useEffect(() => {
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape' && !mutationLock.current) setSelectedDate(null); };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, []);
  const mutate = async (path: string, body: object) => {
    if (mutationLock.current) return false;
    mutationLock.current = true; setBusy(true); setError('');
    try {
      await apiFetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      try { await reload(); } catch { setLoadError('Registro salvo. Não foi possível atualizar o calendário; clique em atualizar.'); }
      return true;
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Não foi possível salvar o feriado.'); return false; }
    finally { mutationLock.current = false; setBusy(false); }
  };
  const review = (id: string, decision: string) => mutate(`/holidays/${encodeURIComponent(id)}/review`, { decision, note: reasons[id] || (decision === 'cancelado' ? 'Cancelado pela central no calendário' : '') });
  const visible = holidays.filter(item => item.data.startsWith(period) && (storeId === 'all' || item.lojaId === null || item.lojaId === storeId));
  const approved = visible.filter(item => item.status === 'aprovado' && item.action !== 'reabrir');
  const pending = visible.filter(item => item.status === 'pendente');
  const national = nationalHolidays(year);
  const years = [...new Set([year, ...Array.from({ length: 11 }, (_, index) => Number(today.slice(0,4)) - 5 + index), ...holidays.map(item => Number(item.data.slice(0,4)))])].sort((a,b) => a-b);
  const openDate = (date: string) => {
    setSelectedDate(date); setName(''); setError('');
    setScope(storeId === 'all' ? 'rede' : 'unidades');
    setSelectedStores(storeId === 'all' || !stores.find(store => store.id === storeId)?.active ? [] : [storeId]);
  };
  const shiftMonth = (delta: number) => {
    const date = new Date(Date.UTC(year, month - 1 + delta, 1));
    setPeriod(date.toISOString().slice(0,7));
  };
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedDate || !name.trim() || scope === 'unidades' && !selectedStores.length) return;
    if (await mutate('/holidays/central', { date: selectedDate, name: name.trim(), scope, ...(scope === 'unidades' ? { storeIds: selectedStores } : {}) })) setSelectedDate(null);
  };
  const firstWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const calendarDays = Array.from({ length: Math.ceil((firstWeekday + daysInMonth) / 7) * 7 }, (_, index) => index - firstWeekday + 1);
  const selectedEvents = selectedDate ? approved.filter(item => item.data === selectedDate) : [];
  return <div className="max-w-[1600px] mx-auto space-y-5 pb-10 text-slate-900 dark:text-slate-100">
    <header className={`${panel} p-5 flex flex-wrap items-center justify-between gap-4`}>
      <div className="flex items-center gap-3"><CalendarDays className="text-emerald-500" size={28} /><div><h1 className="text-2xl font-black">Calendário</h1><p className="text-xs text-slate-500 dark:text-slate-400">Feriados e dias úteis das unidades</p></div></div>
      <div className="flex flex-wrap items-center gap-2">
        <select aria-label="Unidade do calendário" className={inputClass} value={storeId} onChange={event => setStoreId(event.target.value)}><option value="all">Todas as lojas</option>{stores.map(store => <option key={store.id} value={store.id}>{store.name}{!store.active ? ' (inativa)' : ''}</option>)}</select>
        <button type="button" disabled={busy} className={`${buttonClass} bg-slate-100 dark:bg-slate-800`} aria-label="Atualizar calendário" onClick={() => void reload().catch(failure => setLoadError(failure.message))}><RefreshCw size={16} /></button>
      </div>
    </header>
    {loadError && <p role="alert" className="p-3 rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-300">{loadError}</p>}
    {!selectedDate && error && <p role="alert" className="text-sm text-rose-600">{error}</p>}
    <section className={`${panel} overflow-hidden`} aria-label="Calendário de feriados">
      <div className="p-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2"><button type="button" aria-label="Mês anterior" className={buttonClass} onClick={() => shiftMonth(-1)}><ChevronLeft size={18} /></button>
          <select aria-label="Mês do calendário" className={inputClass} value={month} onChange={event => setPeriod(`${year}-${event.target.value.padStart(2,'0')}`)}>{MONTHS.map((label,index) => <option key={label} value={index+1}>{label}</option>)}</select>
          <select aria-label="Ano do calendário" className={inputClass} value={year} onChange={event => setPeriod(`${event.target.value}-${String(month).padStart(2,'0')}`)}>{years.map(value => <option key={value}>{value}</option>)}</select>
          <button type="button" aria-label="Próximo mês" className={buttonClass} onClick={() => shiftMonth(1)}><ChevronRight size={18} /></button>
          <button type="button" className={`${buttonClass} bg-slate-100 dark:bg-slate-800`} onClick={() => setPeriod(today.slice(0,7))}>Hoje</button>
        </div>
        <div className="flex gap-3 text-xs"><span className={`rounded-lg border px-2 py-1 ${networkColor}`}>Nacionais / toda a rede</span><span className={`rounded-lg border px-2 py-1 ${localColor}`}>Locais / unidades selecionadas</span></div>
      </div>
      {loading ? <div role="status" className="h-96 animate-pulse p-6 bg-slate-100 dark:bg-slate-800">Carregando calendário...</div> : <div className="overflow-x-auto"><div className="min-w-[680px]">
        <div className="grid grid-cols-7 bg-slate-50 dark:bg-slate-900 text-xs font-bold text-center">{['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'].map(label => <div key={label} className="p-3">{label}</div>)}</div>
        <div className="grid grid-cols-7">{calendarDays.map((day,index) => {
          if (day < 1 || day > daysInMonth) return <div key={`blank-${index}`} className="bg-slate-50/50 dark:bg-slate-900/40 border-t border-r border-slate-100 dark:border-slate-800" />;
          const date = `${period}-${String(day).padStart(2,'0')}`;
          const events = approved.filter(item => item.data === date);
          const grouped = new Map<string, { id: string; name: string; network: boolean; units: string[] }>();
          events.forEach(item => {
            const key = `${item.scope}:${item.holidayName}`;
            const group = grouped.get(key);
            if (group) group.units.push(item.lojaNome);
            else grouped.set(key, { id: item.id, name: item.holidayName, network: item.scope === 'rede', units: [item.lojaNome] });
          });
          const nationalName = national[date.slice(5)];
          const dayPending = pending.filter(item => item.data === date).length;
          return <button key={date} type="button" data-date={date} aria-label={`Cadastrar ou consultar feriado em ${date}`} onClick={() => openDate(date)} disabled={!!loadError} className={`min-h-32 p-2 flex flex-col items-stretch justify-start text-left border-t border-r border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer focus-visible:outline-2 focus-visible:outline-emerald-500 ${date === today ? 'ring-1 ring-inset ring-emerald-500' : ''}`}>
            <span className={`block text-xs mb-2 font-bold ${index % 7 === 0 ? 'text-slate-400' : ''}`}>{day}</span>
            <span className="block space-y-1">
              {nationalName && <span className={`block rounded-md border p-1 text-[10px] ${networkColor}`}>{nationalName}<span className="block opacity-70">Nacional · todas as lojas</span></span>}
              {[...grouped.values()].map(item => <span key={item.id} title={item.network ? 'Toda a rede' : item.units.join(', ')} className={`block rounded-md border p-1 text-[10px] ${item.network ? networkColor : localColor}`}>{item.name}<span className="block opacity-70">{item.network ? 'Toda a rede' : item.units.length <= 2 ? item.units.join(', ') : `${item.units.length} unidades`}</span></span>)}
              {dayPending > 0 && <span className="block text-[10px] text-slate-500">{dayPending} solicitação(ões) pendente(s)</span>}
            </span>
          </button>;
        })}</div>
      </div></div>}
      <p className="p-3 text-xs text-slate-500 dark:text-slate-400">Clique em uma data para cadastrar ou consultar. Domingos, feriados nacionais e fechamentos aprovados não contam como dias úteis. Datas sobrepostas são descontadas uma única vez.</p>
    </section>
    {!!pending.length && <section className={`${panel} p-4 space-y-3`} aria-label="Solicitações de feriados"><h2 className="font-bold">Solicitações pendentes ({pending.length})</h2>{pending.map(item => <div key={item.id} className="flex flex-wrap gap-3 items-center border-t border-slate-200 dark:border-slate-800 pt-3 text-xs">
      <div className="flex-1 min-w-52"><strong>{item.holidayName}</strong><p>{item.data.split('-').reverse().join('/')} · {item.lojaNome} · {item.action === 'reabrir' ? 'Reabertura' : 'Sem expediente'}</p>{item.motivoLoja && <p>{item.motivoLoja}</p>}</div>
      <input aria-label={`Motivo da recusa ${item.id}`} value={reasons[item.id] || ''} maxLength={300} placeholder="Motivo para recusar" className={inputClass} onChange={event => setReasons(previous => ({ ...previous, [item.id]: event.target.value }))} />
      <button type="button" disabled={busy || !reasons[item.id]?.trim()} className={`${buttonClass} text-rose-600 border border-rose-500/30`} onClick={() => void review(item.id, 'recusado')}>Recusar</button>
      <button type="button" disabled={busy} className={`${buttonClass} bg-emerald-600 text-white`} onClick={() => void review(item.id, 'aprovado')}>{item.action === 'reabrir' ? 'Aprovar reabertura' : 'Aprovar feriado'}</button>
    </div>)}</section>}
    {selectedDate && <div className="fixed inset-0 z-50 bg-slate-950/70 flex items-center justify-center p-4" onClick={() => { if (!busy) setSelectedDate(null); }}>
      <div role="dialog" aria-modal="true" aria-labelledby="holiday-dialog-title" className={`${panel} p-5 w-full max-w-xl max-h-[90vh] overflow-y-auto space-y-4 shadow-xl`} onClick={event => event.stopPropagation()}>
        <div className="flex justify-between items-center"><h2 id="holiday-dialog-title" className="font-bold text-lg">Feriados · {selectedDate.split('-').reverse().join('/')}</h2><button aria-label="Fechar cadastro de feriado" type="button" disabled={busy} className={buttonClass} onClick={() => setSelectedDate(null)}><X size={18} /></button></div>
        {national[selectedDate.slice(5)] && <p className={`p-3 rounded-xl border text-xs ${networkColor}`}>{national[selectedDate.slice(5)]} · feriado nacional automático para todas as lojas.</p>}
        {selectedEvents.map(item => <div key={item.id} className={`p-3 rounded-xl border text-xs flex justify-between items-center gap-3 ${item.scope === 'rede' ? networkColor : localColor}`}><div><strong>{item.holidayName}</strong><p>{item.scope === 'rede' ? 'Toda a rede, incluindo novas unidades' : item.lojaNome}</p></div><button type="button" disabled={busy} className={`${buttonClass} text-rose-600`} onClick={() => void review(item.id, 'cancelado')}>Cancelar feriado</button></div>)}
        {error && <p role="alert" className="text-sm text-rose-600">{error}</p>}
        <form onSubmit={save} className="space-y-4">
          <label className="block text-xs font-bold">Nome do feriado<input aria-label="Nome do feriado" autoFocus required maxLength={300} value={name} onChange={event => setName(event.target.value)} className={`${inputClass} block w-full mt-1`} /></label>
          <fieldset className="space-y-2 text-sm"><legend className="text-xs font-bold mb-2">Aplicar para</legend>
            <label className="flex items-center gap-2"><input type="radio" name="holiday-scope" value="rede" checked={scope === 'rede'} onChange={() => setScope('rede')} />Todas as lojas</label>
            <label className="flex items-center gap-2"><input type="radio" name="holiday-scope" value="unidades" checked={scope === 'unidades'} onChange={() => setScope('unidades')} />Selecione a unidade</label>
          </fieldset>
          {scope === 'unidades' && <fieldset className="max-h-56 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700 p-3 space-y-2"><legend className="text-xs font-bold px-1">Unidades ({selectedStores.length} selecionada(s))</legend>{stores.filter(store => store.active).map(store => <label key={store.id} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={selectedStores.includes(store.id)} onChange={event => setSelectedStores(previous => event.target.checked ? [...previous,store.id] : previous.filter(id => id !== store.id))} />{store.name}</label>)}</fieldset>}
          <p className="text-xs text-slate-500">O cadastro da central já é aprovado e desconta os dias úteis das unidades abrangidas. Selecionar todas as lojas inclui automaticamente as novas unidades da rede.</p>
          <div className="flex justify-end gap-2"><button type="button" disabled={busy} className={`${buttonClass} bg-slate-100 dark:bg-slate-800`} onClick={() => setSelectedDate(null)}>Voltar</button><button disabled={busy || !!loadError || !name.trim() || scope === 'unidades' && !selectedStores.length} className={`${buttonClass} bg-emerald-600 text-white`} type="submit">{busy ? 'Salvando...' : 'Salvar feriado'}</button></div>
        </form>
      </div>
    </div>}
  </div>;
}
