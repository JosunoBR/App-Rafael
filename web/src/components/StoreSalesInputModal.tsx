import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, TrendingUp, Store, RotateCcw } from 'lucide-react';
import { StoreConfig } from '../shared/types';
import { DEFAULT_STORES } from '../shared/constants';

interface StoreSalesInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  year: number;
  month: number | 'all';
  stores?: StoreConfig[];
  currentSales: Record<string, number>;
  onSaveSales: (sales: Record<string, number>) => void;
}

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export const StoreSalesInputModal: React.FC<StoreSalesInputModalProps> = ({
  isOpen,
  onClose,
  year,
  month,
  stores = DEFAULT_STORES,
  currentSales,
  onSaveSales
}) => {
  const [salesMap, setSalesMap] = useState<Record<string, number>>({});
  const monthLabel = month !== 'all' ? MONTH_NAMES[month - 1] : 'Consolidado Anual';

  useEffect(() => {
    setSalesMap({ ...currentSales });
  }, [currentSales, isOpen]);

  const handleChange = (storeId: string, val: string) => {
    const num = Math.max(0, parseInt(val, 10) || 0);
    setSalesMap(prev => ({
      ...prev,
      [storeId]: num
    }));
  };

  const handleApplyAverage = () => {
    const rawVal = prompt('Digite uma meta/média de peças vendidas para aplicar a todas as lojas:');
    if (!rawVal) return;
    const num = Math.max(0, parseInt(rawVal, 10) || 0);
    const next: Record<string, number> = {};
    stores.forEach(s => { next[s.id] = num; });
    setSalesMap(next);
  };

  const handleReset = () => {
    setSalesMap({});
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSales(salesMap);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
        role="dialog"
      >
        {/* Cabeçalho */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                Vendas por Loja ({monthLabel} / {year})
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Informe o volume de peças vendidas por filial para calcular o índice de suprimento
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulário com lista de lojas */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          {/* Barra de Ações Rápidas */}
          <div className="px-5 py-2.5 bg-slate-100/60 dark:bg-slate-800/40 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-500 dark:text-slate-400">
              {stores.length} lojas cadastradas
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleApplyAverage}
                className="px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold transition cursor-pointer"
              >
                Preencher Média
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold transition cursor-pointer flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                Limpar
              </button>
            </div>
          </div>

          <div className="p-4 sm:p-5 overflow-y-auto space-y-2.5 flex-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {stores.map(store => {
                const val = salesMap[store.id] || '';
                return (
                  <div
                    key={store.id}
                    className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between gap-3 shadow-2xs"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <Store className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                          {store.name}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 block ml-5">
                        Cluster {store.cluster} • Peso {store.defaultWeight}%
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={val}
                        onChange={(e) => handleChange(store.id, e.target.value)}
                        className="w-24 px-2 py-1 text-right text-xs font-mono font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white outline-hidden focus:ring-2 focus:ring-emerald-500"
                      />
                      <span className="text-[11px] font-medium text-slate-400">un</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Rodapé */}
          <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Salvar e Atualizar Comparativo</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
