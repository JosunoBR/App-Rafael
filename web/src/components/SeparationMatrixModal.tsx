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
  Minus
} from 'lucide-react';
import { OrderItem, StoreConfig } from '../shared/types';
import { calculateBoxesSeparation, validateSeparation } from '../shared/separationEngine';

interface SeparationMatrixModalProps {
  item: OrderItem | null;
  stores: StoreConfig[];
  isOpen: boolean;
  onClose: () => void;
  onSaveSeparation: (itemId: string, allocations: Record<string, number>, isManual: boolean, qtdReservaEstoque?: number) => void;
}

export const SeparationMatrixModal: React.FC<SeparationMatrixModalProps> = ({
  item,
  stores,
  isOpen,
  onClose,
  onSaveSeparation
}) => {
  if (!isOpen || !item) return null;

  const pack = Math.max(1, item.qtdPorPacote || 1);
  const [allocations, setAllocations] = useState<Record<string, number>>(item.separacaoLojas || {});
  const [isManual, setIsManual] = useState<boolean>(item.separacaoManual || false);
  const [reserveStock, setReserveStock] = useState<number>(item.qtdReservaEstoque || 0);

  // Inicializar caso vazio
  useEffect(() => {
    if (!item.separacaoLojas || Object.keys(item.separacaoLojas).length === 0) {
      const boxSep = calculateBoxesSeparation(item.qtdPacotes, pack, stores, Math.floor((item.qtdReservaEstoque || 0) / pack));
      setAllocations(boxSep.allocations);
      setReserveStock(boxSep.reserveStock);
      setIsManual(false);
    } else {
      setAllocations(item.separacaoLojas);
      const allocatedSum = Object.values(item.separacaoLojas).reduce((a, b) => a + (Number(b) || 0), 0);
      setReserveStock(item.qtdReservaEstoque ?? Math.max(0, item.qtdTotalUnidades - allocatedSum));
      setIsManual(item.separacaoManual || false);
    }
  }, [item, stores]);

  const validation = validateSeparation(allocations, item.qtdTotalUnidades, stores);
  const totalAllocatedBoxes = Math.round(validation.totalAllocated / pack);
  const reserveStockBoxes = Math.round(validation.reserveStock / pack);
  const totalBoxes = item.qtdPacotes || Math.ceil(item.qtdTotalUnidades / pack);

  const handleStoreBoxesChange = (storeId: string, rawBoxes: number) => {
    setIsManual(true);
    const boxes = Math.max(0, Math.floor(rawBoxes || 0));
    const unitVal = boxes * pack;

    const newAllocations = {
      ...allocations,
      [storeId]: unitVal
    };
    setAllocations(newAllocations);
    const newSum = Object.values(newAllocations).reduce((a, b) => a + (Number(b) || 0), 0);
    setReserveStock(Math.max(0, item.qtdTotalUnidades - newSum));
  };

  const handleStepStoreBoxes = (storeId: string, delta: number) => {
    const currentUnits = allocations[storeId] || 0;
    const currentBoxes = currentUnits / pack;
    const newBoxes = Math.max(0, currentBoxes + delta);
    handleStoreBoxesChange(storeId, newBoxes);
  };

  const handleZeroStore = (storeId: string) => {
    handleStoreBoxesChange(storeId, 0);
  };

  const handleReserveStockBoxesChange = (rawReserveBoxes: number) => {
    const safeReserveBoxes = Math.max(0, Math.min(totalBoxes, Math.floor(rawReserveBoxes || 0)));
    const boxSep = calculateBoxesSeparation(totalBoxes, pack, stores, safeReserveBoxes);
    setReserveStock(boxSep.reserveStock);
    setAllocations(boxSep.allocations);
    setIsManual(false);
  };

  const handleReservePercent = (percent: number) => {
    const reserveBoxes = Math.round((totalBoxes * percent) / 100);
    const boxSep = calculateBoxesSeparation(totalBoxes, pack, stores, reserveBoxes);
    setReserveStock(boxSep.reserveStock);
    setAllocations(boxSep.allocations);
    setIsManual(false);
  };

  const handleResetToAutomatic = () => {
    const reserveBoxes = Math.floor(reserveStock / pack);
    const boxSep = calculateBoxesSeparation(totalBoxes, pack, stores, reserveBoxes);
    setAllocations(boxSep.allocations);
    setIsManual(false);
  };

  const handleZeroAllStores = () => {
    const emptyAllocations: Record<string, number> = {};
    stores.forEach(s => { emptyAllocations[s.id] = 0; });
    setAllocations(emptyAllocations);
    setReserveStock(item.qtdTotalUnidades);
    setIsManual(true);
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
            <div className="p-2.5 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Grade de Separação em Caixas (20 Lojas)
                </h3>
                {isManual ? (
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                    Edição Manual
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    Rateio Automático por Caixas Fechadas
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-lg">
                <strong className="text-indigo-600 dark:text-indigo-400 font-mono">[{item.codigoInterno || item.codigo || 'S/ CÓD'}]</strong> {item.descricao} • Total: <strong className="text-slate-900 dark:text-white">{item.qtdPacotes} cx ({item.qtdTotalUnidades.toLocaleString('pt-BR')} un)</strong> • Emb: {item.qtdPorPacote} un/cx
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Bloco de Controle de Estoque Guardado (CD / Reserva Matriz) */}
        <div className="px-6 py-3.5 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300">
              <Warehouse className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                Guardar no Estoque Central (CD / Matriz)
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                Padrão 10% retido no CD em caixas fechadas
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              {[0, 10, 20, 30].map(pct => (
                <button
                  key={pct}
                  onClick={() => handleReservePercent(pct)}
                  className={`px-2 py-1 text-[11px] font-bold rounded-lg transition ${
                    pct === 10
                      ? 'bg-amber-500 text-white font-extrabold shadow-xs'
                      : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-amber-400 text-slate-700 dark:text-slate-300'
                  }`}
                  title={`Guardar ${pct}% no Estoque Central`}
                >
                  {pct}%
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200 dark:border-slate-700">
              <input
                type="number"
                min="0"
                max={totalBoxes}
                value={reserveStockBoxes}
                onChange={(e) => handleReserveStockBoxesChange(parseFloat(e.target.value) || 0)}
                className="w-16 px-2 py-1 text-xs font-mono font-extrabold text-center rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 outline-hidden"
              />
              <span className="text-xs font-bold text-amber-800 dark:text-amber-300">
                cx
              </span>
            </div>
          </div>
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
                  Atenção: Total alocado ({totalAllocatedBoxes} cx) ultrapassou o total comprado ({totalBoxes} cx)!
                </span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                  Distribuição: {totalAllocatedBoxes} cx nas lojas • {reserveStockBoxes} cx no CD (Total: {totalBoxes} cx / {validation.targetTotal.toLocaleString('pt-BR')} peças).
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
                Total Cluster A: {Math.round(validation.clusterTotals.A / pack)} cx ({validation.clusterTotals.A} un)
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {clusterAStores.map(store => {
                const units = allocations[store.id] ?? 0;
                const boxes = units / pack;

                return (
                  <div key={store.id} className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 truncate" title={store.name}>
                        {store.name}
                      </span>
                      {boxes > 0 && (
                        <button
                          type="button"
                          onClick={() => handleZeroStore(store.id)}
                          className="text-[9px] text-rose-500 hover:text-rose-700 px-1 py-0.2 rounded hover:bg-rose-50 dark:hover:bg-rose-950/60"
                          title="Zerar envio para esta loja"
                        >
                          Zerar
                        </button>
                      )}
                    </div>
                    
                    <div className="mt-1.5 flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleStepStoreBoxes(store.id, -1)}
                        className="p-1 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
                        title="Diminuir 1 caixa"
                      >
                        <Minus className="w-3 h-3" />
                      </button>

                      <input
                        type="number"
                        min="0"
                        value={boxes}
                        onChange={(e) => handleStoreBoxesChange(store.id, parseFloat(e.target.value) || 0)}
                        className={`w-full text-center py-1 text-xs font-bold rounded-lg border outline-hidden transition ${
                          boxes > 0
                            ? 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500'
                            : 'border-dashed border-slate-300 dark:border-slate-700 bg-transparent text-slate-400'
                        }`}
                      />

                      <button
                        type="button"
                        onClick={() => handleStepStoreBoxes(store.id, 1)}
                        className="p-1 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
                        title="Aumentar 1 caixa"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="text-[9px] text-center text-slate-400 font-mono mt-0.5">
                      = {units} un
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
                  Cluster B (8 Lojas Intermediárias • 35.9% da Rede)
                </span>
              </div>
              <span className="text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-950 px-2.5 py-0.5 rounded-full">
                Total Cluster B: {Math.round(validation.clusterTotals.B / pack)} cx ({validation.clusterTotals.B} un)
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {clusterBStores.map(store => {
                const units = allocations[store.id] ?? 0;
                const boxes = units / pack;

                return (
                  <div key={store.id} className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 truncate" title={store.name}>
                        {store.name}
                      </span>
                      {boxes > 0 && (
                        <button
                          type="button"
                          onClick={() => handleZeroStore(store.id)}
                          className="text-[9px] text-rose-500 hover:text-rose-700 px-1 py-0.2 rounded hover:bg-rose-50 dark:hover:bg-rose-950/60"
                          title="Zerar envio para esta loja"
                        >
                          Zerar
                        </button>
                      )}
                    </div>
                    
                    <div className="mt-1.5 flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleStepStoreBoxes(store.id, -1)}
                        className="p-1 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
                        title="Diminuir 1 caixa"
                      >
                        <Minus className="w-3 h-3" />
                      </button>

                      <input
                        type="number"
                        min="0"
                        value={boxes}
                        onChange={(e) => handleStoreBoxesChange(store.id, parseFloat(e.target.value) || 0)}
                        className={`w-full text-center py-1 text-xs font-bold rounded-lg border outline-hidden transition ${
                          boxes > 0
                            ? 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500'
                            : 'border-dashed border-slate-300 dark:border-slate-700 bg-transparent text-slate-400'
                        }`}
                      />

                      <button
                        type="button"
                        onClick={() => handleStepStoreBoxes(store.id, 1)}
                        className="p-1 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
                        title="Aumentar 1 caixa"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="text-[9px] text-center text-slate-400 font-mono mt-0.5">
                      = {units} un
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
                <span className="w-6 h-6 rounded-lg bg-teal-600 text-white font-bold text-xs flex items-center justify-center">
                  C
                </span>
                <span className="text-sm font-bold text-slate-900 dark:text-white">
                  Cluster C (4 Lojas / Depósito • 12.8% da Rede)
                </span>
              </div>
              <span className="text-xs font-bold text-teal-600 dark:text-teal-400 bg-teal-100 dark:bg-teal-950 px-2.5 py-0.5 rounded-full">
                Total Cluster C: {Math.round(validation.clusterTotals.C / pack)} cx ({validation.clusterTotals.C} un)
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {clusterCStores.map(store => {
                const units = allocations[store.id] ?? 0;
                const boxes = units / pack;

                return (
                  <div key={store.id} className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 truncate" title={store.name}>
                        {store.name}
                      </span>
                      {boxes > 0 && (
                        <button
                          type="button"
                          onClick={() => handleZeroStore(store.id)}
                          className="text-[9px] text-rose-500 hover:text-rose-700 px-1 py-0.2 rounded hover:bg-rose-50 dark:hover:bg-rose-950/60"
                          title="Zerar envio para esta loja"
                        >
                          Zerar
                        </button>
                      )}
                    </div>
                    
                    <div className="mt-1.5 flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleStepStoreBoxes(store.id, -1)}
                        className="p-1 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
                        title="Diminuir 1 caixa"
                      >
                        <Minus className="w-3 h-3" />
                      </button>

                      <input
                        type="number"
                        min="0"
                        value={boxes}
                        onChange={(e) => handleStoreBoxesChange(store.id, parseFloat(e.target.value) || 0)}
                        className={`w-full text-center py-1 text-xs font-bold rounded-lg border outline-hidden transition ${
                          boxes > 0
                            ? 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500'
                            : 'border-dashed border-slate-300 dark:border-slate-700 bg-transparent text-slate-400'
                        }`}
                      />

                      <button
                        type="button"
                        onClick={() => handleStepStoreBoxes(store.id, 1)}
                        className="p-1 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
                        title="Aumentar 1 caixa"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="text-[9px] text-center text-slate-400 font-mono mt-0.5">
                      = {units} un
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 dark:bg-slate-900/80 sticky bottom-0">
          <div className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-3">
            <div>
              Total Lojas: <strong className="text-slate-900 dark:text-white font-mono">{totalAllocatedBoxes} cx ({validation.totalAllocated.toLocaleString('pt-BR')} un)</strong>
            </div>
            <div>
              Estoque CD: <strong className="text-amber-700 dark:text-amber-300 font-mono">{reserveStockBoxes} cx ({validation.reserveStock.toLocaleString('pt-BR')} un)</strong>
            </div>
            <div>
              Total Comprado: <strong className="text-slate-900 dark:text-white font-mono">{totalBoxes} cx ({validation.targetTotal.toLocaleString('pt-BR')} un)</strong>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              className="px-5 py-2 text-xs font-bold rounded-xl text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/30 transition flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              Salvar Separação
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
