import { useEffect, useState } from 'react';
import { Plus, RotateCcw, X } from 'lucide-react';
import type { StoreConfig } from '../../../shared/types';
import type { FranchiseNavTab } from '../../../shared/franchiseModules';
import { FRANCHISE_FORMS, type FranchiseField } from '../formDefinitions';
import { FRANCHISE_PAGES } from '../pageDefinitions';

type Props = { tab: FranchiseNavTab; stores: StoreConfig[] };
const inputStyle = 'mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100';

export function FranchiseDraftForm({ tab, stores }: Props) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [lines, setLines] = useState([{ label: '', detail: '' }]);
  const [revision, setRevision] = useState(0);
  const fields = FRANCHISE_FORMS[tab];
  const page = FRANCHISE_PAGES[tab];
  const hasLines = ['franchise_purchases', 'franchise_checklists', 'franchise_implementation'].includes(tab);
  const lineTitle = tab === 'franchise_purchases' ? 'Itens solicitados' : tab === 'franchise_checklists' ? 'Perguntas da vistoria' : 'Etapas da abertura';
  const firstLabel = tab === 'franchise_purchases' ? 'Material ou insumo' : tab === 'franchise_checklists' ? 'Pergunta / verificação' : 'Atividade';
  const secondLabel = tab === 'franchise_purchases' ? 'Quantidade' : tab === 'franchise_checklists' ? 'Orientação de conferência' : 'Responsável ou prazo';

  useEffect(() => { setValues({}); setLines([{ label: '', detail: '' }]); setRevision(value => value + 1); }, [tab]);

  const reset = () => {
    setValues({});
    setLines([{ label: '', detail: '' }]);
    setRevision(value => value + 1);
  };

  const control = (field: FranchiseField) => {
    const value = values[field.name] || '';
    if (field.type === 'textarea') return <textarea className={`${inputStyle} min-h-24 resize-y`} rows={3} value={value} onChange={event => setValues(previous => ({ ...previous, [field.name]: event.target.value }))} placeholder={field.label} />;
    if (field.type === 'file') return <input key={`${field.name}-${revision}`} className={`${inputStyle} file:mr-3 file:rounded-lg file:border-0 file:bg-emerald-50 file:px-3 file:py-1 file:text-xs file:font-bold file:text-emerald-700 dark:file:bg-emerald-950/50 dark:file:text-emerald-300`} type="file" />;
    if (field.type === 'select') {
      const choices = field.options || [];
      const units = field.name === 'unit' ? stores.map(store => ({ value: store.id, label: store.name })) : [];
      return <select className={inputStyle} value={value} onChange={event => setValues(previous => ({ ...previous, [field.name]: event.target.value }))}>
        <option value="">Selecionar...</option>
        {choices.map(option => <option key={option} value={option}>{option}</option>)}
        {units.map(unit => <option key={unit.value} value={unit.value}>{unit.label}</option>)}
      </select>;
    }
    return <input type={field.type} className={inputStyle} value={value} onChange={event => setValues(previous => ({ ...previous, [field.name]: event.target.value }))} placeholder={field.type === 'text' ? field.label : undefined} min={field.type === 'number' ? 0 : undefined} />;
  };

  if (!fields.length) return null;

  return (
    <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900" aria-labelledby="preview-form-title">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div><h2 id="preview-form-title" className="text-sm font-bold text-slate-900 dark:text-white">{tab === 'franchise_analytics' ? 'Filtros de análise' : 'Prévia do formulário'}</h2><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Teste a distribuição dos campos e a navegação.</p></div>
        <button type="button" onClick={reset} className="flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1.5 text-xs text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"><RotateCcw className="h-3 w-3" aria-hidden="true" /> Limpar</button>
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {fields.map(field => <label key={field.name} className={`block text-xs font-semibold text-slate-700 dark:text-slate-200 ${field.type === 'textarea' || field.type === 'file' ? 'sm:col-span-2' : ''}`}>
          {field.label}{control(field)}{field.hint && <span className="mt-1 block text-[11px] font-normal text-slate-500 dark:text-slate-400">{field.hint}</span>}
        </label>)}
      </div>
      {hasLines && <div className="mt-6 border-t border-slate-100 pt-4 dark:border-slate-800">
        <h3 className="text-xs font-bold text-slate-900 dark:text-white">{lineTitle}</h3>
        <div className="mt-3 space-y-3">{lines.map((line, index) => <div key={index} className="grid gap-2 rounded-xl border border-slate-200 p-3 dark:border-slate-700 sm:grid-cols-[1fr_1fr_auto]">
          <label className="text-xs font-medium text-slate-600 dark:text-slate-300">{firstLabel}<input value={line.label} onChange={event => setLines(previous => previous.map((item, itemIndex) => itemIndex === index ? { ...item, label: event.target.value } : item))} className={inputStyle} /></label>
          <label className="text-xs font-medium text-slate-600 dark:text-slate-300">{secondLabel}<input type={tab === 'franchise_purchases' ? 'number' : 'text'} min={tab === 'franchise_purchases' ? 1 : undefined} value={line.detail} onChange={event => setLines(previous => previous.map((item, itemIndex) => itemIndex === index ? { ...item, detail: event.target.value } : item))} className={inputStyle} /></label>
          <button type="button" disabled={lines.length === 1} onClick={() => setLines(previous => previous.filter((_, itemIndex) => itemIndex !== index))} title="Remover linha" aria-label={`Remover linha ${index + 1}`} className="self-end rounded-lg p-2.5 text-slate-500 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-30 dark:hover:bg-rose-950/30"><X className="h-4 w-4" /></button>
        </div>)}</div>
        <button type="button" onClick={() => setLines(previous => [...previous, { label: '', detail: '' }])} className="mt-3 flex items-center gap-1 rounded-lg border border-emerald-300 px-3 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-50 dark:border-emerald-900 dark:text-emerald-300 dark:hover:bg-emerald-950/30"><Plus className="h-3.5 w-3.5" /> Adicionar {tab === 'franchise_purchases' ? 'item' : tab === 'franchise_checklists' ? 'pergunta' : 'etapa'}</button>
      </div>}
      {page.summary && (
      <p className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-emerald-800 dark:text-emerald-300 text-xs leading-relaxed">
        {page.summary}
      </p>
    )}
    </section>
  );
}
