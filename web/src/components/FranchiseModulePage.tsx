import { useEffect, useState } from 'react';
import { ArrowRight, ClipboardList, Database, Search, Store } from 'lucide-react';
import { FranchisePageHeader } from './FranchisePageHeader';
import { FRANCHISE_PAGES } from '../modules/franchises/pageDefinitions';
import type { StoreConfig } from '../shared/types';
import { FRANCHISE_MODULES, type FranchiseNavTab } from '../shared/franchiseModules';
import { fetchStoresFromDb } from '../utils/api';
import { AnnouncementsPage } from '../modules/franchises/pages/AnnouncementsPage';
import { FranchiseDraftForm } from '../modules/franchises/pages/FranchiseDraftForm';
import type { ActiveNavTab } from '../shared/permissions';

type Props = { tab: FranchiseNavTab; onSelectNav: (tab: ActiveNavTab) => void };

export function FranchiseModulePage({ tab, onSelectNav }: Props) {
  const [search, setSearch] = useState('');
  const [stores, setStores] = useState<StoreConfig[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    if (tab === 'franchise_announcements') return;
    let cancelled = false;
    setIsLoading(true);
    setLoadError(false);
    fetchStoresFromDb()
      .then(result => { if (!cancelled) setStores(result); })
      .catch(() => { if (!cancelled) setLoadError(true); })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, [tab]);
  const module = FRANCHISE_MODULES.find(item => item.id === tab);
  if (!module) return null;
  if (tab === 'franchise_announcements') return <AnnouncementsPage />;

  const page = FRANCHISE_PAGES[tab];
  const isUnitsPage = tab === 'franchise_units';
  const visibleStores = isUnitsPage
    ? stores.filter(store => `${store.name} ${store.shortName || ''} ${store.id}`.toLocaleLowerCase('pt-BR').includes(search.trim().toLocaleLowerCase('pt-BR')))
    : [];

  return (
    <section className="mx-auto w-full max-w-7xl space-y-5 p-4 sm:p-6" aria-labelledby="franchise-page-title">
      <FranchisePageHeader
        title={module.label}
        description={page.summary}
        badge={module.status}
        icon={Store}
        primaryAction={{ label: 'Personalizar', onClick: () => onSelectNav('home') }}
      />

      {tab === 'franchise_agenda' && (
        <button type="button" onClick={() => onSelectNav('units_calendar')} className="w-full rounded-2xl border border-emerald-300 bg-emerald-50 px-5 py-4 text-left text-sm font-semibold text-emerald-900 hover:bg-emerald-100 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200 dark:hover:bg-emerald-950/50">
          Abrir o calendário já existente para consultar datas e registrar memorandos diários →
        </button>
      )}

      <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-2 text-slate-900 dark:text-white">
            <ClipboardList className="h-4 w-4 text-emerald-500" aria-hidden="true" />
            <h2 className="text-sm font-bold">Fluxo de trabalho</h2>
          </div>
          <ol className="mt-5 grid gap-3 sm:grid-cols-3">
            {page.stages.map((stage, index) => (
              <li key={stage} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/60">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">{index + 1}</span>
                <span className="text-xs font-medium text-slate-700 dark:text-slate-200">{stage}</span>
                {index < page.stages.length - 1 && <ArrowRight className="ml-auto hidden h-3 w-3 shrink-0 text-slate-400 sm:block" aria-hidden="true" />}
              </li>
            ))}
          </ol>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-2 text-slate-900 dark:text-white">
            <Database className="h-4 w-4 text-emerald-500" aria-hidden="true" />
            <h2 className="text-sm font-bold">Dados necessários</h2>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-slate-600 dark:text-slate-300">{page.dependencies}</p>
        </div>
      </div>

      <div className={`grid gap-4 ${isUnitsPage ? 'lg:grid-cols-[1fr_2fr]' : 'lg:grid-cols-[1.4fr_1fr]'}`}>
        {isUnitsPage ? <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">Campos de {page.record.toLocaleLowerCase('pt-BR')}</h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Estrutura prevista para o cadastro e a consulta.</p>
          <ul className="mt-4 space-y-2">
            {page.fields.map(field => (
              <li key={field} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200">{field}</li>
            ))}
          </ul>
        </div> : <FranchiseDraftForm tab={tab} stores={stores} />}
        <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">{isUnitsPage ? 'Unidades cadastradas' : `Registros de ${page.record.toLocaleLowerCase('pt-BR')}`}</h2>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{isUnitsPage ? 'Dados do cadastro atual do sistema.' : 'A listagem será alimentada pelos lançamentos deste módulo.'}</p>
            </div>
            {isUnitsPage && !isLoading && !loadError && <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">{stores.length} unidade(s)</span>}
          </div>
          {isUnitsPage && (
            <label className="relative mt-4 block">
              <span className="sr-only">Buscar unidade por nome ou código</span>
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" aria-hidden="true" />
              <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar unidade por nome ou código" className="w-full rounded-xl border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
            </label>
          )}
          <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
            <table className="w-full min-w-[440px] text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                <tr>{page.columns.map(column => <th key={column} scope="col" className="px-3 py-3 font-bold">{column}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {visibleStores.map(store => (
                  <tr key={store.id} className="text-slate-700 dark:text-slate-200">
                    <td className="px-3 py-3 font-semibold">{store.name}</td>
                    <td className="px-3 py-3">{store.id}</td>
                    <td className="px-3 py-3">{store.cluster}</td>
                    <td className="px-3 py-3">{store.active ? 'Ativa' : 'Inativa'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {visibleStores.length === 0 && (
              <div className="flex flex-col items-center gap-2 px-5 py-9 text-center text-slate-500 dark:text-slate-400">
                <Store className="h-6 w-6 text-slate-400" aria-hidden="true" />
                <p className="text-xs">{isUnitsPage ? (isLoading ? 'Carregando unidades...' : loadError ? 'Não foi possível carregar as unidades. Tente acessar novamente.' : stores.length ? 'Nenhuma unidade corresponde à busca.' : 'Nenhuma unidade cadastrada.') : 'Nenhum registro criado neste módulo ainda.'}</p>
              </div>
            )}
          </div>
          {!isUnitsPage && <p className="mt-4 text-xs text-amber-700 dark:text-amber-300">Cadastro e consulta em implantação. Nenhum dado fictício foi inserido.</p>}
        </div>
      </div>
    </section>
  );
}
