import React, { useState, useMemo } from 'react';
import { 
  Percent, 
  Store, 
  Save, 
  RotateCcw, 
  CheckCircle2, 
  Calculator, 
  DollarSign, 
  Building2, 
  AlertCircle, 
  HelpCircle, 
  Settings, 
  Sparkles,
  Plus,
  Edit2,
  Trash2,
  X,
  Search,
  Check
} from 'lucide-react';
import { FiscalConfig, StoreConfig } from '../shared/types';
import { DEFAULT_FISCAL_CONFIG, DEFAULT_STORES } from '../shared/constants';
import { calculateItemFiscal } from '../shared/fiscalEngine';

interface FiscalSettingsPageProps {
  fiscalConfig: FiscalConfig;
  storeConfigs: StoreConfig[];
  onSave: (fiscal: FiscalConfig, stores: StoreConfig[]) => void;
}

export const FiscalSettingsPage: React.FC<FiscalSettingsPageProps> = ({
  fiscalConfig,
  storeConfigs,
  onSave
}) => {
  const [fiscal, setFiscal] = useState<FiscalConfig>({ ...fiscalConfig });
  const [stores, setStores] = useState<StoreConfig[]>(() => storeConfigs.map(s => ({ ...s })));
  
  // Busca rápida de lojas
  const [storeSearch, setStoreSearch] = useState<string>('');

  // Modal de inclusão / edição de filial
  const [modalStore, setModalStore] = useState<{
    id?: string;
    name: string;
    cluster: 'A' | 'B' | 'C';
    defaultWeight: number;
    active: boolean;
  } | null>(null);

  // Simulador interativo em tempo real
  const [simulCompra, setSimulCompra] = useState<number>(5.00);
  const [simulPdv, setSimulPdv] = useState<number>(12.00);

  const simResult = calculateItemFiscal(simulCompra, simulPdv, fiscal);

  const totalPercent = useMemo(() => {
    return stores.filter(s => s.active).reduce((sum, s) => sum + s.defaultWeight, 0);
  }, [stores]);

  const handleFiscalChange = (field: keyof FiscalConfig, val: number) => {
    setFiscal(prev => ({ ...prev, [field]: val }));
  };

  const handleStoreToggle = (storeId: string) => {
    setStores(prev => prev.map(s => s.id === storeId ? { ...s, active: !s.active } : s));
  };

  const handleStoreWeightChange = (storeId: string, weight: number) => {
    setStores(prev => prev.map(s => s.id === storeId ? { ...s, defaultWeight: Math.max(0, weight) } : s));
  };

  const handleResetStoresDefaults = () => {
    if (confirm('Deseja restaurar a matriz original de 20 lojas com os percentuais iniciais?')) {
      setStores(DEFAULT_STORES.map(s => ({ ...s })));
    }
  };

  // Salvar Filial (Nova ou Editada)
  const handleSaveModalStore = (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalStore || !modalStore.name.trim()) return;

    const trimmedName = modalStore.name.trim();

    if (modalStore.id) {
      // Edição
      setStores(prev => prev.map(s => s.id === modalStore.id ? {
        ...s,
        name: trimmedName,
        cluster: modalStore.cluster,
        defaultWeight: Math.max(0, Number(modalStore.defaultWeight) || 0)
      } : s));
    } else {
      // Nova Filial
      const slug = trimmedName
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '_')
        .replace(/_+/g, '_');
      
      const newId = `filial_${slug}_${Math.random().toString(36).substring(2, 6)}`;
      
      const newStore: StoreConfig = {
        id: newId,
        name: trimmedName,
        cluster: modalStore.cluster,
        defaultWeight: Math.max(0, Number(modalStore.defaultWeight) || (modalStore.cluster === 'A' ? 5 : modalStore.cluster === 'B' ? 3 : 2)),
        active: true
      };

      setStores(prev => [...prev, newStore]);
    }

    setModalStore(null);
  };

  // Excluir Filial
  const handleDeleteStore = (storeId: string, storeName: string) => {
    if (confirm(`Tem certeza que deseja remover a filial "${storeName}" da rede?`)) {
      setStores(prev => prev.filter(s => s.id !== storeId));
    }
  };

  const handleSave = () => {
    onSave(fiscal, stores);
  };

  // Filtragem de lojas por busca
  const filteredStores = useMemo(() => {
    if (!storeSearch.trim()) return stores;
    const term = storeSearch.toLowerCase();
    return stores.filter(s => s.name.toLowerCase().includes(term) || s.id.toLowerCase().includes(term));
  }, [stores, storeSearch]);

  const clusterAStores = filteredStores.filter(s => s.cluster === 'A');
  const clusterBStores = filteredStores.filter(s => s.cluster === 'B');
  const clusterCStores = filteredStores.filter(s => s.cluster === 'C');

  const clusterATotalPercent = clusterAStores.filter(s => s.active).reduce((sum, s) => sum + s.defaultWeight, 0);
  const clusterBTotalPercent = clusterBStores.filter(s => s.active).reduce((sum, s) => sum + s.defaultWeight, 0);
  const clusterCTotalPercent = clusterCStores.filter(s => s.active).reduce((sum, s) => sum + s.defaultWeight, 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* 1. Header da Página */}
      <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
            <Settings className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              Configurações Gerais & Parâmetros da Rede
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-mono">
                {stores.filter(s => s.active).length} de {stores.length} Filiais Ativas ({totalPercent.toFixed(1)}%)
              </span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Alíquotas tributárias, custos operacionais, simulador de formação de preços e cadastro de unidades da rede
            </p>
          </div>
        </div>

        <button
          onClick={handleSave}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-extrabold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/20 transition self-start sm:self-auto cursor-pointer"
        >
          <Save className="w-4 h-4" />
          <span>Salvar Parâmetros & Lojas</span>
        </button>
      </div>

      {/* 2. Grid de Conteúdo: Fiscal & Simulador (Esquerda) e Gerenciamento de Filiais (Direita) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* COLUNA ESQUERDA: PARÂMETROS FISCAIS & SIMULADOR (5 Colunas) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Card Parâmetros Fiscais */}
          <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <Percent className="w-5 h-5 text-emerald-500" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Parâmetros Tributários & Fixos
                </h3>
              </div>
              <button
                onClick={() => setFiscal({ ...DEFAULT_FISCAL_CONFIG })}
                className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center gap-1 cursor-pointer"
                title="Restaurar valores padrões da planilha MATRIZ"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Padrões</span>
              </button>
            </div>

            <div className="space-y-3.5">
              
              {/* Custos Fixos */}
              <div className="p-3 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-200/70 dark:border-slate-700/70">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Custos Fixos de Loja (sobre PDV)
                  </label>
                  <span className="text-xs font-extrabold font-mono text-emerald-600">
                    {(fiscal.custosFixos * 100).toFixed(1)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.10"
                  max="0.40"
                  step="0.005"
                  value={fiscal.custosFixos}
                  onChange={(e) => handleFiscalChange('custosFixos', parseFloat(e.target.value))}
                  className="w-full accent-emerald-600 cursor-pointer"
                />
                <span className="text-[10px] text-slate-400 block mt-0.5">Padrão da Rede Mega 12: 26.0%</span>
              </div>

              {/* ICMS Saída */}
              <div className="p-3 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-200/70 dark:border-slate-700/70">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    ICMS Saída / Venda (sobre PDV)
                  </label>
                  <span className="text-xs font-extrabold font-mono text-emerald-600">
                    {(fiscal.icmsAliquota * 100).toFixed(1)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.00"
                  max="0.25"
                  step="0.005"
                  value={fiscal.icmsAliquota}
                  onChange={(e) => handleFiscalChange('icmsAliquota', parseFloat(e.target.value))}
                  className="w-full accent-emerald-600 cursor-pointer"
                />
                <span className="text-[10px] text-slate-400 block mt-0.5">Padrão do Paraná: 11.0%</span>
              </div>

              {/* PIS/COFINS */}
              <div className="p-3 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-200/70 dark:border-slate-700/70">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    PIS / COFINS (sobre PDV)
                  </label>
                  <span className="text-xs font-extrabold font-mono text-emerald-600">
                    {(fiscal.pisCofinsAliquota * 100).toFixed(1)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.00"
                  max="0.10"
                  step="0.005"
                  value={fiscal.pisCofinsAliquota}
                  onChange={(e) => handleFiscalChange('pisCofinsAliquota', parseFloat(e.target.value))}
                  className="w-full accent-emerald-600 cursor-pointer"
                />
                <span className="text-[10px] text-slate-400 block mt-0.5">Padrão Lucro Presumido: 3.0%</span>
              </div>

              {/* Total Despesas PDV */}
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800 flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-950 dark:text-emerald-200">
                  Total Encargos sobre PDV (26% + 11% + 3%):
                </span>
                <span className="text-sm font-extrabold font-mono text-emerald-700 dark:text-emerald-300">
                  {((fiscal.custosFixos + fiscal.icmsAliquota + fiscal.pisCofinsAliquota) * 100).toFixed(1)}%
                </span>
              </div>

              {/* Crédito ICMS Entrada */}
              <div className="p-3 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-200/70 dark:border-slate-700/70">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Crédito de ICMS de Entrada (sobre Compra)
                  </label>
                  <span className="text-xs font-extrabold font-mono text-teal-600">
                    {(fiscal.creditoEntradaICMS * 100).toFixed(1)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.00"
                  max="0.25"
                  step="0.005"
                  value={fiscal.creditoEntradaICMS}
                  onChange={(e) => handleFiscalChange('creditoEntradaICMS', parseFloat(e.target.value))}
                  className="w-full accent-teal-600 cursor-pointer"
                />
                <span className="text-[10px] text-slate-400 block mt-0.5">Padrão Paraná: 19.5%</span>
              </div>

            </div>
          </div>

          {/* Simulador Interativo */}
          <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-700">
              <Calculator className="w-4 h-4 text-emerald-500" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Simulador de Formação de Preço
              </h3>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">
                  Preço Compra (R$)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={simulCompra === 0 ? '' : simulCompra}
                  placeholder="0.00"
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setSimulCompra(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 text-xs font-bold font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 outline-hidden"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">
                  PDV Alvo (R$)
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={simulPdv === 0 ? '' : simulPdv}
                  placeholder="0.00"
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setSimulPdv(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 text-xs font-bold font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 outline-hidden"
                />
              </div>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-500">
                <span>Despesas PDV:</span>
                <span className="font-mono">R$ {simResult.despesasPdvUnit.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-teal-600">
                <span>Crédito ICMS:</span>
                <span className="font-mono">+ R$ {simResult.creditoIcmsUnit.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-slate-800 dark:text-slate-200 pt-1 border-t border-slate-200 dark:border-slate-700">
                <span>Custo Real Efetivo:</span>
                <span className="font-mono">R$ {simResult.custoRealEfetivo.toFixed(2)}</span>
              </div>
              <div className={`flex justify-between font-extrabold pt-1.5 border-t border-slate-200 dark:border-slate-700 ${
                simResult.margemRealUnit >= 0 ? 'text-emerald-600' : 'text-rose-600'
              }`}>
                <span>Margem de Lucro Real:</span>
                <span className="font-mono text-sm">
                  R$ {simResult.margemRealUnit.toFixed(2)} ({simResult.margemPercentual.toFixed(1)}%)
                </span>
              </div>
            </div>

          </div>

        </div>

        {/* COLUNA DIREITA: MATRIZ DE LOJAS & GERENCIAMENTO DE FILIAIS (7 Colunas) */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 p-5 shadow-xs space-y-4">
          
          {/* Barra Superior de Gestão de Filiais */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-700">
            <div className="flex items-center gap-2">
              <Store className="w-5 h-5 text-emerald-500" />
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  Matriz de Unidades & Filiais
                  <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold">
                    {stores.length} Unidades
                  </span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Gerencie filiais, clusters e percentuais de rateio proporcional de compras
                </p>
              </div>
            </div>

            {/* Ações de Gestão de Filiais */}
            <div className="flex items-center gap-2">
              {/* Botão Nova Filial */}
              <button
                type="button"
                onClick={() => setModalStore({ name: '', cluster: 'A', defaultWeight: 5, active: true })}
                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Nova Filial</span>
              </button>
            </div>
          </div>

          {/* Campo de Busca Rápida de Filiais */}
          <div className="flex items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Pesquisar filial por nome..."
                value={storeSearch}
                onChange={e => setStoreSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-xs focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <button
              type="button"
              onClick={handleResetStoresDefaults}
              className="text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center gap-1 font-semibold transition cursor-pointer shrink-0"
              title="Restaurar lista original de 20 lojas"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Restaurar 20 Lojas</span>
            </button>
          </div>

          {/* Agrupamento por Clusters com Ações de Editar / Excluir */}
          <div className="space-y-4 max-h-[620px] overflow-y-auto pr-1">
            
            {/* Cluster A */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40 p-2.5 rounded-xl border border-blue-200 dark:border-blue-800">
                <span>CLUSTER A (Lojas de Grande Porte • Total {clusterATotalPercent.toFixed(1)}%)</span>
                <span>{clusterAStores.filter(s => s.active).length} de {clusterAStores.length} Ativas</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {clusterAStores.map(store => (
                  <div 
                    key={store.id} 
                    className={`p-2.5 rounded-xl border flex items-center justify-between transition ${
                      store.active 
                        ? 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-2xs' 
                        : 'bg-slate-100/50 dark:bg-slate-900/40 border-slate-200/50 opacity-60'
                    }`}
                  >
                    <label className="flex items-center gap-2 cursor-pointer select-none flex-1 min-w-0 pr-1">
                      <input
                        type="checkbox"
                        checked={store.active}
                        onChange={() => handleStoreToggle(store.id)}
                        className="rounded-sm text-emerald-600 focus:ring-0 cursor-pointer shrink-0"
                      />
                      <span className="font-semibold text-slate-800 dark:text-slate-200 truncate" title={store.name}>
                        {store.name}
                      </span>
                    </label>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        value={store.defaultWeight}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => handleStoreWeightChange(store.id, parseFloat(e.target.value) || 0)}
                        className="w-14 px-1.5 py-0.5 text-center text-xs font-bold font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 outline-hidden"
                      />
                      <span className="text-[10px] text-slate-400 font-bold">%</span>

                      <button
                        type="button"
                        onClick={() => setModalStore({ ...store })}
                        className="p-1 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/50 transition-colors"
                        title="Renomear / Editar Filial"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteStore(store.id, store.name)}
                        className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors"
                        title="Remover Filial da Rede"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Cluster B */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-900/60 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700">
                <span>CLUSTER B (Lojas de Médio Porte • Total {clusterBTotalPercent.toFixed(1)}%)</span>
                <span>{clusterBStores.filter(s => s.active).length} de {clusterBStores.length} Ativas</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {clusterBStores.map(store => (
                  <div 
                    key={store.id} 
                    className={`p-2.5 rounded-xl border flex items-center justify-between transition ${
                      store.active 
                        ? 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-2xs' 
                        : 'bg-slate-100/50 dark:bg-slate-900/40 border-slate-200/50 opacity-60'
                    }`}
                  >
                    <label className="flex items-center gap-2 cursor-pointer select-none flex-1 min-w-0 pr-1">
                      <input
                        type="checkbox"
                        checked={store.active}
                        onChange={() => handleStoreToggle(store.id)}
                        className="rounded-sm text-emerald-600 focus:ring-0 cursor-pointer shrink-0"
                      />
                      <span className="font-semibold text-slate-800 dark:text-slate-200 truncate" title={store.name}>
                        {store.name}
                      </span>
                    </label>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        value={store.defaultWeight}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => handleStoreWeightChange(store.id, parseFloat(e.target.value) || 0)}
                        className="w-14 px-1.5 py-0.5 text-center text-xs font-bold font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 outline-hidden"
                      />
                      <span className="text-[10px] text-slate-400 font-bold">%</span>

                      <button
                        type="button"
                        onClick={() => setModalStore({ ...store })}
                        className="p-1 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/50 transition-colors"
                        title="Renomear / Editar Filial"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteStore(store.id, store.name)}
                        className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors"
                        title="Remover Filial da Rede"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Cluster C */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/40 p-2.5 rounded-xl border border-teal-200 dark:border-teal-800">
                <span>CLUSTER C (Lojas Menores / CD • Total {clusterCTotalPercent.toFixed(1)}%)</span>
                <span>{clusterCStores.filter(s => s.active).length} de {clusterCStores.length} Ativas</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {clusterCStores.map(store => (
                  <div 
                    key={store.id} 
                    className={`p-2.5 rounded-xl border flex items-center justify-between transition ${
                      store.active 
                        ? 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-2xs' 
                        : 'bg-slate-100/50 dark:bg-slate-900/40 border-slate-200/50 opacity-60'
                    }`}
                  >
                    <label className="flex items-center gap-2 cursor-pointer select-none flex-1 min-w-0 pr-1">
                      <input
                        type="checkbox"
                        checked={store.active}
                        onChange={() => handleStoreToggle(store.id)}
                        className="rounded-sm text-emerald-600 focus:ring-0 cursor-pointer shrink-0"
                      />
                      <span className="font-semibold text-slate-800 dark:text-slate-200 truncate" title={store.name}>
                        {store.name}
                      </span>
                    </label>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        value={store.defaultWeight}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => handleStoreWeightChange(store.id, parseFloat(e.target.value) || 0)}
                        className="w-14 px-1.5 py-0.5 text-center text-xs font-bold font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 outline-hidden"
                      />
                      <span className="text-[10px] text-slate-400 font-bold">%</span>

                      <button
                        type="button"
                        onClick={() => setModalStore({ ...store })}
                        className="p-1 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/50 transition-colors"
                        title="Renomear / Editar Filial"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteStore(store.id, store.name)}
                        className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors"
                        title="Remover Filial da Rede"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>

      </div>

      {/* Modal de Nova Filial / Editar Filial */}
      {modalStore && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                  <Store className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {modalStore.id ? 'Editar Unidade / Filial' : 'Nova Unidade / Filial'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {modalStore.id ? 'Atualizar dados da loja existente' : 'Cadastrar nova loja na rede Mega 12'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setModalStore(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveModalStore} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nome da Filial / Cidade <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Ex: Ponta Grossa Nova Rússia 2, Curitiba Centro..."
                  value={modalStore.name}
                  onChange={e => setModalStore({ ...modalStore, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-medium focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Cluster de Porte da Loja
                </label>
                <select
                  value={modalStore.cluster}
                  onChange={e => setModalStore({ ...modalStore, cluster: e.target.value as any })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-medium focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="A">Cluster A — Lojas Grandes (Maior volume de vendas)</option>
                  <option value="B">Cluster B — Lojas Médias (Volume intermediário)</option>
                  <option value="C">Cluster C — Lojas Menores / CD (Menor volume)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Peso de Rateio Padrão (%)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max="100"
                  value={modalStore.defaultWeight}
                  onChange={e => setModalStore({ ...modalStore, defaultWeight: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-bold font-mono focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  required
                />
                <span className="text-[10px] text-slate-400 block mt-1">
                  Participação percentual padrão da loja nas compras automáticas
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalStore(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-500/20 flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  {modalStore.id ? 'Salvar Alterações' : 'Cadastrar Filial'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
