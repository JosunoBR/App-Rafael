import React, { useState } from 'react';
import {
  Search,
  Building2
} from 'lucide-react';
import { StoreGoalRow } from '../types/goalsExecutive.types';
import { formatCurrency } from '../../../utils/masks';

interface MultiYearSalesMatrixProps {
  stores: StoreGoalRow[];
}

export const MultiYearSalesMatrix: React.FC<MultiYearSalesMatrixProps> = ({ stores }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredStores = stores.filter(s => {
    if (searchTerm.trim() !== '') {
      return s.lojaNome.toLowerCase().includes(searchTerm.toLowerCase());
    }
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Barra de Filtros e Busca */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-3xl bg-white dark:bg-[#0B132B] border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por unidade na rede..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-2xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-amber-500" />
            Tabela Geral • {filteredStores.length} Unidades
          </span>
        </div>
      </div>

      {/* Tabela Histórica da Planilha */}
      <div className="rounded-3xl bg-white dark:bg-[#0B132B] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse min-w-[900px]">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 text-slate-500 text-[11px] font-bold uppercase tracking-wider">
                <th className="py-3.5 px-4">Loja</th>
                <th className="py-3.5 px-3 text-right">2021</th>
                <th className="py-3.5 px-3 text-right">2022</th>
                <th className="py-3.5 px-3 text-right">2023</th>
                <th className="py-3.5 px-3 text-right">2024</th>
                <th className="py-3.5 px-3 text-right">2025</th>
                <th className="py-3.5 px-3 text-right font-black text-emerald-600 dark:text-emerald-400">2026 (Realizado)</th>
                <th className="py-3.5 px-3 text-right font-bold text-amber-500">Meta 2026</th>
                <th className="py-3.5 px-3 text-center">Evolução YoY</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {filteredStores.map(store => {
                const v2021 = store.historicoVendas.find(h => h.ano === 2021)?.valor || 0;
                const v2022 = store.historicoVendas.find(h => h.ano === 2022)?.valor || 0;
                const v2023 = store.historicoVendas.find(h => h.ano === 2023)?.valor || 0;
                const v2024 = store.historicoVendas.find(h => h.ano === 2024)?.valor || 0;
                const v2025 = store.vendasAnoAnterior;
                const v2026 = store.historicoVendas.find(h => h.ano === 2026)?.valor || 0;

                const yoy = v2025 > 0 ? ((v2026 - v2025) / v2025) * 100 : 0;

                return (
                  <tr key={store.lojaId} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition">
                    <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                      <span>{store.lojaNome}</span>
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-slate-500">{v2021 > 0 ? formatCurrency(v2021) : '-'}</td>
                    <td className="py-3 px-3 text-right font-mono text-slate-500">{v2022 > 0 ? formatCurrency(v2022) : '-'}</td>
                    <td className="py-3 px-3 text-right font-mono text-slate-600 dark:text-slate-400">{v2023 > 0 ? formatCurrency(v2023) : '-'}</td>
                    <td className="py-3 px-3 text-right font-mono text-slate-700 dark:text-slate-300">{v2024 > 0 ? formatCurrency(v2024) : '-'}</td>
                    <td className="py-3 px-3 text-right font-mono text-slate-900 dark:text-white font-medium">{v2025 > 0 ? formatCurrency(v2025) : '-'}</td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(v2026)}</td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-amber-500">{formatCurrency(store.metaNormal)}</td>
                    <td className="py-3 px-3 text-center">
                      <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                        yoy >= 0 
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                      }`}>
                        {yoy >= 0 ? `+${yoy.toFixed(1)}%` : `${yoy.toFixed(1)}%`}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
