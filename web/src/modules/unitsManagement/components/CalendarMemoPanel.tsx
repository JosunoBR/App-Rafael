import React, { useEffect, useRef, useState } from 'react';
import { apiFetch } from '../../../utils/api';

export type MemoDrafts = Record<string, { content: string; version: number }>;
type MemoRecord = { storeId: string; storeName: string; date: string; content: string; version: number; authorName: string; createdAt: string | null; updatedAt: string | null };
type Props = {
  date: string;
  initialStoreId: string;
  stores: { id: string; name: string; active: boolean | number }[];
  drafts: MemoDrafts;
  setDrafts: React.Dispatch<React.SetStateAction<MemoDrafts>>;
  onSaved: () => Promise<void>;
  onSavingChange: (saving: boolean) => void;
};
const control = 'rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm';
const formatDate = (value: string) => new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo' }).format(new Date(value));

export function CalendarMemoPanel({ date, initialStoreId, stores, drafts, setDrafts, onSaved, onSavingChange }: Props) {
  const [storeId, setStoreId] = useState(initialStoreId === 'all' ? '' : initialStoreId);
  const key = `${storeId}:${date}`;
  const [snapshot, setSnapshot] = useState<{ key: string; record: MemoRecord | null; error: string }>({ key: '', record: null, error: '' });
  const [reload, setReload] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const lock = useRef(false);
  useEffect(() => {
    if (!storeId) return;
    let active = true;
    setSnapshot({ key, record: null, error: '' }); setError(''); setNotice('');
    apiFetch(`/calendar-memos/${encodeURIComponent(storeId)}/${date}`).then(response => response.json()).then(record => {
      if (active) setSnapshot({ key, record, error: '' });
    }).catch(() => { if (active) setSnapshot({ key, record: null, error: 'Não foi possível carregar o memorando. Tente novamente.' }); });
    return () => { active = false; };
  }, [storeId, date, key, reload]);
  const record = snapshot.key === key ? snapshot.record : null;
  const draft = drafts[key];
  const content = draft?.content ?? record?.content ?? '';
  const version = draft?.version ?? record?.version ?? 0;
  const dirty = !!record && content !== record.content;
  const update = (text: string) => setDrafts(previous => {
    const next = { ...previous };
    if (text === record?.content) delete next[key];
    else next[key] = { content: text, version };
    return next;
  });
  const discard = () => {
    setDrafts(previous => { const next = { ...previous }; delete next[key]; return next; });
    setReload(value => value + 1);
  };
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!record || !dirty || lock.current) return;
    lock.current = true; setSaving(true); onSavingChange(true); setError(''); setNotice('');
    try {
      const response = await apiFetch(`/calendar-memos/${encodeURIComponent(storeId)}/${date}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content, version }) });
      const saved: MemoRecord = await response.json();
      setSnapshot({ key, record: saved, error: '' });
      setDrafts(previous => { const next = { ...previous }; delete next[key]; return next; });
      setNotice('Memorando salvo para esta unidade e data.');
      try { await onSaved(); } catch { setNotice('Memorando salvo. Atualize o calendário para visualizar a indicação na data.'); }
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Não foi possível salvar. Seu texto foi preservado.'); }
    finally { lock.current = false; setSaving(false); onSavingChange(false); }
  };
  return <form onSubmit={save} className="space-y-4">
    <label className="block text-xs font-bold">Unidade
      <select aria-label="Unidade do memorando" autoFocus className={`${control} block w-full mt-1`} value={storeId} disabled={saving} onChange={event => setStoreId(event.target.value)}>
        <option value="">Selecione a unidade</option>{stores.map(store => <option key={store.id} value={store.id}>{store.name}{!store.active ? ' (inativa)' : ''}</option>)}
      </select>
    </label>
    {!storeId ? <p className="text-xs text-slate-500">Selecione uma unidade para escrever ou consultar a avaliação deste dia.</p> : <>
      {snapshot.key === key && snapshot.error && <div role="alert" className="text-sm text-rose-600">{snapshot.error}<button type="button" className="ml-2 underline" onClick={() => setReload(value => value + 1)}>Tentar novamente</button></div>}
      {!record && !snapshot.error && <p role="status" className="text-xs animate-pulse text-slate-500">Carregando memorando...</p>}
      <label className="block text-xs font-bold">Avaliação do dia
        <textarea aria-label="Memorando de avaliação do dia" rows={7} maxLength={10000} disabled={!record || saving} value={content} onChange={event => update(event.target.value)} placeholder="Registre a avaliação desta unidade na data selecionada..." className={`${control} block w-full mt-1 resize-y font-normal`} />
      </label>
      <div className="flex justify-between text-[10px] text-slate-500"><span>{draft ? 'Alterações não salvas' : ''}</span><span>{content.length.toLocaleString('pt-BR')}/10.000</span></div>
      {record?.updatedAt && <p className="text-xs text-slate-500">{record.authorName && <>Registrado por <strong>{record.authorName}</strong> · </>}{formatDate(record.updatedAt)}{record.createdAt && record.createdAt !== record.updatedAt && <span className="block">Criado em {formatDate(record.createdAt)}</span>}</p>}
      {error && <p role="alert" className="text-sm text-rose-600">{error}</p>}
      {notice && <p role="status" className="text-xs text-emerald-700 dark:text-emerald-400">{notice}</p>}
      <div className="flex flex-wrap justify-end gap-2">
        {draft && <button type="button" disabled={saving} className="px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-50" onClick={discard}>Descartar rascunho e recarregar</button>}
        <button type="submit" disabled={saving || !record || !dirty || !content.trim() && !record.version} className="px-3 py-2 rounded-lg text-xs font-bold bg-emerald-600 text-white cursor-pointer disabled:opacity-50 disabled:cursor-default">{saving ? 'Salvando...' : 'Salvar memorando'}</button>
      </div>
    </>}
  </form>;
}
