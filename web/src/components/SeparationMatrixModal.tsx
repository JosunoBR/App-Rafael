import React, { useState, useEffect } from 'react';
import { 
  X, 
  Store, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  RotateCcw,
  Check,
  Warehouse,
  Ban,
  Boxes,
  Plus,
  Minus,
  Bookmark,
  BookmarkPlus
} from 'lucide-react';
import { OrderItem, StoreConfig, SeparationPreset } from '../shared/types';
import { calculateAutomaticSeparation, validateSeparation, applySeparationPreset, extractPresetFromAllocations } from '../shared/separationEngine';

interface SeparationMatrixModalProps {
  item: OrderItem | null;
  stores: StoreConfig[];
  presets?: SeparationPreset[];
  isOpen: boolean;
  onClose: () => void;
  onSaveSeparation: (itemId: string, allocations: Record<string, number>, isManual: boolean, qtdReservaEstoque?: number) => void;
  onSavePreset?: (preset: SeparationPreset) => Promise<any> | void;
}

export const SeparationMatrixModal: React.FC<SeparationMatrixModalProps> = ({
  item,
  stores,
  presets = [],
  isOpen,
  onClose,
  onSaveSeparation,
  onSavePreset
}) => {
  const [allocations, setAllocations] = useState<Record<string, number>>(item?.separacaoLojas || {});
  const [isManual, setIsManual] = useState<boolean>(item?.separacaoManual || false);
  const [reserveStock, setReserveStock] = useState<number>(item?.qtdReservaEstoque || 0);

  // Estados de Modelos/Presets de Separação
  const [selectedPresetId, setSelectedPresetId] = useState<string>('');
  const [isSavingPresetModal, setIsSavingPresetModal] = useState<boolean>(false);
  const [newPresetName, setNewPresetName] = useState<string>('');

  // Inicializar quando item/stores mudam (hooks sempre chamados no topo)
  useEffect(() => {
    if (!item) return;
    
    if (!item.separacaoLojas || Object.keys(item.separacaoLojas).length === 0) {
      const sep = calculateAutomaticSeparation(item.qtdTotalUnidades, stores, item.qtdReservaEstoque || 0);
      setAllocations(sep.allocations);
      setReserveStock(sep.reserveStock);
      setIsManual(false);
    } else {
      setAllocations(item.separacaoLojas);
      const allocatedSum = Object.values(item.separacaoLojas).reduce((a, b) => a + (Number(b) || 0), 0);
      setReserveStock(item.qtdReservaEstoque ?? Math.max(0, item.qtdTotalUnidades - allocatedSum));
      setIsManual(item.separacaoManual || false);
    }
  }, [item, stores]);

  if (!isOpen || !item) return null;

  const validation = validateSeparation(allocations, item.qtdTotalUnidades, stores);

  const handleStoreUnitsChange = (storeId: string, rawUnits: number) => {
    setIsManual(true);
    const units = Math.max(0, Math.floor(rawUnits || 0));

    const newAllocations = {
      ...allocations,
      [storeId]: units
    };
    setAllocations(newAllocations);
    const newSum = Object.values(newAllocations).reduce((a, b) => a + (Number(b) || 0), 0);
    setReserveStock(Math.max(0, item.qtdTotalUnidades - newSum));
  };

  const handleStepStoreUnits = (storeId: string, delta: number) => {
    const currentUnits = allocations[storeId] || 0;
    const newUnits = Math.max(0, currentUnits + delta);
    handleStoreUnitsChange(storeId, newUnits);
  };

  const handleZeroStore = (storeId: string) => {
    handleStoreUnitsChange(storeId, 0);
  };

  const handleReservePercent = (percent: number) => {
    const reserveUnits = Math.round((item.qtdTotalUnidades * percent) / 100);
    const sep = calculateAutomaticSeparation(item.qtdTotalUnidades, stores, reserveUnits);
    setReserveStock(sep.reserveStock);
    setAllocations(sep.allocations);
    setIsManual(false);
  };

  const handleResetToAutomatic = () => {
    const sep = calculateAutomaticSeparation(item.qtdTotalUnidades, stores, reserveStock);
    setAllocations(sep.allocations);
    setIsManual(false);
  };

  const handleZeroAllStores = () => {
    const emptyAllocations: Record<string, number> = {};
    stores.forEach(s => { emptyAllocations[s.id] = 0; });
    setAllocations(emptyAllocations);
    setReserveStock(item.qtdTotalUnidades);
    setIsManual(true);
  };

  const handleSelectPreset = (presetId: string) => {
    setSelectedPresetId(presetId);
    if (!presetId) return;
    const targetPreset = presets.find(p => p.id === presetId);
    if (targetPreset) {
      const res = applySeparationPreset(item.qtdTotalUnidades, targetPreset, stores);
      setAllocations(res.allocations);
      setReserveStock(res.reserveStock);
      setIsManual(true);
    }
  };

  const handleSaveCurrentAsPreset = async () => {
    if (!newPresetName.trim() || !onSavePreset) return;
    const { storeWeights, reserveStockPercent } = extractPresetFromAllocations(
      allocations,
      item.qtdTotalUnidades,
      reserveStock,
      stores
    );
    const newPreset: SeparationPreset = {
      id: 'preset_' + Date.now(),
      name: newPresetName.trim(),
      description: `Criado a partir de ${item.descricao}`,
      storeWeights,
      reserveStockPercent,
      isDefault: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await onSavePreset(newPreset);
    setIsSavingPresetModal(false);
    setNewPresetName('');
    setSelectedPresetId(newPreset.id);
  };

  const handleSave = () => {
    const totalAlloc = Object.values(allocations).reduce((a, b) => a + (Number(b) || 0), 0);
    const calculatedReserve = Math.max(0, item.qtdTotalUnidades - totalAlloc);
    onSaveSeparation(item.id, allocations, isManual, calculatedReserve);
    onClose();
  };

  const clusterAStores = stores.filter(s => s.active && s.cluster === 'A');
  const clusterBStores = stores.filter(s => s.active && s.cluster === 'B');
  const clusterCStores = stores.filter(s => s.active && s.cluster === 'C');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-4xl max-h-[92vh] overflow-y-auto flex flex-col">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between sticky top-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Matriz de Distribuição & Separação
                </h3>
                {isManual ? (
                  <span className="text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                    Ajuste Manual
                  </span>
                ) : (
                  <span className="text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1">
                    <Sparkles className="w-2.5 h-2.5" />
                    Automático (Pesos)
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                <span className="font-semibold text-slate-700 dark:text-slate-300">{item.codigo}</span> • {item.descricao} ({item.qtdTotalUnidades.toLocaleString('pt-BR')} unidades compradas)
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Reserve Shortcuts Toolbar */}
        <div className="px-6 py-2.5 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <Warehouse className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span className="font-bold text-slate-700 dark:text-slate-300">
              Reserva Estoque CD Matriz:
            </span>
            <div className="flex items-center gap-1.5">
              {[0, 5, 10, 15, 20, 30].map(pct => {
                const isActive = item.qtdTotalUnidades > 0 && Math.round((reserveStock / item.qtdTotalUnidades) * 100) === pct;
                return (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => handleReservePercent(pct)}
                    className={`px-2 py-1 rounded-lg font-bold text-xs transition ${
                      isActive
                        ? 'bg-amber-500 text-slate-950 shadow-xs'
                        : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    {pct}%
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-500 dark:text-slate-400 text-xs">
              Qtd guardada no CD:
            </span>
            <div className="flex items-center gap-1">
              <input
                type="number"
                min="0"
                max={item.qtdTotalUnidades}
                value={reserveStock}
                onChange={(e) => setReserveStock(Math.max(0, parseInt(e.target.value, 10) || 0))}
                className="w-20 px-2 py-1 text-xs font-mono font-extrabold text-center rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 outline-hidden"
              />
              <span className="text-xs font-bold text-amber-800 dark:text-amber-300">
                un
              </span>
            </div>
          </div>
        </div>

        {/* Bloco de Modelos de Separação (Saves) */}
        <div className="px-6 py-2.5 bg-indigo-50/70 dark:bg-indigo-950/40 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Bookmark className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
              Modelo de Separação (Save):
            </span>
            <select
              value={selectedPresetId}
              onChange={(e) => handleSelectPreset(e.target.value)}
              className="text-xs font-semibold px-2.5 py-1 rounded-lg border border-indigo-200 dark:border-indigo-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 outline-hidden focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">-- Escolher Modelo Salvo --</option>
              {presets.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} {p.isDefault ? '(Padrão Rede)' : ''}
                </option>
              ))}
            </select>
          </div>

          {onSavePreset && (
            <button
              type="button"
              onClick={() => {
                setNewPresetName(`Modelo ${item.descricao.split(' ')[0]}`);
                setIsSavingPresetModal(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-100 hover:bg-indigo-200 dark:bg-indigo-900/60 dark:hover:bg-indigo-900 transition cursor-pointer"
              title="Salvar esta distribuição atual como um novo padrão reutilizável"
            >
              <BookmarkPlus className="w-3.5 h-3.5" />
              <span>Salvar Distribuição como Novo Modelo...</span>
            </button>
          )}
        </div>

        {/* Live Validation Bar */}
        <div className={`px-6 py-3 border-b flex flex-wrap items-center justify-between gap-3 ${
          validation.isOverAllocated
            ? 'bg-rose-50/80 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800/60'
            : 'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/60'
        }`}>
          <div className="flex items-center gap-2">
            {validation.isOverAllocated ? (
              <>
                <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
                <span className="text-xs font-bold text-rose-800 dark:text-rose-300">
                  Atenção: Total distribuído ({validation.totalAllocated.toLocaleString('pt-BR')} un) ultrapassou o total comprado ({item.qtdTotalUnidades.toLocaleString('pt-BR')} un)!
                </span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                  Distribuição: {validation.totalAllocated.toLocaleString('pt-BR')} un nas lojas • {validation.reserveStock.toLocaleString('pt-BR')} un no CD (Total: {item.qtdTotalUnidades.toLocaleString('pt-BR')} un).
                </span>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleZeroAllStores}
              className="px-2.5 py-1 text-xs font-medium rounded-lg text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 border border-rose-200 dark:border-rose-800 transition flex items-center gap-1"
              title="Zerar envio para todas as lojas e guardar 100% no estoque"
            >
              <Ban className="w-3 h-3" />
              Zerar Lojas
            </button>
            <button
              onClick={handleResetToAutomatic}
              className="px-2.5 py-1 text-xs font-medium rounded-lg text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-600 transition flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              Recalcular por Pesos
            </button>
          </div>
        </div>

        {/* Content: 3 Clusters Grid */}
        <div className="p-6 space-y-6">
          
          {/* Cluster A */}
          <div className="bg-slate-50 dark:bg-slate-800/40 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-700/80">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-emerald-600 text-white font-bold text-xs flex items-center justify-center">
                  A
                </span>
                <span className="text-sm font-bold text-slate-900 dark:text-white">
                  Cluster A (8 Lojas Principais • 51.3% da Rede)
                </span>
              </div>
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950 px-2.5 py-0.5 rounded-full">
                Total Cluster A: {validation.clusterTotals.A.toLocaleString('pt-BR')} un
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {clusterAStores.map(store => {
                const units = allocations[store.id] || 0;
                return (
                  <div key={store.id} className="bg-white dark:bg-slate-900 rounded-xl p-2.5 border border-slate-200 dark:border-slate-700 shadow-2xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-slate-900 dark:text-white truncate" title={store.name}>
                        {store.name}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleZeroStore(store.id)}
                        className="text-[10px] text-slate-400 hover:text-rose-500 transition"
                        title="Zerar envio para esta loja"
                      >
                        zerar
                      </button>
                    </div>

                    <div className="flex items-center gap-1 mt-1.5">
                      <button
                        type="button"
                        onClick={() => handleStepStoreUnits(store.id, -1)}
                        className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 flex items-center justify-center text-xs font-bold transition"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <input
                        type="number"
                        min="0"
                        value={units}
                        onChange={(e) => handleStoreUnitsChange(store.id, parseInt(e.target.value, 10) || 0)}
                        className="w-full text-center px-1 py-1 text-xs font-mono font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-hidden focus:ring-1 focus:ring-emerald-500"
                      />
                      <button
                        type="button"
                        onClick={() => handleStepStoreUnits(store.id, 1)}
                        className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 flex items-center justify-center text-xs font-bold transition"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Cluster B */}
          <div className="bg-slate-50 dark:bg-slate-800/40 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-700/80">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
                  B
                </span>
                <span className="text-sm font-bold text-slate-900 dark:text-white">
                  Cluster B (7 Lojas Intermediárias • 33.3% da Rede)
                </span>
              </div>
              <span className="text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-950 px-2.5 py-0.5 rounded-full">
                Total Cluster B: {validation.clusterTotals.B.toLocaleString('pt-BR')} un
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {clusterBStores.map(store => {
                const units = allocations[store.id] || 0;
                return (
                  <div key={store.id} className="bg-white dark:bg-slate-900 rounded-xl p-2.5 border border-slate-200 dark:border-slate-700 shadow-2xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-slate-900 dark:text-white truncate" title={store.name}>
                        {store.name}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleZeroStore(store.id)}
                        className="text-[10px] text-slate-400 hover:text-rose-500 transition"
                        title="Zerar envio para esta loja"
                      >
                        zerar
                      </button>
                    </div>

                    <div className="flex items-center gap-1 mt-1.5">
                      <button
                        type="button"
                        onClick={() => handleStepStoreUnits(store.id, -1)}
                        className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 flex items-center justify-center text-xs font-bold transition"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <input
                        type="number"
                        min="0"
                        value={units}
                        onChange={(e) => handleStoreUnitsChange(store.id, parseInt(e.target.value, 10) || 0)}
                        className="w-full text-center px-1 py-1 text-xs font-mono font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-hidden focus:ring-1 focus:ring-blue-500"
                      />
                      <button
                        type="button"
                        onClick={() => handleStepStoreUnits(store.id, 1)}
                        className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 flex items-center justify-center text-xs font-bold transition"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Cluster C */}
          <div className="bg-slate-50 dark:bg-slate-800/40 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-700/80">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-purple-600 text-white font-bold text-xs flex items-center justify-center">
                  C
                </span>
                <span className="text-sm font-bold text-slate-900 dark:text-white">
                  Cluster C (5 Lojas Menores • 15.4% da Rede)
                </span>
              </div>
              <span className="text-xs font-bold text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-950 px-2.5 py-0.5 rounded-full">
                Total Cluster C: {validation.clusterTotals.C.toLocaleString('pt-BR')} un
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {clusterCStores.map(store => {
                const units = allocations[store.id] || 0;
                return (
                  <div key={store.id} className="bg-white dark:bg-slate-900 rounded-xl p-2.5 border border-slate-200 dark:border-slate-700 shadow-2xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-slate-900 dark:text-white truncate" title={store.name}>
                        {store.name}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleZeroStore(store.id)}
                        className="text-[10px] text-slate-400 hover:text-rose-500 transition"
                        title="Zerar envio para esta loja"
                      >
                        zerar
                      </button>
                    </div>

                    <div className="flex items-center gap-1 mt-1.5">
                      <button
                        type="button"
                        onClick={() => handleStepStoreUnits(store.id, -1)}
                        className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 flex items-center justify-center text-xs font-bold transition"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <input
                        type="number"
                        min="0"
                        value={units}
                        onChange={(e) => handleStoreUnitsChange(store.id, parseInt(e.target.value, 10) || 0)}
                        className="w-full text-center px-1 py-1 text-xs font-mono font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-hidden focus:ring-1 focus:ring-purple-500"
                      />
                      <button
                        type="button"
                        onClick={() => handleStepStoreUnits(store.id, 1)}
                        className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 flex items-center justify-center text-xs font-bold transition"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between sticky bottom-0 z-10">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            Cancelar
          </button>

          <button
            onClick={handleSave}
            disabled={validation.isOverAllocated}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/20 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            <Check className="w-4 h-4" />
            Salvar Rateio do Item
          </button>
        </div>

      </div>

      {/* Modal Popup: Salvar Distribuição como Novo Modelo */}
      {isSavingPresetModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 w-full max-w-sm shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookmarkPlus className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  Novo Modelo de Separação
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setIsSavingPresetModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              Os percentuais de rateio das lojas e a reserva de CD deste produto ({reserveStock} un / {Math.round((reserveStock / item.qtdTotalUnidades) * 100)}%) serão salvos no SQLite para você reutilizar em outros pedidos.
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Nome do Modelo (ex: Alimentos, Bazar, Bebidas)
              </label>
              <input
                type="text"
                autoFocus
                value={newPresetName}
                onChange={(e) => setNewPresetName(e.target.value)}
                placeholder="Ex: Alimentos"
                className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsSavingPresetModal(false)}
                className="px-3 py-1.5 text-xs font-medium rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveCurrentAsPreset}
                disabled={!newPresetName.trim()}
                className="px-4 py-1.5 text-xs font-bold rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition"
              >
                Salvar Modelo no Banco
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
