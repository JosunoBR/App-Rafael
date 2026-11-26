import React, { useEffect, useRef, useState } from 'react';
import { apiFetch } from '../../../utils/api';

export type MemoDrafts = Record<string, { content: string; version: number }>;
type MemoAttachment = { id: string; originalName: string; sizeBytes: number; uploadedAt: string };
type MemoRecord = { storeId: string; storeName: string; date: string; content: string; version: number; authorName: string; createdAt: string | null; updatedAt: string | null; attachments: MemoAttachment[] };
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
  const [uploading, setUploading] = useState(false);
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
  const upload = async (files: FileList | null) => {
    if (!files?.length || !record?.version || dirty || lock.current) return;
    lock.current = true; setUploading(true); onSavingChange(true); setError(''); setNotice('');
    try {
      for (const file of Array.from(files)) {
        if (!file.size || file.size > 20 * 1024 * 1024) throw new Error(`O arquivo ${file.name} deve ter entre 1 byte e 20 MB.`);
        await apiFetch(`/calendar-memos/${encodeURIComponent(storeId)}/${date}/attachments`, {
          method: 'POST', headers: { 'Content-Type': 'application/octet-stream', 'X-File-Name': encodeURIComponent(file.name), 'Idempotency-Key': crypto.randomUUID() }, body: file
        });
      }
      const response = await apiFetch(`/calendar-memos/${encodeURIComponent(storeId)}/${date}`);
      setSnapshot({ key, record: await response.json(), error: '' });
      setNotice('Anexo vinculado ao memorando.');
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Não foi possível anexar o arquivo.');
      setReload(value => value + 1);
    } finally { lock.current = false; setUploading(false); onSavingChange(false); }
  };
  const download = async (attachment: MemoAttachment) => {
    try {
      const response = await apiFetch(`/calendar-memos/attachments/${encodeURIComponent(attachment.id)}`);
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement('a'); link.href = url; link.download = attachment.originalName;
      document.body.appendChild(link); link.click(); link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch { setError('Não foi possível baixar o anexo.'); }
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
      <section className="rounded-xl border border-slate-200 dark:border-slate-700 p-3 space-y-2" aria-label="Anexos do memorando">
        <h3 className="text-xs font-bold">Arquivos anexados</h3>
        {record?.attachments?.length ? <ul className="space-y-1">{record.attachments.map(attachment =>
          <li key={attachment.id}><button type="button" onClick={() => void download(attachment)} className="text-xs text-indigo-600 dark:text-indigo-300 underline break-all text-left">{attachment.originalName} ({(attachment.sizeBytes / 1024).toFixed(1)} KB)</button></li>
        )}</ul> : <p className="text-xs text-slate-500">Nenhum arquivo anexado.</p>}
        <label className="block text-xs font-medium">Adicionar arquivos de qualquer extensão (até 20 MB por arquivo)
          <input type="file" multiple disabled={!record?.version || dirty || saving || uploading} onChange={event => { const files = event.currentTarget.files; void upload(files); event.currentTarget.value = ''; }} className="block w-full mt-1 text-xs disabled:opacity-50" />
        </label>
        {dirty && <p className="text-xs text-amber-700 dark:text-amber-400">Salve o texto antes de anexar arquivos.</p>}
        {uploading && <p role="status" className="text-xs text-slate-500">Enviando arquivos...</p>}
      </section>
      {error && <p role="alert" className="text-sm text-rose-600">{error}</p>}
      {notice && <p role="status" className="text-xs text-emerald-700 dark:text-emerald-400">{notice}</p>}
      <div className="flex flex-wrap justify-end gap-2">
        {draft && <button type="button" disabled={saving} className="px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-50" onClick={discard}>Descartar rascunho e recarregar</button>}
        <button type="submit" disabled={saving || !record || !dirty || !content.trim() && !record.version} className="px-3 py-2 rounded-lg text-xs font-bold bg-emerald-600 text-white cursor-pointer disabled:opacity-50 disabled:cursor-default">{saving ? 'Salvando...' : 'Salvar memorando'}</button>
      </div>
    </>}
  </form>;
}
