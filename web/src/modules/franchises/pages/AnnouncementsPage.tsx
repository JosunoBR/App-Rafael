import { useCallback, useEffect, useMemo, useState } from 'react';
import { Archive, CheckCircle2, Megaphone, Plus, Search, X } from 'lucide-react';
import { LOGO_MEGA12_BASE64 } from '../../../assets/logoBase64';
import type { StoreConfig } from '../../../shared/types';
import { apiFetch, fetchStoresFromDb } from '../../../utils/api';

type Announcement = {
  id: string;
  title: string;
  body: string;
  audience: 'all' | 'selected';
  storeIds: string[];
  status: 'published' | 'archived';
  authorName: string;
  createdAt: string;
  archivedAt: string | null;
};

const inputClass = 'w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white';
const formatDate = (iso: string) => new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(iso));

export function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [stores, setStores] = useState<StoreConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [composerOpen, setComposerOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [audience, setAudience] = useState<'all' | 'selected'>('all');
  const [storeIds, setStoreIds] = useState<string[]>([]);
  const [filter, setFilter] = useState<'published' | 'archived'>('published');
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [confirmArchiveId, setConfirmArchiveId] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      setError('');
      const [announcementsResponse, registeredStores] = await Promise.all([
        apiFetch('/franchise-announcements').then(response => response.json() as Promise<Announcement[]>),
        fetchStoresFromDb(),
      ]);
      setAnnouncements(announcementsResponse);
      setStores(registeredStores.filter(store => store.active));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível consultar os comunicados.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void reload(); }, [reload]);

  const visible = useMemo(() => announcements.filter(item => item.status === filter &&
    `${item.title} ${item.body} ${item.authorName}`.toLocaleLowerCase('pt-BR').includes(search.trim().toLocaleLowerCase('pt-BR'))),
  [announcements, filter, search]);

  const toggleStore = (id: string) => setStoreIds(previous => previous.includes(id) ? previous.filter(value => value !== id) : [...previous, id]);

  const publish = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setNotice('');
    if (!title.trim() || !body.trim() || (audience === 'selected' && !storeIds.length)) {
      setError('Preencha título e mensagem e, se necessário, escolha as unidades.');
      return;
    }
    setSaving(true);
    try {
      await apiFetch('/franchise-announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), body: body.trim(), audience, storeIds: audience === 'all' ? [] : storeIds }),
      });
      setTitle(''); setBody(''); setAudience('all'); setStoreIds([]);
      setComposerOpen(false);
      setFilter('published');
      setNotice('Comunicado publicado e gravado no banco de dados.');
      await reload();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível publicar o comunicado.');
    } finally { setSaving(false); }
  };

  const archive = async (id: string) => {
    setSaving(true);
    setError('');
    setNotice('');
    try {
      await apiFetch(`/franchise-announcements/${encodeURIComponent(id)}/archive`, { method: 'POST' });
      setConfirmArchiveId(null);
      setNotice('Comunicado arquivado. O histórico foi preservado.');
      await reload();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível arquivar o comunicado.');
    } finally { setSaving(false); }
  };

  return (
    <section className="mx-auto w-full max-w-7xl space-y-5 p-4 sm:p-6" aria-labelledby="announcement-title">
      <div className="rounded-2xl border border-emerald-500/20 bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 p-5 text-white sm:p-7">
        <div className="flex flex-wrap items-center gap-4">
          <img src={LOGO_MEGA12_BASE64} alt="Logo Mega 12" className="h-12 w-12 rounded-xl border border-white/20 bg-slate-950/50 object-contain p-1" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-300">Mega 12 · Gestão de Franquias</p>
            <h1 id="announcement-title" className="mt-1 text-2xl font-bold">Comunicados</h1>
            <p className="mt-2 text-sm text-slate-200">Publique avisos para toda a rede ou para unidades específicas. Consulte o histórico e arquive quando necessário.</p>
          </div>
          <button type="button" onClick={() => { setComposerOpen(true); setNotice(''); }} className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-white" >
            <Plus className="h-4 w-4" aria-hidden="true" /> Novo comunicado
          </button>
        </div>
      </div>

      {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">{error}</div>}
      {notice && <div role="status" className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200"><CheckCircle2 className="h-4 w-4" aria-hidden="true" />{notice}</div>}

      {composerOpen && (
        <form onSubmit={publish} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
          <div className="flex items-center justify-between gap-3"><h2 className="text-base font-bold text-slate-900 dark:text-white">Escrever comunicado</h2><button type="button" onClick={() => setComposerOpen(false)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Fechar formulário"><X className="h-4 w-4" /></button></div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200">Título *<input autoFocus required maxLength={160} value={title} onChange={event => setTitle(event.target.value)} className={`mt-2 ${inputClass}`} placeholder="Assunto do aviso" /></label>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200">Mensagem *<textarea required maxLength={10000} rows={5} value={body} onChange={event => setBody(event.target.value)} className={`mt-2 resize-y ${inputClass}`} placeholder="Escreva o comunicado para as unidades" /></label>
          <fieldset className="space-y-3"><legend className="text-xs font-semibold text-slate-700 dark:text-slate-200">Destinatários *</legend>
            <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200"><input type="radio" name="audience" checked={audience === 'all'} onChange={() => setAudience('all')} /> Toda a rede</label>
            <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200"><input type="radio" name="audience" checked={audience === 'selected'} onChange={() => setAudience('selected')} /> Unidades selecionadas</label>
            {audience === 'selected' && <div className="max-h-44 overflow-y-auto rounded-xl border border-slate-200 p-3 dark:border-slate-700">
              {stores.length ? <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{stores.map(store => <label key={store.id} className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-200"><input type="checkbox" checked={storeIds.includes(store.id)} onChange={() => toggleStore(store.id)} /> {store.name}</label>)}</div> : <p className="text-xs text-slate-500">Nenhuma unidade ativa disponível.</p>}
            </div>}
          </fieldset>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4 dark:border-slate-800"><p className="text-xs text-slate-500 dark:text-slate-400">Após publicar, o conteúdo é preservado no histórico. A confirmação de leitura será implementada na etapa da loja.</p><button disabled={saving || (audience === 'selected' && !stores.length)} type="submit" className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50">{saving ? 'Publicando...' : 'Publicar comunicado'}</button></div>
        </form>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800" role="group" aria-label="Situação dos comunicados">
            {(['published', 'archived'] as const).map(status => <button key={status} type="button" onClick={() => setFilter(status)} aria-pressed={filter === status} className={`rounded-lg px-3 py-1.5 text-xs font-bold ${filter === status ? 'bg-white text-emerald-700 shadow-sm dark:bg-slate-700 dark:text-emerald-300' : 'text-slate-600 dark:text-slate-300'}`}>{status === 'published' ? 'Publicados' : 'Arquivados'} ({announcements.filter(item => item.status === status).length})</button>)}
          </div>
          <label className="relative w-full sm:w-64"><span className="sr-only">Buscar comunicados</span><Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" aria-hidden="true" /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar comunicados" className={`${inputClass} pl-9`} /></label>
        </div>
        <div className="mt-4 space-y-3">
          {loading ? <p className="py-8 text-center text-sm text-slate-500">Carregando comunicados...</p> : visible.length ? visible.map(item => (
            <article key={item.id} className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
              <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0 flex-1"><h3 className="font-bold text-slate-900 dark:text-white">{item.title}</h3><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{formatDate(item.createdAt)} · {item.authorName} · {item.audience === 'all' ? 'Toda a rede' : item.storeIds.map(id => stores.find(store => store.id === id)?.name || id).join(', ')}</p></div><div className="flex gap-2"><button type="button" onClick={() => setExpandedId(expandedId === item.id ? null : item.id)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">{expandedId === item.id ? 'Ocultar' : 'Ler'}</button>{item.status === 'published' && <button type="button" onClick={() => setConfirmArchiveId(item.id)} className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800" aria-label={`Arquivar ${item.title}`}><Archive className="h-4 w-4" /></button>}</div></div>
              {expandedId === item.id && <p className="mt-4 whitespace-pre-wrap border-t border-slate-100 pt-4 text-sm leading-relaxed text-slate-700 dark:border-slate-800 dark:text-slate-200">{item.body}</p>}
              {confirmArchiveId === item.id && <div className="mt-3 flex flex-wrap items-center gap-3 rounded-lg bg-amber-50 p-3 text-xs text-amber-900 dark:bg-amber-950/30 dark:text-amber-200"><span>Arquivar este comunicado?</span><button type="button" disabled={saving} onClick={() => void archive(item.id)} className="font-bold underline disabled:opacity-50">Confirmar</button><button type="button" onClick={() => setConfirmArchiveId(null)} className="underline">Cancelar</button></div>}
            </article>
          )) : <div className="flex flex-col items-center gap-2 py-10 text-center text-slate-500 dark:text-slate-400"><Megaphone className="h-7 w-7" aria-hidden="true" /><p className="text-sm">{search ? 'Nenhum comunicado corresponde à busca.' : filter === 'published' ? 'Nenhum comunicado publicado ainda.' : 'Nenhum comunicado arquivado.'}</p></div>}
        </div>
      </div>
    </section>
  );
}
