import React, { useState } from 'react';
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
  Sparkles
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
  
  // Simulador interativo em tempo real
  const [simulCompra, setSimulCompra] = useState<number>(5.00);
  const [simulPdv, setSimulPdv] = useState<number>(12.00);

  const simResult = calculateItemFiscal(simulCompra, simulPdv, fiscal);

  const totalPercent = stores.filter(s => s.active).reduce((sum, s) => sum + s.defaultWeight, 0);

  const handleFiscalChange = (field: keyof FiscalConfig, val: number) => {
    setFiscal(prev => ({ ...prev, [field]: val }));
  };

  const handleStoreToggle = (storeId: string) => {
    setStores(prev => prev.map(s => s.id === storeId ? { ...s, active: !s.active } : s));
  };

  const handleStoreWeightChange = (storeId: string, weight: number) => {
    setStores(prev => prev.map(s => s.id === storeId ? { ...s, defaultWeight: Math.max(0.1, weight) } : s));
  };

  const handleResetStoresDefaults = () => {
    setStores(DEFAULT_STORES.map(s => ({ ...s })));
  };

  const handleSave = () => {
    onSave(fiscal, stores);
  };

  const clusterAStores = stores.filter(s => s.cluster === 'A');
  const clusterBStores = stores.filter(s => s.cluster === 'B');
  const clusterCStores = stores.filter(s => s.cluster === 'C');

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
              Configurações Fiscais & Parâmetros da Rede
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-mono">
                {totalPercent.toFixed(1)}% Ativo
              </span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Alíquotas tributárias, crédito ICMS de entrada, custos operacionais e matriz de rateio percentual das 20 lojas
            </p>
          </div>
        </div>

        <button
          onClick={handleSave}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-extrabold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/20 transition self-start sm:self-auto"
        >
          <Save className="w-4 h-4" />
          <span>Salvar Parâmetros</span>
        </button>
      </div>

      {/* 2. Grid de Conteúdo: Fiscal & Simulador (Esquerda) e Matriz de 20 Lojas (Direita) */}
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
                className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center gap-1"
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
                  step="0.1"
                  value={simulPdv === 0 ? '' : simulPdv}
                  placeholder="0.00"
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setSimulPdv(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 text-xs font-bold font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 outline-hidden"
                />
              </div>
            </div>

            {/* Resultado da Simulação */}
            <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600 dark:text-slate-300">
                <span>+ Encargos PDV (40%):</span>
                <span className="font-mono font-bold">+R$ {simResult.despesasPdvUnit.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-teal-600 dark:text-teal-400">
                <span>- Crédito ICMS Entrada (19.5%):</span>
                <span className="font-mono font-bold">-R$ {simResult.creditoIcmsUnit.toFixed(2)}</span>
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

        {/* COLUNA DIREITA: MATRIZ DE LOJAS & PORCENTAGENS DE RATEIO (7 Colunas) */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 p-5 shadow-xs space-y-5">
          
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
            <div className="flex items-center gap-2">
              <Store className="w-5 h-5 text-emerald-500" />
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Matriz de 20 Lojas & Porcentagens de Rateio
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Total de 100% distribuídos por porte de loja (Cluster A, B e C)
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleResetStoresDefaults}
                className="text-[11px] text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 flex items-center gap-1 font-semibold transition"
                title="Restaurar pesos padrões (100%)"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Restaurar 100%</span>
              </button>

              <span className={`text-xs font-mono font-extrabold px-3 py-1 rounded-full ${
                Math.abs(totalPercent - 100) < 0.5 
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' 
                  : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
              }`}>
                {totalPercent.toFixed(1)}% / 100.0%
              </span>
            </div>
          </div>

          {/* Agrupamento por Clusters */}
          <div className="space-y-5">
            
            {/* Cluster A */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40 p-2.5 rounded-xl border border-blue-200 dark:border-blue-800">
                <span>CLUSTER A (Lojas Grandes • 6.41% cada • Total {clusterATotalPercent.toFixed(1)}%)</span>
                <span>{clusterAStores.filter(s => s.active).length} de {clusterAStores.length} Ativas</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {clusterAStores.map(store => (
                  <div 
                    key={store.id} 
                    className={`p-2.5 rounded-xl border flex items-center justify-between transition ${
                      store.active 
                        ? 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700' 
                        : 'bg-slate-100/50 dark:bg-slate-900/40 border-slate-200/50 opacity-60'
                    }`}
                  >
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={store.active}
                        onChange={() => handleStoreToggle(store.id)}
                        className="rounded-sm text-emerald-600 focus:ring-0 cursor-pointer"
                      />
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{store.name}</span>
                    </label>

                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        step="0.01"
                        min="0.1"
                        max="100"
                        value={store.defaultWeight}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => handleStoreWeightChange(store.id, parseFloat(e.target.value) || 0.1)}
                        className="w-16 px-1.5 py-0.5 text-center text-xs font-bold font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 outline-hidden"
                      />
                      <span className="text-[10px] text-slate-400 font-bold">%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Cluster B */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-900/60 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700">
                <span>CLUSTER B (Lojas Médias • 4.49% cada • Total {clusterBTotalPercent.toFixed(1)}%)</span>
                <span>{clusterBStores.filter(s => s.active).length} de {clusterBStores.length} Ativas</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {clusterBStores.map(store => (
                  <div 
                    key={store.id} 
                    className={`p-2.5 rounded-xl border flex items-center justify-between transition ${
                      store.active 
                        ? 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700' 
                        : 'bg-slate-100/50 dark:bg-slate-900/40 border-slate-200/50 opacity-60'
                    }`}
                  >
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={store.active}
                        onChange={() => handleStoreToggle(store.id)}
                        className="rounded-sm text-emerald-600 focus:ring-0 cursor-pointer"
                      />
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{store.name}</span>
                    </label>

                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        step="0.01"
                        min="0.1"
                        max="100"
                        value={store.defaultWeight}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => handleStoreWeightChange(store.id, parseFloat(e.target.value) || 0.1)}
                        className="w-16 px-1.5 py-0.5 text-center text-xs font-bold font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 outline-hidden"
                      />
                      <span className="text-[10px] text-slate-400 font-bold">%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Cluster C */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/40 p-2.5 rounded-xl border border-teal-200 dark:border-teal-800">
                <span>CLUSTER C (Lojas Menores / CD • 3.20% cada • Total {clusterCTotalPercent.toFixed(1)}%)</span>
                <span>{clusterCStores.filter(s => s.active).length} de {clusterCStores.length} Ativas</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {clusterCStores.map(store => (
                  <div 
                    key={store.id} 
                    className={`p-2.5 rounded-xl border flex items-center justify-between transition ${
                      store.active 
                        ? 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700' 
                        : 'bg-slate-100/50 dark:bg-slate-900/40 border-slate-200/50 opacity-60'
                    }`}
                  >
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={store.active}
                        onChange={() => handleStoreToggle(store.id)}
                        className="rounded-sm text-emerald-600 focus:ring-0 cursor-pointer"
                      />
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{store.name}</span>
                    </label>

                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        step="0.01"
                        min="0.1"
                        max="100"
                        value={store.defaultWeight}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => handleStoreWeightChange(store.id, parseFloat(e.target.value) || 0.1)}
                        className="w-16 px-1.5 py-0.5 text-center text-xs font-bold font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 outline-hidden"
                      />
                      <span className="text-[10px] text-slate-400 font-bold">%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
};
